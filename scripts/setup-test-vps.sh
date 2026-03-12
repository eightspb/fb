#!/bin/bash

# =================================================================
# SETUP TEST VPS FOR FB.NET
# =================================================================
# This script configures a fresh Ubuntu 22.04 VPS for testing.
# Run as root: bash /opt/fb-net/scripts/setup-test-vps.sh
#
# WARNING: This is for TEST VPS only!
# Do NOT run on production server.
# Do NOT use docker-compose.ssl.yml.
# Do NOT install certbot or configure SSL.
# =================================================================

set -e

SERVER_IP="45.144.178.119"
PROJECT_DIR="/opt/fb-net"

echo ""
echo "========================================================"
echo "  SETUP TEST VPS — fb.net"
echo "  Server: $SERVER_IP"
echo "  Project: $PROJECT_DIR"
echo "========================================================"
echo ""

# =================================================================
# STEP 1 — Setup swap space (needed for 2GB VPS)
# =================================================================

echo "[STEP 1/10] Setting up swap space (4GB)..."
echo ""

if swapon --show | grep -q "/swapfile"; then
    echo "  OK: Swap already active"
    swapon --show
else
    echo "  Creating 4GB swapfile..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile > /dev/null 2>&1
    swapon /swapfile
    # Make persistent across reboots
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo "  OK: 4GB swap created and activated"
fi

# Set swappiness for better OOM resistance during builds
sysctl vm.swappiness=60 > /dev/null 2>&1

echo ""
echo "  Memory status:"
free -h | head -3
echo ""

# =================================================================
# STEP 2 — Install required tools
# =================================================================

echo "[STEP 2/10] Installing required tools..."
echo ""

# System packages
echo "  Installing system packages..."
apt-get update -qq
apt-get install -y -qq git curl unzip ca-certificates gnupg ufw jq > /dev/null 2>&1
echo "  OK: git, curl, unzip, ca-certificates, gnupg, ufw, jq"

# Docker Engine + Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "  Installing Docker Engine..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    echo "  OK: Docker installed"
else
    echo "  OK: Docker already installed — $(docker --version)"
fi

# Enable and start Docker
systemctl enable docker > /dev/null 2>&1
systemctl start docker
echo "  OK: Docker enabled and started"

# Docker Compose check
if docker compose version &> /dev/null; then
    echo "  OK: $(docker compose version)"
else
    echo "  ERROR: Docker Compose plugin not found!"
    exit 1
fi

# Bun
if ! command -v bun &> /dev/null; then
    echo "  Installing Bun..."
    curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    # Add to .bashrc for persistence
    if ! grep -q 'BUN_INSTALL' ~/.bashrc 2>/dev/null; then
        echo '' >> ~/.bashrc
        echo '# Bun' >> ~/.bashrc
        echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
        echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
    fi
    echo "  OK: Bun installed — $(bun --version)"
else
    echo "  OK: Bun already installed — $(bun --version)"
fi

echo ""

# =================================================================
# STEP 2 — Prepare project directory
# =================================================================

echo "[STEP 3/10] Preparing project directory..."
echo ""

if [ -d "$PROJECT_DIR/.git" ]; then
    echo "  OK: Repository already exists at $PROJECT_DIR"
    cd "$PROJECT_DIR"
    echo "  Branch: $(git branch --show-current)"
    echo "  Latest commit: $(git log --oneline -1)"
    echo "  Pulling latest changes..."
    git pull origin master || git pull origin main || echo "  WARNING: git pull failed, continuing..."
else
    echo "  Cloning repository..."
    mkdir -p "$PROJECT_DIR"
    git clone https://github.com/eightspb/fb.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    echo "  OK: Repository cloned"
fi

echo ""

# =================================================================
# STEP 3 — Repo summary
# =================================================================

echo "[STEP 4/10] Repository summary"
echo ""
echo "  Runtime:          Bun + Next.js"
echo "  Apps:             site (:3000) + admin (:3001)"
echo "  Database:         PostgreSQL 15 + pgvector"
echo "  Compose file:     docker-compose.production.yml"
echo "  SSL compose:      docker-compose.ssl.yml (DO NOT USE HERE)"
echo "  Required env:     POSTGRES_PASSWORD, ADMIN_USERNAME,"
echo "                    ADMIN_PASSWORD, JWT_SECRET,"
echo "                    NEXT_PUBLIC_SITE_URL"
echo ""

# =================================================================
# STEP 4 — Create .env safely
# =================================================================

echo "[STEP 5/10] Configuring .env..."
echo ""

cd "$PROJECT_DIR"

if [ -f .env ]; then
    echo "  .env already exists!"
    echo "  Current NEXT_PUBLIC_SITE_URL:"
    grep "NEXT_PUBLIC_SITE_URL" .env 2>/dev/null || echo "    (not set)"
    echo ""
    echo "  Skipping .env creation (will not overwrite)."
    echo "  To recreate, delete .env and re-run this script."
else
    echo "  Creating .env from ENV_EXAMPLE.txt..."
    cp ENV_EXAMPLE.txt .env

    # Generate secure random values
    GENERATED_PG_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    GENERATED_ADMIN_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    GENERATED_JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)

    # Update values in .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:${GENERATED_PG_PASS}@postgres:5432/postgres|" .env
    sed -i "s|ADMIN_USERNAME=.*|ADMIN_USERNAME=admin|" .env
    sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${GENERATED_ADMIN_PASS}|" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=${GENERATED_JWT_SECRET}|" .env
    sed -i "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=http://${SERVER_IP}:3000|" .env

    # Add POSTGRES_PASSWORD (not in ENV_EXAMPLE.txt but needed by docker-compose)
    if ! grep -q "^POSTGRES_PASSWORD=" .env; then
        echo "" >> .env
        echo "# Docker Compose PostgreSQL password" >> .env
        echo "POSTGRES_PASSWORD=${GENERATED_PG_PASS}" >> .env
    else
        sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${GENERATED_PG_PASS}|" .env
    fi

    echo "  OK: .env created with auto-generated secrets"
    echo ""
    echo "  ============================================"
    echo "  GENERATED CREDENTIALS (save these!):"
    echo "  ============================================"
    echo "  ADMIN_USERNAME:  admin"
    echo "  ADMIN_PASSWORD:  ${GENERATED_ADMIN_PASS}"
    echo "  POSTGRES_PASSWORD: ${GENERATED_PG_PASS}"
    echo "  JWT_SECRET:      ${GENERATED_JWT_SECRET}"
    echo "  SITE_URL:        http://${SERVER_IP}:3000"
    echo "  ============================================"
    echo ""
    echo "  Optional vars to fill later:"
    echo "    - TELEGRAM_BOT_TOKEN"
    echo "    - TELEGRAM_ADMIN_CHAT_ID"
    echo "    - SMTP_HOST, SMTP_USER, SMTP_PASSWORD"
    echo "    - OPENROUTER_API_KEY"
    echo "    - YANDEX_GEOCODER_API_KEY"
fi

echo ""

# =================================================================
# STEP 5 — Install project dependencies
# =================================================================

echo "[STEP 6/10] Installing project dependencies..."
echo ""

cd "$PROJECT_DIR"

# Ensure bun is in PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

bun install
echo "  OK: Dependencies installed"
echo ""

# =================================================================
# STEP 6 — Configure firewall
# =================================================================

echo "[STEP 7/10] Configuring firewall..."
echo ""

ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 3000/tcp > /dev/null 2>&1
ufw allow 3001/tcp > /dev/null 2>&1

# Enable UFW non-interactively
ufw --force enable > /dev/null 2>&1

echo "  OK: Firewall configured"
echo "  Allowed ports: 22 (SSH), 3000 (site), 3001 (admin)"
echo "  Ports 80/443 are NOT open (no SSL on test VPS)"
echo ""

# =================================================================
# STEP 7 — Create helper scripts
# =================================================================

echo "[STEP 8/10] Creating helper scripts..."
echo ""

cd "$PROJECT_DIR"

# update.sh
cat > update.sh << 'SCRIPT'
#!/bin/bash
cd /opt/fb-net
git pull origin master
bun install
SCRIPT
chmod +x update.sh
echo "  OK: update.sh"

# test-up.sh (sequential build to avoid OOM on 2GB VPS)
cat > test-up.sh << 'SCRIPT'
#!/bin/bash
cd /opt/fb-net
echo "Building site..."
docker compose -f docker-compose.production.yml build site
echo "Building admin..."
docker compose -f docker-compose.production.yml build admin
echo "Starting all services..."
docker compose -f docker-compose.production.yml up -d
SCRIPT
chmod +x test-up.sh
echo "  OK: test-up.sh"

# test-down.sh
cat > test-down.sh << 'SCRIPT'
#!/bin/bash
cd /opt/fb-net
docker compose -f docker-compose.production.yml down
SCRIPT
chmod +x test-down.sh
echo "  OK: test-down.sh"

# test-logs.sh
cat > test-logs.sh << 'SCRIPT'
#!/bin/bash
cd /opt/fb-net
docker compose -f docker-compose.production.yml logs -f site admin postgres
SCRIPT
chmod +x test-logs.sh
echo "  OK: test-logs.sh"

# test-rebuild.sh (sequential build to avoid OOM on 2GB VPS)
cat > test-rebuild.sh << 'SCRIPT'
#!/bin/bash
cd /opt/fb-net
echo "Rebuilding site (no cache)..."
docker compose -f docker-compose.production.yml build --no-cache site
echo "Rebuilding admin (no cache)..."
docker compose -f docker-compose.production.yml build --no-cache admin
echo "Starting services..."
docker compose -f docker-compose.production.yml up -d site admin
SCRIPT
chmod +x test-rebuild.sh
echo "  OK: test-rebuild.sh"

# auto-deploy.sh (sequential build to avoid OOM on 2GB VPS)
cat > auto-deploy.sh << 'SCRIPT'
#!/bin/bash
cd /opt/fb-net
git pull origin master
bun install
echo "Building site..."
docker compose -f docker-compose.production.yml build site
echo "Building admin..."
docker compose -f docker-compose.production.yml build admin
echo "Starting all services..."
docker compose -f docker-compose.production.yml up -d
SCRIPT
chmod +x auto-deploy.sh
echo "  OK: auto-deploy.sh"

echo ""

# =================================================================
# STEP 8 — Webhook auto-deploy (optional)
# =================================================================

echo "[STEP 9/10] Setting up webhook auto-deploy..."
echo ""

# Install webhook tool
if ! command -v webhook &> /dev/null; then
    apt-get install -y -qq webhook > /dev/null 2>&1 || {
        echo "  WARNING: 'webhook' package not available via apt."
        echo "  Installing from GitHub releases..."
        WEBHOOK_VERSION="2.8.1"
        curl -sL "https://github.com/adnanh/webhook/releases/download/${WEBHOOK_VERSION}/webhook-linux-amd64.tar.gz" -o /tmp/webhook.tar.gz
        tar -xzf /tmp/webhook.tar.gz -C /tmp/
        mv /tmp/webhook-linux-amd64/webhook /usr/local/bin/webhook
        chmod +x /usr/local/bin/webhook
        rm -rf /tmp/webhook.tar.gz /tmp/webhook-linux-amd64
    }
fi

if command -v webhook &> /dev/null || [ -f /usr/local/bin/webhook ]; then
    echo "  OK: webhook installed"

    # Generate webhook secret
    WEBHOOK_SECRET=$(openssl rand -hex 20)

    # Create hooks config
    cat > "$PROJECT_DIR/hooks.json" << EOF
[
  {
    "id": "deploy",
    "execute-command": "/opt/fb-net/auto-deploy.sh",
    "command-working-directory": "/opt/fb-net",
    "response-message": "Deploy triggered",
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "${WEBHOOK_SECRET}",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature"
        }
      }
    }
  }
]
EOF
    echo "  OK: hooks.json created"

    # Create systemd service
    cat > /etc/systemd/system/webhook.service << EOF
[Unit]
Description=Webhook auto-deploy listener
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/webhook -hooks /opt/fb-net/hooks.json -port 9000 -verbose
WorkingDirectory=/opt/fb-net
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Try /usr/bin/webhook if /usr/local/bin doesn't exist
    if [ ! -f /usr/local/bin/webhook ] && [ -f /usr/bin/webhook ]; then
        sed -i 's|/usr/local/bin/webhook|/usr/bin/webhook|' /etc/systemd/system/webhook.service
    fi

    systemctl daemon-reload
    systemctl enable webhook > /dev/null 2>&1
    systemctl start webhook || echo "  WARNING: webhook service failed to start"

    # Open port 9000
    ufw allow 9000/tcp > /dev/null 2>&1

    echo "  OK: webhook service created and started on port 9000"
    echo ""
    echo "  ============================================"
    echo "  WEBHOOK CONFIG:"
    echo "  URL:    http://${SERVER_IP}:9000/hooks/deploy"
    echo "  Secret: ${WEBHOOK_SECRET}"
    echo "  Header: X-Hub-Signature"
    echo "  ============================================"
    echo ""
    echo "  To set up in GitHub:"
    echo "  1. Go to repo Settings > Webhooks > Add webhook"
    echo "  2. Payload URL: http://${SERVER_IP}:9000/hooks/deploy"
    echo "  3. Content type: application/json"
    echo "  4. Secret: ${WEBHOOK_SECRET}"
    echo "  5. Events: Just the push event"
else
    echo "  SKIPPED: Could not install webhook tool"
    echo "  Manual alternative: SSH into server and run ./auto-deploy.sh"
fi

echo ""

# =================================================================
# STEP 9 — Verify
# =================================================================

echo "[STEP 10/10] Verifying setup..."
echo ""

# Docker
if systemctl is-active docker > /dev/null 2>&1; then
    echo "  OK: Docker is running"
else
    echo "  ERROR: Docker is not running!"
fi

# Docker Compose
if docker compose version > /dev/null 2>&1; then
    echo "  OK: Docker Compose available"
else
    echo "  ERROR: Docker Compose not available!"
fi

# Bun
if command -v bun > /dev/null 2>&1; then
    echo "  OK: Bun $(bun --version)"
else
    echo "  ERROR: Bun not found!"
fi

# Repo
if [ -f "$PROJECT_DIR/package.json" ]; then
    echo "  OK: Repository exists at $PROJECT_DIR"
else
    echo "  ERROR: Repository not found at $PROJECT_DIR!"
fi

# .env
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "  OK: .env file exists"
    # Check required vars
    MISSING=""
    for var in POSTGRES_PASSWORD ADMIN_USERNAME ADMIN_PASSWORD JWT_SECRET NEXT_PUBLIC_SITE_URL; do
        if ! grep -q "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null; then
            MISSING="$MISSING $var"
        fi
    done
    if [ -n "$MISSING" ]; then
        echo "  WARNING: Missing env vars:$MISSING"
    fi
else
    echo "  ERROR: .env file not found!"
fi

# Firewall
echo "  Firewall status:"
ufw status | grep -E "(22|3000|3001|9000)" | while read line; do
    echo "    $line"
done

echo ""

# =================================================================
# Start containers
# =================================================================

echo "========================================================"
echo "  SETUP COMPLETE!"
echo "========================================================"
echo ""
echo "  To start the test server:"
echo "    cd /opt/fb-net && ./test-up.sh"
echo ""
echo "  Test URLs:"
echo "    Site:  http://${SERVER_IP}:3000"
echo "    Admin: http://${SERVER_IP}:3001/admin"
echo ""
echo "  To view logs:"
echo "    cd /opt/fb-net && ./test-logs.sh"
echo ""
echo "  REMINDER: NEVER use docker-compose.ssl.yml on this VPS!"
echo ""
