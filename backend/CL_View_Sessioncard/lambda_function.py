import json
import os
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from datetime import datetime

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

USER_COLLECTION = "Users"                 # ✅ Only Users
SESSION_CARD_COLLECTION = "SessionCards"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db[USER_COLLECTION]               # ✅ No Coaches
session_cards = db[SESSION_CARD_COLLECTION]

# ------------------ RESPONSE ------------------
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, userToken, Authorization",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION (USERS) ------------------
def validate_user(event):
    headers = event.get("headers", {}) or {}

    # direct header token
    user_token = (
        headers.get("userToken")
        or headers.get("usertoken")
        or headers.get("user-token")
    )

    # Bearer fallback
    if not user_token:
        auth = headers.get("Authorization") or headers.get("authorization")
        if auth and auth.startswith("Bearer "):
            user_token = auth.replace("Bearer ", "").strip()

    if not user_token:
        return None, "TOKEN_MISSING"

    # ✅ validate token inside Users collection
    user = users.find_one({"userToken": user_token}, {"password": 0})

    if user:
        user["_id"] = str(user["_id"])
        return user, None

    return None, "INVALID_TOKEN"

# ------------------ ROLE SCOPE ------------------
def get_role_scope(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return is_super, (user.get("PlayersList") or [])

# ------------------ SAFE DATETIME HANDLER ------------------
def safe_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str):
        return value
    return None

# ------------------ CARD FORMATTER ------------------
def format_card(card):
    card = dict(card)
    card["_id"] = str(card["_id"])
    for field in ["createdAt", "updatedAt", "completedAt"]:
        if field in card:
            card[field] = safe_datetime(card[field])
    return card

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    # ---- CORS PREFLIGHT ----
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, {"message": "CORS OK"})

    # ---- VALIDATE USER TOKEN (from Users) ----
    user, error = validate_user(event)

    if error:
        return cors_response(401, {
            "message": "Unauthorized",
            "reason": error
        })

    try:
        body = json.loads(event.get("body", "{}"))

        session_card_id = body.get("sessionCardId")
        player_id = body.get("playerId")
        bulk_player_ids = body.get("playerIds")
        bulk_card_ids = body.get("sessionCardIds")
        want_full = bool(body.get("full"))

        # ---- BULK MODE A: full card docs for many known card ids in ONE query ----
        # Used by the "By Batch" full-history view, which used to fetch every
        # player's every card one request at a time (an N*M fan-out).
        if isinstance(bulk_card_ids, list) and bulk_card_ids:
            is_super, own_player_ids = get_role_scope(user)
            own_set = set(own_player_ids)

            requested_ids = [str(cid) for cid in bulk_card_ids][:300]  # sane upper bound per call
            oid_by_str = {}
            for cid in requested_ids:
                try:
                    oid_by_str[cid] = ObjectId(cid)
                except Exception:
                    continue

            cards_map = {cid: None for cid in requested_ids}
            if oid_by_str:
                for doc in session_cards.find({"_id": {"$in": list(oid_by_str.values())}}):
                    if not is_super and doc.get("playerId") not in own_set:
                        continue
                    cards_map[str(doc["_id"])] = format_card(doc)

            return cors_response(200, {
                "message": "Session cards fetched successfully",
                "cards": cards_map,
            })

        # ---- BULK MODE B: latest card for many players in ONE query ----
        # Used by list/batch views that used to fire one request per player -
        # a single aggregation replaces that N+1 pattern. Pass `full: true` to
        # get the complete card doc instead of just the summary fields.
        if isinstance(bulk_player_ids, list) and bulk_player_ids:
            is_super, own_player_ids = get_role_scope(user)
            requested = [str(p) for p in bulk_player_ids][:200]  # sane upper bound per call

            if is_super:
                allowed = requested
            else:
                own_set = set(own_player_ids)
                allowed = [p for p in requested if p in own_set]

            cards_map = {pid: None for pid in requested}
            if allowed:
                pipeline = [
                    {"$match": {"playerId": {"$in": allowed}}},
                    {"$sort": {"createdAt": DESCENDING}},
                    {"$group": {"_id": "$playerId", "doc": {"$first": "$$ROOT"}}},
                ]
                for row in session_cards.aggregate(pipeline):
                    doc = row["doc"]
                    if want_full:
                        cards_map[row["_id"]] = format_card(doc)
                    else:
                        cards_map[row["_id"]] = {
                            "session": doc.get("session"),
                            "sessionDate": doc.get("sessionDate"),
                            "status": doc.get("status") or "",
                            "cardId": str(doc["_id"]) if doc.get("_id") else None,
                        }

            return cors_response(200, {
                "message": "Session cards fetched successfully",
                "cards": cards_map,
            })

        if not session_card_id and not player_id:
            return cors_response(400, {
                "message": "sessionCardId or playerId is required"
            })

        is_super, player_ids = get_role_scope(user)
        if not is_super and player_id and player_id not in player_ids:
            return cors_response(403, {"message": "Forbidden: player is not in your assigned list"})

        if session_card_id:
            # Direct fetch by id - used when the caller already knows which card
            # (e.g. the last id in a player's sessionCardIds array) rather than
            # always wanting "whatever is latest".
            try:
                card = session_cards.find_one({"_id": ObjectId(session_card_id)})
            except Exception:
                return cors_response(400, {"message": "Invalid sessionCardId format"})

            if not card:
                return cors_response(404, {
                    "message": "Session card not found for this sessionCardId"
                })

            if not is_super and card.get("playerId") not in player_ids:
                return cors_response(403, {"message": "Forbidden: player is not in your assigned list"})
        else:
            # ---- FETCH LATEST SESSION CARD FOR PLAYER ----
            card = session_cards.find_one(
                {"playerId": player_id},
                sort=[("createdAt", DESCENDING)]
            )

            if not card:
                return cors_response(404, {
                    "message": "No session card found for this player"
                })

        return cors_response(200, {
            "message": "Session card fetched successfully",
            "accessedBy": "USER",               # 👈 not coach now
            "sessionCard": format_card(card)
        })

    except Exception as e:
        return cors_response(500, {
            "message": "Failed to fetch session card",
            "error": str(e)
        })
