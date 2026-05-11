import json
import os
from pymongo import MongoClient

# ------------------ ENV ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ DB ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
redeem_collection = db["RedeemPoints"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}

# ------------------ RESPONSE ------------------
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH ------------------
def validate_user_token(event):
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
        return None, "TOKEN_MISSING"

    user = users.find_one({"userToken": token}, {"password": 0})
    if not user:
        return None, "INVALID_TOKEN"

    user["_id"] = str(user["_id"])
    return user, None

# ------------------ HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS --------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    try:
        # -------- AUTH --------
        user, error = validate_user_token(event)
        if error:
            return response(401, {"message": error})

        # -------- READ BODY --------
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return response(400, {"message": "Invalid JSON body"})

        player_id = body.get("playerId")

        if not player_id:
            return response(400, {"message": "playerId is required"})

        # -------- FETCH HISTORY --------
        cursor = redeem_collection.find(
            {"playerId": player_id},
            {"_id": 0}
        ).sort("redeemedAt", -1)

        redeem_history = list(cursor)

        # -------- RESPONSE --------
        return response(
            200,
            {
                "playerId": player_id,
                "totalRedeems": len(redeem_history),
                "redeemHistory": redeem_history
            }
        )

    except Exception as e:
        return response(500, {"message": str(e)})
