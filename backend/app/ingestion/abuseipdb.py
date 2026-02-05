import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
import aiohttp
import json

from app.ingestion.base import BaseIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity, GeoLocation
from app.database.db import Database
from app.app_logging import logger

class AbuseIPDBIngestor(BaseIngestor):
    """Ingestor for AbuseIPDB threat intelligence"""
    
    def __init__(self, api_key: str, session: aiohttp.ClientSession = None):
        super().__init__(ThreatSource.ABUSEIPDB, session)
        self.base_url = "https://api.abuseipdb.com/api/v2"
        self.api_key = api_key
        self.headers = {
            "Key": self.api_key,
            "Accept": "application/json"
        }
        self.last_run: Optional[datetime] = None
        self.categories = self._load_categories()
    
    @property
    def name(self) -> str:
        return "AbuseIPDB Ingestor"
    
    def _load_categories(self) -> Dict[int, str]:
        """Load AbuseIPDB categories"""
        return {
            1: "DNS Compromise",
            2: "DNS Poisoning",
            3: "Fraud Orders",
            4: "DDoS Attack",
            5: "FTP Brute-Force",
            6: "Ping of Death",
            7: "Phishing",
            8: "Fraud VoIP",
            9: "Open Proxy",
            10: "Web Spam",
            11: "Email Spam",
            12: "Blog Spam",
            13: "VPN IP",
            14: "Port Scan",
            15: "Hacking",
            16: "SQL Injection",
            17: "Spoofing",
            18: "Brute Force",
            19: "Bad Web Bot",
            20: "Exploited Host",
            21: "Web App Attack",
            22: "SSH",
            23: "IoT Targeted"
        }
    
    def _get_category_names(self, category_ids: List[int]) -> List[str]:
        """Get category names from IDs"""
        return [self.categories.get(cid, f"Unknown ({cid})") for cid in category_ids]
    
    def _calculate_severity(self, abuse_confidence_score: int, total_reports: int) -> Severity:
        """Calculate severity based on abuse confidence score and total reports"""
        if abuse_confidence_score >= 90 or total_reports > 100:
            return Severity.CRITICAL
        elif abuse_confidence_score >= 70 or total_reports > 50:
            return Severity.HIGH
        elif abuse_confidence_score >= 40 or total_reports > 10:
            return Severity.MEDIUM
        return Severity.LOW
    
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch threat intelligence from AbuseIPDB"""
        try:
            # Calculate time range (last 7 days by default)
            end_date = datetime.utcnow()
            start_date = (end_date - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S%z")
            
            params = {
                "maxAgeInDays": "90",
                "perPage": "1000",  # Max allowed by API
                "confidenceMinimum": "25",  # Only get reports with at least 25% confidence
            }
            
            # If this is a subsequent run, only get new reports
            if self.last_run:
                params["start"] = self.last_run.strftime("%Y-%m-%dT%H:%M:%S%z")
            
            all_reports = []
            page = 1
            
            while True:
                params["page"] = str(page)
                
                async with self.session.get(
                    f"{self.base_url}/blacklist",
                    params=params,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error fetching AbuseIPDB data: {response.status} - {error_text}")
                        break
                    
                    data = await response.json()
                    reports = data.get("data", [])
                    
                    if not reports:
                        break
                    
                    all_reports.extend(reports)
                    
                    # Check if we've reached the last page
                    if len(reports) < int(params["perPage"]):
                        break
                    
                    page += 1
                    
                    # Respect rate limiting (1000 requests per day, ~41 per hour)
                    await asyncio.sleep(1)
            
            return all_reports
            
        except Exception as e:
            logger.error(f"Error in AbuseIPDB fetch: {e}", exc_info=True)
            return []
    
    async def _enrich_ip(self, ip_address: str) -> Dict[str, Any]:
        """Enrich IP with additional data from AbuseIPDB"""
        try:
            params = {
                "ipAddress": ip_address,
                "maxAgeInDays": "90",
                "verbose": ""  # Include additional data
            }
            
            async with self.session.get(
                f"{self.base_url}/check",
                params=params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    return {}
                
                data = await response.json()
                return data.get("data", {})
                
        except Exception as e:
            logger.error(f"Error enriching IP {ip_address}: {e}")
            return {}
    
    async def parse(self, report: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse AbuseIPDB report into ThreatIntel objects"""
        try:
            ip_address = report.get("ipAddress")
            if not ip_address:
                return []
            
            # Get additional IP details
            ip_details = await self._enrich_ip(ip_address)
            
            # Extract report details
            abuse_confidence_score = report.get("abuseConfidenceScore", 0)
            total_reports = report.get("totalReports", 0)
            last_reported = report.get("lastReportedAt")
            
            # Parse categories
            categories = report.get("reports", [{}])[0].get("categories", [])
            category_names = self._get_category_names(categories)
            
            # Calculate severity
            severity = self._calculate_severity(abuse_confidence_score, total_reports)
            
            # Create GeoLocation
            geo = None
            if "countryCode" in ip_details:
                geo = GeoLocation(
                    country=ip_details.get("countryName"),
                    country_code=ip_details.get("countryCode"),
                    region=ip_details.get("region"),
                    city=ip_details.get("city"),
                    latitude=ip_details.get("latitude"),
                    longitude=ip_details.get("longitude"),
                    isp=ip_details.get("isp"),
                    org=ip_details.get("organization")
                )
            
            # Create enrichment data
            enrichment = {
                "abuse_confidence_score": abuse_confidence_score,
                "total_reports": total_reports,
                "last_reported": last_reported,
                "categories": category_names,
                "domain": ip_details.get("domain"),
                "is_whitelisted": ip_details.get("isWhitelisted", False),
                "is_tor": ip_details.get("isTor", False),
                "usage_type": ip_details.get("usageType"),
                "hostnames": ip_details.get("hostnames", []),
                "recent_reports": []
            }
            
            # Add recent reports
            for report in ip_details.get("reports", [])[:5]:  # Limit to 5 most recent
                enrichment["recent_reports"].append({
                    "reported_at": report.get("reportedAt"),
                    "categories": self._get_category_names(report.get("categories", [])),
                    "comment": report.get("comment"),
                    "reporter_id": report.get("reporterId"),
                    "reporter_country_code": report.get("reporterCountryCode"),
                    "reporter_country_name": report.get("reporterCountryName")
                })
            
            # Create MITRE ATT&CK mapping based on categories
            mitre_attack = self._map_to_mitre(categories)
            
            # Create the threat object
            threat = ThreatIntel(
                type=ThreatType.IP,
                value=ip_address,
                first_seen=datetime.strptime(report.get("firstSeenAt", ""), "%Y-%m-%dT%H:%M:%S+00:00") if report.get("firstSeenAt") else datetime.utcnow(),
                last_seen=datetime.strptime(last_reported, "%Y-%m-%dT%H:%M:%S+00:00") if last_reported else datetime.utcnow(),
                severity=severity,
                source=self.source,
                confidence=min(abuse_confidence_score / 100, 0.9),  # Convert to 0-0.9 range
                tags=[f"abuseipdb:cat:{cat}" for cat in category_names] + [f"abuseipdb:score:{abuse_confidence_score}"],
                metadata={
                    "abuse_confidence_score": abuse_confidence_score,
                    "total_reports": total_reports,
                    "last_reported": last_reported,
                    "categories": category_names,
                    "is_whitelisted": ip_details.get("isWhitelisted", False),
                    "is_tor": ip_details.get("isTor", False)
                },
                enrichment=enrichment,
                mitre_attack=mitre_attack,
                geo=geo
            )
            
            return [threat]
            
        except Exception as e:
            logger.error(f"Error parsing AbuseIPDB report for {report.get('ipAddress', 'unknown')}: {e}", exc_info=True)
            return []
    
    def _map_to_mitre(self, categories: List[int]) -> List[str]:
        """Map AbuseIPDB categories to MITRE ATT&CK techniques"""
        mitre_techniques = set()
        
        # Simple mapping of category IDs to MITRE techniques
        category_to_mitre = {
            1: ["T1564", "T1071"],  # DNS Compromise - Hide Artifacts, Application Layer Protocol
            2: ["T1564", "T1071"],  # DNS Poisoning - Hide Artifacts, Application Layer Protocol
            3: ["T1588"],  # Fraud Orders - Obtain Capabilities
            4: ["T1498"],  # DDoS Attack - Network Denial of Service
            5: ["T1110"],  # FTP Brute-Force - Brute Force
            6: ["T1499"],  # Ping of Death - Endpoint Denial of Service
            7: ["T1566"],  # Phishing - Phishing
            8: ["T1588"],  # Fraud VoIP - Obtain Capabilities
            9: ["T1090"],  # Open Proxy - Proxy
            10: ["T1071"],  # Web Spam - Application Layer Protocol
            11: ["T1048"],  # Email Spam - Exfiltration Over Alternative Protocol
            12: ["T1071"],  # Blog Spam - Application Layer Protocol
            13: ["T1090"],  # VPN IP - Proxy
            14: ["T1046"],  # Port Scan - Network Service Scanning
            15: ["T1190"],  # Hacking - Exploit Public-Facing Application
            16: ["T1190"],  # SQL Injection - Exploit Public-Facing Application
            17: ["T1090"],  # Spoofing - Proxy
            18: ["T1110"],  # Brute Force - Brute Force
            19: ["T1071"],  # Bad Web Bot - Application Layer Protocol
            20: ["T1190"],  # Exploited Host - Exploit Public-Facing Application
            21: ["T1190"],  # Web App Attack - Exploit Public-Facing Application
            22: ["T1110"],  # SSH - Brute Force
            23: ["T1190"]   # IoT Targeted - Exploit Public-Facing Application
        }
        
        for cat in categories:
            if cat in category_to_mitre:
                mitre_techniques.update(category_to_mitre[cat])
        
        return list(mitre_techniques)

# Example usage:
# async with AbuseIPDBIngestor(api_key="your-api-key") as ingestor:
#     await ingestor.run()
