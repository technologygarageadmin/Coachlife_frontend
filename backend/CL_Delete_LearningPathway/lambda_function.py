import json
import os
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# ------------------ ENV VARIABLES ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ IST TIMEZONE ------------------
IST = timezone(timedelta(hours=5, minutes=30))

def get_current_ist():
    return datetime.now(IST)

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
master_learning_pathway = db["MasterLearningPathway"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS"
}

def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH (ROBUST & CONSISTENT) ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

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

    # -------- REQUIRED ID --------
    session_id = body.get("id")
    if not session_id:
        return response(400, {"message": "id of session is required to delete"})

    try:
        obj_id = ObjectId(session_id)
    except Exception:
        return response(400, {"message": "Invalid id format"})

    # -------- CHECK EXISTENCE --------
    existing = master_learning_pathway.find_one({"_id": obj_id})
    if not existing:
        return response(404, {"message": "Session not found"})

    # -------- DELETE --------
    master_learning_pathway.delete_one({"_id": obj_id})

    return response(
        200,
        {
            "message": "Master Learning Pathway session deleted successfully",
            "deletedAt": get_current_ist().isoformat(),
            "deletedBy": {
                "id": user["_id"],
                "name": user.get("name")
            }
        }
    )
