import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any, Callable, Awaitable
from collections import defaultdict
import json
import logging

from app.database.models import ThreatIntel, ThreatInDB, ThreatType, Severity, GeoLocation
from app.database.db import Database
from app.app_logging import logger
from app.config import settings

class CorrelationService:
    """Service for correlating threat intelligence data"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.is_running = False
        self._shutdown = False
        self.correlation_interval = getattr(settings, "CORRELATION_INTERVAL", 300)  # 5 minutes by default
        self.min_confidence = getattr(settings, "MIN_CORRELATION_CONFIDENCE", 0.7)
        self.correlations = {}
        self.last_run = None
    
    async def initialize(self):
        """Initialize the correlation service"""
        # Note: We rely on the main app to manage database connections
        self.logger.info("Correlation service initialized")
    
    async def shutdown(self):
        """Shutdown the correlation service"""
        self._shutdown = True
        self.is_running = False
        # Note: We rely on the main app to manage database connections
        self.logger.info("Correlation service shut down")
    
    async def correlate_threats(self, time_window_hours: int = 24):
        """Correlate threats from the database"""
        try:
            start_time = datetime.utcnow() - timedelta(hours=time_window_hours)
            
            # Get all threats from the database within the time window
            collection = Database.get_collection("threats")
            cursor = collection.find({
                "last_seen": {"$gte": start_time}
            })
            
            threats = []
            async for doc in cursor:
                # Convert MongoDB document to ThreatIntel object
                threats.append(ThreatInDB(**doc))
            
            self.logger.info(f"Correlating {len(threats)} threats from the last {time_window_hours} hours")
            
            # Group threats by type
            threats_by_type = defaultdict(list)
            for threat in threats:
                threats_by_type[threat.type].append(threat)
            
            # Find correlations between different types of threats
            correlations = []
            
            # 1. Correlate IPs with CVEs (exploited vulnerabilities)
            if ThreatType.IP in threats_by_type and ThreatType.CVE in threats_by_type:
                ip_cve_correlations = await self._correlate_ips_with_cves(
                    threats_by_type[ThreatType.IP],
                    threats_by_type[ThreatType.CVE]
                )
                correlations.extend(ip_cve_correlations)
            
            # 2. Correlate hashes with domains/URLs (malware distribution)
            if ThreatType.HASH in threats_by_type and (ThreatType.DOMAIN in threats_by_type or ThreatType.URL in threats_by_type):
                hash_domain_correlations = await self._correlate_hashes_with_domains(
                    threats_by_type[ThreatType.HASH],
                    threats_by_type.get(ThreatType.DOMAIN, []) + threats_by_type.get(ThreatType.URL, [])
                )
                correlations.extend(hash_domain_correlations)
            
            # 3. Correlate IPs with domains (C2 infrastructure)
            if ThreatType.IP in threats_by_type and ThreatType.DOMAIN in threats_by_type:
                ip_domain_correlations = await self._correlate_ips_with_domains(
                    threats_by_type[ThreatType.IP],
                    threats_by_type[ThreatType.DOMAIN]
                )
                correlations.extend(ip_domain_correlations)
            
            # 4. Correlate threats by MITRE ATT&CK techniques
            mitre_correlations = await self._correlate_by_mitre_techniques(threats)
            correlations.extend(mitre_correlations)
            
            # 5. Correlate threats by geolocation
            geo_correlations = await self._correlate_by_geolocation(threats)
            correlations.extend(geo_correlations)
            
            # Save correlations to the database
            if correlations:
                await self._save_correlations(correlations)
            
            self.last_run = datetime.utcnow()
            self.logger.info(f"Found {len(correlations)} correlations")
            
            return correlations
            
        except Exception as e:
            self.logger.error(f"Error in correlation service: {e}", exc_info=True)
            return []
    
    async def _correlate_ips_with_cves(self, ip_threats: List[ThreatInDB], cve_threats: List[ThreatInDB]) -> List[Dict]:
        """Correlate IPs with CVEs based on exploitation attempts"""
        correlations = []
        
        for ip_threat in ip_threats:
            # Check if the IP has been associated with any CVEs in its metadata
            if not ip_threat.enrichment or "cves" not in ip_threat.enrichment:
                continue
                
            for cve_id in ip_threat.enrichment["cves"]:
                # Find the corresponding CVE threat
                cve_threat = next((c for c in cve_threats if c.value.upper() == cve_id.upper()), None)
                if not cve_threat:
                    continue
                
                # Calculate confidence based on the source and other factors
                confidence = self._calculate_confidence(ip_threat, cve_threat)
                
                if confidence >= self.min_confidence:
                    correlation = {
                        "type": "ip_cve_exploitation",
                        "description": f"IP {ip_threat.value} is associated with exploitation of {cve_id}",
                        "confidence": confidence,
                        "severity": self._calculate_combined_severity([ip_threat, cve_threat]),
                        "threats": [ip_threat.id, cve_threat.id],
                        "first_seen": min(ip_threat.first_seen, cve_threat.first_seen),
                        "last_seen": max(ip_threat.last_seen, cve_threat.last_seen),
                        "metadata": {
                            "ip": ip_threat.value,
                            "cve": cve_id,
                            "sources": list(set([ip_threat.source, cve_threat.source]))
                        }
                    }
                    correlations.append(correlation)
        
        return correlations
    
    async def _correlate_hashes_with_domains(self, hash_threats: List[ThreatInDB], domain_threats: List[ThreatInDB]) -> List[Dict]:
        """Correlate malware hashes with domains/URLs where they were seen"""
        correlations = []
        
        # Build a mapping of domains to their threats
        domain_map = {t.value.lower(): t for t in domain_threats}
        
        for hash_threat in hash_threats:
            if not hash_threat.enrichment:
                continue
                
            # Check for domains in the enrichment data
            domains = []
            
            # Check common fields where domains might be stored
            for field in ["domains", "hosts", "urls", "download_urls"]:
                if field in hash_threat.enrichment and hash_threat.enrichment[field]:
                    domains.extend(hash_threat.enrichment[field])
            
            # Also check metadata
            if "metadata" in hash_threat.enrichment:
                for field in ["domain", "host", "url"]:
                    if field in hash_threat.enrichment["metadata"] and hash_threat.enrichment["metadata"][field]:
                        domains.append(hash_threat.enrichment["metadata"][field])
            
            # Process each domain
            for domain in set(domains):
                domain_lower = domain.lower()
                domain_threat = domain_map.get(domain_lower)
                
                if not domain_threat:
                    # Create a new domain threat if it doesn't exist
                    domain_threat = ThreatIntel(
                        type=ThreatType.URL if "://" in domain_lower else ThreatType.DOMAIN,
                        value=domain,
                        first_seen=hash_threat.first_seen,
                        last_seen=hash_threat.last_seen,
                        severity=hash_threat.severity,
                        source=hash_threat.source,
                        confidence=hash_threat.confidence * 0.8,  # Slightly lower confidence for inferred domains
                        tags=["inferred", "malware_distribution"]
                    )
                    # Save the new domain threat
                    domain_threat = await self._save_threat(domain_threat)
                    domain_map[domain_lower] = domain_threat
                
                # Calculate confidence
                confidence = self._calculate_confidence(hash_threat, domain_threat)
                
                if confidence >= self.min_confidence:
                    correlation = {
                        "type": "malware_distribution",
                        "description": f"Malware {hash_threat.value} is distributed via {domain}",
                        "confidence": confidence,
                        "severity": self._calculate_combined_severity([hash_threat, domain_threat]),
                        "threats": [hash_threat.id, domain_threat.id],
                        "first_seen": min(hash_threat.first_seen, domain_threat.first_seen),
                        "last_seen": max(hash_threat.last_seen, domain_threat.last_seen),
                        "metadata": {
                            "hash": hash_threat.value,
                            "domain": domain,
                            "hash_type": hash_threat.enrichment.get("type", "unknown") if hash_threat.enrichment else "unknown",
                            "sources": list(set([hash_threat.source, domain_threat.source]))
                        }
                    }
                    correlations.append(correlation)
        
        return correlations
    
    async def _correlate_ips_with_domains(self, ip_threats: List[ThreatInDB], domain_threats: List[ThreatInDB]) -> List[Dict]:
        """Correlate IPs with domains (e.g., C2 infrastructure)"""
        correlations = []
        
        # Build a mapping of IPs to their threats
        ip_map = {t.value: t for t in ip_threats}
        
        for domain_threat in domain_threats:
            if not domain_threat.enrichment:
                continue
                
            # Check for IPs in the enrichment data
            ips = []
            
            # Check common fields where IPs might be stored
            for field in ["ips", "resolved_ips", "a_records"]:
                if field in domain_threat.enrichment and domain_threat.enrichment[field]:
                    ips.extend(domain_threat.enrichment[field])
            
            # Also check metadata
            if "metadata" in domain_threat.enrichment:
                for field in ["ip", "resolved_ip"]:
                    if field in domain_threat.enrichment["metadata"] and domain_threat.enrichment["metadata"][field]:
                        ips.append(domain_threat.enrichment["metadata"][field])
            
            # Process each IP
            for ip in set(ips):
                ip_threat = ip_map.get(ip)
                
                if not ip_threat:
                    # Create a new IP threat if it doesn't exist
                    ip_threat = ThreatIntel(
                        type=ThreatType.IP,
                        value=ip,
                        first_seen=domain_threat.first_seen,
                        last_seen=domain_threat.last_seen,
                        severity=domain_threat.severity,
                        source=domain_threat.source,
                        confidence=domain_threat.confidence * 0.8,  # Slightly lower confidence for inferred IPs
                        tags=["inferred", "infrastructure"]
                    )
                    # Save the new IP threat
                    ip_threat = await self._save_threat(ip_threat)
                    ip_map[ip] = ip_threat
                
                # Calculate confidence
                confidence = self._calculate_confidence(ip_threat, domain_threat)
                
                if confidence >= self.min_confidence:
                    correlation = {
                        "type": "ip_domain_association",
                        "description": f"Domain {domain_threat.value} resolves to {ip}",
                        "confidence": confidence,
                        "severity": self._calculate_combined_severity([ip_threat, domain_threat]),
                        "threats": [ip_threat.id, domain_threat.id],
                        "first_seen": min(ip_threat.first_seen, domain_threat.first_seen),
                        "last_seen": max(ip_threat.last_seen, domain_threat.last_seen),
                        "metadata": {
                            "ip": ip,
                            "domain": domain_threat.value,
                            "relationship": "resolves_to",
                            "sources": list(set([ip_threat.source, domain_threat.source]))
                        }
                    }
                    correlations.append(correlation)
        
        return correlations
    
    async def _correlate_by_mitre_techniques(self, threats: List[ThreatInDB]) -> List[Dict]:
        """Correlate threats by MITRE ATT&CK techniques"""
        correlations = []
        
        # Group threats by MITRE technique
        threats_by_technique = defaultdict(list)
        for threat in threats:
            if not threat.mitre_attack:
                continue
                
            for technique in threat.mitre_attack:
                threats_by_technique[technique].append(threat)
        
        # Create correlations for techniques with multiple associated threats
        for technique, technique_threats in threats_by_technique.items():
            if len(technique_threats) < 2:
                continue
                
            # Calculate combined confidence and severity
            confidence = sum(t.confidence for t in technique_threats) / len(technique_threats)
            severity = self._calculate_combined_severity(technique_threats)
            
            if confidence >= self.min_confidence:
                correlation = {
                    "type": "mitre_technique",
                    "description": f"{len(technique_threats)} threats associated with MITRE technique {technique}",
                    "confidence": confidence,
                    "severity": severity,
                    "threats": [t.id for t in technique_threats],
                    "first_seen": min(t.first_seen for t in technique_threats),
                    "last_seen": max(t.last_seen for t in technique_threats),
                    "metadata": {
                        "mitre_technique": technique,
                        "threat_count": len(technique_threats),
                        "sources": list(set(t.source for t in technique_threats))
                    }
                }
                correlations.append(correlation)
        
        return correlations
    
    async def _correlate_by_geolocation(self, threats: List[ThreatInDB]) -> List[Dict]:
        """Correlate threats by geolocation"""
        correlations = []
        
        # Group threats by country (using the GeoLocation.country field)
        threats_by_country = defaultdict(list)
        
        for threat in threats:
            # GeoLocation model uses `country`, not `country_code`
            country = getattr(threat.geo, "country", None) if threat.geo else None
            if not country:
                continue
                
            country_code = str(country).upper()
            threats_by_country[country_code].append(threat)
        
        # Create correlations for countries with multiple threats
        for country_code, country_threats in threats_by_country.items():
            if len(country_threats) < 2:
                continue
                
            # Group by city if available
            threats_by_city = defaultdict(list)
            for threat in country_threats:
                city = threat.geo.city if threat.geo and threat.geo.city else "Unknown"
                threats_by_city[city].append(threat)
            
            # Create correlations for each city
            for city, city_threats in threats_by_city.items():
                if len(city_threats) < 2:
                    continue
                    
                # Calculate combined confidence and severity
                confidence = sum(t.confidence for t in city_threats) / len(city_threats)
                severity = self._calculate_combined_severity(city_threats)
                
                if confidence >= self.min_confidence:
                    correlation = {
                        "type": "geographic",
                        "description": f"{len(city_threats)} threats associated with {city}, {country_code}",
                        "confidence": confidence,
                        "severity": severity,
                        "threats": [t.id for t in city_threats],
                        "first_seen": min(t.first_seen for t in city_threats),
                        "last_seen": max(t.last_seen for t in city_threats),
                        "metadata": {
                            "country": country_code,
                            "city": city,
                            "threat_count": len(city_threats),
                            "sources": list(set(t.source for t in city_threats))
                        }
                    }
                    correlations.append(correlation)
        
        return correlations
    
    def _calculate_confidence(self, *threats: ThreatInDB) -> float:
        """Calculate the confidence of a correlation between threats"""
        if not threats:
            return 0.0
            
        # Base confidence is the average of the individual confidences
        base_confidence = sum(t.confidence for t in threats) / len(threats)
        
        # Increase confidence if threats have similar timestamps
        time_diffs = []
        for i in range(len(threats)):
            for j in range(i + 1, len(threats)):
                time_diff = abs((threats[i].first_seen - threats[j].first_seen).total_seconds())
                time_diffs.append(time_diff)
        
        if time_diffs:
            avg_time_diff = sum(time_diffs) / len(time_diffs)
            # If average time difference is less than 1 hour, increase confidence
            if avg_time_diff < 3600:
                time_factor = 1.2
            # If average time difference is less than 1 day, slightly increase confidence
            elif avg_time_diff < 86400:
                time_factor = 1.1
            else:
                time_factor = 1.0
                
            base_confidence *= time_factor
        
        # Cap confidence at 1.0
        return min(1.0, base_confidence)
    
    def _calculate_combined_severity(self, threats: List[ThreatInDB]) -> str:
        """Calculate the combined severity of multiple threats"""
        if not threats:
            return "info"
            
        # Use the maximum severity
        severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}
        max_severity = max(threats, key=lambda t: severity_order.get(t.severity.lower(), 0))
        return max_severity.severity
    
    async def _save_correlations(self, correlations: List[Dict]):
        """Save correlations to the database"""
        if not correlations:
            return
            
        try:
            collection = Database.get_collection("correlations")
            
            for correlation in correlations:
                # Check if a similar correlation already exists
                existing = await collection.find_one({
                    "type": correlation["type"],
                    "threats": {"$all": correlation["threats"]}
                })
                
                if existing:
                    # Update the existing correlation
                    await collection.update_one(
                        {"_id": existing["_id"]},
                        {
                            "$set": {
                                "last_seen": correlation["last_seen"],
                                "confidence": max(existing["confidence"], correlation["confidence"]),
                                "severity": max(
                                    existing["severity"], 
                                    correlation["severity"], 
                                    key=lambda x: ["info", "low", "medium", "high", "critical"].index(x.lower())
                                ),
                                "updated_at": datetime.utcnow()
                            },
                            "$addToSet": {
                                "sources": {"$each": correlation["metadata"].get("sources", [])}
                            }
                        }
                    )
                else:
                    # Insert a new correlation
                    correlation_doc = {
                        **correlation,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "sources": correlation["metadata"].get("sources", [])
                    }
                    await collection.insert_one(correlation_doc)
                    
        except Exception as e:
            self.logger.error(f"Error saving correlations: {e}", exc_info=True)
    
    async def _save_threat(self, threat: ThreatIntel) -> ThreatInDB:
        """Save a threat to the database and return the saved document"""
        try:
            collection = Database.get_collection("threats")
            
            # Check if the threat already exists
            existing = await collection.find_one({
                "type": threat.type,
                "value": threat.value
            })
            
            if existing:
                # Update the existing threat
                update_data = {
                    "$set": {
                        "last_seen": threat.last_seen,
                        "updated_at": datetime.utcnow()
                    }
                }
                
                # Update severity if higher
                existing_severity = Severity[existing["severity"].upper()]
                if threat.severity > existing_severity:
                    update_data["$set"]["severity"] = threat.severity.value
                
                # Update confidence if higher
                if threat.confidence > existing.get("confidence", 0):
                    update_data["$set"]["confidence"] = threat.confidence
                
                # Update tags
                if threat.tags:
                    update_data["$addToSet"] = {"tags": {"$each": threat.tags}}
                
                # Update enrichment data if available
                if threat.enrichment:
                    update_data["$set"]["enrichment"] = threat.enrichment
                
                # Update MITRE ATT&CK techniques
                if threat.mitre_attack:
                    update_data["$addToSet"] = {"mitre_attack": {"$each": threat.mitre_attack}}
                
                await collection.update_one(
                    {"_id": existing["_id"]},
                    update_data
                )
                
                # Return the updated document
                updated = await collection.find_one({"_id": existing["_id"]})
                return ThreatInDB(**updated)
            else:
                # Insert a new threat
                threat_in_db = ThreatInDB(
                    **threat.dict(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                result = await collection.insert_one(threat_in_db.dict(by_alias=True))
                
                # Return the saved document
                saved = await collection.find_one({"_id": result.inserted_id})
                return ThreatInDB(**saved)
                
        except Exception as e:
            self.logger.error(f"Error saving threat: {e}", exc_info=True)
            return threat  # Return the original threat if there was an error
    
    async def run(self):
        """Run the correlation service in a loop"""
        if self.is_running:
            self.logger.warning("Correlation service is already running")
            return
            
        self.is_running = True
        self._shutdown = False
        
        try:
            await self.initialize()
            
            while not self._shutdown:
                try:
                    start_time = datetime.utcnow()
                    self.logger.info("Running correlation service...")
                    
                    # Run the correlation
                    await self.correlate_threats()
                    
                    # Calculate sleep time to maintain the interval
                    elapsed = (datetime.utcnow() - start_time).total_seconds()
                    sleep_time = max(0, self.correlation_interval - elapsed)
                    
                    self.logger.info(f"Correlation completed in {elapsed:.2f}s. Next run in {sleep_time:.2f}s")
                    
                    # Sleep until the next run
                    await asyncio.sleep(sleep_time)
                    
                except asyncio.CancelledError:
                    self.logger.info("Correlation service was cancelled")
                    break
                except Exception as e:
                    self.logger.error(f"Error in correlation service: {e}", exc_info=True)
                    # Sleep for a bit before retrying
                    await asyncio.sleep(60)
                    
        except Exception as e:
            self.logger.error(f"Fatal error in correlation service: {e}", exc_info=True)
        finally:
            await self.shutdown()
    
    def get_status(self) -> Dict[str, Any]:
        """Get the status of the correlation service"""
        return {
            "is_running": self.is_running,
            "last_run": self.last_run,
            "correlation_interval": self.correlation_interval,
            "min_confidence": self.min_confidence
        }

# Global instance
correlation_service = CorrelationService()

async def start_correlation():
    """Start the correlation service"""
    await correlation_service.run()

async def stop_correlation():
    """Stop the correlation service"""
    await correlation_service.shutdown()

def get_correlation_status() -> Dict[str, Any]:
    """Get the status of the correlation service"""
    return correlation_service.get_status()
