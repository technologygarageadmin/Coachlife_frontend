import json
import os
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId

# ------------------ CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ IST TIMEZONE ------------------
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    return datetime.now(IST)

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
session_cards = db["SessionCards"]
players = db["Players"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}

def response(code, body):
    return {
        "statusCode": code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ AUTH ------------------
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

    user = users.find_one({"userToken": token}, {"password": 0})
    if not user:
        return None

    user["_id"] = str(user["_id"])
    return user

# ------------------ STATUS NORMALIZER ------------------
def normalize_status(status):
    if not status:
        return "UPCOMING"

    s = status.strip().lower()

    if s in ("upcoming", "not_started"):
        return "UPCOMING"

    if s in ("in_progress", "inprogress", "in-progress", "in progress"):
        return "in progress"

    if s in ("completed", "complete", "done"):
        return "completed"

    if s in ("pending", "absent", "excused"):
        return "pending"

    return status.strip()

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):
    try:
        # -------- CORS --------
        if event.get("httpMethod") == "OPTIONS":
            return response(200, {"message": "CORS OK"})

        # -------- AUTH --------
        user = validate_user(event)
        if not user:
            return response(401, {"message": "Unauthorized"})

        # -------- BODY --------
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            return response(400, {"message": "Invalid JSON body"})

        session_card_id = body.get("sessionCardId")
        if not session_card_id:
            return response(400, {"message": "sessionCardId is required"})

        # -------- FETCH CARD --------
        try:
            session_card = session_cards.find_one(
                {"_id": ObjectId(session_card_id)}
            )
        except Exception:
            return response(400, {"message": "Invalid sessionCardId"})

        if not session_card:
            return response(404, {"message": "Session card not found"})

        player_id = session_card.get("playerId")
        current_session = session_card.get("session")

        raw_status = session_card.get("status")
        current_status = normalize_status(raw_status)

        if player_id is None or current_session is None:
            return response(400, {"message": "Invalid session card data"})

        # -------- LAST COMPLETED SESSION --------
        last_completed = session_cards.find_one(
            {
                "playerId": player_id,
                "status": {"$regex": "^COMPLETED$", "$options": "i"}
            },
            sort=[("session", -1)]
        )

        last_completed_session = last_completed.get("session") if last_completed else 0

        # =====================================================
        # STATUS FLOW
        # =====================================================

        # -------- START SESSION --------
        if current_status in ("UPCOMING", "pending"):
            if current_session != last_completed_session + 1:
                # Allow starting if all sessions in the gap are pending (player was absent/excused)
                gap_cards = list(session_cards.find(
                    {
                        "playerId": player_id,
                        "session": {"$gt": last_completed_session, "$lt": current_session}
                    },
                    {"session": 1, "status": 1}
                ))
                all_skippable = bool(gap_cards) and all(
                    str(s.get("status", "")).lower() in ("pending", "absent", "excused")
                    for s in gap_cards
                )
                if not all_skippable:
                    return response(400, {
                        "message": f"Complete session {last_completed_session + 1} before starting this session"
                    })

            session_cards.update_one(
                {"_id": ObjectId(session_card_id)},
                {
                    "$set": {
                        "status": "in progress",
                        "startedAt": now_ist(),
                        "updatedAt": now_ist()
                    }
                }
            )

            return response(200, {
                "message": "Session started successfully",
                "session": current_session,
                "status": "in progress"
            })

        # -------- COMPLETE SESSION --------
        if current_status == "in progress":
            session_cards.update_one(
                {"_id": ObjectId(session_card_id)},
                {
                    "$set": {
                        "status": "completed",
                        "completedAt": now_ist(),
                        "updatedAt": now_ist()
                    }
                }
            )

            return response(200, {
                "message": "Session completed successfully",
                "session": current_session,
                "status": "completed"
            })

        # -------- ALREADY COMPLETED --------
        if current_status == "completed":
            return response(400, {"message": "Session already completed"})

        return response(400, {
            "message": f"Unsupported session status: {raw_status}"
        })

    except Exception as e:
        print("ERROR:", str(e))
        return response(500, {
            "message": "Internal server error",
            "error": str(e)
        })
