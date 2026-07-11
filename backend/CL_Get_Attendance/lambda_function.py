import json
import os
import traceback
from pymongo import MongoClient, DESCENDING
from datetime import datetime, timezone, timedelta

DB_NAME = os.environ.get('DB_NAME', 'CoachLife')
IST = timezone(timedelta(hours=5, minutes=30))

_init_error = None
try:
    MONGO_URI = os.environ['MONGO_URI']
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    users = db['Users']
    attendance_col = db['Attendance']
except KeyError:
    _init_error = "MONGO_URI environment variable is not set"
except Exception as e:
    _init_error = f"DB init failed: {str(e)}"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}


def resp(code, body):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps(body, default=str)}


def parse_body(event):
    raw = event.get('body')
    if raw is None or raw == '':
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    return {}


def marked_date_str(marked_at):
    if not marked_at:
        return ''
    value = str(marked_at)
    if 'T' in value:
        return value.split('T')[0]
    return value.split(' ')[0]


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


def get_role_scope(user):
    roles = user.get("role") or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [r.lower() for r in roles]
    is_super = "superadmin" in roles
    return is_super, (user.get("PlayersList") or [])


def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return resp(200, {"message": "CORS OK"})

    if _init_error:
        return resp(500, {"message": "Lambda init failed", "error": _init_error})

    user = validate_user(event)
    if not user:
        return resp(401, {"message": "Unauthorized or token missing"})

    try:
        body = parse_body(event)
    except Exception:
        return resp(400, {"message": "Invalid JSON body"})

    query = {}
    if body.get("batchId"):
        query["batchId"] = body["batchId"]
    if body.get("sessionDate"):
        query["sessionDate"] = body["sessionDate"]
    if body.get("playerId"):
        query["playerId"] = body["playerId"]
    if body.get("attendanceStatus") is not None:
        query["attendanceStatus"] = body["attendanceStatus"]

    is_super, player_ids = get_role_scope(user)
    if not is_super:
        if query.get("playerId"):
            if query["playerId"] not in player_ids:
                query["playerId"] = "__NO_MATCH__"
        else:
            query["playerId"] = {"$in": player_ids}

    try:
        records = list(attendance_col.find(query).sort([("sessionDate", DESCENDING), ("markedAt", DESCENDING)]))
        result = [
            {
                "attendanceId": str(r["_id"]),
                "playerId": r.get("playerId", ""),
                "playerName": r.get("playerName", ""),
                "batchId": r.get("batchId", ""),
                "batchName": r.get("batchName", ""),
                "sessionNumber": r.get("sessionNumber"),
                "sessionDate": r.get("sessionDate") or marked_date_str(r.get("markedAt")),
                "attendanceStatus": r.get("attendanceStatus", ""),
                "notes": r.get("notes", ""),
                "source": r.get("source", "manual"),
                "markedAt": r.get("markedAt").isoformat() if isinstance(r.get("markedAt"), datetime) else r.get("markedAt", ""),
                "markedBy": r.get("markedBy", {}),
            }
            for r in records
        ]
        return resp(200, {"records": result})
    except Exception as e:
        return resp(500, {"message": "Internal server error", "error": str(e), "trace": traceback.format_exc()})
