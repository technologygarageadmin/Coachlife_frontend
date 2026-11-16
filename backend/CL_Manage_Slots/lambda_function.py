import json
import os
import hmac
import hashlib
import base64
import traceback
from pymongo import MongoClient, UpdateOne
from bson import ObjectId
from datetime import datetime, timezone, timedelta

DB_NAME = os.environ.get('DB_NAME', 'CoachLife')
# Same value as TG_Leads / TG_Leads_Auth. Lets the Technology Garage Leads CRM read
# the available slots with its own login token. Unset = CRM access is off.
CRM_AUTH_SECRET = os.environ.get('AUTH_SECRET')
IST = timezone(timedelta(hours=5, minutes=30))

DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
DEFAULT_BATCH_MINUTES = 60
DEFAULT_MAX_STUDENTS = 5
MAX_STUDENTS_LIMIT = 20
SETTINGS_ID = 'settings'
EDITABLE_TYPES = ['custom', 'window']
PRIORITIES = ['', 'preferred', 'alternative']

_init_error = None
try:
    MONGO_URI = os.environ['MONGO_URI']
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    users = db['Users']
    batches_col = db['Batches']
    players_col = db['Players']
    slots_col = db['Slots']
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
    # REST/proxy v1 puts it on httpMethod; HTTP API (payload v2) puts it under
    # requestContext.http.method.
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


def crm_token_valid(event):
    """True when the request carries a live bearer token signed by the Leads CRM
    login (TG_Leads_Auth). Mirrors TG_Leads.decode_token. Never trusts an unsigned
    token: with no AUTH_SECRET configured the CRM path is simply closed."""
    if not CRM_AUTH_SECRET:
        return False
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    auth = headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return False
    token = auth[7:].strip()
    if "." not in token:
        return False
    payload, sig = token.rsplit(".", 1)
    expected = hmac.new(CRM_AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return False
    try:
        data = json.loads(base64.urlsafe_b64decode(payload + "==="))
        return int(data.get("exp", 0)) > int(datetime.now(timezone.utc).timestamp())
    except Exception:
        return False


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


def to_min(value):
    try:
        h, m = str(value).split(":")[:2]
        h, m = int(h), int(m)
    except Exception:
        return None
    if not (0 <= h <= 24 and 0 <= m < 60):
        return None
    return h * 60 + m


def fmt_min(mins):
    mins = max(0, min(mins, 24 * 60 - 1))
    return f"{mins // 60:02d}:{mins % 60:02d}"


def norm_day(value):
    s = str(value or "").strip()[:3].lower()
    for d in DAYS:
        if d.lower() == s:
            return d
    return None


def get_settings():
    doc = slots_col.find_one({"_id": SETTINGS_ID}) or {}
    return {"maxStudentsPerBatch": int(doc.get("maxStudentsPerBatch", DEFAULT_MAX_STUDENTS))}


def sync_batch_slots():
    """Mirror every scheduled batch into the Slots collection as one doc per
    batch per day. The batch name is deliberately NOT copied - only its time
    window and how many players it holds. Stale docs (batch deleted, emptied,
    or rescheduled) are removed so the collection always matches Batches."""
    now = datetime.now(IST).isoformat()
    ops = []
    live = set()

    for batch in batches_col.find({}, {"days": 1, "startTime": 1, "endTime": 1, "playerIds": 1}):
        player_ids = batch.get("playerIds") or []
        if not player_ids:
            continue
        start = to_min(batch.get("startTime"))
        days = {norm_day(d) for d in (batch.get("days") or [])} - {None}
        if start is None or not days:
            continue
        end = to_min(batch.get("endTime"))
        if end is None or end <= start:
            end = start + DEFAULT_BATCH_MINUTES

        batch_id = str(batch["_id"])
        for day in days:
            live.add((batch_id, day))
            ops.append(UpdateOne(
                {"type": "batch", "batchId": batch_id, "day": day},
                {
                    "$set": {
                        "startTime": fmt_min(start),
                        "endTime": fmt_min(end),
                        "playerCount": len(player_ids),
                        "updatedAt": now,
                    },
                    "$setOnInsert": {"createdAt": now},
                },
                upsert=True,
            ))

    if ops:
        slots_col.bulk_write(ops, ordered=False)

    stale = [
        d["_id"]
        for d in slots_col.find({"type": "batch"}, {"batchId": 1, "day": 1})
        if (d.get("batchId"), d.get("day")) not in live
    ]
    if stale:
        slots_col.delete_many({"_id": {"$in": stale}})


def available_slots(min_length):
    """Times a new student can be offered: every open window minus whatever a
    batch or a blocked slot already occupies. Returns only day / start / end /
    priority - no batch, student or coach information."""
    sync_batch_slots()
    occupied = {d: [] for d in DAYS}
    windows = {d: [] for d in DAYS}
    for doc in slots_col.find({"type": {"$in": ["batch", "custom", "window"]}}):
        day = doc.get("day")
        start, end = to_min(doc.get("startTime")), to_min(doc.get("endTime"))
        if day not in occupied or start is None or end is None or end <= start:
            continue
        if doc.get("type") == "window":
            windows[day].append((start, end, doc.get("priority", "")))
        else:
            occupied[day].append((start, end))

    out = []
    for day in DAYS:
        merged = []
        for start, end in sorted(occupied[day]):
            if merged and start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        pieces = []
        for w_start, w_end, priority in windows[day]:
            cursor = w_start
            for b_start, b_end in merged:
                if b_end <= cursor or b_start >= w_end:
                    continue
                if b_start > cursor:
                    pieces.append((cursor, b_start, priority))
                cursor = max(cursor, b_end)
            if cursor < w_end:
                pieces.append((cursor, w_end, priority))
        for start, end, priority in sorted(pieces):
            if end - start >= min_length:
                out.append({"day": day, "startTime": fmt_min(start), "endTime": fmt_min(end), "priority": priority})
    return {"minLength": min_length, "slots": out}


def parse_min_length(value):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return 60
    return n if 15 <= n <= 240 else 60


def serialize_slot(doc):
    out = {
        "slotId": str(doc["_id"]),
        "type": doc.get("type"),
        "day": doc.get("day"),
        "startTime": doc.get("startTime"),
        "endTime": doc.get("endTime"),
    }
    if doc.get("type") == "batch":
        out["batchId"] = doc.get("batchId")
        out["playerCount"] = doc.get("playerCount", 0)
    elif doc.get("type") == "window":
        out["priority"] = doc.get("priority", "")
    else:
        out["label"] = doc.get("label", "")
    return out


def object_ids(values):
    out = []
    for v in values:
        try:
            out.append(ObjectId(str(v)))
        except Exception:
            pass
    return out


def batch_details(batch_ids, user):
    """Batch name, coaches and player names for the CoachLife schedule page.

    Only ever called for a signed-in CoachLife admin - never for the Leads CRM
    token (that path only gets the name-free `available` view). A scoped admin
    (not superAdmin) only gets names for batches that hold at least one of their
    own assigned players, and only those players' names; every other batch comes
    back anonymous (counts only), same scoping rule as CL_Get_Batches.
    """
    batches = {
        str(b["_id"]): b
        for b in batches_col.find({"_id": {"$in": object_ids(batch_ids)}}, {"batchName": 1, "playerIds": 1, "coachIds": 1})
    }
    all_player_ids = {pid for b in batches.values() for pid in (b.get("playerIds") or [])}
    all_coach_ids = {cid for b in batches.values() for cid in (b.get("coachIds") or [])}
    player_names = {
        str(p["_id"]): p.get("playerName", "")
        for p in players_col.find({"_id": {"$in": object_ids(all_player_ids)}}, {"playerName": 1})
    }
    coach_names = {
        str(c["_id"]): c.get("name", "")
        for c in users.find({"_id": {"$in": object_ids(all_coach_ids)}}, {"name": 1})
    }

    is_super = "superadmin" in user_roles(user)
    scoped = set(user.get("PlayersList") or [])

    details = {}
    for batch_id, b in batches.items():
        player_ids = b.get("playerIds") or []
        if not is_super:
            visible = [pid for pid in player_ids if pid in scoped]
            if not visible:
                details[batch_id] = {"batchName": None, "players": [], "coaches": [], "restricted": True, "playerCount": len(player_ids)}
                continue
            player_ids = visible
        details[batch_id] = {
            "playerCount": len(b.get("playerIds") or []),
            "batchName": b.get("batchName", ""),
            "players": [{"playerId": pid, "playerName": player_names.get(pid, "")} for pid in player_ids],
            "coaches": [coach_names.get(cid, "") for cid in (b.get("coachIds") or []) if coach_names.get(cid)],
            "restricted": False,
        }
    return details


def list_slots(user=None):
    sync_batch_slots()
    docs = list(slots_col.find({"type": {"$in": ["batch", "custom", "window"]}}))
    slots = [serialize_slot(d) for d in docs]
    out = {"settings": get_settings(), "slots": slots}
    if user is not None:
        scheduled = {d.get("batchId") for d in docs if d.get("type") == "batch"}
        # Batches that hold players but have no days / start time yet are not in the calendar, yet people still
        # need to find them (e.g. "which batch is Sana in?"), so they are listed separately for search.
        unscheduled_ids = [
            str(b["_id"])
            for b in batches_col.find({"playerIds": {"$exists": True, "$ne": []}}, {"_id": 1})
            if str(b["_id"]) not in scheduled
        ]
        details = batch_details(scheduled | set(unscheduled_ids), user)
        for slot in slots:
            if slot["type"] == "batch":
                slot.update(details.get(slot.get("batchId"), {"batchName": None, "players": [], "coaches": [], "restricted": True}))
        out["unscheduled"] = [
            {"batchId": bid, **details[bid]} for bid in unscheduled_ids if bid in details and not details[bid].get("restricted")
        ]
        out["hiddenBatches"] = sum(1 for bid, d in details.items() if d.get("restricted"))
    return out


def add_custom_slots(body, user):
    label = str(body.get("label") or "").strip()[:40] or "Slot"
    days = []
    for d in body.get("days") or []:
        nd = norm_day(d)
        if nd and nd not in days:
            days.append(nd)
    if not days:
        return resp(400, {"message": "Pick at least one valid day"})

    start = to_min(body.get("startTime"))
    end = to_min(body.get("endTime"))
    if start is None or end is None:
        return resp(400, {"message": "startTime and endTime must be HH:MM"})
    if end <= start:
        return resp(400, {"message": "endTime must be after startTime"})

    kind = str(body.get("kind") or "block").lower()
    if kind not in ("block", "open"):
        return resp(400, {"message": "kind must be 'block' or 'open'"})
    priority = str(body.get("priority") or "").lower()
    if priority not in PRIORITIES:
        return resp(400, {"message": "priority must be preferred, alternative or empty"})

    now = datetime.now(IST).isoformat()
    docs = []
    for day in days:
        doc = {
            "type": "window" if kind == "open" else "custom",
            "day": day,
            "startTime": fmt_min(start),
            "endTime": fmt_min(end),
            "createdBy": user["_id"],
            "createdAt": now,
        }
        if kind == "open":
            doc["priority"] = priority
        else:
            doc["label"] = label
        docs.append(doc)
    result = slots_col.insert_many(docs)
    for doc, oid in zip(docs, result.inserted_ids):
        doc["_id"] = oid
    return resp(201, {"message": "Slot added", "slots": [serialize_slot(d) for d in docs]})


def update_custom_slot(body):
    try:
        oid = ObjectId(str(body.get("slotId") or "").strip())
    except Exception:
        return resp(400, {"message": "Valid slotId is required"})

    doc = slots_col.find_one({"_id": oid})
    if not doc:
        return resp(404, {"message": "Slot not found"})
    if doc.get("type") not in EDITABLE_TYPES:
        return resp(403, {"message": "Batch slots come from the batch schedule and cannot be edited here"})

    day = norm_day(body.get("day"))
    if not day:
        return resp(400, {"message": "A valid day is required"})
    start = to_min(body.get("startTime"))
    end = to_min(body.get("endTime"))
    if start is None or end is None:
        return resp(400, {"message": "startTime and endTime must be HH:MM"})
    if end <= start:
        return resp(400, {"message": "endTime must be after startTime"})
    changes = {
        "day": day,
        "startTime": fmt_min(start),
        "endTime": fmt_min(end),
        "updatedAt": datetime.now(IST).isoformat(),
    }
    if doc.get("type") == "window":
        priority = str(body.get("priority") or "").lower()
        if priority not in PRIORITIES:
            return resp(400, {"message": "priority must be preferred, alternative or empty"})
        changes["priority"] = priority
    else:
        changes["label"] = str(body.get("label") or "").strip()[:40] or "Slot"

    slots_col.update_one({"_id": oid}, {"$set": changes})
    return resp(200, {"message": "Slot updated", "slot": serialize_slot(slots_col.find_one({"_id": oid}))})


def delete_custom_slot(body):
    try:
        oid = ObjectId(str(body.get("slotId") or "").strip())
    except Exception:
        return resp(400, {"message": "Valid slotId is required"})

    doc = slots_col.find_one({"_id": oid})
    if not doc:
        return resp(404, {"message": "Slot not found"})
    if doc.get("type") not in EDITABLE_TYPES:
        return resp(403, {"message": "Batch slots come from the batch schedule and cannot be removed here"})

    slots_col.delete_one({"_id": oid})
    return resp(200, {"message": "Slot removed", "slotId": str(oid)})


def update_settings(body):
    try:
        value = int(body.get("maxStudentsPerBatch"))
    except (TypeError, ValueError):
        return resp(400, {"message": "maxStudentsPerBatch must be a whole number"})
    if not 1 <= value <= MAX_STUDENTS_LIMIT:
        return resp(400, {"message": f"maxStudentsPerBatch must be between 1 and {MAX_STUDENTS_LIMIT}"})

    slots_col.update_one(
        {"_id": SETTINGS_ID},
        {"$set": {"maxStudentsPerBatch": value, "updatedAt": datetime.now(IST).isoformat()}},
        upsert=True,
    )
    return resp(200, {"message": "Settings saved", "settings": {"maxStudentsPerBatch": value}})


def lambda_handler(event, context):
    method = get_method(event)
    if method == "OPTIONS":
        return resp(200, {"message": "CORS OK"})

    if _init_error:
        return resp(500, {"message": "Lambda init failed", "error": _init_error})

    params = event.get("queryStringParameters") or {}
    user = validate_user(event)
    crm_ok = False if user else crm_token_valid(event)
    if not user and not crm_ok:
        return resp(401, {"message": "Unauthorized or token missing"})

    try:
        body = {}
        if method != "GET":
            try:
                body = parse_body(event)
            except Exception:
                return resp(400, {"message": "Invalid JSON body"})

        wants_available = (method == "GET" and params.get("view") == "available") or body.get("action") == "available"
        if wants_available:
            return resp(200, available_slots(parse_min_length(params.get("minLength") or body.get("minLength"))))

        # Everything below is CoachLife-admin only. A CRM token reads availability and nothing else.
        if crm_ok:
            return resp(403, {"message": "This login can only read available slots"})
        roles = user_roles(user)
        if "admin" not in roles and "superadmin" not in roles:
            return resp(403, {"message": "Only admins can manage slots"})

        if method == "GET":
            return resp(200, list_slots(user))

        action = body.get("action")
        if action == "list":
            return resp(200, list_slots(user))
        if action == "add":
            return add_custom_slots(body, user)
        if action == "update":
            return update_custom_slot(body)
        if action == "delete":
            return delete_custom_slot(body)
        if action == "settings":
            return update_settings(body)
        return resp(400, {"message": "action must be one of: list, add, update, delete, settings, available"})
    except Exception as e:
        return resp(500, {"message": "Internal server error", "error": str(e), "trace": traceback.format_exc()})
