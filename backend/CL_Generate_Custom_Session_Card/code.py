import os
import json
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed
 
# =====================================================
# ENV
# =====================================================
 
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
 
if not OPENAI_API_KEY or not MONGO_URI:
    raise RuntimeError("Missing environment variables")
 
# =====================================================
# CLIENTS
# =====================================================
 
openai_client = OpenAI(api_key=OPENAI_API_KEY)

IST = timezone(timedelta(hours=5, minutes=30))

def today_ist_str():
    return datetime.now(IST).strftime('%Y-%m-%d')

mongo = MongoClient(MONGO_URI)
db = mongo["CoachLife"]
 
players_col = db["Players"]
session_cards_col = db["SessionCards"]
users_col = db["Users"]
 
# =====================================================
# RESPONSE
# =====================================================
 
def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,userToken",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }
 
# =====================================================
# AUTH
# =====================================================
 
def validate_user_token(event):
    headers = event.get("headers", {}) or {}
 
    token = headers.get("userToken")
    if not token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "").strip()
 
    if not token:
        return None
 
    return users_col.find_one({"userToken": token})
 
# =====================================================
# LLM
# =====================================================
 
def call_llm(prompt: str) -> list:
    try:
        res = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Generate a short learning story for kids. "
                        "Plain text only. No bullets. No headings."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
 
        return [res.choices[0].message.content.strip()]
 
    except Exception as e:
        print("LLM ERROR:", str(e))
        return []
 
# =====================================================
# PROMPT
# =====================================================
 
def build_prompt(topic, activity, age):
    return f"""
Topic: {topic}
Activity Title: {activity.get("activityTitle")}
Description: {activity.get("description")}
Player Age: {age}
 
Write a simple learning story.
End clearly mentioning {topic}.
"""
 
# =====================================================
# CORE LOGIC
# =====================================================
 
def claim_carry_forward_activity(player_id, learning_pathway, next_session):
    """Claim ONE coach-flagged carry-forward activity (not_completed + carryForward,
    not yet carried) from the player's previous cards, stamp the old card so it can't
    be reused, and return a clean copy to inject. Oldest session first. See the
    standard generator for the mirror of this logic."""
    cursor = session_cards_col.find(
        {"playerId": player_id, "LearningPathway": learning_pathway},
        sort=[("session", 1)],
    )
    for card in cursor:
        for act in sorted(card.get("activities", []), key=lambda a: a.get("activitySequence") or 0):
            if (str(act.get("status", "")).lower() == "not_completed"
                    and act.get("carryForward") is True
                    and not act.get("carriedForwardToSession")):
                session_cards_col.update_one(
                    {"_id": card["_id"], "activities.activitySequence": act.get("activitySequence")},
                    {"$set": {"activities.$.carriedForwardToSession": next_session}},
                )
                return {
                    "activitySequence": None,
                    "activityTitle": act.get("activityTitle"),
                    "description": act.get("description"),
                    "story": act.get("story", []),
                    "code": act.get("code") if isinstance(act.get("code"), dict) else None,
                    "instructionsToCoach": act.get("instructionsToCoach", []),
                    "project": act.get("project"),
                    "aiTools": act.get("aiTools"),
                    "points": act.get("points"),
                    "rating": None,
                    "feedback": None,
                    "status": None,
                    "carryForward": False,
                    "isCarriedForward": True,
                    "carriedFromSession": card.get("session"),
                }
    return None

def create_custom_session_card(payload):
 
    player_id = payload.get("playerId")
 
    try:
        player_obj_id = ObjectId(player_id)
    except (InvalidId, TypeError):
        return {"message": "Invalid playerId"}
 
    player = players_col.find_one({"_id": player_obj_id})
    if not player:
        return {"message": "Player not found"}
 
    age = int(player.get("age", 0))

    learning_pathway = payload.get("LearningPathway") or player.get("LearningPathway")

    def enrich(activities):
        enriched, total = [], 0

        def process_activity(activity):
            story = activity.get("story")
            if not story or len(story) == 0:
                story = call_llm(build_prompt(payload.get("Topic"), activity, age))
            activity["story"] = story
            return activity

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(process_activity, act) for act in activities]
            for future in as_completed(futures):
                act = future.result()
                enriched.append(act)
                total += act.get("points", {}).get("total", 0)
        return enriched, total

    # REGENERATE-IN-PLACE - refilling a soft-deleted ("empty") slot. We update the
    # existing document instead of inserting, so the session number is preserved and
    # no duplicate/extra session is created. Status becomes "pending".
    regenerate_id = payload.get("sessionCardId")
    if regenerate_id:
        try:
            card_obj_id = ObjectId(regenerate_id)
        except (InvalidId, TypeError):
            return {"message": "Invalid sessionCardId"}

        existing = session_cards_col.find_one({"_id": card_obj_id})
        if not existing:
            return {"message": "Session card not found"}

        enriched_activities, total_points = enrich(payload.get("activities", []))

        session_cards_col.update_one(
            {"_id": card_obj_id},
            {"$set": {
                "LearningPathway": learning_pathway,
                "Topic": payload.get("Topic"),
                "typeOfSessioncard": payload.get("typeOfSessioncard", "Custom"),
                "Objective": payload.get("Objective"),
                "activities": enriched_activities,
                "totalPoints": total_points,
                "sessionTakeaways": payload.get("sessionTakeaways", []),
                "status": "pending",
                "sessionDate": payload.get("sessionDate") or today_ist_str(),
                "regeneratedAt": datetime.now(timezone.utc).isoformat(),
            }, "$unset": {"emptiedAt": "", "emptiedBy": ""}}
        )

        return {
            "message": "Custom session card regenerated",
            "session": existing.get("session"),
        }

    # FIND NEXT SESSION NUMBER - scoped to this pathway, matching the standard
    # generate flow so custom cards continue the same per-pathway sequence.
    last_session = session_cards_col.find_one(
        {"playerId": player_id, "LearningPathway": learning_pathway},
        sort=[("session", -1)],
    )

    if last_session:
        last_status = str(last_session.get("status", "")).lower().replace(" ", "_")
        if last_status in ("upcoming", "in_progress"):
            # Left hanging - the coach never submitted it. Rather than blocking this
            # player, auto-close it as "pending" - the same recoverable-miss status
            # already used for absent/excused - and continue generating the next card.
            session_cards_col.update_one(
                {"_id": last_session["_id"]},
                {"$set": {
                    "status": "pending",
                    "autoClosedReason": f"Left {last_status.replace('_', ' ')} - auto-closed on next generation",
                }}
            )
            last_session["status"] = "pending"

    next_session = 1 if not last_session else last_session["session"] + 1

    enriched_activities, total_points = enrich(payload.get("activities", []))

    # Pull in one coach-flagged carry-forward activity (oldest first) and prepend it,
    # then resequence so the whole card is 1..N.
    carried = claim_carry_forward_activity(player_id, learning_pathway, next_session)
    if carried:
        enriched_activities = [carried] + list(enriched_activities)
        if isinstance(carried.get("points"), dict):
            total_points += carried["points"].get("total", 0)
        for idx, act in enumerate(enriched_activities, start=1):
            act["activitySequence"] = idx

    session_doc = {
        "playerId": player_id,
        "LearningPathway": learning_pathway,
        "Topic": payload.get("Topic"),
        "session": next_session,
        "sessionDate": payload.get("sessionDate") or today_ist_str(),
        "typeOfSessioncard": payload.get("typeOfSessioncard", "Custom"),
        "Objective": payload.get("Objective"),
        "activities": enriched_activities,
        "totalPoints": total_points,
        "sessionTakeaways": payload.get("sessionTakeaways", []),
        "status": payload.get("status", "upcoming"),
        "rating": payload.get("rating"),
        "feedback": payload.get("feedback"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdByCoach": player.get("primaryCoach"),
    }
    if payload.get("batchGroupId"):
        session_doc["batchGroupId"] = payload["batchGroupId"]

    insert_result = session_cards_col.insert_one(session_doc)

    # Keep the player's sessionCardIds in sync (source of truth for the batch /
    # session-card views). Idempotent via $addToSet.
    players_col.update_one(
        {"_id": player_obj_id},
        {"$addToSet": {"sessionCardIds": str(insert_result.inserted_id)}},
    )

    return {
        "message": "Custom session card created",
        "session": next_session,
    }
 
# =====================================================
# LAMBDA HANDLER
# =====================================================
 
def lambda_handler(event, context):
 
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS OK"})
 
    user = validate_user_token(event)
    if not user:
        return response(401, {"message": "Unauthorized"})
 
    try:
        payload = json.loads(event.get("body") or "{}")
        result = create_custom_session_card(payload)
        status_code = 200 if "session" in result else 400
        return response(status_code, result)
 
    except Exception as e:
        print("ERROR:", str(e))
        return response(500, {"message": "Server error"})
 