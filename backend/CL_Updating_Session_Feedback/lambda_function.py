import json
import os
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

USERS_COLLECTION = "Users"
PLAYER_COLLECTION = "Players"
PLAYER_PATHWAY_COLLECTION = "PlayersLearningPathway"
MASTER_PATHWAY_COLLECTION = "MasterLearningPathway"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db[USERS_COLLECTION]
players = db[PLAYER_COLLECTION]
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

# ------------------ USER TOKEN VALIDATION ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    # token from headers
    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("user-token")
    )

    # Bearer fallback
    if not user_token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            user_token = auth.replace("Bearer ", "").strip()

    if not user_token:
        return None, "TOKEN_MISSING"

    # validate token in Users collection
    user = users.find_one({"userToken": user_token}, {"password": 0})

    if user:
        user["_id"] = str(user["_id"])
        # keep role from Users collection as-is
        return user, None

    return None, "INVALID_TOKEN"

# ------------------ FIND ACTIVITY ID ------------------
def find_activity_id(activity_name, stage):
    pathway = master_pathways.find_one(
        {
            "activities": activity_name,
            "stage": stage
        },
        {"_id": 1}
    )
    return str(pathway["_id"]) if pathway else None

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # CORS
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    # validate user token
    user, error = validate_user(event)
    if error:
        return cors_response(401, {
            "message": "Unauthorized",
            "reason": error
        })

    try:
        body = json.loads(event.get("body", "{}"))

        # required fields
        required_fields = [
            "playerId",
            "milestone",
            "stage",
            "sessionType",
            "status",
            "source",
            "content",
            "rewardPoints"
        ]

        for field in required_fields:
            if field not in body:
                return cors_response(400, {
                    "message": f"Missing required field: {field}"
                })

        # reward points
        reward_points = int(body.get("rewardPoints", 0))

        # player lookup
        player_id = ObjectId(body["playerId"])
        player = players.find_one({"_id": player_id})

        if not player:
            return cors_response(404, {"message": "Player not found"})

        new_total_points = player.get("TotalPoints", 0) + reward_points
        new_point_balance = player.get("PointBalance", 0) + reward_points

        # update player points
        players.update_one(
            {"_id": player_id},
            {
                "$set": {
                    "TotalPoints": new_total_points,
                    "PointBalance": new_point_balance,
                    "updatedAt": datetime.utcnow()
                }
            }
        )

        # activity lookup
        activity_name = body["source"].get("activity")
        stage = body["stage"]

        activity_id = find_activity_id(activity_name, stage) if activity_name else None

        # build pathway document
        document = {
            "playerId": body["playerId"],
            "milestone": body["milestone"],
            "stage": stage,
            "sessionType": body["sessionType"],
            "status": body["status"],
            "rewardPoints": reward_points,

            "source": {
                **body["source"],
                "activityId": activity_id
            },

            "content": body["content"],

            "feedback": {
                "coachComment": "",
                "rating": None,
                "submittedBy": {
                    "userId": user["_id"],
                    "role": user.get("role")
                },
                "submittedAt": None
            },

            "createdByUserId": user["_id"],
            "createdByRole": user.get("role"),
            "createdAt": datetime.utcnow(),
            "completedAt": None,
            "updatedAt": datetime.utcnow()
        }

        # insert record
        result = player_pathways.insert_one(document)

        return cors_response(201, {
            "message": "Player learning pathway record created successfully",
            "createdBy": user.get("role"),
            "recordId": str(result.inserted_id),
            "rewardPoints": reward_points,
            "totalPoints": new_total_points,
            "pointBalance": new_point_balance
        })

    except json.JSONDecodeError:
        return cors_response(400, {"message": "Invalid JSON format"})

    except Exception as e:
        return cors_response(500, {
            "message": "Failed to create player learning pathway",
            "error": str(e)
        })
