import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
import aiohttp
import hashlib
import os

from app.ingestion.base import BaseIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity
from app.database.db import Database
from app.app_logging import logger

class MalShareIngestor(BaseIngestor):
    """Ingestor for MalShare threat intelligence"""
    
    def __init__(self, api_key: str, session: aiohttp.ClientSession = None):
        super().__init__(ThreatSource.MALSHARE, session)
        self.base_url = "https://malshare.com/api.php"
        self.api_key = api_key
        self.headers = {
            "User-Agent": "CyberIntel-X/1.0",
            "Accept": "application/json"
        }
        self.last_run: Optional[datetime] = None
        self.seen_hashes: Set[str] = set()
    
    @property
    def name(self) -> str:
        return "MalShare Ingestor"
    
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch threat intelligence from MalShare"""
        try:
            # First, get the list of recent hashes
            params = {
                "api_key": self.api_key,
                "action": "getlist"
            }
            
            async with self.session.get(
                self.base_url,
                params=params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=300)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error fetching MalShare hashes: {response.status} - {error_text}")
                    return []
                
                hashes = await response.json()
                if not isinstance(hashes, list):
                    logger.error(f"Unexpected response format from MalShare: {hashes}")
                    return []
                
                # Filter out hashes we've already seen
                new_hashes = [h for h in hashes if h not in self.seen_hashes]
                
                # Get details for each new hash
                tasks = []
                for hash_value in new_hashes[:50]:  # Limit to 50 to avoid rate limiting
                    tasks.append(self._get_hash_details(hash_value))
                    self.seen_hashes.add(hash_value)
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                return [r for r in results if r and not isinstance(r, Exception)]
                
        except Exception as e:
            logger.error(f"Error in MalShare fetch: {e}", exc_info=True)
            return []
    
    async def _get_hash_details(self, hash_value: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific hash from MalShare"""
        try:
            # Get file details
            details_params = {
                "api_key": self.api_key,
                "action": "details",
                "hash": hash_value
            }
            
            async with self.session.get(
                self.base_url,
                params=details_params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error fetching MalShare details for {hash_value}: {response.status} - {error_text}")
                    return None
                
                details = await response.json()
                
                # Get the file if it's small enough (for hashing)
                file_content = await self._download_file(hash_value)
                if file_content:
                    # Calculate additional hashes
                    details["md5"] = hashlib.md5(file_content).hexdigest()
                    details["sha1"] = hashlib.sha1(file_content).hexdigest()
                    details["sha256"] = hashlib.sha256(file_content).hexdigest()
                    details["size"] = len(file_content)
                
                return details
                
        except Exception as e:
            logger.error(f"Error getting details for {hash_value}: {e}")
            return None
    
    async def _download_file(self, hash_value: str, max_size: int = 10 * 1024 * 1024) -> Optional[bytes]:
        """Download a file from MalShare if it's small enough"""
        try:
            download_params = {
                "api_key": self.api_key,
                "action": "getfile",
                "hash": hash_value
            }
            
            async with self.session.get(
                self.base_url,
                params=download_params,
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=300)
            ) as response:
                if response.status != 200:
                    return None
                
                # Check content length
                content_length = int(response.headers.get('Content-Length', 0))
                if content_length > max_size:
                    logger.info(f"File {hash_value} is too large ({content_length} bytes), skipping download")
                    return None
                
                # Download the file
                return await response.read()
                
        except Exception as e:
            logger.error(f"Error downloading file {hash_value}: {e}")
            return None
    
    def _determine_file_type(self, details: Dict[str, Any]) -> str:
        """Determine the file type from details"""
        file_type = details.get("file_type", "").lower()
        
        if "pe32" in file_type or "mz" in file_type:
            return "PE"
        elif "elf" in file_type:
            return "ELF"
        elif "mach-o" in file_type:
            return "Mach-O"
        elif "pdf" in file_type:
            return "PDF"
        elif "office" in file_type or "msoffice" in file_type:
            return "Office"
        elif "archive" in file_type or "zip" in file_type or "rar" in file_type:
            return "Archive"
        elif "script" in file_type:
            return "Script"
        else:
            return "Unknown"
    
    def _calculate_severity(self, details: Dict[str, Any]) -> Severity:
        """Calculate severity based on file details"""
        # Check if it's a known ransomware
        if any(tag in details.get("tags", "").lower() for tag in ["ransomware", "cryptolocker", "wannacry"]):
            return Severity.CRITICAL
        
        # Check if it's a banking trojan or info stealer
        if any(tag in details.get("tags", "").lower() for tag in ["banker", "zeus", "emotet", "trickbot"]):
            return Severity.HIGH
        
        # Check if it's a backdoor or RAT
        if any(tag in details.get("tags", "").lower() for tag in ["backdoor", "rat", "remote"]):
            return Severity.HIGH
        
        # Check if it's a downloader or dropper
        if any(tag in details.get("tags", "").lower() for tag in ["downloader", "dropper"]):
            return Severity.MEDIUM
        
        # Default to low severity
        return Severity.LOW
    
    def _extract_mitre_attack(self, details: Dict[str, Any]) -> List[str]:
        """Extract MITRE ATT&CK techniques from file details"""
        mitre_techniques = set()
        tags = details.get("tags", "").lower()
        
        # Map common malware behaviors to MITRE ATT&CK
        if "ransomware" in tags:
            mitre_techniques.update(["T1486"])  # Data Encrypted for Impact
        if "keylogger" in tags:
            mitre_techniques.update(["T1056.001"])  # Input Capture: Keylogging
        if "backdoor" in tags:
            mitre_techniques.update(["T1090"])  # Connection Proxy
        if "rat" in tags or "remote" in tags:
            mitre_techniques.update(["T1219"])  # Remote Access Software
        if "injection" in tags:
            mitre_techniques.update(["T1055"])  # Process Injection
        if "persistence" in tags:
            mitre_techniques.update(["T1547.001"])  # Boot or Logon Autostart Execution: Registry Run Keys
        if "credential" in tags or "password" in tags:
            mitre_techniques.update(["T1003", "T1555"])  # OS Credential Dumping, Credentials from Password Stores
        if "banking" in tags:
            mitre_techniques.update(["T1539"])  # Steal Web Session Cookie
        if "spyware" in tags:
            mitre_techniques.update(["T1012"])  # Query Registry
        
        return list(mitre_techniques)
    
    async def parse(self, details: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse MalShare details into ThreatIntel objects"""
        try:
            hash_value = details.get("md5") or details.get("sha1") or details.get("sha256")
            if not hash_value:
                return []
            
            # Determine file type
            file_type = self._determine_file_type(details)
            
            # Calculate severity
            severity = self._calculate_severity(details)
            
            # Extract MITRE ATT&CK techniques
            mitre_attack = self._extract_mitre_attack(details)
            
            # Extract tags
            tags = []
            if details.get("tags"):
                tags.extend([t.strip() for t in details["tags"].split(",") if t.strip()])
            
            # Add file type to tags
            tags.append(f"type:{file_type}")
            
            # Create enrichment data
            enrichment = {
                "file_type": file_type,
                "file_size": details.get("size"),
                "first_seen": details.get("fs_date"),
                "last_seen": details.get("added_date"),
                "tags": tags,
                "sources": ["MalShare"],
                "hashes": {
                    "md5": details.get("md5"),
                    "sha1": details.get("sha1"),
                    "sha256": details.get("sha256")
                },
                "detection": {
                    "antivirus_detections": details.get("detections", 0),
                    "total_avs": details.get("total_avs", 0)
                }
            }
            
            # Create the threat object
            threat = ThreatIntel(
                type=ThreatType.HASH,
                value=hash_value,
                first_seen=datetime.strptime(details.get("fs_date"), "%Y-%m-%d %H:%M:%S") if details.get("fs_date") else datetime.utcnow(),
                last_seen=datetime.strptime(details.get("added_date"), "%Y-%m-%d %H:%M:%S") if details.get("added_date") else datetime.utcnow(),
                severity=severity,
                source=self.source,
                confidence=0.8,  # High confidence for MalShare data
                tags=tags,
                metadata={
                    "file_type": file_type,
                    "file_size": details.get("size"),
                    "first_seen": details.get("fs_date"),
                    "last_seen": details.get("added_date"),
                    "detections": details.get("detections", 0),
                    "total_avs": details.get("total_avs", 0)
                },
                enrichment=enrichment,
                mitre_attack=mitre_attack
            )
            
            return [threat]
            
        except Exception as e:
            logger.error(f"Error parsing MalShare details for {details.get('md5', 'unknown')}: {e}", exc_info=True)
            return []

# Example usage:
# async with MalShareIngestor(api_key="your-api-key") as ingestor:
#     await ingestor.run()
