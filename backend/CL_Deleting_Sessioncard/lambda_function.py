import json
import os
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

USER_COLLECTION = "Users"
SESSION_CARD_COLLECTION = "SessionCards"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db[USER_COLLECTION]
session_cards = db[SESSION_CARD_COLLECTION]

# ------------------ CORS HEADERS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "OPTIONS, DELETE",
}

# ------------------ COMMON RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ USER TOKEN VALIDATION ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("UserToken")
        or headers.get("user-token")
    )

    if not user_token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            user_token = auth.replace("Bearer ", "").strip()

    if not user_token:
        return None

    # ✅ validate token inside Users collection
    return users.find_one({"userToken": user_token})

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS PREFLIGHT --------
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }

    # -------- AUTHORIZE VIA USER TOKEN --------
    user = validate_user(event)
    if not user:
        return cors_response(401, {
            "message": "Unauthorized: Invalid or missing user token"
        })

    try:
        body = json.loads(event.get("body") or "{}")

        # 🔥 get sessionCardId from request body
        session_card_id = body.get("sessionCardId")
        if not session_card_id:
            return cors_response(400, {
                "message": "sessionCardId is required"
            })

        # convert to ObjectId
        try:
            obj_id = ObjectId(session_card_id)
        except Exception:
            return cors_response(400, {
                "message": "Invalid sessionCardId format"
            })

        card = session_cards.find_one({"_id": obj_id})
        if not card:
            return cors_response(404, {
                "message": "Session card not found"
            })

        # A completed card has already awarded points; emptying it would leave the
        # player's totals inflated. Block it - only upcoming/pending/in-progress/empty
        # cards can be removed.
        if str(card.get("status", "")).lower() == "completed":
            return cors_response(409, {
                "message": "Cannot delete a completed session card"
            })

        # SOFT DELETE - keep the document as a tombstone so the session sequence
        # stays intact (a hard delete would let the next generation reuse this
        # session number and drift a batch out of sync). We clear the card content
        # and mark it "empty"; the slot can be refilled in place via custom generate.
        session_cards.update_one(
            {"_id": obj_id},
            {"$set": {
                "status": "empty",
                "activities": [],
                "totalPoints": 0,
                "rating": None,
                "coachComment": None,
                "emptiedAt": datetime.now(timezone.utc).isoformat(),
                "emptiedBy": str(user["_id"]),
            }}
        )

        return cors_response(200, {
            "message": "Session card removed",
            "deletedBy": str(user["_id"]),
            "sessionCardId": session_card_id,
            "session": card.get("session"),
            "status": "empty"
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Delete session card failed",
            "error": str(e)
        })
