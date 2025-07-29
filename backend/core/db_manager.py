import os
import json
import aiofiles
from typing import List

from .models import Service, Pool

SERVICES_DB_FILE = "/app/data/config/services.json"
POOLS_DB_FILE = "/app/data/config/pools.json"

async def read_services_db() -> List[Service]:
    if not os.path.exists(SERVICES_DB_FILE):
        return []
    try:
        async with aiofiles.open(SERVICES_DB_FILE, 'r') as f:
            content = await f.read()
            if not content: return []
            data = json.loads(content)
            return [Service(**item) for item in data]
    except (json.JSONDecodeError, IndexError):
        return []

async def write_services_db(services: List[Service]):
    async with aiofiles.open(SERVICES_DB_FILE, 'w') as f:
        await f.write(json.dumps([service.dict() for service in services], indent=2))

async def read_pools_db() -> List[Pool]:
    if not os.path.exists(POOLS_DB_FILE):
        return []
    try:
        async with aiofiles.open(POOLS_DB_FILE, 'r') as f:
            content = await f.read()
            if not content: return []
            data = json.loads(content)
            return [Pool(**item) for item in data]
    except (json.JSONDecodeError, IndexError):
        return []

async def write_pools_db(pools: List[Pool]):
    async with aiofiles.open(POOLS_DB_FILE, 'w') as f:
        await f.write(json.dumps([pool.dict() for pool in pools], indent=2))