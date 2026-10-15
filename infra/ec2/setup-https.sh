#!/usr/bin/env bash
# HTTPS for the 마감한칸 API with Nginx + Let's Encrypt (webroot challenge).
# Run on the server after setup-server.sh:  bash setup-https.sh <hostname>
# Needs ports 80 and 443 open in the security group and DNS pointing at this server.
set -euo pipefail

HOST="${1:?usage: setup-https.sh <hostname>}"
APP_DIR="/srv/magam-hankan"
TEMPLATE="$APP_DIR/infra/ec2/nginx-magam.conf.template"
SITE=/etc/nginx/sites-available/magam-api.conf

log() { printf '\n== %s\n' "$*"; }

log "packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q nginx certbot >/dev/null
sudo install -d -m 755 /var/www/letsencrypt
sudo rm -f /etc/nginx/sites-enabled/default

log "certificate for $HOST"
if [ ! -f "/etc/letsencrypt/live/$HOST/fullchain.pem" ]; then
  # Temporary HTTP-only site so Let's Encrypt can reach the challenge path.
  sudo tee "$SITE" >/dev/null <<NGINX
server {
    listen 80 default_server;
    server_name $HOST;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 404; }
}
NGINX
  sudo ln -sf "$SITE" /etc/nginx/sites-enabled/magam-api.conf
  sudo nginx -t -q && sudo systemctl reload nginx
  sudo certbot certonly --webroot -w /var/www/letsencrypt -d "$HOST" \
    --non-interactive --agree-tos --register-unsafely-without-email
fi

log "nginx site"
sed "s/__HOST__/$HOST/g" "$TEMPLATE" | sudo tee "$SITE" >/dev/null
sudo ln -sf "$SITE" /etc/nginx/sites-enabled/magam-api.conf
sudo nginx -t -q
sudo systemctl enable --now nginx >/dev/null
sudo systemctl reload nginx

log "renewal reloads nginx"
echo 'systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
systemctl list-timers certbot.timer --no-pager | head -2
sudo certbot renew --dry-run -q && echo "renewal dry-run ok"

log "check"
curl -fsS "https://$HOST/health"; echo
