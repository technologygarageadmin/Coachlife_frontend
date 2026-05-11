import json
import os
from datetime import datetime, timedelta
from pymongo import MongoClient

# ------------------ MONGODB CONFIG ------------------
MONGO_URI = os.environ.get("MONGO_URI")
DB_NAME = "CoachLife"
COLLECTION_NAME = "Users"

if not MONGO_URI:
    raise Exception("MONGO_URI not set in environment variables")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users = db[COLLECTION_NAME]

# ------------------ COMMON RESPONSE ------------------
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "OPTIONS, POST"
        },
        "body": json.dumps(body)
    }

# ------------------ HANDLER ------------------
def lambda_handler(event, context):

    # CORS
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {"message": "CORS preflight OK"})

    if not event.get("body"):
        return response(400, {"message": "Request body is missing"})

    try:
        request_body = json.loads(event["body"])
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON format"})

    required_fields = ["name", "username", "password", "email"]
    for field in required_fields:
        if not request_body.get(field):
            return response(400, {"message": f"{field} is required"})

    name = request_body["name"]
    username = request_body["username"]
    password = request_body["password"]
    email = request_body["email"]
    specialization = request_body.get("specialization")
    role = request_body.get("role")

    # ------------------ IST TIME WITHOUT zoneinfo ------------------
    ist_time = datetime.utcnow() + timedelta(hours=5, minutes=30)
    ist_time_str = ist_time.strftime("%Y-%m-%d %H:%M:%S")  # <-- IST format

    try:
        # Check if username or email already exists
        if users.find_one({"$or": [{"username": username}, {"email": email}]}):
            return response(409, {"message": "Username or Email already exists"})

        # Insert into MongoDB
        users.insert_one({
            "name": name,
            "username": username,
            "password": password,
            "email": email,
            "specialization": specialization,
            "role": role,
            "registrationTime": ist_time_str
        })

        return response(201, {"message": "User registered successfully"})

    except Exception as e:
        return response(500, {
            "message": "Database operation failed",
            "error": str(e)
        })
