import os
from pydantic_settings import BaseSettings
from typing import List, Optional
from dotenv import load_dotenv
from pydantic import Field

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "CyberIntel-X"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "cyberintelx")
    
    # API Keys
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
    OTX_API_KEY: str = os.getenv("OTX_API_KEY", "")
    ABUSEIPDB_API_KEY: str = os.getenv("ABUSEIPDB_API_KEY", "")
    MALSHARE_API_KEY: str = os.getenv("MALSHARE_API_KEY", "")
    MAPBOX_ACCESS_TOKEN: str = os.getenv("MAPBOX_ACCESS_TOKEN", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    WORKERS: int = int(os.getenv("WORKERS", "1"))
    
    # Ingestion intervals
    NVD_INGESTION_INTERVAL: int = int(os.getenv("NVD_INGESTION_INTERVAL", "3600"))
    VIRUSTOTAL_INGESTION_INTERVAL: int = int(os.getenv("VIRUSTOTAL_INGESTION_INTERVAL", "3600"))
    OTX_INGESTION_INTERVAL: int = int(os.getenv("OTX_INGESTION_INTERVAL", "7200"))
    ABUSEIPDB_INGESTION_INTERVAL: int = int(os.getenv("ABUSEIPDB_INGESTION_INTERVAL", "7200"))
    MALSHARE_INGESTION_INTERVAL: int = int(os.getenv("MALSHARE_INGESTION_INTERVAL", "10800"))
    RSS_INGESTION_INTERVAL: int = int(os.getenv("RSS_INGESTION_INTERVAL", "3600"))
    
    # RSS Feeds
    RSS_FEED_URLS: str = os.getenv("RSS_FEED_URLS", "")
    
    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        # Allow extra environment variables (e.g. VITE_*) without raising errors
        "extra": "ignore",
    }

settings = Settings()
