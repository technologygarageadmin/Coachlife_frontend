import json
from pymongo import MongoClient
from bson.objectid import ObjectId

# MongoDB connection setup
client = MongoClient("mongodb+srv://tgdev:technology-1@cluster0.0pefygc.mongodb.net/")
db = client.CoachLife
players_collection = db.Players
player_learning_collection = db["Player Learning"]
learning_pathway_collection = db["Learning Pathway"]

def fetch_pathways(player_id):
    try:
        player_id_obj = ObjectId(player_id)  # Convert playerId to ObjectId
        print(f"Converted player ID: {player_id_obj}")

        # Fetch all pathways from Learning Pathway collection
        all_pathways_cursor = learning_pathway_collection.find()
        all_pathways = list(all_pathways_cursor)
        print(f"All pathways found: {all_pathways}")

        # Fetch relevant documents from Player Learning collection for the given playerId
        player_learning_cursor = player_learning_collection.find({
            "playerId": player_id_obj,
            "status": {"$in": ["Completed", "In progress"]}
        })
        player_learning_docs = list(player_learning_cursor)
        print(f"Player learning documents found: {player_learning_docs}")

        # Extract pathwayIds from Player Learning documents
        pathway_ids = {str(doc.get("pathwayId")) for doc in player_learning_docs}
        print(f"Pathway IDs with relevant statuses: {pathway_ids}")

        # Separate the pathways into completed and not completed
        incomplete_pathways = []
        completed_pathways_details = []

        for pathway in all_pathways:
            pathway_id = str(pathway.get("_id"))
            if pathway_id in pathway_ids:
                # Add completed pathways details
                completed_doc = next((doc for doc in player_learning_docs if str(doc.get("pathwayId")) == pathway_id), {})
                completed_pathways_details.append({
                    "_id": str(completed_doc.get("_id")),
                    "status": completed_doc.get("status", "Unknown"),
                    "topic": pathway.get("Topic", ""),
                    "activity": pathway.get("Activity", "")
                })
            else:
                # Add not completed pathways details (if needed, otherwise you can remove this section)
                incomplete_pathways.append({
                    "pathwayId": pathway_id,
                    "status": "Not Completed",
                    "topic": pathway.get("Topic", ""),
                    "activity": pathway.get("Activity", "")
                })

        return {"incomplete": incomplete_pathways, "completed": completed_pathways_details}

    except Exception as e:
        return {"error": str(e)}

def lambda_handler(event, context):
    try:
        if event.get('httpMethod') == 'POST':
            body = json.loads(event.get('body', '{}'))
            player_id = body.get('player_id')
            print(f"Received player_id: {player_id}")

            if not player_id:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Missing player_id in request body'})
                }

            result = fetch_pathways(player_id)
            if 'error' in result:
                return {
                    'statusCode': 400,
                    'body': json.dumps(result)
                }

            response = {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result)
            }
        else:
            response = {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid request method'})
            }
    except json.JSONDecodeError:
        response = {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
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