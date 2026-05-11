import json
import os
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId

# ------------------ CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ IST TIMEZONE ------------------
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    """Returns timezone-aware IST datetime"""
    return datetime.now(IST)

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
players = db["Players"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}

def response(code, body):
    return {
        "statusCode": code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH ------------------
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

# ------------------ UPDATE PLAYER ------------------
def lambda_handler(event, context):

    # CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    # Validate user
    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized or token missing"})

    # Parse body
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return response(400, {"message": "Invalid JSON body"})

    player_id = body.get("playerId")
    if not player_id:
        return response(400, {"message": "playerId is required"})

    # ------------------ ALLOWED UPDATE FIELDS ------------------
    updatable_fields = [
        "playerName",
        "fatherName",
        "motherName",
        "dateOfBirth",
        "address",
        "phone",
        "alternativeNumber",
        "age",
        "LearningPathway",
        "primaryCoach",
        "status",
        "progress"
    ]

    update_data = {field: body[field] for field in updatable_fields if field in body}

    if not update_data:
        return response(400, {"message": "No valid fields provided for update"})

    now = now_ist()  # timezone-aware IST

    # ------------------ AUDIT FIELDS ------------------
    update_data["updatedAt"] = now
    update_data["updatedBy"] = {
        "id": user["_id"],
        "name": user.get("name")
    }

    # ------------------ DB UPDATE ------------------
    try:
        result = players.update_one(
            {"_id": ObjectId(player_id)},
            {"$set": update_data}
        )
    except Exception:
        return response(400, {"message": "Invalid playerId format"})

    if result.matched_count == 0:
        return response(404, {"message": "Player not found"})

    return response(
        200,
        {
            "message": "Player updated successfully",
            "playerId": player_id,
            "updatedFields": list(update_data.keys()),
            "updatedAt": now.isoformat(),  # ISO string with IST
            "updatedBy": update_data["updatedBy"]
        }
    )
