import time
import threading
from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse, PlainTextResponse
from typing import Optional
from .config import settings
from .prom_client import PromClient
from .anomaly import analyze_prometheus
from .metrics import anomaly_count, last_check_unix, registry
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="ai-agent (passive anomaly detector)")

prom = PromClient()


def check_token(x_api_token: Optional[str] = Header(None)):
    if settings.api_token:
        if x_api_token != settings.api_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API token")
    return True


# In-memory latest result
_latest = {"anomalies": [], "samples": 0, "start": None, "end": None}


def poller():
    while True:
        try:
            res = analyze_prometheus(prom, settings.metric_query, settings.lookback_minutes)
            # update _latest
            _latest.update(res)
            # metrics
            last_check_unix.set(int(time.time()))
            if res.get("anomalies"):
                anomaly_count.inc(len(res["anomalies"]))
        except Exception as e:
            # keep running; do not crash
            print("ai-agent poller error:", e)
        time.sleep(settings.scrape_interval_sec)


@app.on_event("startup")
def startup_event():
    # Start background thread (non-daemon so uvicorn keeps it alive)
    t = threading.Thread(target=poller, daemon=True)
    t.start()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/anomalies", dependencies=[Depends(check_token)])
def anomalies():
    return JSONResponse(content=_latest)


@app.get("/metrics")
def metrics():
    data = generate_latest(registry)
    return PlainTextResponse(data.decode("utf-8"), media_type=CONTENT_TYPE_LATEST)
