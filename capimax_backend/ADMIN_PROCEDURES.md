# Capimax Platform Admin Procedures

This document provides comprehensive administrative procedures for managing the Capimax Real Estate Tokenization Platform.

## Table of Contents

1. [System Administration](#system-administration)
2. [User Management](#user-management)
3. [Property Management](#property-management)
4. [Financial Operations](#financial-operations)
5. [Security Procedures](#security-procedures)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Compliance and Reporting](#compliance-and-reporting)
8. [Emergency Procedures](#emergency-procedures)

---

## System Administration

### 1. Daily Operations

#### Morning Checklist
```bash
# Check system health
curl http://localhost:8000/api/v1/health/
curl http://localhost:8000/api/v1/status/

# Review overnight logs
tail -n 100 /path/to/logs/django.log
tail -n 100 /path/to/logs/django_error.log

# Check database connectivity
python manage.py dbshell -c "SELECT 1;"

# Verify Redis connectivity
redis-cli ping

# Check Celery workers
celery -A capimax_backend inspect active
```

#### System Metrics Review
- **Server resource usage**: CPU, memory, disk space
- **Database performance**: Query times, connection count
- **API response times**: Average and 95th percentile
- **Error rates**: 4xx and 5xx error frequencies

### 2. Database Management

#### Daily Backup
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://capimax-backups/daily/
```

#### Database Optimization
```sql
-- Analyze table statistics
ANALYZE;

-- Reindex critical tables
REINDEX TABLE accounts_user;
REINDEX TABLE properties_property;
REINDEX TABLE investments_investment;

-- Check for slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 3. Cache Management

#### Redis Maintenance
```bash
# Check Redis memory usage
redis-cli info memory

# Clear cache if needed
redis-cli flushdb

# Monitor cache hit rate
redis-cli info stats | grep cache_hit_rate
```

---

## User Management

### 1. User Account Administration

#### Create Admin User
```bash
python manage.py createsuperuser
```

#### User Status Management
```python
# In Django shell
from accounts.models import User

# Activate user
user = User.objects.get(email='user@example.com')
user.is_active = True
user.save()

# Deactivate user
user.is_active = False
user.save()

# Change user role
user.role = 'property_owner'
user.save()
```

#### Bulk User Operations
```python
# Bulk activate users
User.objects.filter(is_active=False, date_joined__gte='2024-01-01').update(is_active=True)

# Export user list
users = User.objects.all().values('email', 'first_name', 'last_name', 'role', 'date_joined')
```

### 2. KYC Management

#### Review Pending KYC Applications
```http
GET /api/v1/admin/kyc/pending/
```

#### Approve KYC Application
```python
from kyc.models import KYCDocument

# Review and approve
kyc = KYCDocument.objects.get(id=123)
kyc.status = 'approved'
kyc.reviewed_by = admin_user
kyc.reviewed_at = timezone.now()
kyc.notes = 'All documents verified'
kyc.save()
```

#### Reject KYC Application
```python
kyc.status = 'rejected'
kyc.rejection_reason = 'Document quality insufficient'
kyc.save()
```

### 3. Support Ticket Management

#### Daily Ticket Review
```python
from notifications.models import SupportTicket

# Get pending tickets
pending_tickets = SupportTicket.objects.filter(status='open').order_by('created_at')

# Priority tickets
priority_tickets = SupportTicket.objects.filter(
    priority__in=['high', 'critical'],
    status='open'
)
```

---

## Property Management

### 1. Property Approval Process

#### Review New Property Submissions
```http
GET /api/v1/admin/properties/pending/
```

#### Property Approval Checklist
- [ ] **Legal Documentation**: Deed, title, permits
- [ ] **Financial Viability**: Revenue projections, market analysis
- [ ] **Property Inspection**: Physical condition report
- [ ] **Insurance Coverage**: Adequate liability and property insurance
- [ ] **Regulatory Compliance**: Zoning, environmental clearances

#### Approve Property
```python
from properties.models import Property

property = Property.objects.get(id=123)
property.status = 'approved'
property.approved_by = admin_user
property.approved_at = timezone.now()
property.save()

# Send approval notification
property.send_approval_notification()
```

### 2. Tokenization Oversight

#### Monitor Token Sales
```python
from investments.models import Investment

# Daily sales report
daily_sales = Investment.objects.filter(
    created_at__date=timezone.now().date()
).aggregate(
    total_amount=Sum('amount'),
    total_transactions=Count('id')
)
```

#### Token Price Monitoring
```python
# Check for unusual price movements
from properties.models import Property

properties = Property.objects.filter(status='active')
for prop in properties:
    current_price = prop.current_token_price
    historical_avg = prop.get_30_day_average_price()
    if abs(current_price - historical_avg) / historical_avg > 0.1:  # 10% deviation
        # Alert admin about significant price movement
        send_price_alert(prop, current_price, historical_avg)
```

### 3. Property Performance Monitoring

#### Monthly Property Reports
```python
def generate_monthly_report(property_id, month, year):
    property = Property.objects.get(id=property_id)
    
    # Rental income
    rental_income = property.get_monthly_income(month, year)
    
    # Expenses
    expenses = property.get_monthly_expenses(month, year)
    
    # Occupancy rate
    occupancy = property.get_occupancy_rate(month, year)
    
    # ROI calculation
    roi = property.calculate_monthly_roi(month, year)
    
    return {
        'property': property.title,
        'rental_income': rental_income,
        'expenses': expenses,
        'net_income': rental_income - expenses,
        'occupancy_rate': occupancy,
        'roi': roi
    }
```

---

## Financial Operations

### 1. Payment Processing Oversight

#### Daily Payment Reconciliation
```python
from payments.models import Payment

# Today's payments
today_payments = Payment.objects.filter(
    created_at__date=timezone.now().date()
)

# Payment summary
payment_summary = today_payments.aggregate(
    total_amount=Sum('amount'),
    successful_payments=Count('id', filter=Q(status='completed')),
    failed_payments=Count('id', filter=Q(status='failed'))
)
```

#### Refund Processing
```python
from payments.models import Payment

def process_refund(payment_id, refund_amount, reason):
    payment = Payment.objects.get(id=payment_id)
    
    # Create refund record
    refund = payment.create_refund(
        amount=refund_amount,
        reason=reason,
        processed_by=admin_user
    )
    
    # Process through payment provider
    if payment.provider == 'stripe':
        refund.process_stripe_refund()
    elif payment.provider == 'paypal':
        refund.process_paypal_refund()
    
    return refund
```

### 2. Dividend Distribution

#### Monthly Dividend Processing
```python
from properties.models import Property
from investments.models import DividendDistribution

def process_monthly_dividends():
    properties = Property.objects.filter(
        status='active',
        has_rental_income=True
    )
    
    for property in properties:
        # Calculate distributable amount
        net_income = property.get_monthly_net_income()
        distributable_amount = net_income * 0.8  # 80% distribution
        
        # Create distribution
        distribution = DividendDistribution.objects.create(
            property=property,
            total_amount=distributable_amount,
            distribution_date=timezone.now().date(),
            period_start=timezone.now().replace(day=1).date(),
            period_end=(timezone.now().replace(day=1) + timedelta(days=31)).date()
        )
        
        # Process individual payments
        distribution.process_distribution()
```

### 3. Financial Reporting

#### Generate Financial Reports
```python
def generate_platform_financial_report(start_date, end_date):
    # Total investments
    total_investments = Investment.objects.filter(
        created_at__range=[start_date, end_date]
    ).aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Platform fees
    platform_fees = Payment.objects.filter(
        created_at__range=[start_date, end_date],
        payment_type='platform_fee'
    ).aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Property performance
    property_performance = Property.objects.filter(
        created_at__range=[start_date, end_date]
    ).aggregate(
        avg_roi=Avg('roi'),
        total_properties=Count('id')
    )
    
    return {
        'period': f"{start_date} to {end_date}",
        'total_investments': total_investments,
        'platform_fees': platform_fees,
        'avg_property_roi': property_performance['avg_roi'],
        'new_properties': property_performance['total_properties']
    }
```

---

## Security Procedures

### 1. Security Monitoring

#### Daily Security Checks
```bash
# Check for failed login attempts
python manage.py shell -c "
from accounts.models import LoginAttempt
failed_attempts = LoginAttempt.objects.filter(
    timestamp__gte=timezone.now() - timedelta(days=1),
    successful=False
).count()
print(f'Failed login attempts in last 24h: {failed_attempts}')
"

# Review access logs
grep "401\|403\|404" /var/log/nginx/access.log | tail -20

# Check for suspicious API calls
grep "rate_limit_exceeded" logs/django.log
```

#### Security Incident Response
1. **Identify**: Log analysis, monitoring alerts
2. **Contain**: Block suspicious IPs, disable compromised accounts
3. **Investigate**: Detailed log analysis, forensics
4. **Remediate**: Fix vulnerabilities, update security measures
5. **Document**: Incident report, lessons learned

### 2. Access Control Management

#### Admin Account Audit
```python
# Review admin accounts
admins = User.objects.filter(is_staff=True, is_active=True)
for admin in admins:
    print(f"Admin: {admin.email}, Last login: {admin.last_login}")

# Check for inactive admin accounts
inactive_admins = User.objects.filter(
    is_staff=True,
    last_login__lt=timezone.now() - timedelta(days=90)
)
```

#### Permission Review
```python
from django.contrib.auth.models import Group, Permission

# Review group permissions
for group in Group.objects.all():
    print(f"Group: {group.name}")
    for permission in group.permissions.all():
        print(f"  - {permission.name}")
```

### 3. Data Protection

#### PII Data Audit
```python
# Identify users with PII data
users_with_pii = User.objects.filter(
    kyc_documents__isnull=False
).distinct()

# Data retention compliance
old_documents = KYCDocument.objects.filter(
    created_at__lt=timezone.now() - timedelta(days=2555)  # 7 years
)
```

---

## Monitoring and Maintenance

### 1. System Monitoring

#### Performance Metrics
```python
# API response time monitoring
def monitor_api_performance():
    import time
    import requests
    
    endpoints = [
        '/api/v1/properties/',
        '/api/v1/investments/',
        '/api/v1/dashboard/investor/'
    ]
    
    for endpoint in endpoints:
        start_time = time.time()
        response = requests.get(f'http://localhost:8000{endpoint}')
        response_time = time.time() - start_time
        
        if response_time > 2.0:  # 2 second threshold
            alert_slow_endpoint(endpoint, response_time)
```

#### Database Performance
```sql
-- Monitor slow queries
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements 
WHERE mean_time > 1000  -- queries taking more than 1 second
ORDER BY mean_time DESC;

-- Check database size
SELECT 
    pg_size_pretty(pg_database_size('capimax_prod')) as database_size;

-- Monitor connection count
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

### 2. Automated Maintenance

#### Weekly Maintenance Tasks
```bash
#!/bin/bash
# weekly_maintenance.sh

# Clear old session data
python manage.py clearsessions

# Update search indexes
python manage.py update_index

# Clean up temporary files
find /tmp -name "*.tmp" -mtime +7 -delete

# Optimize database
python manage.py dbshell -c "VACUUM ANALYZE;"

# Generate weekly report
python manage.py generate_weekly_report
```

#### Log Rotation
```bash
# Configure logrotate for Django logs
/path/to/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    copytruncate
    create 644 www-data www-data
}
```

---

## Compliance and Reporting

### 1. Regulatory Compliance

#### AML/KYC Compliance
```python
def compliance_report():
    # Users pending KYC
    pending_kyc = User.objects.filter(kyc_status='pending').count()
    
    # Large transactions (>$10,000)
    large_transactions = Investment.objects.filter(
        amount__gte=10000,
        created_at__gte=timezone.now() - timedelta(days=30)
    )
    
    # Suspicious activity patterns
    suspicious_users = User.objects.filter(
        investments__amount__gte=50000,
        investments__created_at__gte=timezone.now() - timedelta(days=7)
    ).annotate(
        recent_investment_count=Count('investments')
    ).filter(recent_investment_count__gte=5)
    
    return {
        'pending_kyc_count': pending_kyc,
        'large_transactions': large_transactions.count(),
        'suspicious_activity_count': suspicious_users.count()
    }
```

#### Audit Trail Maintenance
```python
# Ensure all critical actions are logged
def log_admin_action(user, action, target, details=None):
    AdminActionLog.objects.create(
        admin_user=user,
        action=action,
        target_model=target.__class__.__name__,
        target_id=target.id,
        details=details or {},
        timestamp=timezone.now(),
        ip_address=get_client_ip(request)
    )
```

### 2. Financial Reporting

#### Monthly Financial Reports
```python
def generate_monthly_compliance_report(month, year):
    start_date = datetime(year, month, 1)
    end_date = (start_date + timedelta(days=31)).replace(day=1) - timedelta(days=1)
    
    # Investment summary
    investments = Investment.objects.filter(
        created_at__range=[start_date, end_date]
    ).aggregate(
        total_amount=Sum('amount'),
        transaction_count=Count('id'),
        unique_investors=Count('user', distinct=True)
    )
    
    # Property transactions
    property_sales = Property.objects.filter(
        investments__created_at__range=[start_date, end_date]
    ).aggregate(
        properties_sold=Count('id', distinct=True),
        total_value=Sum('total_value')
    )
    
    return {
        'period': f"{month}/{year}",
        'investments': investments,
        'property_sales': property_sales,
        'generated_at': timezone.now()
    }
```

---

## Emergency Procedures

### 1. System Outage Response

#### Immediate Response Steps
1. **Assess Scope**: Determine if partial or full system outage
2. **Check Dependencies**: Database, Redis, external APIs
3. **Enable Maintenance Mode**: Display maintenance page
4. **Notify Stakeholders**: Internal team and affected users
5. **Begin Diagnostics**: Log analysis, system checks

#### Recovery Procedures
```bash
# Database recovery
pg_ctl start -D /var/lib/postgresql/data

# Redis recovery
systemctl start redis

# Application restart
systemctl restart gunicorn
systemctl restart nginx

# Verify system health
curl http://localhost:8000/api/v1/health/
```

### 2. Security Incident Response

#### Immediate Actions
```bash
# Block suspicious IP
iptables -A INPUT -s SUSPICIOUS_IP -j DROP

# Disable compromised user account
python manage.py shell -c "
from accounts.models import User
user = User.objects.get(email='compromised@email.com')
user.is_active = False
user.save()
"

# Force password reset for all users (if needed)
python manage.py force_password_reset
```

#### Investigation Procedures
1. **Preserve Evidence**: Database snapshots, log files
2. **Analyze Logs**: Identify attack vectors, affected systems
3. **Assess Damage**: Data integrity, system compromise
4. **Document Findings**: Detailed incident report
5. **Implement Fixes**: Security patches, process improvements

### 3. Data Recovery

#### Database Restoration
```bash
# Stop application
systemctl stop gunicorn

# Restore from backup
pg_restore -h localhost -U postgres -d capimax_prod backup_file.sql

# Verify data integrity
python manage.py check_data_integrity

# Restart application
systemctl start gunicorn
```

#### Backup Verification
```bash
# Daily backup verification
pg_restore --list backup_file.sql | head -20

# Test restore to staging environment
pg_restore -h staging-db -U postgres -d capimax_staging backup_file.sql
```

---

## Contact Information and Escalation

### Internal Contacts
- **System Administrator**: admin@capimax.com
- **Security Team**: security@capimax.com
- **Development Team**: dev@capimax.com
- **Compliance Officer**: compliance@capimax.com

### External Contacts
- **Cloud Provider Support**: AWS/GCP/Azure support
- **Database Administrator**: DBA consultant
- **Security Consultant**: Third-party security firm
- **Legal Counsel**: Legal team contact

### Escalation Matrix
1. **Level 1**: On-call engineer (respond within 15 minutes)
2. **Level 2**: Senior administrator (respond within 30 minutes)
3. **Level 3**: CTO/Technical Director (respond within 1 hour)
4. **Level 4**: Executive team (respond within 2 hours)

---

*This document should be reviewed and updated quarterly. Last updated: January 2024*