#!/usr/bin/env bash
# Backup PostgreSQL quotidien — à planifier via cron / GitHub Actions scheduled
# Format .sql.gz (legacy). Préférer: npm run ops:backup → .dump (pg_restore)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/rappel_beaute_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL requis" >&2
  exit 1
fi

echo "Backup → ${FILE}"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$FILE"

find "$BACKUP_DIR" -name 'rappel_beaute_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete
echo "OK — rétention ${RETENTION_DAYS} jours"
