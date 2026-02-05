from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from enum import Enum
from .models import Severity, ThreatType, ThreatSource

# Common schemas for API requests/responses
class StatusResponse(BaseModel):
    status: str = "success"
    message: str
    data: Optional[Dict[str, Any]] = None

# User management schemas
class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool = True
    roles: List[str] = ["analyst"]

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    roles: Optional[List[str]] = None

class UserInDB(UserBase):
    id: str
    hashed_password: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True

class UserResponse(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: List[str] = []

# Threat intelligence schemas
class ThreatBase(BaseModel):
    type: ThreatType
    value: str
    severity: Severity
    source: ThreatSource
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    is_false_positive: bool = False
    is_whitelisted: bool = False

class ThreatCreate(ThreatBase):
    pass

class ThreatUpdate(BaseModel):
    severity: Optional[Severity] = None
    tags: Optional[List[str]] = None
    is_false_positive: Optional[bool] = None
    is_whitelisted: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class ThreatResponse(ThreatBase):
    id: str
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    updated_at: datetime
    enrichment: Optional[Dict[str, Any]] = None
    geo: Optional[Dict[str, Any]] = None
    mitre_attack: Optional[List[str]] = []
    related_indicators: Optional[List[str]] = []

    class Config:
        orm_mode = True

# Alert schemas
class AlertBase(BaseModel):
    title: str
    description: str
    severity: Severity
    source: ThreatSource
    threat_id: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class AlertResponse(AlertBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        orm_mode = True

# Search and filter schemas
class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 100

class ThreatFilter(PaginationParams):
    type: Optional[ThreatType] = None
    severity: Optional[Severity] = None
    source: Optional[ThreatSource] = None
    tag: Optional[str] = None
    search: Optional[str] = None
    is_false_positive: Optional[bool] = None
    is_whitelisted: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class AlertFilter(PaginationParams):
    status: Optional[str] = None
    severity: Optional[Severity] = None
    source: Optional[ThreatSource] = None
    assigned_to: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# WebSocket message schemas
class WSMessageType(str, Enum):
    THREAT_NEW = "threat:new"
    THREAT_UPDATE = "threat:update"
    ALERT_NEW = "alert:new"
    ALERT_UPDATE = "alert:update"
    STATUS_UPDATE = "status:update"

class WSMessage(BaseModel):
    type: WSMessageType
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Report schemas
class ReportType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class ReportRequest(BaseModel):
    report_type: ReportType
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_charts: bool = True
    include_details: bool = True

# System status schema
class SystemStatus(BaseModel):
    status: str
    version: str
    uptime: float  # in seconds
    database_status: str
    last_ingestion: Optional[datetime] = None
    threats_count: Dict[str, int]  # count by type/severity
    alerts_count: Dict[str, int]  # count by status/severity
