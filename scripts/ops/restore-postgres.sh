#!/usr/bin/env bash
# Restore PostgreSQL — TESTER régulièrement en staging (backup inutile sinon)
set -euo pipefail

FILE="${1:-}"
TARGET_URL="${DATABASE_URL:-}"

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Usage: DATABASE_URL=... $0 backups/rappel_beaute_YYYYMMDD.sql.gz" >&2
  exit 1
fi

if [[ -z "$TARGET_URL" ]]; then
  echo "DATABASE_URL requis" >&2
  exit 1
fi

echo "⚠️  Restore vers ${TARGET_URL%%@*}@*** — fichier: ${FILE}"
read -r -p "Confirmer (yes): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Annulé."
  exit 1
fi

gunzip -c "$FILE" | psql "$TARGET_URL" -v ON_ERROR_STOP=1
echo "Restore terminé — lancer npm run db:migrate:deploy puis health check"
