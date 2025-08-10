from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    prometheus_url: str = Field(..., env="PROMETHEUS_URL")
    api_token: str | None = Field(None, env="API_TOKEN")
    scrape_interval_sec: int = Field(30, env="SCRAPE_INTERVAL_SEC")
    metric_query: str = Field(
        'sum(rate(nginx_http_requests_total[1m]))',
        env="METRIC_QUERY"
    )
    lookback_minutes: int = Field(10, env="LOOKBACK_MINUTES")

    class Config:
        env_file = None
        case_sensitive = False


settings = Settings()
