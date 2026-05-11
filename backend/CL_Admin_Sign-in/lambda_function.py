import json
import os
import uuid
from datetime import datetime
from pymongo import MongoClient
from zoneinfo import ZoneInfo   # <-- IST timezone

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"
COLLECTION_NAME = "Users"

if not MONGO_URI:
    raise Exception("MONGO_URI not set in environment variables")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db[COLLECTION_NAME]

# ------------------ COMMON RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Validation",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body)
    }

# ------------------ SERIALIZER ------------------
def serialize_mongo_document(doc):
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # ------------------ CORS PREFLIGHT ------------------
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    if not event.get("body"):
        return cors_response(400, {"message": "Request body is missing"})

    try:
        body = json.loads(event["body"])
        username = body.get("username")
        password = body.get("password")

        if not username or not password:
            return cors_response(400, {
                "message": "username and password are required"
            })

        # ------------------ FIND USER ------------------
        user = users.find_one(
            {"username": username, "password": password}
        )

        if not user:
            return cors_response(401, {
                "message": "Invalid username or password"
            })

        # ------------------ GENERATE NEW TOKEN ------------------
        new_user_token = uuid.uuid4().hex[:12]

        # ------------------ UPDATE TOKEN & LOGIN TIME (IST) ------------------
        ist_time = datetime.now(ZoneInfo("Asia/Kolkata"))

        users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "userToken": new_user_token,
                    "lastLogin": ist_time
                }
            }
        )

        # ------------------ PREPARE RESPONSE ------------------
        user["_id"] = str(user["_id"])
        user["userToken"] = new_user_token
        user["lastLogin"] = ist_time

        role = user.get("role", "user")

        # remove password
        user.pop("password", None)

        # serialize dates to JSON strings
        user = serialize_mongo_document(user)

        return cors_response(200, {
            "message": "Login successful",
            "userToken": new_user_token,
            "role": role
        })

    except json.JSONDecodeError:
        return cors_response(400, {
            "message": "Invalid JSON format"
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Login failed",
            "error": str(e)
        })
