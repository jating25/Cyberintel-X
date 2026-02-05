from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from app.config import settings
from app.app_logging import logger

class Database:
    client: AsyncIOMotorClient = None
    db = None
    
    @classmethod
    async def connect_db(cls):
        """Initialize database connection"""
        try:
            cls.client = AsyncIOMotorClient(settings.MONGODB_URI)
            cls.db = cls.client[settings.MONGODB_DB]
            await cls.db.command('ping')
            logger.info("Successfully connected to MongoDB")
            return cls.db
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    async def close_db(cls):
        """Close database connection"""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")
    
    @classmethod
    def get_collection(cls, collection_name: str):
        """Get a collection from the database"""
        if cls.db is None:
            raise RuntimeError("Database not connected. Call connect_db first.")
        return cls.db[collection_name]
    
    @classmethod
    async def get_database(cls):
        """Get the database instance"""
        if cls.db is None:
            await cls.connect_db()
        return cls.db

# Module-level function for dependency injection
async def get_database():
    """Get the database instance for dependency injection"""
    return await Database.get_database()
