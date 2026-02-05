import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import aiohttp

from app.ingestion.base import BaseIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity
from app.database.db import Database
from app.app_logging import logger

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
            description = data["cve"]["description"]["description_data"][0]["value"].lower()
            if "remote code execution" in description:
                mitre_attack.append("T1190")  # Exploit Public-Facing Application
            if "privilege escalation" in description:
                mitre_attack.append("T1068")  # Exploitation for Privilege Escalation
            if "denial of service" in description or "dos" in description:
                mitre_attack.append("T1499")  # Endpoint Denial of Service
            
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
