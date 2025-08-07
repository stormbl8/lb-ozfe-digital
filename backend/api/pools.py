from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from core import crud, models
from core.database import get_db
from core.nginx_manager import regenerate_all_nginx_configs
from core.security import get_current_admin_user, get_current_user

router = APIRouter(
    prefix="/api/pools",
    tags=["Pools"]
)

@router.get("", response_model=List[models.PoolResponse])
async def list_pools(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Accessible to all logged-in users
):
    """
    Retrieve all server pools.
    """
    return await crud.get_pools(db)

@router.post("", response_model=models.PoolResponse, status_code=status.HTTP_201_CREATED)
async def add_new_pool(
    pool_data: models.PoolCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user) # Admin only
):
    """
    Add a new server pool.
    """
    existing_pool = await crud.get_pool_by_name(db, pool_data.name)
    if existing_pool:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pool with this name already exists."
        )

    new_pool = await crud.create_pool(db, pool_data)
    await regenerate_all_nginx_configs(db)
    return new_pool

@router.put("/{pool_id}", response_model=models.PoolResponse)
async def update_pool(
    pool_id: int,
    pool_data: models.PoolCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user) # Admin only
):
    """
    Update an existing server pool.
    """
    db_pool = await crud.get_pool(db, pool_id)
    if not db_pool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pool not found")

    updated_pool = await crud.update_pool(db, db_pool, pool_data)
    await regenerate_all_nginx_configs(db)
    return updated_pool

@router.delete("/{pool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pool(
    pool_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin_user) # Admin only
):
    """
    Delete a server pool.
    """
    # This call now eagerly loads the 'services' relationship.
    db_pool = await crud.get_pool(db, pool_id)
    if not db_pool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pool not found")

    if db_pool.services:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete pool. It is currently assigned to one or more services."
        )

    await crud.delete_pool(db, db_pool)
    await regenerate_all_nginx_configs(db)
    return