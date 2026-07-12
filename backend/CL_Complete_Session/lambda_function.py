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

# ------------------ HOME TASK MAKE-UP ------------------
def complete_home_task(body, user):
    """Mark ONE activity (left not_completed during the session) as completed later.

    Credits that activity's points to the player exactly once, and clears the
    card's home-task flag when no not_completed activities remain. The session
    card stays 'completed' throughout - this only closes a leftover activity.
    """
    card_id = body.get("card_id")
    seq = body.get("activitySequence")

    if not card_id:
        return response(400, {"message": "card_id is required"})
    if seq is None:
        return response(400, {"message": "activitySequence is required"})
    try:
        seq = int(seq)
    except (TypeError, ValueError):
        return response(400, {"message": "activitySequence must be a number"})

    rating = body.get("rating")
    if rating is not None and (not isinstance(rating, (int, float)) or not (0 <= rating <= 5)):
        return response(400, {"message": "rating must be a number between 0 and 5"})
    feedback = body.get("feedback")

    try:
        card_oid = ObjectId(card_id)
    except Exception:
        return response(400, {"message": "Invalid card_id"})

    now = now_ist()
    card = session_cards.find_one({"_id": card_oid})
    if not card:
        return response(404, {"message": "Session card not found"})

    target = next((a for a in card.get("activities", []) if a.get("activitySequence") == seq), None)
    if not target:
        return response(404, {"message": f"Activity {seq} not found on this card"})
    if str(target.get("status")) == "completed":
        return response(200, {"message": "Home task already completed", "alreadyDone": True})

    points = (target.get("points") or {}).get("total", 0) or 0

    set_fields = {
        "activities.$.status": "completed",
        "activities.$.completedAsHomeTask": True,
        "updatedAt": now,
        "updatedBy": {"id": user["_id"], "name": user.get("name")},
    }
    if rating is not None:
        set_fields["activities.$.rating"] = rating
    if feedback is not None:
        set_fields["activities.$.feedback"] = feedback

    # Atomic flip guarded on "not already completed" so points can't be double-credited
    # even if the button is clicked twice. $elemMatch is REQUIRED here: with two plain
    # dot-notation conditions the positional `$` can bind to the wrong array element
    # (the first not_completed activity, not the one with this activitySequence),
    # which would flip/credit the wrong activity and leave the clicked one unchanged.
    upd = session_cards.update_one(
        {"_id": card_oid,
         "activities": {"$elemMatch": {"activitySequence": seq, "status": {"$ne": "completed"}}}},
        {"$set": set_fields, "$inc": {"earnedPoints": points}},
    )
    if upd.modified_count == 0:
        return response(200, {"message": "Home task already completed", "alreadyDone": True})

    player_id = card.get("playerId")
    if player_id and points > 0:
        try:
            players.update_one({"_id": ObjectId(player_id)},
                               {"$inc": {"TotalPoints": points, "PointBalance": points}})
        except Exception:
            pass

    fresh = session_cards.find_one({"_id": card_oid}, {"activities": 1})
    remaining = [a.get("activitySequence") for a in (fresh.get("activities") or [])
                 if a.get("status") == "not_completed"]
    session_cards.update_one(
        {"_id": card_oid},
        {"$set": {"hasHomeTask": len(remaining) > 0, "homeTaskActivities": remaining}},
    )

    return response(200, {
        "message": "Home task completed",
        "card_id": card_id,
        "activitySequence": seq,
        "creditedPoints": points,
        "remainingHomeTasks": remaining,
    })


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

    # -------- HOME TASK MAKE-UP (single activity) --------
    if str(body.get("action") or "").strip() == "completeHomeTask":
        return complete_home_task(body, user)

    card_id = body.get("card_id")
    activities_feedback = body.get("activities_feedback", [])
    rating = body.get("rating")
    feedback = body.get("feedback")

    if not card_id:
        return response(400, {"message": "card_id is required"})

    if not isinstance(activities_feedback, list):
        return response(400, {"message": "activities_feedback must be an array"})

    # -------- VALIDATE ACTIVITIES INPUT --------
    # `status` is optional and defaults to "completed" for backward compatibility with
    # older clients that only ever sent rating + feedback. A "not_completed" activity
    # may omit rating/feedback (feedback stays optional context, not a grade).
    for idx, activity in enumerate(activities_feedback):
        if "activitySequence" not in activity:
            return response(
                400,
                {"message": f"Invalid activities_feedback at index {idx}. activitySequence is required."}
            )

        status = str(activity.get("status") or "completed").strip().lower()
        if status not in ("completed", "not_completed"):
            return response(400, {
                "message": f"Invalid status at index {idx}. Must be 'completed' or 'not_completed'."
            })

        if status == "completed":
            rating_val = activity.get("rating")
            if rating_val is None or not isinstance(rating_val, (int, float)) or not (0 <= rating_val <= 5):
                return response(400, {
                    "message": f"Activity {activity.get('activitySequence')} needs a rating (0-5) to be marked completed."
                })

    # -------- VALIDATE OVERALL FIELDS --------
    if rating is not None:
        if not isinstance(rating, (int, float)) or not (0 <= rating <= 5):
            return response(400, {"message": "Rating must be a number between 0 and 5"})

    if feedback is not None and not isinstance(feedback, str):
        return response(400, {"message": "Feedback must be a string"})

    now = now_ist()

    # -------- UPDATE ACTIVITY FEEDBACK --------
    for activity in activities_feedback:
        status = str(activity.get("status") or "completed").strip().lower()
        set_fields = {
            "activities.$.status": status,
            "activities.$.feedback": activity.get("feedback"),
            # Carry-forward only applies while an activity is not_completed; a completed
            # activity never carries. The next-session generator reads this flag to
            # decide whether to pull the activity into the following card.
            "activities.$.carryForward": bool(activity.get("carryForward")) if status == "not_completed" else False,
            "updatedAt": now,
            "updatedBy": {"id": user["_id"], "name": user.get("name")},
        }
        if status == "completed":
            set_fields["activities.$.rating"] = activity.get("rating")
        elif "rating" in activity:
            set_fields["activities.$.rating"] = activity.get("rating")

        session_cards.update_one(
            {
                "_id": ObjectId(card_id),
                "activities.activitySequence": activity["activitySequence"]
            },
            {"$set": set_fields}
        )

    # -------- UPDATE OVERALL FEEDBACK --------
    overall_update = {}

    if rating is not None:
        overall_update["rating"] = rating

    if feedback is not None:
        overall_update["feedback"] = feedback

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

    # -------- FETCH UPDATED CARD --------
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

    # -------- COMPLETION CHECK (per-activity, not all-or-nothing) --------
    # A session can finish once every activity has been *addressed* (has a status),
    # regardless of whether it was completed or explicitly marked not_completed.
    # This is the fix for the "missed session block": a coach no longer has to
    # force a rating on an activity the player never did.
    activities = card.get("activities", [])
    unaddressed = [
        a.get("activitySequence") for a in activities
        if not a.get("status")
    ]

    if unaddressed:
        return response(
            400,
            {
                "message": "Mark every activity as completed or not completed before finishing the session.",
                "incompleteActivities": unaddressed
            }
        )

    # A session the coach actually worked through is COMPLETED - even if some
    # activities were marked not_completed. Those become per-activity "home tasks"
    # flagged for the player to finish later (surfaced on the coach dashboard); they
    # do NOT drag the whole session back to a pending/not_completed state.
    home_task_sequences = [
        a.get("activitySequence") for a in activities if a.get("status") == "not_completed"
    ]
    session_status = "completed"

    if card.get("status") not in ("completed", "not_completed"):
        # Credit only points earned from activities actually completed - do NOT touch
        # the card's own `totalPoints` field, which other views (SessionDetail,
        # ViewSessionCard, SessionCardsView) read as "points at stake for this session".
        earned_points = sum(
            (a.get("points") or {}).get("total", 0)
            for a in activities
            if a.get("status") == "completed"
        )
        player_id = card.get("playerId")

        session_cards.update_one(
            {"_id": ObjectId(card_id)},
            {
                "$set": {
                    "status": session_status,
                    "earnedPoints": earned_points,
                    # Home-task markers: the completed card carries the sequences the
                    # player still owes, so the dashboard can flag them cheaply.
                    "hasHomeTask": len(home_task_sequences) > 0,
                    "homeTaskActivities": home_task_sequences,
                    "completedAt": now,
                    "updatedAt": now,
                    "updatedBy": {
                        "id": user["_id"],
                        "name": user.get("name")
                    }
                }
            }
        )

        if player_id and earned_points > 0:
            players.update_one(
                {"_id": ObjectId(player_id)},
                {
                    "$inc": {
                        "TotalPoints": earned_points,
                        "PointBalance": earned_points
                    }
                }
            )

    # -------- RESPONSE --------
    return response(
        200,
        {
            "message": "Session finished successfully.",
            "card_id": card_id,
            "status": session_status,
            "homeTaskActivitySequences": home_task_sequences,
            "updatedAt": now.isoformat()
        }
    )
