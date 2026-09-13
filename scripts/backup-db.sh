#!/usr/bin/env bash
# Backs up the PostgreSQL database from the running `postgres` container.
# Usage: ./scripts/backup-db.sh
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; source .env; set +a

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

FILE="$BACKUP_DIR/backup-${TIMESTAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"

echo "Backup written to $FILE"
echo "Restore with: gunzip -c $FILE | docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"

# Keep only the last 14 backups.
ls -1t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
