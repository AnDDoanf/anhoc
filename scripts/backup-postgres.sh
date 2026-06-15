#!/bin/bash

# Exit on error
set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
DATABASE_URL="${DATABASE_URL}"
KEEP_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is defined
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not defined."
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql.gz"

echo "⏳ Starting PostgreSQL database backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

echo "✅ Backup successfully created at: $BACKUP_FILE"

# Clean up backups older than $KEEP_DAYS
echo "🧹 Cleaning up backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "postgres_backup_*.sql.gz" -type f -mtime +$KEEP_DAYS -delete

echo "🎉 Backup lifecycle complete."
