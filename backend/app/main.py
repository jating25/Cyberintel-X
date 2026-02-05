import asyncio
import os
import signal
import json
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
 
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import uvicorn

from .database.db import Database, get_database
from .database.models import ThreatIntel, ThreatInDB, ThreatType, Severity, ThreatSource, Alert, User, Token, TokenData
from .services.ingest_service import ingestion_manager, start_ingestion, stop_ingestion, get_ingestion_status
from .services.correlation_service import correlation_service, start_correlation, stop_correlation, get_correlation_status
from .app_logging import logger, get_logger
from .config import settings

# Setup logging
logger = get_logger(__name__)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        """Send a message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                self.disconnect(connection)

# Global WebSocket manager
manager = ConnectionManager()

# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CyberIntel-X backend...")
    
    # Initialize database connection
    await Database.connect_db()
    logger.info("Database connection established")
    
    # Start background tasks
    asyncio.create_task(start_ingestion())
    asyncio.create_task(start_correlation())
    logger.info("Background services started")
    
    yield  # App is running
    
    # Shutdown
    logger.info("Shutting down CyberIntel-X backend...")
    await stop_ingestion()
    await stop_correlation()
    await Database.close_db()
    logger.info("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="CyberIntel-X API",
    description="API for CyberIntel-X Security Operations Center Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r".*localhost.*|.*127\.0\.0\.1.*|.*0\.0\.0\.0.*",
)

# API routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "services": {
            "database": "connected" if Database.client else "disconnected",
            "ingestion": get_ingestion_status(),
            "correlation": get_correlation_status()
        }
    }

# Authentication endpoints
@app.post("/api/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token login, get an access token for future requests"""
    # TODO: Implement proper user authentication
    # This is a placeholder implementation
    if form_data.username != "admin" or form_data.password != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # In a real app, you would:
    # 1. Verify the username and password against your user database
    # 2. Generate a proper JWT token with an expiration time
    # 3. Return the token
    
    return {"access_token": "dummy_token", "token_type": "bearer", "refresh_token": "dummy_refresh"}

@app.post("/api/auth/refresh", response_model=Token)
async def refresh_access_token(payload: Dict[str, Any]):
    """Dummy refresh endpoint to issue a new access token from a refresh token"""
    # In production, verify payload.get("refresh_token") here
    return {"access_token": "dummy_token", "token_type": "bearer", "refresh_token": "dummy_refresh"}

@app.get("/api/auth/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    return {"username": "admin", "email": "admin@example.com", "roles": ["analyst"], "fullName": "Admin User"}

# WebSocket endpoint for real-time updates
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time threat updates"""
    # Check for authorization token in query parameters
    query_params = dict(websocket.query_params)
    token = query_params.get("token")
    
    # For now, we'll accept all connections (in production, validate the token)
    # You can implement proper token validation here
    # if not token or not validate_token(token):
    #     await websocket.close(code=1008, reason="Authentication failed")
    #     return
    
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Compatibility WebSocket endpoint for validation and clients expecting /ws/live
@app.websocket("/ws/live")
async def websocket_endpoint_live(websocket: WebSocket):
    # Reuse the same handler logic
    await websocket_endpoint(websocket)

# API endpoints for threats
@app.get("/api/threats", response_model=List[ThreatInDB])
async def get_threats(
    skip: int = 0,
    limit: int = 100,
    threat_type: Optional[ThreatType] = None,
    severity: Optional[Severity] = None,
    source: Optional[str] = None,
    db=Depends(get_database)
):
    """Get a list of threats with optional filtering"""
    query = {}
    if threat_type:
        query["type"] = threat_type.value
    if severity:
        query["severity"] = severity.value
    if source:
        query["source"] = source
    
    cursor = db["threats"].find(query).skip(skip).limit(limit)
    return [ThreatInDB(**doc) async for doc in cursor]

@app.get("/api/threats/{threat_id}", response_model=ThreatInDB)
async def get_threat(threat_id: str, db=Depends(get_database)):
    """Get a specific threat by ID"""
    threat = await db["threats"].find_one({"_id": threat_id})
    if threat is None:
        raise HTTPException(status_code=404, detail="Threat not found")
    return ThreatInDB(**threat)

# API endpoints for alerts (minimal stubs)
@app.get("/api/alerts")
async def get_alerts(
    page: int = 1,
    limit: int = 100,
    search: Optional[str] = None,
    severity: Optional[Severity] = None,
    status: Optional[str] = None,
    source: Optional[ThreatSource] = None,
    db=Depends(get_database)
):
    """Get a list of alerts with pagination and filtering"""
    skip = (page - 1) * limit
    query: Dict[str, Any] = {}
    
    # Handle search parameter
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"source": {"$regex": search, "$options": "i"}}
        ]
    
    if severity:
        query["severity"] = severity.value
    if status:
        query["status"] = status
    if source:
        query["source"] = source.value
        
    cursor = db["alerts"].find(query).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])  # ensure serializable
        results.append(Alert(**doc))
    
    # Get total count for pagination
    total_count = await db["alerts"].count_documents(query)
    
    return {"alerts": results, "totalCount": total_count}
    query: Dict[str, Any] = {}
    if severity:
        query["severity"] = severity.value
    if status:
        query["status"] = status
    if source:
        query["source"] = source.value
    cursor = db["alerts"].find(query).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])  # ensure serializable
        results.append(Alert(**doc))
    return results

@app.get("/api/alerts/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str, db=Depends(get_database)):
    alert = await db["alerts"].find_one({"_id": alert_id})
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    if "_id" in alert:
        alert["_id"] = str(alert["_id"])  # ensure serializable
    return Alert(**alert)

class StatusUpdate(BaseModel):
    status: str

@app.patch("/api/alerts/{alert_id}/status")
async def update_alert_status(alert_id: str, body: StatusUpdate, db=Depends(get_database)):
    result = await db["alerts"].update_one({"_id": alert_id}, {"$set": {"status": body.status, "updated_at": datetime.utcnow()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    updated = await db["alerts"].find_one({"_id": alert_id})
    if updated and "_id" in updated:
        updated["_id"] = str(updated["_id"])
    return updated or {"_id": alert_id, "status": body.status}

@app.get("/api/alerts/stats")
async def get_alert_stats(db=Depends(get_database)):
    pipeline = [
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    by_severity: Dict[str, int] = {s.value: 0 for s in Severity}
    async for row in db["alerts"].aggregate(pipeline):
        key = (row.get("_id") or "").lower()
        if key in by_severity:
            by_severity[key] = row.get("count", 0)
    pipeline2 = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    by_status: Dict[str, int] = {}
    async for row in db["alerts"].aggregate(pipeline2):
        by_status[str(row.get("_id"))] = row.get("count", 0)
    total = await db["alerts"].count_documents({})
    return {"total": total, "by_severity": by_severity, "by_status": by_status}

class AcknowledgeBody(BaseModel):
    alert_ids: List[str]

@app.post("/api/alerts/acknowledge")
async def acknowledge_alerts(body: AcknowledgeBody, db=Depends(get_database)):
    if not body.alert_ids:
        return {"updated_count": 0}
    result = await db["alerts"].update_many({"_id": {"$in": body.alert_ids}}, {"$set": {"status": "in_progress", "updated_at": datetime.utcnow()}})
    return {"updated_count": result.modified_count}

# Analytics endpoints
@app.get("/api/analytics/dashboard")
async def get_analytics_dashboard(db=Depends(get_database)):
    """Get analytics dashboard data"""
    # Get threat counts
    total_threats = await db["threats"].count_documents({})
    
    # Get alert counts
    active_alerts = await db["alerts"].count_documents({"status": {"$ne": "resolved"}})
    resolved_cases = await db["alerts"].count_documents({"status": "resolved"})
    
    # Get severity distribution
    severity_pipeline = [
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    severity_data = {}
    async for row in db["threats"].aggregate(severity_pipeline):
        severity_data[row["_id"]] = row["count"]
    
    return {
        "totalThreats": total_threats,
        "activeAlerts": active_alerts,
        "resolvedCases": resolved_cases,
        "detectionRate": "94%",
        "newThreatsToday": 12,
        "falsePositives": 3,
        "avgResponseTime": "2.3h",
        "systemUptime": "99.8%",
        "severityDistribution": severity_data
    }

# Reports endpoints
@app.get("/api/reports/templates")
async def get_report_templates():
    """Get available report templates"""
    templates = [
        {
            "id": "security-posture",
            "title": "Security Posture Report",
            "description": "Comprehensive overview of your organization's security posture including vulnerabilities, threats, and compliance status.",
            "category": "Security",
            "frequency": "Weekly",
            "lastGenerated": "2024-01-15",
            "parameters": [
                {"name": "dateRange", "label": "Date Range", "type": "select", "options": ["Last 7 days", "Last 30 days", "Last 90 days"]},
                {"name": "severityLevel", "label": "Severity Level", "type": "select", "options": ["All", "Critical", "High", "Medium"]}
            ]
        },
        {
            "id": "threat-intelligence",
            "title": "Threat Intelligence Report",
            "description": "Detailed analysis of current threat landscape, emerging threats, and threat actor activities.",
            "category": "Threats",
            "frequency": "Daily",
            "lastGenerated": "2024-01-16",
            "parameters": [
                {"name": "threatTypes", "label": "Threat Types", "type": "multiselect", "options": ["Malware", "Phishing", "Ransomware", "DDoS"]},
                {"name": "geographicScope", "label": "Geographic Scope", "type": "select", "options": ["Global", "Regional", "National"]}
            ]
        },
        {
            "id": "incident-response",
            "title": "Incident Response Report",
            "description": "Summary of security incidents, response times, resolution metrics, and lessons learned.",
            "category": "Incidents",
            "frequency": "Monthly",
            "lastGenerated": "2023-12-31",
            "parameters": [
                {"name": "month", "label": "Month", "type": "date"},
                {"name": "incidentType", "label": "Incident Type", "type": "select", "options": ["All", "Security Breach", "Malware", "Unauthorized Access"]}
            ]
        },
        {
            "id": "compliance-audit",
            "title": "Compliance Audit Report",
            "description": "Audit findings, compliance status against industry standards, and recommendations for improvement.",
            "category": "Compliance",
            "frequency": "Quarterly",
            "lastGenerated": "2023-10-15",
            "parameters": [
                {"name": "standards", "label": "Standards", "type": "multiselect", "options": ["ISO 27001", "NIST", "GDPR", "PCI DSS"]},
                {"name": "auditPeriod", "label": "Audit Period", "type": "select", "options": ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024"]}
            ]
        }
    ]
    
    return {"templates": templates}

@app.post("/api/reports/generate/{template_id}")
async def generate_report(template_id: str, params: Dict[str, Any] = None):
    """Generate a report from a template.

    For now this creates a logical report identifier and returns
    a URL that can be used to download a dynamically generated PDF.
    """
    ts = int(datetime.now().timestamp())
    report_id = f"report_{template_id}_{ts}"
    return {
        "reportId": report_id,
        "templateId": template_id,
        "status": "completed",
        "generatedAt": datetime.now().isoformat(),
        # Used by the frontend when following the download link directly
        "downloadUrl": f"/api/reports/{report_id}/download?format=pdf",
    }


@app.get("/api/reports/{report_id}/download")
async def download_report(report_id: str, format: str = "pdf"):
    """Download a generated report as a PDF.

    This endpoint returns a simple, dynamically generated PDF so that
    the frontend can successfully download and open reports.
    """
    if format.lower() != "pdf":
        raise HTTPException(status_code=400, detail="Only PDF format is supported.")

    # Generate a very simple static PDF manually so we don't depend on
    # external libraries that may not be installable in all environments.
    # Most PDF viewers will happily render this minimal document.
    pdf_template = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT /F1 24 Tf 100 700 Td (CyberIntel-X Report) Tj 0 -40 Td (ID: {report_id}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000114 00000 n 
0000000214 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
320
%%EOF
"""
    pdf_bytes = pdf_template.encode("latin-1", "ignore")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{report_id}.pdf"'
        },
    )


@app.get("/api/reports/download/{filename}")
async def download_report_legacy(filename: str):
    """Compatibility endpoint for URLs like /api/reports/download/report_...pdf.

    The frontend previously used this pattern, so we accept it and delegate
    to the main download_report handler.
    """
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=404, detail="Report not found")

    # Strip the .pdf extension to recover the report_id
    report_id = filename[:-4]
    return await download_report(report_id, format="pdf")

# API endpoints for correlations
@app.get("/api/correlations", response_model=List[Dict[str, Any]])
async def get_correlations(
    skip: int = 0,
    limit: int = 100,
    correlation_type: Optional[str] = None,
    min_confidence: float = 0.7,
    db=Depends(get_database)
):
    """Get a list of correlations"""
    query = {"confidence": {"$gte": min_confidence}}
    if correlation_type:
        query["type"] = correlation_type
    
    cursor = db["correlations"].find(query).sort("last_seen", -1).skip(skip).limit(limit)
    return [doc async for doc in cursor]

# API endpoints for system management
@app.get("/api/system/status")
async def get_system_status():
    """Get the status of the system and services"""
    return {
        "ingestion": get_ingestion_status(),
        "correlation": get_correlation_status(),
        "database": {
            "connected": Database.client is not None,
            "database": settings.MONGODB_DB
        }
    }

@app.post("/api/system/ingestion/start")
async def start_ingestion_service():
    """Start the ingestion service"""
    if ingestion_manager.is_running:
        return {"status": "already_running"}
    
    asyncio.create_task(start_ingestion())
    return {"status": "started"}

@app.post("/api/system/ingestion/stop")
async def stop_ingestion_service():
    """Stop the ingestion service"""
    if not ingestion_manager.is_running:
        return {"status": "not_running"}
    
    await stop_ingestion()
    return {"status": "stopped"}

@app.post("/api/system/correlation/start")
async def start_correlation_service():
    """Start the correlation service"""
    if correlation_service.is_running:
        return {"status": "already_running"}
    
    asyncio.create_task(start_correlation())
    return {"status": "started"}

@app.post("/api/system/correlation/stop")
async def stop_correlation_service():
    """Stop the correlation service"""
    if not correlation_service.is_running:
        return {"status": "not_running"}
    
    await stop_correlation()
    return {"status": "stopped"}

# Webhook endpoint for receiving threat data
@app.post("/api/webhook/threat")
async def webhook_receive_threat(threat: ThreatIntel):
    """Webhook endpoint for receiving threat data from external sources"""
    # Save the threat to the database
    collection = Database.get_collection("threats")
    threat_doc = threat.dict()
    threat_doc["created_at"] = datetime.utcnow()
    threat_doc["updated_at"] = datetime.utcnow()
    
    result = await collection.insert_one(threat_doc)
    
    # Notify WebSocket clients
    await manager.broadcast(json.dumps({
        "type": "threat",
        "action": "created",
        "data": {"id": str(result.inserted_id), "value": threat.value, "type": threat.type}
    }))
    
    return {"status": "received", "id": str(result.inserted_id)}

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Main entry point
if __name__ == "__main__":
    # Run the FastAPI app with Uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        workers=settings.WORKERS
    )
