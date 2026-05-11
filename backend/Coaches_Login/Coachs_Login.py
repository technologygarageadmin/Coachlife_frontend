import pymongo
import json

def lambda_handler(event, context):
    # Replace with your connection string from MongoDB Atlas
    connection_string = "mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/"
    try:
        # Connect to the client
        client = pymongo.MongoClient(connection_string)
        # Get the database
        db = client["CoachLife"]
        # Get the registration collection
        registration_collection = db["Coachs"]

        # Extract username and password from the request body
        if 'body' not in event:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "isBase64Encoded": False,
                "body": json.dumps({"error": "Request body is missing."})
            }
        
        request_body = json.loads(event['body'])
        user_name = request_body.get("UserName")
        password = request_body.get("Password")

        # Query MongoDB to find a matching user
        matching_user = registration_collection.find_one({"UserName": user_name, "Password": password})

        if matching_user:
            print("User found!")
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "isBase64Encoded": False,
                "body": json.dumps({"msg": "User found!"})
            }
        else:
            print("User not found!")
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "isBase64Encoded": False,
                "body": json.dumps({"error": "User not found!"})
            }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "isBase64Encoded": False,
            "body": json.dumps({"error": str(e)})
        }
