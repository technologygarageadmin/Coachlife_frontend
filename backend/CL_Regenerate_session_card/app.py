import os
import json
import re
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId
from openai import OpenAI

# =====================================================
# ENV
# =====================================================

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MONGO_URI = os.environ.get("MONGO_URI")

if not OPENAI_API_KEY or not MONGO_URI:
    raise Exception("Missing environment variables")

client = OpenAI(api_key=OPENAI_API_KEY)

mongo = MongoClient(MONGO_URI)
db = mongo["CoachLife"]

player_col = db["Players"]
session_cards_col = db["SessionCards"]

# =====================================================
# CORS
# =====================================================

def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
    }

# =====================================================
# HELPERS
# =====================================================

def clean_text(text):
    if isinstance(text, list):
        text = " ".join(text)
    return re.sub(r"<.*?>", "", text or "")

def safe_json_parse(text):
    try:
        return json.loads(text)
    except:
        if "```" in text:
            text = text.split("```")[1]
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise Exception("Invalid JSON from LLM")

def is_similar(a, b):
    a = clean_text(a).lower()
    b = clean_text(b).lower()
    return a[:120] == b[:120]  # simple similarity check

# =====================================================
# LLM CALLS
# =====================================================

def call_story_llm(prompt):
    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Return ONLY JSON {story:[], instructionsToCoach:[]} in plain text"
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.8
    )
    return safe_json_parse(res.choices[0].message.content)


def call_code_llm(prompt):
    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Return ONLY JSON {code:{language,content}}"},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    return safe_json_parse(res.choices[0].message.content)

# =====================================================
# PROMPTS (STRICT)
# =====================================================

def build_story_prompt(activity, card, player, reason, retry=False):

    old_story = clean_text(activity.get("story", []))

    extra = "MAKE IT EVEN MORE DIFFERENT." if retry else ""

    return f"""
You are regenerating content.

STRICT RULES:
- DO NOT use story format
- DO NOT use analogy (no food, tailor, lego, etc.)
- DO NOT use HTML
- ONLY plain text
- Direct explanation like a teacher
- Max 3 sentences
- MUST be different from old

OLD CONTENT:
{old_story}

Topic: {card['Topic']}
Activity: {activity['activityTitle']}
Age: {player['age']}

Reason:
{reason}

{extra}

OUTPUT JSON:
{{
 "story": ["simple explanation"],
 "instructionsToCoach": ["short steps"]
}}
"""

def build_code_prompt(activity, card, reason):
    old_code = activity.get("code")

    return f"""
Generate NEW code.

Do NOT reuse:
{old_code}

Topic: {card['Topic']}
Activity: {activity['activityTitle']}

Reason:
{reason}

Return JSON:
{{
 "code": {{
   "language": "python",
   "content": "new code"
 }}
}}
"""

# =====================================================
# MAIN LOGIC
# =====================================================

def regenerate(card_id, seq, fields, reason):

    card = session_cards_col.find_one({"_id": ObjectId(card_id)})
    if not card:
        raise Exception("Session not found")

    if card["status"] == "completed":
        raise Exception("Cannot regenerate completed session")

    player = player_col.find_one({"_id": ObjectId(card["playerId"])})

    activity = next(
        (a for a in card["activities"] if a["activitySequence"] == seq),
        None
    )

    if not activity:
        raise Exception("Activity not found")

    allowed = {"story", "instructionsToCoach", "code"}
    fields = [f for f in fields if f in allowed]

    if not fields:
        raise Exception("No valid fields")

    update = {}

    # STORY + INSTRUCTIONS
    if any(f in fields for f in ["story", "instructionsToCoach"]):

        res = call_story_llm(
            build_story_prompt(activity, card, player, reason)
        )

        # retry if same
        if is_similar(res.get("story"), activity.get("story")):
            res = call_story_llm(
                build_story_prompt(activity, card, player, reason, retry=True)
            )

        if "story" in fields:
            update["activities.$.story"] = res.get("story", [])

        if "instructionsToCoach" in fields:
            update["activities.$.instructionsToCoach"] = res.get("instructionsToCoach", [])

    # CODE
    if "code" in fields:
        res = call_code_llm(
            build_code_prompt(activity, card, reason)
        )
        update["activities.$.code"] = res.get("code")

    # DB update
    session_cards_col.update_one(
        {
            "_id": ObjectId(card_id),
            "activities.activitySequence": seq
        },
        {
            "$set": update,
            "$inc": {"regeneratedCount": 1},
            "$set": {
                "lastRegeneratedAt": datetime.now(timezone.utc).isoformat()
            }
        }
    )

    return {
        "message": "Regenerated",
        "updatedFields": fields
    }

# =====================================================
# LAMBDA HANDLER
# =====================================================

def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {"statusCode": 200, "headers": cors(), "body": "{}"}

        body = event.get("body")

        if isinstance(body, str):
            body = json.loads(body)

        result = regenerate(
            body.get("cardId"),
            body.get("activitySequence"),
            body.get("fieldsToRegenerate", []),
            body.get("reason", "")
        )

        return {
            "statusCode": 200,
            "headers": cors(),
            "body": json.dumps(result)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors(),
            "body": json.dumps({"error": str(e)})
        }