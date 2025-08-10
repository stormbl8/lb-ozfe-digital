AI Integration (Passive Anomaly Detection)
=========================================

Overview
--------
This microservice pulls metrics from Prometheus and detects anomalies. It is intentionally passive:
- It does NOT modify NGINX or ModSecurity.
- It exposes anomalies via REST and as Prometheus metrics for Grafana.

Files to add
------------
- ai-agent/*  (service)
- prometheus/ai-agent-scrape.yml  (snippet to add to Prometheus)
- grafana/ai-agent-anomalies-dashboard.json  (optional dashboard)
- docker-compose.ai.yml  (compose you can merge)

High-level steps
----------------
1. Copy `ai-agent/` into your repo.
2. Add `ai-agent` service to your docker-compose (or run `docker-compose -f docker-compose.ai.yml up -d`).
3. Ensure Prometheus can be reached by the ai-agent container (PROMETHEUS_URL in compose).
4. Add the scrape config snippet to your Prometheus `scrape_configs`:
   - include `file_sd_configs` or merge the job into your `prometheus.yml`.
5. Import the Grafana JSON if you use Grafana.
6. Start the ai-agent and check `/health` and `/anomalies`.

Important env vars (set in docker-compose)
- PROMETHEUS_URL: http://prometheus:9090
- API_TOKEN: a token for basic auth (optional but recommended)
- SCRAPE_INTERVAL_SEC: 30 (default)

Endpoints
---------
- GET /health
- GET /anomalies  -> returns latest anomalies
- GET /metrics   -> Prometheus metrics (exposed via prometheus_client)

Future (non-destructive) steps
------------------------------
- Wire ai-agent alerts to Alertmanager (optional).
- If satisfied, enable "action" mode: push decisions to CrowdSec or send a warning webhook for manual operator action.
- Add NGINX/OpenResty integration once you trust the detections.

Security
--------
Service should be internal-only (docker network only). Use the API_TOKEN environment var to protect endpoints.

Contact
-------
If you want me to integrate automated CrowdSec actions or a ModSecurity rule generator after testing, I can add them behind feature flags.
