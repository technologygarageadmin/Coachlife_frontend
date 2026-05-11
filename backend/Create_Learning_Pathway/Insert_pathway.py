import json
from pymongo import MongoClient
from bson import ObjectId

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def lambda_handler(event, context):
    try:
        # Connect to MongoDB Atlas
        client = MongoClient("mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/")

        # Access the desired database and collection
        db = client["CoachLife"]
        collection = db["Learning Pathway"]

        # Extract user input from the event body
        request_body = json.loads(event.get("body", "{}"))
        activity = request_body.get("Activity")
        level = request_body.get("Level")
        stage = request_body.get("Stage")
        topic = request_body.get("Topic")
        type_ = request_body.get("Type")
        time = request_body.get("time")
        preReq = request_body.get("preReq")
        defaultPoints = request_body.get("defaultPoints")

        # Check if all required fields are present
        required_fields = [
            activity, level, stage, topic, type_, time, preReq, defaultPoints
        ]
        
        if not all(required_fields):
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Missing required fields."})
            }

        # Create a dictionary with the user data
        user_data = {
            "_id": ObjectId(),  # Generate ObjectId for the document
            "Activity": activity,
            "Level": level,
            "Stage": stage,
            "Topic": topic,
            "Type": type_,
            "time": time,
            "preReq": preReq,
            "defaultPoints": str(defaultPoints)  # Store defaultPoints as string
        }

        # Insert the data into the MongoDB collection
        result = collection.insert_one(user_data)
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "message": "Learning pathway data inserted successfully.", 
                "playerId": str(user_data["_id"])
            }, cls=CustomJSONEncoder)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": str(e)})
        }