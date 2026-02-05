#!/bin/bash

# SSL Setup Script for fibroadenoma.net
# Usage: ./scripts/setup-ssl.sh [email@example.com]

set -e

DOMAIN="fibroadenoma.net"
EMAIL=${1:-""}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

echo ""
echo "=========================================="
echo "  SSL Setup for $DOMAIN"
echo "=========================================="
echo ""

# Step 1: Check if current production is running
print_step "Checking current deployment..."
if docker ps | grep -q fb-net-app; then
    print_warning "Production deployment detected. Stopping..."
    docker compose -f docker-compose.production.yml down
fi

# Step 2: Create directories
print_step "Creating directories..."
mkdir -p certbot/www certbot/conf

# Step 3: Create temporary docker-compose for HTTP
print_step "Creating temporary HTTP configuration..."
cat > docker-compose.ssl-temp.yml << 'EOF'
services:
  postgres:
    image: postgres:15
    container_name: fb-net-db
    command: postgres -c listen_addresses='*'
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-prod-data:/var/lib/postgresql/data
      - ./database-schema.sql:/docker-entrypoint-initdb.d/00-init-schema.sql:ro
    networks:
      - fb-net-prod-network
    restart: always

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fb-net-app
    expose:
      - "3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:-}
      TELEGRAM_ADMIN_CHAT_ID: ${TELEGRAM_ADMIN_CHAT_ID:-}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - fb-net-prod-network
    restart: always
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp:noexec,nosuid,size=100M
    read_only: false
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

  nginx:
    image: nginx:alpine
    container_name: fb-net-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - app
    networks:
      - fb-net-prod-network
    restart: always

volumes:
  postgres-prod-data:

networks:
  fb-net-prod-network:
    driver: bridge
EOF

# Step 4: Start services with HTTP config
print_step "Starting services with HTTP configuration..."
docker compose -f docker-compose.ssl-temp.yml up -d --build

# Wait for services to be ready
print_step "Waiting for services to start..."
sleep 10

# Step 5: Obtain SSL certificate
print_step "Obtaining SSL certificate from Let's Encrypt..."

# Get network name from running containers
NETWORK_NAME=$(docker inspect fb-net-nginx 2>/dev/null | grep -A 20 "Networks" | grep -o '"fb-net[^"]*"' | head -1 | tr -d '"')
if [ -z "$NETWORK_NAME" ]; then
    NETWORK_NAME="fb-net-prod-network"
fi

print_step "Using network: $NETWORK_NAME"

if [ -n "$EMAIL" ]; then
    docker run --rm \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        --network "$NETWORK_NAME" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"
else
    docker run --rm \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        --network "$NETWORK_NAME" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --register-unsafely-without-email \
        --agree-tos \
        -d "$DOMAIN"
fi

# Step 6: Verify certificate was created
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    print_error "Certificate was not created! Check the logs above."
    docker compose -f docker-compose.ssl-temp.yml down
    rm -f docker-compose.ssl-temp.yml
    exit 1
fi

print_step "Certificate obtained successfully!"

# Step 7: Update .env with HTTPS URL
print_step "Updating .env file..."
if [ -f .env ]; then
    if grep -q "NEXT_PUBLIC_SITE_URL=" .env; then
        sed -i "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://$DOMAIN|g" .env
    else
        echo "NEXT_PUBLIC_SITE_URL=https://$DOMAIN" >> .env
    fi
    print_step ".env updated with HTTPS URL"
else
    print_warning ".env file not found, skipping URL update"
fi

# Step 8: Stop temporary services
print_step "Stopping temporary services..."
docker compose -f docker-compose.ssl-temp.yml down

# Step 9: Remove temporary file
rm -f docker-compose.ssl-temp.yml

# Step 10: Start with SSL configuration
print_step "Starting services with SSL configuration..."
docker compose -f docker-compose.ssl.yml up -d --build

# Wait for services to start
sleep 5

echo ""
echo "=========================================="
echo -e "${GREEN}  SSL Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Your site is now available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo "Certificate details:"
docker compose -f docker-compose.ssl.yml exec certbot certbot certificates || true
echo ""
echo "Certificate auto-renewal is configured."
echo ""
echo "To check logs:"
echo "  docker compose -f docker-compose.ssl.yml logs -f"
echo ""
echo "To check certificate status:"
echo "  docker compose -f docker-compose.ssl.yml exec certbot certbot certificates"
echo ""
