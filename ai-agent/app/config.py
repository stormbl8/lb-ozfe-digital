from pydantic import BaseSettings, Field
from typing import Optional, List, Dict


class Settings(BaseSettings):
    prometheus_url: str = Field(..., env="PROMETHEUS_URL")
    api_token: str | None = Field(None, env="API_TOKEN")
    scrape_interval_sec: int = Field(30, env="SCRAPE_INTERVAL_SEC")
    metric_query: str = Field(
        'sum(rate(nginx_http_requests_total[1m]))',
        env="METRIC_QUERY"
    )
    lookback_minutes: int = Field(10, env="LOOKBACK_MINUTES")

    # New Alerting Settings
    ALERT_ENABLED: bool = Field(False)
    ALERT_CHANNELS: List[str] = Field([]) # e.g., ["slack", "email"]
    SLACK_WEBHOOK_URL: Optional[str] = Field(None)
    EMAIL_RECIPIENTS: List[str] = Field([]) # e.g., ["user@example.com"]
    ALERT_THRESHOLD_ZSCORE: float = Field(2.0)
    ALERT_COOLDOWN_MINUTES: int = Field(5)

    # New Actioning Settings
    ACTION_ENABLED: bool = Field(False)
    ACTION_RULES: List[Dict] = Field([]) # List of dictionaries for rules

    class Config:
        env_file = None
        case_sensitive = False


settings = Settings()
