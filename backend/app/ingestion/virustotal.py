import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
import aiohttp
import json

from app.ingestion.base import BaseIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity
from app.database.db import Database
from app.app_logging import logger

class VirusTotalIngestor(BaseIngestor):
    """Ingestor for VirusTotal threat intelligence"""
    
    def __init__(self, api_key: str, session: aiohttp.ClientSession = None):
        super().__init__(ThreatSource.VIRUSTOTAL, session)
        self.base_url = "https://www.virustotal.com/api/v3"
        self.api_key = api_key
        self.headers = {
            "x-apikey": self.api_key,
            "Accept": "application/json"
        }
        self.last_run: Optional[datetime] = None
    
    @property
    def name(self) -> str:
        return "VirusTotal Ingestor"
    
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch threat intelligence from VirusTotal"""
        try:
            # Get the latest threat intelligence
            params = {
                "limit": 100,  # Maximum allowed by VT
                "filter": "type:file,url,ip_address,domain"
            }
            
            # If this is a subsequent run, only get new items
            if self.last_run:
                params["filter"] += f" last_submission_date:{int(self.last_run.timestamp())}+ "
            
            threats = []
            async with self.session.get(
                f"{self.base_url}/intelligence/search",
                params=params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=300)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error fetching VirusTotal data: {response.status} - {error_text}")
                    return []
                
                data = await response.json()
                threats = data.get("data", [])
            
            return threats
            
        except Exception as e:
            logger.error(f"Error in VirusTotal fetch: {e}", exc_info=True)
            return []
    
    def _determine_type(self, item: Dict[str, Any]) -> Optional[ThreatType]:
        """Determine the threat type from VirusTotal data"""
        item_type = item.get("type")
        if item_type == "file":
            return ThreatType.HASH
        elif item_type == "url":
            return ThreatType.URL
        elif item_type == "ip_address":
            return ThreatType.IP
        elif item_type == "domain":
            return ThreatType.DOMAIN
        return None
    
    def _calculate_severity(self, stats: Dict[str, int]) -> Severity:
        """Calculate severity based on detection stats"""
        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        total = stats.get("undetected", 0) + malicious + suspicious
        
        if total == 0:
            return Severity.INFO
            
        malicious_ratio = (malicious + suspicious * 0.5) / total
        
        if malicious_ratio > 0.7:
            return Severity.CRITICAL
        elif malicious_ratio > 0.4:
            return Severity.HIGH
        elif malicious_ratio > 0.1:
            return Severity.MEDIUM
        return Severity.LOW
    
    async def _enrich_threat(self, threat: ThreatIntel) -> ThreatIntel:
        """Enrich threat with additional data from VirusTotal"""
        try:
            endpoint = ""
            if threat.type == ThreatType.HASH:
                endpoint = f"files/{threat.value}"
            elif threat.type == ThreatType.URL:
                endpoint = f"urls/{threat.value}"
            elif threat.type == ThreatType.IP:
                endpoint = f"ip_addresses/{threat.value}"
            elif threat.type == ThreatType.DOMAIN:
                endpoint = f"domains/{threat.value}"
            
            if not endpoint:
                return threat
            
            async with self.session.get(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    return threat
                
                data = await response.json()
                attributes = data.get("data", {}).get("attributes", {})
                
                # Update enrichment data
                enrichment = threat.enrichment or {}
                enrichment["last_analysis_stats"] = attributes.get("last_analysis_stats", {})
                enrichment["reputation"] = attributes.get("reputation", 0)
                
                # Add tags based on detections
                tags = set(threat.tags or [])
                if "last_analysis_results" in attributes:
                    for result in attributes["last_analysis_results"].values():
                        if result.get("category") == "malicious" and "result" in result:
                            tags.add(f"vt:{result['result']}")
                
                # Add MITRE ATT&CK techniques if available
                mitre_attack = set(threat.mitre_attack or [])
                if "crowdsourced_yara_results" in attributes:
                    for yara in attributes["crowdsourced_yara_results"]:
                        if "meta" in yara and "mitre_attack" in yara["meta"]:
                            mitre_attack.update(yara["meta"]["mitre_attack"].split(","))
                
                # Update the threat with enriched data
                threat.enrichment = enrichment
                threat.tags = list(tags)
                threat.mitre_attack = list(mitre_attack)
                
                return threat
                
        except Exception as e:
            logger.error(f"Error enriching threat {threat.value}: {e}")
            return threat
    
    async def parse(self, data: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse VirusTotal data into ThreatIntel objects"""
        try:
            item_type = self._determine_type(data)
            if not item_type:
                return []
            
            # Get basic threat information
            value = data.get("id", "")
            if not value:
                return []
            
            # Get timestamps
            last_analysis = data.get("attributes", {}).get("last_analysis_date", 0)
            first_seen = data.get("attributes", {}).get("first_seen", 0)
            
            # Calculate severity from detection stats
            stats = data.get("attributes", {}).get("last_analysis_stats", {})
            severity = self._calculate_severity(stats)
            
            # Create the threat object
            threat = ThreatIntel(
                type=item_type,
                value=value,
                first_seen=datetime.fromtimestamp(first_seen) if first_seen else datetime.utcnow(),
                last_seen=datetime.fromtimestamp(last_analysis) if last_analysis else datetime.utcnow(),
                severity=severity,
                source=self.source,
                confidence=0.8,  # High confidence for VT data
                tags=[f"vt:{k.lower()}:{v}" for k, v in stats.items()],
                metadata={
                    "last_analysis": last_analysis,
                    "first_seen": first_seen,
                    "type": data.get("type", ""),
                    "reputation": data.get("attributes", {}).get("reputation", 0)
                }
            )
            
            # Enrich with additional data
            threat = await self._enrich_threat(threat)
            
            return [threat]
            
        except Exception as e:
            logger.error(f"Error parsing VirusTotal data: {e}", exc_info=True)
            return []

# Example usage:
# async with VirusTotalIngestor(api_key="your-api-key") as ingestor:
#     await ingestor.run()
