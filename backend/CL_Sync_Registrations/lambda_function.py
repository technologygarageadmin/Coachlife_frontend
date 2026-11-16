import json
import os
import re
import traceback
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta

DB_NAME = os.environ.get('DB_NAME', 'CoachLife')
# Technology Garage registrations. Read-only: this Lambda only ever calls find() on them.
TG_DB_NAME = os.environ.get('TG_DB_NAME', 'Online_Session')
TG_COLLECTION = os.environ.get('TG_COLLECTION', 'Registration')
# Optional separate connection string if Technology Garage lives on another cluster.
TG_MONGO_URI = os.environ.get('TG_MONGO_URI')
IST = timezone(timedelta(hours=5, minutes=30))

STATUSES = ['new', 'placed', 'dismissed']

# Optional registration fields that map straight onto a CoachLife player. Copied only
# when the registration has them (keys differ in case between forms, so match loosely).
OPTIONAL_FIELDS = {
    "fatherName": ["fatherName", "father_name", "fathername"],
    "motherName": ["motherName", "mother_name", "mothername"],
    "dateOfBirth": ["dateOfBirth", "dob", "date_of_birth"],
    "address": ["address"],
    "alternativeNumber": ["alternativeNumber", "alternate_number", "altPhone", "alternativePhone"],
    "LearningPathway": ["LearningPathway", "learningPathway", "learning_pathway", "pathway"],
}

_init_error = None
try:
    MONGO_URI = os.environ['MONGO_URI']
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    users = db['Users']
    players_col = db['Players']
    new_col = db['NewPlayers']
    tg_client = MongoClient(TG_MONGO_URI, serverSelectionTimeoutMS=5000) if TG_MONGO_URI else client
    registrations = tg_client[TG_DB_NAME][TG_COLLECTION]
except KeyError:
    _init_error = "MONGO_URI environment variable is not set"
except Exception as e:
    _init_error = f"DB init failed: {str(e)}"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}


def resp(code, body):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps(body, default=str)}


def get_method(event):
    return (
        event.get("httpMethod")
        or (event.get("requestContext", {}) or {}).get("http", {}).get("method")
    )


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


def user_roles(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    return [str(r).lower() for r in roles]


def parse_body(event):
    raw = event.get("body")
    if raw is None or raw == "":
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    return {}


def now_iso():
    return datetime.now(IST).isoformat()


def phone_key(value):
    """Last 10 digits, so '+91 98765 43210' and '9876543210' match."""
    digits = re.sub(r"\D", "", str(value or ""))
    return digits[-10:] if len(digits) >= 7 else ""


def name_key(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def is_paid(reg):
    """Paid = Technology Garage marked the registration 'success'. TG only keeps a
    registration once it exists, and deletes failed attempts, so 'success' is the
    paid signal (set by TG_Verify / TG_Webhook)."""
    return str(reg.get("status") or "").lower() == "success"


def build_player_index():
    index = {}
    for p in players_col.find({}, {"playerName": 1, "phone": 1, "alternativeNumber": 1}):
        for field in ("phone", "alternativeNumber"):
            key = phone_key(p.get(field))
            if key:
                index.setdefault(key, []).append({"playerId": str(p["_id"]), "playerName": p.get("playerName", "")})
    return index


def find_duplicate(reg, player_index, imported_by_phone):
    """Soft flag, never a block: the coach decides. Checks existing CoachLife
    players first, then earlier imported registrations (e.g. a second course)."""
    key = phone_key(reg.get("phone"))
    if not key:
        return None
    nkey = name_key(reg.get("name"))
    for p in player_index.get(key, []):
        if name_key(p["playerName"]) == nkey:
            return {"type": "player", "playerId": p["playerId"], "playerName": p["playerName"], "reason": "Same name and phone as an existing player"}
    for earlier in imported_by_phone.get(key, []):
        if earlier["registrationId"] != str(reg["_id"]) and name_key(earlier.get("name")) == nkey:
            return {"type": "registration", "registrationId": earlier["registrationId"], "reason": "Same name and phone as an earlier registration"}
    matches = player_index.get(key, [])
    if matches:
        return {"type": "player", "playerId": matches[0]["playerId"], "playerName": matches[0]["playerName"], "reason": "Same phone as an existing player (sibling?)"}
    return None


def pick_optional(reg):
    lowered = {str(k).lower(): v for k, v in reg.items()}
    out = {}
    for target, names in OPTIONAL_FIELDS.items():
        for name in names:
            value = lowered.get(name.lower())
            if value not in (None, ""):
                out[target] = str(value).strip()
                break
    return out


def descriptive_fields(reg):
    """Everything about the person that can change or be filled in later. Excludes
    payment data on purpose - payment ids never leave Technology Garage."""
    fields = {
        "name": str(reg.get("name") or "").strip(),
        "parentName": str(reg.get("parentName") or "").strip(),
        "phone": str(reg.get("phone") or "").strip(),
        "age": reg.get("age"),
        "isAdult": bool(reg.get("isAdult")),
        "course": str(reg.get("course") or "").strip().lower(),
        "paymentMode": reg.get("paymentMode"),
        "tgCreatedAt": reg.get("createdAt"),
    }
    fields.update(pick_optional(reg))
    return fields


def sync_registrations():
    """Pull every paid Technology Garage registration into CoachLife.NewPlayers,
    exactly once per registration. Idempotent: running it again imports nothing new."""
    player_index = build_player_index()
    imported_by_phone = {}
    for doc in new_col.find({}, {"registrationId": 1, "name": 1, "phone": 1}):
        key = phone_key(doc.get("phone"))
        if key:
            imported_by_phone.setdefault(key, []).append(doc)

    seen = imported = skipped_unpaid = already = 0
    for reg in registrations.find({}):
        seen += 1
        if not is_paid(reg):
            skipped_unpaid += 1
            continue
        reg_id = str(reg["_id"])
        existing = new_col.find_one({"registrationId": reg_id}, {"_id": 1, "status": 1})
        if existing:
            already += 1
            if existing.get("status") == "new":
                new_col.update_one({"_id": existing["_id"], "status": "new"}, {"$set": descriptive_fields(reg)})
            continue
        dup = find_duplicate(reg, player_index, imported_by_phone)
        doc = {
            "registrationId": reg_id,
            **descriptive_fields(reg),
            "status": "new",
            "possibleDuplicate": dup,
            "importedAt": now_iso(),
        }
        result = new_col.update_one({"registrationId": reg_id}, {"$setOnInsert": doc}, upsert=True)
        if result.upserted_id is not None:
            imported += 1
            key = phone_key(doc["phone"])
            if key:
                imported_by_phone.setdefault(key, []).append(doc)
        else:
            already += 1
    return {"seen": seen, "imported": imported, "alreadyImported": already, "skippedNotPaid": skipped_unpaid}


def title(value):
    return " ".join(w.capitalize() for w in str(value or "").split())


def serialize(doc):
    return {
        "newPlayerId": str(doc["_id"]),
        "registrationId": doc.get("registrationId"),
        "name": title(doc.get("name")),
        "parentName": title(doc.get("parentName")),
        "phone": doc.get("phone"),
        "age": doc.get("age"),
        "isAdult": doc.get("isAdult", False),
        "course": doc.get("course"),
        "paymentMode": doc.get("paymentMode"),
        "paidAt": doc.get("tgCreatedAt"),
        **{k: doc.get(k) for k in OPTIONAL_FIELDS if doc.get(k)},
        "importedAt": doc.get("importedAt"),
        "status": doc.get("status", "new"),
        "possibleDuplicate": doc.get("possibleDuplicate"),
    }


def list_new_players(status):
    query = {} if status == "all" else {"status": status}
    docs = sorted(new_col.find(query), key=lambda d: str(d.get("importedAt") or ""), reverse=True)
    counts = {s: new_col.count_documents({"status": s}) for s in STATUSES}
    return {"players": [serialize(d) for d in docs], "counts": counts}


def set_status(body, user):
    try:
        oid = ObjectId(str(body.get("newPlayerId") or "").strip())
    except Exception:
        return resp(400, {"message": "Valid newPlayerId is required"})
    target = str(body.get("status") or "").lower()
    if target not in ("dismissed", "new"):
        return resp(400, {"message": "status must be 'dismissed' or 'new'"})
    doc = new_col.find_one({"_id": oid})
    if not doc:
        return resp(404, {"message": "Player not found"})
    if doc.get("status") == "placed":
        return resp(409, {"message": "This player is already placed in a batch"})
    new_col.update_one({"_id": oid}, {"$set": {"status": target, "updatedAt": now_iso(), "updatedBy": user["_id"]}})
    return resp(200, {"message": "Updated", "newPlayerId": str(oid), "status": target})


def mark_placed(body, user):
    """The coach/admin added this registration as a CoachLife player. Takes it off
    the New list for good (sync never re-imports it) and remembers which player."""
    try:
        oid = ObjectId(str(body.get("newPlayerId") or "").strip())
    except Exception:
        return resp(400, {"message": "Valid newPlayerId is required"})
    doc = new_col.find_one({"_id": oid})
    if not doc:
        return resp(404, {"message": "Player not found"})
    changes = {"status": "placed", "placedAt": now_iso(), "placedBy": user["_id"]}
    player_id = str(body.get("playerId") or "").strip()
    if player_id:
        changes["placedPlayerId"] = player_id
    new_col.update_one({"_id": oid}, {"$set": changes})
    return resp(200, {"message": "Marked as added", "newPlayerId": str(oid), "status": "placed"})


def lambda_handler(event, context):
    method = get_method(event)
    if method == "OPTIONS":
        return resp(200, {"message": "CORS OK"})

    if _init_error:
        return resp(500, {"message": "Lambda init failed", "error": _init_error})

    user = validate_user(event)
    if not user:
        return resp(401, {"message": "Unauthorized or token missing"})
    roles = user_roles(user)
    if not ({"admin", "superadmin", "coach"} & set(roles)):
        return resp(403, {"message": "Only admins and coaches can see new players"})

    try:
        params = event.get("queryStringParameters") or {}
        if method == "GET":
            status = (params.get("status") or "new").lower()
            if status not in STATUSES + ["all"]:
                return resp(400, {"message": "status must be new, placed, dismissed or all"})
            return resp(200, list_new_players(status))

        try:
            body = parse_body(event)
        except Exception:
            return resp(400, {"message": "Invalid JSON body"})

        action = body.get("action")
        if action == "sync":
            summary = sync_registrations()
            return resp(200, {"message": "Sync complete", **summary, **list_new_players("new")})
        if action == "list":
            status = str(body.get("status") or "new").lower()
            if status not in STATUSES + ["all"]:
                return resp(400, {"message": "status must be new, placed, dismissed or all"})
            return resp(200, list_new_players(status))
        if action == "setStatus":
            return set_status(body, user)
        if action == "markPlaced":
            return mark_placed(body, user)
        return resp(400, {"message": "action must be one of: sync, list, setStatus, markPlaced"})
    except Exception as e:
        return resp(500, {"message": "Internal server error", "error": str(e), "trace": traceback.format_exc()})
