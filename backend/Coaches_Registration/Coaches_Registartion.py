import json
from pymongo import MongoClient
from datetime import datetime

def lambda_handler(event, context):
    try:
        # Connect to MongoDB Atlas
        client = MongoClient("mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/")

        # Access the desired database and collection
        db = client["CoachLife"]
        collection = db["Coachs"]

        # Extract user input from the event body
        request_body = json.loads(event.get("body", "{}"))
        user_name = request_body.get("user_name")
        coach_name = request_body.get("coach_name")
        password = request_body.get("password")
        
        # Check if all required fields are present
        if not all([user_name, coach_name, password]):
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Missing required fields."})
            }
        
        # Automatically generate registration date
        date_of_registration = datetime.now()

        # Create a dictionary with the user data
        user_data = {
            "UserName": user_name,
            "CoachName": coach_name,
            "Password": password,
            "DateOfRegistration": date_of_registration
        }

        # Insert the data into the MongoDB collection
        collection.insert_one(user_data)
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": "User data inserted successfully."})
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
