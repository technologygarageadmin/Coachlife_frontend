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

# ------------------ ROLE SCOPE ------------------
def get_role_scope(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return is_super, (user.get("PlayersList") or [])

# ------------------ HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS --------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    if event.get("httpMethod") != "GET":
        return response(405, {"message": "Method not allowed"})

    # -------- AUTH --------
    user, error = validate_user_token(event)
    if error:
        return response(401, {"message": error})

    # -------- FETCH REDEEM HISTORY (SCOPED) --------
    is_super, player_ids = get_role_scope(user)
    query = {} if is_super else {"playerId": {"$in": player_ids}}

    cursor = redeem_collection.find(
        query,
        {"_id": 0}
    ).sort("redeemedAt", -1)

    redeem_history = list(cursor)

    return response(
        200,
        {
            "message": "All players redeem history fetched successfully",
            "totalRedeems": len(redeem_history),
            "redeemHistory": redeem_history
        }
    )
