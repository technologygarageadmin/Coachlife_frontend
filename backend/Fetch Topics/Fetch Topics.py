import json
import pymongo
from pymongo import MongoClient

def lambda_handler(event, context):
    # MongoDB connection details
    mongo_uri = "Mongo Connect String"
    database_name = 'CoachLife'
    collection_name = 'Learning Pathway'


    client = MongoClient(mongo_uri)
    db = client[database_name]
    collection = db[collection_name]

    unique_topics = collection.distinct('Topic')

    response = {
        'statusCode': 200,
        'body': json.dumps(unique_topics)
    }

    return response
