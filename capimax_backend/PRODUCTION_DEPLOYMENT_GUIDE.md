# Capimax Production Deployment Guide

This comprehensive guide covers the complete production deployment process for the Capimax Real Estate Tokenization Platform.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Security Configuration](#security-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring Setup](#monitoring-setup)
9. [Post-Deployment Validation](#post-deployment-validation)
10. [Maintenance Procedures](#maintenance-procedures)

---

## Pre-Deployment Checklist

### 1. Code Preparation
- [ ] All tests passing (`python manage.py test`)
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Environment variables documented
- [ ] Database migrations tested

### 2. Infrastructure Requirements
- [ ] **Server Specifications**:
  - CPU: Minimum 4 cores (8+ recommended)
  - RAM: Minimum 16GB (32GB+ recommended)
  - Storage: SSD with 500GB+ space
  - Network: 1Gbps connection

- [ ] **Database Requirements**:
  - PostgreSQL 14+ with 16GB+ RAM
  - SSD storage with IOPS optimization
  - Read replicas for scaling

- [ ] **External Services**:
  - Redis cluster for caching and sessions
  - CDN for static assets
  - Email service provider (AWS SES, SendGrid)
  - Payment processors (Stripe, PayPal)
  - KYC service (Jumio)

### 3. DNS and SSL
- [ ] Domain configured with proper DNS records
- [ ] SSL certificate obtained (Let's Encrypt or commercial)
- [ ] CDN configured for static assets
- [ ] Load balancer configured (if applicable)

---

## Infrastructure Setup

### 1. Server Provisioning

#### AWS EC2 Setup
```bash
# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-0abcdef1234567890 \
    --count 1 \
    --instance-type m5.2xlarge \
    --key-name capimax-prod-key \
    --security-group-ids sg-12345678 \
    --subnet-id subnet-12345678 \
    --user-data file://user-data.sh

# Configure security groups
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

#### Docker Infrastructure
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    volumes:
      - ./staticfiles:/app/staticfiles
      - ./media:/app/media
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=capimax_prod
      - POSTGRES_USER=capimax
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./staticfiles:/usr/share/nginx/html/static
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web

volumes:
  postgres_data:
  redis_data:
```

### 2. Load Balancer Configuration

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/capimax
upstream capimax_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;  # Additional instance for load balancing
}

server {
    listen 80;
    server_name api.capimax.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.capimax.com;

    ssl_certificate /etc/ssl/certs/capimax.com.crt;
    ssl_certificate_key /etc/ssl/private/capimax.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Static files
    location /static/ {
        alias /var/www/capimax/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/capimax/media/;
        expires 1M;
        add_header Cache-Control "public";
    }

    # API endpoints
    location / {
        proxy_pass http://capimax_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
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
    }
}
```

---

## Environment Configuration

### 1. Production Environment Variables

#### Create .env.production
```bash
# Copy template and customize
cp .env.production.template .env
vim .env
```

#### Secure Secrets Management
```bash
# Using AWS Secrets Manager
aws secretsmanager create-secret \
    --name capimax/production/secrets \
    --description "Capimax production secrets" \
    --secret-string file://secrets.json

# Using HashiCorp Vault
vault kv put secret/capimax/production \
    secret_key="your-secret-key" \
    db_password="your-db-password"
```

### 2. SSL Certificate Setup

#### Let's Encrypt Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.capimax.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Commercial Certificate
```bash
# Generate CSR
openssl req -new -newkey rsa:4096 -keyout capimax.com.key -out capimax.com.csr

# Install certificate files
sudo cp capimax.com.crt /etc/ssl/certs/
sudo cp capimax.com.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/capimax.com.key
```

---

## Database Setup

### 1. PostgreSQL Installation and Configuration

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres psql

-- Create database and user
CREATE DATABASE capimax_prod;
CREATE USER capimax WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE capimax_prod TO capimax;
ALTER USER capimax CREATEDB;
```

#### PostgreSQL Optimization
```sql
-- /etc/postgresql/14/main/postgresql.conf optimizations
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
```

### 2. Database Migration and Setup

#### Run Migrations
```bash
# Set production environment
export ENVIRONMENT=production

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput

# Load initial data (if any)
python manage.py loaddata initial_data.json
```

#### Database Backup Setup
```bash
# Create backup script
cat > /opt/capimax/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/capimax/backups"
DB_NAME="capimax_prod"

# Create backup
pg_dump -h localhost -U capimax $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://capimax-backups/production/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/capimax/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/capimax/backup.sh" | crontab -
```

---

## Application Deployment

### 1. Code Deployment

#### Using Git Deployment
```bash
# Clone repository
git clone https://github.com/your-org/capimax-backend.git /opt/capimax
cd /opt/capimax

# Checkout production branch
git checkout production

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements-prod.txt
```

#### Using Docker Deployment
```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Monitor deployment
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Application Server Configuration

#### Gunicorn Configuration
```python
# gunicorn.conf.py
bind = "127.0.0.1:8000"
workers = 4  # (2 * CPU cores) + 1
worker_class = "gevent"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 300
keepalive = 5
preload_app = True
daemon = False
user = "capimax"
group = "capimax"
tmp_upload_dir = None
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}
```

#### Systemd Service Configuration
```ini
# /etc/systemd/system/capimax.service
[Unit]
Description=Capimax Django Application
After=network.target

[Service]
Type=notify
User=capimax
Group=capimax
WorkingDirectory=/opt/capimax
ExecStart=/opt/capimax/venv/bin/gunicorn capimax_backend.wsgi:application -c gunicorn.conf.py
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable capimax
sudo systemctl start capimax
sudo systemctl status capimax
```

### 3. Celery Worker Setup

#### Celery Configuration
```bash
# Start Celery worker
celery -A capimax_backend worker --loglevel=info --detach

# Start Celery beat (scheduler)
celery -A capimax_backend beat --loglevel=info --detach

# Monitor Celery
celery -A capimax_backend flower
```

#### Systemd Service for Celery
```ini
# /etc/systemd/system/capimax-celery.service
[Unit]
Description=Capimax Celery Worker
After=network.target

[Service]
Type=forking
User=capimax
Group=capimax
WorkingDirectory=/opt/capimax
ExecStart=/opt/capimax/venv/bin/celery multi start worker -A capimax_backend --pidfile=/var/run/celery/%%n.pid --logfile=/var/log/celery/%%n%%I.log --loglevel=info
ExecStop=/opt/capimax/venv/bin/celery multi stopwait worker --pidfile=/var/run/celery/%%n.pid
ExecReload=/opt/capimax/venv/bin/celery multi restart worker -A capimax_backend --pidfile=/var/run/celery/%%n.pid --logfile=/var/log/celery/%%n%%I.log --loglevel=info

[Install]
WantedBy=multi-user.target
```

---

## Security Configuration

### 1. Firewall Setup

#### UFW Configuration
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow database access (internal only)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# Deny all other traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 2. Security Headers and Hardening

#### Django Security Settings Validation
```bash
# Run security check
python manage.py check --deploy
```

#### Additional Security Measures
```bash
# Disable server signature
echo "ServerTokens Prod" >> /etc/apache2/apache2.conf

# Set up fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Monitoring and Alerting

#### Set up log monitoring
```bash
# Install and configure logwatch
sudo apt install logwatch
echo "Detail = High" >> /etc/logwatch/conf/logwatch.conf
echo "Output = mail" >> /etc/logwatch/conf/logwatch.conf
echo "MailTo = admin@capimax.com" >> /etc/logwatch/conf/logwatch.conf
```

---

## Performance Optimization

### 1. Database Optimization

#### Index Creation
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_investments_user_created ON investments_investment(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_properties_status_created ON properties_property(status, created_at);
CREATE INDEX CONCURRENTLY idx_payments_status_created ON payments_payment(status, created_at);
CREATE INDEX CONCURRENTLY idx_notifications_user_read ON notifications_notification(user_id, is_read);
```

#### Connection Pooling
```python
# settings/production.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'MAX_CONNS': 20,
            'MIN_CONNS': 5,
        }
    }
}
```

### 2. Caching Strategy

#### Redis Configuration
```bash
# /etc/redis/redis.conf optimizations
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

#### Application-Level Caching
```python
# Cache critical queries
from django.core.cache import cache

def get_active_properties():
    properties = cache.get('active_properties')
    if properties is None:
        properties = Property.objects.filter(status='active').select_related()
        cache.set('active_properties', properties, 300)  # 5 minutes
    return properties
```

### 3. CDN Configuration

#### CloudFront Setup
```json
{
  "DistributionConfig": {
    "CallerReference": "capimax-static-assets",
    "Origins": [
      {
        "Id": "S3-capimax-static",
        "DomainName": "capimax-static.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ],
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-capimax-static",
      "ViewerProtocolPolicy": "redirect-to-https",
      "MinTTL": 86400,
      "DefaultTTL": 31536000
    }
  }
}
```

---

## Monitoring Setup

### 1. Application Monitoring

#### Health Check Endpoint
```python
# Health check with dependency validation
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_detailed(request):
    status_data = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'services': {}
    }
    
    # Check database
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        status_data['services']['database'] = 'healthy'
    except Exception as e:
        status_data['services']['database'] = f'error: {str(e)}'
        status_data['status'] = 'unhealthy'
    
    # Check Redis
    try:
        from django.core.cache import cache
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            status_data['services']['cache'] = 'healthy'
        else:
            status_data['services']['cache'] = 'error'
            status_data['status'] = 'unhealthy'
    except Exception as e:
        status_data['services']['cache'] = f'error: {str(e)}'
        status_data['status'] = 'unhealthy'
    
    return Response(status_data)
```

#### Prometheus Metrics
```python
# Install django-prometheus
pip install django-prometheus

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    'django_prometheus',
    # ... other apps
]

# Add middleware
MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... other middleware
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]
```

### 2. Log Aggregation

#### ELK Stack Configuration
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### 3. Alerting Setup

#### Slack Notifications
```python
# alerts.py
import requests

def send_slack_alert(message, channel='#alerts'):
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    payload = {
        'channel': channel,
        'text': message,
        'username': 'Capimax Alert Bot'
    }
    requests.post(webhook_url, json=payload)

# Usage in views
if error_rate > threshold:
    send_slack_alert(f"High error rate detected: {error_rate}%")
```

---

## Post-Deployment Validation

### 1. Functionality Testing

#### API Endpoint Testing
```bash
# Test critical endpoints
curl -H "Authorization: Bearer $TOKEN" https://api.capimax.com/api/v1/properties/
curl -H "Authorization: Bearer $TOKEN" https://api.capimax.com/api/v1/investments/
curl -H "Authorization: Bearer $TOKEN" https://api.capimax.com/api/v1/dashboard/investor/

# Test health endpoints
curl https://api.capimax.com/api/v1/health/
curl https://api.capimax.com/api/v1/status/
```

#### Performance Testing
```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://api.capimax.com/api/v1/properties/

# Load testing with wrk
wrk -t12 -c400 -d30s https://api.capimax.com/api/v1/properties/
```

### 2. Security Validation

#### SSL/TLS Testing
```bash
# Test SSL configuration
sslscan api.capimax.com
testssl.sh api.capimax.com

# Test security headers
curl -I https://api.capimax.com/
```

#### Vulnerability Scanning
```bash
# Run security scan
nmap -sV api.capimax.com
nikto -h https://api.capimax.com/
```

### 3. Backup and Recovery Testing

#### Test Database Backup
```bash
# Create test backup
pg_dump -h localhost -U capimax capimax_prod > test_backup.sql

# Test restore to staging
pg_restore -h staging-db -U capimax -d capimax_staging test_backup.sql
```

---

## Maintenance Procedures

### 1. Regular Maintenance Tasks

#### Daily Tasks
```bash
#!/bin/bash
# daily_maintenance.sh

# Check system health
curl -f http://localhost:8000/api/v1/health/ || echo "Health check failed"

# Backup database
/opt/capimax/backup.sh

# Clean temporary files
find /tmp -name "capimax_*" -mtime +1 -delete

# Rotate logs
logrotate /etc/logrotate.d/capimax

# Check disk space
df -h | awk '$5 > 80 {print "Disk space warning: " $0}'
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly_maintenance.sh

# Update system packages
apt update && apt list --upgradable

# Analyze database performance
psql -U capimax capimax_prod -c "SELECT * FROM pg_stat_user_tables WHERE n_tup_upd + n_tup_del > 1000;"

# Clear old sessions
python manage.py clearsessions

# Update search indexes
python manage.py update_index

# Generate weekly reports
python manage.py generate_weekly_report
```

### 2. Monitoring and Alerting

#### Setup Monitoring Scripts
```bash
# CPU and Memory monitoring
#!/bin/bash
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')

if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "High CPU usage: $CPU_USAGE%" | mail -s "CPU Alert" admin@capimax.com
fi

if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "High memory usage: $MEM_USAGE%" | mail -s "Memory Alert" admin@capimax.com
fi
```

### 3. Update Procedures

#### Application Updates
```bash
#!/bin/bash
# update_application.sh

# Backup current version
cp -r /opt/capimax /opt/capimax_backup_$(date +%Y%m%d)

# Pull latest code
cd /opt/capimax
git pull origin production

# Update dependencies
source venv/bin/activate
pip install -r requirements-prod.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart services
sudo systemctl restart capimax
sudo systemctl restart capimax-celery

# Verify deployment
sleep 10
curl -f http://localhost:8000/api/v1/health/ || echo "Deployment verification failed"
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Restart if needed
sudo systemctl restart postgresql
```

#### 2. High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Clear cache if needed
echo 3 > /proc/sys/vm/drop_caches
```

#### 3. SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /etc/ssl/certs/capimax.com.crt -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
sudo certbot renew
```

### Emergency Contacts
- **On-call Engineer**: +1-555-ONCALL
- **System Administrator**: admin@capimax.com
- **Cloud Provider Support**: AWS/GCP/Azure support
- **Security Team**: security@capimax.com

---

*This deployment guide should be updated with each major release. Last updated: January 2024*