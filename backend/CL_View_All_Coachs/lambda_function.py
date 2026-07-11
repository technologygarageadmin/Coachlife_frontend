import json
import os
from pymongo import MongoClient

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"
USERS_COLLECTION = "Users"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db[USERS_COLLECTION]

# ------------------ CORS HEADERS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
}

# ------------------ RESPONSE ------------------
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION ------------------
def validate_token(event):
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

    return users.find_one({"userToken": token}, {"password": 0})

# ------------------ ROLE SCOPE ------------------
def is_super_admin(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    return "superadmin" in [r.lower() for r in roles]

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    # validate token exists (any user)
    user = validate_token(event)
    if not user:
        return response(401, {"message": "Unauthorized or token missing"})

    if not is_super_admin(user):
        return response(403, {"message": "Forbidden: superAdmin role required"})

    # -------- LIST ALL COACHES --------
    coach_list = []
    for doc in users.find({"role": "coach"}, {"password": 0}):
        doc["_id"] = str(doc["_id"])
        coach_list.append(doc)

    return response(200, {
        "message": "All coaches fetched successfully",
        "totalCoaches": len(coach_list),
        "coaches": coach_list
    })
