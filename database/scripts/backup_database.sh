#!/bin/bash

# ================================================================================
# POSTGRESQL BACKUP SCRIPT - Capimax Platform
# ================================================================================
#
# This script creates automated backups of the PostgreSQL database with:
# - Full database dumps (SQL format)
# - Compressed archives
# - Local and S3 storage
# - Backup rotation and cleanup
# - Email notifications
# - Backup verification
#
# Usage:
#   chmod +x backup_database.sh
#   ./backup_database.sh [full|incremental]
#
# Cron example (daily at 2 AM):
#   0 2 * * * /path/to/backup_database.sh full >> /var/log/postgresql/backup.log 2>&1
#
# ================================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ================================================================================
# CONFIGURATION
# ================================================================================

# Database connection
DB_NAME="${DB_NAME:-capimax_db}"
DB_USER="${DB_USER:-capimax_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
PGPASSWORD="${DB_PASSWORD:-}"

# Backup directories
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
LOCAL_BACKUP_DIR="$BACKUP_DIR/local"
S3_BACKUP_DIR="$BACKUP_DIR/s3_staging"

# S3 configuration
S3_ENABLED="${S3_ENABLED:-true}"
S3_BUCKET="${S3_BUCKET:-capimax-backups}"
S3_REGION="${S3_REGION:-us-east-1}"
S3_PREFIX="database/postgresql"

# Retention policy
LOCAL_RETENTION_DAYS=7   # Keep local backups for 7 days
S3_RETENTION_DAYS=30     # Keep S3 backups for 30 days

# Backup type
BACKUP_TYPE="${1:-full}"  # full or incremental

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)

# Backup filename
BACKUP_FILENAME="capimax_db_${BACKUP_TYPE}_${TIMESTAMP}.sql"
BACKUP_ARCHIVE="capimax_db_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

# Notification settings
EMAIL_ENABLED="${EMAIL_ENABLED:-false}"
EMAIL_TO="${EMAIL_TO:-admin@capimax.com}"
EMAIL_FROM="${EMAIL_FROM:-backups@capimax.com}"

# ================================================================================
# FUNCTIONS
# ================================================================================

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_info "Checking dependencies..."

    # Check PostgreSQL client tools
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump not found. Install: sudo apt install postgresql-client"
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        print_error "psql not found. Install: sudo apt install postgresql-client"
        exit 1
    fi

    # Check compression tools
    if ! command -v gzip &> /dev/null; then
        print_error "gzip not found. Install: sudo apt install gzip"
        exit 1
    fi

    # Check AWS CLI if S3 enabled
    if [ "$S3_ENABLED" = "true" ]; then
        if ! command -v aws &> /dev/null; then
            print_warning "AWS CLI not found. S3 upload will be skipped."
            print_info "Install: sudo apt install awscli"
            S3_ENABLED=false
        fi
    fi

    print_info "Dependency check passed"
}

create_backup_dirs() {
    print_info "Creating backup directories..."

    mkdir -p "$LOCAL_BACKUP_DIR"
    mkdir -p "$S3_BACKUP_DIR"
    mkdir -p "/var/log/postgresql"

    # Set proper permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$LOCAL_BACKUP_DIR"
    chmod 700 "$S3_BACKUP_DIR"

    print_info "Backup directories created"
}

test_database_connection() {
    print_info "Testing database connection..."

    export PGPASSWORD="$PGPASSWORD"

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        print_error "Cannot connect to database"
        print_error "Host: $DB_HOST:$DB_PORT, User: $DB_USER, Database: $DB_NAME"
        exit 1
    fi

    print_info "Database connection successful"
}

get_database_size() {
    export PGPASSWORD="$PGPASSWORD"

    SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)

    echo "$SIZE"
}

perform_full_backup() {
    print_info "Starting full database backup..."
    print_info "Database: $DB_NAME"
    print_info "Size: $(get_database_size)"

    export PGPASSWORD="$PGPASSWORD"

    # Perform backup with pg_dump
    if pg_dump -h "$DB_HOST" \
               -p "$DB_PORT" \
               -U "$DB_USER" \
               -d "$DB_NAME" \
               --format=plain \
               --verbose \
               --no-owner \
               --no-acl \
               --file="$LOCAL_BACKUP_DIR/$BACKUP_FILENAME" 2>&1 | tee -a /var/log/postgresql/backup.log; then

        print_info "Database backup completed: $BACKUP_FILENAME"
    else
        print_error "Database backup failed"
        exit 1
    fi
}

perform_incremental_backup() {
    print_info "Starting incremental backup (WAL archiving)..."

    # For incremental backups, we use WAL archiving
    # This requires archive_mode = on in postgresql.conf

    WAL_ARCHIVE_DIR="/var/lib/postgresql/15/archive"

    if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
        print_warning "WAL archive directory not found: $WAL_ARCHIVE_DIR"
        print_info "Falling back to full backup"
        perform_full_backup
        return
    fi

    # Create tarball of WAL files
    TAR_FILE="$LOCAL_BACKUP_DIR/wal_archive_${TIMESTAMP}.tar.gz"

    tar -czf "$TAR_FILE" -C "$WAL_ARCHIVE_DIR" . 2>&1 | tee -a /var/log/postgresql/backup.log

    if [ -f "$TAR_FILE" ]; then
        print_info "WAL archive backup completed: $(basename $TAR_FILE)"
        BACKUP_ARCHIVE="wal_archive_${TIMESTAMP}.tar.gz"
    else
        print_error "WAL archive backup failed"
        exit 1
    fi
}

compress_backup() {
    if [ "$BACKUP_TYPE" = "incremental" ]; then
        print_info "Incremental backup already compressed"
        return
    fi

    print_info "Compressing backup..."

    if gzip -9 "$LOCAL_BACKUP_DIR/$BACKUP_FILENAME"; then
        print_info "Backup compressed: $BACKUP_ARCHIVE"
        print_info "Size: $(du -h "$LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE" | cut -f1)"
    else
        print_error "Backup compression failed"
        exit 1
    fi
}

verify_backup() {
    print_info "Verifying backup integrity..."

    BACKUP_PATH="$LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE"

    # Check file exists
    if [ ! -f "$BACKUP_PATH" ]; then
        print_error "Backup file not found: $BACKUP_PATH"
        exit 1
    fi

    # Check file size
    FILE_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH")
    if [ "$FILE_SIZE" -lt 1000 ]; then
        print_error "Backup file too small: $FILE_SIZE bytes"
        exit 1
    fi

    # Check gzip integrity
    if ! gzip -t "$BACKUP_PATH" 2>/dev/null; then
        print_error "Backup file is corrupted (gzip test failed)"
        exit 1
    fi

    print_info "Backup verification passed"
}

upload_to_s3() {
    if [ "$S3_ENABLED" != "true" ]; then
        print_info "S3 upload disabled, skipping..."
        return
    fi

    print_info "Uploading backup to S3..."
    print_info "Bucket: s3://$S3_BUCKET/$S3_PREFIX/"

    BACKUP_PATH="$LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE"
    S3_PATH="s3://$S3_BUCKET/$S3_PREFIX/$DATE/$BACKUP_ARCHIVE"

    # Copy to S3 staging first
    cp "$BACKUP_PATH" "$S3_BACKUP_DIR/"

    # Upload to S3
    if aws s3 cp "$S3_BACKUP_DIR/$BACKUP_ARCHIVE" "$S3_PATH" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$DATE,backup-type=$BACKUP_TYPE,database=$DB_NAME"; then

        print_info "S3 upload successful: $S3_PATH"

        # Remove from staging
        rm -f "$S3_BACKUP_DIR/$BACKUP_ARCHIVE"
    else
        print_error "S3 upload failed"
        print_warning "Backup saved locally at: $BACKUP_PATH"
    fi
}

cleanup_old_backups() {
    print_info "Cleaning up old backups..."

    # Cleanup local backups older than retention period
    print_info "Removing local backups older than $LOCAL_RETENTION_DAYS days..."
    find "$LOCAL_BACKUP_DIR" -name "*.sql.gz" -mtime +$LOCAL_RETENTION_DAYS -delete
    find "$LOCAL_BACKUP_DIR" -name "*.tar.gz" -mtime +$LOCAL_RETENTION_DAYS -delete

    LOCAL_COUNT=$(find "$LOCAL_BACKUP_DIR" -name "*.gz" | wc -l)
    print_info "Local backups retained: $LOCAL_COUNT"

    # Cleanup S3 backups (if enabled)
    if [ "$S3_ENABLED" = "true" ]; then
        print_info "Setting S3 lifecycle policy for retention..."

        # Create lifecycle policy
        cat > /tmp/s3_lifecycle_policy.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "$S3_PREFIX/",
      "Expiration": {
        "Days": $S3_RETENTION_DAYS
      }
    },
    {
      "Id": "TransitionToGlacier",
      "Status": "Enabled",
      "Prefix": "$S3_PREFIX/",
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

        # Apply lifecycle policy
        if aws s3api put-bucket-lifecycle-configuration \
            --bucket "$S3_BUCKET" \
            --lifecycle-configuration file:///tmp/s3_lifecycle_policy.json \
            --region "$S3_REGION" 2>/dev/null; then

            print_info "S3 lifecycle policy applied"
        else
            print_warning "Failed to apply S3 lifecycle policy"
        fi

        rm -f /tmp/s3_lifecycle_policy.json
    fi
}

send_notification() {
    if [ "$EMAIL_ENABLED" != "true" ]; then
        return
    fi

    SUBJECT="PostgreSQL Backup $BACKUP_TYPE - $(date +%Y-%m-%d)"
    BODY="Backup Status: $1

Database: $DB_NAME
Backup Type: $BACKUP_TYPE
Timestamp: $TIMESTAMP
Backup File: $BACKUP_ARCHIVE
Size: $(du -h "$LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE" 2>/dev/null | cut -f1 || echo "N/A")
S3 Upload: $2

Local Path: $LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE
"

    if [ "$S3_ENABLED" = "true" ]; then
        BODY="$BODY
S3 Path: s3://$S3_BUCKET/$S3_PREFIX/$DATE/$BACKUP_ARCHIVE"
    fi

    # Send email (requires mail command)
    if command -v mail &> /dev/null; then
        echo "$BODY" | mail -s "$SUBJECT" -r "$EMAIL_FROM" "$EMAIL_TO"
    fi
}

generate_backup_report() {
    REPORT_FILE="/var/log/postgresql/backup_report_${TIMESTAMP}.txt"

    cat > "$REPORT_FILE" <<EOF
================================================================================
PostgreSQL Backup Report
================================================================================

Date: $(date)
Backup Type: $BACKUP_TYPE
Database: $DB_NAME
Database Size: $(get_database_size)

Backup Details:
--------------
Filename: $BACKUP_ARCHIVE
Path: $LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE
Size: $(du -h "$LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE" | cut -f1)
MD5: $(md5sum "$LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE" | cut -d' ' -f1)

S3 Upload:
---------
Enabled: $S3_ENABLED
Bucket: s3://$S3_BUCKET/$S3_PREFIX/$DATE/
Status: $([ "$S3_ENABLED" = "true" ] && echo "Uploaded" || echo "Disabled")

Retention Policy:
----------------
Local: $LOCAL_RETENTION_DAYS days
S3: $S3_RETENTION_DAYS days

Local Backups:
-------------
$(ls -lh "$LOCAL_BACKUP_DIR" | tail -n +2)

================================================================================
Backup completed successfully
================================================================================
EOF

    print_info "Backup report generated: $REPORT_FILE"
    cat "$REPORT_FILE"
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    echo ""
    echo "================================================================================"
    echo "PostgreSQL Backup Script - Capimax Platform"
    echo "================================================================================"
    echo ""
    print_info "Backup Type: $BACKUP_TYPE"
    print_info "Database: $DB_NAME"
    print_info "Timestamp: $TIMESTAMP"
    echo ""

    # Pre-flight checks
    check_dependencies
    create_backup_dirs
    test_database_connection

    # Perform backup based on type
    if [ "$BACKUP_TYPE" = "incremental" ]; then
        perform_incremental_backup
    else
        perform_full_backup
        compress_backup
    fi

    # Verify and upload
    verify_backup
    upload_to_s3

    # Cleanup old backups
    cleanup_old_backups

    # Generate report
    generate_backup_report

    # Send notification
    send_notification "SUCCESS" "$([ "$S3_ENABLED" = "true" ] && echo "Success" || echo "Disabled")"

    echo ""
    print_info "Backup completed successfully!"
    print_info "Backup file: $LOCAL_BACKUP_DIR/$BACKUP_ARCHIVE"
    echo ""
}

# Run main function
main "$@"
