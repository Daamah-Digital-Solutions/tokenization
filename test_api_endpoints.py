#!/usr/bin/env python
"""
Comprehensive API Testing Script for Capimax Platform
Tests all major endpoints before production deployment
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name, success, details=""):
    symbol = f"{Colors.GREEN}✓{Colors.RESET}" if success else f"{Colors.RED}✗{Colors.RESET}"
    status = f"{Colors.GREEN}PASS{Colors.RESET}" if success else f"{Colors.RED}FAIL{Colors.RESET}"
    print(f"{symbol} {name}: {status}")
    if details:
        print(f"  {Colors.BLUE}→{Colors.RESET} {details}")

def test_health_check():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health/")
        success = response.status_code == 200 and response.json().get('status') == 'healthy'
        print_test("Health Check", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("Health Check", False, str(e))
        return False

def test_api_root():
    """Test API root endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/")
        success = response.status_code == 200
        data = response.json()
        endpoints = len(data.get('endpoints', {}))
        print_test("API Root", success, f"Found {endpoints} endpoint groups")
        return success
    except Exception as e:
        print_test("API Root", False, str(e))
        return False

def test_properties_list():
    """Test properties listing (public)"""
    try:
        response = requests.get(f"{BASE_URL}/properties/")
        success = response.status_code in [200, 401]  # 401 is ok if auth required
        print_test("Properties List", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("Properties List", False, str(e))
        return False

def test_dashboard_endpoints():
    """Test dashboard endpoints"""
    try:
        response = requests.get(f"{BASE_URL}/dashboard/")
        success = response.status_code in [200, 401, 403]  # Auth required is expected
        print_test("Dashboard Endpoints", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("Dashboard Endpoints", False, str(e))
        return False

def test_swagger_docs():
    """Test Swagger documentation"""
    try:
        response = requests.get("http://localhost:8000/api/docs/")
        success = response.status_code == 200
        print_test("Swagger Documentation", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("Swagger Documentation", False, str(e))
        return False

def test_marketplace():
    """Test marketplace endpoints"""
    try:
        response = requests.get(f"{BASE_URL}/marketplace/")
        success = response.status_code in [200, 401, 403]
        print_test("Marketplace", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("Marketplace", False, str(e))
        return False

def test_broker_endpoints():
    """Test broker endpoints"""
    try:
        response = requests.get(f"{BASE_URL}/broker/")
        success = response.status_code in [200, 401, 403]
        print_test("Broker Endpoints", success, f"Status: {response.status_code}")
        return success
    except Exception as e:
        print_test("Broker Endpoints", False, str(e))
        return False

def run_all_tests():
    """Run all API tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Capimax Platform - API Endpoint Testing{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}\n")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    tests = [
        ("Core Infrastructure", [
            test_health_check,
            test_api_root,
            test_swagger_docs,
        ]),
        ("Business Endpoints", [
            test_properties_list,
            test_marketplace,
            test_broker_endpoints,
            test_dashboard_endpoints,
        ]),
    ]
    
    total_tests = 0
    passed_tests = 0
    
    for category, test_functions in tests:
        print(f"\n{Colors.BOLD}{category}:{Colors.RESET}")
        for test_func in test_functions:
            total_tests += 1
            if test_func():
                passed_tests += 1
    
    # Final Report
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Results:{Colors.RESET}")
    print(f"  Total Tests: {total_tests}")
    print(f"  Passed: {Colors.GREEN}{passed_tests}{Colors.RESET}")
    print(f"  Failed: {Colors.RED}{total_tests - passed_tests}{Colors.RESET}")
    
    score = int((passed_tests / total_tests) * 100) if total_tests > 0 else 0
    if score >= 90:
        status = f"{Colors.GREEN}EXCELLENT{Colors.RESET}"
    elif score >= 75:
        status = f"{Colors.YELLOW}GOOD{Colors.RESET}"
    else:
        status = f"{Colors.RED}NEEDS ATTENTION{Colors.RESET}"
    
    print(f"  Success Rate: {score}% - {status}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}\n")
    
    if score >= 75:
        print(f"{Colors.GREEN}✓ Platform is functioning well and ready for further testing!{Colors.RESET}\n")
    else:
        print(f"{Colors.YELLOW}⚠ Some endpoints need attention. Review failed tests.{Colors.RESET}\n")
    
    return score >= 75

if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Testing interrupted by user.{Colors.RESET}\n")
        exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Fatal error during testing: {e}{Colors.RESET}\n")
        exit(1)
