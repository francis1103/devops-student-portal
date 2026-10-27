#!/usr/bin/env bash
# ==============================================================================
# DevOps IA-3: Automated Deployment Script for Azure Linux VM
# Author: Francis | Project: DevOps IA-3 Academic Project
# ==============================================================================
set -euo pipefail

# Configuration with safe defaults
TARGET_HOST="${AZURE_VM_HOST:-20.219.161.235}"
TARGET_USER="${AZURE_VM_USER:-azureuser}"
DEPLOY_DIR="${TARGET_DEPLOY_DIR:-/var/www/student-portal}"
SSH_PORT="${TARGET_SSH_PORT:-22}"

# Optional SSH Key Parameter or identity file
SSH_OPTS=(-o "Port=$SSH_PORT" -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=10)
if [ -n "${SSH_KEY_FILE:-}" ] && [ -f "${SSH_KEY_FILE}" ]; then
    SSH_OPTS+=(-i "$SSH_KEY_FILE")
fi

echo "=========================================================="
echo " Initiating Deployment to Azure VM"
echo " Host: $TARGET_USER@$TARGET_HOST"
echo " Destination: $DEPLOY_DIR"
echo "=========================================================="

# 1. Connectivity Check
echo "[1/6] Verifying SSH connectivity to Azure VM..."
if ! ssh "${SSH_OPTS[@]}" "$TARGET_USER@$TARGET_HOST" "echo '✔ SSH connection established successfully.'"; then
    echo "❌ ERROR: Unable to reach Azure VM over SSH at $TARGET_HOST:$SSH_PORT"
    echo "Possible causes: IP restriction on NSG, incorrect SSH key, or VM stopped."
    exit 1
fi

# 2. Prepare Remote Host Environment (Nginx & Directories)
echo "[2/6] Ensuring Nginx and web directory exist on target VM..."
ssh "${SSH_OPTS[@]}" "$TARGET_USER@$TARGET_HOST" bash -s << 'EOF'
set -euo pipefail
if ! command -v nginx > /dev/null 2>&1; then
    echo "Installing Nginx web server..."
    sudo apt-get update -y
    sudo apt-get install -y --no-install-recommends nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "✔ Nginx is already installed."
fi

# Create target deployment directory
sudo mkdir -p /var/www/student-portal
sudo mkdir -p /tmp/devops-ia3-staging
sudo chown -R $USER:$USER /tmp/devops-ia3-staging
EOF

# 3. Package and Transfer Website Files
echo "[3/6] Packaging and transferring application assets..."
TEMP_ARCHIVE="/tmp/devops-ia3-release-$(date +%s).tar.gz"
tar -czf "$TEMP_ARCHIVE" index.html style.css script.js css/ js/ 2>/dev/null || tar -czf "$TEMP_ARCHIVE" index.html style.css script.js

scp "${SSH_OPTS[@]}" "$TEMP_ARCHIVE" "$TARGET_USER@$TARGET_HOST:/tmp/devops-ia3-staging/release.tar.gz"
rm -f "$TEMP_ARCHIVE"

# 4. Extract and Deploy to Web Root
echo "[4/6] Extracting release files into $DEPLOY_DIR..."
ssh "${SSH_OPTS[@]}" "$TARGET_USER@$TARGET_HOST" bash -s << EOF
set -euo pipefail
sudo mkdir -p "$DEPLOY_DIR"
sudo tar -xzf /tmp/devops-ia3-staging/release.tar.gz -C "$DEPLOY_DIR"
sudo rm -rf /tmp/devops-ia3-staging

# Configure correct ownership and permissions
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo find "$DEPLOY_DIR" -type d -exec chmod 755 {} +
sudo find "$DEPLOY_DIR" -type f -exec chmod 644 {} +
EOF

# 5. Configure Nginx Virtual Host and Reload
echo "[5/6] Validating and configuring Nginx virtual host..."
ssh "${SSH_OPTS[@]}" "$TARGET_USER@$TARGET_HOST" bash -s << EOF
set -euo pipefail
NGINX_CONF="/etc/nginx/sites-available/student-portal"

cat << 'CONF' | sudo tee "\$NGINX_CONF" > /dev/null
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root $DEPLOY_DIR;
    index index.html;

    server_name _;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
CONF

# Enable site and disable default if needed
sudo ln -sf "\$NGINX_CONF" /etc/nginx/sites-enabled/student-portal
sudo rm -f /etc/nginx/sites-enabled/default

# Test syntax and reload
sudo nginx -t
sudo systemctl reload nginx
echo "✔ Nginx configuration reloaded successfully."
EOF

# 6. Execute Post-Deployment Health Check
echo "[6/6] Executing HTTP health check..."
HEALTH_CHECK_SCRIPT="$(dirname "$0")/health-check.sh"
if [ -f "$HEALTH_CHECK_SCRIPT" ]; then
    bash "$HEALTH_CHECK_SCRIPT" "$TARGET_HOST"
else
    echo "Running fallback curl probe..."
    curl -fsSI --max-time 10 "http://$TARGET_HOST" | head -n 5
fi

echo "=========================================================="
echo "✔ Deployment completed successfully!"
echo " Public Application URL: http://$TARGET_HOST"
echo "=========================================================="
