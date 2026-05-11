import json
import os
from pymongo import MongoClient
from bson import ObjectId

# =====================================================
# DATABASE CONFIG
# =====================================================
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# ⬇️ Use Users collection instead of Coaches
users = db["Users"]

# =====================================================
# CORS HEADERS
# =====================================================
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, userToken, Authorization",
    "Access-Control-Allow-Methods": "OPTIONS, POST"
}

# =====================================================
# RESPONSE HELPER
# =====================================================
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# =====================================================
# COACH TOKEN VALIDATION FROM USERS COLLECTION
# =====================================================
def validate_coach(event):
    headers = event.get("headers", {}) or {}

    token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("UserToken")
        or headers.get("authorization")
    )

    if token and token.startswith("Bearer "):
        token = token.replace("Bearer ", "").strip()

    if not token:
        return None

    # 🔐 Ensure only users having role = "coach" are allowed (optional but safer)
    return users.find_one({
        "userToken": token,
        "role": "coach"          # remove if your DB doesn’t store role
    })

# =====================================================
# LAMBDA HANDLER
# =====================================================
def lambda_handler(event, context):

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": ""
        }

    coach = validate_coach(event)
    if not coach:
        return response(401, {"message": "Unauthorized: Coach access required"})

    try:
        body = json.loads(event.get("body") or "{}")

        player_id = body.get("playerId")
        from_coach = body.get("fromCoachId")
        to_coach = body.get("toCoachId")

        if not player_id or not from_coach:
            return response(400, {
                "message": "playerId and fromCoachId are required"
            })

        try:
            from_coach_id = ObjectId(from_coach)
            to_coach_id = ObjectId(to_coach) if to_coach else None
        except Exception:
            return response(400, {"message": "Invalid coachId format"})

        # ------------------ REMOVE FROM OLD COACH ------------------
        users.update_one(
            {"_id": from_coach_id},
            {"$pull": {"PlayersList": player_id}}
        )

        # ------------------ ADD TO NEW COACH ------------------
        if to_coach_id:
            users.update_one(
                {"_id": to_coach_id},
                {"$addToSet": {"PlayersList": player_id}}
            )

            return response(200, {
                "message": "Player reassigned successfully"
            })

        return response(200, {
            "message": "Player removed from coach successfully"
        })

    except Exception as e:
        return response(500, {
            "message": "Player update failed",
            "error": str(e)
        })
