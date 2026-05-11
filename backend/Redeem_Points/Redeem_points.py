import json
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

def lambda_handler(event, context):
    # Retrieve MongoDB connection string from environment variable
    mongo_connection_string = "mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/"
    if not mongo_connection_string:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps('MongoDB connection string not found in environment variables.')
        }

    # Connect to MongoDB
    client = MongoClient(mongo_connection_string)

    # Specify the database and collections
    db = client['CoachLife']  # Replace with your database name
    redeem_points_collection = db['Redeem Points']  # The collection where redeem points data is stored
    players_collection = db['Players']  # Collection where player data is stored

    try:
        # Parse the JSON body from the event
        body = json.loads(event['body'])

        # Get playerId from event input and convert to ObjectId
        player_id_str = body.get('playerId')
        if not player_id_str:
            raise ValueError("PlayerId is required.")
        player_id = ObjectId(player_id_str)  # Convert string to ObjectId

        # Get redeemPoints, redeemForWhat, redeemedBy from event input
        redeem_points_str = body.get('redeemPoints')
        redeem_for_what = body.get('redeemForWhat', '')
        redeemed_by = body.get('redeemedBy', '')

        # Validate redeemPoints input
        if redeem_points_str is None:
            raise ValueError("Redeem points must be provided.")
        redeem_points = int(redeem_points_str)
        if redeem_points < 0:
            raise ValueError("Redeem points cannot be negative.")

        # Get the current datetime and format it as 'YYYY-MM-DD HH:MM:SS' for redeemDate
        redeem_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Check if a document with the given playerId already exists in redeem_points_collection
        existing_doc = redeem_points_collection.find_one({"playerId": player_id})

        if existing_doc:
            # Update the existing document by appending new redeemDetails as an object in the array
            result = redeem_points_collection.update_one(
                {"playerId": player_id},
                {"$push": {
                    "redeemDetails": {
                        "redeemPoints": str(redeem_points),
                        "redeemForWhat": redeem_for_what,
                        "redeemedBy": redeemed_by,
                        "redeemDate": redeem_date
                    }
                }}
            )
            response_message = f"Added redeemDetails for playerId: {player_id_str}"
        else:
            # Insert a new document with redeemDetails as an array containing the first object
            redeem_data = {
                "playerId": player_id,
                "redeemDetails": [
                    {
                        "redeemPoints": str(redeem_points),
                        "redeemForWhat": redeem_for_what,
                        "redeemedBy": redeemed_by,
                        "redeemDate": redeem_date
                    }
                ]
            }
            result = redeem_points_collection.insert_one(redeem_data)
            response_message = f"Document inserted with ID: {result.inserted_id}"

        # Update the redeemPoints in the Players collection
        player_document = players_collection.find_one({"_id": player_id})
        if player_document:
            # Convert existing redeemPoints to integer and add the new redeemPoints
            existing_redeem_points_str = player_document.get("redeemPoints", "0")
            existing_redeem_points = int(existing_redeem_points_str)
            updated_redeem_points = existing_redeem_points + redeem_points

            # Update the Players collection with the new redeemPoints as a string
            players_collection.update_one(
                {"_id": player_id},
                {"$set": {"redeemPoints": str(updated_redeem_points)}}
            )
            response_message += f" and updated player redeemPoints to {updated_redeem_points}."

            # Calculate new pointsBalance and update
            total_points_str = player_document.get("totalPoints", "0")
            total_points = int(total_points_str)
            points_balance = total_points - updated_redeem_points

            # Update the Players collection with the new pointsBalance as a string
            players_collection.update_one(
                {"_id": player_id},
                {"$set": {"pointsBalance": str(points_balance)}}
            )
            response_message += f" Updated player pointsBalance to {points_balance}."
        else:
            raise ValueError(f"Player with ID {player_id_str} not found in Players collection.")

        # Close the connection to MongoDB
        client.close()

        # Return success message
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                "message": response_message
            })
        }

    except ValueError as ve:
        # Handle ValueError exceptions
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(f"Invalid input: {ve}")
        }

    except Exception as e:
        # Handle other exceptions
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(f"Internal server error: {str(e)}")
        }
