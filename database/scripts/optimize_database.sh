#!/bin/bash

# ================================================================================
# POSTGRESQL OPTIMIZATION SCRIPT - Capimax Platform
# ================================================================================
#
# This script performs database maintenance and optimization:
# - VACUUM ANALYZE (reclaim space and update statistics)
# - REINDEX (rebuild indexes)
# - Update table statistics
# - Identify missing indexes
# - Suggest query optimizations
#
# Usage:
#   chmod +x optimize_database.sh
#   ./optimize_database.sh [--full] [--dry-run]
#
# Options:
#   --full     : Run VACUUM FULL (more aggressive, requires lock)
#   --dry-run  : Show what would be done without executing
#
# Cron example (weekly on Sunday at 3 AM):
#   0 3 * * 0 /path/to/optimize_database.sh >> /var/log/postgresql/optimize.log 2>&1
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

# Options
FULL_VACUUM=false
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --full)
            FULL_VACUUM=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
    esac
done

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

run_query() {
    if [ "$DRY_RUN" = "true" ]; then
        echo "[DRY RUN] Would execute: $1"
        return
    fi

    export PGPASSWORD="$PGPASSWORD"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

# ================================================================================
# OPTIMIZATION TASKS
# ================================================================================

vacuum_analyze() {
    print_header "Running VACUUM ANALYZE"

    if [ "$FULL_VACUUM" = "true" ]; then
        print_warning "Running VACUUM FULL (this will lock tables!)"
        run_query "VACUUM FULL ANALYZE;"
    else
        print_info "Running standard VACUUM ANALYZE"
        run_query "VACUUM ANALYZE;"
    fi

    print_info "VACUUM ANALYZE completed"
}

reindex_database() {
    print_header "Reindexing Database"

    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY RUN] Would reindex database: $DB_NAME"
        return
    fi

    export PGPASSWORD="$PGPASSWORD"

    print_info "Reindexing all tables and indexes..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;"

    print_info "Reindexing completed"
}

update_statistics() {
    print_header "Updating Table Statistics"

    run_query "ANALYZE;"

    print_info "Statistics updated"
}

identify_missing_indexes() {
    print_header "Identifying Missing Indexes"

    export PGPASSWORD="$PGPASSWORD"

    print_info "Tables with sequential scans (may need indexes):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;
EOF

    echo ""
    print_info "Consider adding indexes on frequently scanned tables"
}

identify_unused_indexes() {
    print_header "Identifying Unused Indexes"

    export PGPASSWORD="$PGPASSWORD"

    print_info "Indexes with zero scans (consider dropping):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
EOF

    echo ""
    print_info "Review unused indexes for potential removal"
}

identify_duplicate_indexes() {
    print_header "Identifying Duplicate Indexes"

    export PGPASSWORD="$PGPASSWORD"

    print_info "Potential duplicate indexes:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS size,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
         COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;
EOF

    echo ""
}

check_table_bloat() {
    print_header "Checking Table Bloat"

    export PGPASSWORD="$PGPASSWORD"

    print_info "Tables with significant bloat (>20%):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    round((CASE WHEN otta=0 OR sml.relpages=0 THEN 0.0
           ELSE sml.relpages/otta::numeric END)*100, 1) AS bloat_pct
FROM (
    SELECT schemaname, tablename, cc.reltuples, cc.relpages, bs,
           CEIL((cc.reltuples*((datahdr+ma-
             (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta
    FROM (
        SELECT schemaname, tablename, hdr, ma, bs,
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
                       23 AS hdr, 4 AS ma
            ) AS constants
            GROUP BY 1,2,3,4,5
        ) AS foo
    ) AS rs
    JOIN pg_class cc ON cc.relname = rs.tablename
    JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname
) AS sml
WHERE (CASE WHEN otta=0 OR sml.relpages=0 THEN 0.0
       ELSE sml.relpages/otta::numeric END) > 1.2
ORDER BY (CASE WHEN otta=0 OR sml.relpages=0 THEN 0.0
          ELSE sml.relpages/otta::numeric END) DESC
LIMIT 10;
EOF

    echo ""
    print_info "Consider running VACUUM FULL on bloated tables"
}

analyze_slow_queries() {
    print_header "Analyzing Slow Queries"

    export PGPASSWORD="$PGPASSWORD"

    print_info "Top 10 slowest queries (requires pg_stat_statements):"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    round(mean_time::numeric, 2) AS mean_ms,
    round(total_time::numeric, 2) AS total_ms,
    calls,
    substr(query, 1, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 10;
EOF 2>/dev/null || print_warning "pg_stat_statements extension not enabled"

    echo ""
}

generate_optimization_report() {
    print_header "Optimization Recommendations"

    export PGPASSWORD="$PGPASSWORD"

    echo "Database Statistics:"
    echo "-------------------"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT
    'Database Size' AS metric,
    pg_size_pretty(pg_database_size('$DB_NAME')) AS value
UNION ALL
SELECT
    'Total Tables',
    count(*)::text
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Total Indexes',
    count(*)::text
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Cache Hit Ratio',
    round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2)::text || '%'
FROM pg_statio_user_tables
WHERE heap_blks_hit + heap_blks_read > 0;
EOF

    echo ""
    echo "Recommendations:"
    echo "---------------"
    echo "1. Run VACUUM ANALYZE weekly (or daily for high-write workloads)"
    echo "2. Run REINDEX monthly to rebuild fragmented indexes"
    echo "3. Monitor and drop unused indexes to save space"
    echo "4. Add indexes on frequently scanned columns"
    echo "5. Consider partitioning large tables (>10GB)"
    echo "6. Enable pg_stat_statements for query analysis"
    echo "7. Review slow queries and optimize them"
    echo "8. Monitor table bloat and run VACUUM FULL if needed"
    echo ""
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    print_header "PostgreSQL Optimization - Capimax Platform"

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi

    if [ "$FULL_VACUUM" = "true" ]; then
        print_warning "FULL VACUUM will lock tables during operation"
        read -p "Continue? (yes/no) " -r
        if [[ ! $REPLY == "yes" ]]; then
            print_info "Operation cancelled"
            exit 0
        fi
    fi

    echo ""

    # Run optimization tasks
    vacuum_analyze
    reindex_database
    update_statistics

    # Analysis and recommendations
    identify_missing_indexes
    identify_unused_indexes
    identify_duplicate_indexes
    check_table_bloat
    analyze_slow_queries

    # Final report
    generate_optimization_report

    print_header "Optimization Complete!"
    print_info "Database: $DB_NAME"
    print_info "Timestamp: $(date)"
    echo ""
}

# Run main function
main "$@"
