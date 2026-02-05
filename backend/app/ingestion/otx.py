import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import aiohttp
import json

from app.ingestion.base import BaseIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity
from app.database.db import Database
from app.app_logging import logger

class OTXIngestor(BaseIngestor):
    """Ingestor for AlienVault OTX (Open Threat Exchange) data"""
    
    def __init__(self, api_key: str, session: aiohttp.ClientSession = None):
        super().__init__(ThreatSource.OTX, session)
        self.base_url = "https://otx.alienvault.com/api/v1"
        self.api_key = api_key
        self.headers = {
            "X-OTX-API-KEY": self.api_key,
            "Accept": "application/json"
        }
        self.last_run: Optional[datetime] = None
    
    @property
    def name(self) -> str:
        return "OTX Ingestor"
    
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch threat intelligence from OTX"""
        try:
            # Get pulses from subscribed users
            pulses = []
            page = 1
            
            while True:
                params = {
                    "page": page,
                    "limit": 50,  # Max allowed by OTX
                    "sort": "-modified"
                }
                
                # If this is a subsequent run, only get new pulses
                if self.last_run:
                    params["modified_since"] = self.last_run.isoformat()
                
                async with self.session.get(
                    f"{self.base_url}/pulses/subscribed",
                    params=params,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error fetching OTX data: {response.status} - {error_text}")
                        break
                    
                    data = await response.json()
                    if not data.get("results"):
                        break
                    
                    pulses.extend(data["results"])
                    
                    # Check if we've reached the last page
                    if not data.get("next"):
                        break
                    
                    page += 1
            
            return pulses
            
        except Exception as e:
            logger.error(f"Error in OTX fetch: {e}", exc_info=True)
            return []
    
    def _map_indicator_type(self, indicator_type: str) -> Optional[ThreatType]:
        """Map OTX indicator type to ThreatType"""
        mapping = {
            "IPv4": ThreatType.IP,
            "IPv6": ThreatType.IP,
            "domain": ThreatType.DOMAIN,
            "hostname": ThreatType.DOMAIN,
            "email": ThreatType.EMAIL,
            "URL": ThreatType.URL,
            "URI": ThreatType.URL,
            "FileHash-MD5": ThreatType.HASH,
            "FileHash-SHA1": ThreatType.HASH,
            "FileHash-SHA256": ThreatType.HASH,
            "FileHash-SHA512": ThreatType.HASH,
            "FileHash-SSDEEP": ThreatType.HASH,
            "CVE": ThreatType.CVE,
            "YARA": "yara",
            "MUTEX": "mutex",
            "CIDR": "cidr",
            "file-path": "file_path",
            "file-name": "file_name",
            "hostname|port": "hostname_port",
            "email-subject": "email_subject"
        }
        return mapping.get(indicator_type)
    
    def _calculate_severity(self, pulse: Dict[str, Any]) -> Severity:
        """Calculate severity based on OTX pulse data"""
        # Use the highest severity from the pulse
        severity_map = {
            "high": Severity.HIGH,
            "medium": Severity.MEDIUM,
            "low": Severity.LOW,
            "info": Severity.INFO
        }
        
        # Check pulse severity
        pulse_severity = pulse.get("tlp", "").lower()
        if pulse_severity in severity_map:
            return severity_map[pulse_severity]
        
        # If no severity, use the number of indicators as a proxy
        indicators = len(pulse.get("indicators", []))
        if indicators > 100:
            return Severity.HIGH
        elif indicators > 50:
            return Severity.MEDIUM
        elif indicators > 10:
            return Severity.LOW
        
        return Severity.INFO
    
    def _extract_mitre_attack(self, pulse: Dict[str, Any]) -> List[str]:
        """Extract MITRE ATT&CK techniques from pulse"""
        mitre_attack = set()
        
        # Check for MITRE tags
        for tag in pulse.get("tags", []):
            if tag.lower().startswith("attack."):
                mitre_attack.add(tag.upper())
        
        # Check for MITRE in references
        for ref in pulse.get("references", []):
            if "attack.mitre.org" in ref.lower():
                # Extract technique ID (e.g., T1190 from https://attack.mitre.org/techniques/T1190/)
                parts = ref.split('/')
                if len(parts) > 5 and parts[4] == 'techniques':
                    mitre_attack.add(parts[5].upper())
        
        return list(mitre_attack)
    
    def _extract_indicators(self, pulse: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract and normalize indicators from a pulse"""
        indicators = []
        
        for indicator in pulse.get("indicators", []):
            indicator_type = self._map_indicator_type(indicator.get("type", ""))
            if not indicator_type:
                continue
                
            indicators.append({
                "type": indicator_type,
                "value": indicator.get("indicator", ""),
                "created": indicator.get("created"),
                "content": indicator.get("content"),
                "title": indicator.get("title"),
                "description": indicator.get("description"),
                "category": indicator.get("category"),
                "tags": indicator.get("tags", [])
            })
        
        return indicators
    
    async def parse(self, pulse: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse OTX pulse data into ThreatIntel objects"""
        try:
            threats = []
            pulse_id = pulse.get("id", "")
            pulse_name = pulse.get("name", "")
            pulse_description = pulse.get("description", "")
            pulse_author = pulse.get("author_name", "")
            pulse_created = pulse.get("created", "")
            pulse_modified = pulse.get("modified", "")
            
            # Calculate severity
            severity = self._calculate_severity(pulse)
            
            # Extract MITRE ATT&CK techniques
            mitre_attack = self._extract_mitre_attack(pulse)
            
            # Extract and process indicators
            indicators = self._extract_indicators(pulse)
            
            for indicator in indicators:
                # Skip if we can't determine the type
                if not indicator["type"]:
                    continue
                
                # Create enrichment data
                enrichment = {
                    "pulse_id": pulse_id,
                    "pulse_name": pulse_name,
                    "pulse_author": pulse_author,
                    "pulse_description": pulse_description,
                    "pulse_tags": pulse.get("tags", []),
                    "pulse_references": pulse.get("references", []),
                    "indicator_created": indicator["created"],
                    "indicator_content": indicator["content"],
                    "indicator_title": indicator["title"],
                    "indicator_description": indicator["description"],
                    "indicator_category": indicator["category"],
                    "indicator_tags": indicator["tags"]
                }
                
                # Create the threat object
                threat = ThreatIntel(
                    type=indicator["type"],
                    value=indicator["value"],
                    first_seen=datetime.strptime(pulse_created, "%Y-%m-%dT%H:%M:%S.%f") if pulse_created else datetime.utcnow(),
                    last_seen=datetime.strptime(pulse_modified, "%Y-%m-%dT%H:%M:%S.%f") if pulse_modified else datetime.utcnow(),
                    severity=severity,
                    source=self.source,
                    confidence=0.8,  # High confidence for OTX data
                    tags=pulse.get("tags", []) + indicator.get("tags", []),
                    metadata={
                        "pulse_id": pulse_id,
                        "pulse_name": pulse_name,
                        "pulse_author": pulse_author,
                        "indicator_type": indicator["type"],
                        "indicator_category": indicator.get("category", ""),
                        "created": pulse_created,
                        "modified": pulse_modified
                    },
                    enrichment=enrichment,
                    mitre_attack=mitre_attack
                )
                
                threats.append(threat)
            
            return threats
            
        except Exception as e:
            logger.error(f"Error parsing OTX pulse {pulse.get('id', 'unknown')}: {e}", exc_info=True)
            return []

# Example usage:
# async with OTXIngestor(api_key="your-api-key") as ingestor:
#     await ingestor.run()
