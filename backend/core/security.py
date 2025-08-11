import os
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

# Import the new database and CRUD functions
from .database import get_db
from . import crud, models
from .license_manager import read_license

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=8)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm="HS256")
    return encoded_jwt

# This function is now refactored to use the database session
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_admin_user(current_user: Annotated[models.User, Depends(get_current_user)]):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
    return current_user

import os
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

# Import the new database and CRUD functions
from .database import get_db
from . import crud, models
from .license_manager import read_license

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=8)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm="HS256")
    return encoded_jwt

# This function is now refactored to use the database session
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_admin_user(current_user: Annotated[models.User, Depends(get_current_user)]):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
    return current_user

async def enforce_full_license():
    """A dependency to check for a full license."""
    license_data = read_license()
    if license_data.license_type != 'full':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a full license.",
        )

async def enforce_trial_or_full_license():
    """A dependency to check for a trial or full license."""
    license_data = read_license()
    if license_data.license_type not in ['trial', 'full']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature is not available for your license type.",
        )

async def check_pool_limit(db: AsyncSession = Depends(get_db)):
    """A dependency to check the pool limit for trial licenses."""
    license_data = read_license()
    if license_data.license_type == 'trial':
        pools = await crud.get_pools(db)
        if len(pools) >= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trial license only allows 1 pool. Please upgrade to a full license.",
            )

async def check_service_limit(db: AsyncSession = Depends(get_db)):
    """A dependency to check the service limit for trial licenses."""
    license_data = read_license()
    if license_data.license_type == 'trial':
        services = await crud.get_services(db)
        if len(services) >= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trial license only allows 1 proxy host. Please upgrade to a full license.",
            )