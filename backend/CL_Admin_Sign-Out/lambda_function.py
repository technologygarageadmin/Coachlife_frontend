import json
import os
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"
USER_COLLECTION = "Users"  # ✅ Use Users collection

if not MONGO_URI:
    raise Exception("MONGO_URI not set in environment variables")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db[USER_COLLECTION]

# ------------------ CORS RESPONSE ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, userToken",
    "Access-Control-Allow-Methods": "OPTIONS, POST"
}

# ------------------ RESPONSE HELPER ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body)
    }

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS PREFLIGHT --------
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    try:
        body = json.loads(event.get("body") or "{}")
        user_id = body.get("userId")  # ✅ use userId now

        if not user_id:
            return cors_response(400, {
                "message": "userId is required"
            })

        try:
            obj_id = ObjectId(user_id)
        except Exception:
            return cors_response(400, {
                "message": "Invalid userId format"
            })

        result = users.update_one(
            {"_id": obj_id},
            {"$unset": {"userToken": ""}}  # Remove userToken
        )

        if result.matched_count == 0:
            return cors_response(404, {
                "message": "User not found"
            })

        return cors_response(200, {
            "message": "User signed out successfully"
        })

    except Exception as e:
        return cors_response(500, {
            "message": "User sign out failed",
            "error": str(e)
        })
