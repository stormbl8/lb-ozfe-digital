import os
import re
import httpx
import docker
import asyncio
from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

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
        "http_2xx": 0,  # NEW
        "http_3xx": 0,  # NEW
        "http_4xx": 0,  # NEW
        "http_5xx": 0,  # NEW
        "latency_ms": 0, # NEW
        "bandwidth_mbps": 0 # NEW
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://nginx-proxy:8081/nginx_status")
            if response.status_code == 200:
                text = response.text
                active_match = re.search(r'Active connections: (\d+)', text)
                requests_match = re.search(r'(\d+)\s+(\d+)\s+(\d+)', text)
                rw_match = re.search(r'Reading: (\d+) Writing: (\d+) Waiting: (\d+)', text)
                
                # These fields are illustrative; we assume a more advanced NGINX module is used
                # or that logs are being scraped for this data.
                http_codes_match = re.search(r'HTTP Codes:\s+2xx:(\d+)\s+3xx:(\d+)\s+4xx:(\d+)\s+5xx:(\d+)', text)
                latency_match = re.search(r'Latency:\s+(\d+\.\d+)ms', text)
                bandwidth_match = re.search(r'Bandwidth:\s+(\d+\.\d+)Mbps', text)

                if active_match:
                    stats["active_connections"] = int(active_match.group(1))
                if requests_match:
                    stats["requests"] = int(requests_match.group(3))
                if rw_match:
                    stats["reading"] = int(rw_match.group(1))
                    stats["writing"] = int(rw_match.group(2))
                    stats["waiting"] = int(rw_match.group(3))
                
                if http_codes_match:
                    stats["http_2xx"] = int(http_codes_match.group(1))
                    stats["http_3xx"] = int(http_codes_match.group(2))
                    stats["http_4xx"] = int(http_codes_match.group(3))
                    stats["http_5xx"] = int(http_codes_match.group(4))

                if latency_match:
                    stats["latency_ms"] = float(latency_match.group(1))
                
                if bandwidth_match:
                    stats["bandwidth_mbps"] = float(bandwidth_match.group(1))
                    
    except Exception:
        pass
    return stats

async def get_prometheus_nginx_metrics(client: httpx.AsyncClient) -> Dict[str, Any]:
    metrics = {
        "active_connections": 0,
        "total_requests": 0,
    }
    prometheus_url = "http://prometheus:9090/api/v1/query"

    try:
        # Query for active connections
        response_active = await client.get(prometheus_url, params={"query": "nginx_connections_active"})
        response_active.raise_for_status()
        data_active = response_active.json()
        if data_active["status"] == "success" and data_active["data"]["result"]:
            # The value is a list [timestamp, value_string]
            metrics["active_connections"] = int(float(data_active["data"]["result"][0]["value"][1]))

        # Query for total requests
        response_requests = await client.get(prometheus_url, params={"query": "nginx_http_requests_total"})
        response_requests.raise_for_status()
        data_requests = response_requests.json()
        if data_requests["status"] == "success" and data_requests["data"]["result"]:
            metrics["total_requests"] = int(float(data_requests["data"]["result"][0]["value"][1]))

    except httpx.RequestError as e:
        print(f"Error querying Prometheus: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    return metrics

@router.get("")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Gathers and returns key system statistics from the database and Docker.
    """
    services = await crud.get_services(db)
    service_count = len(services)

    async with httpx.AsyncClient() as client:
        nginx_status, nginx_stub_stats, prometheus_nginx_metrics = await asyncio.gather(
            run_in_threadpool(get_nginx_status_sync),
            get_nginx_stub_stats(), # Keep this for now, will remove later if not needed
            get_prometheus_nginx_metrics(client)
        )

    # Combine stats, prioritizing Prometheus metrics for active connections and total requests
    combined_stats = {
        **nginx_stub_stats, # Start with stub stats
        "active_connections": prometheus_nginx_metrics["active_connections"],
        "requests": prometheus_nginx_metrics["total_requests"], # Overwrite with Prometheus data
    }

    return {
        "service_count": service_count,
        "nginx_status": nginx_status,
        "api_status": "Running",
        "stats": combined_stats,
    }