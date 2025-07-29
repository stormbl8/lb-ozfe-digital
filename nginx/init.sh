#!/bin/sh
set -e

echo "Extending nginx.conf with custom stream block..."

# Append a simplified stream block to the main nginx.conf.
# By removing the custom access_log, we avoid the permission error.
cat <<'EOF' >> /etc/nginx/nginx.conf

# ### Added by custom init script ###
stream {
    include /etc/nginx/stream.d/*.conf;
}
EOF

echo "Stream block added successfully."