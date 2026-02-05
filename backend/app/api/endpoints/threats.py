from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId

from app.database.db import get_db
from app.database.models import ThreatIntel, ThreatInDB, GeoLocation
from app.auth.auth import get_current_active_user
from app.services.geolocation import get_geolocation

router = APIRouter()

class ThreatCreate(ThreatIntel):
    pass

class ThreatUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    source: Optional[str] = None
    affected_assets: Optional[int] = None
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None
    remediation: Optional[str] = None
    tags: Optional[List[str]] = None
    geo: Optional[dict] = None

@router.post("/threats/", response_model=ThreatInDB)
async def create_threat(threat: ThreatCreate, db=Depends(get_db), current_user=Depends(get_current_active_user)):
    """Create a new threat with geolocation data"""
    # If IP address is provided in IOCs, try to get geolocation
    if not threat.geo and 'ip_addresses' in threat.iocs and threat.iocs['ip_addresses']:
        ip_address = threat.iocs['ip_addresses'][0]
        geo_data = await get_geolocation(ip_address)
        if geo_data:
            threat.geo = GeoLocation(**geo_data)
    
    threat_dict = threat.dict()
    threat_dict['created_at'] = datetime.utcnow()
    threat_dict['updated_at'] = datetime.utcnow()
    
    result = await db["threats"].insert_one(threat_dict)
    created_threat = await db["threats"].find_one({"_id": result.inserted_id})
    return created_threat

@router.get("/threats/", response_model=List[ThreatInDB])
async def read_threats(
    skip: int = 0,
    limit: int = 100,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    has_geo: bool = None,
    db=Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get list of threats with optional filtering"""
    query = {}
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    if has_geo is not None:
        query["geo"] = {"$ne": None}
    
    threats = await db["threats"].find(query).skip(skip).limit(limit).to_list(limit)
    return threats

@router.get("/threats/geojson")
async def get_threats_geojson(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    db=Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get threats in GeoJSON format for mapping"""
    query = {"geo": {"$ne": None}}
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    
    features = []
    async for threat in db["threats"].find(query):
        if threat.get("geo") and threat["geo"].get("longitude") is not None and threat["geo"].get("latitude") is not None:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [threat["geo"]["longitude"], threat["geo"]["latitude"]]
                },
                "properties": {
                    "id": str(threat["_id"]),
                    "title": threat.get("title", ""),
                    "severity": threat.get("severity"),
                    "type": threat.get("type"),
                    "description": threat.get("description", "")[:100] + "..." if threat.get("description") else "",
                    "country": threat.get("geo", {}).get("country"),
                    "city": threat.get("geo", {}).get("city"),
                }
            }
            features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/threats/{threat_id}", response_model=ThreatInDB)
async def read_threat(threat_id: str, db=Depends(get_db), current_user=Depends(get_current_active_user)):
    """Get a specific threat by ID"""
    if (threat := await db["threats"].find_one({"_id": ObjectId(threat_id)})) is not None:
        return threat
    raise HTTPException(status_code=404, detail=f"Threat {threat_id} not found")

@router.put("/threats/{threat_id}", response_model=ThreatInDB)
async def update_threat(
    threat_id: str,
    threat_update: ThreatUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update a threat"""
    update_data = {k: v for k, v in threat_update.dict().items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        result = await db["threats"].update_one(
            {"_id": ObjectId(threat_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 1:
            if (updated_threat := await db["threats"].find_one({"_id": ObjectId(threat_id)})) is not None:
                return updated_threat
    
    if (existing_threat := await db["threats"].find_one({"_id": ObjectId(threat_id)})) is not None:
        return existing_threat
    
    raise HTTPException(status_code=404, detail=f"Threat {threat_id} not found")

@router.delete("/threats/{threat_id}")
async def delete_threat(threat_id: str, db=Depends(get_db), current_user=Depends(get_current_active_user)):
    """Delete a threat"""
    delete_result = await db["threats"].delete_one({"_id": ObjectId(threat_id)})
    
    if delete_result.deleted_count == 1:
        return {"message": f"Threat {threat_id} deleted successfully"}
    
    raise HTTPException(status_code=404, detail=f"Threat {threat_id} not found")
