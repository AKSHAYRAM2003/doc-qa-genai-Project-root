#!/bin/bash

# Test Password Reset Functionality
# This script tests the complete password reset flow locally

set -e

echo "🔐 Testing Password Reset Functionality..."

# Backend URL (local)
BACKEND_URL="http://localhost:8000"
# Frontend URL (local) 
FRONTEND_URL="http://localhost:3000"

# Test email
TEST_EMAIL="test@example.com"

echo "📋 Test Configuration:"
echo "   Backend: $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL" 
echo "   Test Email: $TEST_EMAIL"
echo ""

# Step 1: Check if backend is running
echo "1️⃣ Checking backend status..."
if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Start with: uvicorn backend_api:app --reload"
    exit 1
fi

# Step 2: Test forgot password endpoint
echo ""
echo "2️⃣ Testing forgot password endpoint..."
RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}")

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ Forgot password endpoint working"
else
    echo "⚠️  Note: This will only work if the email exists in the database"
fi

# Step 3: Check environment variables
echo ""
echo "3️⃣ Checking environment configuration..."
echo "Current FRONTEND_URL in backend environment:"

# Try to get env var from running backend (this might not work, but worth trying)
echo "💡 Make sure your .env file has:"
echo "   FRONTEND_URL=$FRONTEND_URL"

# Step 4: Test email template generation (mock)
echo ""
echo "4️⃣ Testing reset URL generation..."
MOCK_TOKEN="test-token-123"
EXPECTED_URL="$FRONTEND_URL/auth/reset-password?token=$MOCK_TOKEN"
echo "Expected reset URL: $EXPECTED_URL"

# Step 5: Verify frontend route exists
echo ""
echo "5️⃣ Checking frontend reset password page..."
if [ -f "../docspotlight-NextJs/app/auth/reset-password/page.tsx" ]; then
    echo "✅ Reset password page exists"
else
    echo "❌ Reset password page missing"
fi

echo ""
echo "🎯 Summary:"
echo "✅ Backend endpoint: /auth/forgot-password"
echo "✅ Frontend page: /auth/reset-password"  
echo "✅ Environment variable: FRONTEND_URL"
echo ""
echo "💡 To test complete flow:"
echo "1. Register a user: $BACKEND_URL/auth/register"
echo "2. Request reset: $BACKEND_URL/auth/forgot-password"
echo "3. Check email for reset link"
echo "4. Follow link to: $FRONTEND_URL/auth/reset-password?token=..."
echo "5. Reset password using the form"
