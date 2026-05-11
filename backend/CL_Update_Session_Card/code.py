import json
import os
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI")
mongo = MongoClient(MONGO_URI)
db = mongo["CoachLife"]
session_cards_col = db["SessionCards"]
users_col = db["Users"]


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

    return users_col.find_one({"userToken": token}, {"password": 0})


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

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,userToken,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Content-Type": "application/json"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    authenticated_user = validate_user(event)
    if not authenticated_user:
        return {
            "statusCode": 401,
            "headers": headers,
            "body": json.dumps({"message": "Unauthorized: invalid or missing userToken"})
        }

    if not is_admin(authenticated_user):
        return {
            "statusCode": 403,
            "headers": headers,
            "body": json.dumps({"message": "Forbidden: admin access required"})
        }

    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "Invalid JSON body"})
        }

    session_card_id = body.get("sessionCardId") or body.get("card_id")
    if not session_card_id:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "sessionCardId is required"})
        }

    try:
        object_id = ObjectId(session_card_id)
    except Exception:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "Invalid sessionCardId format"})
        }

    existing = session_cards_col.find_one({"_id": object_id})
    if not existing:
        return {
            "statusCode": 404,
            "headers": headers,
            "body": json.dumps({"message": "Session card not found"})
        }

    update_fields = {}

    if "Topic" in body and isinstance(body["Topic"], str):
        update_fields["Topic"] = body["Topic"].strip()

    if "Objective" in body and isinstance(body["Objective"], str):
        update_fields["Objective"] = body["Objective"].strip()

    if "status" in body and isinstance(body["status"], str):
        valid_statuses = {"draft", "upcoming", "in_progress", "in progress", "completed"}
        if body["status"].strip().lower() not in valid_statuses:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"})
            }
        update_fields["status"] = body["status"].strip()

    if "sessionTakeaways" in body and isinstance(body["sessionTakeaways"], list):
        update_fields["sessionTakeaways"] = body["sessionTakeaways"]

    if "activities" in body and isinstance(body["activities"], list):
        cleaned_activities = []
        total_points = 0

        for idx, act in enumerate(body["activities"]):
            if not isinstance(act, dict):
                continue

            points_obj = act.get("points", {})
            if isinstance(points_obj, dict):
                act_points = int(points_obj.get("total", 0))
                eval_criteria = points_obj.get("evaluationCriteria", [])
            else:
                act_points = int(points_obj) if isinstance(points_obj, (int, float)) else 0
                eval_criteria = []

            total_points += act_points

            cleaned_activities.append({
                "activitySequence": idx + 1,
                "activityTitle": str(act.get("activityTitle", "")).strip(),
                "description": str(act.get("description", "")).strip(),
                "duration": int(act.get("duration", 0)),
                "story": act.get("story", []) if isinstance(act.get("story"), list) else [],
                "code": act.get("code") or None,
                "instructionsToCoach": act.get("instructionsToCoach", []) if isinstance(act.get("instructionsToCoach"), list) else [],
                "project": act.get("project") or None,
                "aiTools": act.get("aiTools") or None,
                "points": {
                    "total": act_points,
                    "evaluationCriteria": eval_criteria if isinstance(eval_criteria, list) else []
                },
                "rating": act.get("rating", 0),
                "feedback": act.get("feedback") or None
            })

        update_fields["activities"] = cleaned_activities
        update_fields["totalPoints"] = total_points

    if not update_fields:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"message": "No valid fields provided to update"})
        }

    update_fields["updatedAt"] = datetime.now(timezone.utc).isoformat()

    result = session_cards_col.update_one({"_id": object_id}, {"$set": update_fields})

    if result.matched_count == 0:
        return {
            "statusCode": 404,
            "headers": headers,
            "body": json.dumps({"message": "Session card not found during update"})
        }

    updated_card = session_cards_col.find_one({"_id": object_id})
    updated_card["_id"] = str(updated_card["_id"])

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "message": "Session card updated successfully",
            "sessionCard": updated_card
        }, default=str)
    }
