import json
import os
from pymongo import MongoClient
from bson import ObjectId

# ------------------ DATABASE CONFIG ------------------
MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "CoachLife"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["Users"]      # Users collection (coaches + others)
players = db["Players"]  # Players collection
session_cards = db["SessionCards"]  # to derive each player's real session-card count

# ------------------ CORS RESPONSE ------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, userToken",
    "Access-Control-Allow-Methods": "OPTIONS, POST"
}

def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str)
    }

# ------------------ TOKEN VALIDATION ------------------
def extract_token(event):
    headers = event.get("headers", {}) or {}
    token = headers.get("userToken") or headers.get("usertoken") or headers.get("UserToken") or headers.get("authorization")
    if token and token.startswith("Bearer "):
        token = token.replace("Bearer ", "").strip()
    return token

def validate_user(event):
    token = extract_token(event)
    if not token:
        return None
    return users.find_one({"userToken": token})

# ------------------ ROLE SCOPE ------------------
def get_role_scope(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return is_super, (user.get("PlayersList") or [])

# ------------------ LAMBDA HANDLER ------------------
def lambda_handler(event, context):

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    # Validate token
    logged_in_user = validate_user(event)
    if not logged_in_user:
        return response(401, {"message": "Unauthorized: valid user token required"})

    try:
        body = json.loads(event.get("body") or "{}")
        coach_id = body.get("coachId")
        if not coach_id:
            return response(400, {"message": "coachId is required"})

        is_super, own_player_ids = get_role_scope(logged_in_user)

        if not is_super:
            # Self-service only: a non-superAdmin caller (coach or scoped admin) can
            # only ever fetch their own roster, regardless of the coachId requested.
            coach_id = str(logged_in_user["_id"])
            player_ids = own_player_ids
        else:
            try:
                coach_obj_id = ObjectId(coach_id)
            except Exception:
                return response(400, {"message": "Invalid coachId format"})

            coach_doc = users.find_one({"_id": coach_obj_id, "role": "coach"})
            if not coach_doc:
                return response(404, {"message": "Coach not found"})

            player_ids = coach_doc.get("PlayersList", [])

        if not player_ids:
            return response(200, {"coachId": coach_id, "players": []})

        # Convert IDs to ObjectId
        object_player_ids = []
        for pid in player_ids:
            try:
                object_player_ids.append(ObjectId(pid))
            except Exception:
                pass  # skip invalid ids

        # Fetch player documents
        player_docs = list(players.find({"_id": {"$in": object_player_ids}}, {"password": 0}))

        # Derive each player's real session-card ids from the SessionCards collection
        # (the player doc's own sessionCardIds field is not kept up to date). This
        # mirrors CL_Get_All_Players so the coach view and admin view agree.
        player_id_strings = [str(p["_id"]) for p in player_docs]
        session_map = {}
        for sc in session_cards.find(
            {"playerId": {"$in": player_id_strings}},
            {"_id": 1, "playerId": 1}
        ):
            session_map.setdefault(sc["playerId"], []).append(str(sc["_id"]))

        for p in player_docs:
            p["sessionCardIds"] = session_map.get(str(p["_id"]), [])

        return response(200, {
            "requestedBy": logged_in_user.get("role", "user"),
            "coachId": coach_id,
            "players": player_docs
        })

    except Exception as e:
        return response(500, {"message": "Failed to fetch players", "error": str(e)})
