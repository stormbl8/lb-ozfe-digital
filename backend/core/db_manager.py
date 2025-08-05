import os
import json
import aiofiles
from typing import List

from .models import Service, Pool, UserInDB

# Define constants for database file paths
SERVICES_DB_FILE = "/app/data/config/services.json"
POOLS_DB_FILE = "/app/data/config/pools.json"
USERS_DB_FILE = "/app/data/config/users.json"

# --- Service Functions ---
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

# --- Pool Functions ---
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

# --- User Functions (Missing) ---
async def read_users_db() -> List[UserInDB]:
    """
    Reads the complete list of users from the JSON DB file.
    """
    if not os.path.exists(USERS_DB_FILE):
        return []
    try:
        async with aiofiles.open(USERS_DB_FILE, 'r') as f:
            content = await f.read()
            if not content: return []
            data = json.loads(content)
            return [UserInDB(**item) for item in data]
    except (json.JSONDecodeError, FileNotFoundError):
        return []

async def write_users_db(users: List[UserInDB]):
    """
    Asynchronously writes the complete list of users to the JSON DB file.
    """
    # Ensure the directory exists
    os.makedirs(os.path.dirname(USERS_DB_FILE), exist_ok=True)
    async with aiofiles.open(USERS_DB_FILE, 'w') as f:
        await f.write(json.dumps([user.dict() for user in users], indent=2))