import os
import psycopg2
import urllib.parse
from psycopg2.extras import RealDictCursor
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# App Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/anhoc_chatbot")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/anhoc")

# Connect to MongoDB with a 2-second timeout for local dev resilience
try:
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
    db_mongo = mongo_client.get_default_database()
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    db_mongo = None

# In-memory storage fallback for local development when MongoDB is offline
in_memory_usage = {}        # key: (user_id, date) -> count (int)
in_memory_conversations = [] # list of dicts

def get_pg_connection():
    """
    Returns a connection to the PostgreSQL database with cleaned DSN parameters.
    """
    try:
        # Clean the connection URL for psycopg2 compatibility
        url_parts = urllib.parse.urlparse(DATABASE_URL)
        query_params = urllib.parse.parse_qs(url_parts.query)
        
        # Strip unsupported prisma/nodejs parameters (pgbouncer, channel_binding)
        unsupported = ["pgbouncer", "channel_binding"]
        cleaned_params = {k: v for k, v in query_params.items() if k not in unsupported}
        cleaned_query = urllib.parse.urlencode(cleaned_params, doseq=True)
        
        cleaned_url = urllib.parse.ParseResult(
            scheme=url_parts.scheme,
            netloc=url_parts.netloc,
            path=url_parts.path,
            params=url_parts.params,
            query=cleaned_query,
            fragment=url_parts.fragment
        ).geturl()

        conn = psycopg2.connect(cleaned_url, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Failed to connect to PostgreSQL: {e}")
        return None
