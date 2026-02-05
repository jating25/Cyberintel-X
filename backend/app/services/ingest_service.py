import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set, Type, TypeVar, Generic, Callable, Awaitable
import aiohttp
import json
import logging
from enum import Enum

from app.ingestion.base import BaseIngestor
from app.ingestion.nvd import NVDIngestor
from app.ingestion.virustotal import VirusTotalIngestor
from app.ingestion.otx import OTXIngestor
from app.ingestion.abuseipdb import AbuseIPDBIngestor
from app.ingestion.malshare import MalShareIngestor
from app.ingestion.rss import RSSIngestor
from app.database.models import ThreatIntel, ThreatInDB, ThreatSource
from app.database.db import Database
from app.app_logging import logger
from app.config import settings

# Type variable for ingestor classes
T = TypeVar('T', bound=BaseIngestor)

class IngestorType(str, Enum):
    """Enum for different types of ingestors"""
    NVD = "nvd"
    VIRUSTOTAL = "virustotal"
    OTX = "otx"
    ABUSEIPDB = "abuseipdb"
    MALSHARE = "malshare"
    RSS = "rss"

class IngestorConfig:
    """Configuration for an ingestor"""
    def __init__(
        self,
        ingestor_type: IngestorType,
        enabled: bool = True,
        interval: int = 3600,  # Default: 1 hour
        **kwargs
    ):
        self.ingestor_type = ingestor_type
        self.enabled = enabled
        self.interval = interval
        self.kwargs = kwargs

class IngestorManager:
    """Manages multiple threat intelligence ingestors"""
    
    def __init__(self):
        self.ingestors: Dict[str, BaseIngestor] = {}
        self.tasks: Dict[str, asyncio.Task] = {}
        self.session: Optional[aiohttp.ClientSession] = None
        self.is_running = False
        self._shutdown = False
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize the ingestion service"""
        # Create an HTTP session for all ingestors to share
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={'User-Agent': 'CyberIntel-X/1.0'}
        )
        
        # Create collections for tracking ingestors and tasks
        self.ingestors = {}
        self.tasks = {}
        
        self.logger.info("Ingestion service initialized")
    
    async def shutdown(self):
        """Shutdown all ingestors and cleanup"""
        self.logger.info("Shutting down ingestion service...")
        self._shutdown = True
        
        # Cancel all running tasks
        for name, task in list(self.tasks.items()):
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    self.logger.error(f"Error in task {name}: {e}")
        
        # Close the HTTP session
        if self.session and not self.session.closed:
            await self.session.close()
        
        self.is_running = False
        self.logger.info("All ingestors have been shut down")
    
    def get_ingestor_configs(self) -> Dict[IngestorType, IngestorConfig]:
        """Get configurations for all ingestors"""
        return {
            IngestorType.NVD: IngestorConfig(
                ingestor_type=IngestorType.NVD,
                enabled=True,
                interval=settings.NVD_INGESTION_INTERVAL,
                api_key=settings.VIRUSTOTAL_API_KEY  # Reusing VT key for NVD if needed
            ),
            IngestorType.VIRUSTOTAL: IngestorConfig(
                ingestor_type=IngestorType.VIRUSTOTAL,
                enabled=bool(settings.VIRUSTOTAL_API_KEY),
                interval=settings.VIRUSTOTAL_INGESTION_INTERVAL,
                api_key=settings.VIRUSTOTAL_API_KEY
            ),
            IngestorType.OTX: IngestorConfig(
                ingestor_type=IngestorType.OTX,
                enabled=bool(settings.OTX_API_KEY),
                interval=settings.OTX_INGESTION_INTERVAL,
                api_key=settings.OTX_API_KEY
            ),
            IngestorType.ABUSEIPDB: IngestorConfig(
                ingestor_type=IngestorType.ABUSEIPDB,
                enabled=bool(settings.ABUSEIPDB_API_KEY),
                interval=settings.ABUSEIPDB_INGESTION_INTERVAL,
                api_key=settings.ABUSEIPDB_API_KEY
            ),
            IngestorType.MALSHARE: IngestorConfig(
                ingestor_type=IngestorType.MALSHARE,
                enabled=bool(settings.MALSHARE_API_KEY),
                interval=settings.MALSHARE_INGESTION_INTERVAL,
                api_key=settings.MALSHARE_API_KEY
            ),
            IngestorType.RSS: IngestorConfig(
                ingestor_type=IngestorType.RSS,
                enabled=bool(settings.RSS_FEED_URLS),
                interval=settings.RSS_INGESTION_INTERVAL,
                feed_urls=settings.RSS_FEED_URLS.split(",") if settings.RSS_FEED_URLS else []
            )
        }
    
    async def create_ingestor(self, config: IngestorConfig) -> Optional[BaseIngestor]:
        """Create an ingestor instance based on the config"""
        if not config.enabled:
            self.logger.info(f"Ingestor {config.ingestor_type.value} is disabled, skipping...")
            return None
            
        try:
            ingestor_class = {
                IngestorType.NVD: NVDIngestor,
                IngestorType.VIRUSTOTAL: VirusTotalIngestor,
                IngestorType.OTX: OTXIngestor,
                IngestorType.ABUSEIPDB: AbuseIPDBIngestor,
                IngestorType.MALSHARE: MalShareIngestor,
                IngestorType.RSS: RSSIngestor
            }.get(config.ingestor_type)
            
            if not ingestor_class:
                self.logger.error(f"Unknown ingestor type: {config.ingestor_type}")
                return None
            
            # Create the ingestor with the session and API key
            ingestor = ingestor_class(session=self.session, **config.kwargs)
            self.ingestors[config.ingestor_type.value] = ingestor
            self.logger.info(f"Created ingestor: {ingestor.name}")
            return ingestor
            
        except Exception as e:
            self.logger.error(f"Error creating ingestor {config.ingestor_type.value}: {e}", exc_info=True)
            return None
    
    async def run_ingestor(self, ingestor: BaseIngestor, interval: int):
        """Run an ingestor in a loop with the specified interval"""
        ingestor_name = ingestor.name
        self.logger.info(f"Starting ingestor: {ingestor_name} (interval: {interval}s)")
        
        while not self._shutdown:
            try:
                start_time = datetime.utcnow()
                self.logger.info(f"Running ingestor: {ingestor_name}")
                
                # Run the ingester
                await ingestor.run()
                
                # Calculate sleep time to maintain the interval
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                sleep_time = max(0, interval - elapsed)
                
                self.logger.info(f"Ingestor {ingestor_name} completed in {elapsed:.2f}s. Next run in {sleep_time:.2f}s")
                
                # Sleep until the next run
                await asyncio.sleep(sleep_time)
                
            except asyncio.CancelledError:
                self.logger.info(f"Ingestor {ingestor_name} was cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in ingestor {ingestor_name}: {e}", exc_info=True)
                # Sleep for a bit before retrying
                await asyncio.sleep(60)
    
    async def start(self):
        """Start all configured ingestors"""
        if self.is_running:
            self.logger.warning("Ingestion service is already running")
            return
            
        self.is_running = True
        self._shutdown = False
        
        try:
            await self.initialize()
            
            # Get ingestor configurations
            configs = self.get_ingestor_configs()
            
            # Create and start ingestors
            for config in configs.values():
                if not config.enabled:
                    self.logger.info(f"Skipping disabled ingestor: {config.ingestor_type.value}")
                    continue
                
                ingestor = await self.create_ingestor(config)
                if not ingestor:
                    continue
                
                # Start the ingestor in a separate task
                task = asyncio.create_task(
                    self.run_ingestor(ingestor, config.interval),
                    name=f"ingestor_{config.ingestor_type.value}"
                )
                self.tasks[config.ingestor_type.value] = task
                
                # Add a small delay between starting ingestors
                await asyncio.sleep(1)
            
            self.logger.info(f"Started {len(self.tasks)} ingestors")
            
            # Keep the service running
            while not self._shutdown:
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            self.logger.info("Ingestion service was cancelled")
        except Exception as e:
            self.logger.error(f"Error in ingestion service: {e}", exc_info=True)
        finally:
            await self.shutdown()
    
    async def stop(self):
        """Stop all ingestors"""
        await self.shutdown()
    
    def get_status(self) -> Dict[str, Any]:
        """Get the status of all ingestors"""
        status = {
            "is_running": self.is_running,
            "ingestors": {}
        }
        
        for name, ingestor in self.ingestors.items():
            status["ingestors"][name] = {
                "is_running": name in self.tasks and not self.tasks[name].done(),
                "last_run": getattr(ingestor, "last_run", None),
                "is_enabled": name in self.ingestors
            }
        
        return status

# Global instance
ingestion_manager = IngestorManager()

async def start_ingestion():
    """Start the ingestion service"""
    await ingestion_manager.start()

async def stop_ingestion():
    """Stop the ingestion service"""
    await ingestion_manager.stop()

def get_ingestion_status() -> Dict[str, Any]:
    """Get the status of the ingestion service"""
    return ingestion_manager.get_status()
