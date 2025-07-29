import os
import docker
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

CONFIG_DIR = "/data/nginx_proxy_configs"

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

def get_nginx_status_sync():
    """A synchronous function to get the container status, meant to be run in a thread pool."""
    try:
        client = docker.from_env()
        nginx_container = client.containers.get("nginx-proxy")
        return nginx_container.status.capitalize()
    except Exception:
        return "Error"

@router.get("")
async def get_dashboard_stats():
    """Gathers and returns key system statistics."""
    service_count = len([name for name in os.listdir(CONFIG_DIR) if name.endswith(".conf")])
    
    # Run the blocking Docker command in a separate thread
    nginx_status = await run_in_threadpool(get_nginx_status_sync)
        
    return {
        "service_count": service_count,
        "nginx_status": nginx_status,
        "api_status": "Running"
    }