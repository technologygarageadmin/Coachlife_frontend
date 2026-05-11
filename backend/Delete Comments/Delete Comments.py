import json
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson.objectid import ObjectId

# Set the time zone offset (UTC+05:30 for Indian Standard Time)
time_zone_offset = timedelta(hours=5, minutes=30)

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event)) 
        # Check if the 'body' key exists in the event
        if 'body' not in event:
            raise ValueError("Request body is missing")

        client = MongoClient("Mongodb URL")
        db = client.CoachLife
        player_learning_collection = db["Player Learning"]
        
        # Parse input from API Gateway
        body = json.loads(event['body'])
        comment_id = body.get("_id")  
        
        if comment_id is None:
            raise ValueError("_id of the comment is missing")

        # Use $pull operator to remove the comment based on its ObjectId
        result = player_learning_collection.update_one(
            {"Comments._id": ObjectId(comment_id)},
            {"$pull": {"Comments": {"_id": ObjectId(comment_id)}}}
        )
        
        if result.matched_count > 0:
            response = {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Comment deleted successfully.'})
            }
        else:
            response = {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Comment not found.'})
            }
    except Exception as e:
        response = {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
    
    return response
