#!/usr/bin/env bash

# Простая ежедневная резервная копия PostgreSQL (ТЗ раздел 7)
# Пример запуска через cron:
# 0 3 * * * /path/to/backend/backup_db.sh >> /var/log/busstop_backup.log 2>&1

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-busstop}"
DB_USER="${DB_USER:-postgres}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

mkdir -p "$BACKUP_DIR"

FILE="$BACKUP_DIR/${DB_NAME}_$TIMESTAMP.sql.gz"

echo "[$(date)] Starting backup to $FILE"

PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F p \
  | gzip > "$FILE"

echo "[$(date)] Backup completed"

