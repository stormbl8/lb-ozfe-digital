import os
import re
import httpx
import docker
import asyncio  # <-- THIS IS THE FIX
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

async def get_nginx_stub_stats():
    """Fetches and parses the stub_status output from NGINX."""
    stats = {
        "active_connections": 0,
        "requests": 0,
        "reading": 0,
        "writing": 0,
        "waiting": 0,
    }
    try:
        # NGINX stats are on port 8081 inside the docker network
        async with httpx.AsyncClient() as client:
            response = await client.get("http://nginx-proxy:8081/nginx_status")
            if response.status_code == 200:
                text = response.text
                # Use regex to parse the output
                active_match = re.search(r'Active connections: (\d+)', text)
                requests_match = re.search(r'(\d+)\s+(\d+)\s+(\d+)', text)
                rw_match = re.search(r'Reading: (\d+) Writing: (\d+) Waiting: (\d+)', text)

                if active_match:
                    stats["active_connections"] = int(active_match.group(1))
                if requests_match:
                    stats["requests"] = int(requests_match.group(3))
                if rw_match:
                    stats["reading"] = int(rw_match.group(1))
                    stats["writing"] = int(rw_match.group(2))
                    stats["waiting"] = int(rw_match.group(3))
    except Exception:
        # If stats can't be fetched, return default zero values
        pass
    return stats


@router.get("")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Gathers and returns key system statistics from the database and Docker.
    """
    services = await crud.get_services(db)
    service_count = len(services)
    
    # Run the blocking Docker command and the stats fetch concurrently
    nginx_status, nginx_stats = await asyncio.gather(
        run_in_threadpool(get_nginx_status_sync),
        get_nginx_stub_stats()
    )
        
    return {
        "service_count": service_count,
        "nginx_status": nginx_status,
        "api_status": "Running",
        "stats": nginx_stats,
    }