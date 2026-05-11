import json
import os
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from datetime import datetime

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

USER_COLLECTION = "Users"                 # ✅ Only Users
SESSION_CARD_COLLECTION = "SessionCards"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db[USER_COLLECTION]               # ✅ No Coaches
session_cards = db[SESSION_CARD_COLLECTION]

# ------------------ RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, userToken, Authorization",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION (USERS) ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    # direct header token
    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("user-token")
    )

    # Bearer fallback
    if not user_token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            user_token = auth.replace("Bearer ", "").strip()

    if not user_token:
        return None, "TOKEN_MISSING"

    # ✅ validate token inside Users collection
    user = users.find_one({"userToken": user_token}, {"password": 0})

    if user:
        user["_id"] = str(user["_id"])
        return user, None

    return None, "INVALID_TOKEN"

# ------------------ SAFE DATETIME HANDLER ------------------
def safe_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str):
        return value
    return None

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # ---- CORS PREFLIGHT ----
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    # ---- VALIDATE USER TOKEN (from Users) ----
    user, error = validate_user(event)

    if error:
        return cors_response(401, {
            "message": "Unauthorized",
            "reason": error
        })

    try:
        body = json.loads(event.get("body", "{}"))

        player_id = body.get("playerId")
        if not player_id:
            return cors_response(400, {
                "message": "playerId is required"
            })

        # ---- FETCH LATEST SESSION CARD ----
        latest_card = session_cards.find_one(
            {"playerId": player_id},
            sort=[("createdAt", DESCENDING)]
        )

        if not latest_card:
            return cors_response(404, {
                "message": "No session card found for this player"
            })

        # ---- FORMAT OUTPUT ----
        latest_card["_id"] = str(latest_card["_id"])

        for field in ["createdAt", "updatedAt", "completedAt"]:
            if field in latest_card:
                latest_card[field] = safe_datetime(latest_card[field])

        return cors_response(200, {
            "message": "Latest session card fetched successfully",
            "accessedBy": "USER",               # 👈 not coach now
            "sessionCard": latest_card
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Failed to fetch session card",
            "error": str(e)
        })
