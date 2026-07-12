import os
import json
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from concurrent.futures import ThreadPoolExecutor, as_completed

IST = timezone(timedelta(hours=5, minutes=30))

def today_ist_str():
    return datetime.now(IST).strftime('%Y-%m-%d')

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
# CARRY-FORWARD
# =====================================================

def claim_carry_forward_activity(player_id, learning_pathway, next_session):
    """Find ONE activity the coach flagged to carry forward (not_completed +
    carryForward, not yet carried), claim it by stamping the old card so it can't be
    picked again, and return a clean copy to inject into the new card. Oldest session
    (then lowest sequence) wins. Returns the injectable activity dict, or None."""
    cursor = session_cards_col.find(
        {"playerId": player_id, "LearningPathway": learning_pathway},
        sort=[("session", 1)],
    )
    for card in cursor:
        for act in sorted(card.get("activities", []), key=lambda a: a.get("activitySequence") or 0):
            if (str(act.get("status", "")).lower() == "not_completed"
                    and act.get("carryForward") is True
                    and not act.get("carriedForwardToSession")):
                # Claim it on the old card - keeps its not_completed history but marks
                # it as moved, so it drops off the dashboard's actionable home tasks and
                # can't be carried twice.
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

# =====================================================
# MAIN LOGIC
# =====================================================

def generate_session_card(player_id: str, learning_pathway_override: str = None,
                           batch_group_id: str = None, session_date_override: str = None) -> dict:

    try:
        player_object_id = ObjectId(player_id)
    except (InvalidId, TypeError):
        return {"message": "Invalid playerId format"}

    player = player_col.find_one({"_id": player_object_id})
    if not player:
        return {"message": "Player not found"}

    # A batch (or an explicit caller) can specify which pathway to generate for,
    # instead of always trusting the player's single profile field. This is what
    # lets an individual card generated "from a batch" inherit the batch's curriculum.
    learning_pathway = learning_pathway_override or player.get("LearningPathway")

    if not learning_pathway:
        return {"message": "LearningPathway missing"}

    # Last session
    last_session = session_cards_col.find_one(
        {"playerId": player_id, "LearningPathway": learning_pathway},
        sort=[("session", -1)]
    )

    if last_session:
        status = last_session.get("status")

        if status not in ["upcoming", "in_progress", "in progress", "completed",
                           "not_completed", "absent", "excused", "pending", "empty"]:
            return {"message": f"Invalid session status: {status}"}

        # "empty" is a soft-deleted slot kept only to hold its session number in
        # the sequence. It's not a real card, so it neither blocks nor gets
        # auto-closed - generation just appends the next session after it.

        if status in ["upcoming", "in_progress", "in progress"]:
            # Left hanging - the coach never submitted it. Rather than blocking this
            # player (and stalling a whole batch-generate run on one stuck card),
            # auto-close it as "pending" - the same recoverable-miss status already
            # used for absent/excused - and continue generating the next session.
            session_cards_col.update_one(
                {"_id": last_session["_id"]},
                {"$set": {
                    "status": "pending",
                    "autoClosedReason": f"Left {status} - auto-closed on next generation",
                }}
            )
            last_session["status"] = "pending"
            status = "pending"

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
            "feedback": None,
            "status": None,
        }

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_activity, act) for act in pathway.get("activities", [])]

        for future in as_completed(futures):
            activity = future.result()
            enriched_activities.append(activity)

            if activity.get("points") and isinstance(activity["points"], dict):
                total_points += activity["points"].get("total", 0)

    enriched_activities.sort(key=lambda a: a.get("activitySequence") or 0)

    # A session's own activities are kept WHOLE and SEPARATE - a Pending session stays
    # its own session in the Pending Queue. The ONE exception is an activity the coach
    # explicitly flagged "carry forward": we pull a single such activity into this new
    # card (oldest first) and prepend it, so the player picks up exactly where they owe.
    all_activities = enriched_activities
    carried = claim_carry_forward_activity(player_id, learning_pathway, next_session)
    if carried:
        all_activities = [carried] + all_activities
        if isinstance(carried.get("points"), dict):
            total_points += carried["points"].get("total", 0)

    for idx, act in enumerate(all_activities, start=1):
        act["activitySequence"] = idx

    card_doc = {
        "playerId": player_id,
        "LearningPathway": learning_pathway,
        "session": next_session,
        "sessionDate": session_date_override or today_ist_str(),
        "Topic": pathway.get("Topic"),
        "SessionType": pathway.get("SessionType"),
        "typeOfSessioncard": "default",
        "Objective": pathway.get("Objective"),
        "activities": all_activities,
        "totalPoints": total_points,
        "sessionTakeaways": pathway.get("sessionTakeaways", []),
        "status": "upcoming",
        "rating": None,
        "feedback": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdByCoach": player.get("primaryCoach"),
    }
    if batch_group_id:
        card_doc["batchGroupId"] = batch_group_id

    insert_result = session_cards_col.insert_one(card_doc)

    # Keep the player's sessionCardIds in sync (source of truth read by the batch /
    # session-card views). $addToSet is idempotent, so re-generation never duplicates.
    player_col.update_one(
        {"_id": player_object_id},
        {"$addToSet": {"sessionCardIds": str(insert_result.inserted_id)}},
    )

    return {
        "message": "Session created",
        "session": next_session,
        "sessionDate": card_doc["sessionDate"],
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

        learning_pathway_override = body.get("LearningPathway") if body else None
        batch_group_id = body.get("batchGroupId") if body else None
        session_date_override = body.get("sessionDate") if body else None

        result = generate_session_card(player_id, learning_pathway_override, batch_group_id, session_date_override)

        # Map logical outcomes to real HTTP codes so the client can tell a genuine
        # "card created" from a no-op ("previous session still in progress", etc.)
        message = result.get("message", "")
        if message == "Session created":
            status_code = 200
        elif message in ("Player not found", "No pathway found"):
            status_code = 404
        elif "still" in message or message == "Session already exists":
            status_code = 409
        else:
            status_code = 400

        return {
            "statusCode": status_code,
            "headers": cors_headers(),
            "body": json.dumps(result)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)})
        }