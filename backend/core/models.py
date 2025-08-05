import re
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal

class BackendServer(BaseModel):
    host: str
    port: int
    max_fails: Optional[int] = 3
    fail_timeout: Optional[str] = "10s"

    @validator('fail_timeout')
    def validate_fail_timeout_format(cls, v):
        if v is None:
            return v
        if not re.match(r'^\d+(ms|s|m|h|d|w|M|y)?$', v):
            raise ValueError('Invalid format. Must be a number optionally followed by a unit like "s" or "m".')
        return v

class Pool(BaseModel):
    id: Optional[int] = None
    name: str
    backend_servers: List[BackendServer] = []
    load_balancing_algorithm: Literal["round_robin", "least_conn", "ip_hash"] = "round_robin"

    @validator('backend_servers')
    def pool_must_not_be_empty(cls, v):
        if not v:
            raise ValueError('Server Pool must have at least one server.')
        return v

class Service(BaseModel):
    id: Optional[int] = None
    service_type: Literal["http", "tcp", "udp"] = "http"
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
    
    access_list_ips: List[str] = []
    access_list_type: Literal["allow", "deny"] = "allow"
    basic_auth_user: Optional[str] = None
    basic_auth_pass: Optional[str] = None
    
    advanced_config: Optional[str] = None
    
    @validator('domain_name', always=True)
    def domain_name_required_for_http(cls, v, values):
        if values.get('service_type') == 'http' and not v:
            raise ValueError('Domain Name is required for HTTP services')
        return v

    @validator('listen_port', always=True)
    def listen_port_required_for_stream(cls, v, values):
        if values.get('service_type') in ['tcp', 'udp'] and not v:
            raise ValueError('Listen Port is required for TCP/UDP services')
        return v
        
class RateLimitSettings(BaseModel):
    enabled: bool = False
    requests_per_second: int = Field(default=10, gt=0)
    burst: int = Field(default=20, gt=0)

class AppSettings(BaseModel):
    rate_limiting: RateLimitSettings = RateLimitSettings()

# --- User Authentication Models (Refactored) ---
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class User(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    role: Literal["admin", "read-only"] = "read-only"

class UserInDB(User):
    hashed_password: str
    role: Literal["admin", "read-only"] = "read-only"