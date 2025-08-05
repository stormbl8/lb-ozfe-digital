#!/bin/bash

# This script is an interactive license generator using a Docker container.
# It builds a temporary Docker image, runs it interactively, and then stops.

set -e

# Define names and directories relative to the project root
IMAGE_NAME="license-generator-image"
CONTAINER_NAME="license-generator-container"
LICENSE_GENERATOR_DIR="license-generator"
LICENSE_DIR="data/licenses"

# Check if the .env file exists and source it to get the SECRET_KEY
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please ensure it exists with a SECRET_KEY."
  exit 1
fi

SECRET_KEY=$(grep '^SECRET_KEY=' .env | cut -d '=' -f2-)
if [ -z "$SECRET_KEY" ]; then
  echo "Error: SECRET_KEY not found in .env file."
  exit 1
fi

echo "--- Load Balancer UI License Generator ---"

# Prompt for username
read -p "Enter the username for the license: " username
if [ -z "$username" ]; then
  echo "Error: Username cannot be empty."
  exit 1
fi

# Prompt for role with validation
while true; do
  read -p "Enter the role for the user (admin or read-only): " role
  if [ "$role" == "admin" ] || [ "$role" == "read-only" ]; then
    break
  else
    echo "Invalid role. Please enter 'admin' or 'read-only'."
  fi
done

# Create the licenses directory if it doesn't exist on the host
mkdir -p "$LICENSE_DIR"

# Build the Docker image using relative paths for the Dockerfile and build context
echo "Building the license generator Docker image..."
docker build -t "$IMAGE_NAME" -f "$LICENSE_GENERATOR_DIR/Dockerfile.license-gen" "$LICENSE_GENERATOR_DIR/"

# Run the container using a relative path for the volume mount
echo "Running Docker container to generate the license file..."
docker run --rm \
  -e "SECRET_KEY=$SECRET_KEY" \
  -e "LICENSE_USER=$username" \
  -e "LICENSE_ROLE=$role" \
  -e "OUTPUT_DIR=/output" \
  -v "$(pwd)/$LICENSE_DIR:/output" \
  --name "$CONTAINER_NAME" \
  "$IMAGE_NAME"

echo "Cleanup complete."
echo "The license file has been saved to the host at: $LICENSE_DIR/license_${username}.jwt"