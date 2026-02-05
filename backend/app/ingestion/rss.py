import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
import aiohttp
import feedparser
from bs4 import BeautifulSoup
import re

from app.ingestion.base import BaseIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource, ThreatType, Severity
from app.database.db import Database
from app.app_logging import logger

class RSSIngestor(BaseIngestor):
    """Ingestor for RSS/Atom feeds with security-related content"""
    
    def __init__(self, feed_urls: List[str], session: aiohttp.ClientSession = None):
        super().__init__(ThreatSource.RSS, session)
        self.feed_urls = feed_urls
        self.headers = {
            "User-Agent": "CyberIntel-X/1.0",
            "Accept": "application/rss+xml,application/atom+xml,application/xml,text/xml"
        }
        self.seen_entries: Set[str] = set()
        self.last_run: Optional[datetime] = None
    
    @property
    def name(self) -> str:
        return "RSS Ingestor"
    
    async def fetch(self) -> List[Dict[str, Any]]:
        """Fetch and parse RSS/Atom feeds"""
        try:
            all_entries = []
            
            for feed_url in self.feed_urls:
                try:
                    async with self.session.get(
                        feed_url,
                        headers=self.headers,
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as response:
                        if response.status != 200:
                            logger.error(f"Error fetching feed {feed_url}: {response.status}")
                            continue
                        
                        feed_content = await response.text()
                        feed = feedparser.parse(feed_content)
                        
                        if feed.bozo and feed.bozo_exception:
                            logger.warning(f"Error parsing feed {feed_url}: {feed.bozo_exception}")
                        
                        # Extract entries and add source info
                        for entry in feed.entries:
                            entry["_feed_url"] = feed_url
                            entry["_feed_title"] = feed.feed.get("title", "")
                            all_entries.append(entry)
                            
                except Exception as e:
                    logger.error(f"Error processing feed {feed_url}: {e}", exc_info=True)
            
            # Filter out entries we've already seen
            new_entries = []
            for entry in all_entries:
                entry_id = self._get_entry_id(entry)
                if entry_id not in self.seen_entries:
                    new_entries.append(entry)
                    self.seen_entries.add(entry_id)
            
            # Keep the set size manageable
            if len(self.seen_entries) > 1000:
                self.seen_entries = set(list(self.seen_entries)[-1000:])
            
            return new_entries
            
        except Exception as e:
            logger.error(f"Error in RSS fetch: {e}", exc_info=True)
            return []
    
    def _get_entry_id(self, entry: Dict[str, Any]) -> str:
        """Generate a unique ID for an entry"""
        return entry.get("id") or entry.get("link", "") or entry.get("title", "") + entry.get("published", "")
    
    def _extract_cves(self, text: str) -> List[str]:
        """Extract CVE IDs from text"""
        return re.findall(r'CVE-\d{4}-\d{4,7}', text.upper())
    
    def _extract_ips(self, text: str) -> List[str]:
        """Extract IP addresses from text"""
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        return re.findall(ip_pattern, text)
    
    def _extract_domains(self, text: str) -> List[str]:
        """Extract domains from text"""
        domain_pattern = r'\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b'
        return re.findall(domain_pattern, text, re.IGNORECASE)
    
    def _extract_hashes(self, text: str) -> List[str]:
        """Extract hashes from text"""
        # MD5
        md5_pattern = r'\b[a-fA-F0-9]{32}\b'
        # SHA-1
        sha1_pattern = r'\b[a-fA-F0-9]{40}\b'
        # SHA-256
        sha256_pattern = r'\b[a-fA-F0-9]{64}\b'
        
        hashes = []
        hashes.extend(re.findall(md5_pattern, text))
        hashes.extend(re.findall(sha1_pattern, text))
        hashes.extend(re.findall(sha256_pattern, text))
        return hashes
    
    def _extract_urls(self, text: str) -> List[str]:
        """Extract URLs from text"""
        url_pattern = r'https?://[^\s\"\'<>\]\`{}|\\^]+[^\s\"\'<>\.,\]\`{}|\\^]'
        return re.findall(url_pattern, text)
    
    def _calculate_severity(self, entry: Dict[str, Any]) -> Severity:
        """Calculate severity based on entry content"""
        title = entry.get("title", "").lower()
        summary = entry.get("summary", "").lower()
        content = f"{title} {summary}"
        
        # Check for critical terms
        critical_terms = ["0day", "zero day", "remote code execution", "rce", "wormable", 
                         "critical vulnerability", "actively exploited", "in the wild"]
        if any(term in content for term in critical_terms):
            return Severity.CRITICAL
        
        # Check for high severity terms
        high_terms = ["privilege escalation", "arbitrary code execution", "bypass", 
                     "authentication bypass", "unauthorized access"]
        if any(term in content for term in high_terms):
            return Severity.HIGH
        
        # Check for medium severity terms
        medium_terms = ["denial of service", "dos", "xss", "cross-site scripting", 
                       "information disclosure", "memory corruption"]
        if any(term in content for term in medium_terms):
            return Severity.MEDIUM
        
        return Severity.LOW
    
    def _extract_mitre_attack(self, entry: Dict[str, Any]) -> List[str]:
        """Extract MITRE ATT&CK techniques from entry content"""
        mitre_techniques = set()
        content = f"{entry.get('title', '')} {entry.get('summary', '')}".lower()
        
        # Map common terms to MITRE ATT&CK techniques
        if "phishing" in content:
            mitre_techniques.add("T1566")  # Phishing
        if "ransomware" in content:
            mitre_techniques.add("T1486")  # Data Encrypted for Impact
        if "backdoor" in content:
            mitre_techniques.add("T1505")  # Server Software Component: Web Shell
        if "credential" in content:
            mitre_techniques.update(["T1003", "T1555"])  # OS Credential Dumping, Credentials from Password Stores
        if "lateral movement" in content:
            mitre_techniques.add("T1021")  # Remote Services
        if "persistence" in content:
            mitre_techniques.add("T1547.001")  # Boot or Logon Autostart Execution: Registry Run Keys
        if "privilege escalation" in content:
            mitre_techniques.add("T1068")  # Exploitation for Privilege Escalation
        if "command and control" in content or "c2" in content:
            mitre_techniques.add("T1071")  # Application Layer Protocol
        if "data exfiltration" in content:
            mitre_techniques.add("T1041")  # Exfiltration Over C2 Channel
        
        return list(mitre_techniques)
    
    def _clean_html(self, html: str) -> str:
        """Remove HTML tags from text"""
        if not html:
            return ""
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text(separator=" ", strip=True)
    
    async def parse(self, entry: Dict[str, Any]) -> List[ThreatIntel]:
        """Parse RSS/Atom entry into ThreatIntel objects"""
        try:
            threats = []
            
            # Extract content
            title = entry.get("title", "No title")
            link = entry.get("link", "")
            published = entry.get("published", "")
            updated = entry.get("updated", published)
            summary = self._clean_html(entry.get("summary", ""))
            content = self._clean_html(entry.get("content", [{}])[0].get("value", "")) if entry.get("content") else ""
            full_text = f"{title} {summary} {content}"
            
            # Extract IOCs
            cvss = []
            if "cvss" in full_text.lower():
                cvss_matches = re.findall(r'CVSS:3\.\d+\/\w+:(\d+\.\d+)', full_text, re.IGNORECASE)
                if cvss_matches:
                    cvss = [float(score) for score in cvss_matches if self._is_float(score)]
            
            # Calculate severity
            severity = self._calculate_severity(entry)
            
            # Extract MITRE ATT&CK techniques
            mitre_attack = self._extract_mitre_attack(entry)
            
            # Create enrichment data
            enrichment = {
                "feed_url": entry.get("_feed_url", ""),
                "feed_title": entry.get("_feed_title", ""),
                "title": title,
                "link": link,
                "published": published,
                "updated": updated,
                "author": entry.get("author", ""),
                "categories": entry.get("tags", []),
                "content": content,
                "cvss_scores": cvss,
                "iocs": {
                    "cves": self._extract_cves(full_text),
                    "ips": self._extract_ips(full_text),
                    "domains": self._extract_domains(full_text),
                    "hashes": self._extract_hashes(full_text),
                    "urls": self._extract_urls(full_text)
                }
            }
            
            # Create a threat for the article itself
            article_threat = ThreatIntel(
                type=ThreatType.URL,
                value=link or f"article:{title[:100]}",
                first_seen=datetime.strptime(published, "%Y-%m-%dT%H:%M:%SZ") if published else datetime.utcnow(),
                last_seen=datetime.strptime(updated, "%Y-%m-%dT%H:%M:%SZ") if updated else datetime.utcnow(),
                severity=severity,
                source=self.source,
                confidence=0.7,  # Medium confidence for RSS data
                tags=["article", "news", "advisory"] + entry.get("tags", []),
                metadata={
                    "title": title,
                    "url": link,
                    "published": published,
                    "updated": updated,
                    "author": entry.get("author", ""),
                    "categories": entry.get("tags", []),
                    "source_feed": entry.get("_feed_title", ""),
                    "cvss_scores": cvss
                },
                enrichment=enrichment,
                mitre_attack=mitre_attack
            )
            
            threats.append(article_threat)
            
            # Create threats for CVEs mentioned in the article
            for cve in enrichment["iocs"]["cves"]:
                cve_threat = ThreatIntel(
                    type=ThreatType.CVE,
                    value=cve,
                    first_seen=article_threat.first_seen,
                    last_seen=article_threat.last_seen,
                    severity=severity,
                    source=self.source,
                    confidence=0.8,  # High confidence for CVEs
                    tags=["cve", "vulnerability"] + entry.get("tags", []),
                    metadata={
                        "source_article": title,
                        "source_url": link,
                        "published": published,
                        "cvss_scores": cvss
                    },
                    enrichment={
                        "article": title,
                        "article_url": link,
                        "description": f"Mentioned in: {title}",
                        "reference_urls": [link]
                    },
                    mitre_attack=mitre_attack
                )
                threats.append(cve_threat)
            
            return threats
            
        except Exception as e:
            logger.error(f"Error parsing RSS entry {entry.get('title', 'unknown')}: {e}", exc_info=True)
            return []
    
    def _is_float(self, s: str) -> bool:
        """Check if a string can be converted to float"""
        try:
            float(s)
            return True
        except ValueError:
            return False

# Example usage:
# feed_urls = [
#     "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml",
#     "https://www.us-cert.gov/ncas/alerts.xml",
#     "https://www.cisa.gov/cybersecurity-advisories/ics-cert-advisories.xml"
# ]
# async with RSSIngestor(feed_urls=feed_urls) as ingestor:
#     await ingestor.run()
