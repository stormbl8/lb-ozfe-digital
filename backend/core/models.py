from sqlalchemy import (
    Column, Integer, String, Boolean,
    Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import Optional, List, Literal

from .database import Base

# --- SQLAlchemy ORM Models (For Database Schema) ---

class Monitor(Base):
    __tablename__ = "monitors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, default="http")
    interval = Column(Integer, default=15)
    timeout = Column(Integer, default=5)
    http_method = Column(String, default="GET")
    path = Column(String, default="/")
    expected_status = Column(Integer, default=200)
    expected_body = Column(String, nullable=True)
    pools = relationship("Pool", back_populates="monitor")

class Pool(Base):
    __tablename__ = "pools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    backend_servers = Column(JSON, nullable=False, default=list)
    load_balancing_algorithm = Column(String, default="round_robin")
    monitor_id = Column(Integer, ForeignKey("monitors.id"), nullable=True)
    monitor = relationship("Monitor", back_populates="pools")
    services = relationship("Service", back_populates="pool")

# --- NEW MODEL: WAFRuleSet ---
class WAFRuleSet(Base):
    __tablename__ = "waf_rulesets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    # List of OWASP CRS rule IDs to exclude
    excluded_rule_ids = Column(JSON, nullable=False, default=list)

# --- NEW MODEL: Datacenter ---
class Datacenter(Base):
    __tablename__ = "datacenters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=True)
    nginx_ip = Column(String, nullable=False)
    api_url = Column(String, nullable=False)

# --- NEW MODEL: GSLBService ---
class GSLBService(Base):
    __tablename__ = "gslb_services"
    id = Column(Integer, primary_key=True, index=True)
    domain_name = Column(String, unique=True, index=True, nullable=False)
    load_balancing_algorithm = Column(String, default="round_robin")
    datacenters = Column(JSON, nullable=False, default=list)
    geoip_map = Column(JSON, nullable=True) # NEW FIELD
    services = relationship("Service", back_populates="gslb_service")
    
# --- UPDATED MODEL: Service ---
class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    service_type = Column(String, default="http")
    listen_port = Column(Integer, nullable=True)
    domain_name = Column(String, nullable=True)
    
    gslb_service_id = Column(Integer, ForeignKey("gslb_services.id"), nullable=True)
    datacenter_id = Column(Integer, ForeignKey("datacenters.id"), nullable=True)
    
    pool_id = Column(Integer, ForeignKey("pools.id"), nullable=True)
    enabled = Column(Boolean, default=True)
    forward_scheme = Column(String, default="http")
    websockets_support = Column(Boolean, default=True)
    waf_enabled = Column(Boolean, default=False)
    # NEW FIELD
    waf_ruleset_id = Column(Integer, ForeignKey("waf_rulesets.id"), nullable=True)
    
    session_persistence = Column(Boolean, default=False)
    certificate_name = Column(String, default="dummy")
    force_ssl = Column(Boolean, default=False)
    http2_support = Column(Boolean, default=False)
    hsts_enabled = Column(Boolean, default=False)
    hsts_subdomains = Column(Boolean, default=False)
    basic_auth_user = Column(String, nullable=True)
    basic_auth_pass = Column(String, nullable=True)
    advanced_config = Column(Text, nullable=True)
    pool = relationship("Pool", back_populates="services")
    gslb_service = relationship("GSLBService", back_populates="services")

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

class UserBase(BaseModel):
    username: str = Field(..., min_length=1, description="Username cannot be empty.")
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters.")

class UserUpdate(UserBase):
    password: Optional[str] = Field(None, min_length=6, description="Password must be at least 6 characters.")
    role: Literal["admin", "read-only"]

class AdminUserCreate(UserCreate):
    role: Literal["admin", "read-only"] = "read-only"

class UserInDB(UserBase):
    id: int
    role: str
    class Config:
        from_attributes = True

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

class MonitorBase(BaseModel):
    name: str
    type: Literal["http", "tcp"] = "http"
    interval: int = 15
    timeout: int = 5
    http_method: str = "GET"
    path: str = "/"
    expected_status: int = 200
    expected_body: Optional[str] = None

class MonitorCreate(MonitorBase):
    pass

class MonitorResponse(MonitorBase):
    id: int
    class Config:
        from_attributes = True

class PoolBase(BaseModel):
    name: str
    backend_servers: List[BackendServer]
    load_balancing_algorithm: Literal["round_robin", "least_conn", "ip_hash"]
    monitor_id: Optional[int] = None

class PoolCreate(PoolBase):
    pass

class PoolResponse(PoolBase):
    id: int
    class Config:
        from_attributes = True
        
# --- NEW PYDANTIC MODELS FOR WAF ---
class WAFRuleSetBase(BaseModel):
    name: str
    excluded_rule_ids: List[int] = Field(default_factory=list)

class WAFRuleSetCreate(WAFRuleSetBase):
    pass
    
class WAFRuleSetResponse(WAFRuleSetBase):
    id: int
    class Config:
        from_attributes = True

# --- NEW PYDANTIC MODELS FOR DATACENTER ---
class DatacenterBase(BaseModel):
    name: str
    location: Optional[str] = None
    nginx_ip: str
    api_url: str

class DatacenterCreate(DatacenterBase):
    pass

class DatacenterResponse(DatacenterBase):
    id: int
    class Config:
        from_attributes = True

# --- NEW PYDANTIC MODELS FOR GSLB SERVICE ---
class GeoIPMapItem(BaseModel):
    country_code: str = Field(..., min_length=2, max_length=2, description="Two-letter ISO country code (e.g., 'US', 'DE').")
    datacenter_id: int = Field(..., description="The ID of the datacenter to route traffic to.")

class GeoIPMap(BaseModel):
    default_datacenter_id: int
    mappings: List[GeoIPMapItem] = Field(default_factory=list)

class GSLBServiceBase(BaseModel):
    domain_name: str
    load_balancing_algorithm: Literal["round_robin", "geo"] = "round_robin"
    datacenters: List[int]
    geoip_map: Optional[GeoIPMap] = Field(None, description="GeoIP routing map for 'geo' algorithm.")

class GSLBServiceCreate(GSLBServiceBase):
    pass

class GSLBServiceResponse(GSLBServiceBase):
    id: int
    class Config:
        from_attributes = True

# --- UPDATED PYDANTIC MODELS FOR SERVICE ---
class ServiceBase(BaseModel):
    service_type: Literal["http", "tcp", "udp"]
    listen_port: Optional[int] = None
    domain_name: Optional[str] = None
    pool_id: Optional[int] = None
    gslb_service_id: Optional[int] = None
    datacenter_id: Optional[int] = None
    enabled: bool = True
    forward_scheme: Literal["http", "https"] = "http"
    websockets_support: bool = True
    waf_enabled: bool = False
    waf_ruleset_id: Optional[int] = None # NEW FIELD
    session_persistence: bool = False
    certificate_name: str = "dummy"
    force_ssl: bool = False
    http2_support: bool = False
    hsts_enabled: bool = False
    hsts_subdomains: bool = False
    basic_auth_user: Optional[str] = None
    basic_auth_pass: Optional[str] = None
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