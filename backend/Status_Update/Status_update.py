import json
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# Connect to MongoDB
client = MongoClient('mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/')
db = client['CoachLife']
player_learning_collection = db['Player Learning']
learning_pathway_collection = db['Learning Pathway']
player_collection = db['Players']  # Add reference to the Players collection

def lambda_handler(event, context):
    try:
        # Parse input from event
        body = json.loads(event['body'])
        document_id_str = body.get("id")
        status = body.get("status")
        
        # Check for required fields
        if document_id_str is None or status is None:
            raise ValueError("Missing required fields in the request body.")
        
        # Convert document ID from string to ObjectId
        document_id = ObjectId(document_id_str)
        
        # Find the document by id in the Player Learning collection
        document = player_learning_collection.find_one({"_id": document_id})
        if document:
            update_fields = {"status": status}
            unset_fields = {}

            # Fetch the pathwayId from the document
            pathway_id_str = document.get("pathwayId")
            if pathway_id_str is None:
                raise ValueError("Missing pathwayId in the Player Learning document.")
            
            try:
                # Convert pathwayId to ObjectId
                pathway_id = ObjectId(pathway_id_str)
            except Exception as e:
                raise ValueError(f"Invalid pathwayId format: {pathway_id_str}. Error: {e}")
            
            # Find the document in the learning pathway collection by pathwayId
            pathway_document = learning_pathway_collection.find_one({"_id": pathway_id})
            if pathway_document:
                # Fetch defaultPoints from the pathway document
                default_points = pathway_document.get("defaultPoints")
                if default_points is None:
                    raise ValueError("Missing defaultPoints in the learning pathway document.")
                
                # Always include defaultPoints in the update
                update_fields["defaultPoints"] = default_points
                
            else:
                raise ValueError(f"Learning pathway document not found for the given pathwayId: {pathway_id_str}")
            
            if status == "Completed":
                # Fetch and validate bonusPoints as a string
                bonus_points_str = body.get("bonusPoints")
                if bonus_points_str is None:
                    raise ValueError("Missing bonusPoints for Completed status.")
                if not isinstance(bonus_points_str, str):
                    raise ValueError("bonusPoints must be provided as a string.")
                
                # Fetch and validate additional fields
                points_given_by = body.get("pointsGivenBy")
                if points_given_by is None:
                    raise ValueError("Missing pointsGivenBy for Completed status.")
                if not isinstance(points_given_by, str):
                    raise ValueError("pointsGivenBy must be a string.")
                
                comment_for_bonus = body.get("commentForBonus")
                if comment_for_bonus is None:
                    raise ValueError("Missing commentForBonus for Completed status.")
                if not isinstance(comment_for_bonus, str):
                    raise ValueError("commentForBonus must be a string.")
                
                # Get current date and time formatted as "YYYY-MM-DD HH:MM:SS"
                current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # Add all necessary fields to the update including timestamp
                update_fields.update({
                    "bonusPoints": bonus_points_str,  # Store as string
                    "pointsGivenBy": points_given_by,
                    "commentForBonus": comment_for_bonus,
                    "updatedAt": current_time_str  # Add current date and time
                })

                # Calculate the total points to be added
                try:
                    total_points_to_add = int(default_points) + int(bonus_points_str)
                except ValueError:
                    raise ValueError("defaultPoints and bonusPoints must be valid integers.")

                # Fetch playerId from the Player Learning document
                player_id_str = document.get("playerId")
                if player_id_str is None:
                    raise ValueError("Missing playerId in the Player Learning document.")
                
                try:
                    player_id = ObjectId(player_id_str)
                except Exception as e:
                    raise ValueError(f"Invalid playerId format: {player_id_str}. Error: {e}")

                # Update the totalPoints and pointsBalance in the Player collection
                player_document = player_collection.find_one({"_id": player_id})
                if player_document:
                    current_total_points = int(player_document.get("totalPoints", "0"))
                    new_total_points = current_total_points + total_points_to_add

                    # Fetch redeemPoints from the player document
                    redeem_points = int(player_document.get("redeemPoints", "0"))

                    # Calculate new points balance
                    new_points_balance = new_total_points - redeem_points

                    # Update the Player document with the new totalPoints and pointsBalance
                    player_collection.update_one(
                        {"_id": player_id},
                        {"$set": {
                            "totalPoints": str(new_total_points),
                            "pointsBalance": str(new_points_balance)
                        }}
                    )
                else:
                    raise ValueError(f"Player document not found for the given playerId: {player_id_str}")
                
            else:
                # If status is "Not Completed" or "In Progress", prepare fields to be unset
                unset_fields = {
                    "bonusPoints": "",
                    "pointsGivenBy": "",
                    "commentForBonus": "",
                    "updatedAt": ""
                }
                
                # Update with new status and remove specified fields but keep defaultPoints
                player_learning_collection.update_one(
                    {"_id": document_id},
                    {
                        "$set": update_fields,
                        "$unset": unset_fields
                    }
                )
                print("Document updated with status and removed specified fields.")
                
                # Return success response with headers
                response = {
                    "statusCode": 200,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json"
                    },
                    "body": json.dumps({"message": "Document updated successfully."})
                }
                return response
            
            # Update the document in the Player Learning collection if status is "Completed"
            player_learning_collection.update_one({"_id": document_id}, {"$set": update_fields})
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
        print("Error:", e)
        response = {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": "Internal server error: {}".format(str(e))})
        }
    
    return response