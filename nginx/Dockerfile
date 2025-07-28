# Use the official OWASP image which includes NGINX + ModSecurity + Core Rule Set
FROM owasp/modsecurity-crs:nginx

# The base image already has a good default configuration.
# We just need to ensure our custom proxy configs are copied or mounted.
# The docker-compose file already handles mounting our configs into /etc/nginx/conf.d/