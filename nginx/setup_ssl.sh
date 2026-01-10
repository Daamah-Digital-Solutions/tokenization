#!/bin/bash

# ================================================================================
# SSL CERTIFICATE SETUP SCRIPT - Let's Encrypt / Certbot
# ================================================================================
#
# This script automates the installation of SSL certificates using Let's Encrypt
# and configures automatic renewal for the Capimax platform.
#
# Usage:
#   chmod +x setup_ssl.sh
#   sudo ./setup_ssl.sh your-domain.com admin@your-domain.com
#
# Requirements:
#   - Ubuntu/Debian server
#   - Nginx installed
#   - Domain DNS pointing to server IP
#   - Ports 80 and 443 open
#
# ================================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ================================================================================
# CONFIGURATION
# ================================================================================

DOMAIN="${1:-capimaxinvestment.com}"
EMAIL="${2:-admin@capimaxinvestment.com}"
WEBROOT="/var/www/certbot"

# ================================================================================
# FUNCTIONS
# ================================================================================

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_domain() {
    print_info "Checking DNS resolution for $DOMAIN..."

    if ! host "$DOMAIN" > /dev/null 2>&1; then
        print_error "Domain $DOMAIN does not resolve. Please configure DNS first."
        exit 1
    fi

    print_info "DNS check passed ✓"
}

install_certbot() {
    print_info "Installing Certbot..."

    # Check if certbot is already installed
    if command -v certbot &> /dev/null; then
        print_info "Certbot already installed ✓"
        return 0
    fi

    # Install certbot based on OS
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS/Fedora
        yum install -y epel-release
        yum install -y certbot python3-certbot-nginx
    else
        print_error "Unsupported operating system"
        exit 1
    fi

    print_info "Certbot installed ✓"
}

create_webroot() {
    print_info "Creating webroot directory for ACME challenge..."

    mkdir -p "$WEBROOT"
    chown -R www-data:www-data "$WEBROOT"
    chmod -R 755 "$WEBROOT"

    print_info "Webroot created ✓"
}

stop_nginx() {
    print_info "Stopping Nginx temporarily..."
    systemctl stop nginx || true
}

start_nginx() {
    print_info "Starting Nginx..."
    systemctl start nginx
    systemctl enable nginx
}

obtain_certificate() {
    print_info "Obtaining SSL certificate from Let's Encrypt..."

    # Request certificate
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$DOMAIN" \
        --domains "www.$DOMAIN" \
        --preferred-challenges http \
        || {
            print_error "Failed to obtain SSL certificate"
            start_nginx
            exit 1
        }

    print_info "SSL certificate obtained ✓"
}

setup_auto_renewal() {
    print_info "Setting up automatic certificate renewal..."

    # Create renewal hook script
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx
logger "Let's Encrypt certificate renewed and Nginx reloaded"
EOF

    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

    # Test renewal process
    certbot renew --dry-run || {
        print_warning "Renewal dry-run failed, but certificate is installed"
    }

    # Add cron job for renewal (certbot should do this automatically, but double check)
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
        print_info "Cron job for certificate renewal added ✓"
    else
        print_info "Renewal cron job already exists ✓"
    fi

    print_info "Auto-renewal configured ✓"
}

test_ssl() {
    print_info "Testing SSL configuration..."

    # Test Nginx configuration
    nginx -t || {
        print_error "Nginx configuration test failed"
        exit 1
    }

    print_info "Nginx configuration test passed ✓"

    # Reload Nginx to apply SSL
    systemctl reload nginx

    print_info "Testing HTTPS connection..."
    if curl -sI "https://$DOMAIN" | grep -q "HTTP"; then
        print_info "HTTPS connection successful ✓"
    else
        print_warning "HTTPS test failed, but certificate is installed"
    fi
}

display_certificate_info() {
    print_info "Certificate Information:"
    echo "================================"
    certbot certificates | grep -A 10 "$DOMAIN"
    echo "================================"
}

# ================================================================================
# MAIN EXECUTION
# ================================================================================

main() {
    echo ""
    echo "================================"
    echo "  SSL Certificate Setup"
    echo "  Domain: $DOMAIN"
    echo "  Email: $EMAIL"
    echo "================================"
    echo ""

    # Pre-flight checks
    check_root
    check_domain

    # Installation steps
    install_certbot
    create_webroot
    stop_nginx
    obtain_certificate
    start_nginx
    setup_auto_renewal
    test_ssl
    display_certificate_info

    echo ""
    print_info "✓ SSL Certificate Setup Complete!"
    echo ""
    print_info "Certificate Location:"
    echo "  Fullchain: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo "  Chain: /etc/letsencrypt/live/$DOMAIN/chain.pem"
    echo ""
    print_info "Next Steps:"
    echo "  1. Update Nginx configuration with certificate paths"
    echo "  2. Test your site: https://$DOMAIN"
    echo "  3. Verify auto-renewal: sudo certbot renew --dry-run"
    echo ""
    print_info "Certificate will auto-renew 30 days before expiration"
    echo ""
}

# Run main function
main "$@"
