#!/usr/bin/env python3
"""
Comprehensive test script for DocSpotlight application.
Tests all major features including authentication, document upload, and chat functionality.
"""
import requests
import json
import time
import os
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Test data
TEST_USER = {
    "email": "test@docspotlight.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "User"
}

class DocSpotlightTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.user_id = None
        self.uploaded_docs = []
        self.chat_sessions = []
        
    def test_health_check(self):
        """Test if backend is responding"""
        print("🔍 Testing Backend Health...")
        try:
            response = self.session.get(f"{BACKEND_URL}/docs")
            if response.status_code == 200:
                print("✅ Backend is healthy and responding")
                return True
            else:
                print(f"❌ Backend health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Backend connection failed: {e}")
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=TEST_USER
            )
            if response.status_code == 201:
                data = response.json()
                print("✅ User registration successful")
                print(f"   User ID: {data.get('user_id')}")
                self.user_id = data.get('user_id')
                return True
            else:
                print(f"❌ User registration failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ User registration error: {e}")
            return False
    
    def test_user_login(self):
        """Test user login"""
        print("\n🔑 Testing User Login...")
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"]
                }
            )
            if response.status_code == 200:
                data = response.json()
                self.user_token = data.get('access_token')
                print("✅ User login successful")
                print(f"   Token: {self.user_token[:20]}...")
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.user_token}"
                })
                return True
            else:
                print(f"❌ User login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ User login error: {e}")
            return False
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        print("\n👤 Testing User Profile Retrieval...")
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me")
            if response.status_code == 200:
                data = response.json()
                print("✅ User profile retrieved successfully")
                print(f"   Email: {data.get('email')}")
                print(f"   Name: {data.get('first_name')} {data.get('last_name')}")
                return True
            else:
                print(f"❌ User profile retrieval failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ User profile retrieval error: {e}")
            return False
    
    def test_document_upload(self):
        """Test document upload"""
        print("\n📄 Testing Document Upload...")
        try:
            # Use the sample PDF file
            pdf_path = "sample.pdf"
            if not os.path.exists(pdf_path):
                print(f"❌ Sample PDF not found: {pdf_path}")
                return False
            
            with open(pdf_path, "rb") as f:
                files = {"file": ("sample.pdf", f, "application/pdf")}
                response = self.session.post(
                    f"{BACKEND_URL}/upload",
                    files=files
                )
            
            if response.status_code == 200:
                data = response.json()
                doc_id = data.get('doc_id')
                self.uploaded_docs.append(doc_id)
                print("✅ Document upload successful")
                print(f"   Document ID: {doc_id}")
                print(f"   Filename: {data.get('filename')}")
                print(f"   Pages: {data.get('pages_count')}")
                return True
            else:
                print(f"❌ Document upload failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Document upload error: {e}")
            return False
    
    def test_get_documents(self):
        """Test getting user documents"""
        print("\n📋 Testing Document List Retrieval...")
        try:
            response = self.session.get(f"{BACKEND_URL}/documents")
            if response.status_code == 200:
                data = response.json()
                print("✅ Document list retrieved successfully")
                print(f"   Documents count: {len(data.get('documents', []))}")
                for doc in data.get('documents', []):
                    print(f"   - {doc.get('filename')} (ID: {doc.get('doc_id')})")
                return True
            else:
                print(f"❌ Document list retrieval failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Document list retrieval error: {e}")
            return False
    
    def test_chat_functionality(self):
        """Test chat functionality"""
        print("\n💬 Testing Chat Functionality...")
        if not self.uploaded_docs:
            print("❌ No documents uploaded, skipping chat test")
            return False
        
        try:
            doc_id = self.uploaded_docs[0]
            chat_request = {
                "question": "What is this document about?",
                "doc_id": doc_id,
                "session_id": "test_session_1"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/chat",
                json=chat_request
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Chat response received successfully")
                print(f"   Question: {chat_request['question']}")
                print(f"   Answer: {data.get('answer', '')[:100]}...")
                print(f"   Session ID: {data.get('session_id')}")
                self.chat_sessions.append(data.get('session_id'))
                return True
            else:
                print(f"❌ Chat failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Chat error: {e}")
            return False
    
    def test_multiple_questions(self):
        """Test multiple questions in the same session"""
        print("\n❓ Testing Multiple Questions...")
        if not self.uploaded_docs:
            print("❌ No documents uploaded, skipping multiple questions test")
            return False
        
        questions = [
            "Can you summarize the main points?",
            "What are the key topics discussed?",
            "Are there any important dates mentioned?"
        ]
        
        doc_id = self.uploaded_docs[0]
        session_id = "test_session_multi"
        
        for i, question in enumerate(questions, 1):
            try:
                chat_request = {
                    "question": question,
                    "doc_id": doc_id,
                    "session_id": session_id
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/chat",
                    json=chat_request
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Question {i} answered successfully")
                    print(f"   Q: {question}")
                    print(f"   A: {data.get('answer', '')[:80]}...")
                else:
                    print(f"❌ Question {i} failed: {response.status_code}")
                    return False
                    
                time.sleep(1)  # Small delay between requests
                
            except Exception as e:
                print(f"❌ Question {i} error: {e}")
                return False
        
        return True
    
    def test_collection_functionality(self):
        """Test collection functionality with multiple documents"""
        print("\n📚 Testing Collection Functionality...")
        
        # First upload another document
        try:
            pdf_path = "sample2.pdf"
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    files = {"file": ("sample2.pdf", f, "application/pdf")}
                    response = self.session.post(
                        f"{BACKEND_URL}/upload",
                        files=files
                    )
                if response.status_code == 200:
                    data = response.json()
                    self.uploaded_docs.append(data.get('doc_id'))
                    print(f"✅ Second document uploaded: {data.get('doc_id')}")
        except Exception as e:
            print(f"⚠️  Could not upload second document: {e}")
        
        # Test collection creation
        if len(self.uploaded_docs) >= 2:
            try:
                collection_data = {
                    "name": "Test Collection",
                    "doc_ids": self.uploaded_docs[:2]
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/collections/create",
                    json=collection_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    collection_id = data.get('collection_id')
                    print(f"✅ Collection created successfully: {collection_id}")
                    
                    # Test chat with collection
                    chat_request = {
                        "question": "What information can you find across these documents?",
                        "collection_id": collection_id,
                        "session_id": "test_collection_session"
                    }
                    
                    response = self.session.post(
                        f"{BACKEND_URL}/chat",
                        json=chat_request
                    )
                    
                    if response.status_code == 200:
                        print("✅ Collection chat successful")
                        return True
                    else:
                        print(f"❌ Collection chat failed: {response.status_code}")
                        return False
                else:
                    print(f"❌ Collection creation failed: {response.status_code}")
                    return False
            except Exception as e:
                print(f"❌ Collection test error: {e}")
                return False
        else:
            print("⚠️  Not enough documents for collection test")
            return True
    
    def test_error_handling(self):
        """Test error handling"""
        print("\n🚨 Testing Error Handling...")
        
        # Test chat without document
        try:
            response = self.session.post(
                f"{BACKEND_URL}/chat",
                json={"question": "Test question"}
            )
            if response.status_code == 400:
                print("✅ Correctly handled missing document ID")
            else:
                print(f"❌ Unexpected response for missing doc ID: {response.status_code}")
        except Exception as e:
            print(f"❌ Error handling test failed: {e}")
        
        # Test with invalid document ID
        try:
            response = self.session.post(
                f"{BACKEND_URL}/chat",
                json={
                    "question": "Test question",
                    "doc_id": "invalid_doc_id"
                }
            )
            if response.status_code in [400, 404]:
                print("✅ Correctly handled invalid document ID")
            else:
                print(f"❌ Unexpected response for invalid doc ID: {response.status_code}")
        except Exception as e:
            print(f"❌ Error handling test failed: {e}")
        
        return True
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting DocSpotlight Comprehensive Test Suite")
        print("=" * 60)
        
        tests = [
            ("Backend Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("User Profile", self.test_get_user_profile),
            ("Document Upload", self.test_document_upload),
            ("Document List", self.test_get_documents),
            ("Chat Functionality", self.test_chat_functionality),
            ("Multiple Questions", self.test_multiple_questions),
            ("Collection Functionality", self.test_collection_functionality),
            ("Error Handling", self.test_error_handling),
        ]
        
        results = {}
        for test_name, test_func in tests:
            try:
                results[test_name] = test_func()
            except Exception as e:
                print(f"❌ {test_name} crashed: {e}")
                results[test_name] = False
            
            time.sleep(1)  # Brief pause between tests
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\n🎯 Overall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! DocSpotlight is working perfectly!")
        else:
            print("⚠️  Some tests failed. Check the output above for details.")
        
        return results

if __name__ == "__main__":
    tester = DocSpotlightTester()
    results = tester.run_all_tests()
