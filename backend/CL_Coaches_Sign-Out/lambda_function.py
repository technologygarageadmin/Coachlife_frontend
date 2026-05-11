import json
import os
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"
COACH_COLLECTION = "Coaches"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
coachs = db[COACH_COLLECTION]

# ------------------ CORS RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, userToken",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body)
    }

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS PREFLIGHT --------
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    try:
        body = json.loads(event.get("body") or "{}")
        coach_id = body.get("coachId")

        if not coach_id:
            return cors_response(400, {
                "message": "coachId is required"
            })

        result = coachs.update_one(
            {"_id": ObjectId(coach_id)},
            {"$unset": {"userToken": ""}}
        )

        if result.matched_count == 0:
            return cors_response(404, {
                "message": "Coach not found"
            })

        return cors_response(200, {
            "message": "Coach signed out successfully"
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Coach sign out failed",
            "error": str(e)
        })
