import json
import os
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

USER_COLLECTION = "Users"   

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db[USER_COLLECTION]   

# ------------------ RESPONSE ------------------
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, userToken",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body)
    }

# ------------------ USER TOKEN VALIDATION ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("user-token")
    )

    if not user_token:
        return None

    # ✅ validate token inside Users collection
    return users.find_one({"userToken": user_token})

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # ------------------ CORS ------------------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    # ------------------ AUTHORIZE USER ------------------
    logged_in_user = validate_user(event)
    if not logged_in_user:
        return response(401, {
            "message": "Unauthorized: Invalid or missing user token"
        })

    try:
        body = json.loads(event.get("body", "{}"))

        coach_id = body.get("coachId")
        player_ids = body.get("playerIds")

        if not coach_id or not player_ids:
            return response(400, {
                "message": "coachId and playerIds are required"
            })

        if not isinstance(player_ids, list):
            return response(400, {
                "message": "playerIds must be an array"
            })

        coach_obj_id = ObjectId(coach_id)

        # ------------------ CHECK COACH (in Users) EXISTS ------------------
        coach = users.find_one({"_id": coach_obj_id})
        if not coach:
            return response(404, {
                "message": "Coach ID not found"
            })

        # ------------------ CHECK IF PLAYERS ALREADY ASSIGNED ------------------
        already_assigned = list(users.find(
            {
                "_id": {"$ne": coach_obj_id},
                "PlayersList": {"$in": player_ids}
            },
            {"_id": 1, "PlayersList": 1}
        ))

        if already_assigned:
            return response(400, {
                "message": "Players are already assigned to another coach",
                "conflictCoaches": [
                    {
                        "coachId": str(c["_id"]),
                        "players": list(set(player_ids) & set(c.get("PlayersList", [])))
                    }
                    for c in already_assigned
                ]
            })

        # ------------------ ADD PLAYERS SAFELY TO USERS ------------------
        users.update_one(
            {"_id": coach_obj_id},
            {
                "$addToSet": {
                    "PlayersList": {
                        "$each": player_ids
                    }
                }
            }
        )

        return response(200, {
            "message": "Player(s) assigned to coach successfully"
        })

    except Exception as e:
        return response(500, {
            "message": "Add player to coach failed",
            "error": str(e)
        })
