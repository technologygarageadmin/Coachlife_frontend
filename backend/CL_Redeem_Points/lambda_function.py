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
players = db["Players"]
rewards = db["Rewards"]
redeem_points = db["RedeemPoints"]

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

# ------------------ AUTH (userToken OR Bearer) ------------------
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

# ------------------ ROLE SCOPE ------------------
def get_role_scope(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return is_super, (user.get("PlayersList") or [])

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS --------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    # -------- AUTH --------
    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized or token missing"})

    # -------- BODY --------
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON body"})

    player_id = body.get("playerId")
    reward_id = body.get("rewardId")

    if not player_id or not reward_id:
        return response(400, {
            "message": "playerId and rewardId are required"
        })

    is_super, scoped_player_ids = get_role_scope(user)
    if not is_super and player_id not in scoped_player_ids:
        return response(403, {"message": "Forbidden: player is not in your assigned list"})

    # ------------------ FETCH PLAYER ------------------
    try:
        player = players.find_one({"_id": ObjectId(player_id)})
    except:
        return response(400, {"message": "Invalid playerId"})

    if not player:
        return response(404, {"message": "Player not found"})

    # ------------------ FETCH REWARD ------------------
    try:
        reward = rewards.find_one({
            "_id": ObjectId(reward_id),
            "isActive": True
        })
    except:
        return response(400, {"message": "Invalid rewardId"})

    if not reward:
        return response(404, {"message": "Reward not found or inactive"})

    reward_name = reward.get("rewardName")
    reward_description = reward.get("rewardDescription")
    points_required = reward.get("points", 0)

    # ------------------ VALIDATE BALANCE ------------------
    if player.get("PointBalance", 0) < points_required:
        return response(400, {"message": "Insufficient point balance"})

    # ------------------ ATOMIC POINT UPDATE ------------------
    update_result = players.update_one(
        {
            "_id": ObjectId(player_id),
            "PointBalance": {"$gte": points_required}
        },
        {
            "$inc": {
                "TotalPointsRedeemed": points_required,
                "PointBalance": -points_required
            }
        }
    )

    if update_result.modified_count == 0:
        return response(409, {"message": "Redeem failed, please retry"})

    # ------------------ INSERT REDEEM LOG ------------------
    redeem_doc = {
        "playerId": player_id,
        "rewardId": reward_id,
        "rewardName": reward_name,
        "rewardDescription": reward_description,
        "pointsUsed": points_required,
        "redeemedAt": now_ist(),
        "redeemedBy": user["_id"],
        "redeemedByName": user.get("name")
    }

    redeem_points.insert_one(redeem_doc)

    return response(200, {
        "message": "Reward redeemed successfully",
        "reward": {
            "rewardId": reward_id,
            "rewardName": reward_name,
            "rewardDescription": reward_description,
            "pointsUsed": points_required
        }
    })
