# Interactive Load Balancer UI

This project is a web-based interface for managing an NGINX load balancer, built with React, FastAPI, and Docker.

## ✨ Features

*   **Dashboard:** Overview of system status and key metrics.
*   **Proxy Hosts:** Manage NGINX proxy configurations for various services.
*   **Server Pools:** Define and manage backend server groups.
*   **SSL Certificates:** Handle SSL/TLS certificate management.
*   **Health Monitors:** Configure health checks for backend servers.
*   **WAF Rules:** Manage Web Application Firewall rules.
*   **GSLB Management:** Global Server Load Balancing configuration.
*   **Logs:** View system and NGINX logs.
*   **Licenses:** Manage project licenses.
*   **User Management:** Administer user accounts (for admin users).
*   **Settings:** Configure application settings.
*   **User Profile:** Manage user-specific settings and change password.

## 🚀 How to Run

1.  **Prerequisites:** You must have Docker and Docker Compose installed.

2.  **Create Dummy Certificates:** For local HTTPS to work, you need placeholder certificates. Run this command from the project root:
    ```bash
    mkdir -p data/certs/dummy
    openssl req -x509 -nodes -newkey rsa:2048 -keyout data/certs/dummy/dummy.key -out data/certs/dummy/dummy.crt -subj "/CN=dummy"
    ```

3.  **Environment File:** Rename `sample.env` to `.env`. Fill in your Cloudflare details and set a secure password for the initial admin user.

4.  **Build and Launch:** Run the following command from the project root directory:
    ```bash
    docker-compose up --build
    ```

5.  **Access Services:**
    * **Web UI:** [http://localhost:88](http://localhost:88)
    * **Load Balancer HTTP Port:** `80`
    * **Load Balancer HTTPS Port:** `443`

### Environment Variables

The `.env` file (renamed from `sample.env`) should contain the following:
*   `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: PostgreSQL database credentials.
*   `DATABASE_URL`: Database connection string.
*   `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_EMAIL`: Initial admin user credentials.
*   `SECRET_KEY`: A strong secret key for security.
*   (Optional) Cloudflare API details if Cloudflare integration is used.

## 🏗️ Architecture

*   **Frontend:** A React single-page application served by NGINX provides the user interface.
*   **Backend:** A FastAPI application that serves the API. It manages NGINX configurations, interacts with the Docker daemon for NGINX service control, and handles user authentication and data storage.
*   **NGINX Proxy:** The core NGINX container that runs the generated configurations and handles the actual traffic proxying.
*   **PostgreSQL:** A relational database used by the backend to store application data.
*   **AI Agent (Optional):** An AI-powered service for anomaly detection and metric analysis, integrating with Prometheus. (Currently commented out in `docker-compose.yaml`).
*   **Prometheus (Optional):** A monitoring system that collects metrics from various services, including the AI Agent.
*   **Grafana (Optional):** A data visualization and dashboarding tool used to display metrics and anomalies from Prometheus.

## ⚙️ Advanced Setup: AI Agent & Monitoring

To enable the AI Agent and integrate monitoring with Prometheus and Grafana:

1.  **Uncomment AI Agent:** In `docker-compose.yaml`, uncomment the `ai-agent` service block.
2.  **Add Prometheus and Grafana Services:** You will need to add `prometheus` and `grafana` services to your `docker-compose.yaml`. An example configuration might look like this (you may need to adjust paths and ports):

    ```yaml
    # Example Prometheus Service
    prometheus:
      image: prom/prometheus:latest
      container_name: prometheus
      volumes:
        - ./prometheus/ai-agent-scrap.yaml:/etc/prometheus/prometheus.yml
      command: --config.file=/etc/prometheus/prometheus.yml
      ports:
        - "9090:9090"
      networks:
        - app-network

    # Example Grafana Service
    grafana:
      image: grafana/grafana:latest
      container_name: grafana
      ports:
        - "3000:3000"
      volumes:
        - grafana_data:/var/lib/grafana
        - ./grafana/ai-agent-anomalies-dashboard.json:/etc/grafana/provisioning/dashboards/ai-agent-anomalies-dashboard.json
      environment:
        - GF_SECURITY_ADMIN_USER=admin
        - GF_SECURITY_ADMIN_PASSWORD=admin
      depends_on:
        - prometheus
      networks:
        - app-network
    ```
    *(Note: You might need to create a `grafana_data` volume and adjust dashboard provisioning.)*

3.  **Configure AI Agent:** Ensure the `ai-agent` environment variables in `docker-compose.yaml` are correctly set, especially `PROMETHEUS_URL`.
4.  **Rebuild and Launch:** Run `docker-compose up --build` again to include the new services.

## 🔑 License Generation

The `license-generator/` directory contains scripts and a Python application (`license-generator.py`) to generate licenses for the application. This is typically used for development or administrative purposes to create new license keys.

## 🧑‍💻 Development

### Running Frontend Separately

To run the frontend in development mode (e.g., for hot-reloading):

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`

### Running Backend Separately

To run the backend in development mode:

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `pip install -r requirements.txt`
3.  Start the FastAPI application: `uvicorn main:app --reload` (ensure `uvicorn` is installed: `pip install uvicorn`)

### Running Tests

*   **Backend Tests:**
    1.  Navigate to the project root.
    2.  Run `pytest` (ensure `pytest` is installed in your backend environment).
        Example: `pytest test/test_anomaly.py` (for specific tests) or `pytest backend/tests/` (if tests are in a `tests` directory within backend).

*   **Frontend Tests:**
    1.  Navigate to the `frontend` directory: `cd frontend`
    2.  Run `npm test`

## 📄 License

Proprietary - All rights reserved.
