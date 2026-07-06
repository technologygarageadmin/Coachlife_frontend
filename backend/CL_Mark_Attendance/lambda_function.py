import json
import os
import traceback
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta

DB_NAME = os.environ.get('DB_NAME', 'CoachLife')
IST = timezone(timedelta(hours=5, minutes=30))
VALID_STATUSES = {'Present', 'Absent', 'Late', 'Excused', ''}

_init_error = None
try:
    MONGO_URI = os.environ['MONGO_URI']
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    users = db['Users']
    attendance_col = db['Attendance']
    batches_col = db['Batches']
    players_col = db['Players']
    session_cards_col = db['SessionCards']
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


def now_ist():
    return datetime.now(IST)


def today_ist_str():
    return now_ist().strftime('%Y-%m-%d')


def parse_body(event):
    raw = event.get('body')
    if raw is None or raw == '':
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    return {}


def normalize_session_number(value):
    if value is None or value == '':
        return None
    try:
        num = int(value)
    except Exception:
        return None
    return num if num > 0 else None


def normalize_status(value, allow_empty=False):
    status = '' if value is None else str(value).strip()
    if status == '' and allow_empty:
        return ''
    if status not in VALID_STATUSES:
        return None
    if status == '' and not allow_empty:
        return None
    return status


def unique_strings(values):
    out = []
    seen = set()
    for value in values or []:
        item = str(value).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def resolve_bulk_targets(body):
    direct_player_ids = unique_strings(body.get('playerIds'))
    if direct_player_ids:
        return {
            'playerIds': direct_player_ids,
            'batchName': str(body.get('batchName') or ''),
            'statusCode': 200,
            'error': None,
        }

    batch_id = str(body.get('batchId') or '').strip()
    if not batch_id:
        return {
            'statusCode': 400,
            'error': 'batchId is required for bulk mark when playerIds is not provided'
        }

    try:
        batch = batches_col.find_one({'_id': ObjectId(batch_id)})
    except Exception:
        return {
            'statusCode': 400,
            'error': 'Invalid batchId. Send a real batchId or include playerIds for virtual batches'
        }

    if not batch:
        return {'statusCode': 404, 'error': 'Batch not found'}

    return {
        'playerIds': unique_strings(batch.get('playerIds', [])),
        'batchName': batch.get('batchName', ''),
        'statusCode': 200,
        'error': None,
    }


def fetch_player_names(player_ids, body):
    name_map = {}

    object_ids = []
    for pid in player_ids:
        try:
            object_ids.append(ObjectId(pid))
        except Exception:
            continue

    if object_ids:
        players = list(players_col.find({'_id': {'$in': object_ids}}, {'playerName': 1, 'name': 1}))
        for player in players:
            name_map[str(player['_id'])] = player.get('playerName') or player.get('name') or ''

    supplied_players = body.get('players')
    if isinstance(supplied_players, list):
        for player in supplied_players:
            player_id = str(player.get('playerId') or '').strip()
            if not player_id:
                continue
            name_map[player_id] = str(player.get('playerName') or name_map.get(player_id, ''))

    return name_map


def infer_current_session_number(player_id):
    in_progress = attendance_col.find_one(
        {
            'playerId': player_id,
            'attendanceStatus': '',
            'sessionNumber': {'$type': 'number'}
        },
        {'sessionNumber': 1},
        sort=[('sessionNumber', -1), ('markedAt', -1)]
    )
    if in_progress:
        try:
            value = int(in_progress.get('sessionNumber'))
            if value > 0:
                return value
        except Exception:
            pass

    last_completed = attendance_col.find_one(
        {
            'playerId': player_id,
            'attendanceStatus': {'$in': ['Present', 'Absent', 'Late', 'Excused']},
            'sessionNumber': {'$type': 'number'}
        },
        {'sessionNumber': 1},
        sort=[('sessionNumber', -1), ('markedAt', -1)]
    )
    if last_completed:
        try:
            value = int(last_completed.get('sessionNumber'))
            if value > 0:
                return value
        except Exception:
            pass

    return None


def apply_card_status(session_card_id, attendance_status, session_date, marked_by):
    """Sync attendance outcome onto the linked session card.

    Absent/Excused → "pending": the session was missed but can be completed later
    as a make-up. Pending does not block next-card generation.
    Present/Late → restore a pending card to "upcoming" so the coach can start it.
    """
    if not session_card_id:
        return
    card_oid = parse_object_id(session_card_id)
    if not card_oid:
        return

    absent_statuses = {'Absent': 'absent', 'Excused': 'excused'}
    if attendance_status in absent_statuses:
        # Mark the card as pending (missed but recoverable). Only update open cards -
        # never overwrite a completed (graded) card.
        session_cards_col.update_one(
            {"_id": card_oid, "status": {"$in": ["upcoming", "in_progress", "in progress"]}},
            {"$set": {
                "status": "pending",
                "attendanceStatus": absent_statuses[attendance_status],
                "attendanceDate": session_date,
            },
             "$unset": {"closedReason": "", "closedDate": "", "closedBy": ""}},
        )
        return

    # Present/Late: restore a wrongly-pending card, but only if no newer card exists.
    if attendance_status in ('Present', 'Late'):
        card = session_cards_col.find_one({"_id": card_oid}, {"status": 1, "playerId": 1, "session": 1})
        if not card or card.get("status") != "pending":
            return
        newer = session_cards_col.find_one({
            "playerId": card.get("playerId"),
            "session": {"$gt": card.get("session", 0)},
        }, {"_id": 1})
        if newer:
            return
        session_cards_col.update_one(
            {"_id": card_oid},
            {"$set": {
                "status": "upcoming",
                "attendanceStatus": attendance_status.lower(),
            },
             "$unset": {"attendanceDate": ""}},
        )


def parse_object_id(value):
    try:
        return ObjectId(str(value).strip())
    except Exception:
        return None


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

    marked_by = {"id": user["_id"], "name": user.get("name", "")}

    # Delete/reset: clear attendance for a batch+date (or one player+date). Used to
    # clean up records left behind after their session cards were deleted, and to
    # let a coach reset a day's roster and start over.
    if str(body.get("action") or "").strip().lower() in ("delete", "deleteattendance", "reset"):
        batch_id = str(body.get("batchId") or "").strip()
        session_date = str(body.get("sessionDate") or "").strip()
        player_id = str(body.get("playerId") or "").strip()

        if not session_date:
            return resp(400, {"message": "sessionDate is required to delete attendance"})
        if not batch_id and not player_id:
            return resp(400, {"message": "batchId or playerId is required to delete attendance"})

        del_filter = {"sessionDate": session_date}
        if batch_id:
            del_filter["batchId"] = batch_id
        if player_id:
            del_filter["playerId"] = player_id

        result = attendance_col.delete_many(del_filter)
        return resp(200, {
            "message": f"Deleted {result.deleted_count} attendance record(s)",
            "deleted": result.deleted_count,
            "batchId": batch_id,
            "sessionDate": session_date,
        })

    # Bulk: mark all players in a batch with one status
    if "bulkStatus" in body:
        bulk_status = normalize_status(body.get('bulkStatus', 'Present'), allow_empty=False)
        if bulk_status is None:
            return resp(400, {'message': 'bulkStatus must be one of Present, Absent, Late, Excused'})

        target = resolve_bulk_targets(body)
        if target.get('error'):
            return resp(target['statusCode'], {'message': target['error']})

        player_ids = target['playerIds']
        if not player_ids:
            return resp(400, {'message': 'No players available for bulk mark'})

        batch_id = str(body.get('batchId') or '').strip()
        batch_name = str(body.get('batchName') or target.get('batchName') or '')
        session_number = normalize_session_number(body.get('sessionNumber'))
        session_date = str(body.get('sessionDate') or today_ist_str()).strip()
        source = str(body.get('source') or 'manual_bulk')
        notes = str(body.get('notes') or '')

        name_map = fetch_player_names(player_ids, body)

        updated = 0
        for pid in player_ids:
            effective_session_number = session_number if session_number is not None else infer_current_session_number(pid)
            attendance_col.update_one(
                {"playerId": pid, "batchId": batch_id, "sessionDate": session_date},
                {"$set": {
                    "playerName": name_map.get(pid, ""),
                    "batchName": batch_name,
                    "sessionNumber": effective_session_number,
                    "sessionDate": session_date,
                    "attendanceStatus": bulk_status,
                    "notes": notes,
                    "source": source,
                    "markedAt": now_ist(),
                    "markedBy": marked_by,
                }},
                upsert=True,
            )
            updated += 1

        return resp(200, {
            'message': f'Marked {bulk_status} for {updated} player(s)',
            'updated': updated,
            'batchId': batch_id,
            'sessionDate': session_date,
        })

    # Single record upsert
    player_id = str(body.get('playerId') or '').strip()
    batch_id = str(body.get('batchId') or '').strip()   # optional - empty when auto-marked from session
    batch_name = str(body.get('batchName') or '')
    session_date = str(body.get('sessionDate') or today_ist_str()).strip()
    session_number = normalize_session_number(body.get('sessionNumber'))
    attendance_status = normalize_status(body.get('attendanceStatus', ''), allow_empty=True)
    notes = str(body.get('notes') or '')
    source = str(body.get('source') or 'manual')
    session_card_id = str(body.get('sessionCardId') or '').strip()

    if not player_id:
        return resp(400, {"message": "playerId is required"})

    if attendance_status is None:
        return resp(400, {'message': 'attendanceStatus must be one of Present, Absent, Late, Excused or empty'})

    if session_number is None:
        session_number = infer_current_session_number(player_id)

    player_name = str(body.get('playerName') or '')
    if not player_name:
        try:
            player_doc = players_col.find_one({'_id': ObjectId(player_id)}, {'playerName': 1, 'name': 1})
            if player_doc:
                player_name = player_doc.get('playerName') or player_doc.get('name') or ''
        except Exception:
            player_name = ''

    try:
        existing_same_day_record = None
        if not batch_id:
            # Session-detail marks usually send empty batchId. Reuse same-day record
            # when available so we don't create duplicate rows for one player/date.
            existing_same_day_record = attendance_col.find_one(
                {
                    "playerId": player_id,
                    "sessionDate": session_date,
                },
                sort=[("markedAt", -1)]
            )
            if existing_same_day_record:
                existing_batch_id = str(existing_same_day_record.get("batchId") or "").strip()
                if existing_batch_id:
                    batch_id = existing_batch_id
                if not batch_name:
                    batch_name = str(existing_same_day_record.get("batchName") or "")

        update_filter = {
            "playerId": player_id,
            "batchId": batch_id,
            "sessionDate": session_date,
        }
        if existing_same_day_record and str(existing_same_day_record.get("batchId") or "").strip() == batch_id:
            update_filter = {"_id": existing_same_day_record.get("_id")}

        attendance_col.update_one(
            update_filter,
            {"$set": {
                "playerName": player_name,
                "batchName": batch_name,
                "sessionNumber": session_number,
                "sessionDate": session_date,
                "attendanceStatus": attendance_status,
                "sessionCardId": session_card_id,
                "notes": notes,
                "source": source,
                "markedAt": now_ist(),
                "markedBy": marked_by,
            }},
            upsert=True,
        )
        apply_card_status(session_card_id, attendance_status, session_date, marked_by)
        return resp(200, {"message": "Attendance marked", "updated": 1, "sessionDate": session_date})
    except Exception as e:
        return resp(500, {"message": "Internal server error", "error": str(e), "trace": traceback.format_exc()})
