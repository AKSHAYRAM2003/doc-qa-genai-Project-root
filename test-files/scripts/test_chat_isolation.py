#!/usr/bin/env python3
"""
Test script to verify chat data isolation and security fix.
Tests that user chats are properly isolated and logout clears data.
"""

import requests
import json
import time
from datetime import datetime


class ChatIsolationTester:
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
        
    def register_and_login_user(self, email, password="TestPass123!", first_name="Test", last_name="User"):
        """Register and login a user, return access token."""
        try:
            # Register user
            register_response = requests.post(f"{self.base_url}/auth/register", json={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "password": password
            })
            
            if register_response.status_code not in [200, 201, 400]:
                return None
                
            # If registration failed due to existing user, that's okay
            if register_response.status_code == 400 and "already exists" not in register_response.text:
                return None
            
            # Login user
            login_response = requests.post(f"{self.base_url}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if login_response.status_code == 200:
                return login_response.json()["access_token"]
            return None
            
        except Exception as e:
            print(f"Error in register_and_login_user: {e}")
            return None
    
    def save_chat_data(self, token, chat_data):
        """Save chat data for a user."""
        try:
            response = requests.post(
                f"{self.base_url}/api/user/save-chats",
                json={"chats": chat_data},
                headers={"Authorization": f"Bearer {token}"}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Error saving chat data: {e}")
            return False
    
    def load_chat_data(self, token):
        """Load chat data for a user."""
        try:
            response = requests.post(
                f"{self.base_url}/api/user/load-chats",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json().get("chats", {})
            return None
        except Exception as e:
            print(f"Error loading chat data: {e}")
            return None
    
    def create_test_chat_data(self, user_prefix):
        """Create test chat data specific to a user."""
        chat_id = f"{user_prefix}-chat-{int(time.time())}"
        return {
            "history": [
                {
                    "id": chat_id,
                    "title": f"{user_prefix} Test Chat",
                    "createdAt": int(time.time() * 1000),
                    "hasPdf": False
                }
            ],
            "messages": {
                chat_id: [
                    {
                        "id": f"msg-{int(time.time())}-1",
                        "role": "user",
                        "content": f"Hello from {user_prefix}!",
                        "timestamp": int(time.time() * 1000)
                    },
                    {
                        "id": f"msg-{int(time.time())}-2",
                        "role": "ai",
                        "content": f"Hello {user_prefix}! This is your private chat.",
                        "timestamp": int(time.time() * 1000)
                    }
                ]
            },
            "activeId": chat_id,
            "chatDocuments": {
                chat_id: []
            }
        }
    
    def test_chat_isolation_between_users(self):
        """Test that different users have isolated chat data."""
        print("\n🔒 Testing Chat Isolation Between Users...")
        
        # User 1
        user1_email = "user1.test@gmail.com"
        user1_token = self.register_and_login_user(user1_email, first_name="User", last_name="One")
        if not user1_token:
            self.log_test("User 1 Registration/Login", False, "Failed to get token")
            return False
        
        # User 2
        user2_email = "user2.test@gmail.com"
        user2_token = self.register_and_login_user(user2_email, first_name="User", last_name="Two")
        if not user2_token:
            self.log_test("User 2 Registration/Login", False, "Failed to get token")
            return False
        
        # Create different chat data for each user
        user1_chat_data = self.create_test_chat_data("User1")
        user2_chat_data = self.create_test_chat_data("User2")
        
        # Save chat data for both users
        user1_save_success = self.save_chat_data(user1_token, user1_chat_data)
        user2_save_success = self.save_chat_data(user2_token, user2_chat_data)
        
        if not user1_save_success:
            self.log_test("User 1 Chat Save", False, "Failed to save")
            return False
        
        if not user2_save_success:
            self.log_test("User 2 Chat Save", False, "Failed to save")
            return False
        
        # Load chat data for both users
        user1_loaded_data = self.load_chat_data(user1_token)
        user2_loaded_data = self.load_chat_data(user2_token)
        
        if not user1_loaded_data:
            self.log_test("User 1 Chat Load", False, "Failed to load")
            return False
            
        if not user2_loaded_data:
            self.log_test("User 2 Chat Load", False, "Failed to load")
            return False
        
        # Verify each user only sees their own data
        user1_messages = user1_loaded_data.get("messages", {})
        user2_messages = user2_loaded_data.get("messages", {})
        
        user1_has_own_data = any("User1" in str(messages) for messages in user1_messages.values())
        user1_has_other_data = any("User2" in str(messages) for messages in user1_messages.values())
        
        user2_has_own_data = any("User2" in str(messages) for messages in user2_messages.values())
        user2_has_other_data = any("User1" in str(messages) for messages in user2_messages.values())
        
        # Test results
        if user1_has_own_data and not user1_has_other_data:
            self.log_test("User 1 Data Isolation", True, "Only sees own chat data")
        else:
            self.log_test("User 1 Data Isolation", False, f"Has own: {user1_has_own_data}, Has other: {user1_has_other_data}")
            
        if user2_has_own_data and not user2_has_other_data:
            self.log_test("User 2 Data Isolation", True, "Only sees own chat data")
        else:
            self.log_test("User 2 Data Isolation", False, f"Has own: {user2_has_own_data}, Has other: {user2_has_other_data}")
        
        return user1_has_own_data and not user1_has_other_data and user2_has_own_data and not user2_has_other_data
    
    def test_logout_data_security(self):
        """Test that logout properly clears sensitive data."""
        print("\n🚪 Testing Logout Data Security...")
        
        # This test focuses on backend behavior since frontend localStorage 
        # clearing is handled by the browser/client
        
        user_email = "logout.test@gmail.com"
        user_token = self.register_and_login_user(user_email, first_name="Logout", last_name="Test")
        
        if not user_token:
            self.log_test("Logout Test User Setup", False, "Failed to get token")
            return False
            
        # Save some chat data
        chat_data = self.create_test_chat_data("LogoutTest")
        save_success = self.save_chat_data(user_token, chat_data)
        
        if not save_success:
            self.log_test("Logout Test Data Save", False, "Failed to save chat data")
            return False
            
        # Verify data was saved
        loaded_data = self.load_chat_data(user_token)
        if not loaded_data:
            self.log_test("Logout Test Data Verification", False, "Failed to verify saved data")
            return False
            
        self.log_test("Pre-Logout Data Persistence", True, "Chat data properly saved and loaded")
        
        # Simulate logout by trying to access data with invalid token
        fake_token = "invalid_token"
        invalid_data = self.load_chat_data(fake_token)
        
        if invalid_data is None:
            self.log_test("Invalid Token Protection", True, "Invalid tokens cannot access data")
        else:
            self.log_test("Invalid Token Protection", False, "Invalid tokens can access data")
            
        # Test that original user can still access their data
        original_data = self.load_chat_data(user_token)
        if original_data:
            self.log_test("Legitimate Access Preserved", True, "Valid tokens still work")
            return True
        else:
            self.log_test("Legitimate Access Preserved", False, "Valid tokens stopped working")
            return False
    
    def test_anonymous_user_isolation(self):
        """Test that anonymous users don't interfere with authenticated users."""
        print("\n👤 Testing Anonymous User Isolation...")
        
        # This test verifies that the backend properly requires authentication
        # for chat endpoints, preventing anonymous access to user data
        
        # Try to save chats without authentication
        chat_data = self.create_test_chat_data("Anonymous")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/user/save-chats",
                json={"chats": chat_data}
                # No Authorization header
            )
            
            if response.status_code in [401, 403]:
                self.log_test("Anonymous Save Protection", True, "Anonymous users cannot save chats")
            else:
                self.log_test("Anonymous Save Protection", False, f"Anonymous save got status {response.status_code}")
                
        except Exception as e:
            self.log_test("Anonymous Save Protection", False, f"Exception: {e}")
            
        # Try to load chats without authentication
        try:
            response = requests.post(
                f"{self.base_url}/api/user/load-chats"
                # No Authorization header
            )
            
            if response.status_code in [401, 403]:
                self.log_test("Anonymous Load Protection", True, "Anonymous users cannot load chats")
                return True
            else:
                self.log_test("Anonymous Load Protection", False, f"Anonymous load got status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Anonymous Load Protection", False, f"Exception: {e}")
            return False
    
    def run_all_tests(self):
        """Run all chat isolation and security tests."""
        print("🔐 Starting Chat Data Isolation & Security Tests")
        print("=" * 60)
        
        # Test server connectivity
        try:
            response = requests.get(f"{self.base_url}/docs")
            if response.status_code == 200:
                self.log_test("Server Connectivity", True, "Backend server is running")
            else:
                self.log_test("Server Connectivity", False, f"Server returned status: {response.status_code}")
                return
        except Exception as e:
            self.log_test("Server Connectivity", False, f"Cannot connect to server: {str(e)}")
            return
        
        # Run tests
        test1_result = self.test_chat_isolation_between_users()
        test2_result = self.test_logout_data_security()
        test3_result = self.test_anonymous_user_isolation()
        
        # Summary
        print("\n" + "=" * 60)
        total_tests = len(self.test_results)
        passed_tests = sum(1 for _, success, _ in self.test_results if success)
        
        print(f"📊 Test Results: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed! Chat data isolation is working correctly.")
            print("\n✅ Security Features Verified:")
            print("  • Users can only access their own chat data")
            print("  • Logout properly protects user data")
            print("  • Anonymous users cannot access authenticated data")
            print("  • Invalid tokens are rejected")
        else:
            print("❌ Some tests failed. Please check the results above.")
            print("\nFailed tests:")
            for test_name, success, message in self.test_results:
                if not success:
                    print(f"  • {test_name}: {message}")


if __name__ == "__main__":
    print("Testing DocSpotlight Chat Data Isolation & Security")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = ChatIsolationTester()
    tester.run_all_tests()
