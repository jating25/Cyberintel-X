from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import asyncio
import aiohttp
from datetime import datetime, timedelta
import json

from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity
from app.database.db import Database
from app.app_logging import logger

class BaseIngestor(ABC):
    """Base class for all threat intel ingestors"""
    
    def __init__(self, source: ThreatSource, session: aiohttp.ClientSession = None):
        self.source = source
        self.session = session or aiohttp.ClientSession()
        self.last_run: Optional[datetime] = None
        self.is_running = False
        self._shutdown = False
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of the ingestor"""
        pass
    
    @abstractmethod
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch data from the source"""
        pass
    
    @abstractmethod
    def parse(self, data: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse the fetched data into ThreatIntel objects"""
        pass
    
    async def process(self, threat: ThreatIntel) -> Optional[ThreatInDB]:
        """Process a single threat intel item"""
        try:
            # Check if threat already exists
            collection = Database.get_collection("threats")
            existing = await collection.find_one({"value": threat.value, "type": threat.type})
            
            if existing:
                # Update existing threat
                update_data = {
                    "$set": {
                        "last_seen": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
                
                # Update severity if higher
                if Severity[threat.severity.upper()].value > Severity[existing["severity"].upper()].value:
                    update_data["$set"]["severity"] = threat.severity
                
                # Update tags
                if threat.tags:
                    update_data["$addToSet"] = {"tags": {"$each": threat.tags}}
                
                # Update enrichment data if available
                if threat.enrichment:
                    update_data["$set"]["enrichment"] = threat.enrichment
                
                await collection.update_one(
                    {"_id": existing["_id"]},
                    update_data
                )
                return ThreatInDB(**existing)
            else:
                # Insert new threat
                threat_in_db = ThreatInDB(**threat.dict())
                await collection.insert_one(threat_in_db.dict(by_alias=True))
                return threat_in_db
                
        except Exception as e:
            logger.error(f"Error processing threat {threat.value}: {e}")
            return None
    
    async def run(self):
        """Run the ingestion process"""
        if self.is_running:
            logger.warning(f"{self.name} ingestion is already running")
            return
        
        self.is_running = True
        self._shutdown = False
        
        try:
            logger.info(f"Starting {self.name} ingestion")
            
            # Fetch data
            data = await self.fetch()
            if not data:
                logger.warning(f"No data received from {self.name}")
                return
            
            # Process each item
            threats = []
            for item in data:
                if self._shutdown:
                    logger.info(f"Shutting down {self.name} ingestion")
                    break
                    
                try:
                    parsed_threats = self.parse(item)
                    # Support both synchronous and async parse implementations
                    if asyncio.iscoroutine(parsed_threats):
                        parsed_threats = await parsed_threats
                    for threat in parsed_threats:
                        processed = await self.process(threat)
                        if processed:
                            threats.append(processed)
                except Exception as e:
                    logger.error(f"Error processing item from {self.name}: {e}", exc_info=True)
            
            self.last_run = datetime.utcnow()
            logger.info(f"Completed {self.name} ingestion. Processed {len(threats)} threats.")
            return threats
            
        except Exception as e:
            logger.error(f"Error in {self.name} ingestion: {e}", exc_info=True)
        finally:
            self.is_running = False
    
    async def start_periodic(self, interval: int = 3600):
        """Run the ingestion periodically"""
        while not self._shutdown:
            try:
                await self.run()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                logger.info(f"Periodic {self.name} ingestion cancelled")
                break
            except Exception as e:
                logger.error(f"Error in periodic {self.name} ingestion: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying on error
    
    async def stop(self):
        """Stop the ingestion process"""
        self._shutdown = True
        if self.is_running:
            logger.info(f"Stopping {self.name} ingestion...")
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
        if hasattr(self, 'session') and self.session:
            await self.session.close()

class NVDIngestor(BaseIngestor):
    """Ingestor for NVD (National Vulnerability Database) data"""
    
    def __init__(self, api_key: str = None, session: aiohttp.ClientSession = None):
        super().__init__(ThreatSource.NVD, session)
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/1.0"
        self.api_key = api_key
        self.headers = {"Content-Type": "application/json"}
        if self.api_key:
            self.headers["apiKey"] = self.api_key
    
    @property
    def name(self) -> str:
        return "NVD Ingestor"
    
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch CVEs from NVD"""
        try:
            # Calculate start and end dates (last 8 days)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=8)
            
            params = {
                "startIndex": 0,
                "resultsPerPage": 2000,
                "pubStartDate": start_date.strftime("%Y-%m-%dT%H:%M:%S.000"),
                "pubEndDate": end_date.strftime("%Y-%m-%dT%H:%M:%S.000")
            }
            
            all_vulnerabilities = []
            total_results = 1
            
            while params["startIndex"] < total_results and not self._shutdown:
                async with self.session.get(
                    f"{self.base_url}",
                    params=params,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error fetching NVD data: {response.status} - {error_text}")
                        break
                        
                    data = await response.json()
                    total_results = data.get("totalResults", 0)
                    vulnerabilities = data.get("result", {}).get("CVE_Items", [])
                    all_vulnerabilities.extend(vulnerabilities)
                    
                    # Update start index for pagination
                    params["startIndex"] += len(vulnerabilities)
                    
                    # Respect rate limiting (50 requests per 30 seconds)
                    if "rate-limit-remaining" in response.headers and int(response.headers["rate-limit-remaining"]) < 10:
                        await asyncio.sleep(30)
            
            return all_vulnerabilities
            
        except Exception as e:
            logger.error(f"Error in NVD fetch: {e}", exc_info=True)
            return []
    
    def parse(self, data: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse NVD CVE data into ThreatIntel objects"""
        try:
            cve_id = data["cve"]["CVE_data_meta"]["ID"]
            published = datetime.strptime(data["publishedDate"], "%Y-%m-%dT%H:%MZ")
            last_modified = datetime.strptime(data["lastModifiedDate"], "%Y-%m-%dT%H:%MZ")
            
            # Extract CVSS v3 base score if available
            cvss_v3 = data.get("impact", {}).get("baseMetricV3", {})
            cvss_score = cvss_v3.get("cvssV3", {}).get("baseScore", 0.0)
            
            # Map CVSS score to severity
            if cvss_score >= 9.0:
                severity = Severity.CRITICAL
            elif cvss_score >= 7.0:
                severity = Severity.HIGH
            elif cvss_score >= 4.0:
                severity = Severity.MEDIUM
            else:
                severity = Severity.LOW
            
            # Extract CWE IDs
            cwe_ids = []
            for problem_type in data["cve"]["problemtype"]["problemtype_data"][0]["description"]:
                if problem_type["value"].startswith("CWE-"):
                    cwe_ids.append(problem_type["value"])
            
            # Extract references
            references = []
            for ref in data["cve"]["references"]["reference_data"]:
                references.append({
                    "url": ref["url"],
                    "source": ref.get("refsource", ""),
                    "tags": ref.get("tags", [])
                })
            
            # Extract affected products
            affected_products = set()
            for node in data.get("configurations", {}).get("nodes", []):
                for cpe in node.get("cpe_match", []):
                    if cpe.get("vulnerable"):
                        affected_products.add(cpe["cpe23Uri"])
            
            # Create enrichment data
            enrichment = {
                "cvss_v3": cvss_v3.get("cvssV3"),
                "cvss_v2": data.get("impact", {}).get("baseMetricV2", {}).get("cvssV2"),
                "cwe_ids": cwe_ids,
                "references": references,
                "affected_products": list(affected_products),
                "description": data["cve"]["description"]["description_data"][0]["value"]
            }
            
            # Create MITRE ATT&CK mapping (simplified example)
            mitre_attack = []
            if "remote" in data["cve"]["description"]["description_data"][0]["value"].lower():
                mitre_attack.append("T1190")  # Example: Exploit Public-Facing Application
            
            # Create the threat intel object
            threat = ThreatIntel(
                type=ThreatType.CVE,
                value=cve_id,
                first_seen=published,
                last_seen=last_modified,
                severity=severity,
                source=self.source,
                confidence=0.9,  # High confidence for NVD data
                tags=[f"cvss:{cvss_score:.1f}"] + [f"cwe:{cwe}" for cwe in cwe_ids],
                metadata={
                    "published": published.isoformat(),
                    "last_modified": last_modified.isoformat(),
                    "cvss_score": cvss_score
                },
                enrichment=enrichment,
                mitre_attack=mitre_attack
            )
            
            return [threat]
            
        except Exception as e:
            logger.error(f"Error parsing NVD data: {e}", exc_info=True)
            return []

# Example usage:
# async with NVDIngestor(api_key="your-api-key") as ingestor:
#     await ingestor.run()
