# FINAL PRODUCTION DEPLOYMENT CHECKLIST
# Capimax Real Estate Tokenization Platform v3.0

## Pre-Deployment Verification

### 1. Environment Configuration ✓
- [ ] Set SECRET_KEY environment variable (generate with: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`)
- [ ] Configure DATABASE_URL for PostgreSQL
- [ ] Set REDIS_URL for cache and message broker
- [ ] Configure EMAIL_HOST_PASSWORD
- [ ] Set ALLOWED_HOSTS to production domains
- [ ] Configure CORS_ALLOWED_ORIGINS for frontend URL
- [ ] Set CSRF_TRUSTED_ORIGINS
- [ ] Configure at least one payment gateway (STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID, or NOWPAYMENTS_API_KEY)
- [ ] Set JUMIO_API_TOKEN and JUMIO_API_SECRET for KYC
- [ ] Optional: Configure AWS S3 (USE_S3_STORAGE=True)
- [ ] Optional: Configure Sentry (SENTRY_DSN)

### 2. Database Setup ✓
- [ ] Create PostgreSQL database
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Set up automated backups
- [ ] Configure database SSL connection

### 3. Static & Media Files ✓
- [ ] Collect static files: `python manage.py collectstatic --noinput`
- [ ] Create media directory with proper permissions
- [ ] Configure Nginx to serve static/media files
- [ ] Optional: Set up CDN for static files

### 4. Security Checks ✓
- [ ] Run Django production checks: `python manage.py check --deploy`
- [ ] Run production readiness validation: `python validate_production_readiness.py`
- [ ] Verify DEBUG=False in production settings
- [ ] Confirm HTTPS enforcement enabled
- [ ] Verify secure cookie settings
- [ ] Test CSRF protection
- [ ] Verify rate limiting active

### 5. Services Configuration ✓
- [ ] Start Redis: `redis-server` or systemd service
- [ ] Start Celery worker: `celery -A capimax_backend worker -l info`
- [ ] Start Celery beat: `celery -A capimax_backend beat -l info`
- [ ] Configure Nginx reverse proxy with SSL
- [ ] Set up systemd services for auto-restart

### 6. Backend Application ✓
- [ ] Start Gunicorn: `gunicorn capimax_backend.wsgi:application --bind 0.0.0.0:8000 --workers 4`
- [ ] Or use Docker: `docker-compose up -d`
- [ ] Verify API health endpoint: `curl https://yourdomain.com/api/v1/health/`
- [ ] Test authentication endpoints
- [ ] Test payment gateway webhooks

### 7. Frontend Deployment ✓
- [ ] Update VITE_API_URL in frontend .env
- [ ] Build frontend: `npm run build`
- [ ] Deploy build to hosting (Vercel, Netlify, or Nginx)
- [ ] Verify environment variables in hosting platform
- [ ] Test frontend can connect to backend API

### 8. Final Testing ✓
- [ ] User registration flow
- [ ] Email verification
- [ ] Login with 2FA
- [ ] KYC document upload
- [ ] Property listing creation
- [ ] Investment flow end-to-end
- [ ] Payment processing (test mode)
- [ ] Secondary marketplace
- [ ] Admin panel access
- [ ] Broker commission tracking
- [ ] Email notifications
- [ ] WebSocket real-time updates

### 9. Monitoring & Logging ✓
- [ ] Verify log files being created
- [ ] Configure log rotation
- [ ] Set up error alerting (Sentry or email)
- [ ] Configure Prometheus metrics (if using)
- [ ] Set up Grafana dashboards (if using)
- [ ] Monitor Celery task queue

### 10. Backup & Recovery ✓
- [ ] Database backup script configured
- [ ] Test database restoration
- [ ] Media files backup configured
- [ ] Backup encryption enabled
- [ ] Disaster recovery plan documented

## Production Launch Sequence

### Phase 1: Infrastructure (Day 1)
1. ✓ Provision production server (VPS, cloud instance)
2. ✓ Install system dependencies (Python 3.11, PostgreSQL, Redis, Nginx)
3. ✓ Configure firewall rules (allow 80, 443, SSH only)
4. ✓ Set up SSL certificates (Let's Encrypt)
5. ✓ Configure DNS records

### Phase 2: Application Deployment (Day 2)
1. ✓ Clone repository to production server
2. ✓ Create virtual environment and install dependencies
3. ✓ Configure environment variables
4. ✓ Run database migrations
5. ✓ Collect static files
6. ✓ Configure systemd services

### Phase 3: Services Start (Day 3)
1. ✓ Start PostgreSQL
2. ✓ Start Redis
3. ✓ Start Celery worker
4. ✓ Start Celery beat
5. ✓ Start Gunicorn
6. ✓ Start Nginx

### Phase 4: Frontend Deployment (Day 3)
1. ✓ Build frontend application
2. ✓ Deploy to hosting platform
3. ✓ Configure environment variables
4. ✓ Test frontend-backend connectivity

### Phase 5: Final Verification (Day 4)
1. ✓ Run all end-to-end tests
2. ✓ Verify payment gateways (test mode)
3. ✓ Verify email sending
4. ✓ Verify KYC integration
5. ✓ Load testing
6. ✓ Security penetration testing

### Phase 6: Go Live (Day 5)
1. ✓ Switch payment gateways to live mode
2. ✓ Enable production domain
3. ✓ Monitor error logs closely
4. ✓ Have rollback plan ready
5. ✓ Announce launch

## Post-Launch Monitoring (First Week)

### Daily Checks
- [ ] Check error logs
- [ ] Monitor server resources (CPU, RAM, disk)
- [ ] Review failed Celery tasks
- [ ] Check payment gateway transactions
- [ ] Monitor user registrations
- [ ] Review security logs

### Weekly Tasks
- [ ] Database backup verification
- [ ] Performance optimization review
- [ ] Security patch updates
- [ ] User feedback analysis
- [ ] Feature usage analytics

## Rollback Procedure

If critical issues arise:

1. **Immediate**: Switch DNS to maintenance page
2. **Backend**: Rollback to previous Docker image or git commit
3. **Database**: Restore from latest backup (if migrations were run)
4. **Frontend**: Rollback to previous deployment
5. **Notify**: Alert users via email/social media

## Support Contacts

**Technical Lead**: [Your Name/Team]
**Email**: tech@capimaxinvestment.com
**Emergency**: [Phone Number]

## Success Criteria

Platform is considered successfully deployed when:
- ✓ All health checks passing
- ✓ 99.9% uptime over 24 hours
- ✓ All payment gateways functional
- ✓ Email notifications working
- ✓ Zero critical errors in logs
- ✓ User registration and KYC working
- ✓ Investment flow completing successfully

## Version Information

**Platform Version**: 3.0.0
**Django Version**: 5.2.8
**React Version**: 18.3.1
**Deployment Date**: [To be filled]
**Production URL**: [To be filled]

---

## Quick Reference Commands

```bash
# Backend
python manage.py check --deploy
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
python validate_production_readiness.py

# Celery
celery -A capimax_backend worker -l info
celery -A capimax_backend beat -l info

# Gunicorn
gunicorn capimax_backend.wsgi:application --bind 0.0.0.0:8000 --workers 4 --worker-class gevent --worker-connections 1000

# Docker
docker-compose up -d
docker-compose logs -f web
docker-compose down

# Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx

# Frontend
npm run build
npm run preview
```

## Final Notes

This checklist ensures a smooth production deployment. Complete each item systematically, and don't skip any steps. When in doubt, refer to `PRODUCTION_DEPLOYMENT_GUIDE.md` for detailed instructions.

**REMEMBER**: Always test in staging environment before production deployment!

---

Generated by: Capimax DevOps Team
Last Updated: December 2025
Status: ✓ READY FOR DEPLOYMENT
