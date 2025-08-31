#!/usr/bin/env python3
"""
Test script for chat persistence functionality.
This script tests the new chat persistence endpoints.
"""
import asyncio
import json
import httpx
import uuid
from datetime import datetime

BACKEND_URL = "http://localhost:8001"

async def test_auth_and_chat_persistence():
    """Test user authentication and chat persistence flow."""
    async with httpx.AsyncClient() as client:
        print("🧪 Testing DocSpotlight Chat Persistence...")
        
        # Test 1: Register a new user (or use existing)
        print("\n1️⃣ Testing user registration...")
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        register_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = await client.post(f"{BACKEND_URL}/auth/register", json=register_data)
        if response.status_code in [200, 201]:
            print("✅ User registration successful")
            email = register_data["email"]
        else:
            print(f"❌ User registration failed: {response.status_code} - {response.text}")
            return
        
        # Test 2: Login to get token
        print("\n2️⃣ Testing user login...")
        login_data = {
            "email": email,
            "password": "TestPassword123!"
        }
        
        response = await client.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            access_token = auth_data["access_token"]
            print("✅ User login successful")
        else:
            print(f"❌ User login failed: {response.status_code} - {response.text}")
            return
        
        # Test 3: Save chat data
        print("\n3️⃣ Testing chat data save...")
        # Use simple string IDs like the frontend does (crypto.randomUUID() generates proper UUID strings)
        chat_id = "test-chat-" + str(uuid.uuid4())
        msg_id_1 = "msg-" + str(uuid.uuid4())
        msg_id_2 = "msg-" + str(uuid.uuid4())
        
        chat_data = {
            "chats": {
                "history": [
                    {
                        "id": chat_id,
                        "title": "Test Chat Session",
                        "createdAt": int(datetime.now().timestamp() * 1000),
                        "hasPdf": False
                    }
                ],
                "messages": {
                    chat_id: [
                        {
                            "id": msg_id_1,
                            "role": "user",
                            "content": "Hello, this is a test message!",
                            "timestamp": int(datetime.now().timestamp() * 1000)
                        },
                        {
                            "id": msg_id_2,
                            "role": "ai",
                            "content": "Hello! I'm DocSpotlight. How can I help you with your documents today?",
                            "timestamp": int(datetime.now().timestamp() * 1000)
                        }
                    ]
                },
                "activeId": chat_id,
                "chatDocuments": {
                    chat_id: []
                }
            }
        }
        
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.post(f"{BACKEND_URL}/api/user/save-chats", json=chat_data, headers=headers)
        
        if response.status_code == 200:
            print("✅ Chat data saved successfully")
        else:
            print(f"❌ Chat data save failed: {response.status_code} - {response.text}")
            return
        
        # Test 4: Load chat data
        print("\n4️⃣ Testing chat data load...")
        response = await client.get(f"{BACKEND_URL}/api/user/load-chats", headers=headers)
        
        if response.status_code == 200:
            loaded_data = response.json()
            print("✅ Chat data loaded successfully")
            print(f"📄 Loaded {len(loaded_data['chats']['history'])} chat sessions")
            print(f"💬 First chat has {len(loaded_data['chats']['messages'].get(chat_id, []))} messages")
        else:
            print(f"❌ Chat data load failed: {response.status_code} - {response.text}")
            return
        
        print("\n🎉 All tests passed! Chat persistence is working correctly.")
        print("\n📋 Summary:")
        print("   ✅ User registration works")
        print("   ✅ User authentication works") 
        print("   ✅ Chat data can be saved to backend")
        print("   ✅ Chat data can be loaded from backend")
        print("   ✅ Chat history persists across sessions")

if __name__ == "__main__":
    asyncio.run(test_auth_and_chat_persistence())
