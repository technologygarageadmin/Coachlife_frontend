import json
from pymongo import MongoClient
from datetime import datetime

def fetch_all_player_points():
    # Replace the following connection string with your MongoDB connection string
    client = MongoClient('mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/')
    # Access the specific database and collections
    db = client['CoachLife']
    players_collection = db['Players']
    attendance_collection = db['Player Attendance']
    
    try:
        # Query the Players collection to find all documents including the dateOfRegistration field and _id
        player_documents = players_collection.find({}, {"playerName": 1, "totalPoints": 1, "redeemPoints": 1, "pointsBalance": 1, "dateOfRegistration": 1})
        
        players_with_sessions = []
        
        for player in player_documents:
            player_id = str(player['_id'])
            # Fetch the corresponding document from the Player Attendance collection
            attendance_doc = attendance_collection.find_one({"playerId": player_id}, {"numberOfSession": 1, "_id": 0})
            
            if attendance_doc:
                # Add numberOfSession to the player document
                player['numberOfSession'] = attendance_doc.get('numberOfSession', 0)
            else:
                player['numberOfSession'] = 0  # Default to 0 if no attendance record is found
            
            # Convert the player document _id to string for JSON serialization
            player['_id'] = str(player['_id'])
            
            players_with_sessions.append(player)
        
        return players_with_sessions
    except Exception as e:
        return {"error": str(e)}

def convert_datetime_to_str(player):
    """Convert datetime fields in player data to ISO 8601 string format."""
    if 'dateOfRegistration' in player and isinstance(player['dateOfRegistration'], datetime):
        player['dateOfRegistration'] = player['dateOfRegistration'].isoformat()
    return player

def categorize_players_by_registration(players):
    current_date = datetime.now()
    
    categories = {
        "0-3 months": [],
        "3-6 months": [],
        "6-9 months": [],
        "9-12 months": [],
        "More than 12 months": []
    }
    
    for player in players:
        player = convert_datetime_to_str(player)  # Ensure datetime is converted to string
        
        registration_date = player.get('dateOfRegistration')
        
        if registration_date:
            try:
                # Parse the registration_date from string
                registration_date = datetime.fromisoformat(registration_date)
                
                # Calculate the difference in months
                months_diff = (current_date.year - registration_date.year) * 12 + (current_date.month - registration_date.month)
                
                if months_diff <= 3:
                    categories["0-3 months"].append(player)
                elif 3 < months_diff <= 6:
                    categories["3-6 months"].append(player)
                elif 6 < months_diff <= 9:
                    categories["6-9 months"].append(player)
                elif 9 < months_diff <= 12:
                    categories["9-12 months"].append(player)
                else:
                    categories["More than 12 months"].append(player)
            except ValueError:
                # Handle invalid date formats
                categories["Invalid date format"].append(player)
    
    return categories

def lambda_handler(event, context):
    try:
        # Fetch all player points and sessions
        players = fetch_all_player_points()
        
        # Categorize players by registration date
        categorized_players = categorize_players_by_registration(players)
        
        return {
            'statusCode': 200,
            'body': json.dumps(categorized_players)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({"error": str(e)})
        }
