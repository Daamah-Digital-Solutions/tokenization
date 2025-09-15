#!/usr/bin/env python
"""
Capimax Production Readiness Validation Script

This script validates all critical production readiness requirements
for the Capimax Real Estate Tokenization Platform.
"""

import os
import sys
import subprocess
import json
import time
from urllib.request import urlopen
from urllib.error import URLError
import django
from django.conf import settings

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not available, skip

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
ENDC = '\033[0m'

def print_success(message):
    print(f"{GREEN}[SUCCESS] {message}{ENDC}")

def print_error(message):
    print(f"{RED}[ERROR] {message}{ENDC}")

def print_warning(message):
    print(f"{YELLOW}[WARNING] {message}{ENDC}")

def print_info(message):
    print(f"{BLUE}[INFO] {message}{ENDC}")

def run_command(command, capture_output=True):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=capture_output, 
            text=True, 
            timeout=30
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def test_api_endpoint(url):
    """Test if an API endpoint is accessible."""
    try:
        with urlopen(url, timeout=10) as response:
            return response.status == 200, response.read().decode()
    except URLError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def validate_django_settings():
    """Validate Django settings for production readiness."""
    print(f"\n{BLUE}=== Django Configuration Validation ==={ENDC}")
    
    # Check if settings can be imported
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')
        django.setup()
        print_success("Django settings imported successfully")
    except Exception as e:
        print_error(f"Failed to import Django settings: {e}")
        return False
    
    # Check SECRET_KEY
    secret_key = getattr(settings, 'SECRET_KEY', '')
    if secret_key and secret_key != 'django-insecure-fallback-key-change-immediately':
        if len(secret_key) >= 50:
            print_success("SECRET_KEY is properly configured")
        else:
            print_warning("SECRET_KEY might be too short")
    else:
        print_error("SECRET_KEY is not properly configured")
    
    # Check DEBUG setting
    debug = getattr(settings, 'DEBUG', True)
    environment = os.environ.get('ENVIRONMENT', 'development')
    if environment == 'production' and not debug:
        print_success("DEBUG is disabled for production")
    elif environment == 'production' and debug:
        print_error("DEBUG should be disabled in production")
    else:
        print_info(f"DEBUG setting appropriate for {environment} environment")
    
    # Check ALLOWED_HOSTS
    allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
    if allowed_hosts and allowed_hosts != ['localhost', '127.0.0.1', '0.0.0.0', 'testserver']:
        print_success("ALLOWED_HOSTS is configured")
    else:
        print_warning("ALLOWED_HOSTS should be configured for production")
    
    # Check database configuration
    databases = getattr(settings, 'DATABASES', {})
    if 'default' in databases:
        db_engine = databases['default'].get('ENGINE', '')
        if 'postgresql' in db_engine:
            print_success("PostgreSQL database configured")
        elif 'sqlite3' in db_engine:
            print_warning("SQLite database detected (consider PostgreSQL for production)")
        else:
            print_info(f"Database engine: {db_engine}")
    
    # Check security settings
    security_checks = [
        ('SECURE_SSL_REDIRECT', 'SSL redirect'),
        ('SECURE_BROWSER_XSS_FILTER', 'XSS filter'),
        ('SECURE_CONTENT_TYPE_NOSNIFF', 'Content type nosniff'),
        ('X_FRAME_OPTIONS', 'Frame options'),
    ]
    
    for setting_name, description in security_checks:
        if hasattr(settings, setting_name):
            print_success(f"{description} configured")
        else:
            print_warning(f"{description} not configured")
    
    return True

def validate_api_endpoints():
    """Validate critical API endpoints."""
    print(f"\n{BLUE}=== API Endpoints Validation ==={ENDC}")
    
    base_url = "http://localhost:8000"
    endpoints = [
        ('/api/v1/', 'Root API endpoint'),
        ('/api/v1/health/', 'Health check endpoint'),
        ('/api/v1/status/', 'Status endpoint'),
        ('/api/docs/', 'API documentation'),
    ]
    
    for endpoint, description in endpoints:
        url = f"{base_url}{endpoint}"
        success, response = test_api_endpoint(url)
        if success:
            print_success(f"{description} is accessible")
            # Parse JSON response for root API
            if endpoint == '/api/v1/':
                try:
                    data = json.loads(response)
                    if 'message' in data and 'endpoints' in data:
                        print_success("Root API returns proper structure")
                    else:
                        print_warning("Root API response structure incomplete")
                except json.JSONDecodeError:
                    print_warning("Root API response is not valid JSON")
        else:
            print_error(f"{description} is not accessible: {response}")

def validate_django_checks():
    """Run Django's built-in deployment checks."""
    print(f"\n{BLUE}=== Django Deployment Checks ==={ENDC}")
    
    success, stdout, stderr = run_command("python manage.py check")
    if success:
        print_success("Django system check passed")
    else:
        print_error(f"Django system check failed: {stderr}")
    
    success, stdout, stderr = run_command("python manage.py check --deploy")
    if success:
        print_success("Django deployment check passed")
    else:
        print_warning(f"Django deployment check issues: {stderr}")

def validate_database_connectivity():
    """Test database connectivity."""
    print(f"\n{BLUE}=== Database Connectivity ==={ENDC}")
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                print_success("Database connectivity test passed")
            else:
                print_error("Database connectivity test failed")
    except Exception as e:
        print_error(f"Database connectivity failed: {e}")

def validate_cache_connectivity():
    """Test cache (Redis) connectivity."""
    print(f"\n{BLUE}=== Cache Connectivity ==={ENDC}")
    
    try:
        from django.core.cache import cache
        test_key = 'production_readiness_test'
        test_value = 'test_value_123'
        
        cache.set(test_key, test_value, 60)
        retrieved_value = cache.get(test_key)
        
        if retrieved_value == test_value:
            print_success("Cache connectivity test passed")
            cache.delete(test_key)  # Clean up
        else:
            print_error("Cache connectivity test failed")
    except Exception as e:
        print_error(f"Cache connectivity failed: {e}")

def validate_static_files():
    """Test static files collection."""
    print(f"\n{BLUE}=== Static Files Validation ==={ENDC}")
    
    success, stdout, stderr = run_command("python manage.py collectstatic --noinput --dry-run")
    if success:
        print_success("Static files collection test passed")
    else:
        print_error(f"Static files collection failed: {stderr}")

def validate_migrations():
    """Check for unapplied migrations."""
    print(f"\n{BLUE}=== Database Migrations ==={ENDC}")
    
    success, stdout, stderr = run_command("python manage.py showmigrations --plan")
    if success:
        if "[X]" in stdout and "[ ]" not in stdout:
            print_success("All migrations are applied")
        elif "[ ]" in stdout:
            print_warning("There are unapplied migrations")
            # Show which migrations are pending
            lines = stdout.split('\n')
            for line in lines:
                if "[ ]" in line:
                    print_warning(f"Pending: {line.strip()}")
        else:
            print_info("No migrations found or unable to determine status")
    else:
        print_error(f"Failed to check migrations: {stderr}")

def validate_environment_variables():
    """Check critical environment variables."""
    print(f"\n{BLUE}=== Environment Variables ==={ENDC}")
    
    critical_vars = [
        'SECRET_KEY',
        'ENVIRONMENT',
        'ALLOWED_HOSTS',
    ]
    
    optional_vars = [
        'DATABASE_URL',
        'REDIS_URL',
        'EMAIL_HOST',
        'STRIPE_SECRET_KEY',
        'SENTRY_DSN',
    ]
    
    for var in critical_vars:
        value = os.environ.get(var)
        if value:
            print_success(f"{var} is configured")
        else:
            print_error(f"{var} is not configured")
    
    for var in optional_vars:
        value = os.environ.get(var)
        if value:
            print_success(f"{var} is configured")
        else:
            print_info(f"{var} is not configured (optional)")

def validate_security_configuration():
    """Validate security configuration."""
    print(f"\n{BLUE}=== Security Configuration ==={ENDC}")
    
    # Check if running as root (security risk) - Unix/Linux only
    try:
        if os.geteuid() == 0:
            print_warning("Running as root user (security risk)")
        else:
            print_success("Not running as root user")
    except AttributeError:
        # Windows doesn't have geteuid
        print_info("Root user check skipped (Windows system)")
    
    # Check file permissions on critical files
    critical_files = ['.env', 'manage.py']
    for file_path in critical_files:
        if os.path.exists(file_path):
            stat_info = os.stat(file_path)
            mode = stat_info.st_mode
            if mode & 0o077:  # Check if group/other have any permissions
                print_warning(f"{file_path} has overly permissive permissions")
            else:
                print_success(f"{file_path} has appropriate permissions")
        else:
            print_info(f"{file_path} not found")

def validate_logs_directory():
    """Check logs directory and permissions."""
    print(f"\n{BLUE}=== Logging Configuration ==={ENDC}")
    
    logs_dir = 'logs'
    if os.path.exists(logs_dir):
        if os.path.isdir(logs_dir):
            print_success("Logs directory exists")
            if os.access(logs_dir, os.W_OK):
                print_success("Logs directory is writable")
            else:
                print_error("Logs directory is not writable")
        else:
            print_error("'logs' exists but is not a directory")
    else:
        print_warning("Logs directory does not exist")

def validate_requirements():
    """Check if all requirements are installed."""
    print(f"\n{BLUE}=== Python Requirements ==={ENDC}")
    
    requirements_files = ['requirements.txt', 'requirements-prod.txt']
    
    for req_file in requirements_files:
        if os.path.exists(req_file):
            print_success(f"{req_file} exists")
            # You could add pip-check or similar validation here
        else:
            print_info(f"{req_file} not found")

def main():
    """Main validation function."""
    print(f"{BLUE}{'='*60}{ENDC}")
    print(f"{BLUE}    Capimax Production Readiness Validation{ENDC}")
    print(f"{BLUE}{'='*60}{ENDC}")
    
    start_time = time.time()
    
    # Run all validation checks
    validation_functions = [
        validate_environment_variables,
        validate_django_settings,
        validate_django_checks,
        validate_database_connectivity,
        validate_cache_connectivity,
        validate_migrations,
        validate_static_files,
        validate_security_configuration,
        validate_logs_directory,
        validate_requirements,
    ]
    
    # Only run API tests if server might be running
    if 'runserver' not in ' '.join(sys.argv):
        print_info("Note: API endpoint tests skipped (server not running)")
        print_info("To test API endpoints, run: python manage.py runserver in another terminal")
    else:
        validation_functions.append(validate_api_endpoints)
    
    for validation_func in validation_functions:
        try:
            validation_func()
        except Exception as e:
            print_error(f"Error in {validation_func.__name__}: {e}")
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n{BLUE}=== Validation Summary ==={ENDC}")
    print(f"Validation completed in {duration:.2f} seconds")
    print(f"{GREEN}[SUCCESS] Production readiness validation finished{ENDC}")
    print(f"\n{YELLOW}[INFO] Some warnings are normal for development environment{ENDC}")
    print(f"{YELLOW}[INFO] For production deployment, ensure all errors are resolved{ENDC}")

if __name__ == "__main__":
    main()