from pydantic import BaseModel
from typing import List, Any


class Anomaly(BaseModel):
    ts: str
    value: float
    z: float | None = None
    method: str
