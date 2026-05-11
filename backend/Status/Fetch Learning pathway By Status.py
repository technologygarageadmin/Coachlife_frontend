import json
import pymongo
from bson.objectid import ObjectId

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        player_id = body.get('player_id')
        status = body.get('status')

        if not player_id:
            raise Exception("'player_id' key not found in the request body")
        if not status:
            raise Exception("'status' key not found in the request body")

        connection_string = 'MONGODB URL'
        client = pymongo.MongoClient(connection_string)
        db = client["CoachLife"]

        # Step 1: Get all documents from Learning Pathway collection
        all_learning_pathways = db["Learning Pathway"].find({}, {"_id": 1, "Activity": 1, "Level": 1, "Stage": 1, "Topic": 1})
        learning_pathway_data = {str(doc["_id"]): doc for doc in all_learning_pathways}

        pathway_activities = []

        if status.lower() == "not completed":
            # Step 2: Check Player Learning collection for matching pathway IDs
            player_learning_docs = db["Player Learning"].find({"playerId": ObjectId(player_id)})
            player_learning_pathway_ids = {str(doc["pathwayId"]) for doc in player_learning_docs}

            # Find pathways not completed by the player
            remaining_pathways = {pathway_id: data for pathway_id, data in learning_pathway_data.items() if pathway_id not in player_learning_pathway_ids}

            pathway_activities = [{"pathwayId": str(data["_id"]), "activity": data["Activity"]} for data in remaining_pathways.values()]

        elif status.lower() == "completed":
            # Step 2: Check Player Learning collection for completed pathways
            player_learning_docs = db["Player Learning"].find({"playerId": ObjectId(player_id), "status": "Completed"})
            completed_pathway_ids = {str(doc["pathwayId"]): doc["_id"] for doc in player_learning_docs}

            for pathway_id, doc_id in completed_pathway_ids.items():
                if pathway_id in learning_pathway_data:
                    data = learning_pathway_data[pathway_id]
                    pathway_activities.append({"pathwayId": str(data["_id"]), "activity": data["Activity"], "player_document_id": str(doc_id)})

        elif status.lower() == "in progress":
            # Step 2: Check Player Learning collection for in-progress pathways
            player_learning_docs = db["Player Learning"].find({"playerId": ObjectId(player_id), "status": "In Progress"})
            in_progress_pathway_ids = {str(doc["pathwayId"]): doc["_id"] for doc in player_learning_docs}

            for pathway_id, doc_id in in_progress_pathway_ids.items():
                if pathway_id in learning_pathway_data:
                    data = learning_pathway_data[pathway_id]
                    pathway_activities.append({"pathwayId": str(data["_id"]), "activity": data["Activity"], "player_document_id": str(doc_id)})

        else:
            raise Exception("Invalid status value. Please provide 'Completed', 'In Progress', or 'Not Completed'.")

        response = {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"pathway_data": pathway_activities})
        }
        return response

    except Exception as e:
        error_response = {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"errorType": "InternalServerError", "message": str(e)})
        }
        return error_response
