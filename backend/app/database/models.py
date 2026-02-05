from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl
from bson import ObjectId
from typing_extensions import Annotated

# Custom type for MongoDB ObjectId
PyObjectId = Annotated[str, str]

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class ThreatType(str, Enum):
    CVE = "cve"
    IP = "ip"
    DOMAIN = "domain"
    HASH = "hash"
    URL = "url"
    EMAIL = "email"
    USER = "user"

class ThreatSource(str, Enum):
    NVD = "nvd"
    OTX = "otx"
    VIRUSTOTAL = "virustotal"
    ABUSEIPDB = "abuseipdb"
    MALSHARE = "malshare"
    RSS = "rss"
    MANUAL = "manual"

class GeoLocation(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ip_address: Optional[str] = None

class ThreatIntel(BaseModel):
    type: ThreatType
    value: str
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    severity: Severity
    source: ThreatSource
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    is_false_positive: bool = False
    is_whitelisted: bool = False
    enrichment: Optional[Dict[str, Any]] = None
    geo: Optional[GeoLocation] = None
    mitre_attack: Optional[List[str]] = []
    related_indicators: Optional[List[str]] = []

class ThreatInDB(ThreatIntel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "_id": "60d5f1b3b3b3b3b3b3b3b3b3",
                "type": "ip",
                "value": "192.168.1.1",
                "severity": "high",
                "source": "abuseipdb",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00"
            }
        }

class Alert(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    title: str
    description: str
    severity: Severity
    status: str = "open"  # open, in_progress, closed, false_positive
    source: ThreatSource
    threat_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class User(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    username: str
    email: str
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    roles: List[str] = ["analyst"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    # Optional refresh token to support token renewal
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: List[str] = []

class WebSocketMessage(BaseModel):
    type: str  # threat, alert, status, etc.
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
