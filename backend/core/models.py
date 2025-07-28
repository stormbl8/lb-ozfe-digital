from pydantic import BaseModel, Field

# For Services
class Service(BaseModel):
    domain_name: str
    backend_host: str
    backend_port: int
    certificate_name: str | None = None
    advanced_config: str | None = None
    waf_enabled: bool = False # <-- ADD THIS LINE

# For Settings
class RateLimitSettings(BaseModel):
    enabled: bool = False
    requests_per_second: int = Field(default=10, gt=0)
    burst: int = Field(default=20, gt=0)

class AppSettings(BaseModel):
    rate_limiting: RateLimitSettings = RateLimitSettings()