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
        document_id = request_body.get("document_id")
        activity = request_body.get("Activity")
        level = request_body.get("Level")
        stage = request_body.get("Stage")
        topic = request_body.get("Topic")
        type_ = request_body.get("Type")
        time = request_body.get("time")
        preReq = request_body.get("preReq")
        defaultPoints = request_body.get("defaultPoints")

        # Check if document_id is provided
        if not document_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Missing document_id."})
            }

        # Create an update dictionary with the provided fields
        update_data = {
            "Activity": activity,
            "Level": level,
            "Stage": stage,
            "Topic": topic,
            "Type": type_,
            "time": time,
            "preReq": preReq,
            "defaultPoints": str(defaultPoints)  # Store defaultPoints as string
        }

        # Remove keys with None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        # Check if there are any fields to update
        if not update_data:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "No fields to update."})
            }

        # Update the document in the MongoDB collection
        result = collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return {
                "statusCode": 404,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Document not found."})
            }

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "message": "Learning pathway data updated successfully.", 
                "document_id": document_id
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
