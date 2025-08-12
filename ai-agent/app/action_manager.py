from typing import Dict, Any, List

from .config import settings

def restart_nginx():
    print("Simulating Nginx restart action.")
    # In a real scenario, this would interact with Docker API or run a shell command
    # For example: subprocess.run(["docker", "restart", "nginx-proxy"])

def evaluate_and_act(anomaly_data: Dict[str, Any], metric_name: str):
    if not settings.ACTION_ENABLED:
        return

    print(f"Evaluating anomaly for action: {anomaly_data}")

    for rule in settings.ACTION_RULES:
        # Basic rule matching for demonstration
        if (
            rule.get("anomaly_method") == anomaly_data.get("method") and
            rule.get("metric") == metric_name and
            rule.get("action") == "restart_nginx"
        ):
            print(f"Rule matched! Executing action: {rule.get('action')}")
            restart_nginx()
            return # Execute first matching rule and exit
