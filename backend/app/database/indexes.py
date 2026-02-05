from datetime import datetime
from typing import List, Optional, Dict, Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.app_logging import logger
from app.database.models import ThreatType, Severity


async def create_indexes():
    """Create necessary database indexes for optimal query performance"""
    from app.database.db import Database
    
    db = await Database.get_database()
    
    # Indexes for the threats collection
    threats_collection = db["threats"]
    await _create_threat_indexes(threats_collection)
    
    # Indexes for the correlations collection
    correlations_collection = db["correlations"]
    await _create_correlation_indexes(correlations_collection)
    
    # Indexes for the users collection
    users_collection = db["users"]
    await _create_user_indexes(users_collection)
    
    # Indexes for the alerts collection
    alerts_collection = db["alerts"]
    await _create_alert_indexes(alerts_collection)
    
    logger.info("Database indexes have been created/verified")


async def _create_threat_indexes(collection: AsyncIOMotorCollection):
    """Create indexes for the threats collection"""
    # Compound index for common queries
    await collection.create_index([
        ("type", 1),
        ("severity", 1),
        ("last_seen", -1)
    ], name="type_severity_timestamp")
    
    # Index for value lookups
    await collection.create_index("value", unique=True, name="value_unique")
    
    # Index for source and last_seen
    await collection.create_index([
        ("source", 1),
        ("last_seen", -1)
    ], name="source_timestamp")
    
    # Index for tags
    await collection.create_index("tags", name="tags")
    
    # Index for MITRE ATT&CK techniques
    await collection.create_index("mitre_attack", name="mitre_attack")
    
    # TTL index for auto-deleting old threats (30 days)
    try:
        await collection.create_index(
            "last_seen",
            expireAfterSeconds=30 * 24 * 60 * 60,  # 30 days
            name="ttl_last_seen"
        )
    except Exception as e:
        logger.warning(f"Could not create TTL index: {e}")
    
    # Text index for full-text search
    try:
        await collection.create_index(
            [("value", "text"), ("description", "text"), ("tags", "text")],
            name="text_search",
            default_language="english"
        )
    except Exception as e:
        logger.warning(f"Could not create text index: {e}")


async def _create_correlation_indexes(collection: AsyncIOMotorCollection):
    """Create indexes for the correlations collection"""
    # Compound index for common queries
    await collection.create_index([
        ("type", 1),
        ("severity", 1),
        ("last_seen", -1)
    ], name="type_severity_timestamp")
    
    # Index for threat IDs in the threats array
    await collection.create_index("threats", name="threats")
    
    # Index for correlation type and confidence
    await collection.create_index([
        ("type", 1),
        ("confidence", -1)
    ], name="type_confidence")
    
    # TTL index for auto-deleting old correlations (60 days)
    try:
        await collection.create_index(
            "last_seen",
            expireAfterSeconds=60 * 24 * 60 * 60,  # 60 days
            name="ttl_last_seen"
        )
    except Exception as e:
        logger.warning(f"Could not create TTL index for correlations: {e}")


async def _create_user_indexes(collection: AsyncIOMotorCollection):
    """Create indexes for the users collection"""
    # Unique index for username and email
    await collection.create_index("username", unique=True, name="username_unique")
    await collection.create_index("email", unique=True, name="email_unique")
    
    # Index for role and active status
    await collection.create_index([
        ("role", 1),
        ("is_active", 1)
    ], name="role_active")


async def _create_alert_indexes(collection: AsyncIOMotorCollection):
    """Create indexes for the alerts collection"""
    # Index for status and timestamp
    await collection.create_index([
        ("status", 1),
        ("created_at", -1)
    ], name="status_timestamp")
    
    # Index for severity and timestamp
    await collection.create_index([
        ("severity", 1),
        ("created_at", -1)
    ], name="severity_timestamp")
    
    # Index for related threats
    await collection.create_index("related_threats", name="related_threats")
    
    # TTL index for auto-deleting old resolved alerts (90 days)
    try:
        await collection.create_index(
            "updated_at",
            expireAfterSeconds=90 * 24 * 60 * 60,  # 90 days
            partialFilterExpression={"status": "resolved"},
            name="ttl_resolved_alerts"
        )
    except Exception as e:
        logger.warning(f"Could not create TTL index for alerts: {e}")


async def get_collection_stats(collection_name: str) -> Dict[str, Any]:
    """Get statistics for a collection"""
    from app.database.db import Database
    
    db = await Database.get_database()
    collection = db[collection_name]
    
    # Get collection stats
    stats = await db.command("collstats", collection_name)
    
    # Get document count
    count = await collection.count_documents({})
    
    # Get index information
    indexes = await collection.index_information()
    
    return {
        "name": collection_name,
        "count": count,
        "size_bytes": stats.get("size", 0),
        "storage_size_bytes": stats.get("storageSize", 0),
        "index_count": len(indexes),
        "indexes": [{"name": name, "key": idx["key"], "unique": idx.get("unique", False)} 
                    for name, idx in indexes.items()]
    }
