#!/bin/bash
# This script sets up environment variables for the local development environment.

# PostgreSQL Database Credentials
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgrespwd
export POSTGRES_DB=lb-ozfe-digital
# Ensure 'lb-ui-postgres' matches the service name in your docker-compose.yaml
export DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"

# Backend Application Settings
export SECRET_KEY="e2a865a7c2b5d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9" # IMPORTANT: Change this to a long, random string!

# AI Agent Integration Settings
# Ensure 'ai-agent' and '5000' match your docker-compose service name and port for the AI agent
export AI_AGENT_URL="http://ai-agent:5000"
export AI_AGENT_API_TOKEN="e2a865a7c2b5d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9" # IMPORTANT: This must match the token configured in your ai-agent!

# Initial Admin User (for first-time setup)
export ADMIN_USER='oezdemirmu'
export ADMIN_EMAIL='volkan.oezdemir@ozfe-digital.de'
export ADMIN_PASS='#02081986#Bahar!'

# --- New Variables for Docker Compose Simplification ---

# Container Names
export FRONTEND_CONTAINER_NAME=lb-ui-frontend
export BACKEND_CONTAINER_NAME=lb-ui-backend
export NGINX_CONTAINER_NAME=nginx-proxy
export NGINX_EXPORTER_CONTAINER_NAME=nginx-exporter
export POSTGRES_CONTAINER_NAME=lb-ui-postgres
export AI_AGENT_CONTAINER_NAME=ai-agent
export PROMETHEUS_CONTAINER_NAME=prometheus
export GRAFANA_CONTAINER_NAME=grafana

# Ports
export FRONTEND_PORT=88
export BACKEND_PORT=8000
export NGINX_HTTP_PORT=80
export NGINX_HTTPS_PORT=443
export NGINX_STREAM_PORT_RANGE=10000-10100
export NGINX_EXPORTER_PORT=9113
export AI_AGENT_PORT=5000
export PROMETHEUS_PORT=9090
export GRAFANA_PORT=3000

# Image Versions
export NGINX_EXPORTER_VERSION=0.11.0
export POSTGRES_VERSION=15-alpine
export PROMETHEUS_VERSION=latest
export GRAFANA_VERSION=latest

# AI Agent Specific Environment Variables
export PROMETHEUS_URL=http://prometheus:9090
export AI_AGENT_SCRAPE_INTERVAL_SEC=30
export AI_AGENT_METRIC_QUERY='sum(rate(nginx_http_requests_total[5m]))'
export AI_AGENT_LOOKBACK_MINUTES=10

# Grafana Specific Environment Variables
export GRAFANA_ADMIN_USER=admin
export GRAFANA_ADMIN_PASSWORD=admin