import asyncio
import httpx
import logging
from typing import Dict

from .models import Service
from .db_manager import read_services_db

logger = logging.getLogger(__name__)

HEALTH_STATUS_CACHE: Dict[str, str] = {}

async def check_server_health(host: str, port: int, scheme: str) -> str:
    url = f"{scheme}://{host}:{port}/"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if 200 <= response.status_code < 400:
                return "Online"
            else:
                return "Offline"
    except (httpx.RequestError, httpx.TimeoutException):
        return "Offline"

async def health_check_task():
    """A background task that runs forever, checking server health."""
    logger.info("Health check background task started.")
    while True:
        try:
            services = await read_services_db() # <-- ADD await
            unique_servers = set()
            for service in services:
                if service.enabled:
                    for server in service.backend_servers:
                        unique_servers.add((server.host, server.port, service.forward_scheme))
            
            tasks = [check_server_health(host, port, scheme) for host, port, scheme in unique_servers]
            results = await asyncio.gather(*tasks)
            
            for i, (host, port, scheme) in enumerate(unique_servers):
                HEALTH_STATUS_CACHE[f"{host}:{port}"] = results[i]

        except Exception as e:
            logger.error(f"Error in health check task: {e}")

        await asyncio.sleep(15)