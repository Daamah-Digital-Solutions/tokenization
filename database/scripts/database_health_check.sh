#!/bin/bash

# ================================================================================
# POSTGRESQL HEALTH CHECK SCRIPT - Capimax Platform
# ================================================================================
#
# This script performs comprehensive health checks on PostgreSQL database:
# - Connection status
# - Database size and growth
# - Table bloat detection
# - Index health
# - Query performance
# - Replication status
# - Lock monitoring
# - Cache hit ratio
# - Transaction performance
#
# Usage:
#   chmod +x database_health_check.sh
#   ./database_health_check.sh [--verbose] [--json]
#
# Cron example (hourly):
#   0 * * * * /path/to/database_health_check.sh >> /var/log/postgresql/health_check.log 2>&1
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

# Output options
VERBOSE=false
JSON_OUTPUT=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --verbose)
            VERBOSE=true
            ;;
        --json)
            JSON_OUTPUT=true
            ;;
    esac
done

# Health check thresholds
MAX_CONNECTION_PCT=80      # Alert if connections > 80% of max
MAX_DB_SIZE_GB=100         # Alert if database > 100GB
MIN_CACHE_HIT_RATIO=0.95   # Alert if cache hit ratio < 95%
MAX_LONG_QUERIES=5         # Alert if > 5 queries running > 30s
MAX_IDLE_TRANSACTIONS=10   # Alert if > 10 idle transactions > 5min
MAX_TABLE_BLOAT_PCT=20     # Alert if table bloat > 20%

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
FAILED_CHECKS=0

# Results storage
declare -a WARNINGS
declare -a ERRORS

# ================================================================================
# FUNCTIONS
# ================================================================================

print_info() {
    if [ "$JSON_OUTPUT" = "false" ]; then
        echo -e "${GREEN}[PASS]${NC} $1"
    fi
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

print_warning() {
    if [ "$JSON_OUTPUT" = "false" ]; then
        echo -e "${YELLOW}[WARN]${NC} $1"
    fi
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    WARNINGS+=("$1")
}

print_error() {
    if [ "$JSON_OUTPUT" = "false" ]; then
        echo -e "${RED}[FAIL]${NC} $1"
    fi
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    ERRORS+=("$1")
}

print_header() {
    if [ "$JSON_OUTPUT" = "false" ]; then
        echo -e "\n${BLUE}================================${NC}"
        echo -e "${BLUE}$1${NC}"
        echo -e "${BLUE}================================${NC}\n"
    fi
}

run_query() {
    export PGPASSWORD="$PGPASSWORD"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null | xargs
}

# ================================================================================
# HEALTH CHECK FUNCTIONS
# ================================================================================

check_connection() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ "$VERBOSE" = "true" ] && [ "$JSON_OUTPUT" = "false" ]; then
        echo -n "Checking database connection... "
    fi

    export PGPASSWORD="$PGPASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        print_info "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

check_connections() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    MAX_CONN=$(run_query "SHOW max_connections;")
    CURRENT_CONN=$(run_query "SELECT count(*) FROM pg_stat_activity;")
    CONN_PCT=$((CURRENT_CONN * 100 / MAX_CONN))

    if [ "$CONN_PCT" -gt "$MAX_CONNECTION_PCT" ]; then
        print_warning "High connection usage: $CURRENT_CONN/$MAX_CONN ($CONN_PCT%)"
    else
        print_info "Connections: $CURRENT_CONN/$MAX_CONN ($CONN_PCT%)"
    fi
}

check_database_size() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    DB_SIZE=$(run_query "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    DB_SIZE_BYTES=$(run_query "SELECT pg_database_size('$DB_NAME');")
    DB_SIZE_GB=$((DB_SIZE_BYTES / 1024 / 1024 / 1024))

    if [ "$DB_SIZE_GB" -gt "$MAX_DB_SIZE_GB" ]; then
        print_warning "Database size: $DB_SIZE (exceeds ${MAX_DB_SIZE_GB}GB threshold)"
    else
        print_info "Database size: $DB_SIZE"
    fi
}

check_cache_hit_ratio() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    CACHE_HIT_RATIO=$(run_query "
        SELECT round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 4)
        FROM pg_statio_user_tables
        WHERE heap_blks_hit + heap_blks_read > 0;
    ")

    if [ -z "$CACHE_HIT_RATIO" ]; then
        CACHE_HIT_RATIO="0"
    fi

    CACHE_HIT_PCT=$(echo "$CACHE_HIT_RATIO * 100" | bc 2>/dev/null || echo "0")

    if (( $(echo "$CACHE_HIT_RATIO < $MIN_CACHE_HIT_RATIO" | bc -l) )); then
        print_warning "Low cache hit ratio: ${CACHE_HIT_PCT}% (target: 95%+)"
    else
        print_info "Cache hit ratio: ${CACHE_HIT_PCT}%"
    fi
}

check_long_running_queries() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    LONG_QUERIES=$(run_query "
        SELECT count(*)
        FROM pg_stat_activity
        WHERE state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        AND now() - query_start > interval '30 seconds';
    ")

    if [ "$LONG_QUERIES" -gt "$MAX_LONG_QUERIES" ]; then
        print_warning "Long running queries: $LONG_QUERIES (> 30 seconds)"
    else
        print_info "Long running queries: $LONG_QUERIES"
    fi
}

check_idle_transactions() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    IDLE_TX=$(run_query "
        SELECT count(*)
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
        AND now() - state_change > interval '5 minutes';
    ")

    if [ "$IDLE_TX" -gt "$MAX_IDLE_TRANSACTIONS" ]; then
        print_warning "Idle transactions: $IDLE_TX (> 5 minutes)"
    else
        print_info "Idle transactions: $IDLE_TX"
    fi
}

check_locks() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    LOCKS=$(run_query "SELECT count(*) FROM pg_locks WHERE NOT granted;")

    if [ "$LOCKS" -gt 0 ]; then
        print_warning "Blocked queries: $LOCKS waiting for locks"
    else
        print_info "No blocked queries"
    fi
}

check_deadlocks() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    DEADLOCKS=$(run_query "SELECT deadlocks FROM pg_stat_database WHERE datname = '$DB_NAME';")

    if [ -z "$DEADLOCKS" ]; then
        DEADLOCKS="0"
    fi

    if [ "$DEADLOCKS" -gt 0 ]; then
        print_warning "Deadlocks detected: $DEADLOCKS (since last stats reset)"
    else
        print_info "No deadlocks detected"
    fi
}

check_table_bloat() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    BLOATED_TABLES=$(run_query "
        SELECT count(*)
        FROM (
            SELECT schemaname, tablename,
                   round(CASE WHEN otta=0 OR sml.relpages=0 THEN 0.0
                         ELSE sml.relpages/otta::numeric END, 1) AS tbloat
            FROM (
                SELECT schemaname, tablename, cc.reltuples, cc.relpages, bs,
                       CEIL((cc.reltuples*((datahdr+ma-
                         (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta
                FROM (
                    SELECT ma, bs, schemaname, tablename,
                           (datawidth+(hdr+ma-(case when hdr%ma=0 THEN ma ELSE hdr%ma END)))::numeric AS datahdr,
                           (maxfracsum*(nullhdr+ma-(case when nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
                    FROM (
                        SELECT schemaname, tablename, hdr, ma, bs,
                               SUM((1-null_frac)*avg_width) AS datawidth,
                               MAX(null_frac) AS maxfracsum,
                               hdr+(
                                 SELECT 1+count(*)/8
                                 FROM pg_stats s2
                                 WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
                               ) AS nullhdr
                        FROM pg_stats s, (
                            SELECT (SELECT current_setting('block_size')::numeric) AS bs,
                                   CASE WHEN substring(v, 12, 3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
                                   CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
                            FROM (SELECT version() AS v) AS foo
                        ) AS constants
                        GROUP BY 1,2,3,4,5
                    ) AS foo
                ) AS rs
                JOIN pg_class cc ON cc.relname = rs.tablename
                JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname
            ) AS sml
        ) AS foo
        WHERE tbloat > 1.2;
    ")

    if [ "$BLOATED_TABLES" -gt 0 ]; then
        print_warning "Bloated tables: $BLOATED_TABLES tables (>20% bloat)"
    else
        print_info "Table bloat: Healthy"
    fi
}

check_unused_indexes() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    UNUSED_INDEXES=$(run_query "
        SELECT count(*)
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%pkey';
    ")

    if [ "$UNUSED_INDEXES" -gt 0 ]; then
        print_warning "Unused indexes: $UNUSED_INDEXES (consider dropping)"
    else
        print_info "All indexes in use"
    fi
}

check_replication_lag() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # Check if replication is configured
    IS_REPLICA=$(run_query "SELECT pg_is_in_recovery();")

    if [ "$IS_REPLICA" = "t" ]; then
        LAG=$(run_query "
            SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;
        ")

        if [ "$LAG" -gt 60 ]; then
            print_warning "Replication lag: ${LAG} seconds"
        else
            print_info "Replication lag: ${LAG} seconds"
        fi
    else
        if [ "$VERBOSE" = "true" ]; then
            print_info "Not a replica (primary database)"
        fi
    fi
}

check_autovacuum() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    AUTOVACUUM=$(run_query "SHOW autovacuum;")

    if [ "$AUTOVACUUM" != "on" ]; then
        print_error "Autovacuum is disabled (critical!)"
    else
        print_info "Autovacuum: enabled"
    fi
}

check_wal_archiving() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    ARCHIVE_MODE=$(run_query "SHOW archive_mode;")

    if [ "$ARCHIVE_MODE" = "on" ]; then
        # Check for failed archives
        FAILED_ARCHIVES=$(run_query "SELECT archived_count FROM pg_stat_archiver WHERE failed_count > 0;")

        if [ -n "$FAILED_ARCHIVES" ] && [ "$FAILED_ARCHIVES" != "0" ]; then
            print_warning "WAL archiving: Some archives failed"
        else
            print_info "WAL archiving: Active"
        fi
    else
        if [ "$VERBOSE" = "true" ]; then
            print_warning "WAL archiving: Disabled"
        fi
    fi
}

check_disk_space() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # Get PostgreSQL data directory
    DATA_DIR=$(run_query "SHOW data_directory;")

    if [ -n "$DATA_DIR" ]; then
        DISK_USAGE=$(df -h "$DATA_DIR" | tail -1 | awk '{print $5}' | tr -d '%')

        if [ "$DISK_USAGE" -gt 80 ]; then
            print_warning "Disk usage: ${DISK_USAGE}% (data directory)"
        else
            print_info "Disk usage: ${DISK_USAGE}%"
        fi
    fi
}

# ================================================================================
# DETAILED REPORTS (VERBOSE MODE)
# ================================================================================

show_top_tables_by_size() {
    if [ "$VERBOSE" != "true" ] || [ "$JSON_OUTPUT" = "true" ]; then
        return
    fi

    echo ""
    echo "Top 10 Tables by Size:"
    echo "----------------------"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF
}

show_slow_queries() {
    if [ "$VERBOSE" != "true" ] || [ "$JSON_OUTPUT" = "true" ]; then
        return
    fi

    echo ""
    echo "Top 10 Slowest Queries (by mean time):"
    echo "---------------------------------------"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    round(mean_time::numeric, 2) AS mean_ms,
    calls,
    round(total_time::numeric, 2) AS total_ms,
    substr(query, 1, 80) AS query_preview
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
EOF
}

show_connection_details() {
    if [ "$VERBOSE" != "true" ] || [ "$JSON_OUTPUT" = "true" ]; then
        return
    fi

    echo ""
    echo "Active Connections by State:"
    echo "----------------------------"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT state, count(*) AS count
FROM pg_stat_activity
GROUP BY state
ORDER BY count DESC;
EOF
}

# ================================================================================
# OUTPUT GENERATION
# ================================================================================

generate_json_output() {
    cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "failed": $FAILED_CHECKS,
    "status": "$([ $FAILED_CHECKS -eq 0 ] && echo "healthy" || echo "unhealthy")"
  },
  "warnings": [
$(IFS=$'\n'; for w in "${WARNINGS[@]}"; do echo "    \"$w\","; done | sed '$ s/,$//')
  ],
  "errors": [
$(IFS=$'\n'; for e in "${ERRORS[@]}"; do echo "    \"$e\","; done | sed '$ s/,$//')
  ]
}
EOF
}

generate_summary() {
    if [ "$JSON_OUTPUT" = "true" ]; then
        generate_json_output
        return
    fi

    print_header "Health Check Summary"

    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo ""

    if [ "$FAILED_CHECKS" -eq 0 ] && [ "$WARNING_CHECKS" -eq 0 ]; then
        echo -e "${GREEN}✅ Database health: EXCELLENT${NC}"
        echo "All checks passed. No issues detected."
    elif [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Database health: GOOD${NC}"
        echo "$WARNING_CHECKS warnings found. Review recommended."
    else
        echo -e "${RED}❌ Database health: POOR${NC}"
        echo "$FAILED_CHECKS critical issues found. Immediate action required!"
    fi

    echo ""

    if [ "$WARNING_CHECKS" -gt 0 ]; then
        echo "Warnings:"
        for warning in "${WARNINGS[@]}"; do
            echo "  - $warning"
        done
        echo ""
    fi

    if [ "$FAILED_CHECKS" -gt 0 ]; then
        echo "Critical Issues:"
        for error in "${ERRORS[@]}"; do
            echo "  - $error"
        done
        echo ""
    fi
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    if [ "$JSON_OUTPUT" = "false" ]; then
        print_header "PostgreSQL Health Check - Capimax Platform"
        echo "Database: $DB_NAME"
        echo "Timestamp: $(date)"
        echo ""
    fi

    # Connection check (must pass)
    if ! check_connection; then
        echo "Cannot proceed without database connection"
        exit 1
    fi

    # Run all health checks
    check_connections
    check_database_size
    check_cache_hit_ratio
    check_long_running_queries
    check_idle_transactions
    check_locks
    check_deadlocks
    check_table_bloat
    check_unused_indexes
    check_replication_lag
    check_autovacuum
    check_wal_archiving
    check_disk_space

    # Verbose reports
    show_top_tables_by_size
    show_slow_queries
    show_connection_details

    # Summary
    generate_summary

    # Exit code based on health
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        exit 2
    elif [ "$WARNING_CHECKS" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
