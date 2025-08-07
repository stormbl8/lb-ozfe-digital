import os
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from core import crud, models, security
from core.database import get_db

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    user = await crud.get_user_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=models.UserResponse)
async def read_users_me(current_user: Annotated[models.User, Depends(security.get_current_user)]):
    """
    Get current logged-in user's details.
    """
    return current_user

@router.get("/users", response_model=List[models.UserResponse])
async def read_users(
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    """
    Retrieve all users. Only accessible by admin users.
    """
    return await crud.get_users(db)

@router.post("/users", response_model=models.UserResponse)
async def create_new_user(
    user_data: models.AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    """
    Create a new user with a specific role. Only accessible by admin users.
    """
    db_user_by_username = await crud.get_user_by_username(db, username=user_data.username)
    if db_user_by_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    if user_data.email:
        db_user_by_email = await crud.get_user_by_email(db, email=user_data.email)
        if db_user_by_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    
    try:
        new_user = await crud.create_user(db=db, user=user_data)
        return new_user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this username or email already exists.")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@router.put("/users/{user_id}", response_model=models.UserResponse)
async def update_user(
    user_id: int,
    user_data: models.UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    """
    Update a user's details. Admin only.
    """
    db_user = await crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user_data.email and db_user.email != user_data.email:
        existing_user = await crud.get_user_by_email(db, email=user_data.email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    updated_user = await crud.update_user(db, db_user, user_data)
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    """
    Delete a user. Admin only.
    """
    db_user = await crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if db_user.username == admin_user.username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot delete your own account.")

    await crud.delete_user(db, db_user)
    return

@router.post("/license/upload")
async def upload_license(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads a JWT license file to assign a role to a user.
    This endpoint is public.
    """
    try:
        token_content = await file.read()
        decoded_token = jwt.decode(token_content, os.getenv("SECRET_KEY"), algorithms=["HS256"])

        license_username = decoded_token.get("sub")
        license_role = decoded_token.get("role")
        
        if not license_username or not license_role:
            raise HTTPException(status_code=422, detail="Invalid JWT token payload. Missing required claims.")

        user_to_update = await crud.get_user_by_username(db, username=license_username)
        if not user_to_update:
            raise HTTPException(status_code=404, detail=f"User '{license_username}' not found.")

        user_to_update.role = license_role
        await db.commit()
        await db.refresh(user_to_update)

        return {"message": f"License for {license_username} applied successfully. Role updated to {license_role}."}
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid JWT file or signature.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))