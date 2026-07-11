import json
import os
from datetime import datetime, timedelta, timezone
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
    """Returns current timezone-aware IST datetime"""
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

    # Try multiple header formats
    token = (
        headers.get("userToken")
        or headers.get("UserToken")
        or headers.get("usertoken")
    )

    # Fallback to Authorization Bearer
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

# ------------------ ROLE SCOPE ------------------
def get_role_scope(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return is_super, (user.get("PlayersList") or [])

# ------------------ ADD PLAYER ------------------
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

    # Required field check
    if not body.get("playerName"):
        return response(400, {"message": "playerName is required"})

    now = now_ist()  # timezone-aware IST datetime

    player = {
        "playerName": body.get("playerName"),
        "fatherName": body.get("fatherName"),
        "motherName": body.get("motherName"),
        "dateOfBirth": body.get("dateOfBirth"),
        "address": body.get("address"),
        "phone": body.get("phone"),
        "alternativeNumber": body.get("alternativeNumber"),
        "age": body.get("age"),
        "LearningPathway": body.get("LearningPathway"),
        "primaryCoach": body.get("primaryCoach"),

        # ---- SYSTEM ----
        "TotalPoints": 0,
        "TotalPointsRedeemed": 0,
        "PointBalance": 0,
        "status": "active",
        "progress": "Not Started",

        # ---- AUDIT ----
        "createdAt": now,             # IST timezone-aware
        "dateOfRegistration": now,    # IST timezone-aware
        "createdBy": {
            "id": user["_id"],
            "name": user.get("name")
        }
    }

    result = players.insert_one(player)

    is_super, _ = get_role_scope(user)
    if not is_super:
        users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$addToSet": {"PlayersList": str(result.inserted_id)}}
        )

    return response(
        201,
        {
            "message": "Player added successfully",
            "playerId": str(result.inserted_id),
            "dateOfRegistration": now.isoformat(),  # ISO format with IST
            "createdBy": player["createdBy"]
        }
    )
