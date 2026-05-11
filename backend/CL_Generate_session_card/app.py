import os
import json
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from concurrent.futures import ThreadPoolExecutor, as_completed

# =====================================================
# ENV VARIABLES
# =====================================================

MONGO_URI = os.environ.get("MONGO_URI")

if not MONGO_URI:
    raise Exception("Missing MONGO_URI")

mongo = MongoClient(MONGO_URI)
db = mongo["CoachLife"]

player_col = db["Players"]
pathway_col = db["MasterLearningPathway"]
session_cards_col = db["SessionCards"]

# =====================================================
# CORS HEADERS (*)
# =====================================================

def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "*"
    }

# =====================================================
# MAIN LOGIC
# =====================================================

def generate_session_card(player_id: str) -> dict:

    try:
        player_object_id = ObjectId(player_id)
    except (InvalidId, TypeError):
        return {"message": "Invalid playerId format"}

    player = player_col.find_one({"_id": player_object_id})
    if not player:
        return {"message": "Player not found"}

    learning_pathway = player.get("LearningPathway")

    if not learning_pathway:
        return {"message": "LearningPathway missing"}

    # Last session
    last_session = session_cards_col.find_one(
        {"playerId": player_id, "LearningPathway": learning_pathway},
        sort=[("session", -1)]
    )

    if last_session:
        status = last_session.get("status")

        if status not in ["upcoming", "in_progress", "completed"]:
            return {"message": f"Invalid session status: {status}"}

        if status in ["upcoming", "in_progress"]:
            return {"message": f"Previous session is still {status}"}

    next_session = 1 if not last_session else last_session["session"] + 1

    pathway = pathway_col.find_one({
        "LearningPathway": learning_pathway,
        "session": next_session
    })

    if not pathway:
        return {"message": "No pathway found"}

    # Duplicate check
    if session_cards_col.find_one({
        "playerId": player_id,
        "LearningPathway": learning_pathway,
        "session": next_session
    }):
        return {"message": "Session already exists"}

    enriched_activities = []
    total_points = 0

    def process_activity(act):
        return {
            "activitySequence": act.get("activitySequence"),
            "activityTitle": act.get("activityTitle"),
            "description": act.get("description"),
            "story": act.get("story", []),  # from DB
            "code": act.get("code") if isinstance(act.get("code"), dict) else None,
            "instructionsToCoach": act.get("instructionsToCoach", []),
            "project": act.get("project"),
            "aiTools": act.get("aiTools"),
            "points": act.get("points"),
            "rating": None,
            "feedback": None
        }

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_activity, act) for act in pathway.get("activities", [])]

        for future in as_completed(futures):
            activity = future.result()
            enriched_activities.append(activity)

            if activity.get("points") and isinstance(activity["points"], dict):
                total_points += activity["points"].get("total", 0)

    session_cards_col.insert_one({
        "playerId": player_id,
        "LearningPathway": learning_pathway,
        "session": next_session,
        "Topic": pathway.get("Topic"),
        "SessionType": pathway.get("SessionType"),
        "typeOfSessioncard": "default",
        "Objective": pathway.get("Objective"),
        "activities": enriched_activities,
        "totalPoints": total_points,
        "sessionTakeaways": pathway.get("sessionTakeaways", []),
        "status": "upcoming",
        "rating": None,
        "feedback": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdByCoach": player.get("primaryCoach"),
    })

    return {
        "message": "Session created",
        "session": next_session
    }

# =====================================================
# LAMBDA HANDLER (CORS ENABLED)
# =====================================================

def lambda_handler(event, context):
    try:
        # 🔥 Handle preflight request
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": cors_headers(),
                "body": json.dumps({})
            }

        body = event.get("body")

        if isinstance(body, str):
            body = json.loads(body)

        player_id = body.get("playerId") if body else None

        if not player_id:
            return {
                "statusCode": 400,
                "headers": cors_headers(),
                "body": json.dumps({"message": "playerId required"})
            }

        result = generate_session_card(player_id)

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(result)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)})
        }