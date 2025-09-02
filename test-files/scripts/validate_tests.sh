#!/bin/bash

# Test Validation Script for DocSpotlight
# This script validates all test components and files

echo "🧪 DocSpotlight Test Validation Script"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "docspotlight-NextJs" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "✅ Project root directory confirmed"

# Check test files directory
if [ -d "test-files" ]; then
    echo "✅ test-files directory exists"
    
    # Check components
    if [ -d "test-files/components" ]; then
        echo "✅ test-files/components directory exists"
        
        if [ -f "test-files/components/ServerStatusDemo.tsx" ]; then
            echo "✅ ServerStatusDemo.tsx found"
        else
            echo "❌ ServerStatusDemo.tsx missing"
        fi
        
        if [ -f "test-files/components/ServerStatusMarqueeTest.tsx" ]; then
            echo "✅ ServerStatusMarqueeTest.tsx found"
        else
            echo "❌ ServerStatusMarqueeTest.tsx missing"
        fi
    else
        echo "❌ test-files/components directory missing"
    fi
    
    # Check docs
    if [ -d "test-files/docs" ]; then
        echo "✅ test-files/docs directory exists"
        
        if [ -f "test-files/docs/test_chat_privacy_fix.md" ]; then
            echo "✅ test_chat_privacy_fix.md found"
        else
            echo "❌ test_chat_privacy_fix.md missing"
        fi
    else
        echo "❌ test-files/docs directory missing"
    fi
    
    # Check scripts
    if [ -d "test-files/scripts" ]; then
        echo "✅ test-files/scripts directory exists"
        
        if [ -f "test-files/scripts/test_chat_persistence.py" ]; then
            echo "✅ test_chat_persistence.py found"
        else
            echo "❌ test_chat_persistence.py missing"
        fi
    else
        echo "❌ test-files/scripts directory missing"
    fi
else
    echo "❌ test-files directory missing"
fi

# Check if main components are properly structured
echo ""
echo "🔍 Checking main components..."

if [ -f "docspotlight-NextJs/app/components/ServerStatusMarquee.tsx" ]; then
    echo "✅ Main ServerStatusMarquee.tsx exists"
else
    echo "❌ Main ServerStatusMarquee.tsx missing"
fi

if [ -f "docspotlight-NextJs/app/components/Hero.tsx" ]; then
    echo "✅ Hero.tsx exists"
else
    echo "❌ Hero.tsx missing"
fi

if [ -f "docspotlight-NextJs/app/lib/chatPersistence.ts" ]; then
    echo "✅ chatPersistence.ts exists"
else
    echo "❌ chatPersistence.ts missing"
fi

echo ""
echo "🎯 Test validation complete!"
echo ""
echo "📋 Summary:"
echo "- Test files are organized in test-files/ directory"
echo "- Components: test-files/components/"
echo "- Documentation: test-files/docs/"
echo "- Scripts: test-files/scripts/"
echo ""
echo "🚀 Ready to create test branch!"
