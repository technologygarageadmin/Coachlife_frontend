import json
from pymongo import MongoClient
from bson.objectid import ObjectId

client = MongoClient("MONGODB URL")
db = client.CoachLife
players_collection = db.Players
player_learning_collection = db["Player Learning"]
learning_pathway_collection = db["Learning Pathway"]

def fetch_comments_by_document_id(document_id):
    try:
        document = player_learning_collection.find_one({"_id": ObjectId(document_id)})
        
        if document:
            player_id = document.get("playerId")
            
            player = players_collection.find_one({"playerId": player_id})
            
            if player:
                player_name = player.get("name")
                
                comments = document.get("Comments", [])
                formatted_comments = []
                for comment in comments:
                    # Ensure each comment has the required fields
                    if "Comment" in comment and "CommentedBy" in comment and "CommentedOn" in comment:
                        formatted_comment = {
                            "_id": str(comment.get("_id")),  # Convert ObjectId to string
                            "comment": comment["Comment"],
                            "CommentedBy": comment["CommentedBy"],
                            "CommentedOn": comment["CommentedOn"]
                        }
                        formatted_comments.append(formatted_comment)
                    else:
                        print("Warning: Required fields missing in comment:", comment)
                
                return {
                    "Comments": formatted_comments
                }
            else:
                raise ValueError("Player not found.")
        else:
            raise ValueError("Document not found.")
    except Exception as e:
        raise ValueError(str(e))


def lambda_handler(event, context):
    try:
        if event['httpMethod'] == 'POST':
            body = json.loads(event['body'])
            document_id = body.get("document_id")

            if document_id:
                comments = fetch_comments_by_document_id(document_id)

                response = {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'comments': comments})
                }
            else:
                response = {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Document ID is required.'})
                }
        else:
            response = {
                'statusCode': 405,
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed.'})
            }
    except ValueError as ve:
        response = {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(ve)})
        }
    
    return response
