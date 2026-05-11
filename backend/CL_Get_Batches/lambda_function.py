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
    players_col = db['Players']
except KeyError:
    _init_error = "MONGO_URI environment variable is not set"
except Exception as e:
    _init_error = f"DB init failed: {str(e)}"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, userToken",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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


def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return resp(200, {"message": "CORS OK"})

    if _init_error:
        return resp(500, {"message": "Lambda init failed", "error": _init_error})

    user = validate_user(event)
    if not user:
        return resp(401, {"message": "Unauthorized or token missing"})

    try:
        batch_list = list(batches_col.find({}))
        result = []
        for batch in batch_list:
            player_ids = batch.get("playerIds", [])
            if len(player_ids) == 0:
                batches_col.delete_one({"_id": batch["_id"]})
                continue

            oid_list = []
            for pid in player_ids:
                try:
                    oid_list.append(ObjectId(pid))
                except Exception:
                    pass
            players = list(players_col.find({"_id": {"$in": oid_list}}, {"playerName": 1}))
            player_info = [
                {"playerId": str(p["_id"]), "playerName": p.get("playerName", "")}
                for p in players
            ]
            result.append({
                "batchId": str(batch["_id"]),
                "batchName": batch.get("batchName", ""),
                "playerIds": player_ids,
                "players": player_info,
                "createdAt": batch.get("createdAt", ""),
            })
        return resp(200, {"batches": result})
    except Exception as e:
        return resp(500, {"message": "Internal server error", "error": str(e), "trace": traceback.format_exc()})
