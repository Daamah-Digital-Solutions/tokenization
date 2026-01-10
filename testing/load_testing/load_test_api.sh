#!/bin/bash

# ================================================================================
# API LOAD TESTING SCRIPT - Apache Bench & wrk
# ================================================================================
#
# This script performs load testing on the Capimax API endpoints
# to measure performance, identify bottlenecks, and ensure scalability.
#
# Usage:
#   chmod +x load_test_api.sh
#   ./load_test_api.sh https://your-domain.com
#
# Requirements:
#   - Apache Bench (ab): sudo apt install apache2-utils
#   - wrk: sudo apt install wrk
#   - jq: sudo apt install jq
#
# ================================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-https://capimaxinvestment.com}"
RESULTS_DIR="load_test_results_$(date +%Y%m%d_%H%M%S)"
CONCURRENT_USERS=(10 50 100 200)
DURATION=30  # seconds

# Test endpoints
ENDPOINTS=(
    "/api/v1/properties/"
    "/api/v1/properties/1/"
    "/api/v1/analytics/platform/"
)

# ================================================================================
# FUNCTIONS
# ================================================================================

print_header() {
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}================================${NC}"
}

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

    if ! command -v ab &> /dev/null; then
        print_error "Apache Bench (ab) not found. Install: sudo apt install apache2-utils"
        exit 1
    fi

    if ! command -v wrk &> /dev/null; then
        print_warning "wrk not found. wrk tests will be skipped. Install: sudo apt install wrk"
    fi

    print_info "Dependencies check passed ✓"
}

create_results_dir() {
    mkdir -p "$RESULTS_DIR"
    print_info "Results directory: $RESULTS_DIR"
}

# ================================================================================
# APACHE BENCH TESTS
# ================================================================================

run_ab_test() {
    local endpoint=$1
    local concurrent=$2
    local total_requests=$((concurrent * 100))
    local output_file="$RESULTS_DIR/ab_${endpoint//\//_}_c${concurrent}.txt"

    print_info "Testing: $endpoint (${concurrent} concurrent, ${total_requests} total)"

    ab -n $total_requests \
       -c $concurrent \
       -g "$RESULTS_DIR/ab_${endpoint//\//_}_c${concurrent}.tsv" \
       "$BASE_URL$endpoint" > "$output_file" 2>&1 || true

    # Extract key metrics
    if [ -f "$output_file" ]; then
        echo ""
        echo "Results for $endpoint (Concurrent: $concurrent):"
        grep "Requests per second" "$output_file" || echo "  N/A"
        grep "Time per request.*mean" "$output_file" || echo "  N/A"
        grep "Transfer rate" "$output_file" || echo "  N/A"
        grep "Failed requests" "$output_file" || echo "  N/A"
        echo ""
    fi
}

run_all_ab_tests() {
    print_header "Apache Bench Load Tests"

    for endpoint in "${ENDPOINTS[@]}"; do
        for concurrent in "${CONCURRENT_USERS[@]}"; do
            run_ab_test "$endpoint" "$concurrent"
            sleep 2  # Cool down between tests
        done
    done

    print_info "Apache Bench tests completed ✓"
}

# ================================================================================
# WRK TESTS
# ================================================================================

run_wrk_test() {
    local endpoint=$1
    local concurrent=$2
    local output_file="$RESULTS_DIR/wrk_${endpoint//\//_}_c${concurrent}.txt"

    print_info "Testing: $endpoint (${concurrent} connections, ${DURATION}s duration)"

    wrk -t${concurrent} \
        -c${concurrent} \
        -d${DURATION}s \
        --latency \
        "$BASE_URL$endpoint" > "$output_file" 2>&1 || true

    # Display results
    if [ -f "$output_file" ]; then
        echo ""
        echo "Results for $endpoint (Connections: $concurrent):"
        cat "$output_file"
        echo ""
    fi
}

run_all_wrk_tests() {
    if ! command -v wrk &> /dev/null; then
        print_warning "Skipping wrk tests (not installed)"
        return
    fi

    print_header "wrk Load Tests"

    for endpoint in "${ENDPOINTS[@]}"; do
        for concurrent in "${CONCURRENT_USERS[@]}"; do
            run_wrk_test "$endpoint" "$concurrent"
            sleep 2
        done
    done

    print_info "wrk tests completed ✓"
}

# ================================================================================
# AUTHENTICATED ENDPOINTS TEST
# ================================================================================

test_authenticated_endpoints() {
    print_header "Authenticated Endpoint Tests"

    # Note: Replace with actual JWT token
    local token="YOUR_JWT_TOKEN_HERE"

    if [ "$token" = "YOUR_JWT_TOKEN_HERE" ]; then
        print_warning "JWT token not set. Skipping authenticated tests."
        print_info "To test authenticated endpoints, edit this script and add a valid JWT token."
        return
    fi

    local auth_endpoints=(
        "/api/v1/investments/"
        "/api/v1/dashboard/investor/"
    )

    for endpoint in "${auth_endpoints[@]}"; do
        print_info "Testing authenticated: $endpoint"

        ab -n 1000 \
           -c 50 \
           -H "Authorization: Bearer $token" \
           "$BASE_URL$endpoint" > "$RESULTS_DIR/ab_auth_${endpoint//\//_}.txt" 2>&1 || true

        sleep 2
    done

    print_info "Authenticated tests completed ✓"
}

# ================================================================================
# WEBSOCKET LOAD TEST
# ================================================================================

test_websocket_load() {
    print_header "WebSocket Load Test"

    print_warning "WebSocket load testing requires additional tools (wscat, artillery)"
    print_info "To test WebSocket endpoints:"
    print_info "  1. Install wscat: npm install -g wscat"
    print_info "  2. Connect multiple clients: for i in {1..100}; do wscat -c wss://your-domain.com/ws/notifications/user-\$i/ & done"
    print_info "  3. Monitor connections: netstat -an | grep :443 | wc -l"
}

# ================================================================================
# STRESS TEST
# ================================================================================

run_stress_test() {
    print_header "Stress Test - Finding Breaking Point"

    local endpoint="/api/v1/properties/"
    local concurrent_levels=(50 100 200 500 1000 2000)

    print_info "Testing endpoint: $endpoint"
    print_info "Gradually increasing load until failure..."
    echo ""

    for concurrent in "${concurrent_levels[@]}"; do
        print_info "Testing with $concurrent concurrent users..."

        local total_requests=$((concurrent * 50))
        local output_file="$RESULTS_DIR/stress_c${concurrent}.txt"

        ab -n $total_requests \
           -c $concurrent \
           -t 30 \
           "$BASE_URL$endpoint" > "$output_file" 2>&1 || true

        # Check for failures
        local failed=$(grep "Failed requests:" "$output_file" | awk '{print $3}')
        local rps=$(grep "Requests per second:" "$output_file" | awk '{print $4}')

        echo "  Concurrent: $concurrent | RPS: $rps | Failed: $failed"

        # If more than 10% failed, stop
        if [ ! -z "$failed" ] && [ "$failed" -gt $((total_requests / 10)) ]; then
            print_warning "Breaking point reached at $concurrent concurrent users"
            break
        fi

        sleep 5
    done

    print_info "Stress test completed ✓"
}

# ================================================================================
# GENERATE REPORT
# ================================================================================

generate_report() {
    print_header "Generating Report"

    local report_file="$RESULTS_DIR/REPORT.md"

    cat > "$report_file" <<EOF
# Load Testing Report

**Date:** $(date)
**Base URL:** $BASE_URL
**Test Duration:** $DURATION seconds per test

## Test Summary

### Endpoints Tested
EOF

    for endpoint in "${ENDPOINTS[@]}"; do
        echo "- $endpoint" >> "$report_file"
    done

    cat >> "$report_file" <<EOF

### Concurrent User Levels
EOF

    for concurrent in "${CONCURRENT_USERS[@]}"; do
        echo "- $concurrent users" >> "$report_file"
    done

    cat >> "$report_file" <<EOF

## Results

### Apache Bench Results
EOF

    # Extract key metrics from each test
    for file in "$RESULTS_DIR"/ab_*.txt; do
        if [ -f "$file" ]; then
            echo "" >> "$report_file"
            echo "#### $(basename $file .txt)" >> "$report_file"
            echo "\`\`\`" >> "$report_file"
            grep "Requests per second" "$file" >> "$report_file" || echo "N/A" >> "$report_file"
            grep "Time per request.*mean" "$file" >> "$report_file" || echo "N/A" >> "$report_file"
            grep "Failed requests" "$file" >> "$report_file" || echo "N/A" >> "$report_file"
            echo "\`\`\`" >> "$report_file"
        fi
    done

    cat >> "$report_file" <<EOF

## Recommendations

Based on the test results:

1. **Response Times:**
   - Target: < 200ms for list endpoints
   - Target: < 100ms for detail endpoints

2. **Throughput:**
   - Minimum: 100 requests/second
   - Target: 500+ requests/second

3. **Failure Rate:**
   - Should be < 1% under normal load
   - Should be < 5% under peak load

4. **Next Steps:**
   - If targets not met, consider:
     - Database query optimization
     - Caching implementation
     - CDN for static content
     - Horizontal scaling (more servers)
     - Database connection pooling
     - Redis for session/cache

## Test Files

All detailed results saved in: $RESULTS_DIR
EOF

    print_info "Report generated: $report_file"

    # Display report
    echo ""
    cat "$report_file"
    echo ""
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    clear
    print_header "Capimax API Load Testing"
    echo ""
    print_info "Base URL: $BASE_URL"
    print_info "Test Duration: $DURATION seconds"
    print_info "Concurrent Users: ${CONCURRENT_USERS[*]}"
    echo ""

    # Pre-flight checks
    check_dependencies
    create_results_dir

    # Run tests
    run_all_ab_tests
    run_all_wrk_tests
    test_authenticated_endpoints
    test_websocket_load
    run_stress_test

    # Generate report
    generate_report

    print_header "Load Testing Complete!"
    print_info "Results saved in: $RESULTS_DIR"
}

# Run main function
main "$@"
