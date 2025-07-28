FROM nginx:stable-alpine

# Copy the base config and any initial proxy configs
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# The docker-compose file will mount proxy configs, certs, etc.