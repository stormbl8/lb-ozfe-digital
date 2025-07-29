FROM owasp/modsecurity-crs:nginx

# Copy our custom scripts into the container's startup directory.
COPY init.sh /docker-entrypoint.d/init.sh
COPY generate-dummy-cert.sh /docker-entrypoint.d/generate-dummy-cert.sh

# Temporarily switch to the root user to make the scripts executable
USER root
RUN chmod +x /docker-entrypoint.d/init.sh /docker-entrypoint.d/generate-dummy-cert.sh