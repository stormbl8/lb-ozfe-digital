# Use the official Debian-based NGINX image for build stability
FROM nginx:1.27.0-bookworm

# Set versions for ModSecurity and the NGINX connector
ENV MODSECURITY_VERSION=3.0.12
ENV MODSECURITY_CONNECTOR_VERSION=1.0.3
ENV OWASP_CRS_VERSION=v4.2.0

# Install all necessary build dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    pkg-config \
    automake \
    autoconf \
    libtool \
    libcurl4-openssl-dev \
    liblua5.4-dev \
    libpcre3-dev \
    libxml2-dev \
    libyajl-dev \
    liblmdb-dev \
    zlib1g-dev \
    unzip \
    --no-install-recommends

# --- COMPILE MODSECURITY V3 ---
RUN cd /tmp && \
    git clone --recurse-submodules --depth 1 -b v${MODSECURITY_VERSION} https://github.com/owasp-modsecurity/ModSecurity.git && \
    cd ModSecurity && \
    ./build.sh && \
    ./configure && \
    make -j$(nproc) && \
    make install

# --- COMPILE THE NGINX CONNECTOR ---
RUN cd /tmp && \
    git clone --depth 1 -b v${MODSECURITY_CONNECTOR_VERSION} https://github.com/owasp-modsecurity/ModSecurity-nginx.git

# --- COMPILE NGINX WITH THE NEW MODULE ---
RUN cd /tmp && \
    curl -sSL http://nginx.org/download/nginx-1.27.0.tar.gz | tar -xvz && \
    cd nginx-1.27.0 && \
    ./configure --with-compat --add-dynamic-module=/tmp/ModSecurity-nginx/ && \
    make modules && \
    cp objs/ngx_http_modsecurity_module.so /etc/nginx/modules/

# --- SETUP WAF RULES & CONFIGURATION ---
RUN mkdir -p /etc/nginx/waf && \
    cd /etc/nginx/waf && \
    curl -sSL https://github.com/coreruleset/coreruleset/archive/refs/tags/${OWASP_CRS_VERSION}.zip -o crs.zip && \
    unzip crs.zip && \
    mv coreruleset-*/* . && \
    rm -rf coreruleset-* crs.zip

# --- THIS IS THE FIX ---
# Copy BOTH of our local, correct configuration files into the image
COPY ./waf/modsecurity.conf /etc/nginx/waf/modsecurity.conf
COPY ./waf/crs-setup.conf /etc/nginx/waf/crs-setup.conf

# --- FINAL CONFIGURATION ---
# Clean up build dependencies and apt cache
RUN apt-get purge -y git build-essential automake autoconf libtool && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Load the new dynamic module in the main nginx.conf
RUN sed -i '1s/^/load_module modules\/ngx_http_modsecurity_module.so;\n/' /etc/nginx/nginx.conf

# Copy our custom Nginx configuration to the conf.d directory
COPY ./ozfedigital-lb.conf /etc/nginx/conf.d/

# Create the required directories on the host volume
RUN mkdir -p /data/nginx_proxy_configs /data/nginx_stream_configs /data/certs/dummy /data/logs/nginx /tmp/modsecurity && \
    chmod -R 777 /tmp/modsecurity

# Generate a dummy cert on startup if it doesn't exist
RUN [ ! -f /data/certs/dummy/dummy.key ] && openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout /data/certs/dummy/dummy.key \
    -out /data/certs/dummy/dummy.crt \
    -subj "/CN=dummy-cert" || echo "Dummy cert exists."

# Expose the ports
EXPOSE 80 443 10000-10100/tcp 10000-10100/udp

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]