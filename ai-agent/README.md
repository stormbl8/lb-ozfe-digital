ai-agent
========

Passive anomaly detection microservice for load balancer telemetry.

- Queries Prometheus for metrics.
- Runs rolling z-score anomaly detection and IsolationForest fallback.
- Exposes REST endpoints and Prometheus metrics.

Config is passed via environment variables (no .env):
- PROMETHEUS_URL (required) -- e.g. http://prometheus:9090
- API_TOKEN (optional) -- simple token to protect endpoints
- SCRAPE_INTERVAL_SEC (optional, default 30)
- METRIC_QUERY (optional, default request rate example)

Run with docker-compose.ai.yml or merge into your docker-compose stack.

See AI_INTEGRATION.md for detailed merge instructions.
