#!/usr/bin/env python3
"""
Test script for new authentication features in DocSpotlight.
Tests:
1. Strong authentication rules (email domain restriction, required fields)
2. Forgot password functionality with Resend email service
"""

import requests
import json
import time
import sys

# API base URL
BASE_URL = "http://localhost:8000"

def test_strong_authentication_rules():
    """Test the strong authentication rules implementation."""
    print("=" * 60)
    print("TESTING STRONG AUTHENTICATION RULES")
    print("=" * 60)
    
    # Test 1: Registration with non-google-gmail.com email should fail
    print("\n1. Testing email domain restriction on registration...")
    registration_data = {
        "email": "test@example.com",  # Wrong domain
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
    if response.status_code == 400 and "google-gmail.com" in response.text:
        print("✅ PASS: Registration correctly rejected non-google-gmail.com email")
    else:
        print(f"❌ FAIL: Expected 400 error for invalid domain, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 2: Registration with missing first name should fail
    print("\n2. Testing required first name field...")
    registration_data = {
        "email": "test@google-gmail.com",
        "password": "TestPassword123!",
        "last_name": "User"
        # Missing first_name
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
    if response.status_code == 422:  # Pydantic validation error
        print("✅ PASS: Registration correctly rejected missing first name")
    else:
        print(f"❌ FAIL: Expected 422 error for missing first name, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 3: Registration with missing last name should fail
    print("\n3. Testing required last name field...")
    registration_data = {
        "email": "test@google-gmail.com",
        "password": "TestPassword123!",
        "first_name": "Test"
        # Missing last_name
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
    if response.status_code == 422:  # Pydantic validation error
        print("✅ PASS: Registration correctly rejected missing last name")
    else:
        print(f"❌ FAIL: Expected 422 error for missing last name, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 4: Successful registration with valid google-gmail.com email
    print("\n4. Testing successful registration with valid email domain...")
    test_email = "testuser123@google-gmail.com"
    registration_data = {
        "email": test_email,
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
    if response.status_code == 201:
        print("✅ PASS: Registration successful with valid google-gmail.com email")
        user_data = response.json()
        print(f"   User ID: {user_data['user_id']}")
        print(f"   Email: {user_data['email']}")
    else:
        print(f"❌ FAIL: Expected 201 for valid registration, got {response.status_code}")
        print(f"Response: {response.text}")
        return None
    
    # Test 5: Login with non-google-gmail.com email should fail
    print("\n5. Testing email domain restriction on login...")
    login_data = {
        "email": "test@example.com",
        "password": "TestPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 400 and "google-gmail.com" in response.text:
        print("✅ PASS: Login correctly rejected non-google-gmail.com email")
    else:
        print(f"❌ FAIL: Expected 400 error for invalid domain, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 6: Login with empty email should fail
    print("\n6. Testing required email field on login...")
    login_data = {
        "email": "",
        "password": "TestPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code in [400, 422]:
        print("✅ PASS: Login correctly rejected empty email")
    else:
        print(f"❌ FAIL: Expected 400/422 error for empty email, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 7: Login with empty password should fail
    print("\n7. Testing required password field on login...")
    login_data = {
        "email": test_email,
        "password": ""
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code in [400, 422]:
        print("✅ PASS: Login correctly rejected empty password")
    else:
        print(f"❌ FAIL: Expected 400/422 error for empty password, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 8: Successful login with valid credentials
    print("\n8. Testing successful login with valid credentials...")
    login_data = {
        "email": test_email,
        "password": "TestPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        print("✅ PASS: Login successful with valid credentials")
        token_data = response.json()
        print(f"   Access token received: {token_data['access_token'][:50]}...")
        return token_data['access_token']
    else:
        print(f"❌ FAIL: Expected 200 for valid login, got {response.status_code}")
        print(f"Response: {response.text}")
        return None

def test_forgot_password_functionality():
    """Test the forgot password functionality with email sending."""
    print("\n" + "=" * 60)
    print("TESTING FORGOT PASSWORD FUNCTIONALITY")
    print("=" * 60)
    
    # Test 1: Forgot password with non-google-gmail.com email should fail
    print("\n1. Testing email domain restriction on forgot password...")
    forgot_data = {
        "email": "test@example.com"
    }
    
    response = requests.post(f"{BASE_URL}/auth/forgot-password", json=forgot_data)
    if response.status_code == 400 and "google-gmail.com" in response.text:
        print("✅ PASS: Forgot password correctly rejected non-google-gmail.com email")
    else:
        print(f"❌ FAIL: Expected 400 error for invalid domain, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 2: Forgot password with valid email (even if user doesn't exist)
    print("\n2. Testing forgot password with non-existent valid email...")
    forgot_data = {
        "email": "nonexistent@google-gmail.com"
    }
    
    response = requests.post(f"{BASE_URL}/auth/forgot-password", json=forgot_data)
    if response.status_code == 200:
        print("✅ PASS: Forgot password doesn't reveal if email exists (security)")
        response_data = response.json()
        print(f"   Message: {response_data['message']}")
    else:
        print(f"❌ FAIL: Expected 200 for security, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 3: Forgot password with existing user email
    print("\n3. Testing forgot password with existing user email...")
    # First create a user
    test_email = "forgottest@google-gmail.com"
    registration_data = {
        "email": test_email,
        "password": "TestPassword123!",
        "first_name": "Forgot",
        "last_name": "Test"
    }
    
    # Register user first (ignore if already exists)
    requests.post(f"{BASE_URL}/auth/register", json=registration_data)
    
    # Now test forgot password
    forgot_data = {
        "email": test_email
    }
    
    response = requests.post(f"{BASE_URL}/auth/forgot-password", json=forgot_data)
    if response.status_code == 200:
        print("✅ PASS: Forgot password API call successful")
        response_data = response.json()
        print(f"   Message: {response_data['message']}")
        print("   NOTE: Check backend logs for Resend email sending status")
    else:
        print(f"❌ FAIL: Expected 200 for forgot password, got {response.status_code}")
        print(f"Response: {response.text}")
    
    # Test 4: Reset password with invalid token
    print("\n4. Testing reset password with invalid token...")
    reset_data = {
        "token": "invalid_token_12345",
        "new_password": "NewPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/reset-password", json=reset_data)
    if response.status_code == 400:
        print("✅ PASS: Reset password correctly rejected invalid token")
    else:
        print(f"❌ FAIL: Expected 400 error for invalid token, got {response.status_code}")
        print(f"Response: {response.text}")

def test_comprehensive_authentication_flow():
    """Test the complete authentication flow."""
    print("\n" + "=" * 60)
    print("TESTING COMPREHENSIVE AUTHENTICATION FLOW")
    print("=" * 60)
    
    # Create a unique test user
    timestamp = int(time.time())
    test_email = f"flowtest{timestamp}@google-gmail.com"
    
    print(f"\n1. Testing complete flow with email: {test_email}")
    
    # Step 1: Register
    registration_data = {
        "email": test_email,
        "password": "FlowTest123!",
        "first_name": "Flow",
        "last_name": "Test"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
    if response.status_code == 201:
        print("✅ Registration successful")
    else:
        print(f"❌ Registration failed: {response.status_code}")
        return
    
    # Step 2: Login
    login_data = {
        "email": test_email,
        "password": "FlowTest123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        print("✅ Login successful")
        token_data = response.json()
        access_token = token_data['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        return
    
    # Step 3: Access protected endpoint
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        print("✅ Protected endpoint access successful")
        user_data = response.json()
        print(f"   User: {user_data['first_name']} {user_data['last_name']} ({user_data['email']})")
    else:
        print(f"❌ Protected endpoint access failed: {response.status_code}")
    
    # Step 4: Test forgot password flow
    forgot_data = {"email": test_email}
    response = requests.post(f"{BASE_URL}/auth/forgot-password", json=forgot_data)
    if response.status_code == 200:
        print("✅ Forgot password request successful")
    else:
        print(f"❌ Forgot password request failed: {response.status_code}")

def main():
    """Run all authentication tests."""
    print("🚀 DOCSPOTLIGHT NEW AUTHENTICATION FEATURES TEST SUITE")
    print("Testing strong authentication rules and forgot password functionality")
    
    try:
        # Test strong authentication rules
        access_token = test_strong_authentication_rules()
        
        # Test forgot password functionality
        test_forgot_password_functionality()
        
        # Test comprehensive flow
        test_comprehensive_authentication_flow()
        
        print("\n" + "=" * 60)
        print("✅ ALL AUTHENTICATION TESTS COMPLETED")
        print("=" * 60)
        print("📧 NOTE: Check backend logs to verify Resend email sending")
        print("🔗 Frontend running on: http://localhost:3001")
        print("🔗 Backend running on: http://localhost:8000")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend server.")
        print("Make sure the backend is running on http://localhost:8000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
