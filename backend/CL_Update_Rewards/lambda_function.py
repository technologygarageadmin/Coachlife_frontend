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
    return datetime.now(IST)

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
rewards = db["Rewards"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "PUT, OPTIONS"
}

def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH ------------------
def validate_user(event):
    headers = event.get("headers") or {}

    token = (
        headers.get("userToken")
        or headers.get("UserToken")
        or headers.get("usertoken")
    )

    # Fallback to Authorization: Bearer
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

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS --------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS preflight OK"})

    # -------- AUTH --------
    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized or token missing"})

    if event.get("httpMethod") != "PUT":
        return response(405, {"message": "Method not allowed"})

    # -------- BODY --------
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON body"})

    reward_id = body.get("rewardId")
    if not reward_id:
        return response(400, {"message": "rewardId is required"})

    try:
        obj_id = ObjectId(reward_id)
    except Exception:
        return response(400, {"message": "Invalid rewardId format"})

    # -------- UPDATE FIELDS --------
    update_fields = {
        "rewardName": body.get("rewardName"),
        "rewardDescription": body.get("rewardDescription"),
        "points": body.get("points"),
        "isActive": body.get("isActive"),
        "updatedAt": now_ist()
    }

    # Remove None values
    update_fields = {k: v for k, v in update_fields.items() if v is not None}

    if len(update_fields) == 1:  # only updatedAt
        return response(400, {"message": "No fields provided to update"})

    # -------- UPDATE DB (NO isActive FILTER) --------
    result = rewards.update_one(
        {"_id": obj_id},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        return response(404, {"message": "Reward not found"})

    return response(200, {
        "message": "Reward updated successfully",
        "updatedFields": list(update_fields.keys())
    })
