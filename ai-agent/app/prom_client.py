import time
import requests
from datetime import datetime, timedelta
from typing import Any
from .config import settings


class PromClient:
    def __init__(self, base_url: str | None = None):
        self.base = base_url or settings.prometheus_url.rstrip("/")

    def query_range(self, expr: str, start: datetime, end: datetime, step: str = "15s") -> dict[str, Any]:
        url = f"{self.base}/api/v1/query_range"
        params = {
            "query": expr,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "step": step,
        }
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()

    def instant_query(self, expr: str) -> dict:
        url = f"{self.base}/api/v1/query"
        params = {"query": expr}
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
