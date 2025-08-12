FROM python:3.11-slim

WORKDIR /app

# Create a secure, non-world-readable directory for certbot credentials
RUN mkdir -p /etc/letsencrypt/credentials && chmod 600 /etc/letsencrypt/credentials

# Install dependencies first to leverage Docker's caching
# Explicitly upgrade pip before installing other dependencies
RUN pip install --upgrade pip

COPY requirements.txt .

# Re-install dependencies from scratch to fix corrupted installations
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app"]