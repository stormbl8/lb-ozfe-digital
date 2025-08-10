# Interactive Load Balancer UI

This project is a web-based interface for managing an NGINX load balancer, built with React, FastAPI, and Docker.

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

## Architecture

-   **Frontend:** A React single-page application served by NGINX provides the user interface.
-   **Backend:** A FastAPI application that serves the API. It generates NGINX config files and reloads the NGINX service by communicating with the Docker daemon.
-   **NGINX Proxy:** The core NGINX container that runs the generated configurations and handles the actual traffic proxying.