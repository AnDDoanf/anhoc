# MongoDB Backup & Disaster Recovery Strategy

We use automated shell scripting to take compressed, archive-level dumps of the MongoDB database, ensuring tutoring histories and conversations can be recovered in the event of data corruption or hardware failure.

## Backup Process

The backup is executed via [backup-mongodb.sh](file:///c:/code/anhoc/scripts/backup-mongodb.sh). It does the following:
1. Verifies the `MONGODB_URI` connection parameter is loaded.
2. Runs `mongodump` using `--gzip --archive` to capture and compress all database collections.
3. Saves the backup file matching pattern `mongodb_backup_YYYYMMDD_HHMMSS.archive.gz` inside the target directory.
4. Deletes archives older than 7 days to maintain storage sanity.

## Scheduling Backups (Cron setup)

To automate this backup daily at 02:30 AM on a Unix/Linux host:

1. Open crontab configuration:
   ```bash
   crontab -e
   ```
2. Append the cron statement:
   ```cron
   30 2 * * * export MONGODB_URI="mongodb://user:pass@host:port/db" && /path/to/project/scripts/backup-mongodb.sh >> /var/log/mongodb_backup.log 2>&1
   ```

## Disaster Recovery Procedure

To restore the MongoDB database from an archive file (e.g. `mongodb_backup_20260616_023000.archive.gz`):

1. **Perform the Restore**:
   Use `mongorestore` to unpack and recreate the database:
   ```bash
   mongorestore --uri="$MONGODB_URI" --gzip --archive=/path/to/backups/mongodb/mongodb_backup_20260616_023000.archive.gz
   ```
   *Note: Add `--drop` if you want to drop collections on the target database before restoring them from the archive.*
2. **Verify Restoration**:
   Run a count command on key collections (like `conversations` or `messages`) to ensure the data is successfully populated:
   ```bash
   mongosh "$MONGODB_URI" --eval "db.conversations.countDocuments()"
   ```
