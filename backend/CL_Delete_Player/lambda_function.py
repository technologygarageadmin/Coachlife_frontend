import json
import os
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"

if not MONGO_URI:
    raise Exception("MONGO_URI not set in environment variables")

# ------------------ IST TIMEZONE ------------------
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    return datetime.now(IST)

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
players = db["Players"]

# ------------------ COMMON RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
            "Access-Control-Allow-Methods": "OPTIONS, DELETE"
        },
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION (ROBUST) ------------------
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
        return None

    user = users.find_one(
        {"userToken": token},
        {"password": 0}
    )

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
        return cors_response(200, {"message": "CORS OK"})

    # -------- AUTH --------
    user = validate_user_token(event)
    if not user:
        return cors_response(
            401,
            {"message": "Unauthorized or token missing"}
        )

    # -------- BODY VALIDATION --------
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return cors_response(
            400,
            {"message": "Invalid JSON format"}
        )

    player_id = body.get("playerId")
    if not player_id:
        return cors_response(
            400,
            {"message": "playerId is required"}
        )

    try:
        obj_id = ObjectId(player_id)
    except Exception:
        return cors_response(
            400,
            {"message": "Invalid playerId format"}
        )

    is_super, player_ids = get_role_scope(user)
    if not is_super and player_id not in player_ids:
        return cors_response(403, {"message": "Forbidden: player is not in your assigned list"})

    # -------- DELETE PLAYER --------
    result = players.delete_one({"_id": obj_id})

    if result.deleted_count == 0:
        return cors_response(
            404,
            {"message": "Player not found"}
        )

    deleted_at = now_ist()

    return cors_response(
        200,
        {
            "message": "Player deleted successfully",
            "deletedAt": deleted_at.isoformat(),
            "deletedBy": {
                "id": user["_id"],
                "role": user.get("role")
            }
        }
    )
