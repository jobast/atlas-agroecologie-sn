#!/usr/bin/env bash
# Atlas Agroecologie - automated backup
#
# Dumps the MySQL database (gzip) and archives the uploads directory (tar.gz),
# then rotates files older than $BACKUP_RETENTION_DAYS.
#
# Designed to be run as a scheduled task on Infomaniak.
#
# Usage:
#   ./scripts/backup.sh
#
# Env overrides:
#   BACKUP_DIR              destination dir (default: $HOME/backups/atlas-agroecologie)
#   BACKUP_RETENTION_DAYS   number of days to keep (default: 14)
#
# Reads DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME from
# server/.env.production (or server/.env as fallback).
#
# Restore:
#   gunzip -c <file>.sql.gz | mysql -h $DB_HOST -u $DB_USER -p $DB_NAME
#   tar -xzf <file>.tar.gz -C server/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="$PROJECT_ROOT/server/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$PROJECT_ROOT/server/.env"
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no env file at $PROJECT_ROOT/server/.env(.production)" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

: "${DB_HOST:?DB_HOST not set in env}"
: "${DB_USER:?DB_USER not set in env}"
: "${DB_PASS:?DB_PASS not set in env}"
: "${DB_NAME:?DB_NAME not set in env}"
DB_PORT="${DB_PORT:-3306}"

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/atlas-agroecologie}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads"
chmod 700 "$BACKUP_DIR" "$BACKUP_DIR/db" "$BACKUP_DIR/uploads" 2>/dev/null || true

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DB_FILE="$BACKUP_DIR/db/atlas-${TIMESTAMP}.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads/uploads-${TIMESTAMP}.tar.gz"

log() { echo "[$(date -Iseconds)] $*"; }

log "Backup start (host=$DB_HOST db=$DB_NAME dest=$BACKUP_DIR)"

# 1) Database dump (password via env to keep it out of `ps`)
log "Dumping database..."
MYSQL_PWD="$DB_PASS" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --no-tablespaces \
  --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -9 > "$DB_FILE"
log "  -> $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# 2) Uploads archive (only if non-empty)
UPLOADS_DIR="$PROJECT_ROOT/server/uploads"
if [ -d "$UPLOADS_DIR" ] && [ -n "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  log "Archiving uploads..."
  tar -czf "$UPLOADS_FILE" -C "$PROJECT_ROOT/server" uploads
  log "  -> $UPLOADS_FILE ($(du -h "$UPLOADS_FILE" | cut -f1))"
else
  log "  (no uploads to archive)"
fi

# 3) Rotation
log "Rotating files older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR/db" -type f -name "atlas-*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete || true
find "$BACKUP_DIR/uploads" -type f -name "uploads-*.tar.gz" -mtime +"$RETENTION_DAYS" -print -delete || true

log "Backup done."
