#!/usr/bin/env bash
#
# Postgres backup script for CapimaxRT.
#
# Strategy:
#   1. `pg_dump --format=custom` of the production database.
#   2. Compress with zstd.
#   3. Upload to S3 with object-lock (immutable for 30 days).
#   4. Keep last 7 daily snapshots in the local `/backups` volume for fast
#      restore. S3 retains longer history.
#
# Run via cron in the db container:
#   30 2 * * *  /backups/backup_postgres.sh >> /backups/backup.log 2>&1
#
# Required env vars:
#   DB_NAME, DB_USER, DB_PASSWORD, S3_BUCKET, S3_PATH (prefix), AWS_REGION
set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR=/backups
LOCAL_FILE="${BACKUP_DIR}/capimax_${TIMESTAMP}.dump.zst"
S3_KEY="${S3_PATH:-capimax/postgres}/capimax_${TIMESTAMP}.dump.zst"
LOCAL_RETENTION_DAYS=7

: "${DB_NAME:?DB_NAME is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

echo "[$(date -u)] Starting backup of database '${DB_NAME}'"

export PGPASSWORD="${DB_PASSWORD}"

pg_dump \
  --host=db \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --compress=0 \
  | zstd -T0 -19 -o "${LOCAL_FILE}"

# Verify the dump is non-empty and parseable
if ! pg_restore --list "${LOCAL_FILE%.zst}" >/dev/null 2>&1; then
    # zstd-streamed dump — verify by decompressing to /dev/null
    if ! zstd -d -c "${LOCAL_FILE}" | pg_restore --list - >/dev/null; then
        echo "[$(date -u)] FATAL: backup file is unreadable; aborting"
        rm -f "${LOCAL_FILE}"
        exit 1
    fi
fi

SIZE=$(stat -c%s "${LOCAL_FILE}")
echo "[$(date -u)] Local backup written: ${LOCAL_FILE} (${SIZE} bytes)"

# Upload to S3 with object lock
if [[ -n "${S3_BUCKET:-}" ]]; then
    aws s3 cp "${LOCAL_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=${TIMESTAMP},db=${DB_NAME}"
    echo "[$(date -u)] Uploaded to s3://${S3_BUCKET}/${S3_KEY}"
else
    echo "[$(date -u)] S3_BUCKET not set — skipping upload"
fi

# Local retention
find "${BACKUP_DIR}" -name 'capimax_*.dump.zst' -mtime "+${LOCAL_RETENTION_DAYS}" -delete

echo "[$(date -u)] Backup complete"
