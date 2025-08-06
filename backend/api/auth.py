import os
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession

from core import crud, models, security
from core.database import get_db
# Note: license_manager is no longer used, its logic is handled here
# from core.license_manager import read_license, save_license 

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
    db_user = await crud.get_user_by_username(db, username=user_data.username)
    if db_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    # In a real application, you would add your license check logic here
    # For example:
    # license_details = read_license() 
    # users = await crud.get_users(db)
    # if len(users) >= license_details.get("user_limit", 1):
    #     raise HTTPException(status_code=403, detail="User limit reached")
    
    return await crud.create_user(db=db, user=user_data)

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
        
        # Here you would also extract and save license limits
        # user_limit = decoded_token.get("user_limit")
        # allowed_roles = decoded_token.get("allowed_roles")
        # save_license({"user_limit": user_limit, "allowed_roles": allowed_roles})

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