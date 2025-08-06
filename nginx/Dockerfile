FROM nginx:alpine

# Install openssl to generate dummy certificates
RUN apk add --no-cache openssl

# Copy our custom Nginx configuration to the conf.d directory
COPY ./ozfedigital-lb.conf /etc/nginx/conf.d/

# Create the required directories on the host volume
RUN mkdir -p /data/nginx_proxy_configs /data/nginx_stream_configs /data/certs/dummy /data/logs/nginx

# Generate a dummy cert on startup if it doesn't exist
RUN openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout /data/certs/dummy/dummy.key \
    -out /data/certs/dummy/dummy.crt \
    -subj "/CN=dummy-cert"

# Expose the ports
EXPOSE 80 443 10000-10100/tcp 10000-10100/udp

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]