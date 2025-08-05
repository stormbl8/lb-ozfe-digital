import asyncio
import httpx
import logging
from typing import Dict

from .models import Service, Pool
from .db_manager import read_pools_db, read_services_db

logger = logging.getLogger(__name__)

HEALTH_STATUS_CACHE: Dict[str, str] = {}

async def check_server_health(host: str, port: int, scheme: str) -> str:
    """Checks the health of a single server."""
    url = f"{scheme}://{host}:{port}/"
    try:
        # verify=False is for self-signed certs on https backends
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(url, timeout=5.0)
            if 200 <= response.status_code < 500: 
                return "Online"
            else:
                logger.warning(f"Health check for {url} failed with status {response.status_code}")
                return "Offline"
    except (httpx.RequestError, httpx.TimeoutException) as e:
        logger.warning(f"Health check for {url} failed with exception: {e}")
        return "Offline"

async def health_check_task():
    """A background task that runs forever, checking server health."""
    logger.info("Health check background task started.")
    while True:
        try:
            pools = await read_pools_db()
            services = await read_services_db()
            
            unique_servers = set()
            for service in services:
                # Find the pool associated with the service
                pool = next((p for p in pools if p.id == service.pool_id), None)
                if pool:
                    for server in pool.backend_servers:
                        # Use the service's forward_scheme for http services, default to http for streams
                        scheme = service.forward_scheme if service.service_type == 'http' else 'http'
                        unique_servers.add((server.host, server.port, scheme))
            
            if not unique_servers:
                await asyncio.sleep(15)
                continue

            tasks = [check_server_health(host, port, scheme) for host, port, scheme in unique_servers]
            results = await asyncio.gather(*tasks)
            
            for i, (host, port, scheme) in enumerate(unique_servers):
                HEALTH_STATUS_CACHE[f"{host}:{port}"] = results[i]

        except Exception as e:
            logger.error(f"Error in health check task: {e}")

        await asyncio.sleep(15)