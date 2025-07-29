from pydantic import BaseModel, Field
from typing import Optional

# For Services
class Service(BaseModel):
    id: Optional[int] = None # <-- THE ONLY CHANGE IS HERE
    domain_name: str
    forward_scheme: str = "http"
    backend_host: str
    backend_port: int
    
    # Toggles
    enabled: bool = True
    cache_assets: bool = False
    websockets_support: bool = True
    waf_enabled: bool = False
    
    # SSL Options
    certificate_name: str = "dummy"
    force_ssl: bool = False
    http2_support: bool = False
    hsts_enabled: bool = False
    hsts_subdomains: bool = False
    
    # Advanced
    advanced_config: Optional[str] = None

# For Settings
class RateLimitSettings(BaseModel):
    enabled: bool = False
    requests_per_second: int = Field(default=10, gt=0)
    burst: int = Field(default=20, gt=0)

class AppSettings(BaseModel):
    rate_limiting: RateLimitSettings = RateLimitSettings()