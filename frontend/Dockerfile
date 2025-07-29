# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
# This config ensures that React Router works correctly with NGINX
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 88
CMD ["nginx", "-g", "daemon off;"]