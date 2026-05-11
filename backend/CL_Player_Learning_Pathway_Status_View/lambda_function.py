import json
import os
from pymongo import MongoClient

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

COACH_COLLECTION = "Coaches"
USER_COLLECTION = "Users"
PLAYER_PATHWAY_COLLECTION = "PlayersLearningPathway"
MASTER_PATHWAY_COLLECTION = "MasterLearningPathway"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

coachs = db[COACH_COLLECTION]
users = db[USER_COLLECTION]
player_pathways = db[PLAYER_PATHWAY_COLLECTION]
master_pathways = db[MASTER_PATHWAY_COLLECTION]

# ------------------ RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, userToken, Authorization",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION (USER OR COACH) ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    # token from headers only (no Bearer)
    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("user-token")
    )

    if not user_token:
        return None, "TOKEN_MISSING"

    # 🔍 Check Users collection
    user = users.find_one({"userToken": user_token}, {"password": 0})
    if user:
        user["_id"] = str(user["_id"])
        user["role"] = "USER"
        return user, None

    # 🔍 Check Coaches collection
    coach = coachs.find_one({"userToken": user_token}, {"password": 0})
    if coach:
        coach["_id"] = str(coach["_id"])
        coach["role"] = "COACH"
        return coach, None

    return None, "INVALID_TOKEN"

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    # validate token
    user, error = validate_user(event)
    if error:
        return cors_response(401, {
            "message": "Unauthorized",
            "reason": error
        })

    try:
        body = json.loads(event.get("body", "{}"))

        player_id = body.get("playerId")
        stage = body.get("stage")

        if not player_id or stage is None:
            return cors_response(400, {
                "message": "playerId and stage are required"
            })

        # -------- STEP 1: COMPLETED ACTIVITY IDS --------
        completed_cursor = player_pathways.find(
            {
                "playerId": player_id,
                "stage": stage,
                "status": "completed",
                "source.activityId": {"$ne": None}
            },
            {"source.activityId": 1}
        )

        completed_activity_ids = {
            str(doc["source"]["activityId"])
            for doc in completed_cursor
        }

        # -------- STEP 2: MASTER ACTIVITIES --------
        master_cursor = master_pathways.find(
            {"stage": stage},
            {
                "activities": 1,
                "objectives": 1,
                "aiProject": 1,
                "aiTools": 1
            }
        )

        completed = []
        not_completed = []

        for doc in master_cursor:
            activity_id = str(doc["_id"])

            activity_data = {
                "activityId": activity_id,
                "activity": doc.get("activities"),
                "objectives": doc.get("objectives"),
                "aiProject": doc.get("aiProject"),
                "aiTools": doc.get("aiTools")
            }

            if activity_id in completed_activity_ids:
                completed.append(activity_data)
            else:
                not_completed.append(activity_data)

        # -------- RESPONSE --------
        return cors_response(200, {
            "playerId": player_id,
            "stage": stage,
            "accessedBy": user["role"],
            "summary": {
                "totalActivities": len(completed) + len(not_completed),
                "completedCount": len(completed),
                "notCompletedCount": len(not_completed)
            },
            "completedActivities": completed,
            "notCompletedActivities": not_completed
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Failed to fetch learning pathway progress",
            "error": str(e)
        })
