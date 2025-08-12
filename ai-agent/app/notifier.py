import requests
import smtplib
from email.mime.text import MIMEText
from typing import List, Dict, Any

from .config import settings

def send_slack_message(message: str):
    if not settings.SLACK_WEBHOOK_URL:
        print("Slack webhook URL not configured.")
        return
    try:
        response = requests.post(
            settings.SLACK_WEBHOOK_URL,
            json={"text": message},
            timeout=5
        )
        response.raise_for_status()
        print("Slack message sent successfully.")
    except requests.exceptions.RequestException as e:
        print(f"Error sending Slack message: {e}")

def send_email(subject: str, body: str, recipients: List[str]):
    if not recipients:
        print("Email recipients not configured.")
        return
    # This is a placeholder for actual email sending logic.
    # In a real application, you would configure an SMTP server or use a service like SendGrid.
    print(f"Simulating email send to {', '.join(recipients)}:\nSubject: {subject}\nBody: {body}")

def notify_anomaly(anomaly_data: Dict[str, Any], metric_name: str):
    message = (
        f"Anomaly Detected for Metric: {metric_name}\n"
        f"Timestamp: {anomaly_data.get('ts')}\n"
        f"Value: {anomaly_data.get('value')}\n"
        f"Method: {anomaly_data.get('method')}"
    )

    if "slack" in settings.ALERT_CHANNELS:
        send_slack_message(message)

    if "email" in settings.ALERT_CHANNELS:
        send_email(f"Anomaly Alert: {metric_name}", message, settings.EMAIL_RECIPIENTS)
