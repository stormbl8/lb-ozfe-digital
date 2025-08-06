from sqlalchemy import (
    Column, Integer, String, Boolean,
    Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import Optional, List, Literal

from .database import Base

# --- SQLAlchemy ORM Models (For Database Schema) ---

class Pool(Base):
    __tablename__ = "pools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    backend_servers = Column(JSON, nullable=False, default=list)
    load_balancing_algorithm = Column(String, default="round_robin")
    services = relationship("Service", back_populates="pool")

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    service_type = Column(String, default="http")
    listen_port = Column(Integer, nullable=True)
    domain_name = Column(String, unique=True, nullable=True)
    pool_id = Column(Integer, ForeignKey("pools.id"), nullable=True)
    enabled = Column(Boolean, default=True)
    forward_scheme = Column(String, default="http")
    websockets_support = Column(Boolean, default=True)
    waf_enabled = Column(Boolean, default=False)
    certificate_name = Column(String, default="dummy")
    force_ssl = Column(Boolean, default=False)
    http2_support = Column(Boolean, default=False)
    hsts_enabled = Column(Boolean, default=False)
    hsts_subdomains = Column(Boolean, default=False)
    advanced_config = Column(Text, nullable=True)
    pool = relationship("Pool", back_populates="services")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="read-only")
    disabled = Column(Boolean, default=False)


# --- Pydantic Models (For API Validation & Responses) ---

# Base model for user attributes
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

# Model used when creating a user (includes password)
class UserCreate(UserBase):
    password: str

# Model used by admins to create a user (includes role)
class AdminUserCreate(UserCreate):
    role: Literal["admin", "read-only"] = "read-only"

# A Pydantic model representing the user as it is in the database
class UserInDB(UserBase):
    id: int
    role: str
    hashed_password: str
    class Config:
        from_attributes = True

# Model for API responses (never includes password)
class UserResponse(UserBase):
    id: int
    role: str
    disabled: bool
    class Config:
        from_attributes = True

class BackendServer(BaseModel):
    host: str
    port: int
    max_fails: int = 3
    fail_timeout: str = "10s"

class PoolBase(BaseModel):
    name: str
    backend_servers: List[BackendServer]
    load_balancing_algorithm: str

class PoolCreate(PoolBase):
    pass

class PoolResponse(PoolBase):
    id: int
    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    service_type: str
    listen_port: Optional[int] = None
    domain_name: Optional[str] = None
    pool_id: Optional[int] = None
    enabled: bool = True
    forward_scheme: str = "http"
    websockets_support: bool = True
    waf_enabled: bool = False
    certificate_name: str = "dummy"
    force_ssl: bool = False
    http2_support: bool = False
    hsts_enabled: bool = False
    hsts_subdomains: bool = False
    advanced_config: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int
    class Config:
        from_attributes = True

class RateLimitSettings(BaseModel):
    enabled: bool = False
    requests_per_second: int = Field(default=10, gt=0)
    burst: int = Field(default=20, gt=0)

class AppSettings(BaseModel):
    rate_limiting: RateLimitSettings = Field(default_factory=RateLimitSettings)