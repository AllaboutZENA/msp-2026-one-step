#!/usr/bin/env bash
# 마감한칸 dev server setup for Ubuntu 26.04 LTS (EC2 t3.micro).
# Idempotent: safe to re-run. Run on the server as the ubuntu user:
#   bash setup-server.sh [git-ref]        (default ref: develop)
# Secrets are generated on the server and never printed or committed.
set -euo pipefail

REF="${1:-develop}"
NODE_VERSION="24.21.0"
REPO_URL="https://github.com/AllaboutZENA/msp-2026-one-step.git"
APP_USER="magam"
APP_DIR="/srv/magam-hankan"
ENV_DIR="/etc/magam-hankan"
ENV_FILE="$ENV_DIR/api.env"
DB_NAME="magam_hankan"
DB_USER="magam_app"

log() { printf '\n== %s\n' "$*"; }

log "1GB swap (t3.micro has ~1GB RAM)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

log "apt packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q postgresql git curl xz-utils ca-certificates >/dev/null

log "Node.js $NODE_VERSION (official tarball, checksum verified)"
if [ "$(/usr/local/bin/node -v 2>/dev/null)" != "v$NODE_VERSION" ]; then
  tmp=$(mktemp -d)
  tarball="node-v$NODE_VERSION-linux-x64.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$tarball" -o "$tmp/$tarball"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  (cd "$tmp" && grep " $tarball\$" SHASUMS256.txt | sha256sum -c -)
  sudo tar -xJf "$tmp/$tarball" -C /usr/local --strip-components=1 --no-same-owner
  rm -rf "$tmp"
fi
node -v && npm -v

log "app user and directories"
id "$APP_USER" >/dev/null 2>&1 || sudo useradd --system --create-home --home-dir "/var/lib/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
sudo install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$APP_DIR"
sudo install -d -o root -g "$APP_USER" -m 750 "$ENV_DIR"

log "PostgreSQL: localhost only, app role with least privilege"
sudo -u postgres psql -Atc "SHOW listen_addresses" | grep -qx localhost
if [ ! -f "$ENV_FILE" ]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER PASSWORD '$DB_PASSWORD';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -Atc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  sudo -u postgres psql -q -d "$DB_NAME" -c "REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC; GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;"
  (umask 027; sudo tee "$ENV_FILE" >/dev/null <<ENV
HOST=127.0.0.1
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME
ENV
  )
  sudo chown root:"$APP_USER" "$ENV_FILE" && sudo chmod 640 "$ENV_FILE"
  unset DB_PASSWORD
fi

log "code: $REF"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone -q "$REPO_URL" "$APP_DIR"
fi
sudo -u "$APP_USER" git -C "$APP_DIR" fetch -q origin
sudo -u "$APP_USER" git -C "$APP_DIR" checkout -q --detach "origin/$REF"
sudo -u "$APP_USER" git -C "$APP_DIR" log -1 --format='deployed %h %s'

log "API build and migrations"
as_app() { sudo -u "$APP_USER" HOME="/var/lib/$APP_USER" bash -c "cd '$APP_DIR/apps/api' && $1"; }
as_app "npm ci --no-audit --no-fund --loglevel=error"
as_app "npm run build --silent"
as_app "set -a; . '$ENV_FILE'; set +a; npx tsx scripts/migrate.ts"

log "systemd service"
sudo install -m 644 "$APP_DIR/infra/ec2/magam-api.service" /etc/systemd/system/magam-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now magam-api.service >/dev/null
sudo systemctl restart magam-api.service

log "daily database backup (keeps 7)"
sudo install -m 755 "$APP_DIR/infra/ec2/backup.sh" /usr/local/sbin/magam-backup
echo "30 18 * * * root /usr/local/sbin/magam-backup >/var/log/magam-backup.log 2>&1" | sudo tee /etc/cron.d/magam-backup >/dev/null

log "health"
for i in $(seq 1 20); do curl -fsS http://127.0.0.1:3000/health >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:3000/health; echo
curl -sS http://127.0.0.1:3000/health/db; echo
