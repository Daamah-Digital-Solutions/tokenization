# Capimax Platform - Production Launch Plan

**Generated**: January 2025
**Platform Status**: 75% Ready - Requires Critical Fixes
**Estimated Time to Launch**: 3-5 Days

---

## 🎯 Executive Summary

The Capimax Real Estate Tokenization Platform has excellent infrastructure and comprehensive documentation. However, **4 critical issues must be resolved** before production deployment:

1. ⚠️ Production environment configuration (development credentials currently in use)
2. ⚠️ Missing Nginx configuration with SSL
3. ⚠️ Email credentials hardcoded in source code
4. ⚠️ Frontend TypeScript build error

---

## 📋 PHASE 1: Critical Fixes (Day 1-2)

### Priority 1.1: Environment Configuration 🔴 CRITICAL

**Current Issue**: Development `.env` files contain test credentials and DEBUG=True

**Actions**:

```bash
# Backend Production Environment
cd capimax_backend

# Generate new SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Create production .env
cat > .env.production << 'EOF'
# Django Core Settings
SECRET_KEY=<GENERATE_NEW_KEY_ABOVE>
DEBUG=False
ENVIRONMENT=production
DJANGO_SETTINGS_MODULE=capimax_backend.settings.production
ALLOWED_HOSTS=api.capimax.com,www.api.capimax.com
CSRF_TRUSTED_ORIGINS=https://api.capimax.com,https://www.capimax.com
CORS_ALLOWED_ORIGINS=https://capimax.com,https://www.capimax.com

# Database - PostgreSQL Production
DATABASE_URL=postgresql://capimax_user:SECURE_PASSWORD@localhost:5432/capimax_prod
DB_NAME=capimax_prod
DB_USER=capimax_user
DB_PASSWORD=GENERATE_SECURE_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_CONN_MAX_AGE=600

# Redis Production
REDIS_URL=redis://localhost:6379/0

# Email Configuration - Production SMTP
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_USE_SSL=True
EMAIL_HOST_USER=tech@capimaxinvestment.com
EMAIL_HOST_PASSWORD=SECURE_EMAIL_PASSWORD
DEFAULT_FROM_EMAIL=CapiMax Investment <tech@capimaxinvestment.com>

# Payment Providers - PRODUCTION KEYS
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

PAYPAL_CLIENT_ID=YOUR_PRODUCTION_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_PRODUCTION_SECRET
PAYPAL_SANDBOX=False

COINBASE_API_KEY=YOUR_PRODUCTION_API_KEY
COINBASE_API_SECRET=YOUR_PRODUCTION_SECRET

# KYC Provider - Production
JUMIO_API_TOKEN=YOUR_PRODUCTION_TOKEN
JUMIO_API_SECRET=YOUR_PRODUCTION_SECRET
JUMIO_DATACENTER=US
JUMIO_CALLBACK_URL=https://api.capimax.com/api/v1/kyc/jumio/callback/

# Blockchain - Production Networks
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-rpc.com/
BLOCKCHAIN_PRIVATE_KEY=YOUR_PRODUCTION_PRIVATE_KEY
CONTRACT_FACTORY_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS

# Monitoring & Error Tracking
SENTRY_DSN=YOUR_SENTRY_DSN
SENTRY_TRACES_SAMPLE_RATE=0.1

# Security
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Application Version
APP_VERSION=1.0.0
EOF

# Frontend Production Environment
cd ../capimax-preview

cat > .env.production << 'EOF'
# API Configuration
VITE_API_URL=https://api.capimax.com/api/v1
VITE_API_BASE_URL=https://api.capimax.com/api/v1

# WebSocket Configuration
VITE_WEBSOCKET_URL=wss://api.capimax.com/ws

# Stripe Configuration - PRODUCTION KEY
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY

# WalletConnect Configuration
VITE_WALLET_CONNECT_PROJECT_ID=YOUR_PROJECT_ID

# Environment
VITE_NODE_ENV=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_WEBSOCKETS=true
VITE_ENABLE_CRYPTO_PAYMENTS=true

# Production Settings
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
EOF
```

**Verification**:
```bash
# Verify no development credentials remain
grep -r "test-api-key" .env.production
grep -r "DEBUG=True" .env.production
```

---

### Priority 1.2: Remove Hardcoded Credentials 🔴 CRITICAL

**Current Issue**: Email password is hardcoded in `capimax_backend/settings/production.py:112`

**Action**:

```python
# File: capimax_backend/capimax_backend/settings/production.py
# Line 112 - REPLACE with:

EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')  # NEVER hardcode!
```

**Verification**:
```bash
# Search for any hardcoded secrets
cd capimax_backend
grep -r "TechC@pimax" .
grep -r "password.*=" capimax_backend/settings/production.py
```

---

### Priority 1.3: Nginx Configuration with SSL 🔴 CRITICAL

**Current Issue**: No Nginx configuration exists

**Actions**:

```bash
# Create Nginx directory structure
mkdir -p capimax_backend/nginx/conf.d
mkdir -p capimax_backend/nginx/ssl

# Create main Nginx configuration
cat > capimax_backend/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    # Include virtual host configs
    include /etc/nginx/conf.d/*.conf;
}
EOF

# Create site configuration
cat > capimax_backend/nginx/conf.d/capimax.conf << 'EOF'
# Upstream Django application
upstream capimax_backend {
    server web:8000;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.capimax.com www.api.capimax.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.capimax.com www.api.capimax.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss://api.capimax.com;" always;

    # Static files
    location /static/ {
        alias /app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Media files
    location /media/ {
        alias /app/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://capimax_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Authentication endpoints with stricter rate limiting
    location ~ ^/api/v1/(auth/login|auth/register) {
        limit_req zone=auth_limit burst=3 nodelay;

        proxy_pass http://capimax_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://capimax_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health check endpoint (no rate limit)
    location /api/v1/health/ {
        proxy_pass http://capimax_backend;
        access_log off;
    }
}
EOF
```

**SSL Certificate Setup**:

```bash
# Option 1: Let's Encrypt (Recommended - Free)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.capimax.com -d www.api.capimax.com

# Option 2: Manual certificate (if you have commercial SSL)
sudo cp your-certificate.crt capimax_backend/nginx/ssl/fullchain.pem
sudo cp your-private-key.key capimax_backend/nginx/ssl/privkey.pem
sudo chmod 600 capimax_backend/nginx/ssl/privkey.pem
```

---

### Priority 1.4: Fix Frontend Build Error 🔴 CRITICAL

**Current Issue**: TypeScript error in `PortfolioGrowthDisplay.tsx`

**Action**:

```bash
cd capimax-preview

# Run build to identify the exact issue
npm run build 2>&1 | tee build-errors.log

# Review and fix the TypeScript error
# The error is likely a missing import or type definition
```

**Common fixes**:
1. Check if Card and Button components are properly exported
2. Verify all imports exist
3. Run `npm install` to ensure all dependencies are installed
4. Check tsconfig.json for proper configuration

---

## 📋 PHASE 2: Database & Services Setup (Day 2-3)

### 2.1: PostgreSQL Production Setup

```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create production database
sudo -u postgres psql

CREATE DATABASE capimax_prod;
CREATE USER capimax_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE capimax_prod TO capimax_user;
ALTER USER capimax_user CREATEDB;
\q

# Optimize PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf

# Add these settings:
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 64MB
max_connections = 200

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2.2: Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Update settings:
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Enable and start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2.3: Automated Database Backups

```bash
# Create backup script
sudo mkdir -p /opt/capimax/backups
sudo nano /opt/capimax/backup.sh

# Add backup script content from PRODUCTION_DEPLOYMENT_GUIDE.md lines 326-346

sudo chmod +x /opt/capimax/backup.sh

# Schedule daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /opt/capimax/backup.sh

# Test backup immediately
/opt/capimax/backup.sh
```

---

## 📋 PHASE 3: Deployment & Testing (Day 3-4)

### 3.1: Deploy Application

```bash
# Clone repository to production server
git clone <your-repo-url> /opt/capimax
cd /opt/capimax

# Copy production environment files
cp .env.production capimax_backend/.env
cp .env.production capimax-preview/.env

# Build and deploy with Docker
cd capimax_backend
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Collect static files
docker-compose exec web python manage.py collectstatic --noinput
```

### 3.2: Build Frontend

```bash
cd capimax-preview
npm install
npm run build

# Deploy to CDN or static hosting
# Option 1: Copy to Nginx
sudo cp -r dist/* /var/www/capimax/

# Option 2: Deploy to S3/CloudFront
aws s3 sync dist/ s3://your-bucket-name/
```

### 3.3: Verification Tests

```bash
# Test API endpoints
curl -f https://api.capimax.com/api/v1/health/
curl -f https://api.capimax.com/api/v1/status/

# Test SSL configuration
openssl s_client -connect api.capimax.com:443 -servername api.capimax.com

# Load testing (Apache Bench)
ab -n 1000 -c 10 https://api.capimax.com/api/v1/properties/

# Security scan
nmap -sV api.capimax.com
```

---

## 📋 PHASE 4: Monitoring & Go-Live (Day 4-5)

### 4.1: Set Up Monitoring

```bash
# Configure Sentry
# Add SENTRY_DSN to .env.production

# Set up Prometheus & Grafana (already in docker-compose.yml)
# Access Grafana at http://your-server:3000

# Configure alerts
# Set up Slack webhook for critical alerts
```

### 4.2: Final Security Audit

```bash
# Run Django security check
docker-compose exec web python manage.py check --deploy

# Verify all secrets are in environment variables
grep -r "test-api-key" capimax_backend/
grep -r "DEBUG.*True" capimax_backend/capimax_backend/settings/production.py

# Check firewall rules
sudo ufw status

# Verify SSL rating
curl https://www.ssllabs.com/ssltest/analyze.html?d=api.capimax.com
```

### 4.3: Go-Live Checklist

- [ ] All environment variables configured with production values
- [ ] SSL certificates installed and tested
- [ ] Database backups automated and tested
- [ ] Monitoring and alerting configured
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Payment providers tested with real transactions
- [ ] Frontend deployed to CDN
- [ ] DNS configured correctly
- [ ] Email notifications working
- [ ] WebSocket connections tested
- [ ] Load testing completed
- [ ] Rollback procedure documented and tested

---

## 🚨 Emergency Rollback Procedure

If issues occur after deployment:

```bash
# 1. Restore previous Docker containers
docker-compose down
docker-compose up -d --no-deps web

# 2. Restore database from backup
pg_restore -h localhost -U capimax_user -d capimax_prod /opt/capimax/backups/latest_backup.sql.gz

# 3. Notify users via status page
# 4. Review logs for root cause
docker-compose logs -f web

# 5. Fix issues and redeploy
```

---

## 📞 Support Contacts

- **DevOps Team**: devops@capimax.com
- **Security Team**: security@capimax.com
- **On-Call Engineer**: [Phone Number]
- **Sentry Alerts**: Configure in Sentry dashboard
- **Slack Alerts**: #production-alerts channel

---

## 📚 Additional Resources

- [Production Readiness Checklist](./PRODUCTION_READINESS_CHECKLIST.md)
- [Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [CLAUDE.md](./CLAUDE.md) - Platform architecture
- [Django Deployment Checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)

---

**Last Updated**: January 2025
**Next Review**: After successful launch

**Status**: 🟡 AWAITING CRITICAL FIXES - Ready to proceed once Phase 1 is complete
