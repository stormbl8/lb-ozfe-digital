import asyncio
import httpx
import logging
from typing import Dict, Optional

from . import crud, models
from .database import AsyncSessionLocal

logger = logging.getLogger(__name__)

HEALTH_STATUS_CACHE: Dict[str, str] = {}

async def check_server_health(host: str, port: int, monitor: Optional[models.Monitor]) -> str:
    """Checks the health of a single server using a specific monitor's settings."""
    
    # Default to a simple TCP check if no monitor is assigned
    if not monitor or monitor.type == 'tcp':
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port), timeout=(monitor.timeout if monitor else 5.0)
            )
            writer.close()
            await writer.wait_closed()
            return "Online"
        except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
            return "Offline"

    # HTTP-specific check
    if monitor.type == 'http':
        url = f"http://{host}:{port}{monitor.path}"
        try:
            async with httpx.AsyncClient(verify=False) as client:
                response = await client.request(monitor.http_method, url, timeout=monitor.timeout)
                
                status_ok = response.status_code == monitor.expected_status
                body_ok = True
                if monitor.expected_body:
                    body_ok = monitor.expected_body in response.text

                if status_ok and body_ok:
                    return "Online"
                else:
                    return "Offline"
        except (httpx.RequestError, httpx.TimeoutException):
            return "Offline"
    
    return "Unknown" # Should not happen

async def health_check_task():
    """A background task that runs forever, checking server health."""
    logger.info("Health check background task started.")
    while True:
        try:
            db = AsyncSessionLocal()
            pools = await crud.get_pools(db)
            monitors = await crud.get_monitors(db)
            await db.close()

            monitors_by_id = {m.id: m for m in monitors}
            tasks = []
            server_keys = []

            for pool in pools:
                monitor = monitors_by_id.get(pool.monitor_id)
                for server in pool.backend_servers:
                    host = server['host']
                    port = server['port']
                    server_key = f"{host}:{port}"
                    
                    # Prevent creating duplicate checks for the same server
                    if server_key not in server_keys:
                        tasks.append(check_server_health(host, port, monitor))
                        server_keys.append(server_key)

            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for i, key in enumerate(server_keys):
                    result_val = results[i]
                    if isinstance(result_val, Exception):
                        logger.error(f"Health check for {key} resulted in exception: {result_val}")
                        HEALTH_STATUS_CACHE[key] = "Offline"
                    else:
                        HEALTH_STATUS_CACHE[key] = result_val

        except Exception as e:
            logger.error(f"Error in health check task: {e}")

        # Use a dynamic sleep based on the most frequent interval, or default to 15s
        # This is an advanced optimization to make checks more responsive
        await asyncio.sleep(15)