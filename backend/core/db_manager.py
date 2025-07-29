import os
import json
import aiofiles
from typing import List

from .models import Service

SERVICES_DB_FILE = "/app/data/config/services.json"

async def read_services_db() -> List[Service]:
    """Asynchronously reads the complete list of services from the JSON DB file."""
    if not os.path.exists(SERVICES_DB_FILE):
        return []
    try:
        async with aiofiles.open(SERVICES_DB_FILE, 'r') as f:
            content = await f.read()
            if not content:
                return []
            data = json.loads(content)
            return [Service(**item) for item in data]
    except (json.JSONDecodeError, IndexError):
        return []

async def write_services_db(services: List[Service]):
    """Asynchronously writes the complete list of services to the JSON DB file."""
    async with aiofiles.open(SERVICES_DB_FILE, 'w') as f:
        await f.write(json.dumps([service.dict() for service in services], indent=2))