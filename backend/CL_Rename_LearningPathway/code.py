import json
import os
from datetime import datetime, timezone
from pymongo import MongoClient

# =====================================================
# CONFIG
# =====================================================
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME   = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# =====================================================
# DB
# =====================================================
client   = MongoClient(MONGO_URI)
db       = client[DB_NAME]
users    = db["Users"]
master_learning_pathway = db["MasterLearningPathway"]
players  = db["Players"]
session_cards = db["SessionCards"]

# =====================================================
# CORS
# =====================================================
CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}

def response(code, body):
    return {
        "statusCode": code,
        "headers":    CORS_HEADERS,
        "body":       json.dumps(body)
    }

# =====================================================
# AUTH
# =====================================================
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


def is_admin(user):
    roles = []

    def collect_role_values(value):
        if value is None:
            return

        if isinstance(value, str):
            roles.append(value)
            return

        if isinstance(value, (list, tuple, set)):
            for item in value:
                collect_role_values(item)
            return

        if isinstance(value, dict):
            for key in ("role", "name", "value", "type"):
                if key in value:
                    collect_role_values(value.get(key))

    collect_role_values(user.get("roles"))
    collect_role_values(user.get("role"))

    normalized_roles = {str(role).strip().lower() for role in roles if role is not None}

    for role in normalized_roles:
        cleaned = role.replace("_", "").replace("-", "").replace(" ", "")
        if "admin" in cleaned:
            return True

    return False

# =====================================================
# LAMBDA HANDLER
# =====================================================
def lambda_handler(event, context):
    try:
        # CORS preflight
        if event.get("httpMethod") == "OPTIONS":
            return response(200, {"message": "CORS OK"})

        # Only POST allowed
        if event.get("httpMethod") != "POST":
            return response(405, {"message": "Method Not Allowed"})

        # Auth - only admins should rename pathways
        user = validate_user(event)
        if not user:
            return response(401, {"message": "Unauthorized: invalid or missing userToken"})

        if not is_admin(user):
            return response(403, {"message": "Forbidden: admin access required"})

        # Parse body
        body = event.get("body") or "{}"
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                return response(400, {"message": "Invalid JSON body"})
        if not isinstance(body, dict):
            return response(400, {"message": "Request body must be a JSON object"})

        # Validate
        old_name = (body.get("oldName") or "").strip()
        new_name = (body.get("newName") or "").strip()

        if not old_name:
            return response(400, {"message": "oldName is required"})
        if not new_name:
            return response(400, {"message": "newName is required"})
        if old_name == new_name:
            return response(400, {"message": "New name must be different from current name"})

        # Check old name exists
        exists = master_learning_pathway.find_one({"LearningPathway": old_name})
        if not exists:
            return response(404, {"message": f"No sessions found with pathway name: {old_name}"})

        # Check new name not already taken
        conflict = master_learning_pathway.find_one({"LearningPathway": new_name})
        if conflict:
            return response(409, {"message": f"A pathway with the name '{new_name}' already exists"})

        now_utc = datetime.now(timezone.utc)
        updated_by = {
            "id": str(user.get("_id")) if user.get("_id") else None,
            "name": user.get("name")
        }

        # Rename in master learning pathway sessions
        master_result = master_learning_pathway.update_many(
            {"LearningPathway": old_name},
            {
                "$set": {
                    "LearningPathway": new_name,
                    "updatedAt": now_utc,
                    "updatedBy": updated_by
                }
            }
        )

        # Cascade rename in players collection
        players_result = players.update_many(
            {"LearningPathway": old_name},
            {
                "$set": {
                    "LearningPathway": new_name,
                    "updatedAt": now_utc,
                    "updatedBy": updated_by
                }
            }
        )

        # Cascade rename in session cards collection
        session_cards_result = session_cards.update_many(
            {"LearningPathway": old_name},
            {
                "$set": {
                    "LearningPathway": new_name,
                    "updatedAt": now_utc.isoformat()
                }
            }
        )

        return response(200, {
            "message": "Learning pathway renamed successfully",
            "oldName": old_name,
            "newName": new_name,
            "updates": {
                "masterLearningPathway": {
                    "matched": master_result.matched_count,
                    "modified": master_result.modified_count
                },
                "players": {
                    "matched": players_result.matched_count,
                    "modified": players_result.modified_count
                },
                "sessionCards": {
                    "matched": session_cards_result.matched_count,
                    "modified": session_cards_result.modified_count
                }
            }
        })

    except Exception as e:
        return response(500, {"error": str(e)})
