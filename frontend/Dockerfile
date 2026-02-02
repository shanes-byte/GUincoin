# Stage 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets from builder stage
# Vite config outputs to ../backend/frontend-dist (relative to /app → /backend/frontend-dist)
COPY --from=builder /backend/frontend-dist /usr/share/nginx/html

# Railway injects PORT; nginx needs it via envsubst
# Default BACKEND_INTERNAL_URL for local development
ENV BACKEND_INTERNAL_URL=http://localhost:8080

EXPOSE 8080

# nginx docker image auto-runs envsubst on /etc/nginx/templates/*.template
# and outputs to /etc/nginx/conf.d/, then starts nginx
CMD ["nginx", "-g", "daemon off;"]
