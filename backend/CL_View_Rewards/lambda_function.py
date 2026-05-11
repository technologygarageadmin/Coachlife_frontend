import json
import os
from pymongo import MongoClient
from bson import ObjectId

# ------------------ CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
rewards = db["Rewards"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
}

def response(code, body):
    return {
        "statusCode": code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH ------------------
def validate_user(event):
    headers = event.get("headers") or {}
    headers = {k.lower(): v for k, v in headers.items()}

    token = headers.get("usertoken")

    if not token:
        auth = headers.get("authorization")
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

    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS preflight"})

    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized"})

    if event.get("httpMethod") == "GET":

        reward_list = []
        for reward in rewards.find({}):  # ✅ FETCH ALL (true + false)
            reward_list.append({
                "rewardId": str(reward["_id"]),
                "rewardName": reward.get("rewardName"),
                "rewardDescription": reward.get("rewardDescription"),
                "points": reward.get("points"),
                "isActive": reward.get("isActive"),
                "createdAt": reward.get("createdAt"),
                "updatedAt": reward.get("updatedAt")
            })

        return response(200, {
            "message": "Rewards fetched successfully",
            "count": len(reward_list),
            "data": reward_list
        })

    return response(405, {"message": "Method not allowed"})
