import json
import os
import traceback
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta

DB_NAME = os.environ.get('DB_NAME', 'CoachLife')
IST = timezone(timedelta(hours=5, minutes=30))

_init_error = None
try:
    MONGO_URI = os.environ['MONGO_URI']
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    users = db['Users']
    batches_col = db['Batches']
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


def parse_body(event):
    raw = event.get("body")
    if raw is None or raw == "":
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    return {}


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


def parse_object_id(value):
    try:
        return ObjectId(str(value).strip())
    except Exception:
        return None


def get_player_count(batch_doc):
    return len((batch_doc or {}).get("playerIds", []))


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

    action = body.get("action")

    try:
        if action == "create":
            batch_name = body.get("batchName", "").strip()
            player_ids = unique_strings(body.get("playerIds", []))
            if not batch_name:
                return resp(400, {"message": "batchName is required"})
            doc = {
                "batchName": batch_name,
                "playerIds": player_ids,
                "createdAt": now_ist(),
                "createdBy": {"id": user["_id"], "name": user.get("name", "")},
            }
            result = batches_col.insert_one(doc)
            return resp(201, {"message": "Batch created", "batchId": str(result.inserted_id)})

        elif action == "update":
            batch_id = body.get("batchId")
            if not batch_id:
                return resp(400, {"message": "batchId is required"})

            batch_oid = parse_object_id(batch_id)
            if not batch_oid:
                return resp(400, {"message": "Invalid batchId"})

            update = {}
            if "batchName" in body:
                update["batchName"] = body["batchName"].strip()
            if "playerIds" in body:
                update["playerIds"] = unique_strings(body["playerIds"])
            update["updatedAt"] = now_ist()
            update["updatedBy"] = {"id": user["_id"], "name": user.get("name", "")}
            result = batches_col.update_one({"_id": batch_oid}, {"$set": update})
            if result.matched_count == 0:
                return resp(404, {"message": "Batch not found"})

            updated_batch = batches_col.find_one({"_id": batch_oid}, {"playerIds": 1}) or {}
            player_count = get_player_count(updated_batch)
            if player_count == 0:
                batches_col.delete_one({"_id": batch_oid})
                return resp(200, {
                    "message": "Batch updated and auto-deleted because no players remain",
                    "batchId": str(batch_oid),
                    "batchDeleted": True,
                    "playerCount": 0,
                })

            return resp(200, {"message": "Batch updated", "batchId": batch_id})

        elif action == "add_player":
            batch_id = body.get("batchId")
            if not batch_id:
                return resp(400, {"message": "batchId is required"})

            batch_oid = parse_object_id(batch_id)
            if not batch_oid:
                return resp(400, {"message": "Invalid batchId"})

            player_ids = unique_strings(body.get("playerIds") or [body.get("playerId")])
            if not player_ids:
                return resp(400, {"message": "playerId or playerIds is required"})

            result = batches_col.update_one(
                {"_id": batch_oid},
                {
                    "$addToSet": {"playerIds": {"$each": player_ids}},
                    "$set": {
                        "updatedAt": now_ist(),
                        "updatedBy": {"id": user["_id"], "name": user.get("name", "")}
                    }
                }
            )
            if result.matched_count == 0:
                return resp(404, {"message": "Batch not found"})

            batch = batches_col.find_one({"_id": batch_oid}, {"playerIds": 1}) or {}
            return resp(200, {
                "message": f"Added {len(player_ids)} player(s) to batch",
                "batchId": str(batch_oid),
                "playerCount": len(batch.get("playerIds", [])),
            })

        elif action == "remove_player":
            batch_id = body.get("batchId")
            if not batch_id:
                return resp(400, {"message": "batchId is required"})

            batch_oid = parse_object_id(batch_id)
            if not batch_oid:
                return resp(400, {"message": "Invalid batchId"})

            player_ids = unique_strings(body.get("playerIds") or [body.get("playerId")])
            if not player_ids:
                return resp(400, {"message": "playerId or playerIds is required"})

            result = batches_col.update_one(
                {"_id": batch_oid},
                {
                    "$pull": {"playerIds": {"$in": player_ids}},
                    "$set": {
                        "updatedAt": now_ist(),
                        "updatedBy": {"id": user["_id"], "name": user.get("name", "")}
                    }
                }
            )
            if result.matched_count == 0:
                return resp(404, {"message": "Batch not found"})

            batch = batches_col.find_one({"_id": batch_oid}, {"playerIds": 1}) or {}
            player_count = get_player_count(batch)
            if player_count == 0:
                batches_col.delete_one({"_id": batch_oid})
                return resp(200, {
                    "message": "Player removed and batch auto-deleted (no players left)",
                    "batchId": str(batch_oid),
                    "batchDeleted": True,
                    "playerCount": 0,
                })

            return resp(200, {
                "message": f"Removed {len(player_ids)} player(s) from batch",
                "batchId": str(batch_oid),
                "playerCount": player_count,
                "batchDeleted": False,
            })

        elif action == "delete":
            batch_id = body.get("batchId")
            if not batch_id:
                return resp(400, {"message": "batchId is required"})

            batch_oid = parse_object_id(batch_id)
            if not batch_oid:
                return resp(400, {"message": "Invalid batchId"})

            result = batches_col.delete_one({"_id": batch_oid})
            if result.deleted_count == 0:
                return resp(404, {"message": "Batch not found"})
            return resp(200, {"message": "Batch deleted"})

        else:
            return resp(400, {"message": "Invalid action. Use 'create', 'update', 'add_player', 'remove_player', or 'delete'"})

    except Exception as e:
        return resp(500, {"message": "Internal server error", "error": str(e), "trace": traceback.format_exc()})
