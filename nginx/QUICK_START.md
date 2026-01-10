# Nginx Configuration - Quick Start Guide

## 🚀 Quick Deployment (5 minutes)

### 1. Prerequisites Check
```bash
# Verify domain DNS is pointing to server
host capimaxinvestment.com

# Should return your server IP address
```

### 2. Install Nginx
```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 3. Create Directories
```bash
sudo mkdir -p /var/www/capimax/{dist,staticfiles,media}
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/capimax
sudo chmod -R 755 /var/www/capimax
```

### 4. Deploy Files
```bash
# Copy frontend build
scp -r capimax-preview/dist/* user@server:/var/www/capimax/dist/

# Copy Nginx config
sudo cp nginx/capimax.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/capimax.conf /etc/nginx/sites-enabled/

# Edit domain in config
sudo nano /etc/nginx/sites-available/capimax.conf
# Replace capimaxinvestment.com with your domain
```

### 5. Install SSL
```bash
sudo chmod +x nginx/setup_ssl.sh
sudo ./nginx/setup_ssl.sh your-domain.com admin@your-domain.com
```

### 6. Test & Start
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verify
curl -I https://your-domain.com
```

## ✅ Quick Verification

```bash
# Check SSL certificate
sudo certbot certificates

# Test HTTPS
curl -I https://your-domain.com | grep "HTTP/2 200"

# Test security headers
curl -I https://your-domain.com | grep "Strict-Transport-Security"

# Test API proxy
curl https://your-domain.com/api/v1/properties/

# Check logs
sudo tail -f /var/log/nginx/capimax_access.log
```

## 🔧 Common Commands

```bash
# Test configuration
sudo nginx -t

# Reload (zero downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/capimax_access.log
sudo tail -f /var/log/nginx/capimax_error.log

# Check status
sudo systemctl status nginx

# Renew SSL (manual)
sudo certbot renew
```

## 📋 Configuration Highlights

- **HTTP → HTTPS** redirect
- **TLS 1.2/1.3** only
- **A+ SSL** rating
- **Rate limiting:** API (10/s), Auth (5/m), Payment (3/m)
- **Security headers:** HSTS, CSP, XSS protection
- **Gzip** compression
- **WebSocket** support
- **SPA routing** support

## 🆘 Troubleshooting

### Nginx won't start
```bash
sudo nginx -t  # Check for errors
sudo netstat -tulpn | grep :80  # Check port conflicts
```

### 502 Bad Gateway
```bash
ps aux | grep gunicorn  # Check if backend is running
sudo netstat -tulpn | grep :8000  # Check backend port
```

### SSL errors
```bash
sudo certbot certificates  # Check certificate status
sudo /usr/local/bin/setup_ssl.sh your-domain.com admin@your-domain.com  # Re-run
```

### Static files 404
```bash
ls -la /var/www/capimax/dist/  # Verify files exist
sudo chown -R www-data:www-data /var/www/capimax  # Fix permissions
```

## 📚 Full Documentation

See `PHASE_4_NGINX_SSL_DEPLOYMENT_GUIDE.md` for complete documentation.
