#!/bin/bash

PROJECT_DIR="lb-ozfe-digital"
REPO_URL="https://github.com/your-repo/lb-ozfe-digital.git" # IMPORTANT: User needs to replace this with the actual repository URL
UI_PORT="88"

echo "Starting Load Balancer UI Installer/Updater..."

# --- 1. Check for Docker and Docker Compose ---
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker and Docker Compose to proceed."
    echo "Refer to https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
fi

if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose is not installed. Please install Docker Compose to proceed."
    echo "Refer to https://docs.docker.com/compose/install/ for installation instructions."
    exit 1
fi

echo "Docker and Docker Compose are installed. Proceeding..."

# --- 2. Git Operations (Clone or Pull) ---
if [ -d "$PROJECT_DIR" ]; then
    echo "Project directory '$PROJECT_DIR' already exists. Pulling latest changes..."
    cd "$PROJECT_DIR" || { echo "Error: Could not change to project directory."; exit 1; }
    git pull origin main # Assuming 'main' branch
    if [ $? -ne 0 ]; then
        echo "Error: Failed to pull latest changes. Please resolve manually or ensure internet connectivity."
        exit 1
    fi
else
    echo "Cloning project repository into '$PROJECT_DIR'..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to clone repository. Please check the URL and internet connectivity."
        exit 1
    fi
    cd "$PROJECT_DIR" || { echo "Error: Could not change to project directory."; exit 1; }
fi

# --- 3. Environment Setup ---
if [ ! -f ".env" ]; then
    if [ -f "sample.env" ]; then
        echo "'.env' file not found. Copying 'sample.env' to '.env'."
        cp sample.env .env
        echo "Please edit the '.env' file to configure your settings (e.g., database credentials, admin user, secret key)."
        echo "You can do this now and then re-run the script, or continue with default values if they are sufficient."
        read -p "Press Enter to continue after editing .env (or just Enter to continue without editing)..."
    else
        echo "Warning: 'sample.env' not found. Please create a '.env' file manually with necessary environment variables."
        echo "Refer to the README.md for required variables."
        read -p "Press Enter to continue..."
    fi
fi

# --- 4. Create Dummy Certificates ---
echo "Checking for dummy SSL certificates..."
if [ ! -f "data/certs/dummy/dummy.crt" ] || [ ! -f "data/certs/dummy/dummy.key" ]; then
    echo "Dummy certificates not found. Generating..."
    mkdir -p data/certs/dummy
    openssl req -x509 -nodes -newkey rsa:2048 -keyout data/certs/dummy/dummy.key -out data/certs/dummy/dummy.crt -subj "/CN=dummy"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to generate dummy certificates. OpenSSL might not be installed or there's a permission issue."
        exit 1
    fi
    echo "Dummy certificates generated."
else
    echo "Dummy certificates already exist."
fi

# --- 5. Docker Compose Operations ---
echo "Pulling and launching Docker containers using docker-compose-prod.yaml..."
# Check if docker-compose-prod.yaml exists
if [ ! -f "docker-compose-prod.yaml" ]; then
    echo "Error: docker-compose-prod.yaml not found. Please ensure it exists in the project root."
    exit 1
fi

docker-compose -f docker-compose-prod.yaml pull
if [ $? -ne 0 ]; then
    echo "Error: Docker Compose failed to pull images. Please check your network connection and image registry access."
    exit 1
fi

docker-compose -f docker-compose-prod.yaml up -d
if [ $? -ne 0 ]; then
    echo "Error: Docker Compose failed to launch containers. Please check the logs above for details."
    exit 1
}
echo "Docker containers launched successfully in detached mode using docker-compose-prod.yaml."
echo ""
echo "IMPORTANT: The 'docker-compose-prod.yaml' uses remote images. You MUST replace 'your_registry/'"
echo "           with your actual Docker image registry path in 'docker-compose-prod.yaml' for the"
echo "           frontend, backend, and nginx services."

# --- 6. Output Credentials ---
echo "Waiting for backend service to be ready (this may take a moment)..."
# A simple way to wait for the backend to be somewhat ready, though not foolproof
sleep 10

ADMIN_USER=$(grep -E '^ADMIN_USER=' .env | cut -d '=' -f 2)
ADMIN_PASS=$(grep -E '^ADMIN_PASS=' .env | cut -d '=' -f 2)

echo ""
echo "===================================================="
echo " Installation/Update Complete!"
echo "===================================================="
echo " You can access the Load Balancer UI at: http://localhost:$UI_PORT"
echo ""
echo " Initial Admin Credentials (from .env file):"
echo " Username: ${ADMIN_USER:-admin}" # Default to 'admin' if not found in .env
echo " Password: ${ADMIN_PASS:-password}" # Default to 'password' if not found in .env
echo ""
echo " IMPORTANT: If you haven't already, please edit the '.env' file"
echo "            to set a strong password for the admin user and other configurations."
echo "===================================================="
