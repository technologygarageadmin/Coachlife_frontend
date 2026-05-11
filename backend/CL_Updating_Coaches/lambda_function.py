import json
import os
from pymongo import MongoClient
from bson import ObjectId

MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"
USER_COLLECTION = "Users"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db[USER_COLLECTION]


def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, userToken, Authorization",
            "Access-Control-Allow-Methods": "OPTIONS, PUT"
        },
        "body": json.dumps(body, default=str)
    }


def validate_user_token(event):
    headers = event.get("headers", {}) or {}

    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("user-token")
    )

    if not user_token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            user_token = auth.replace("Bearer ", "").strip()

    if not user_token:
        return None, "TOKEN_MISSING"

    user = users.find_one({"userToken": user_token}, {"password": 0})

    if user:
        user["_id"] = str(user["_id"])
        return user, None

    return None, "INVALID_TOKEN"


def lambda_handler(event, context):

    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    _, error = validate_user_token(event)

    if error:
        return cors_response(401, {"message": "Unauthorized", "reason": error})

    try:
        body = json.loads(event.get("body", "{}"))

        # ---------- coachId is actually the Mongo _id ----------
        if "coachId" not in body:
            return cors_response(400, {"message": "Missing required field: coachId"})

        try:
            user_object_id = ObjectId(body["coachId"])
        except Exception:
            return cors_response(400, {"message": "Invalid coachId ObjectId format"})

        # ---------- allowed update fields ----------
        allowed_fields = [
            "name",
            "username",
            "password",
            "email",
            "specialization",
            "role"
        ]

        update_fields = {f: body[f] for f in allowed_fields if f in body}

        if not update_fields:
            return cors_response(400, {"message": "No fields provided to update"})

        result = users.update_one(
            {"_id": user_object_id},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return cors_response(404, {"message": "User not found for given coachId"})

        return cors_response(200, {"message": "User updated successfully"})

    except Exception as e:
        return cors_response(500, {"message": "Update failed", "error": str(e)})
