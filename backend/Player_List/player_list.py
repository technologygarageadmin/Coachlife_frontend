import json
from pymongo import MongoClient

def lambda_handler(event, context):
    try:
        # MongoDB Atlas connection string
        connection_string = "mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/"
        
        # Database name and collection name
        database_name = "CoachLife"
        collection_name = "Players"
        
        # Connect to MongoDB Atlas
        client = MongoClient(connection_string)
        
        # Access the desired database and collection
        db = client.get_database(database_name)
        collection = db.get_collection(collection_name)
        
        # Fetch all documents from the collection
        documents = list(collection.find({}))
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"  # Allow requests from any origin
                # Add other CORS headers as needed
            },
            "body": json.dumps(documents, default=str, indent=4)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"  # Allow requests from any origin
                # Add other CORS headers as needed
            },
            "body": json.dumps({"error": str(e)})
        }
