import os
import docker
from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from core import crud
from core.database import get_db

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
    except docker.errors.NotFound:
        return "Not Found"
    except Exception:
        return "Error"

@router.get("")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Gathers and returns key system statistics from the database and Docker.
    """
    # Get service count from the database instead of the filesystem
    services = await crud.get_services(db)
    service_count = len(services)
    
    # Run the blocking Docker command in a separate thread
    nginx_status = await run_in_threadpool(get_nginx_status_sync)
        
    return {
        "service_count": service_count,
        "nginx_status": nginx_status,
        "api_status": "Running"
    }