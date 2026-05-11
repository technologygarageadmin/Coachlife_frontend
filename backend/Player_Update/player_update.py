import json
from pymongo import MongoClient
from datetime import datetime
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
        collection = db["Players"]

        # Extract user input from the event body
        request_body = json.loads(event.get("body", "{}"))
        player_id = request_body.get("_id")

        # Check if player ID is provided
        if not player_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Missing player ID."})
            }

        # Convert player_id from string to ObjectId
        player_id = ObjectId(player_id)

        # Find the existing document by player_id
        existing_document = collection.find_one({"_id": player_id})

        # Check if the document exists
        if not existing_document:
            return {
                "statusCode": 404,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Document not found."})
            }

        # Update all fields with new values
        fields_to_update = {key: value for key, value in request_body.items() if key != '_id'}
        fields_to_update['dateOfRegistration'] = datetime.now().isoformat()

        # Perform the update
        collection.update_one(
            {"_id": player_id},
            {"$set": fields_to_update}
        )

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": "Document updated successfully.", "playerId": str(player_id)}, cls=CustomJSONEncoder)
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
