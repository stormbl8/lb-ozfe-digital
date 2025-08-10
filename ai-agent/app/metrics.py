from prometheus_client import Counter, Gauge, generate_latest, CollectorRegistry, CONTENT_TYPE_LATEST

registry = CollectorRegistry()

anomaly_count = Counter("ai_agent_anomalies_total", "Total anomalies detected by ai-agent", registry=registry)
last_check_unix = Gauge("ai_agent_last_check_unix", "Last check (epoch seconds)", registry=registry)
