import json
import os
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

# ================= CONFIG =================
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ================= DB =================
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
session_cards = db["SessionCards"]
users = db["Users"]

# ================= RESPONSE =================
def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,userToken",
            "Access-Control-Allow-Methods": "POST,OPTIONS"
        },
        "body": json.dumps(body)
    }

# ================= AUTH =================
def validate_user(event):
    headers = event.get("headers", {}) or {}

    token = (
        headers.get("userToken")
        or headers.get("UserToken")
        or headers.get("usertoken")
    )

    if not token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "").strip()

    if not token:
        return None

    return users.find_one({"userToken": token}, {"password": 0})

# ================= LAMBDA =================
def lambda_handler(event, context):

    # -------- CORS --------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    if event.get("httpMethod") != "POST":
        return response(405, {"message": "Method Not Allowed"})

    # -------- AUTH --------
    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized"})

    try:
        body = json.loads(event.get("body") or "{}")

        session_card_id = body.get("sessionCardId")
        whatsapp_message = body.get("whatsappMessage")

        # -------- VALIDATION --------
        if not session_card_id:
            return response(400, {"message": "sessionCardId is required"})

        if not whatsapp_message:
            return response(400, {"message": "whatsappMessage is required"})

        try:
            obj_id = ObjectId(session_card_id)
        except Exception:
            return response(400, {"message": "Invalid sessionCardId"})

        # -------- UPDATE --------
        result = session_cards.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "Whatsapp_message": whatsapp_message,
                    "Whatsapp_updatedAt": datetime.now(timezone.utc).isoformat(),
                    "Whatsapp_updatedBy": str(user.get("_id"))
                }
            }
        )

        if result.matched_count == 0:
            return response(404, {"message": "Session card not found"})

        return response(200, {
            "message": "Whatsapp message updated successfully",
            "whatsappMessage": whatsapp_message
        })

    except Exception as e:
        return response(500, {
            "message": "Server error",
            "error": str(e)
        })