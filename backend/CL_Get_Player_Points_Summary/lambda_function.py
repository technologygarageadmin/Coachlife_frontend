import json
import os
from pymongo import MongoClient

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"
USERS_COLLECTION = "Users"
PLAYERS_COLLECTION = "Players"

if not MONGO_URI:
    raise Exception("MONGO_URI not set in environment variables")

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db[USERS_COLLECTION]
players = db[PLAYERS_COLLECTION]

# ------------------ COMMON RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
            "Access-Control-Allow-Methods": "GET, OPTIONS"
        },
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION (ROBUST) ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    token = (
        headers.get("userToken")
        or headers.get("UserToken")
        or headers.get("usertoken")
    )

    if not token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "").strip()

    if not token:
        return None

    user = users.find_one({"userToken": token}, {"password": 0})
    if not user:
        return None

    user["_id"] = str(user["_id"])
    return user

# ------------------ HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS --------
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    # -------- AUTH --------
    user = validate_user(event)
    if not user:
        return cors_response(
            401,
            {"message": "Unauthorized or token missing"}
        )

    # -------- FETCH ALL PLAYERS --------
    players_data = []

    for player in players.find({}):
        players_data.append({
            "playerId": str(player["_id"]),
            "playerName": player.get("playerName"),
            "TotalPoints": int(player.get("TotalPoints", 0)),
            "TotalPointsRedeemed": int(player.get("TotalPointsRedeemed", 0)),
            "PointBalance": int(player.get("PointBalance", 0))
        })

    # -------- RESPONSE --------
    return cors_response(
        200,
        {
            "count": len(players_data),
            "players": players_data
        }
    )
