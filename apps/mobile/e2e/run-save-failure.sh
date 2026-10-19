#!/usr/bin/env bash
# T14: save while the backend is down, then retry after it recovers.
# Runs against the local stack (Metro + `npm run dev` API + Homebrew PostgreSQL 18).
# Default stops PostgreSQL; set STOP_CMD/START_CMD to test another outage, e.g. the API.
# Usage (repo root): bash apps/mobile/e2e/run-save-failure.sh
# API outage: MODE=api STOP_CMD="pkill -f 'tsx watch'" \
#   START_CMD="(cd apps/api && nohup npm run dev >/tmp/api.log 2>&1 </dev/null &)" bash ...
# (START_CMD must fully detach, or this script waits on the server.)
set -euo pipefail
cd "$(dirname "$0")/.."   # apps/mobile, so screenshots land in e2e/screenshots
STOP_CMD=${STOP_CMD:-"brew services stop postgresql@18"}
START_CMD=${START_CMD:-"brew services start postgresql@18"}
MODE=${MODE:-db}

maestro test e2e/save-failure/1-fill.yaml
eval "$STOP_CMD"
trap 'eval "$START_CMD"' EXIT   # never leave the service stopped
maestro test -e MODE="$MODE" e2e/save-failure/2-save-fails.yaml
eval "$START_CMD"
trap - EXIT
# Wait until the API can reach the database again.
for _ in $(seq 1 30); do
  curl -fs "${API_URL:-http://localhost:3000}/health/db" >/dev/null && break
  sleep 1
done
maestro test -e MODE="$MODE" e2e/save-failure/3-retry.yaml
echo "T14 ($MODE): passed"
