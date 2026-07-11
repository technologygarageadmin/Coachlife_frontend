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

# ------------------ CORS HEADERS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "OPTIONS, DELETE",
}

# ------------------ COMMON RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ USER TOKEN VALIDATION ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    # accept multiple header styles
    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("UserToken")
        or headers.get("user-token")
    )

    if not user_token:
        return None

    # ✅ validate token inside Users collection
    return users.find_one({"userToken": user_token})

# ------------------ ROLE SCOPE ------------------
def is_super_admin(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    return "superadmin" in [r.lower() for r in roles]

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS PREFLIGHT --------
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }

    # -------- AUTHORIZE VIA USER TOKEN --------
    user = validate_user(event)

    if not user:
        return cors_response(401, {
            "message": "Unauthorized: Invalid or missing user token"
        })

    if not is_super_admin(user):
        return cors_response(403, {"message": "Forbidden: superAdmin role required"})

    try:
        body = json.loads(event.get("body") or "{}")

        # we still get coachId from body (as you requested)
        coach_id = body.get("coachId")
        if not coach_id:
            return cors_response(400, {
                "message": "coachId is required"
            })

        # convert to ObjectId
        try:
            obj_id = ObjectId(coach_id)
        except Exception:
            return cors_response(400, {
                "message": "Invalid coachId format"
            })

        # delete document from Users collection
        result = users.delete_one({"_id": obj_id})

        if result.deleted_count == 0:
            return cors_response(404, {
                "message": "Coach ID not found"
            })

        return cors_response(200, {
            "message": "Coach deleted successfully",
            "deletedBy": str(user["_id"])
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Delete coach failed",
            "error": str(e)
        })
