import json
import os
from pymongo import MongoClient, ASCENDING

# ------------------ ENV VARIABLES ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
master_learning_pathway = db["MasterLearningPathway"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
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

    # -------- READ BODY (OPTIONAL) --------
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return response(400, {"message": "Invalid JSON body"})

    # -------- FILTERS (ALL OPTIONAL) --------
    query = {}

    if body.get("LearningPathway"):
        query["LearningPathway"] = body["LearningPathway"]

    if body.get("SessionType"):
        query["SessionType"] = body["SessionType"]

    if body.get("session") is not None:
        query["session"] = body["session"]

    # -------- FETCH & SORT BY SESSION --------
    sessions_cursor = (
        master_learning_pathway
        .find(query)
        .sort("session", ASCENDING)
    )

    sessions = []

    for s in sessions_cursor:
        session_obj = {
            "id": str(s["_id"])   # id FIRST
        }

        # Add remaining fields in original order
        for key, value in s.items():
            if key != "_id":
                session_obj[key] = value

        sessions.append(session_obj)

    # -------- RESPONSE --------
    return response(
        200,
        {
            "count": len(sessions),
            "sessions": sessions
        }
    )
