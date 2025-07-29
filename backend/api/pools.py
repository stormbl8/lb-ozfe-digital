from fastapi import APIRouter, HTTPException, status
from typing import List

from core.models import Pool
from core.db_manager import read_pools_db, write_pools_db
from core.nginx_manager import regenerate_all_nginx_configs

router = APIRouter(prefix="/api/pools", tags=["Pools"])

@router.get("", response_model=List[Pool])
async def list_pools():
    return await read_pools_db()

@router.post("", response_model=Pool)
async def add_new_pool(pool_data: Pool):
    pools = await read_pools_db()
    new_id = max([p.id for p in pools if p.id is not None] + [0]) + 1
    pool_data.id = new_id
    pools.append(pool_data)
    await write_pools_db(pools)
    await regenerate_all_nginx_configs()
    return pool_data

@router.put("/{pool_id}", response_model=Pool)
async def update_pool(pool_id: int, pool_data: Pool):
    pools = await read_pools_db()
    pool_index = next((i for i, p in enumerate(pools) if p.id == pool_id), -1)
    if pool_index == -1:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    pool_data.id = pool_id
    pools[pool_index] = pool_data
    await write_pools_db(pools)
    await regenerate_all_nginx_configs()
    return pool_data

@router.delete("/{pool_id}")
async def delete_pool(pool_id: int):
    pools = await read_pools_db()
    updated_pools = [p for p in pools if p.id != pool_id]
    if len(pools) == len(updated_pools):
        raise HTTPException(status_code=404, detail="Pool not found")
    
    await write_pools_db(updated_pools)
    await regenerate_all_nginx_configs()
    return {"message": "Pool deleted successfully."}