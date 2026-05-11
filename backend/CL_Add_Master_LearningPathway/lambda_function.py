import json
import os
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

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
    "Access-Control-Allow-Methods": "POST, OPTIONS"
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

    # -------- REQUIRED FIELDS --------
    required_fields = [
        "LearningPathway",
        "session",
        "Topic",
        "SessionType",
        "Objective",
        "activities",
        "totalPoints",
        "sessionTakeaways"
    ]

    for field in required_fields:
        if field not in body:
            return response(400, {"message": f"{field} is required"})

    # -------- DUPLICATE CHECK --------
    existing = master_learning_pathway.find_one({
        "LearningPathway": body["LearningPathway"],
        "session": body["session"],
        "SessionType": body["SessionType"]
    })

    if existing:
        return response(
            409,
            {"message": "Session already exists for this Learning Pathway & SessionType"}
        )

    # -------- VALIDATE ACTIVITIES --------
    for activity in body["activities"]:
        if "activitySequence" not in activity:
            return response(400, {"message": "activitySequence is required"})
        if "activityTitle" not in activity:
            return response(400, {"message": "activityTitle is required"})
        if "points" not in activity or "total" not in activity["points"]:
            return response(400, {"message": "Activity points.total is required"})

    current_ist = get_current_ist()

    # -------- DOCUMENT --------
    document = {
        "LearningPathway": body["LearningPathway"],
        "session": body["session"],
        "Topic": body["Topic"],
        "SessionType": body["SessionType"],
        "Objective": body["Objective"],

        "activities": body["activities"],
        "totalPoints": body["totalPoints"],
        "sessionTakeaways": body.get("sessionTakeaways", []),

        # ---- AUDIT ----
        "createdAt": current_ist,
        "createdBy": {
            "id": user["_id"],
            "name": user.get("name")
        }
    }

    # -------- INSERT --------
    result = master_learning_pathway.insert_one(document)

    return response(
        201,
        {
            "message": "Master Learning Pathway session added successfully",
            "id": str(result.inserted_id),
            "createdAt": current_ist.isoformat(),
            "createdBy": document["createdBy"]
        }
    )
