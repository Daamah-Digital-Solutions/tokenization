#!/bin/bash

# ================================================================================
# AUTOMATED SECURITY TEST SUITE - Capimax Platform
# ================================================================================
#
# This script automates common security tests for the Capimax platform.
# It tests authentication, authorization, injection vulnerabilities, and more.
#
# Usage:
#   chmod +x security_test_suite.sh
#   ./security_test_suite.sh https://your-domain.com
#
# Requirements:
#   - curl, jq, sqlmap (optional), nmap (optional)
#
# ================================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-https://capimaxinvestment.com}"
API_URL="$BASE_URL/api/v1"
RESULTS_DIR="security_test_results_$(date +%Y%m%d_%H%M%S)"

# Test credentials (use test accounts only!)
TEST_EMAIL="${TEST_EMAIL:-test@test.com}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass123!}"
TEST_TOKEN=""

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# ================================================================================
# UTILITY FUNCTIONS
# ================================================================================

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $1"
}

print_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    WARNING_TESTS=$((WARNING_TESTS + 1))
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

create_results_dir() {
    mkdir -p "$RESULTS_DIR"
    print_info "Results directory: $RESULTS_DIR"
}

# ================================================================================
# AUTHENTICATION TESTS
# ================================================================================

test_jwt_authentication() {
    print_header "Authentication Tests"

    # Test 1: Login with valid credentials
    print_test "Valid login"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login/" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        TEST_TOKEN=$(echo "$BODY" | jq -r '.data.access // .access // empty')
        if [ -n "$TEST_TOKEN" ] && [ "$TEST_TOKEN" != "null" ]; then
            print_pass "Login successful, token obtained"
            echo "$TEST_TOKEN" > "$RESULTS_DIR/test_token.txt"
        else
            print_fail "Login returned 200 but no token found"
        fi
    else
        print_fail "Login failed with HTTP $HTTP_CODE"
        echo "$BODY" > "$RESULTS_DIR/login_failure.json"
    fi

    # Test 2: Login with invalid credentials
    print_test "Invalid login (wrong password)"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login/" \
        -H "Content-Type: application/json" \
        -d '{"email":"'$TEST_EMAIL'","password":"WrongPassword123!"}')

    if [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "400" ]; then
        print_pass "Invalid credentials rejected (HTTP $RESPONSE)"
    else
        print_fail "Invalid credentials not properly rejected (HTTP $RESPONSE)"
    fi

    # Test 3: Access protected endpoint without token
    print_test "Access protected endpoint without token"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/dashboard/investor/")

    if [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "403" ]; then
        print_pass "Unauthenticated access rejected (HTTP $RESPONSE)"
    else
        print_fail "Unauthenticated access not rejected (HTTP $RESPONSE)"
    fi

    # Test 4: Access with invalid token
    print_test "Access with invalid token"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/dashboard/investor/" \
        -H "Authorization: Bearer invalid_token_12345")

    if [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "403" ]; then
        print_pass "Invalid token rejected (HTTP $RESPONSE)"
    else
        print_fail "Invalid token not rejected (HTTP $RESPONSE)"
    fi

    # Test 5: Brute force protection
    print_test "Brute force protection (multiple failed logins)"
    BLOCKED=false
    for i in {1..10}; do
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login/" \
            -H "Content-Type: application/json" \
            -d '{"email":"'$TEST_EMAIL'","password":"WrongPass'$i'"}')

        if [ "$RESPONSE" == "429" ]; then
            BLOCKED=true
            break
        fi
        sleep 0.5
    done

    if [ "$BLOCKED" = true ]; then
        print_pass "Brute force protection active (rate limited after attempts)"
    else
        print_warning "No rate limiting detected after 10 failed login attempts"
    fi
}

# ================================================================================
# AUTHORIZATION TESTS
# ================================================================================

test_authorization() {
    print_header "Authorization Tests"

    if [ -z "$TEST_TOKEN" ]; then
        print_warning "No test token available, skipping authorization tests"
        return
    fi

    # Test 1: IDOR - Access another user's resources
    print_test "IDOR: Attempt to access another user's profile"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/accounts/profile/999/" \
        -H "Authorization: Bearer $TEST_TOKEN")

    if [ "$RESPONSE" == "403" ] || [ "$RESPONSE" == "404" ]; then
        print_pass "IDOR prevented (HTTP $RESPONSE)"
    else
        print_fail "IDOR vulnerability possible (HTTP $RESPONSE)"
    fi

    # Test 2: Privilege escalation via mass assignment
    print_test "Mass assignment: Attempt to set privileged fields"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_URL/accounts/profile/" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"full_name":"Test User","is_staff":true,"is_superuser":true,"role":"admin"}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        # Check if privileged fields were actually set
        IS_STAFF=$(echo "$BODY" | jq -r '.data.is_staff // .is_staff // false')
        if [ "$IS_STAFF" == "true" ]; then
            print_fail "Mass assignment vulnerability: is_staff was set to true"
        else
            print_pass "Privileged fields not modified via mass assignment"
        fi
    elif [ "$HTTP_CODE" == "400" ]; then
        print_pass "Mass assignment attempt rejected (HTTP 400)"
    else
        print_warning "Unexpected response for mass assignment test (HTTP $HTTP_CODE)"
    fi

    # Test 3: Access admin endpoints as regular user
    print_test "Access admin endpoints as regular user"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/admin/users/" \
        -H "Authorization: Bearer $TEST_TOKEN")

    if [ "$RESPONSE" == "403" ] || [ "$RESPONSE" == "404" ]; then
        print_pass "Admin endpoint access denied (HTTP $RESPONSE)"
    else
        print_fail "Regular user can access admin endpoint (HTTP $RESPONSE)"
    fi
}

# ================================================================================
# SQL INJECTION TESTS
# ================================================================================

test_sql_injection() {
    print_header "SQL Injection Tests"

    # Test 1: SQL injection in login
    print_test "SQL injection in login (classic bypass)"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login/" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@test.com\" OR \"1\"=\"1","password":"anything"}')

    if [ "$RESPONSE" == "400" ] || [ "$RESPONSE" == "401" ]; then
        print_pass "SQL injection in login blocked (HTTP $RESPONSE)"
    elif [ "$RESPONSE" == "200" ]; then
        print_fail "CRITICAL: SQL injection bypass successful!"
    else
        print_warning "Unexpected response for SQL injection test (HTTP $RESPONSE)"
    fi

    # Test 2: SQL injection in search
    print_test "SQL injection in search parameter"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/properties/?search=Villa' OR '1'='1" \
        -H "Authorization: Bearer $TEST_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        # Check if response contains SQL errors
        if echo "$BODY" | grep -qi "sql\|syntax\|mysql\|postgres"; then
            print_fail "SQL error exposed in response"
            echo "$BODY" > "$RESULTS_DIR/sql_injection_search.json"
        else
            print_pass "Search handles SQL injection payload safely"
        fi
    elif [ "$HTTP_CODE" == "400" ]; then
        print_pass "Invalid search parameter rejected"
    else
        print_warning "Unexpected response (HTTP $HTTP_CODE)"
    fi

    # Test 3: SQL injection in property ID
    print_test "SQL injection in URL parameter (property ID)"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/properties/1' OR '1'='1/" \
        -H "Authorization: Bearer $TEST_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "400" ]; then
        print_pass "Invalid ID format rejected (HTTP $HTTP_CODE)"
    elif echo "$BODY" | grep -qi "sql\|syntax\|mysql\|postgres"; then
        print_fail "SQL error exposed in response"
    else
        print_pass "SQL injection in ID parameter handled safely"
    fi
}

# ================================================================================
# XSS TESTS
# ================================================================================

test_xss() {
    print_header "XSS Tests"

    if [ -z "$TEST_TOKEN" ]; then
        print_warning "No test token available, skipping XSS tests"
        return
    fi

    # Test 1: XSS in search parameter
    print_test "XSS in search parameter"
    RESPONSE=$(curl -s -X GET "$API_URL/properties/?search=<script>alert('XSS')</script>" \
        -H "Authorization: Bearer $TEST_TOKEN")

    if echo "$RESPONSE" | grep -q "<script>"; then
        print_fail "XSS payload not sanitized in search"
        echo "$RESPONSE" > "$RESULTS_DIR/xss_search.json"
    else
        print_pass "XSS payload sanitized in search"
    fi

    # Test 2: XSS in profile update
    print_test "Stored XSS in profile update"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_URL/accounts/profile/" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"full_name":"<script>alert(\"XSS\")</script>John Doe"}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        if echo "$BODY" | grep -q "<script>"; then
            print_fail "Stored XSS vulnerability in profile"
            echo "$BODY" > "$RESULTS_DIR/xss_profile.json"
        else
            print_pass "XSS payload sanitized in profile"
        fi
    elif [ "$HTTP_CODE" == "400" ]; then
        print_pass "XSS payload rejected by validation"
    fi

    # Test 3: XSS via image tag
    print_test "XSS via image onerror"
    RESPONSE=$(curl -s -X GET "$API_URL/properties/?search=<img src=x onerror=alert(1)>" \
        -H "Authorization: Bearer $TEST_TOKEN")

    if echo "$RESPONSE" | grep -q "onerror"; then
        print_fail "Image-based XSS not sanitized"
    else
        print_pass "Image-based XSS sanitized"
    fi
}

# ================================================================================
# RATE LIMITING TESTS
# ================================================================================

test_rate_limiting() {
    print_header "Rate Limiting Tests"

    # Test 1: API rate limiting
    print_test "API rate limiting (10 requests/second)"
    RATE_LIMITED=false
    START_TIME=$(date +%s)

    for i in {1..25}; do
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/properties/" \
            -H "Authorization: Bearer $TEST_TOKEN")

        if [ "$RESPONSE" == "429" ]; then
            RATE_LIMITED=true
            END_TIME=$(date +%s)
            TIME_TAKEN=$((END_TIME - START_TIME))
            print_pass "Rate limiting active (triggered at request $i after ${TIME_TAKEN}s)"
            break
        fi
    done

    if [ "$RATE_LIMITED" = false ]; then
        print_warning "No API rate limiting detected (25 requests completed)"
    fi

    # Cool down
    sleep 2

    # Test 2: Authentication rate limiting
    print_test "Authentication rate limiting"
    AUTH_LIMITED=false

    for i in {1..10}; do
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login/" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@test.com","password":"wrong"}')

        if [ "$RESPONSE" == "429" ]; then
            AUTH_LIMITED=true
            print_pass "Auth rate limiting active (triggered at attempt $i)"
            break
        fi
        sleep 1
    done

    if [ "$AUTH_LIMITED" = false ]; then
        print_warning "No auth rate limiting detected (10 attempts completed)"
    fi
}

# ================================================================================
# SECURITY HEADERS TESTS
# ================================================================================

test_security_headers() {
    print_header "Security Headers Tests"

    print_test "Fetching security headers"
    HEADERS=$(curl -s -I "$BASE_URL" | tr -d '\r')
    echo "$HEADERS" > "$RESULTS_DIR/security_headers.txt"

    # Test 1: HSTS
    print_test "HTTP Strict Transport Security (HSTS)"
    if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
        HSTS_VALUE=$(echo "$HEADERS" | grep -i "Strict-Transport-Security" | cut -d':' -f2-)
        if echo "$HSTS_VALUE" | grep -q "max-age=[0-9]"; then
            print_pass "HSTS enabled: $HSTS_VALUE"
        else
            print_warning "HSTS header present but might be misconfigured"
        fi
    else
        print_fail "HSTS header missing"
    fi

    # Test 2: CSP
    print_test "Content Security Policy (CSP)"
    if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
        print_pass "CSP header present"
    else
        print_warning "CSP header missing (recommended for XSS protection)"
    fi

    # Test 3: X-Frame-Options
    print_test "X-Frame-Options"
    if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
        FRAME_VALUE=$(echo "$HEADERS" | grep -i "X-Frame-Options" | cut -d':' -f2-)
        print_pass "X-Frame-Options set: $FRAME_VALUE"
    else
        print_fail "X-Frame-Options missing (clickjacking risk)"
    fi

    # Test 4: X-Content-Type-Options
    print_test "X-Content-Type-Options"
    if echo "$HEADERS" | grep -qi "X-Content-Type-Options.*nosniff"; then
        print_pass "X-Content-Type-Options: nosniff"
    else
        print_fail "X-Content-Type-Options: nosniff missing"
    fi

    # Test 5: Referrer-Policy
    print_test "Referrer-Policy"
    if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
        print_pass "Referrer-Policy set"
    else
        print_warning "Referrer-Policy missing (information leakage risk)"
    fi

    # Test 6: Server header disclosure
    print_test "Server header information disclosure"
    if echo "$HEADERS" | grep -qi "^Server:"; then
        SERVER_VALUE=$(echo "$HEADERS" | grep -i "^Server:" | cut -d':' -f2-)
        print_warning "Server header exposes information: $SERVER_VALUE"
    else
        print_pass "Server header hidden"
    fi

    # Test 7: X-Powered-By header
    print_test "X-Powered-By header disclosure"
    if echo "$HEADERS" | grep -qi "X-Powered-By"; then
        print_warning "X-Powered-By header should be removed"
    else
        print_pass "X-Powered-By header not present"
    fi
}

# ================================================================================
# SSL/TLS TESTS
# ================================================================================

test_ssl_tls() {
    print_header "SSL/TLS Tests"

    DOMAIN=$(echo "$BASE_URL" | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')

    # Test 1: SSL certificate validity
    print_test "SSL certificate validity"
    if command -v openssl &> /dev/null; then
        CERT_INFO=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

        if [ -n "$CERT_INFO" ]; then
            EXPIRY=$(echo "$CERT_INFO" | grep "notAfter" | cut -d'=' -f2)
            print_pass "SSL certificate valid until: $EXPIRY"
            echo "$CERT_INFO" > "$RESULTS_DIR/ssl_certificate.txt"
        else
            print_warning "Could not verify SSL certificate"
        fi
    else
        print_warning "OpenSSL not installed, skipping SSL tests"
        return
    fi

    # Test 2: TLS version check
    print_test "TLS version support"

    # Check TLS 1.0 (should fail)
    TLS10=$(echo | openssl s_client -connect "$DOMAIN:443" -tls1 2>&1 | grep -c "Cipher")
    if [ "$TLS10" -eq 0 ]; then
        print_pass "TLS 1.0 disabled (good)"
    else
        print_fail "TLS 1.0 enabled (security risk)"
    fi

    # Check TLS 1.1 (should fail)
    TLS11=$(echo | openssl s_client -connect "$DOMAIN:443" -tls1_1 2>&1 | grep -c "Cipher")
    if [ "$TLS11" -eq 0 ]; then
        print_pass "TLS 1.1 disabled (good)"
    else
        print_fail "TLS 1.1 enabled (security risk)"
    fi

    # Check TLS 1.2 (should succeed)
    TLS12=$(echo | openssl s_client -connect "$DOMAIN:443" -tls1_2 2>&1 | grep -c "Cipher")
    if [ "$TLS12" -gt 0 ]; then
        print_pass "TLS 1.2 enabled (good)"
    else
        print_warning "TLS 1.2 not detected"
    fi

    # Check TLS 1.3 (should succeed)
    TLS13=$(echo | openssl s_client -connect "$DOMAIN:443" -tls1_3 2>&1 | grep -c "Cipher")
    if [ "$TLS13" -gt 0 ]; then
        print_pass "TLS 1.3 enabled (excellent)"
    else
        print_warning "TLS 1.3 not enabled (recommended)"
    fi

    # Test 3: Certificate chain
    print_test "SSL certificate chain"
    CHAIN=$(echo | openssl s_client -connect "$DOMAIN:443" -showcerts 2>/dev/null | grep -c "BEGIN CERTIFICATE")
    if [ "$CHAIN" -gt 1 ]; then
        print_pass "Certificate chain complete ($CHAIN certificates)"
    else
        print_warning "Certificate chain might be incomplete"
    fi
}

# ================================================================================
# INFORMATION DISCLOSURE TESTS
# ================================================================================

test_information_disclosure() {
    print_header "Information Disclosure Tests"

    # Test 1: Error message disclosure
    print_test "Error message information disclosure"
    RESPONSE=$(curl -s -X GET "$API_URL/properties/99999999/" \
        -H "Authorization: Bearer $TEST_TOKEN")

    if echo "$RESPONSE" | grep -qi "traceback\|exception\|error.*line\|file.*line"; then
        print_fail "Stack trace exposed in error response"
        echo "$RESPONSE" > "$RESULTS_DIR/error_disclosure.json"
    else
        print_pass "No stack trace in error responses"
    fi

    # Test 2: Database error disclosure
    print_test "Database error disclosure"
    RESPONSE=$(curl -s -X GET "$API_URL/properties/?ordering=invalid_field" \
        -H "Authorization: Bearer $TEST_TOKEN")

    if echo "$RESPONSE" | grep -qi "sql\|postgres\|mysql\|django.db"; then
        print_fail "Database error exposed"
        echo "$RESPONSE" > "$RESULTS_DIR/db_error_disclosure.json"
    else
        print_pass "No database errors exposed"
    fi

    # Test 3: Directory listing
    print_test "Directory listing"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/")

    if [ "$RESPONSE" == "403" ] || [ "$RESPONSE" == "404" ]; then
        print_pass "Directory listing disabled (HTTP $RESPONSE)"
    else
        BODY=$(curl -s "$BASE_URL/static/")
        if echo "$BODY" | grep -qi "Index of\|Directory listing"; then
            print_fail "Directory listing enabled"
        else
            print_pass "Directory listing disabled"
        fi
    fi

    # Test 4: Sensitive file exposure
    print_test "Sensitive file exposure (.env)"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/.env")

    if [ "$RESPONSE" == "404" ] || [ "$RESPONSE" == "403" ]; then
        print_pass ".env file not accessible (HTTP $RESPONSE)"
    else
        print_fail ".env file might be accessible!"
    fi

    # Test 5: Git folder exposure
    print_test "Git folder exposure"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/.git/config")

    if [ "$RESPONSE" == "404" ] || [ "$RESPONSE" == "403" ]; then
        print_pass ".git folder not accessible (HTTP $RESPONSE)"
    else
        print_fail ".git folder might be accessible!"
    fi
}

# ================================================================================
# GENERATE REPORT
# ================================================================================

generate_report() {
    print_header "Generating Security Test Report"

    REPORT_FILE="$RESULTS_DIR/SECURITY_TEST_REPORT.md"

    cat > "$REPORT_FILE" <<EOF
# Security Test Report - Capimax Platform

**Test Date:** $(date)
**Base URL:** $BASE_URL
**Total Tests:** $TOTAL_TESTS

## Summary

- **Passed:** $PASSED_TESTS ($(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%)
- **Failed:** $FAILED_TESTS ($(echo "scale=1; $FAILED_TESTS * 100 / $TOTAL_TESTS" | bc)%)
- **Warnings:** $WARNING_TESTS ($(echo "scale=1; $WARNING_TESTS * 100 / $TOTAL_TESTS" | bc)%)

## Security Status

EOF

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo "✅ **PASS** - No critical security issues detected" >> "$REPORT_FILE"
    elif [ "$FAILED_TESTS" -le 2 ]; then
        echo "⚠️  **WARNING** - $FAILED_TESTS security issues found (review required)" >> "$REPORT_FILE"
    else
        echo "❌ **FAIL** - $FAILED_TESTS security issues found (immediate action required)" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" <<EOF

## Test Categories

1. Authentication & Authorization
2. SQL Injection
3. Cross-Site Scripting (XSS)
4. Rate Limiting
5. Security Headers
6. SSL/TLS Configuration
7. Information Disclosure

## Recommendations

EOF

    if [ "$FAILED_TESTS" -gt 0 ]; then
        echo "### Critical Issues" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "Review all FAIL items in the test output and address immediately." >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    if [ "$WARNING_TESTS" -gt 0 ]; then
        echo "### Warnings" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "Review all WARNING items and consider implementing recommended security measures." >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" <<EOF

### General Recommendations

1. **Implement rate limiting** on all sensitive endpoints
2. **Enable all security headers** (HSTS, CSP, X-Frame-Options, etc.)
3. **Regular security audits** using automated scanners (OWASP ZAP, Nikto)
4. **Dependency updates** to patch known vulnerabilities
5. **Penetration testing** by security professionals before production launch
6. **Security monitoring** with real-time alerts for suspicious activity

## Detailed Test Results

See individual test files in: $RESULTS_DIR/

---

**Generated by:** Capimax Security Test Suite
**Version:** 1.0
EOF

    print_info "Report generated: $REPORT_FILE"

    # Display report
    echo ""
    cat "$REPORT_FILE"
    echo ""
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    clear
    print_header "Capimax Security Test Suite"

    print_info "Base URL: $BASE_URL"
    print_info "API URL: $API_URL"
    print_info "Test Email: $TEST_EMAIL"
    echo ""

    # Create results directory
    create_results_dir

    # Run test suites
    test_jwt_authentication
    test_authorization
    test_sql_injection
    test_xss
    test_rate_limiting
    test_security_headers
    test_ssl_tls
    test_information_disclosure

    # Generate report
    generate_report

    # Summary
    print_header "Test Summary"
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    echo -e "${YELLOW}Warnings:${NC} $WARNING_TESTS"
    echo ""

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}✅ All critical security tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ $FAILED_TESTS security issues detected. Review report.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
