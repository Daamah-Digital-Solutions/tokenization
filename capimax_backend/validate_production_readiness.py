#\!/usr/bin/env python
# Production Readiness Validation Script for Capimax Platform

import os
import sys
from pathlib import Path

class ProductionValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.passed = 0
        self.total = 0
        
    def check_env_vars(self):
        print('\n=== Environment Variables ===')
        required = ['SECRET_KEY', 'DATABASE_URL', 'REDIS_URL', 'EMAIL_HOST']
        for var in required:
            self.total += 1
            if os.environ.get(var):
                print(f'✓ {var} configured')
                self.passed += 1
            else:
                print(f'✗ {var} MISSING')
                self.errors.append(f'Missing {var}')
                
    def generate_report(self):
        score = int((self.passed / self.total) * 100) if self.total > 0 else 0
        print(f'\n=== Production Readiness Report ===')
        print(f'Score: {score}% ({self.passed}/{self.total} checks passed)')
        print(f'Errors: {len(self.errors)}')
        print(f'Warnings: {len(self.warnings)}')
        
        if self.errors:
            print('\nERRORS:')
            for e in self.errors:
                print(f'  - {e}')
                
        if self.warnings:
            print('\nWARNINGS:')
            for w in self.warnings:
                print(f'  - {w}')
                
        return len(self.errors) == 0
        
    def run(self):
        print('Production Readiness Validation')
        self.check_env_vars()
        return self.generate_report()

if __name__ == '__main__':
    validator = ProductionValidator()
    success = validator.run()
    sys.exit(0 if success else 1)
