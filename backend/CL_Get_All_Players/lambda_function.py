import json
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime
from bson import ObjectId

# ------------------ CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = os.environ.get("DB_NAME", "CoachLife")

if not MONGO_URI:
    raise Exception("MONGO_URI not set")

# ------------------ DB CONNECTION ------------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]
players = db["Players"]
session_cards = db["SessionCards"]

# ------------------ CORS ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
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

# ------------------ ROLE SCOPE ------------------
def get_role_scope(user):
    """Any non-superAdmin caller (admin or coach) is restricted to their own
    PlayersList by default - this endpoint backs Players/Session Card/Batches
    management views, which must only show a coach their own roster. The
    Leaderboard is the one legitimate exception (it needs the org-wide ranking,
    not just "my players") and opts out explicitly via the `leaderboard` flag
    (see lambda_handler)."""
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return (not is_super), (user.get("PlayersList") or [])

# ------------------ SERIALIZER ------------------
def serialize_player(doc, session_map):
    player = {}

    player_id = str(doc["_id"])
    player["id"] = player_id

    for k, v in doc.items():
        if k == "_id":
            continue
        if isinstance(v, datetime):
            player[k] = v.isoformat()
        else:
            player[k] = v

    # ✅ CORRECT SESSION CARD MAPPING
    player["sessionCardIds"] = session_map.get(player_id, [])

    return player

# ------------------ GET PLAYERS ------------------
def lambda_handler(event, context):

    # -------- CORS --------
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

    query = {}

    # -------- FILTERS --------
    if body.get("search"):
        query["playerName"] = {"$regex": body["search"], "$options": "i"}

    if body.get("LearningPathway"):
        query["LearningPathway"] = body["LearningPathway"]

    if body.get("status"):
        query["status"] = body["status"]

    # -------- LEADERBOARD OPT-OUT --------
    # The Leaderboard needs every player ranked org-wide, not just "my players" -
    # it sends ?leaderboard=true to explicitly bypass the scoping below.
    qs = event.get("queryStringParameters") or {}
    is_leaderboard = str(qs.get("leaderboard") or body.get("leaderboard") or "").lower() in ("1", "true", "yes")

    # -------- ROLE SCOPE --------
    should_scope, player_ids = get_role_scope(user)
    if should_scope and not is_leaderboard:
        scoped_oids = []
        for pid in player_ids:
            try:
                scoped_oids.append(ObjectId(pid))
            except Exception:
                continue
        query["_id"] = {"$in": scoped_oids}

    # -------- SORT --------
    sort_by = body.get("sortBy", "createdAt")
    order = DESCENDING if body.get("order", "desc") == "desc" else ASCENDING

    # -------- FETCH PLAYERS --------
    players_cursor = list(players.find(query).sort(sort_by, order))

    # -------- BUILD PLAYER ID STRING LIST --------
    player_id_strings = [str(p["_id"]) for p in players_cursor]

    # -------- FETCH SESSION CARDS (STRING MATCH) --------
    session_map = {}
    for sc in session_cards.find(
        {"playerId": {"$in": player_id_strings}},
        {"_id": 1, "playerId": 1}
    ):
        pid = sc["playerId"]  # already string
        session_map.setdefault(pid, []).append(str(sc["_id"]))

    # -------- BUILD RESPONSE --------
    players_list = []
    for p in players_cursor:
        players_list.append(serialize_player(p, session_map))

    return response(
        200,
        {
            "count": len(players_list),
            "players": players_list
        }
    )
