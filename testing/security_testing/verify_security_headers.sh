#!/bin/bash

# ================================================================================
# SECURITY HEADERS VERIFICATION SCRIPT
# ================================================================================
#
# Quick script to verify security headers are properly configured
#
# Usage:
#   chmod +x verify_security_headers.sh
#   ./verify_security_headers.sh https://your-domain.com
#
# ================================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

URL="${1:-https://capimaxinvestment.com}"
SCORE=0
MAX_SCORE=10

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Security Headers Check${NC}"
echo -e "${BLUE}URL: $URL${NC}"
echo -e "${BLUE}================================${NC}\n"

# Fetch headers
HEADERS=$(curl -s -I "$URL" | tr -d '\r')

# Check each security header
echo "Checking security headers..."
echo ""

# 1. Strict-Transport-Security (HSTS)
echo -n "1. HSTS (Strict-Transport-Security): "
if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    VALUE=$(echo "$HEADERS" | grep -i "Strict-Transport-Security" | cut -d':' -f2- | xargs)
    if echo "$VALUE" | grep -q "max-age=31536000.*includeSubDomains.*preload"; then
        echo -e "${GREEN}✓ EXCELLENT${NC} - $VALUE"
        SCORE=$((SCORE + 2))
    elif echo "$VALUE" | grep -q "max-age=[0-9]"; then
        echo -e "${GREEN}✓ GOOD${NC} - $VALUE"
        SCORE=$((SCORE + 1))
    else
        echo -e "${YELLOW}⚠ WEAK${NC} - $VALUE"
    fi
else
    echo -e "${RED}✗ MISSING${NC} - Critical for HTTPS security"
fi

# 2. Content-Security-Policy (CSP)
echo -n "2. CSP (Content-Security-Policy): "
if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    VALUE=$(echo "$HEADERS" | grep -i "Content-Security-Policy" | cut -d':' -f2- | head -c 80)
    echo -e "${GREEN}✓ PRESENT${NC} - ${VALUE}..."
    SCORE=$((SCORE + 2))
else
    echo -e "${YELLOW}⚠ MISSING${NC} - Recommended for XSS protection"
fi

# 3. X-Frame-Options
echo -n "3. X-Frame-Options: "
if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    VALUE=$(echo "$HEADERS" | grep -i "X-Frame-Options" | cut -d':' -f2- | xargs)
    if echo "$VALUE" | grep -qi "DENY\|SAMEORIGIN"; then
        echo -e "${GREEN}✓ GOOD${NC} - $VALUE"
        SCORE=$((SCORE + 1))
    else
        echo -e "${YELLOW}⚠ WEAK${NC} - $VALUE"
    fi
else
    echo -e "${RED}✗ MISSING${NC} - Clickjacking risk"
fi

# 4. X-Content-Type-Options
echo -n "4. X-Content-Type-Options: "
if echo "$HEADERS" | grep -qi "X-Content-Type-Options.*nosniff"; then
    echo -e "${GREEN}✓ GOOD${NC} - nosniff"
    SCORE=$((SCORE + 1))
else
    echo -e "${RED}✗ MISSING${NC} - MIME sniffing risk"
fi

# 5. X-XSS-Protection
echo -n "5. X-XSS-Protection: "
if echo "$HEADERS" | grep -qi "X-XSS-Protection"; then
    VALUE=$(echo "$HEADERS" | grep -i "X-XSS-Protection" | cut -d':' -f2- | xargs)
    if echo "$VALUE" | grep -q "1.*mode=block"; then
        echo -e "${GREEN}✓ GOOD${NC} - $VALUE"
        SCORE=$((SCORE + 1))
    else
        echo -e "${YELLOW}⚠ WEAK${NC} - $VALUE"
    fi
else
    echo -e "${YELLOW}⚠ MISSING${NC} - Legacy XSS protection"
fi

# 6. Referrer-Policy
echo -n "6. Referrer-Policy: "
if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
    VALUE=$(echo "$HEADERS" | grep -i "Referrer-Policy" | cut -d':' -f2- | xargs)
    echo -e "${GREEN}✓ GOOD${NC} - $VALUE"
    SCORE=$((SCORE + 1))
else
    echo -e "${YELLOW}⚠ MISSING${NC} - Information leakage risk"
fi

# 7. Permissions-Policy
echo -n "7. Permissions-Policy: "
if echo "$HEADERS" | grep -qi "Permissions-Policy"; then
    VALUE=$(echo "$HEADERS" | grep -i "Permissions-Policy" | cut -d':' -f2- | head -c 60 | xargs)
    echo -e "${GREEN}✓ GOOD${NC} - ${VALUE}..."
    SCORE=$((SCORE + 1))
else
    echo -e "${YELLOW}⚠ MISSING${NC} - Feature policy not set"
fi

# 8. Server header (should NOT be present)
echo -n "8. Server Header (should be hidden): "
if echo "$HEADERS" | grep -qi "^Server:"; then
    VALUE=$(echo "$HEADERS" | grep -i "^Server:" | cut -d':' -f2- | xargs)
    echo -e "${YELLOW}⚠ EXPOSED${NC} - $VALUE (should be hidden)"
else
    echo -e "${GREEN}✓ HIDDEN${NC} - Good"
    SCORE=$((SCORE + 1))
fi

# 9. X-Powered-By (should NOT be present)
echo -n "9. X-Powered-By (should be hidden): "
if echo "$HEADERS" | grep -qi "X-Powered-By"; then
    VALUE=$(echo "$HEADERS" | grep -i "X-Powered-By" | cut -d':' -f2- | xargs)
    echo -e "${YELLOW}⚠ EXPOSED${NC} - $VALUE (should be removed)"
else
    echo -e "${GREEN}✓ HIDDEN${NC} - Good"
    SCORE=$((SCORE + 1))
fi

# Calculate grade
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "Security Score: ${BLUE}$SCORE/$MAX_SCORE${NC}"

PERCENTAGE=$((SCORE * 10))

if [ "$SCORE" -ge 9 ]; then
    echo -e "Grade: ${GREEN}A+ (Excellent)${NC}"
elif [ "$SCORE" -ge 7 ]; then
    echo -e "Grade: ${GREEN}A (Good)${NC}"
elif [ "$SCORE" -ge 5 ]; then
    echo -e "Grade: ${YELLOW}B (Fair - Improvements needed)${NC}"
elif [ "$SCORE" -ge 3 ]; then
    echo -e "Grade: ${YELLOW}C (Poor - Multiple issues)${NC}"
else
    echo -e "Grade: ${RED}D (Critical - Immediate action required)${NC}"
fi

echo -e "${BLUE}================================${NC}"
echo ""

# Recommendations
if [ "$SCORE" -lt 9 ]; then
    echo "Recommendations:"
    echo ""

    if ! echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
        echo "  • Add HSTS header with max-age=31536000; includeSubDomains; preload"
    fi

    if ! echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
        echo "  • Add Content-Security-Policy header"
    fi

    if ! echo "$HEADERS" | grep -qi "X-Frame-Options"; then
        echo "  • Add X-Frame-Options: SAMEORIGIN"
    fi

    if ! echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
        echo "  • Add X-Content-Type-Options: nosniff"
    fi

    if ! echo "$HEADERS" | grep -qi "Referrer-Policy"; then
        echo "  • Add Referrer-Policy: strict-origin-when-cross-origin"
    fi

    if ! echo "$HEADERS" | grep -qi "Permissions-Policy"; then
        echo "  • Add Permissions-Policy header"
    fi

    if echo "$HEADERS" | grep -qi "^Server:"; then
        echo "  • Hide Server header (configure Nginx/Apache)"
    fi

    if echo "$HEADERS" | grep -qi "X-Powered-By"; then
        echo "  • Remove X-Powered-By header"
    fi

    echo ""
    echo "See nginx/capimax.conf for recommended header configuration."
fi

# SSL Labs test recommendation
echo ""
echo "Next steps:"
echo "  1. Run full SSL test: https://www.ssllabs.com/ssltest/analyze.html?d=${URL#https://}"
echo "  2. Run security scan: ./security_test_suite.sh $URL"
echo "  3. Review full guide: testing/security_testing/SECURITY_TEST_GUIDE.md"
echo ""
