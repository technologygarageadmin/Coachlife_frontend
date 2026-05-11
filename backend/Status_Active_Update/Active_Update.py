import json
from pymongo import MongoClient
from bson import ObjectId

# Connect to MongoDB
client = MongoClient('mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/')
db = client['CoachLife']
collection = db['Players']

def lambda_handler(event, context):
    try:
        # Parse input from event
        body = json.loads(event['body'])
        player_id = body.get("player_id")
        status = body.get("status")
        
        if player_id is None or status is None:
            raise ValueError("Missing required fields in the request body.")
        
        # Convert document ID from string to ObjectId
        document_id = ObjectId(player_id)
        
        # Find the document by id
        document = collection.find_one({"_id": document_id})
        if document:
            # Update the status field
            document['status'] = status
                
            # Update the document in the collection
            collection.update_one({"_id": document_id}, {"$set": {"status": status}})
            print("Document updated successfully.")
                
            # Return success response with headers
            response = {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"message": "Document updated successfully."})
            }
        else:
            print("Document not found.")
            response = {
                "statusCode": 404,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"message": "Document not found."})
            }
    except ValueError as ve:
        print("ValueError:", ve)
        response = {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": str(ve)})
        }
    except Exception as e:
        print("Error:", e)  # Add logging here
        response = {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": "Internal server error: {}".format(str(e))})
        }
    
    return response