import os
import json
from datetime import datetime, timezone
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
 
    # 🔢 FIND NEXT SESSION NUMBER
    last_session = session_cards_col.find_one(
        {"playerId": player_id},
        sort=[("session", -1)],
    )
 
    next_session = 1 if not last_session else last_session["session"] + 1
 
    activities = payload.get("activities", [])
    enriched_activities = []
    total_points = 0
 
    def process_activity(activity):
        story = activity.get("story")
 
        if not story or len(story) == 0:
            story = call_llm(
                build_prompt(
                    payload.get("Topic"),
                    activity,
                    age,
                )
            )
 
        activity["story"] = story
        return activity
 
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_activity, act) for act in activities]
 
        for future in as_completed(futures):
            act = future.result()
            enriched_activities.append(act)
            total_points += act.get("points", {}).get("total", 0)
 
    session_doc = {
        "playerId": player_id,
        "LearningPathway": payload.get("LearningPathway"),
        "Topic": payload.get("Topic"),
        "session": next_session,
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
 
    session_cards_col.insert_one(session_doc)
 
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
        return response(200, result)
 
    except Exception as e:
        print("ERROR:", str(e))
        return response(500, {"message": "Server error"})
 