import json
import os
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# ------------------ CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ IST ------------------
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    return datetime.now(IST)

# ------------------ DB ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
master_learning_pathway = db["MasterLearningPathway"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "PUT, OPTIONS"
}

def response(code, body):
    return {
        "statusCode": code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH ------------------
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

# ------------------ UPDATE MASTER LEARNING PATHWAY ------------------
def lambda_handler(event, context):

    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized"})

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return response(400, {"message": "Invalid JSON body"})

    # ✅ EXACTLY LIKE PLAYER UPDATE
    pathway_id = body.pop("id", None)
    if not pathway_id:
        return response(400, {"message": "id is required"})

    try:
        obj_id = ObjectId(pathway_id)
    except Exception:
        return response(400, {"message": "Invalid id format"})

    if not body:
        return response(400, {"message": "Update body cannot be empty"})

    # -------- PROTECTED FIELDS --------
    protected = {
        "_id",
        "createdAt",
        "createdBy"
    }

    for field in protected:
        body.pop(field, None)

    # -------- OPTIONAL VALIDATION --------
    if "activities" in body:
        for activity in body["activities"]:
            if "activitySequence" not in activity:
                return response(400, {"message": "activitySequence is required"})
            if "activityTitle" not in activity:
                return response(400, {"message": "activityTitle is required"})
            if "points" not in activity or "total" not in activity["points"]:
                return response(400, {"message": "Activity points.total is required"})

    # -------- AUDIT --------
    body["updatedAt"] = now_ist()
    body["updatedBy"] = {
        "id": user["_id"],
        "name": user.get("name"),
        "role": user.get("role")
    }

    # -------- UPDATE --------
    result = master_learning_pathway.update_one(
        {"_id": obj_id},
        {"$set": body}
    )

    if result.matched_count == 0:
        return response(404, {"message": "Master Learning Pathway not found"})

    return response(
        200,
        {
            "message": "Master Learning Pathway updated successfully",
            "updatedFields": list(body.keys())
        }
    )
