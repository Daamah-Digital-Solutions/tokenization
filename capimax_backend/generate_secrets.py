"""
Production Secrets Generator
Generates secure random secrets for production deployment
"""

import secrets
import string

def generate_django_secret_key(length=64):
    """Generate a secure Django SECRET_KEY"""
    chars = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
    return ''.join(secrets.choice(chars) for _ in range(length))

def generate_password(length=32):
    """Generate a secure random password"""
    chars = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(secrets.choice(chars) for _ in range(length))

def generate_jwt_secret(length=64):
    """Generate a secure JWT signing key"""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

def generate_hex_secret(length=32):
    """Generate a hex secret"""
    return secrets.token_hex(length)

if __name__ == '__main__':
    print("=" * 80)
    print("PRODUCTION SECRETS GENERATOR")
    print("=" * 80)
    print("\nIMPORTANT: Store these secrets securely!")
    print("   - Use a password manager (1Password, LastPass, etc.)")
    print("   - Use AWS Secrets Manager or similar in production")
    print("   - NEVER commit these to version control")
    print("\n" + "=" * 80)

    print("\n1. DJANGO SECRET_KEY (64 characters)")
    print("-" * 80)
    django_secret = generate_django_secret_key()
    print(f"SECRET_KEY={django_secret}")

    print("\n2. DATABASE PASSWORD (32 characters)")
    print("-" * 80)
    db_password = generate_password()
    print(f"DB_PASSWORD={db_password}")

    print("\n3. REDIS PASSWORD (32 characters)")
    print("-" * 80)
    redis_password = generate_password()
    print(f"REDIS_PASSWORD={redis_password}")

    print("\n4. JWT SIGNING SECRET (64 characters)")
    print("-" * 80)
    jwt_secret = generate_jwt_secret()
    print(f"JWT_SIGNING_KEY={jwt_secret}")

    print("\n5. CELERY SECRET KEY (32 bytes hex)")
    print("-" * 80)
    celery_secret = generate_hex_secret(32)
    print(f"CELERY_SECRET_KEY={celery_secret}")

    print("\n6. DJANGO SIGNING SALT (32 characters)")
    print("-" * 80)
    signing_salt = generate_password()
    print(f"SIGNING_SALT={signing_salt}")

    print("\n" + "=" * 80)
    print("SECRETS GENERATED SUCCESSFULLY")
    print("=" * 80)
    print("\nNext Steps:")
    print("1. Copy these secrets to a secure password manager")
    print("2. Add them to your production .env file")
    print("3. Configure your deployment platform (AWS, Heroku, etc.) with these values")
    print("4. Delete this output from your terminal history")
    print("=" * 80)
