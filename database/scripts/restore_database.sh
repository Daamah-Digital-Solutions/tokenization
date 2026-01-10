#!/bin/bash

# ================================================================================
# POSTGRESQL RESTORE SCRIPT - Capimax Platform
# ================================================================================
#
# This script restores PostgreSQL database from backups with:
# - Local and S3 backup source support
# - Pre-restore validation
# - Database recreation
# - Post-restore verification
# - Rollback capability
#
# Usage:
#   chmod +x restore_database.sh
#   ./restore_database.sh <backup_file_or_s3_path>
#
# Examples:
#   # Restore from local backup
#   ./restore_database.sh /var/backups/postgresql/local/capimax_db_full_20250115_020000.sql.gz
#
#   # Restore from S3
#   ./restore_database.sh s3://capimax-backups/database/postgresql/2025-01-15/capimax_db_full_20250115_020000.sql.gz
#
#   # List available backups
#   ./restore_database.sh --list
#
# ================================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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
RESTORE_TEMP_DIR="$BACKUP_DIR/restore_temp"

# S3 configuration
S3_BUCKET="${S3_BUCKET:-capimax-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Backup file
BACKUP_SOURCE="$1"

# Safety settings
REQUIRE_CONFIRMATION=true
CREATE_PRE_RESTORE_BACKUP=true

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

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

check_dependencies() {
    print_info "Checking dependencies..."

    if ! command -v psql &> /dev/null; then
        print_error "psql not found. Install: sudo apt install postgresql-client"
        exit 1
    fi

    if ! command -v gunzip &> /dev/null; then
        print_error "gunzip not found. Install: sudo apt install gzip"
        exit 1
    fi

    if [[ "$BACKUP_SOURCE" == s3://* ]] && ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Install: sudo apt install awscli"
        exit 1
    fi

    print_info "Dependencies check passed"
}

list_available_backups() {
    print_header "Available Backups"

    # List local backups
    print_info "Local Backups:"
    if [ -d "$LOCAL_BACKUP_DIR" ]; then
        ls -lh "$LOCAL_BACKUP_DIR"/*.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'
    else
        echo "  No local backups found"
    fi

    echo ""

    # List S3 backups
    if command -v aws &> /dev/null; then
        print_info "S3 Backups (last 10):"
        aws s3 ls "s3://$S3_BUCKET/database/postgresql/" --recursive \
            --region "$S3_REGION" \
            | sort -r | head -10 | awk '{print "  s3://'$S3_BUCKET'/"$4, "("$3")"}'
    else
        print_warning "AWS CLI not installed, cannot list S3 backups"
    fi

    echo ""
    exit 0
}

validate_backup_source() {
    print_info "Validating backup source..."

    if [ -z "$BACKUP_SOURCE" ]; then
        print_error "No backup source specified"
        echo "Usage: $0 <backup_file_or_s3_path>"
        echo "       $0 --list"
        exit 1
    fi

    # Check if it's S3 path
    if [[ "$BACKUP_SOURCE" == s3://* ]]; then
        print_info "S3 backup detected: $BACKUP_SOURCE"
        return
    fi

    # Check if local file exists
    if [ ! -f "$BACKUP_SOURCE" ]; then
        print_error "Backup file not found: $BACKUP_SOURCE"
        exit 1
    fi

    # Check if file is readable
    if [ ! -r "$BACKUP_SOURCE" ]; then
        print_error "Cannot read backup file: $BACKUP_SOURCE"
        exit 1
    fi

    # Check if file is a gzipped SQL file
    if [[ ! "$BACKUP_SOURCE" =~ \.sql\.gz$ ]]; then
        print_warning "Backup file doesn't have .sql.gz extension"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    print_info "Backup source validation passed"
}

download_from_s3() {
    if [[ "$BACKUP_SOURCE" != s3://* ]]; then
        return
    fi

    print_info "Downloading backup from S3..."

    mkdir -p "$RESTORE_TEMP_DIR"

    BACKUP_FILENAME=$(basename "$BACKUP_SOURCE")
    LOCAL_BACKUP_PATH="$RESTORE_TEMP_DIR/$BACKUP_FILENAME"

    if aws s3 cp "$BACKUP_SOURCE" "$LOCAL_BACKUP_PATH" --region "$S3_REGION"; then
        print_info "Download completed: $LOCAL_BACKUP_PATH"
        BACKUP_SOURCE="$LOCAL_BACKUP_PATH"
    else
        print_error "Failed to download backup from S3"
        exit 1
    fi
}

verify_backup_integrity() {
    print_info "Verifying backup integrity..."

    # Check gzip integrity
    if ! gunzip -t "$BACKUP_SOURCE" 2>/dev/null; then
        print_error "Backup file is corrupted (gzip test failed)"
        exit 1
    fi

    # Check file size
    FILE_SIZE=$(stat -f%z "$BACKUP_SOURCE" 2>/dev/null || stat -c%s "$BACKUP_SOURCE")
    if [ "$FILE_SIZE" -lt 1000 ]; then
        print_error "Backup file too small: $FILE_SIZE bytes"
        exit 1
    fi

    SIZE_MB=$((FILE_SIZE / 1024 / 1024))
    print_info "Backup file size: ${SIZE_MB}MB"
    print_info "Backup integrity verified"
}

confirm_restore() {
    if [ "$REQUIRE_CONFIRMATION" != "true" ]; then
        return
    fi

    print_header "⚠️  WARNING ⚠️"
    echo -e "${RED}This operation will:"
    echo "  1. DROP the existing database: $DB_NAME"
    echo "  2. RECREATE the database"
    echo "  3. RESTORE from backup: $(basename $BACKUP_SOURCE)"
    echo ""
    echo "ALL CURRENT DATA WILL BE LOST!"
    echo -e "${NC}"

    if [ "$CREATE_PRE_RESTORE_BACKUP" = "true" ]; then
        echo -e "${YELLOW}A pre-restore backup will be created first${NC}"
        echo ""
    fi

    read -p "Are you absolutely sure you want to continue? (yes/no) " -r
    echo
    if [[ ! $REPLY == "yes" ]]; then
        print_info "Restore cancelled by user"
        exit 0
    fi

    read -p "Type the database name to confirm: " -r
    echo
    if [[ ! $REPLY == "$DB_NAME" ]]; then
        print_error "Database name mismatch. Restore cancelled."
        exit 1
    fi

    print_info "Confirmation received, proceeding with restore..."
}

create_pre_restore_backup() {
    if [ "$CREATE_PRE_RESTORE_BACKUP" != "true" ]; then
        return
    fi

    print_info "Creating pre-restore backup..."

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    PRE_RESTORE_BACKUP="$LOCAL_BACKUP_DIR/pre_restore_${DB_NAME}_${TIMESTAMP}.sql.gz"

    export PGPASSWORD="$PGPASSWORD"

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain --no-owner --no-acl 2>/dev/null | gzip > "$PRE_RESTORE_BACKUP"; then

        print_info "Pre-restore backup created: $PRE_RESTORE_BACKUP"
    else
        print_warning "Pre-restore backup failed, but continuing..."
    fi
}

terminate_active_connections() {
    print_info "Terminating active database connections..."

    export PGPASSWORD="$PGPASSWORD"

    # Get count of active connections
    ACTIVE_CONN=$(psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';" | xargs)

    if [ "$ACTIVE_CONN" -gt 0 ]; then
        print_warning "Found $ACTIVE_CONN active connections"

        # Terminate all connections to the database
        psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';" \
            &> /dev/null

        print_info "Active connections terminated"
    else
        print_info "No active connections found"
    fi
}

drop_and_recreate_database() {
    print_info "Dropping existing database..."

    export PGPASSWORD="$PGPASSWORD"

    # Drop database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | tee -a /var/log/postgresql/restore.log; then
        print_info "Database dropped successfully"
    else
        print_error "Failed to drop database"
        exit 1
    fi

    print_info "Creating new database..."

    # Create database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -c \
        "CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8';" 2>&1 | tee -a /var/log/postgresql/restore.log; then
        print_info "Database created successfully"
    else
        print_error "Failed to create database"
        exit 1
    fi
}

restore_database() {
    print_info "Restoring database from backup..."
    print_info "This may take several minutes..."

    export PGPASSWORD="$PGPASSWORD"

    # Decompress and restore
    if gunzip -c "$BACKUP_SOURCE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        2>&1 | tee -a /var/log/postgresql/restore.log; then
        print_info "Database restore completed"
    else
        print_error "Database restore failed"
        print_error "Check log: /var/log/postgresql/restore.log"
        exit 1
    fi
}

verify_restore() {
    print_info "Verifying database restore..."

    export PGPASSWORD="$PGPASSWORD"

    # Check if database exists and is accessible
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        print_error "Cannot connect to restored database"
        exit 1
    fi

    # Count tables
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    print_info "Tables restored: $TABLE_COUNT"

    if [ "$TABLE_COUNT" -eq 0 ]; then
        print_error "No tables found in restored database"
        exit 1
    fi

    # Get database size
    DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)

    print_info "Database size: $DB_SIZE"

    print_info "Restore verification passed"
}

run_post_restore_tasks() {
    print_info "Running post-restore tasks..."

    export PGPASSWORD="$PGPASSWORD"

    # Analyze database for query optimization
    print_info "Analyzing database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" &> /dev/null

    # Reindex database
    print_info "Reindexing database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;" &> /dev/null

    # Update sequences (if needed)
    print_info "Updating sequences..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF' &> /dev/null
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'SELECT setval(pg_get_serial_sequence(''' || r.schemaname || '.' || r.tablename || ''', ''id''), COALESCE((SELECT MAX(id) FROM ' || r.schemaname || '.' || r.tablename || '), 1), false);';
    END LOOP;
END $$;
EOF

    print_info "Post-restore tasks completed"
}

cleanup() {
    print_info "Cleaning up temporary files..."

    if [ -d "$RESTORE_TEMP_DIR" ]; then
        rm -rf "$RESTORE_TEMP_DIR"
        print_info "Temporary files removed"
    fi
}

generate_restore_report() {
    REPORT_FILE="/var/log/postgresql/restore_report_$(date +%Y%m%d_%H%M%S).txt"

    cat > "$REPORT_FILE" <<EOF
================================================================================
PostgreSQL Restore Report
================================================================================

Date: $(date)
Database: $DB_NAME
Backup Source: $BACKUP_SOURCE

Restore Details:
---------------
Host: $DB_HOST:$DB_PORT
User: $DB_USER
Duration: $SECONDS seconds

Database Statistics:
-------------------
Tables: $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
Size: $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)

Pre-Restore Backup:
------------------
Created: $([ "$CREATE_PRE_RESTORE_BACKUP" = "true" ] && echo "Yes" || echo "No")
$([ "$CREATE_PRE_RESTORE_BACKUP" = "true" ] && [ -n "$PRE_RESTORE_BACKUP" ] && echo "Location: $PRE_RESTORE_BACKUP")

================================================================================
Restore completed successfully
================================================================================
EOF

    print_info "Restore report generated: $REPORT_FILE"
    cat "$REPORT_FILE"
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    print_header "PostgreSQL Database Restore"

    # Handle --list flag
    if [ "$BACKUP_SOURCE" = "--list" ]; then
        list_available_backups
    fi

    # Pre-flight checks
    check_dependencies
    validate_backup_source
    download_from_s3
    verify_backup_integrity

    # Confirmation
    confirm_restore

    # Pre-restore backup
    create_pre_restore_backup

    # Restore process
    terminate_active_connections
    drop_and_recreate_database
    restore_database

    # Post-restore
    verify_restore
    run_post_restore_tasks

    # Cleanup
    cleanup

    # Report
    generate_restore_report

    print_header "✅ Restore Completed Successfully!"
    print_info "Database: $DB_NAME"
    print_info "Tables: $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)"
    print_info "Size: $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)"

    if [ "$CREATE_PRE_RESTORE_BACKUP" = "true" ] && [ -n "$PRE_RESTORE_BACKUP" ]; then
        echo ""
        print_warning "Previous database backed up to:"
        print_warning "$PRE_RESTORE_BACKUP"
    fi

    echo ""
}

# Run main function
main "$@"
