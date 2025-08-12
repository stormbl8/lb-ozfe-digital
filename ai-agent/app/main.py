import time
import threading
import logging
import requests
from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse, PlainTextResponse
from typing import Optional
from .config import settings
from .prom_client import PromClient
from .anomaly import analyze_prometheus
from .metrics import anomaly_count, last_check_unix, registry
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

# Import new modules
from . import notifier
from . import action_manager

# Configure logging
logging.basicConfig(filename='/tmp/ai_agent_debug.log', level=logging.DEBUG,
                    format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="ai-agent (passive anomaly detector)")

prom = PromClient()


def check_token(x_api_token: Optional[str] = Header(None)):
    if settings.api_token:
        logging.debug(f"Received API Token: '{x_api_token}'")
        logging.debug(f"Expected API Token: '{settings.api_token}'")
        if x_api_token != settings.api_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API token")
    return True

# In-memory latest result
_latest = {"anomalies": [], "samples": 0, "start": None, "end": None}

# Keep track of last alert time to prevent alert storms
_last_alert_time = {} # {metric_name: timestamp}

def poller():
    while True:
        try:
            res = analyze_prometheus(prom, settings.metric_query, settings.lookback_minutes)
            logging.debug(f"analyze_prometheus returned: {res}")
            # update _latest
            _latest.update(res)
            logging.debug(f"_latest after update: {_latest}")
            # metrics
            last_check_unix.set(int(time.time()))
            if res.get("anomalies"):
                anomaly_count.inc(len(res["anomalies"]))
                for anomaly in res["anomalies"]:
                    # Check for alerting
                    if settings.ALERT_ENABLED:
                        current_time = time.time()
                        metric_name = settings.metric_query # Assuming one metric for now
                        last_alert_ts = _last_alert_time.get(metric_name, 0)

                        # Check cooldown period
                        if (current_time - last_alert_ts) > (settings.ALERT_COOLDOWN_MINUTES * 60):
                            # Check Z-score threshold if available (zscore method)
                            if anomaly.get("method") == "zscore" and abs(anomaly.get("z", 0)) < settings.ALERT_THRESHOLD_ZSCORE:
                                continue # Skip if z-score is below threshold

                            logging.info(f"Triggering alert for anomaly: {anomaly}")
                            notifier.notify_anomaly(anomaly, metric_name)
                            _last_alert_time[metric_name] = current_time

                    # Check for actioning
                    if settings.ACTION_ENABLED:
                        action_manager.evaluate_and_act(anomaly, settings.metric_query)
        except Exception as e:
            # keep running; do not crash
            logging.error(f"ai-agent poller error: {e}")
        time.sleep(settings.scrape_interval_sec)


# Define backend API URL
BACKEND_API_URL = "http://backend:8000" # Assuming 'backend' is the service name in docker-compose

@app.on_event("startup")
def startup_event():
    logging.info("Fetching AI settings from backend...")
    try:
        response = requests.get(f"{BACKEND_API_URL}/api/v1/ai_config", timeout=5)
        response.raise_for_status() # Raise an exception for HTTP errors
        ai_config_data = response.json()

        # Update settings object with fetched values
        settings.ALERT_ENABLED = ai_config_data.get("alert_enabled", False)
        settings.ALERT_CHANNELS = ai_config_data.get("alert_channels", [])
        settings.SLACK_WEBHOOK_URL = ai_config_data.get("slack_webhook_url")
        settings.EMAIL_RECIPIENTS = ai_config_data.get("email_recipients", [])
        settings.ALERT_THRESHOLD_ZSCORE = ai_config_data.get("alert_threshold_zscore", 2.0)
        settings.ALERT_COOLDOWN_MINUTES = ai_config_data.get("alert_cooldown_minutes", 5)
        settings.ACTION_ENABLED = ai_config_data.get("action_enabled", False)
        settings.ACTION_RULES = ai_config_data.get("action_rules", [])

        logging.info("AI settings fetched and applied successfully.")
        logging.debug(f"Current AI Settings: Alert Enabled={settings.ALERT_ENABLED}, Action Enabled={settings.ACTION_ENABLED}")

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch AI settings from backend: {e}. Using default settings.")
    except Exception as e:
        logging.error(f"An unexpected error occurred while processing AI settings: {e}. Using default settings.")

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
