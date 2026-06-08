import os
import urllib.parse
from datetime import datetime

import psycopg2
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "math_tutor")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/anhoc")

mongo_client: AsyncIOMotorClient | None = None
db_mongo: AsyncIOMotorDatabase | None = None

try:
    mongo_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
    db_mongo = mongo_client.get_database(MONGODB_DB)
except Exception as e:
    print(f"MongoDB client initialization failed: {e}")
    mongo_client = None
    db_mongo = None

in_memory_usage: dict[tuple[str, str], int] = {}
in_memory_conversations: list[dict] = []
in_memory_messages: list[dict] = []
in_memory_student_memories: dict[str, dict] = {}
in_memory_practice_questions: list[dict] = []
in_memory_tutor_logs: list[dict] = []


async def is_mongo_available() -> bool:
    if mongo_client is None or db_mongo is None:
        return False

    try:
        await mongo_client.admin.command("ping")
        return True
    except Exception as e:
        print(f"MongoDB connection offline (falling back to in-memory storage): {e}")
        return False


async def ensure_mongo_indexes():
    if not await is_mongo_available():
        return

    await db_mongo.conversations.create_index([("userId", 1), ("updatedAt", -1)])
    await db_mongo.messages.create_index([("conversationId", 1), ("createdAt", 1)])
    await db_mongo.student_memories.create_index("userId", unique=True)
    await db_mongo.lesson_chunks.create_index([("grade", 1), ("lessonId", 1), ("language", 1)])
    await db_mongo.practice_questions.create_index([("userId", 1), ("topic", 1), ("createdAt", -1)])
    await db_mongo.tutor_logs.create_index([("userId", 1), ("createdAt", -1)])


def utcnow() -> datetime:
    return datetime.utcnow()


def get_pg_connection():
    try:
        url_parts = urllib.parse.urlparse(DATABASE_URL)
        query_params = urllib.parse.parse_qs(url_parts.query)
        unsupported = ["pgbouncer", "channel_binding"]
        cleaned_params = {k: v for k, v in query_params.items() if k not in unsupported}
        cleaned_query = urllib.parse.urlencode(cleaned_params, doseq=True)

        cleaned_url = urllib.parse.ParseResult(
            scheme=url_parts.scheme,
            netloc=url_parts.netloc,
            path=url_parts.path,
            params=url_parts.params,
            query=cleaned_query,
            fragment=url_parts.fragment,
        ).geturl()

        return psycopg2.connect(cleaned_url, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"Failed to connect to PostgreSQL: {e}")
        return None
