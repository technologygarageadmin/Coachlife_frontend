import json
import os
from pymongo import MongoClient

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db["Users"]

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
}

# Fields a user may edit on their own profile. username (login id), password, role,
# and userToken are intentionally NOT editable here.
ALLOWED_FIELDS = ["name", "email", "phone", "address", "specialization"]


def resp(code, body):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps(body, default=str)}


def get_method(event):
    # REST/proxy v1: httpMethod. HTTP API (payload v2): requestContext.http.method.
    return (
        event.get("httpMethod")
        or (event.get("requestContext", {}) or {}).get("http", {}).get("method")
    )


def get_token(event):
    headers = event.get("headers", {}) or {}
    token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("UserToken")
    )
    if not token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "").strip()
    return token


def lambda_handler(event, context):
    if get_method(event) == "OPTIONS":
        return resp(200, {"message": "CORS OK"})

    token = get_token(event)
    if not token:
        return resp(401, {"message": "Unauthorized: user token missing"})

    user = users.find_one({"userToken": token})
    if not user:
        return resp(401, {"message": "Unauthorized: invalid session"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return resp(400, {"message": "Invalid JSON body"})

    updates = {}
    for field in ALLOWED_FIELDS:
        if field in body and body[field] is not None:
            updates[field] = str(body[field]).strip()

    if not updates:
        return resp(400, {"message": "No editable fields provided"})

    users.update_one({"_id": user["_id"]}, {"$set": updates})

    return resp(200, {"message": "Profile updated successfully", "updated": updates})
