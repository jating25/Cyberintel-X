import os
import aiohttp
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

async def get_geolocation(ip_address: str) -> Optional[Dict[str, Any]]:
    """
    Get geolocation data for an IP address using ipstack.com
    Returns a dict with country, city, latitude, longitude
    """
    api_key = os.getenv("IPSTACK_API_KEY")
    if not api_key:
        logger.warning("IPSTACK_API_KEY not set in environment variables")
        return None
    
    url = f"http://api.ipstack.com/{ip_address}?access_key={api_key}&format=1"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success") is False:
                        logger.error(f"IPStack API error: {data.get('error', {}).get('info', 'Unknown error')}")
                        return None
                        
                    return {
                        "ip_address": ip_address,
                        "country": data.get("country_name"),
                        "city": data.get("city"),
                        "latitude": data.get("latitude"),
                        "longitude": data.get("longitude"),
                        "region": data.get("region_name"),
                        "zip": data.get("zip"),
                    }
                else:
                    logger.error(f"Failed to fetch geolocation data: {response.status}")
    except Exception as e:
        logger.error(f"Error getting geolocation: {str(e)}")
    
    return None
