import os
from jose import jwt, JWTError # Changed
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.concurrency import run_in_threadpool
from typing import Annotated

from core.models import User, UserInDB
from core.security import verify_password, create_access_token, get_password_hash, get_user_from_db, get_current_user
from core.db_manager import write_users_db, read_users_db

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

@router.post("/register", response_model=User)
async def register_user(user: User):
    users_db = await read_users_db()
    if any(u.username == user.username for u in users_db):
        raise HTTPException(status_code=409, detail="Username already exists")
    
    # Check if password is provided
    if not user.password:
        raise HTTPException(status_code=422, detail="Password is required")

    hashed_password = get_password_hash(user.password)
    new_user = UserInDB(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        disabled=False,
        hashed_password=hashed_password,
        role="read-only" # Default role
    )
    users_db.append(new_user)
    await write_users_db(users_db)
    return user

@router.post("/license/upload")
async def upload_license(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    file: UploadFile = File(...)
):
    """
    Uploads a JWT license file to assign an 'admin' or 'read-only' role to a user.
    """
    try:
        token_content = await file.read()
        decoded_token = jwt.decode(token_content, os.getenv("SECRET_KEY"), algorithms=["HS256"]) # Changed

        license_username = decoded_token.get("sub")
        license_role = decoded_token.get("role")

        if not license_username or not license_role:
            raise HTTPException(status_code=422, detail="Invalid JWT token payload.")

        users_db = await read_users_db()
        user_to_update = next((u for u in users_db if u.username == license_username), None)

        if not user_to_update:
            raise HTTPException(status_code=404, detail=f"User {license_username} not found.")

        user_to_update.role = license_role
        await write_users_db(users_db)

        return {"message": f"License for {license_username} applied successfully. Role updated to {license_role}."}
    except JWTError: # Changed
        raise HTTPException(status_code=400, detail="Invalid JWT file or signature.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))