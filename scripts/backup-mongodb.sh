#!/bin/bash

# Exit on error
set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
MONGODB_URI="${MONGODB_URI}"
KEEP_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if MONGODB_URI is defined
if [ -z "$MONGODB_URI" ]; then
  echo "Error: MONGODB_URI environment variable is not defined."
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.archive.gz"

echo "⏳ Starting MongoDB database backup..."
mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_FILE"

echo "✅ Backup successfully created at: $BACKUP_FILE"

# Clean up backups older than $KEEP_DAYS
echo "🧹 Cleaning up backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "mongodb_backup_*.archive.gz" -type f -mtime +$KEEP_DAYS -delete

echo "🎉 Backup lifecycle complete."
