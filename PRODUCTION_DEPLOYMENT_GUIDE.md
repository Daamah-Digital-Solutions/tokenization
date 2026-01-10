# Capimax Platform - Production Deployment Guide

**Version:** 1.0
**Last Updated:** December 2, 2025
**Status:** Pre-Production Checklist

---

## 🚨 CRITICAL ISSUES FIXED

### ✅ Issue #1: Django SECRET_KEY Validation - RESOLVED
**Problem:** SECRET_KEY validation was failing even with .env file present.
**Solution:** Added development fallback that only raises error in production environment.
**File:** `capimax_backend/capimax_backend/settings/base.py:14-27`

### ✅ Issue #2: Missing WebSocket App - RESOLVED
**Problem:** `ws_app` listed in INSTALLED_APPS but directory deleted.
**Solution:** Removed `ws_app` from INSTALLED_APPS (line 56).
**File:** `capimax_backend/capimax_backend/settings/base.py:56`

### ⚠️ Issue #3: Payment Gateway Test Keys - REQUIRES ACTION
**Problem:** All payment gateway keys are placeholder test values.
**Impact:** BLOCKING - Platform cannot process real payments without this fix.
**Solution:** See Payment Gateway Configuration section below.

---

## 📋 PRODUCTION READINESS SCORE: 78/100

According to comprehensive E2E testing:
- **3 Critical Issues**: 2 Fixed ✅, 1 Requires Configuration ⚠️
- **12 High Priority Issues**: Documented below
- **8 Medium/Low Issues**: Can be addressed post-launch

---

## 1. PAYMENT GATEWAY CONFIGURATION (CRITICAL)

### Required Production API Keys

#### 1.1 Stripe Configuration
```bash
# Obtain from: https://dashboard.stripe.com/apikeys

# Production Keys
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXX

# Test Keys (for staging environment)
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXX
STRIPE_TEST_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXX
```

**Setup Steps:**
1. Log in to Stripe Dashboard
2. Navigate to Developers → API Keys
3. Copy "Publishable key" and "Secret key"
4. Set up webhook endpoint: `https://yourdomain.com/api/v1/payments/stripe/webhook/`
5. Copy webhook signing secret

**Webhook Events to Subscribe:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `customer.subscription.deleted`

---

#### 1.2 PayPal Configuration
```bash
# Obtain from: https://developer.paypal.com/dashboard/applications

# Production
PAYPAL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXX
PAYPAL_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXX
PAYPAL_SANDBOX=False

# Sandbox (for testing)
PAYPAL_SANDBOX_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXX
PAYPAL_SANDBOX_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXX
PAYPAL_SANDBOX=True
```

**Setup Steps:**
1. Log in to PayPal Developer Dashboard
2. Go to My Apps & Credentials
3. Create new app or use existing
4. Copy Client ID and Secret from "Live" section
5. Set webhook URL: `https://yourdomain.com/api/v1/payments/paypal/webhook/`

---

#### 1.3 Cryptocurrency (NOWPayments)
```bash
# Obtain from: https://nowpayments.io/

NOWPAYMENTS_API_KEY=XXXXXXXXXXXXXXXXXXXXX
NOWPAYMENTS_IPN_SECRET=XXXXXXXXXXXXXXXXXXXXX

# Callback URL
NOWPAYMENTS_CALLBACK_URL=https://yourdomain.com/api/v1/payments/crypto/callback/
```

**Setup Steps:**
1. Create account at NOWPayments.io
2. Complete KYC verification
3. Navigate to Settings → API
4. Generate API key
5. Set up IPN (Instant Payment Notification) callback
6. Configure supported cryptocurrencies (BTC, ETH, USDT, USDC, etc.)

---

#### 1.4 Coinbase Commerce (Optional)
```bash
# Obtain from: https://commerce.coinbase.com/

COINBASE_API_KEY=XXXXXXXXXXXXXXXXXXXXX
COINBASE_WEBHOOK_SECRET=XXXXXXXXXXXXXXXXXXXXX
```

---

### Payment Gateway Testing Checklist

Before going live, test each payment method:

#### Stripe Testing
- [ ] Test card payment ($1.00 test)
- [ ] Verify webhook delivery
- [ ] Test refund process
- [ ] Confirm payment confirmation email sent
- [ ] Verify transaction appears in admin panel

#### PayPal Testing
- [ ] Test PayPal checkout flow
- [ ] Verify payment capture
- [ ] Test webhook delivery
- [ ] Confirm transaction record creation

#### Crypto Testing
- [ ] Generate crypto invoice
- [ ] Test payment monitoring
- [ ] Verify confirmation after required blocks
- [ ] Test underpayment/overpayment scenarios

---

## 2. EMAIL CONFIGURATION (HIGH PRIORITY)

### Production SMTP Setup

**Current Issue:** Email configured for localhost (development console).

**Recommended Providers:**
- **SendGrid** (Recommended) - 100 emails/day free
- **AWS SES** - $0.10 per 1,000 emails
- **Mailgun** - 5,000 emails/month free
- **Gmail SMTP** - Simple setup, 500 emails/day limit

### SendGrid Configuration (Recommended)
```bash
# Obtain from: https://app.sendgrid.com/settings/api_keys

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey  # Literal string "apikey"
EMAIL_HOST_PASSWORD=SG.XXXXXXXXXXXXXXXXXXXXX  # Your API key
DEFAULT_FROM_EMAIL=Capimax Platform <noreply@capimax.com>
SERVER_EMAIL=alerts@capimax.com
```

### Gmail SMTP Configuration (Simple Setup)
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
DEFAULT_FROM_EMAIL=Capimax Platform <your-email@gmail.com>
```

**Gmail Setup Steps:**
1. Enable 2-Step Verification on Gmail account
2. Generate App-Specific Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password in EMAIL_HOST_PASSWORD

### Email Testing Checklist
- [ ] Test welcome email delivery
- [ ] Test email verification code delivery
- [ ] Test password reset email
- [ ] Test investment confirmation email
- [ ] Test dividend notification email
- [ ] Verify all emails display correctly (HTML and plain text)
- [ ] Check spam folder placement
- [ ] Configure SPF/DKIM records for domain

---

## 3. DATABASE MIGRATION TO POSTGRESQL (HIGH PRIORITY)

### Current Issue
SQLite is not suitable for production (no concurrent writes, limited scalability).

### PostgreSQL Setup

#### 3.1 Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### 3.2 Create Production Database
```bash
# Connect as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE capimax_prod;
CREATE USER capimax_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE capimax_prod TO capimax_user;
ALTER USER capimax_user CREATEDB;  # For running tests

# Exit
\q
```

#### 3.3 Update Environment Variables
```bash
# Remove SQLite configuration
# DATABASE_URL=sqlite:///db.sqlite3

# Add PostgreSQL configuration
DATABASE_URL=postgresql://capimax_user:your_secure_password@localhost:5432/capimax_prod

# Or use individual settings
DB_NAME=capimax_prod
DB_USER=capimax_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_CONN_MAX_AGE=600
```

#### 3.4 Install PostgreSQL Adapter
```bash
cd capimax_backend
pip install psycopg2-binary
```

#### 3.5 Run Migrations
```bash
python manage.py migrate
```

#### 3.6 Create Superuser
```bash
python manage.py createsuperuser
```

#### 3.7 Load Fixtures (Optional)
```bash
# If you have initial data
python manage.py loaddata initial_data.json
```

### Database Backup Strategy
```bash
# Daily automated backup
0 2 * * * pg_dump -U capimax_user capimax_prod > /backups/capimax_$(date +\%Y\%m\%d).sql

# Backup to S3 (recommended)
0 2 * * * pg_dump -U capimax_user capimax_prod | gzip | aws s3 cp - s3://your-bucket/backups/capimax_$(date +\%Y\%m\%d).sql.gz
```

---

## 4. HTTPS & SSL CONFIGURATION (HIGH PRIORITY)

### 4.1 Update Production Settings
Edit `capimax_backend/capimax_backend/settings/production.py`:

```python
# SSL/HTTPS Settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Cookie Security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Additional Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

### 4.2 SSL Certificate Setup

#### Option A: Let's Encrypt (Free, Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

#### Option B: Cloudflare (Free SSL + CDN)
1. Sign up at https://cloudflare.com
2. Add your domain
3. Update nameservers at your domain registrar
4. Enable "Full (Strict)" SSL mode
5. Enable "Always Use HTTPS"

---

## 5. CORS CONFIGURATION (HIGH PRIORITY)

### Update Production CORS Settings
Edit `capimax_backend/capimax_backend/settings/production.py`:

```python
# CORS Settings - Production
CORS_ALLOWED_ORIGINS = [
    'https://app.capimax.com',  # Your production frontend domain
    'https://www.capimax.com',  # Main website if different
]

CORS_ALLOW_CREDENTIALS = True

CORS_EXPOSE_HEADERS = [
    'Content-Type',
    'X-CSRFToken',
]

# Remove all development origins
# NO localhost, NO 127.0.0.1, NO http://
```

---

## 6. ENVIRONMENT VARIABLES - PRODUCTION .ENV

Create `capimax_backend/.env.production` (DO NOT COMMIT):

```bash
# =====================================================
# CAPIMAX PRODUCTION ENVIRONMENT CONFIGURATION
# =====================================================
# CRITICAL: Never commit this file to version control
# Add .env.production to .gitignore immediately
# =====================================================

# Environment
DJANGO_SETTINGS_MODULE=capimax_backend.settings.production
ENVIRONMENT=production
DEBUG=False

# Security
SECRET_KEY=<generate-using-python-django-command>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database - PostgreSQL
DATABASE_URL=postgresql://capimax_user:SECURE_PASSWORD@localhost:5432/capimax_prod
DB_NAME=capimax_prod
DB_USER=capimax_user
DB_PASSWORD=SECURE_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_CONN_MAX_AGE=600

# Redis Cache
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG.YOUR_SENDGRID_API_KEY
DEFAULT_FROM_EMAIL=Capimax Platform <noreply@capimax.com>
SERVER_EMAIL=alerts@capimax.com

# Payment Gateways - PRODUCTION KEYS
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXX

PAYPAL_CLIENT_ID=PRODUCTION_CLIENT_ID
PAYPAL_CLIENT_SECRET=PRODUCTION_CLIENT_SECRET
PAYPAL_SANDBOX=False

NOWPAYMENTS_API_KEY=PRODUCTION_API_KEY
NOWPAYMENTS_IPN_SECRET=PRODUCTION_IPN_SECRET

# KYC Verification
JUMIO_API_TOKEN=PRODUCTION_TOKEN
JUMIO_API_SECRET=PRODUCTION_SECRET
JUMIO_DATACENTER=US

# Blockchain (if enabled)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-rpc.com/
BLOCKCHAIN_PRIVATE_KEY=PRODUCTION_PRIVATE_KEY
CONTRACT_FACTORY_ADDRESS=0xYourProductionContractAddress

# CORS
CORS_ALLOWED_ORIGINS=https://app.capimax.com

# Platform Configuration
PLATFORM_COMMISSION_RATE=0.025
DEFAULT_INVESTMENT_LIMIT=100000
KYC_RETENTION_DAYS=2555
PASSWORD_RESET_TIMEOUT=3600
```

**Generate SECRET_KEY:**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

---

## 7. RATE LIMITING CONFIGURATION (HIGH PRIORITY)

### Update REST Framework Settings
Edit `capimax_backend/capimax_backend/settings/base.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/hour',  # Reduced from 100/hour
        'user': '1000/hour',
        'login': '5/min',
        'register': '3/hour',  # NEW - Prevent account spam
        'password_reset': '3/hour',  # NEW - Prevent email bombing
    },
}
```

---

## 8. FRONTEND BUILD & DEPLOYMENT

### 8.1 Fix TypeScript Errors (37 errors found)

The frontend has TypeScript compilation errors that prevent production build.

**Priority Fixes:**
1. `App.tsx` line 206 - Route type mismatch
2. Admin components - Type inconsistencies
3. Service layer - Interface mismatches

**Command to view errors:**
```bash
cd capimax-preview
npm run build
```

### 8.2 Build for Production
```bash
cd capimax-preview

# Install dependencies
npm install

# Fix TypeScript errors first (see report section HIGH #1)

# Build production bundle
npm run build

# Output will be in dist/ directory
```

### 8.3 Environment Variables
Create `capimax-preview/.env.production`:

```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXX
VITE_WALLET_CONNECT_PROJECT_ID=YOUR_PROJECT_ID
```

### 8.4 Deploy Frontend

**Option A: Nginx Static Hosting**
```bash
sudo cp -r dist/* /var/www/capimax/
```

**Option B: Vercel (Recommended)**
```bash
npm install -g vercel
vercel --prod
```

**Option C: Netlify**
```bash
npm run build
# Upload dist/ folder to Netlify
```

---

## 9. BACKEND DEPLOYMENT

### 9.1 Production Server Setup

#### Install Dependencies
```bash
# System packages
sudo apt update
sudo apt install python3-pip python3-venv postgresql nginx redis-server

# Create virtual environment
cd capimax_backend
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements-prod.txt
```

#### 9.2 Gunicorn Configuration
Create `capimax_backend/gunicorn_config.py`:

```python
import multiprocessing

# Gunicorn configuration
bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"
worker_connections = 1000
timeout = 120
keepalive = 5
accesslog = "/var/log/capimax/access.log"
errorlog = "/var/log/capimax/error.log"
loglevel = "info"
```

**Start Gunicorn:**
```bash
gunicorn capimax_backend.wsgi:application -c gunicorn_config.py
```

#### 9.3 Systemd Service
Create `/etc/systemd/system/capimax.service`:

```ini
[Unit]
Description=Capimax Django Application
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/capimax/capimax_backend
Environment="PATH=/var/www/capimax/capimax_backend/venv/bin"
Environment="DJANGO_SETTINGS_MODULE=capimax_backend.settings.production"
ExecStart=/var/www/capimax/capimax_backend/venv/bin/gunicorn \
    capimax_backend.wsgi:application \
    -c /var/www/capimax/capimax_backend/gunicorn_config.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable capimax
sudo systemctl start capimax
sudo systemctl status capimax
```

---

## 10. CELERY WORKERS SETUP

### 10.1 Celery Worker Service
Create `/etc/systemd/system/capimax-celery.service`:

```ini
[Unit]
Description=Capimax Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/capimax/capimax_backend
Environment="PATH=/var/www/capimax/capimax_backend/venv/bin"
Environment="DJANGO_SETTINGS_MODULE=capimax_backend.settings.production"
ExecStart=/var/www/capimax/capimax_backend/venv/bin/celery \
    -A capimax_backend worker \
    --loglevel=info \
    --concurrency=4 \
    --logfile=/var/log/capimax/celery-worker.log
Restart=always

[Install]
WantedBy=multi-user.target
```

### 10.2 Celery Beat Service
Create `/etc/systemd/system/capimax-celery-beat.service`:

```ini
[Unit]
Description=Capimax Celery Beat Scheduler
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/capimax/capimax_backend
Environment="PATH=/var/www/capimax/capimax_backend/venv/bin"
Environment="DJANGO_SETTINGS_MODULE=capimax_backend.settings.production"
ExecStart=/var/www/capimax/capimax_backend/venv/bin/celery \
    -A capimax_backend beat \
    --loglevel=info \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler \
    --logfile=/var/log/capimax/celery-beat.log
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable services:**
```bash
sudo systemctl enable capimax-celery capimax-celery-beat
sudo systemctl start capimax-celery capimax-celery-beat
```

---

## 11. NGINX CONFIGURATION

Create `/etc/nginx/sites-available/capimax`:

```nginx
upstream capimax_backend {
    server 127.0.0.1:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size
    client_max_body_size 20M;

    # Static files
    location /static/ {
        alias /var/www/capimax/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/capimax/media/;
        expires 7d;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://capimax_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://capimax_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend SPA
    location / {
        root /var/www/capimax/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/capimax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 12. MONITORING & LOGGING

### 12.1 Install Sentry (Error Tracking)
```bash
pip install sentry-sdk
```

Add to `settings/production.py`:
```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID",
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=True,
    environment="production"
)
```

### 12.2 Application Performance Monitoring
Options:
- **New Relic** - Full APM suite
- **DataDog** - Infrastructure + APM
- **AWS CloudWatch** - AWS native

### 12.3 Log Aggregation
```python
# settings/production.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/capimax/django.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'json',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/capimax/django-error.log',
            'maxBytes': 10485760,
            'backupCount': 10,
            'formatter': 'json',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': True,
        },
        'capimax_backend': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

## 13. FINAL PRODUCTION CHECKLIST

### Pre-Launch Checklist

#### Critical (Must Complete)
- [ ] ✅ Django SECRET_KEY configured properly
- [ ] ✅ WebSocket app removed from INSTALLED_APPS
- [ ] ⚠️ Production payment gateway API keys configured
- [ ] ⚠️ Payment webhooks tested and verified
- [ ] ⚠️ PostgreSQL database migrated and tested
- [ ] ⚠️ Production email SMTP configured and tested
- [ ] ⚠️ HTTPS/SSL certificates installed and tested
- [ ] ⚠️ CORS restricted to production domain only
- [ ] ⚠️ Rate limiting configured properly
- [ ] ⚠️ Frontend TypeScript errors fixed (37 errors)
- [ ] ⚠️ Production .env.production file created (not committed)
- [ ] ⚠️ All test/placeholder values replaced

#### High Priority (Should Complete)
- [ ] HTTPS enforcement enabled in settings
- [ ] Security headers configured
- [ ] Database backup strategy implemented
- [ ] Celery workers running and monitored
- [ ] Error tracking (Sentry) configured
- [ ] Log rotation configured
- [ ] Static files collected and served via CDN
- [ ] Media files storage configured (S3 recommended)

#### Testing (Must Complete)
- [ ] Full investor journey tested end-to-end
- [ ] Property owner submission and approval tested
- [ ] Payment processing tested (all methods)
- [ ] Email delivery tested (all types)
- [ ] Admin panel fully functional
- [ ] Celery tasks executing correctly
- [ ] Load testing completed
- [ ] Security audit completed

#### Documentation (Recommended)
- [ ] API documentation updated
- [ ] Deployment procedures documented
- [ ] Troubleshooting guide created
- [ ] User guides prepared
- [ ] Terms of Service finalized
- [ ] Privacy Policy finalized

---

## 14. POST-LAUNCH MONITORING

### Week 1 Monitoring Checklist
- [ ] Monitor error rates (target: <0.1%)
- [ ] Track API response times (target: <200ms)
- [ ] Monitor database connection pool
- [ ] Check email deliverability
- [ ] Verify payment webhook delivery
- [ ] Monitor Celery task success rates
- [ ] Track user registration/login issues
- [ ] Review security logs

### Week 2-4 Optimization
- [ ] Analyze slow database queries
- [ ] Optimize frontend bundle size
- [ ] Configure CDN for static assets
- [ ] Implement caching strategy
- [ ] Review and optimize Celery tasks
- [ ] Database query optimization
- [ ] Frontend performance tuning

---

## 15. ROLLBACK PLAN

### If Issues Occur Post-Launch

#### Immediate Rollback Steps
1. **Revert to previous Docker image** (if using containers)
2. **Restore database backup** from pre-deployment
3. **Switch DNS back to old infrastructure**
4. **Notify users of maintenance**

#### Database Rollback
```bash
# Restore from backup
pg_restore -U capimax_user -d capimax_prod /backups/capimax_YYYYMMDD.sql
```

#### Application Rollback
```bash
# Revert to previous git commit
git checkout <previous-stable-commit>
git push --force origin main

# Restart services
sudo systemctl restart capimax capimax-celery capimax-celery-beat
```

---

## 16. SUPPORT & ESCALATION

### Critical Issues
- Database corruption → Restore from backup immediately
- Payment processing failure → Switch to manual payment processing
- Security breach → Take site offline, notify users, investigate

### Support Contacts
- **DevOps Lead:** [Contact Info]
- **Backend Lead:** [Contact Info]
- **Security Team:** [Contact Info]
- **Payment Gateway Support:** Stripe, PayPal, NOWPayments support

---

## 17. ESTIMATED TIMELINE

### Phase 1: Critical Fixes (Days 1-2) - ~7 hours
- Fix Django startup issues ✅ COMPLETE
- Configure payment gateway keys
- Test payment flows

### Phase 2: High Priority (Days 3-4) - ~23 hours
- Fix TypeScript errors
- Configure email
- Migrate to PostgreSQL
- Enable HTTPS
- Security hardening

### Phase 3: Testing (Day 5) - ~12 hours
- Comprehensive testing
- Bug fixes
- Performance optimization

### Phase 4: Deployment (Day 6) - ~16 hours
- Production deployment
- Final validation
- Go-live

### Phase 5: Monitoring (Day 7+) - Ongoing
- Monitor performance
- Address issues
- User feedback

**Total Estimated Time: 58 hours (1.5 weeks with 2 developers)**

---

## 18. SUCCESS CRITERIA

Platform is ready for production when:
- ✅ All critical issues resolved
- ✅ Payment processing working with real transactions
- ✅ Email delivery confirmed
- ✅ Database stable under load
- ✅ Security audit passed
- ✅ All user journeys tested successfully
- ✅ Monitoring and logging operational
- ✅ Backup strategy implemented
- ✅ Team trained on operations

---

**Document Version:** 1.0
**Next Review:** After production deployment
**Maintained By:** Capimax Development Team

---

**NOTES:**
- This guide assumes deployment to a Linux server (Ubuntu/Debian)
- Adjust commands for other operating systems as needed
- Always test in staging environment before production
- Keep this document updated as infrastructure evolves
