#!/usr/bin/env python3
"""
Test script to verify authentication features with gmail.com domain restriction.
Tests registration, login, and forgot password functionality.
"""

import requests
import json
from datetime import datetime


class AuthTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """Log test result."""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} {test_name}"
        if message:
            result += f" - {message}"
        print(result)
        self.test_results.append((test_name, success, message))
        
    def test_registration_gmail_allowed(self):
        """Test that gmail.com emails are allowed for registration."""
        test_data = {
            "first_name": "John",
            "last_name": "Doe", 
            "email": "john.doe@gmail.com",
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=test_data)
            if response.status_code in [200, 201]:
                self.log_test("Registration with gmail.com", True, "Successfully registered")
                return True
            elif response.status_code == 400:
                error_msg = response.json().get("detail", "")
                if "already exists" in error_msg.lower():
                    self.log_test("Registration with gmail.com", True, "User already exists (expected)")
                    return True
                else:
                    self.log_test("Registration with gmail.com", False, f"Unexpected error: {error_msg}")
                    return False
            else:
                self.log_test("Registration with gmail.com", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Registration with gmail.com", False, f"Exception: {str(e)}")
            return False
    
    def test_registration_non_gmail_blocked(self):
        """Test that non-gmail emails are blocked."""
        test_cases = [
            {"email": "user@yahoo.com", "name": "yahoo.com"},
            {"email": "user@outlook.com", "name": "outlook.com"},
            {"email": "user@google-gmail.com", "name": "google-gmail.com (should now be blocked)"},
            {"email": "user@company.com", "name": "company.com"}
        ]
        
        all_passed = True
        for case in test_cases:
            test_data = {
                "first_name": "Test",
                "last_name": "User",
                "email": case["email"],
                "password": "TestPass123!"
            }
            
            try:
                response = requests.post(f"{self.base_url}/auth/register", json=test_data)
                if response.status_code == 400:
                    error_msg = response.json().get("detail", "")
                    if "domain" in error_msg.lower() or "gmail.com" in error_msg:
                        self.log_test(f"Block {case['name']}", True, "Correctly blocked non-gmail domain")
                    else:
                        self.log_test(f"Block {case['name']}", False, f"Wrong error message: {error_msg}")
                        all_passed = False
                else:
                    self.log_test(f"Block {case['name']}", False, f"Should have been blocked but got status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Block {case['name']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
    
    def test_login_gmail_allowed(self):
        """Test login with gmail.com email."""
        # First ensure the user exists
        self.test_registration_gmail_allowed()
        
        login_data = {
            "email": "john.doe@gmail.com",
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                response_data = response.json()
                if "access_token" in response_data:
                    self.log_test("Login with gmail.com", True, "Successfully logged in")
                    return True
                else:
                    self.log_test("Login with gmail.com", False, "No access token in response")
                    return False
            else:
                error_msg = response.json().get("detail", response.text)
                self.log_test("Login with gmail.com", False, f"Status: {response.status_code}, Error: {error_msg}")
                return False
        except Exception as e:
            self.log_test("Login with gmail.com", False, f"Exception: {str(e)}")
            return False
    
    def test_login_non_gmail_blocked(self):
        """Test that login with non-gmail emails is blocked."""
        test_cases = [
            {"email": "user@yahoo.com", "name": "yahoo.com"},
            {"email": "user@google-gmail.com", "name": "google-gmail.com"}
        ]
        
        all_passed = True
        for case in test_cases:
            login_data = {
                "email": case["email"],
                "password": "TestPass123!"
            }
            
            try:
                response = requests.post(f"{self.base_url}/auth/login", json=login_data)
                if response.status_code == 400:
                    error_msg = response.json().get("detail", "")
                    if "domain" in error_msg.lower() or "gmail.com" in error_msg:
                        self.log_test(f"Block login {case['name']}", True, "Correctly blocked non-gmail domain")
                    else:
                        self.log_test(f"Block login {case['name']}", False, f"Wrong error message: {error_msg}")
                        all_passed = False
                else:
                    self.log_test(f"Block login {case['name']}", False, f"Should have been blocked but got status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Block login {case['name']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
    
    def test_forgot_password_gmail_allowed(self):
        """Test forgot password with gmail.com email."""
        # Ensure user exists
        self.test_registration_gmail_allowed()
        
        forgot_data = {
            "email": "john.doe@gmail.com"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/forgot-password", json=forgot_data)
            if response.status_code == 200:
                self.log_test("Forgot password with gmail.com", True, "Reset email request processed")
                return True
            else:
                error_msg = response.json().get("detail", response.text)
                self.log_test("Forgot password with gmail.com", False, f"Status: {response.status_code}, Error: {error_msg}")
                return False
        except Exception as e:
            self.log_test("Forgot password with gmail.com", False, f"Exception: {str(e)}")
            return False
    
    def test_forgot_password_non_gmail_blocked(self):
        """Test that forgot password with non-gmail emails is blocked."""
        test_cases = [
            {"email": "user@yahoo.com", "name": "yahoo.com"},
            {"email": "user@google-gmail.com", "name": "google-gmail.com"}
        ]
        
        all_passed = True
        for case in test_cases:
            forgot_data = {
                "email": case["email"]
            }
            
            try:
                response = requests.post(f"{self.base_url}/auth/forgot-password", json=forgot_data)
                if response.status_code == 400:
                    error_msg = response.json().get("detail", "")
                    if "domain" in error_msg.lower() or "gmail.com" in error_msg:
                        self.log_test(f"Block forgot password {case['name']}", True, "Correctly blocked non-gmail domain")
                    else:
                        self.log_test(f"Block forgot password {case['name']}", False, f"Wrong error message: {error_msg}")
                        all_passed = False
                else:
                    self.log_test(f"Block forgot password {case['name']}", False, f"Should have been blocked but got status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Block forgot password {case['name']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
    
    def test_required_fields(self):
        """Test that all required fields are enforced."""
        test_cases = [
            {"data": {"email": "test@gmail.com", "password": "TestPass123!"}, "missing": "first_name"},
            {"data": {"first_name": "Test", "password": "TestPass123!"}, "missing": "email"},
            {"data": {"first_name": "Test", "email": "test@gmail.com"}, "missing": "password"},
            {"data": {"first_name": "Test", "last_name": "User", "email": "test@gmail.com", "password": ""}, "missing": "empty password"},
        ]
        
        all_passed = True
        for case in test_cases:
            try:
                response = requests.post(f"{self.base_url}/auth/register", json=case["data"])
                if response.status_code == 400:
                    error_msg = response.json().get("detail", "")
                    if "required" in error_msg.lower():
                        self.log_test(f"Required field check - {case['missing']}", True, "Correctly enforced required field")
                    else:
                        self.log_test(f"Required field check - {case['missing']}", False, f"Wrong error: {error_msg}")
                        all_passed = False
                else:
                    self.log_test(f"Required field check - {case['missing']}", False, f"Should have failed but got status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Required field check - {case['missing']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
    
    def run_all_tests(self):
        """Run all authentication tests."""
        print("🚀 Starting Authentication Tests")
        print("=" * 50)
        
        # Test server availability
        try:
            response = requests.get(f"{self.base_url}/docs")
            if response.status_code == 200:
                self.log_test("Server connectivity", True, "Backend server is running")
            else:
                self.log_test("Server connectivity", False, f"Server returned status: {response.status_code}")
                return
        except Exception as e:
            self.log_test("Server connectivity", False, f"Cannot connect to server: {str(e)}")
            return
        
        # Run all tests
        print("\n📝 Testing Gmail Domain Restriction...")
        self.test_registration_gmail_allowed()
        self.test_registration_non_gmail_blocked()
        self.test_login_gmail_allowed()
        self.test_login_non_gmail_blocked()
        self.test_forgot_password_gmail_allowed()
        self.test_forgot_password_non_gmail_blocked()
        
        print("\n📋 Testing Required Fields...")
        self.test_required_fields()
        
        # Summary
        print("\n" + "=" * 50)
        total_tests = len(self.test_results)
        passed_tests = sum(1 for _, success, _ in self.test_results if success)
        
        print(f"📊 Test Results: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed! Gmail.com domain restriction is working correctly.")
        else:
            print("❌ Some tests failed. Please check the results above.")
            print("\nFailed tests:")
            for test_name, success, message in self.test_results:
                if not success:
                    print(f"  • {test_name}: {message}")


if __name__ == "__main__":
    print("Testing DocSpotlight Authentication with Gmail.com Domain Restriction")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = AuthTester()
    tester.run_all_tests()
