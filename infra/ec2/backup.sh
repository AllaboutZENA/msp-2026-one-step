#!/usr/bin/env bash
# Daily pg_dump of the 마감한칸 database to /var/backups/magam-hankan (root-only, keeps 7).
# Backups stay on the same server; copy one off-server before risky changes.
set -euo pipefail
DIR=/var/backups/magam-hankan
DB=magam_hankan
install -d -m 700 "$DIR"
file="$DIR/$DB-$(date -u +%Y%m%dT%H%MZ).dump"
sudo -u postgres pg_dump -Fc "$DB" > "$file"
chmod 600 "$file"
ls -1t "$DIR"/$DB-*.dump | tail -n +8 | xargs -r rm --
echo "backup ok: $file ($(du -h "$file" | cut -f1))"
