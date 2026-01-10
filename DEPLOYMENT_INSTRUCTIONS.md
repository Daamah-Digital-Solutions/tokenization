# CAPIMAX PRODUCTION DEPLOYMENT INSTRUCTIONS

## Server: Hostinger VPS (8 vCPU, 32GB RAM, 400GB NVMe, Ubuntu 22.04)
## Domain: capimaxrt.com

---

## PHASE 1: SERVER PREPARATION

### Step 1.1: Connect to Server
```bash
ssh root@<YOUR_VPS_IP>
```

### Step 1.2: Update System
```bash
apt update && apt upgrade -y
```

### Step 1.3: Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 1.4: Install Required Packages
```bash
apt install -y git curl wget ufw fail2ban
```

### Step 1.5: Configure Firewall
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

### Step 1.6: Create Application Directory
```bash
mkdir -p /opt/capimax
cd /opt/capimax
```

---

## PHASE 2: UPLOAD PROJECT FILES

### Step 2.1: Upload Files to Server
On your LOCAL machine, run:
```bash
# From the project root directory
scp -r . root@<YOUR_VPS_IP>:/opt/capimax/
```

Or use Git:
```bash
cd /opt/capimax
git clone <YOUR_REPO_URL> .
```

### Step 2.2: Create Required Directories
```bash
mkdir -p nginx/ssl nginx/logs database/backups capimax_backend/logs
```

---

## PHASE 3: CONFIGURE ENVIRONMENT

### Step 3.1: Generate Django Secret Key
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```
Save this output - you'll need it for the .env file.

### Step 3.2: Generate Strong Database Password
```bash
openssl rand -base64 32
```
Save this output for DB_PASSWORD.

### Step 3.3: Create Production .env File
```bash
cd /opt/capimax/capimax_backend
cp .env.production .env
nano .env
```

Replace all placeholders:
- `<GENERATE_NEW_SECRET_KEY>` ’ Your generated secret key
- `<STRONG_DB_PASSWORD>` ’ Your generated database password
- `<HOSTINGER_SMTP_USERNAME>` ’ Your Hostinger email (e.g., noreply@capimaxrt.com)
- `<HOSTINGER_SMTP_PASSWORD>` ’ Your Hostinger email password
- Stripe keys (I will provide)
- NOWPayments keys (I will provide)

---

## PHASE 4: DNS CONFIGURATION

### Step 4.1: Point DNS to VPS
In Hostinger DNS panel, create:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | <YOUR_VPS_IP> | 3600 |
| A | www | <YOUR_VPS_IP> | 3600 |

Wait 5-10 minutes for propagation.

### Step 4.2: Verify DNS
```bash
dig capimaxrt.com +short
dig www.capimaxrt.com +short
```
Both should return your VPS IP.

---

## PHASE 5: SSL CERTIFICATE SETUP

### Step 5.1: Create Initial Nginx Config (HTTP only)
```bash
# Create temporary HTTP-only config for SSL setup
cat > /opt/capimax/nginx/nginx.initial.conf << 'EOF'
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        server_name capimaxrt.com www.capimaxrt.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'Capimax SSL Setup';
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

### Step 5.2: Start Nginx Temporarily
```bash
docker run -d --name nginx-temp \
  -p 80:80 \
  -v /opt/capimax/nginx/nginx.initial.conf:/etc/nginx/nginx.conf:ro \
  -v /opt/capimax/certbot/www:/var/www/certbot \
  nginx:1.25-alpine
```

### Step 5.3: Obtain SSL Certificate
```bash
mkdir -p /opt/capimax/certbot/www /opt/capimax/certbot/conf

docker run --rm \
  -v /opt/capimax/certbot/conf:/etc/letsencrypt \
  -v /opt/capimax/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d capimaxrt.com \
  -d www.capimaxrt.com \
  --email tech@capimaxrt.com \
  --agree-tos \
  --no-eff-email
```

### Step 5.4: Copy Certificates
```bash
mkdir -p /opt/capimax/nginx/ssl
cp -L /opt/capimax/certbot/conf/live/capimaxrt.com/fullchain.pem /opt/capimax/nginx/ssl/
cp -L /opt/capimax/certbot/conf/live/capimaxrt.com/privkey.pem /opt/capimax/nginx/ssl/
```

### Step 5.5: Stop Temporary Nginx
```bash
docker stop nginx-temp
docker rm nginx-temp
```

---

## PHASE 6: BUILD FRONTEND

### Step 6.1: Install Node.js (if building on server)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Step 6.2: Build Frontend
```bash
cd /opt/capimax/capimax-preview
cp .env.production .env
npm install
npm run build
```

The build output will be in `/opt/capimax/capimax-preview/dist/`

---

## PHASE 7: DEPLOY APPLICATION

### Step 7.1: Start All Services
```bash
cd /opt/capimax
docker compose -f docker-compose.production.yml up -d
```

### Step 7.2: Check Service Status
```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f
```

### Step 7.3: Run Database Migrations
```bash
docker compose -f docker-compose.production.yml exec web python manage.py migrate
```

### Step 7.4: Create Superuser
```bash
docker compose -f docker-compose.production.yml exec web python manage.py createsuperuser
```

### Step 7.5: Verify Health
```bash
curl -k https://capimaxrt.com/api/v1/health/
curl -k https://capimaxrt.com/health
```

---

## PHASE 8: CONFIGURE PAYMENT WEBHOOKS

### Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://capimaxrt.com/api/v1/payments/stripe/webhook/`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy the Signing Secret to `STRIPE_WEBHOOK_SECRET` in .env

### NOWPayments Dashboard
1. Go to https://nowpayments.io/settings
2. Add IPN callback URL: `https://capimaxrt.com/api/v1/payments/nowpayments/ipn/`
3. Copy IPN Secret to `NOWPAYMENTS_IPN_SECRET` in .env

### Restart After Webhook Config
```bash
docker compose -f docker-compose.production.yml restart web celery
```

---

## PHASE 9: FINAL VERIFICATION

### Step 9.1: Test All Endpoints
```bash
# Health check
curl https://capimaxrt.com/api/v1/health/

# API docs
curl https://capimaxrt.com/api/docs/

# Frontend
curl https://capimaxrt.com/
```

### Step 9.2: Test User Flow
1. Open https://capimaxrt.com in browser
2. Register a new user
3. Check email verification
4. Log in
5. Access dashboard

### Step 9.3: Test Admin
1. Go to https://capimaxrt.com/admin/
2. Log in with superuser credentials
3. Verify KYC management is accessible

---

## USEFUL COMMANDS

### View Logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f web
docker compose -f docker-compose.production.yml logs -f celery
docker compose -f docker-compose.production.yml logs -f nginx
```

### Restart Services
```bash
docker compose -f docker-compose.production.yml restart
docker compose -f docker-compose.production.yml restart web
```

### Stop All Services
```bash
docker compose -f docker-compose.production.yml down
```

### Update Application
```bash
cd /opt/capimax
git pull origin main
docker compose -f docker-compose.production.yml build web celery celery-beat
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml exec web python manage.py migrate
```

### Database Backup
```bash
docker compose -f docker-compose.production.yml exec db pg_dump -U capimax_user capimax > /opt/capimax/database/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore
```bash
docker compose -f docker-compose.production.yml exec -T db psql -U capimax_user capimax < backup.sql
```

### SSL Certificate Renewal
```bash
docker compose -f docker-compose.production.yml run --rm certbot renew
docker compose -f docker-compose.production.yml restart nginx
```

---

## TROUBLESHOOTING

### Container Won't Start
```bash
docker compose -f docker-compose.production.yml logs web
# Check for missing env variables or syntax errors
```

### Database Connection Error
```bash
# Check if db container is healthy
docker compose -f docker-compose.production.yml ps db

# Check database logs
docker compose -f docker-compose.production.yml logs db
```

### 502 Bad Gateway
```bash
# Check if web container is running
docker compose -f docker-compose.production.yml ps web

# Check web logs
docker compose -f docker-compose.production.yml logs web

# Verify nginx can reach web
docker compose -f docker-compose.production.yml exec nginx curl http://web:8000/api/v1/health/
```

### Email Not Sending
```bash
# Test email from Django shell
docker compose -f docker-compose.production.yml exec web python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'noreply@capimaxrt.com', ['your-email@example.com'])
```

---

## WHAT I NEED FROM YOU TO PROCEED

1. **VPS IP Address** - So I can help with specific commands
2. **Confirmation DNS is pointed** - After you set A records
3. **SMTP Credentials** - Hostinger email username and password
4. **Stripe Live Keys** - When you have them from Stripe dashboard
5. **NOWPayments Live Keys** - When you have them from NOWPayments dashboard

Once you provide these, I will:
- Fill in the exact .env values
- Guide you through each command
- Verify the deployment is working

---

## TIMELINE ESTIMATE

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Server Preparation | 15 min |
| 2 | Upload Files | 10 min |
| 3 | Configure Environment | 15 min |
| 4 | DNS Configuration | 5 min + propagation |
| 5 | SSL Setup | 10 min |
| 6 | Build Frontend | 5 min |
| 7 | Deploy Application | 10 min |
| 8 | Configure Webhooks | 10 min |
| 9 | Final Verification | 15 min |

**Total: ~1.5 hours** (excluding DNS propagation)

---

Generated by: Claude (Lead DevOps Engineer)
Last Updated: December 2025
