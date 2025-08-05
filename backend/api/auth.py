import os
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated, List

from core.models import User, UserInDB, UserResponse, AdminUserCreate
from core.security import (
    verify_password, create_access_token, get_password_hash,
    get_user_from_db, get_current_user, get_current_admin_user
)
from core.db_manager import write_users_db, read_users_db
from core.license_manager import read_license, save_license

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/token")
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await get_user_from_db(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: Annotated[UserInDB, Depends(get_current_user)]):
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def read_users(admin_user: Annotated[UserInDB, Depends(get_current_admin_user)]):
    return await read_users_db()

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: AdminUserCreate,
    admin_user: Annotated[UserInDB, Depends(get_current_admin_user)]
):
    license_details = read_license()
    users_db = await read_users_db()

    if len(users_db) >= license_details.get("user_limit", 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit of {license_details.get('user_limit', 1)} reached."
        )

    if user_data.role not in license_details.get("allowed_roles", ["read-only"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user_data.role}' is not permitted by the current license."
        )

    if any(u.username == user_data.username for u in users_db):
        raise HTTPException(status_code=409, detail="Username already exists")

    if not user_data.password:
        raise HTTPException(status_code=422, detail="Password is required")

    hashed_password = get_password_hash(user_data.password)
    new_user = UserInDB(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        disabled=False,
        hashed_password=hashed_password,
        role=user_data.role
    )
    users_db.append(new_user)
    await write_users_db(users_db)
    return new_user

@router.post("/license/upload")
async def upload_license(file: UploadFile = File(...)):
    try:
        token_content = await file.read()
        decoded_token = jwt.decode(token_content, os.getenv("SECRET_KEY"), algorithms=["HS256"])

        license_username = decoded_token.get("sub")
        license_role = decoded_token.get("role")
        user_limit = decoded_token.get("user_limit")
        allowed_roles = decoded_token.get("allowed_roles")

        if not all([license_username, license_role, user_limit, allowed_roles]):
            raise HTTPException(status_code=422, detail="Invalid JWT. Missing required claims.")

        save_license({"user_limit": user_limit, "allowed_roles": allowed_roles})
        
        users_db = await read_users_db()
        user_to_update = next((u for u in users_db if u.username == license_username), None)

        if not user_to_update:
            raise HTTPException(status_code=404, detail=f"User '{license_username}' not found.")

        user_to_update.role = license_role
        await write_users_db(users_db)

        return {"message": f"License for {license_username} applied. Role set to {license_role}."}
    # This is the line that was fixed
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid JWT file or signature.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))