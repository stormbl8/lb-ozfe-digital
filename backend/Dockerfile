FROM python:3.11-slim

WORKDIR /app

# Create a secure, non-world-readable directory for certbot credentials
RUN mkdir -p /etc/letsencrypt/credentials && chmod 600 /etc/letsencrypt/credentials

COPY requirements.txt .
# Install certbot and its plugin system-wide
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]