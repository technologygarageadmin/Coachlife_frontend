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
        valid_statuses = {"draft", "upcoming", "in_progress", "in progress", "completed", "pending", "not_completed"}
        if body["status"].strip().lower() not in valid_statuses:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"})
            }
        update_fields["status"] = body["status"].strip()

    if "sessionTakeaways" in body and isinstance(body["sessionTakeaways"], list):
        update_fields["sessionTakeaways"] = body["sessionTakeaways"]

    if "sessionDate" in body and isinstance(body["sessionDate"], str) and body["sessionDate"].strip():
        update_fields["sessionDate"] = body["sessionDate"].strip()

    content_activities = None
    if "activities" in body and isinstance(body["activities"], list):
        content_activities = []

        for act in body["activities"]:
            if not isinstance(act, dict):
                continue

            points_obj = act.get("points", {})
            if isinstance(points_obj, dict):
                act_points = int(points_obj.get("total", 0))
                eval_criteria = points_obj.get("evaluationCriteria", [])
            else:
                act_points = int(points_obj) if isinstance(points_obj, (int, float)) else 0
                eval_criteria = []

            content_activities.append({
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
                "_bodyRating": act.get("rating", 0),
                "_bodyFeedback": act.get("feedback") or None,
                "_bodyStatus": act.get("status"),
            })

    def build_target_activities(activities_for_card):
        """The card named directly in the request: use the submitted rating/
        feedback/status as-is (this is the existing single-card edit contract -
        the caller round-trips whatever values it wants to keep or change)."""
        total_points = 0
        result_activities = []
        for act in activities_for_card:
            total_points += act["points"]["total"]
            result_activities.append({
                "activityTitle": act["activityTitle"],
                "description": act["description"],
                "duration": act["duration"],
                "story": act["story"],
                "code": act["code"],
                "instructionsToCoach": act["instructionsToCoach"],
                "project": act["project"],
                "aiTools": act["aiTools"],
                "points": act["points"],
                "rating": act.get("_bodyRating", 0),
                "feedback": act.get("_bodyFeedback"),
                "status": act.get("_bodyStatus"),
            })
        for idx, a in enumerate(result_activities, start=1):
            a["activitySequence"] = idx
        return result_activities, total_points

    def build_sibling_activities(activities_for_card, existing_progress):
        """Every OTHER card in the batch group: apply the shared content edit
        but keep that student's own rating/feedback/status, matched by
        activityTitle so an edit never clobbers what a student already did.
        Activities personal to that student (e.g. carried forward from a
        missed session) that aren't part of the shared content are kept.
        """
        progress_by_title = {}
        for a in existing_progress or []:
            title = str(a.get("activityTitle", "")).strip().lower()
            progress_by_title.setdefault(title, []).append(a)

        matched_ids = set()
        result_activities = []
        total_points = 0

        for act in activities_for_card:
            title_key = act["activityTitle"].strip().lower()
            candidates = progress_by_title.get(title_key, [])
            match = next((c for c in candidates if id(c) not in matched_ids), None)

            if match is not None:
                matched_ids.add(id(match))
                rating = match.get("rating")
                feedback = match.get("feedback")
                status = match.get("status")
            else:
                rating = None
                feedback = None
                status = None

            total_points += act["points"]["total"]
            result_activities.append({
                "activityTitle": act["activityTitle"],
                "description": act["description"],
                "duration": act["duration"],
                "story": act["story"],
                "code": act["code"],
                "instructionsToCoach": act["instructionsToCoach"],
                "project": act["project"],
                "aiTools": act["aiTools"],
                "points": act["points"],
                "rating": rating,
                "feedback": feedback,
                "status": status,
            })

        # Preserve any activity personal to this student (e.g. carried forward
        # from a missed session) that isn't part of the shared content at all.
        for a in existing_progress or []:
            if id(a) in matched_ids:
                continue
            if a.get("carriedForwardFromSession") is None:
                continue
            total_points += (a.get("points") or {}).get("total", 0)
            result_activities.insert(0, a)

        for idx, a in enumerate(result_activities, start=1):
            a["activitySequence"] = idx

        return result_activities, total_points

    apply_to_batch = bool(body.get("applyToBatch"))
    propagated_count = 0
    propagation_skipped_reason = None

    if content_activities is not None:
        final_activities, total_points = build_target_activities(content_activities)
        update_fields["activities"] = final_activities
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

    # Propagate shared content (Topic/Objective/sessionTakeaways/sessionDate/activities -
    # never rating/feedback/status) to every other card generated together as one batch.
    if apply_to_batch:
        batch_group_id = existing.get("batchGroupId")
        if not batch_group_id:
            propagation_skipped_reason = "This card is not linked to a batch generation group"
        else:
            siblings = list(session_cards_col.find({
                "batchGroupId": batch_group_id,
                "_id": {"$ne": object_id}
            }))
            for sibling in siblings:
                sibling_update = {}
                if "Topic" in update_fields:
                    sibling_update["Topic"] = update_fields["Topic"]
                if "Objective" in update_fields:
                    sibling_update["Objective"] = update_fields["Objective"]
                if "sessionTakeaways" in update_fields:
                    sibling_update["sessionTakeaways"] = update_fields["sessionTakeaways"]
                if "sessionDate" in update_fields:
                    sibling_update["sessionDate"] = update_fields["sessionDate"]
                if content_activities is not None:
                    sib_activities, sib_total = build_sibling_activities(
                        content_activities, sibling.get("activities", [])
                    )
                    sibling_update["activities"] = sib_activities
                    sibling_update["totalPoints"] = sib_total
                if not sibling_update:
                    continue
                sibling_update["updatedAt"] = datetime.now(timezone.utc).isoformat()
                session_cards_col.update_one({"_id": sibling["_id"]}, {"$set": sibling_update})
                propagated_count += 1

    updated_card = session_cards_col.find_one({"_id": object_id})
    updated_card["_id"] = str(updated_card["_id"])

    response_body = {
        "message": "Session card updated successfully",
        "sessionCard": updated_card,
    }
    if apply_to_batch:
        response_body["propagatedToCount"] = propagated_count
        if propagation_skipped_reason:
            response_body["propagationSkippedReason"] = propagation_skipped_reason

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(response_body, default=str)
    }
