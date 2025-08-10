from ai_agent.app.anomaly import detect_anomalies_from_values
from datetime import datetime, timedelta

def test_detect_anomalies_simple():
    now = datetime.utcnow()
    # normal values then a spike
    values = [10, 12, 11, 13, 12, 70, 11, 12]
    timestamps = [now - timedelta(seconds=15*i) for i in range(len(values)-1, -1, -1)]
    anomalies = detect_anomalies_from_values(values, timestamps)
    assert isinstance(anomalies, list)
    assert any(a["method"] in ("zscore", "isolation_forest") for a in anomalies)
