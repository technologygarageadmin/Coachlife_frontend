import json
import os
from datetime import datetime
from pymongo import MongoClient

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"
USER_COLLECTION = "Users"

if not MONGO_URI:
    raise Exception("MONGO_URI not set in environment variables")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db[USER_COLLECTION]

# ------------------ COMMON RESPONSE ------------------
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

# ------------------ TOKEN VALIDATION ------------------
def validate_user_token(event):
    headers = event.get("headers", {}) or {}

    user_token = (
        headers.get("userToken")
        or headers.get("UserToken")
        or headers.get("usertoken")
    )

    if not user_token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            user_token = auth.replace("Bearer ", "").strip()

    if not user_token:
        return None

    # Validate against Users collection
    return users.find_one({"userToken": user_token})

# ------------------ ROLE SCOPE ------------------
def is_super_admin(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    return "superadmin" in [r.lower() for r in roles]

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    # -------- Authorization --------
    user = validate_user_token(event)

    if not user:
        return cors_response(
            401,
            {"message": "Unauthorized: Invalid or missing user token"}
        )

    if not is_super_admin(user):
        return cors_response(403, {"message": "Forbidden: superAdmin role required"})

    # -------- Body validation --------
    if "body" not in event or not event["body"]:
        return cors_response(400, {"message": "Request body is missing"})

    try:
        body = json.loads(event["body"])

        name = body.get("name")
        username = body.get("username")
        password = body.get("password")
        email = body.get("email")
        role = body.get("role")

        if not all([name, username, password, email]):
            return cors_response(
                400,
                {"message": "name, username, password, and email are required"}
            )

        # duplicate username check
        if users.find_one({"username": username}):
            return cors_response(400, {"message": "Username already exists"})

        # -------- INSERT USER --------
        user_data = {
            "name": name,
            "username": username,
            "password": password,
            "email": email,
            "role": role,
            "createdBy": str(user["_id"]),
            "registrationTime": datetime.utcnow()
        }

        users.insert_one(user_data)

        return cors_response(201, {"message": "User added successfully"})

    except json.JSONDecodeError:
        return cors_response(400, {"message": "Invalid JSON format"})

    except Exception as e:
        return cors_response(
            500,
            {"message": "Add user failed", "error": str(e)}
        )
