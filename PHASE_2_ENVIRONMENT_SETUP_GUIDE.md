# Phase 2: Production Environment Configuration - Complete Guide

**Date:** November 25, 2025
**Status:** ✅ COMPLETED
**Duration:** ~2 hours

## Summary

Phase 2 of the production readiness plan has been completed successfully. All production environment templates and secrets have been generated, providing a complete configuration blueprint for production deployment.

---

## Tasks Completed

### 1. ✅ Generate Production Secrets

**Tool Created:** `capimax_backend/generate_secrets.py`

**Secrets Generated:**
```
SECRET_KEY=D3-EzbVyVpOQmyA!wHut)Q3cWHc@-e=zGcRYd-bMl1x)G19=uh8X4r6oRF3(6_2Q
DB_PASSWORD=rg%$diuDbGgfFGC&wjbAzOUlXcR$x0rS
REDIS_PASSWORD=25qh9&tDWJGBWnSOSfKvED@24CrQGKL^
JWT_SIGNING_KEY=Kouv6DfLAR3d35NfDW3hkMEli4Irh8zfXzbhgpKUBUnA7KqVHdV1zm9egUx8xHSL
CELERY_SECRET_KEY=bb253edfdee674345c2d22de3233fdaaeec001b5f71cb14ee40db790dd8eecfd
SIGNING_SALT=oYr6wi0wrWKL2zRxia8ZN79VJe#TL%VL
```

**Security Notes:**
- All secrets use cryptographically secure random generation (Python `secrets` module)
- Secrets are 32-64 characters long with mixed alphanumeric and special characters
- These secrets are included in templates but should be regenerated for actual production

---

### 2. ✅ Create Backend .env.production Template

**File Created:** `capimax_backend/.env.production.template`

**Configuration Sections:**
1. **Django Core Settings** (9 variables)
   - SECRET_KEY, DEBUG, DJANGO_SETTINGS_MODULE
   - ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, CORS_ALLOWED_ORIGINS

2. **Database Configuration** (7 variables)
   - PostgreSQL connection details
   - Connection pooling settings

3. **Redis Configuration** (1 variable)
   - URL with password for caching and channels

4. **Celery Configuration** (3 variables)
   - Broker, backend, and secret key

5. **Email Configuration** (7 variables)
   - Hostinger SMTP settings
   - EMAIL_HOST_PASSWORD requires actual password

6. **Payment Providers** (9 variables)
   - Stripe (live keys required)
   - PayPal (production credentials)
   - Coinbase Commerce (API keys)

7. **KYC Provider (Jumio)** (5 variables)
   - API token and secret
   - Datacenter and base URL

8. **Blockchain Configuration** (9 variables)
   - RPC endpoints (Ethereum, Polygon, BSC)
   - Private key and contract addresses
   - Gas settings

9. **AWS S3 Storage** (6 variables)
   - Optional media file storage
   - CloudFront CDN support

10. **Monitoring & Error Tracking** (4 variables)
    - Sentry DSN and configuration

11. **Security & Performance** (9 variables)
    - Platform settings and JWT configuration
    - Admin URL customization

12. **Optional Integrations** (4 variables)
    - Google Analytics, Facebook Pixel, Slack

**Total: 73 environment variables documented**

---

### 3. ✅ Create Frontend .env.production Template

**File Created:** `capimax-preview/.env.production.template`

**Configuration Sections:**
1. **API Configuration** (2 variables)
   - VITE_API_URL (backend endpoint)
   - VITE_WS_URL (WebSocket endpoint)

2. **Payment Providers** (2 variables)
   - VITE_STRIPE_PUBLISHABLE_KEY (public key only)
   - VITE_PAYPAL_CLIENT_ID

3. **Web3 / Blockchain** (8 variables)
   - WalletConnect project ID
   - Supported chain IDs
   - RPC endpoints for Ethereum, Polygon, BSC
   - Factory contract address

4. **Analytics & Tracking** (5 variables)
   - Google Analytics 4
   - Facebook Pixel
   - Hotjar (optional)

5. **Feature Flags** (5 variables)
   - Enable/disable blockchain, chat, marketplace, broker
   - Maintenance mode toggle

6. **Application Settings** (7 variables)
   - App name, version, environment
   - Support email and legal URLs

7. **Sentry Error Tracking** (2 variables)
   - Frontend Sentry DSN
   - Trace sample rate

8. **Map & Location Services** (2 variables)
   - Google Maps API key
   - Mapbox token (alternative)

9. **CDN & Asset URLs** (2 variables)
   - CDN and media base URLs

10. **Security Settings** (4 variables)
    - HTTPS enforcement
    - API timeout
    - Max file upload size

**Total: 39 frontend environment variables documented**

---

## Credential Acquisition Guide

### Credentials You Need to Obtain

#### 1. Payment Providers

**Stripe (Required)**
- Sign up: https://dashboard.stripe.com/register
- Navigate: Developers → API Keys
- Copy both:
  - Secret Key: `sk_live_...` (backend only)
  - Publishable Key: `pk_live_...` (frontend safe)
- Webhook Setup:
  - Developers → Webhooks → Add endpoint
  - URL: `https://your-domain.com/api/v1/payments/stripe/webhook/`
  - Copy webhook secret: `whsec_...`

**PayPal (Required)**
- Sign up: https://developer.paypal.com
- Dashboard → My Apps & Credentials
- Create App → Select "Live"
- Copy:
  - Client ID (safe for frontend)
  - Secret (backend only)
- Set `PAYPAL_SANDBOX=False` in production

**Coinbase Commerce (Optional)**
- Sign up: https://commerce.coinbase.com
- Settings → API Keys
- Create API Key
- Copy API Key and Webhook Shared Secret

**Estimated Time:** 1-2 hours

---

#### 2. KYC Provider (Jumio)

**Jumio (Required)**
- Contact Jumio sales: https://www.jumio.com/contact/
- Request production account
- After approval, access: https://portal.jumio.com
- Copy:
  - API Token
  - API Secret
- Select datacenter (US, EU, SGP)

**Estimated Time:** 5-10 business days for account approval

---

#### 3. Blockchain Infrastructure

**Infura (Recommended) or Alchemy**
- Sign up: https://infura.io or https://alchemy.com
- Create Project
- Copy RPC URLs:
  - Ethereum Mainnet
  - Polygon Mainnet
- Or use public endpoints (less reliable):
  - Polygon: `https://polygon-rpc.com`
  - BSC: `https://bsc-dataseed.binance.org`

**WalletConnect (Required for frontend)**
- Sign up: https://cloud.walletconnect.com
- Create Project
- Copy Project ID

**Blockchain Wallet**
- Create wallet with MetaMask or similar
- Export private key (NEVER share or commit)
- Fund wallet with native tokens:
  - ETH for Ethereum
  - MATIC for Polygon
  - BNB for BSC
- Use for smart contract deployment and transaction signing

**Estimated Time:** 30 minutes

---

#### 4. AWS Services (Optional but Recommended)

**S3 for Media Storage**
- AWS Console → S3 → Create Bucket
- Name: `capimax-production-media`
- Region: `us-east-1` (or your preference)
- Block public access: Off (configure bucket policy)
- Create IAM user for programmatic access:
  - IAM → Users → Add User
  - Attach policy: AmazonS3FullAccess
  - Copy Access Key ID and Secret

**CloudFront CDN (Optional)**
- Create CloudFront distribution
- Origin: S3 bucket
- Copy CloudFront domain

**Estimated Time:** 45 minutes

---

#### 5. Monitoring & Error Tracking

**Sentry (Highly Recommended)**
- Sign up: https://sentry.io
- Create two projects:
  1. `capimax-backend` (Python/Django)
  2. `capimax-frontend` (React/JavaScript)
- Copy DSN for each project
- Configure:
  - `SENTRY_DSN` (backend)
  - `VITE_SENTRY_DSN` (frontend)

**Estimated Time:** 15 minutes

---

#### 6. Analytics & Tracking

**Google Analytics 4**
- Sign up: https://analytics.google.com
- Create Property
- Copy Measurement ID: `G-XXXXXXXXXX`

**Facebook Pixel (Optional)**
- Business Manager → Events Manager
- Create Pixel
- Copy Pixel ID

**Estimated Time:** 30 minutes

---

#### 7. Email Service

**Hostinger Email**
- Already configured: `tech@capimaxinvestment.com`
- **ACTION REQUIRED:** Get actual password from email admin
- Verify SMTP settings:
  - Host: `smtp.hostinger.com`
  - Port: `465`
  - SSL: Enabled

**Alternative: SendGrid, Mailgun, AWS SES**
- If switching providers, update EMAIL_* variables

**Estimated Time:** 5 minutes

---

## Setup Instructions

### Step 1: Copy Templates to Production Files

```bash
# Backend
cd capimax_backend
cp .env.production.template .env.production

# Frontend
cd ../capimax-preview
cp .env.production.template .env.production
```

### Step 2: Fill in Credentials

**Backend (.env.production):**
1. Keep generated secrets (SECRET_KEY, DB_PASSWORD, etc.)
2. Update ALLOWED_HOSTS with your actual domain
3. Fill in payment provider keys (Stripe, PayPal, Coinbase)
4. Add Jumio API credentials
5. Configure blockchain RPC URLs and private key
6. Add AWS S3 credentials (if using)
7. Set Sentry DSN
8. Add email password

**Frontend (.env.production):**
1. Update VITE_API_URL with backend domain
2. Add Stripe PUBLISHABLE key (starts with pk_live_)
3. Add PayPal Client ID
4. Set WalletConnect Project ID
5. Add contract addresses (after deployment)
6. Configure Google Analytics ID
7. Set Sentry DSN (frontend)

### Step 3: Validate Configuration

```bash
# Backend validation
cd capimax_backend
python manage.py check --deploy --settings=capimax_backend.settings.production

# Test database connection
python manage.py migrate --settings=capimax_backend.settings.production --dry-run

# Frontend validation
cd ../capimax-preview
npm run build
```

### Step 4: Secure Storage

**Option A: Environment Variables (Recommended for cloud platforms)**
- Heroku: Settings → Config Vars
- AWS: Systems Manager → Parameter Store
- DigitalOcean: App Platform → Environment Variables
- Render: Environment → Environment Variables

**Option B: .env Files (Traditional VPS)**
- Store .env.production on server only
- Set file permissions: `chmod 600 .env.production`
- Never commit to version control
- Backup securely in password manager

---

## Security Checklist

### ✓ Pre-Deployment Security Audit

- [ ] No .env files committed to Git (check with: `git log --all -- "*/.env*"`)
- [ ] .gitignore properly configured
- [ ] All SECRET_KEY, passwords, and API secrets are unique and secure
- [ ] Database password is strong (32+ characters)
- [ ] Redis password is set
- [ ] BLOCKCHAIN_PRIVATE_KEY is for a dedicated wallet (not personal wallet)
- [ ] All payment provider keys are LIVE/PRODUCTION keys (not test)
- [ ] Email password stored securely
- [ ] AWS credentials use least-privilege IAM policy
- [ ] Sentry DSN configured for both frontend and backend
- [ ] DEBUG=False in production settings
- [ ] ALLOWED_HOSTS set to actual domain (not wildcard)
- [ ] CSRF_TRUSTED_ORIGINS includes all frontend domains
- [ ] CORS_ALLOWED_ORIGINS restricted to known domains

---

## Files Created in Phase 2

1. **capimax_backend/generate_secrets.py** ✓
   - Python script to generate cryptographically secure secrets
   - Can be re-run anytime to generate new secrets

2. **capimax_backend/.env.production.template** ✓
   - Complete backend environment template
   - 73 configuration variables
   - Detailed comments for each setting

3. **capimax-preview/.env.production.template** ✓
   - Complete frontend environment template
   - 39 configuration variables
   - Security notes for public vs. secret keys

4. **PHASE_2_ENVIRONMENT_SETUP_GUIDE.md** ✓ (this document)
   - Comprehensive credential acquisition guide
   - Step-by-step setup instructions
   - Security checklist

---

## Next Steps - Phase 3: Fix Frontend Build Error

**Estimated Duration:** 2 hours

### Tasks:
1. Investigate TypeScript compilation error
   - File: `capimax-preview/src/components/analytics/PortfolioGrowthDisplay.tsx:20`
2. Create missing UI components if needed
3. Fix type errors
4. Run successful production build: `npm run build`

---

## Production Readiness Status

### Phase 1: Critical Security Fixes ✅ COMPLETE
### Phase 2: Environment Configuration ✅ COMPLETE

### Overall Progress: 25% → 40%

**Remaining Phases:**
- Phase 3: Frontend Build Fixes (0%)
- Phase 4: Nginx & SSL (0%)
- Phase 5: Comprehensive Testing (0%)
- Phase 6: Database & Backups (0%)
- Phase 7: Monitoring & Alerts (0%)

---

## Troubleshooting

### Issue: Database Connection Fails

**Solution:**
```bash
# Test PostgreSQL connection
psql -h localhost -U capimax_admin -d capimax_prod

# Check if database exists
python manage.py dbshell
```

### Issue: Redis Connection Timeout

**Solution:**
```bash
# Test Redis connection
redis-cli -a "YOUR_REDIS_PASSWORD" ping

# Should return: PONG
```

### Issue: Email Sending Fails

**Solution:**
```bash
# Test SMTP connection
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'tech@capimaxinvestment.com', ['recipient@example.com'])
```

### Issue: Frontend Build Fails

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Appendix: Quick Reference

### Environment Variable Categories

| Category | Backend Count | Frontend Count |
|----------|---------------|----------------|
| Django Core | 9 | - |
| Database | 7 | - |
| Caching/Queue | 4 | - |
| Email | 7 | - |
| Payments | 9 | 2 |
| KYC | 5 | - |
| Blockchain | 9 | 8 |
| Storage | 6 | 2 |
| Monitoring | 4 | 2 |
| Security | 9 | 4 |
| Analytics | 4 | 5 |
| Features | - | 5 |
| Application | - | 7 |
| **TOTAL** | **73** | **39** |

---

## Sign-Off

**Phase 2 Completed By:** Claude Code
**Date:** November 25, 2025
**Time Taken:** 2 hours
**Blockers Encountered:** None
**Ready for Phase 3:** ✅ YES

**Critical Notes:**
- All secrets generated and documented
- Templates are production-ready
- Credential acquisition guide complete
- Security checklist provided
- Ready to obtain third-party API keys

