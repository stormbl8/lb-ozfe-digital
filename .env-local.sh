#!/bin/bash
# --- General ---
export SECRET_KEY=e2a865a7c2b5d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9

# --- Initial Admin User ---
# Used to create the first admin account on initial startup.
export ADMIN_USER='oezdemirmu'
export ADMIN_EMAIL='volkan.oezdemir@ozfe-digital.de'
export ADMIN_PASS='#02081986#Bahar!'

# --- Temp User ----
export TEMP_USER_NAME=temp_user
export TEMP_USER_EMAIL=temp_user@example.com
export TEMP_USER_PASS=temp_password

# --- PostgreSQL Database ---
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgrespwd
export POSTGRES_DB=lb-ozfe-digital
export DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres/${POSTGRES_DB}"
