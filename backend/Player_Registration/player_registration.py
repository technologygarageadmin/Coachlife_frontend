import json
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId

# Initialize the MongoDB client outside the handler to reuse the connection
client = MongoClient("mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/")
db = client["CoachLife"]
collection = db["Players"]

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def lambda_handler(event, context):
    try:
        # Extract user input from the event body
        request_body = json.loads(event.get("body", "{}"))
        
        playerName = request_body.get("playerName")
        fatherName = request_body.get("fatherName")
        motherName = request_body.get("motherName")
        dateOfBirth = request_body.get("dateOfBirth")
        bloodGroup = request_body.get("bloodGroup")
        address = request_body.get("address")
        mobileNumber = request_body.get("mobileNumber")
        
        timeSlot = request_body.get("timeSlot")  # New field for time slot
        
        # Check if all required fields are present
        if not all([playerName, bloodGroup, dateOfBirth, fatherName, motherName, address, mobileNumber]):
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Missing required fields."})
            }
        
        # Automatically generate registration date in the desired format
        dateOfRegistration = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Create a dictionary with the user data in camelCase and convert to strings
        user_data = {
            "_id": ObjectId(),  # Generate ObjectId for the document
            "playerName": str(playerName),  # Store playerName as string
            "fatherName": str(fatherName),  # Store fatherName as string
            "motherName": str(motherName),  # Store motherName as string
            "dateOfBirth": str(dateOfBirth),  # Store dateOfBirth as string
            "bloodGroup": str(bloodGroup),  # Store bloodGroup as string
            "address": str(address),  # Store address as string
            "mobileNumber": str(mobileNumber),  # Store mobileNumber as string
            "timeSlot": str(timeSlot) if timeSlot else None,  # Store timeSlot as string if provided
            "dateOfRegistration": dateOfRegistration,  # Store dateOfRegistration as string in desired format
            "status": "Inactive",  # New field with default value "Inactive"
            "totalPoints": "0",    # New field with initial value as string "0"
            "redeemPoints": "0",   # New field with initial value as string "0"
            "pointsBalance": "0"   # New field with initial value as string "0"
        }
        
        # Insert the data into the MongoDB collection
        result = collection.insert_one(user_data)
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": "Player data inserted successfully.", "playerId": str(user_data["_id"])}, cls=CustomJSONEncoder)
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
