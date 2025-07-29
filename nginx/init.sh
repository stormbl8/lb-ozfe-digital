#!/bin/sh
set -e

echo "Extending nginx.conf with custom stream block..."

# Append the stream configuration to the main nginx.conf
cat <<'EOF' >> /etc/nginx/nginx.conf

# ### Added by custom init script ###
stream {
    log_format stream '$remote_addr [$time_local] '
                 '$protocol $status $bytes_sent $bytes_received '
                 '$session_time';

    # Log to standard output to avoid permission errors
    access_log /dev/stdout stream;
    
    include /etc/nginx/stream.d/*.conf;
}
EOF

echo "Stream block added successfully."