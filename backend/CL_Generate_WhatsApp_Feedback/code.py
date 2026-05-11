import json
import os
import traceback
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId
from openai import OpenAI

# ================= CONFIG =================
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

if not OPENAI_API_KEY:
    raise Exception("OPENAI_API_KEY not set")

# ================= DB =================
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db["Users"]
session_cards = db["SessionCards"]

# ================= OPENAI =================
ai_client = OpenAI(api_key=OPENAI_API_KEY.strip())

# ================= RESPONSE =================
def response(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
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

# ================= AI =================
def generate_whatsapp_message(player, topic, number, coach, completed, overall_comment):
    try:
        activity_lines = "\n".join([
            f"{a.get('activityTitle')} – Rating: {a.get('rating')}/5, Feedback: {a.get('feedback')}"
            for a in completed
        ])

        prompt = f"""
Generate a WhatsApp update message for a parent in EXACT format:

Hello,
Here’s an update on {player}’s recent session, “{topic} (Session {number})”, coached by {coach}:

Activities and Ratings:
{activity_lines}

Overall Comment: {overall_comment}

End with a short positive closing line.

Rules:
- Only include activities listed above
- Do not mention any incomplete activities
- Keep tone warm and professional
- Plain text only
"""

        completion = ai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "You generate structured WhatsApp updates for parents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5
        )

        return completion.choices[0].message.content.strip()

    except Exception as e:
        print("OPENAI ERROR:", str(e))
        print(traceback.format_exc())

        # fallback message
        return f"""Hello,
Here’s an update on {player}’s recent session, “{topic} (Session {number})”, coached by {coach}:

Activities and Ratings:
{activity_lines}

Overall Comment: {overall_comment}

{player} is progressing well and actively engaging in the activities. Please feel free to reach out if you have any questions.
Best regards."""

# ================= MAIN =================
def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return response(200, {"message": "CORS OK"})

        user = validate_user(event)
        if not user:
            return response(401, {"message": "Unauthorized"})

        body = json.loads(event.get("body") or "{}")

        session_card_id = body.get("sessionCardId")
        activities = body.get("activities_feedback", [])

        if not session_card_id:
            return response(400, {"message": "sessionCardId required"})

        # filter completed only
        completed = [
            a for a in activities
            if (a.get("rating", 0) > 0 or (a.get("feedback") or "").strip())
        ]

        if not completed:
            return response(400, {"message": "No completed activities"})

        avg_rating = round(
            sum(a.get("rating", 0) for a in completed) / len(completed), 1
        )

        whatsapp_message = generate_whatsapp_message(
            player=body.get("playerName", "Student"),
            topic=body.get("sessionTopic", ""),
            number=body.get("sessionNumber", ""),
            coach=body.get("coachName", "Coach"),
            completed=completed,
            overall_comment=body.get("overallComment", "")
        )

        now = datetime.now(timezone.utc).isoformat()

        feedback_docs = [
            {
                "activitySequence": a.get("activitySequence"),
                "activityTitle": a.get("activityTitle"),
                "rating": a.get("rating", 0),
                "feedback": a.get("feedback", ""),
                "completed": a in completed,
                "savedAt": now,
                "savedBy": str(user.get("_id"))
            }
            for a in activities
        ]

        session_cards.update_one(
            {"_id": ObjectId(session_card_id)},
            {
                "$set": {
                    "Whatsapp_feedback": feedback_docs,
                    "Whatsapp_message": whatsapp_message,
                    "Whatsapp_avgRating": avg_rating,
                    "Whatsapp_savedAt": now
                }
            }
        )

        return response(200, {
            "message": "Whatsapp feedback saved",
            "whatsappMessage": whatsapp_message,
            "averageRating": avg_rating
        })

    except Exception as e:
        print("FINAL ERROR:", str(e))
        print(traceback.format_exc())

        return response(500, {
            "error": str(e)
        })