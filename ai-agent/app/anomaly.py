from datetime import datetime, timedelta
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .prom_client import PromClient
from .config import settings


def rolling_zscore(series: pd.Series, window: int = 5) -> pd.Series:
    """
    Compute rolling z-score; return z-score series aligned with original index.
    """
    mean = series.rolling(window=window, min_periods=1).mean()
    std = series.rolling(window=window, min_periods=1).std(ddof=0).replace(0, np.nan)
    z = (series - mean) / std
    return z.fillna(0)


def detect_anomalies_from_values(values: List[float], timestamps: List[datetime]) -> List[Dict[str, Any]]:
    if len(values) < 3:
        return []
    s = pd.Series(values, index=pd.to_datetime(timestamps))
    z = rolling_zscore(s, window=3)
    anomalies = []
    # rule: abs(z) > 3 => anomaly
    for ts, val, zval in zip(s.index, s.values, z.values):
        if abs(zval) > 3:
            anomalies.append({"ts": ts.isoformat(), "value": float(val), "z": float(zval), "method": "zscore"})
    # If no anomalies by zscore, fallback to IsolationForest for subtle cases
    if not anomalies and len(values) >= 6:
        X = np.array(values).reshape(-1, 1)
        iso = IsolationForest(contamination=0.05, random_state=42)
        preds = iso.fit_predict(X)  # -1 outlier
        for i, p in enumerate(preds):
            if p == -1:
                anomalies.append({"ts": pd.to_datetime(timestamps[i]).isoformat(), "value": float(values[i]), "method": "isolation_forest"})
    return anomalies


def analyze_prometheus(prom: PromClient, expr: str, lookback_minutes: int = None) -> dict:
    lookback = lookback_minutes or settings.lookback_minutes
    end = datetime.utcnow()
    start = end - timedelta(minutes=lookback)
    data = prom.query_range(expr, start, end, step="15s")
    result = {"anomalies": [], "samples": 0, "start": start.isoformat(), "end": end.isoformat()}
    if data.get("status") != "success":
        return {"error": "prometheus_query_failed", "raw": data}
    series_list = data.get("data", {}).get("result", [])
    # If aggregated expression produces a single series, inspect that
    if not series_list:
        return result
    # choose first series (for aggregated total); could be extended to per-instance
    series = series_list[0]
    values = [float(v[1]) for v in series.get("values", [])]
    timestamps = [datetime.utcfromtimestamp(int(float(v[0]))) for v in series.get("values", [])]
    result["samples"] = len(values)
    result["anomalies"] = detect_anomalies_from_values(values, timestamps)
    return result
