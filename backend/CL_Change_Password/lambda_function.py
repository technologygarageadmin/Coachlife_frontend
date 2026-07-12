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


def resp(code, body):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps(body)}


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


def get_method(event):
    # REST/proxy v1 puts it on httpMethod; HTTP API (payload v2) puts it under
    # requestContext.http.method.
    return (
        event.get("httpMethod")
        or (event.get("requestContext", {}) or {}).get("http", {}).get("method")
    )


def lambda_handler(event, context):
    if get_method(event) == "OPTIONS":
        return resp(200, {"message": "CORS OK"})

    # Authenticate the caller via their session token.
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

    # Both values arrive already SHA256-hashed by the client (same as login), so we
    # compare and store hashes - the plaintext never leaves the browser.
    current_password = str(body.get("currentPassword") or "").strip()
    new_password = str(body.get("newPassword") or "").strip()

    if not current_password or not new_password:
        return resp(400, {"message": "currentPassword and newPassword are required"})

    if user.get("password") != current_password:
        return resp(400, {"message": "Current password is incorrect"})

    if new_password == current_password:
        return resp(400, {"message": "New password must be different from the current password"})

    users.update_one({"_id": user["_id"]}, {"$set": {"password": new_password}})

    return resp(200, {"message": "Password updated successfully"})
