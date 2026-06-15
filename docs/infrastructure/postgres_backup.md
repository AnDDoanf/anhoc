# PostgreSQL Backup & Disaster Recovery Strategy

We use automated shell scripting to take compressed, timestamped logical backups of the PostgreSQL database, ensuring recovery capabilities in the event of data corruption or hardware failure.

## Backup Process

The backup is executed via [backup-postgres.sh](file:///c:/code/anhoc/scripts/backup-postgres.sh). It does the following:
1. Verifies the `DATABASE_URL` connection parameter is loaded.
2. Runs `pg_dump` to capture the database structure and records.
3. Compresses the dump with `gzip` to minimize disk utilization.
4. Saves the backup file matching pattern `postgres_backup_YYYYMMDD_HHMMSS.sql.gz` inside the target directory.
5. Deletes logical backups older than 7 days to maintain storage sanity.

## Scheduling Backups (Cron setup)

To automate this backup daily at 02:00 AM on a Unix/Linux host:

1. Open crontab configuration:
   ```bash
   crontab -e
   ```
2. Append the cron statement:
   ```cron
   0 2 * * * export DATABASE_URL="postgresql://user:pass@host/db" && /path/to/project/scripts/backup-postgres.sh >> /var/log/postgres_backup.log 2>&1
   ```

## Disaster Recovery Procedure

To restore the database from a backup file (e.g. `postgres_backup_20260616_020000.sql.gz`):

1. **Prepare/Clear the target database**:
   If restoring to an active database, first drop and re-create the target schema to prevent key collisions:
   ```bash
   # In psql console:
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
2. **Decompress and Stream the Restore**:
   ```bash
   gunzip -c /path/to/backups/postgres/postgres_backup_20260616_020000.sql.gz | psql "$DATABASE_URL"
   ```
3. **Verify Restoration**:
   Run a row count query or boot the app and perform validation tests to verify the schema is correctly recovered.
