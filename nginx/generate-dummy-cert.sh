#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs/dummy"
KEY_FILE="${CERT_DIR}/dummy.key"
CERT_FILE="${CERT_DIR}/dummy.crt"

# Check if the certificate already exists
if [ -f "$CERT_FILE" ]; then
    echo "Dummy certificate already exists. Skipping generation."
else
    echo "Dummy certificate not found. Generating a new one..."
    # Create the directory if it doesn't exist
    mkdir -p "$CERT_DIR"

    # Generate the self-signed certificate. `openssl` is pre-installed in the alpine base image.
    openssl req -x509 -nodes -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=dummy-cert"
    
    echo "Dummy certificate generated successfully."
fi

# Execute the original command to start NGINX
exec nginx -g 'daemon off;'