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

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # -------- CORS PREFLIGHT --------
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    # -------- AUTH --------
    user = validate_user(event)
    if not user:
        return response(401, {"message": "Unauthorized or token missing"})

    # -------- PARSE BODY --------
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return response(400, {"message": "Invalid JSON body"})

    card_id = body.get("card_id")
    activities_feedback = body.get("activities_feedback")

    # NEW OVERALL FIELDS
    overall_rating = body.get("overallRating")
    overall_feedback = body.get("overallFeedback")

    if not card_id:
        return response(400, {"message": "card_id is required"})

    if not isinstance(activities_feedback, list):
        return response(400, {"message": "activities_feedback must be an array"})

    # -------- VALIDATE ACTIVITIES --------
    for idx, activity in enumerate(activities_feedback):
        if not all(k in activity for k in ("activitySequence", "rating", "feedback")):
            return response(
                400,
                {
                    "message": f"Invalid activities_feedback at index {idx}. "
                               "Required: activitySequence, rating, feedback"
                }
            )

    # -------- VALIDATE OVERALL FIELDS --------
    if overall_rating is not None:
        if not isinstance(overall_rating, (int, float)) or not (0 <= overall_rating <= 5):
            return response(
                400,
                {"message": "overallRating must be a number between 0 and 5"}
            )

    if overall_feedback is not None:
        if not isinstance(overall_feedback, str):
            return response(
                400,
                {"message": "overallFeedback must be a string"}
            )

    now = now_ist()

    # -------- UPDATE ACTIVITIES --------
    for activity in activities_feedback:
        session_cards.update_one(
            {
                "_id": ObjectId(card_id),
                "activities.activitySequence": activity["activitySequence"]
            },
            {
                "$set": {
                    "activities.$.rating": activity["rating"],
                    "activities.$.feedback": activity["feedback"],
                    "updatedAt": now,
                    "updatedBy": {
                        "id": user["_id"],
                        "name": user.get("name")
                    }
                }
            }
        )

    # -------- UPDATE OVERALL FEEDBACK --------
    overall_update = {}

    if overall_rating is not None:
        overall_update["overallRating"] = overall_rating

    if overall_feedback is not None:
        overall_update["overallFeedback"] = overall_feedback

    if overall_update:
        overall_update["updatedAt"] = now
        overall_update["updatedBy"] = {
            "id": user["_id"],
            "name": user.get("name")
        }

        session_cards.update_one(
            {"_id": ObjectId(card_id)},
            {"$set": overall_update}
        )

    # -------- FETCH CARD --------
    card = session_cards.find_one(
        {"_id": ObjectId(card_id)},
        {
            "activities": 1,
            "status": 1,
            "totalPoints": 1,
            "playerId": 1
        }
    )

    if not card:
        return response(404, {"message": "Session card not found"})

    # -------- CHECK COMPLETION --------
    all_completed = True
    for activity in card.get("activities", []):
        if not activity.get("feedback"):
            all_completed = False
            break

    # -------- COMPLETE SESSION & CREDIT POINTS --------
    if all_completed and card.get("status") != "completed":

        total_points = card.get("totalPoints", 0)
        player_id = card.get("playerId")

        session_cards.update_one(
            {"_id": ObjectId(card_id)},
            {
                "$set": {
                    "status": "completed",
                    "updatedAt": now,
                    "updatedBy": {
                        "id": user["_id"],
                        "name": user.get("name")
                    }
                }
            }
        )

        if player_id and total_points > 0:
            players.update_one(
                {"_id": ObjectId(player_id)},
                {
                    "$inc": {
                        "TotalPoints": total_points,
                        "PointBalance": total_points
                    }
                }
            )

    # -------- RESPONSE --------
    return response(
        200,
        {
            "message": "Activity feedback and overall feedback updated successfully",
            "card_id": card_id,
            "status": "completed" if all_completed else "in_progress",
            "updatedAt": now.isoformat()
        }
    )
