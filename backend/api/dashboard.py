import os
import docker
from fastapi import APIRouter

CONFIG_DIR = "/data/nginx_proxy_configs"

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

@router.get("")
async def get_dashboard_stats():
    """Gathers and returns key system statistics."""
    service_count = len([name for name in os.listdir(CONFIG_DIR) if name.endswith(".conf")])
    nginx_status = "Not Found"
    try:
        client = docker.from_env()
        nginx_container = client.containers.get("nginx-proxy")
        nginx_status = nginx_container.status.capitalize()
    except Exception:
        nginx_status = "Error"
        
    return {
        "service_count": service_count,
        "nginx_status": nginx_status,
        "api_status": "Running"
    }