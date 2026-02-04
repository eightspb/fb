#!/bin/bash

# SSL Setup Script for fb.net
# Usage: ./scripts/setup-ssl.sh yourdomain.com [email@example.com]

set -e

DOMAIN=$1
EMAIL=${2:-""}

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

# Check domain argument
if [ -z "$DOMAIN" ]; then
    print_error "Domain is required!"
    echo "Usage: ./scripts/setup-ssl.sh yourdomain.com [email@example.com]"
    exit 1
fi

echo ""
echo "=========================================="
echo "  SSL Setup for $DOMAIN"
echo "=========================================="
echo ""

# Step 1: Create directories
print_step "Creating directories..."
mkdir -p certbot/www certbot/conf

# Step 2: Update nginx config with domain
print_step "Updating nginx configuration with domain..."
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx-ssl.conf

# Step 3: Start nginx with HTTP config for certificate verification
print_step "Starting nginx with HTTP configuration..."
docker compose -f docker-compose.ssl.yml up -d nginx app postgres

# Wait for nginx to start
sleep 5

# Step 4: Obtain SSL certificate
print_step "Obtaining SSL certificate from Let's Encrypt..."

if [ -n "$EMAIL" ]; then
    docker run --rm \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"
else
    docker run --rm \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --register-unsafely-without-email \
        --agree-tos \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"
fi

# Step 5: Update .env with HTTPS URL
print_step "Updating .env file..."
if [ -f .env ]; then
    sed -i "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://$DOMAIN|g" .env
fi

# Step 6: Restart all services with SSL
print_step "Restarting services with SSL configuration..."
docker compose -f docker-compose.ssl.yml down
docker compose -f docker-compose.ssl.yml up -d --build

echo ""
echo "=========================================="
echo -e "${GREEN}  SSL Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Your site is now available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo "Certificate auto-renewal is configured."
echo ""
echo "To check certificate status:"
echo "  docker compose -f docker-compose.ssl.yml exec certbot certbot certificates"
echo ""
