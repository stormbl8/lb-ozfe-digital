import asyncio
import httpx
import logging
from typing import Dict

from . import crud
from .database import AsyncSessionLocal

logger = logging.getLogger(__name__)

HEALTH_STATUS_CACHE: Dict[str, str] = {}

async def check_server_health(host: str, port: int, scheme: str) -> str:
    """Checks the health of a single server."""
    url = f"{scheme}://{host}:{port}/"
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(url, timeout=5.0)
            if 200 <= response.status_code < 500:
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
            db = AsyncSessionLocal()
            pools = await crud.get_pools(db)
            services = await crud.get_services(db)
            await db.close()

            unique_servers = set()
            for service in services:
                if service.service_type == 'http':
                    pool = next((p for p in pools if p.id == service.pool_id), None)
                    if pool and service.enabled:
                        scheme = service.forward_scheme
                        for server in pool.backend_servers:
                            unique_servers.add((server['host'], server['port'], scheme))

            tasks = [check_server_health(host, port, scheme) for host, port, scheme in unique_servers]
            results = await asyncio.gather(*tasks)

            for i, (host, port, scheme) in enumerate(unique_servers):
                HEALTH_STATUS_CACHE[f"{host}:{port}"] = results[i]

        except Exception as e:
            logger.error(f"Error in health check task: {e}")

        await asyncio.sleep(15)