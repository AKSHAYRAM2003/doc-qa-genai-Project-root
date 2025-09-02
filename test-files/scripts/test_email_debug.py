#!/usr/bin/env python3
"""
Debug script to test Resend email functionality directly.
"""

import resend
from datetime import datetime

def test_resend_email():
    """Test Resend email sending functionality."""
    print("🔍 Testing Resend Email Functionality")
    print("=" * 50)
    
    # Set API key
    resend.api_key = "re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg"
    
    # Test email data
    email_data = {
        "from": "DocSpotlight <onboarding@resend.dev>",
        "to": ["akshayram244@gmail.com"],
        "subject": "🔐 Test DocSpotlight Password Reset",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">DocSpotlight Password Reset</h2>
            <p>Hello!</p>
            <p>This is a test email to verify that Resend is working correctly.</p>
            <p>Test reset link: <a href="http://localhost:3000/auth/reset-password?token=test_token_123">Reset Password</a></p>
            <p>This is a test - please ignore.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This email was sent by DocSpotlight.</p>
        </div>
        """,
        "text": """
        DocSpotlight Password Reset
        
        Hello!
        
        This is a test email to verify that Resend is working correctly.
        
        Test reset link: http://localhost:3000/auth/reset-password?token=test_token_123
        
        This is a test - please ignore.
        
        ---
        This email was sent by DocSpotlight.
        """
    }
    
    try:
        print(f"📧 Sending test email to: {email_data['to'][0]}")
        print(f"📤 From: {email_data['from']}")
        print(f"📝 Subject: {email_data['subject']}")
        
        response = resend.Emails.send(email_data)
        print(f"✅ Email sent successfully!")
        print(f"📊 Response: {response}")
        
        if hasattr(response, 'id'):
            print(f"🆔 Message ID: {response.id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        
        # Additional debugging
        try:
            import requests
            print("🔗 Testing Resend API connectivity...")
            test_response = requests.get("https://api.resend.com/", 
                                       headers={"Authorization": f"Bearer {resend.api_key}"})
            print(f"🌐 API connectivity test: {test_response.status_code}")
        except Exception as api_e:
            print(f"🌐 API connectivity test failed: {api_e}")
        
        return False

def test_email_validation():
    """Test email validation logic."""
    print("\n📋 Testing Email Validation")
    print("-" * 30)
    
    test_emails = [
        "akshayram244@gmail.com",
        "test@gmail.com", 
        "user@yahoo.com",
        "invalid.email"
    ]
    
    for email in test_emails:
        is_valid = email.lower().endswith('@gmail.com')
        status = "✅ Valid" if is_valid else "❌ Invalid"
        print(f"{status}: {email}")

if __name__ == "__main__":
    print("🚀 DocSpotlight Email Debug Tool")
    print(f"🕒 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test email validation
    test_email_validation()
    
    # Test actual email sending
    success = test_resend_email()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Email test completed successfully!")
        print("📬 Please check your inbox (and spam folder) for the test email.")
    else:
        print("❌ Email test failed. Please check the error messages above.")
        print("🛠️  Possible issues:")
        print("   • Invalid Resend API key")
        print("   • Network connectivity issues")
        print("   • Email domain restrictions")
        print("   • Resend service issues")
