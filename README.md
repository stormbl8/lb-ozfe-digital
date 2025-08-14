# ozfedigital-lb: Comprehensive Load Balancer & API Gateway with AI-Powered Anomaly Detection

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Architecture](#architecture)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Cloning the Repository](#cloning-the-repository)
    *   [Environment Variables](#environment-variables)
    *   [Building and Running with Docker Compose](#building-and-running-with-docker-compose)
5.  [Running the Application](#running-the-application)
6.  [Key Components and How They Work](#key-components-and-how-they-work)
    *   [Backend (FastAPI)](#backend-fastapi)
    *   [Frontend (React)](#frontend-react)
    *   [Nginx](#nginx)
    *   [AI Agent](#ai-agent)
    *   [Prometheus](#prometheus)
    *   [Grafana](#grafana)
    *   [License Generator](#license-generator)
7.  [Testing](#testing)
8.  [Troubleshooting](#troubleshooting)
9.  [Contributing](#contributing)

## 1. Project Overview

`ozfedigital-lb` is a robust and scalable load balancing and API gateway solution designed to manage and secure your web traffic. It combines the power of Nginx for high-performance traffic distribution, a FastAPI backend for intuitive management, and a React-based frontend for a rich user interface. A key differentiator is its integrated AI agent, which provides real-time anomaly detection to proactively identify and alert on unusual traffic patterns, enhancing the reliability and security of your services.

## 2. Features

*   **Advanced Load Balancing:** Supports HTTP, TCP, and UDP proxying with various algorithms including Round Robin, Least Connections, IP Hash, and more.
*   **Comprehensive Service Management:** Intuitive creation, configuration, and monitoring of services, backend pools, and health checks.
*   **Secure SSL/TLS Handling:** Centralized management of SSL certificates, forced SSL redirection, HTTP/2 support, and HSTS (HTTP Strict Transport Security).
*   **Integrated Web Application Firewall (WAF):** Leverages ModSecurity with the OWASP Core Rule Set (CRS) to protect against common web vulnerabilities.
*   **Basic DDoS Protection:** Configurable limits for maximum connections per IP and various client timeouts to mitigate denial-of-service attacks.
*   **Global Server Load Balancing (GSLB):** Distribute traffic across multiple geographical datacenters with intelligent routing, including GeoIP-based decisions.
*   **User Authentication & Authorization:** Secure user management with role-based access control (admin, read-only).
*   **Real-time Monitoring & Visualization:** Seamless integration with Prometheus for metrics collection and Grafana for customizable dashboards, providing deep insights into traffic, performance, and system health.
*   **AI-Powered Anomaly Detection:** An intelligent agent analyzes traffic metrics to detect and alert on unusual behavior, helping to identify potential issues before they impact users.
*   **Flexible API Gateway:** Centralized control over routing, security policies, and traffic management for all your microservices and applications.

## 3. Architecture

The `ozfedigital-lb` system is designed as a microservices-based application, orchestrated using Docker Compose. Each core component runs in its own container, facilitating scalability, maintainability, and independent deployment.

**Key Components:**

*   **Frontend (React):** The user interface, providing a comprehensive dashboard for managing services, pools, monitors, WAF rules, and GSLB configurations.
*   **Backend (FastAPI):** The central API server that handles all business logic. It interacts with the PostgreSQL database for data persistence, manages Nginx configurations dynamically, and provides endpoints for the frontend and the AI agent.
*   **Nginx:** The high-performance reverse proxy and load balancer. It's dynamically configured by the Backend service to route and manage incoming traffic based on the defined services. It handles HTTP, HTTPS, TCP, and UDP traffic.
*   **PostgreSQL:** The relational database used by the Backend service to store all configuration data (services, pools, users, etc.).
*   **AI Agent (Python):** A separate service responsible for collecting metrics from Prometheus, analyzing them for anomalies, and potentially triggering alerts or actions.
*   **Prometheus:** A monitoring system that collects metrics from various services (e.g., Nginx Exporter, AI Agent) and stores them as time-series data.
*   **Grafana:** A data visualization and dashboarding tool that connects to Prometheus to display real-time insights into the system's performance and health.
*   **Nginx Exporter:** A Prometheus exporter that exposes Nginx metrics, allowing Prometheus to scrape and collect data about Nginx's performance and traffic.

**Data Flow & Interaction:**

1.  Users interact with the **Frontend**.
2.  The **Frontend** communicates with the **Backend API** to retrieve and send configuration data.
3.  The **Backend** stores and retrieves data from **PostgreSQL**.
4.  When configurations related to Nginx (services, pools) are changed via the **Backend**, the **Backend** dynamically generates and applies new Nginx configurations.
5.  **Nginx** handles incoming client traffic, routing it to the appropriate backend servers based on its configuration.
6.  **Nginx Exporter** exposes Nginx metrics, which are scraped by **Prometheus**.
7.  The **AI Agent** queries **Prometheus** for metrics, performs anomaly detection, and can send alerts.
8.  **Grafana** visualizes the metrics collected by **Prometheus**, providing dashboards for system monitoring.

**Volumes:**

*   `app_data`: Persistent storage for Nginx configurations and potentially other application-specific data.
*   `postgres_data`: Persistent storage for the PostgreSQL database.
*   `grafana_data`: Persistent storage for Grafana dashboards and configurations.

**Networking:**

All services communicate within a shared Docker bridge network (`app-network`), allowing them to resolve each other by their service names.

## 4. Setup and Installation

To get `ozfedigital-lb` up and running on your local machine, follow these steps:

### Prerequisites

Ensure you have the following software installed on your system:

*   **Docker:** [Install Docker Engine](https://docs.docker.com/engine/install/)
*   **Docker Compose:** [Install Docker Compose](https://docs.docker.com/compose/install/)

### Cloning the Repository

First, clone the `ozfedigital-lb` repository to your local machine:

```bash
git clone https://github.com/your-repo/ozfedigital-lb.git
cd ozfedigital-lb
```

### Environment Variables

The project uses environment variables for configuration. A template file, `.env-local.sh`, is provided. You should copy this file and rename it to `.env`, then fill in the appropriate values.

```bash
cp .env-local.sh .env
```

Edit the `.env` file with your preferred settings. Key variables include database credentials, admin user details, and port assignments. For example:

```bash
# .env example (values may vary)
FRONTEND_CONTAINER_NAME=ozfedigital-frontend
FRONTEND_PORT=3000

BACKEND_CONTAINER_NAME=ozfedigital-backend
BACKEND_PORT=8000

NGINX_CONTAINER_NAME=ozfedigital-nginx
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
NGINX_STREAM_PORT_RANGE=50000-50010 # Example range for TCP/UDP stream services

POSTGRES_DB=ozfedigital_db
POSTGRES_USER=ozfedigital_user
POSTGRES_PASSWORD=ozfedigital_password
DATABASE_URL=postgresql+asyncpg://ozfedigital_user:ozfedigital_password@postgres/ozfedigital_db

ADMIN_USER=admin
ADMIN_PASS=adminpass
ADMIN_EMAIL=admin@example.com
SECRET_KEY=your_super_secret_key_here # CHANGE THIS IN PRODUCTION!

AI_AGENT_CONTAINER_NAME=ozfedigital-ai-agent
PROMETHEUS_URL=http://prometheus:9090
AI_AGENT_API_TOKEN=your_ai_agent_api_token # Used for AI agent to authenticate with backend
AI_AGENT_SCRAPE_INTERVAL_SEC=60
AI_AGENT_METRIC_QUERY=nginx_connections_active
AI_AGENT_LOOKBACK_MINUTES=10
AI_AGENT_PORT=8001

PROMETHEUS_CONTAINER_NAME=ozfedigital-prometheus
PROMETHEUS_PORT=9090

GRAFANA_CONTAINER_NAME=ozfedigital-grafana
GRAFANA_PORT=3001
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

NGINX_EXPORTER_CONTAINER_NAME=ozfedigital-nginx-exporter
NGINX_EXPORTER_PORT=9113

POSTGRES_VERSION=13
NGINX_EXPORTER_VERSION=1.0.0
PROMETHEUS_VERSION=2.37.0
GRAFANA_VERSION=9.0.0

# For license generation (optional)
LICENSE_KEY_PATH=./license_oezdemirmu.jwt

### Building and Running with Docker Compose

Once your `.env` file is configured, you can build and start all services using Docker Compose:

```bash
docker-compose up --build -d
```

*   `--build`: This flag forces Docker Compose to rebuild images for services that have a `build` context (e.g., `frontend`, `backend`, `nginx`, `ai-agent`). This is crucial when you make changes to the source code.
*   `-d`: This flag runs the containers in detached mode, meaning they will run in the background.

To view the logs of all running services, you can use:

```bash
docker-compose logs -f
```

To stop all services, run:

```bash
docker-compose down
```

## 5. Running the Application

After successfully starting the Docker Compose services:

*   **Frontend:** Access the web interface at `http://localhost:3000` (or the port you configured for `FRONTEND_PORT` in your `.env` file).
*   **Backend API:** The API will be available at `http://localhost:8000` (or `BACKEND_PORT`). You can access the FastAPI interactive documentation (Swagger UI) at `http://localhost:8000/docs`.
*   **Prometheus:** Access the Prometheus dashboard at `http://localhost:9090` (or `PROMETHEUS_PORT`).
*   **Grafana:** Access the Grafana dashboard at `http://localhost:3001` (or `GRAFANA_PORT`). Default credentials are `admin`/`admin` (or as configured in `.env`).

Upon first access to the frontend, you will be prompted to create an initial admin user. Use the `ADMIN_USER`, `ADMIN_PASS`, and `ADMIN_EMAIL` values from your `.env` file.

## 6. Key Components and How They Work

This section provides a deeper dive into each major component of the `ozfedigital-lb` system, explaining its role and core functionalities.

### Backend (FastAPI)

*   **Role:** The central brain of the application, providing a RESTful API for managing all aspects of the load balancer configuration.
*   **Technology:** Built with FastAPI, a modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
*   **Key Responsibilities:**
    *   **CRUD Operations:** Handles creation, retrieval, updating, and deletion of services, pools, monitors, WAF rulesets, datacenters, GSLB services, and users.
    *   **Database Interaction:** Persists all configuration data in a PostgreSQL database.
    *   **Nginx Configuration Management:** Dynamically generates and applies Nginx configuration files based on user-defined services and rules. It interacts with the Nginx container to reload configurations without service interruption.
    *   **Authentication & Authorization:** Manages user accounts, roles (admin, read-only), and JWT-based authentication for secure API access.
    *   **License Management:** Enforces licensing rules for certain features (e.g., WAF, user limits).
*   **How it Works:** The FastAPI application exposes various API endpoints. When a user makes a change via the frontend, the request is sent to the backend. The backend validates the request, updates the database, and if necessary, triggers an Nginx configuration reload. For example, creating a new service involves saving service details to the DB and then instructing Nginx to update its routing rules.

### Frontend (React)

*   **Role:** Provides a user-friendly graphical interface for interacting with the `ozfedigital-lb` system.
*   **Technology:** Developed using React, a JavaScript library for building user interfaces, and Material-UI (MUI) for a modern and responsive design.
*   **Key Responsibilities:**
    *   **Dashboard & Visualization:** Presents an overview of the system status and configured services.
    *   **Configuration Forms:** Allows users to easily create, edit, and delete services, pools, monitors, WAF rules, GSLB configurations, and user accounts through intuitive forms.
    *   **API Interaction:** Communicates with the Backend API to fetch and submit data.
    *   **User Experience:** Provides real-time feedback, notifications (via `react-hot-toast`), and a responsive layout.
*   **How it Works:** The React application renders various components based on the user's navigation. It fetches data from the Backend API using `axios` and displays it. User input in forms is captured, validated, and sent back to the Backend API to apply changes. State management is handled within React components, and routing is managed by `react-router-dom` (if used).

### Nginx

*   **Role:** The high-performance, event-driven web server and reverse proxy that acts as the core load balancer and API gateway.
*   **Technology:** Nginx, known for its stability, rich feature set, simple configuration, and low resource consumption.
*   **Key Responsibilities:**
    *   **Traffic Routing:** Directs incoming client requests to the appropriate backend servers based on configured services (domain name, path, port).
    *   **Load Balancing:** Distributes traffic across multiple backend servers using various algorithms to ensure high availability and optimal resource utilization.
    *   **SSL/TLS Termination:** Handles encrypted connections, offloading the SSL/TLS processing from backend servers.
    *   **WAF Integration:** Integrates with ModSecurity to provide Web Application Firewall capabilities, inspecting and filtering malicious traffic.
    *   **DDoS Mitigation:** Implements basic rate limiting and connection controls to protect against denial-of-service attacks.
    *   **Stream Proxying:** Handles raw TCP and UDP traffic for non-HTTP/S services.
*   **How it Works:** Nginx reads its configuration files (which are dynamically generated by the Backend). When a request arrives, Nginx matches it against its `server` blocks (for HTTP/S) or `stream` blocks (for TCP/UDP). Based on the matching rules, it forwards the request to a selected backend server from a defined pool, applying load balancing, security policies, and other directives.

### AI Agent

*   **Role:** An intelligent service designed to detect anomalies in the system's operational metrics.
*   **Technology:** A Python application that likely uses statistical methods or machine learning models for anomaly detection.
*   **Key Responsibilities:**
    *   **Metric Collection:** Periodically queries Prometheus to fetch relevant time-series data (e.g., Nginx connection rates, error rates).
    *   **Anomaly Detection:** Analyzes the collected metrics to identify deviations from normal behavior. This could involve statistical thresholds (like Z-score), forecasting models, or other ML techniques.
    *   **Alerting/Actioning:** If an anomaly is detected, it can trigger alerts (e.g., via Slack, email) or potentially initiate automated actions (e.g., scaling adjustments, traffic rerouting - though this might be an advanced future feature).
*   **How it Works:** The AI Agent runs as a background process. At configured intervals, it makes API calls to Prometheus to retrieve specific metrics. It then processes this data, applies its anomaly detection logic, and if an anomaly is found, it uses the Backend API or other notification channels to report the event.

### Prometheus

*   **Role:** A powerful open-source monitoring system that collects and stores metrics as time-series data.
*   **Technology:** Written in Go, optimized for performance and reliability.
*   **Key Responsibilities:**
    *   **Scraping:** Pulls metrics from configured targets (e.g., Nginx Exporter, AI Agent's own metrics endpoint if it exposes any).
    *   **Storage:** Stores collected metrics efficiently, allowing for long-term retention and querying.
    *   **Querying (PromQL):** Provides a flexible query language (PromQL) to select and aggregate time-series data.
*   **How it Works:** Prometheus is configured with a `prometheus.yml` file that defines its scraping targets and rules. It periodically sends HTTP requests to these targets' `/metrics` endpoints, collects the exposed metrics, and stores them in its time-series database. The AI Agent and Grafana then query this data for analysis and visualization.

### Grafana

*   **Role:** A leading open-source platform for monitoring and observability, used for visualizing time-series data.
*   **Technology:** Written in Go and TypeScript, providing a rich web interface.
*   **Key Responsibilities:**
    *   **Data Source Integration:** Connects to various data sources, primarily Prometheus in this setup.
    *   **Dashboarding:** Allows users to create highly customizable and interactive dashboards with a wide range of visualization panels (graphs, gauges, tables, etc.).
    *   **Alerting:** Can be configured to send alerts based on thresholds defined on metrics.
*   **How it Works:** Grafana connects to Prometheus as a data source. Users can then build dashboards by writing PromQL queries to retrieve specific metrics from Prometheus. These queries are used to populate panels that visualize the data, providing real-time insights into the system's performance, traffic, and health metrics.

### License Generator

*   **Role:** A utility service used to generate license files for the `ozfedigital-lb` application.
*   **Technology:** A Python script (`license-generator.py`).
*   **Key Responsibilities:**
    *   **License Creation:** Generates JWT (JSON Web Token) based license files with specific features and limitations (e.g., user limits, enabled features like WAF).
*   **How it Works:** This service is typically run once to create a license file (`license_oezdemirmu.jwt`). The generated license file is then mounted into the `backend` service, which reads and enforces the defined licensing rules. This ensures that certain features or user capacities are only available with a valid license.

## 7. Testing

To ensure the stability and correctness of the `ozfedigital-lb` system, various testing approaches can be employed:

### Unit Tests

*   **Backend:** Python unit tests are located in the `test/` directory. You can run them using `pytest`.
    ```bash
    # From the project root, assuming backend service is running or Python environment is set up
    docker-compose exec backend pytest
    ```
*   **Frontend:** React components can be tested using `react-testing-library` and `jest`. (Specific commands would be in `frontend/package.json`)
    ```bash
    # From the project root
    docker-compose exec frontend npm test
    ```
*   **AI Agent:** Python unit tests for the AI agent's logic. (Specific commands would be in `ai-agent/requirements.txt` or `ai-agent/app/main.py`)
    ```bash
    # From the project root
    docker-compose exec ai-agent pytest
    ```

### Integration Tests

Integration tests would involve verifying the interaction between different services (e.g., Frontend communicating with Backend, Backend configuring Nginx). These typically involve making API calls and checking the system's state.

### End-to-End (E2E) Tests

E2E tests simulate real user scenarios, interacting with the frontend and verifying the entire system's behavior. Tools like Cypress or Playwright could be used for this.

### Manual Testing

After deployment, thoroughly test all features via the frontend UI:

1.  **Access Frontend:** Navigate to `http://localhost:3000`.
2.  **Create Admin User:** Follow the prompts to create the initial admin user.
3.  **Login:** Log in with the created admin credentials.
4.  **Create Services:** Add HTTP, TCP, and UDP services with various configurations (pools, monitors, WAF, SSL).
5.  **Verify Nginx Configuration:** Check if Nginx is correctly routing traffic to your test backend servers.
6.  **Monitor Metrics:** Observe Prometheus and Grafana dashboards for traffic and performance metrics.
7.  **Trigger Anomalies:** (Advanced) Attempt to generate traffic patterns that might trigger the AI agent's anomaly detection.

## 8. Troubleshooting

*   **Containers not starting:**
    *   Check `docker-compose logs` for specific error messages.
    *   Ensure no other services are running on the required ports (3000, 8000, 80, 443, 9090, 3001, etc.).
    *   Verify your `.env` file is correctly configured and all necessary variables are set.
*   **Frontend not loading/API errors:**
    *   Check browser console for JavaScript errors.
    *   Verify the Backend service is running and accessible (`http://localhost:8000/docs`).
    *   Ensure the `apiUrl` in the frontend configuration points to the correct backend address.
*   **Nginx configuration issues:**
    *   Check Nginx container logs (`docker-compose logs nginx`).
    *   Verify the Backend is correctly generating and applying configurations. Look for errors in backend logs related to Nginx interaction.
*   **Prometheus/Grafana not showing data:**
    *   Ensure `nginx-exporter` is running and accessible to Prometheus.
    *   Check Prometheus targets status in its UI (`http://localhost:9090/targets`).
    *   Verify Grafana data source configuration.
*   **AI Agent not detecting anomalies:**
    *   Check AI Agent logs for errors or processing issues.
    *   Verify the `PROMETHEUS_URL` and `AI_AGENT_METRIC_QUERY` in its `.env` configuration.

## 9. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

