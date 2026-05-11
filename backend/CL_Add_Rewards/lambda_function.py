import json
import os
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

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
    "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS"
}

def response(code, body):
    return {
        "statusCode": code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH (ROBUST: userToken + Bearer) ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    token = (
        headers.get("userToken")
        or headers.get("UserToken")
        or headers.get("usertoken")
    )

    # Fallback to Authorization: Bearer <token>
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
        return response(200, {"message": "CORS preflight"})

    # -------- AUTH --------
    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized or token missing"})

    method = event.get("httpMethod")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON body"})

    # ------------------ CREATE REWARD ------------------
    if method == "POST":
        reward_name = body.get("rewardName")
        reward_description = body.get("rewardDescription")
        points = body.get("points")

        if not reward_name or points is None:
            return response(400, {
                "message": "rewardName and points are required"
            })

        if rewards.find_one({"rewardName": reward_name}):
            return response(409, {
                "message": "Reward already exists"
            })

        reward_doc = {
            "rewardName": reward_name,
            "rewardDescription": reward_description,
            "points": points,
            "isActive": True,
            "createdAt": now_ist(),
            "updatedAt": now_ist(),
            "createdBy": {
                "id": user["_id"],
                "name": user.get("name")
            }
        }

        rewards.insert_one(reward_doc)

        return response(201, {
            "message": "Reward created successfully"
        })
