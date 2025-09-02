#!/bin/bash

# Local Development Setup Script
# This script helps set up the environment for local development

set -e

echo "🚀 Setting up DocQA local development environment..."

# Check if Python 3.11+ is available
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    echo "❌ Python 3.11+ is required but not found"
    exit 1
fi

echo "🐍 Using Python: $($PYTHON_CMD --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check PostgreSQL connection
echo "🗄️  Checking PostgreSQL connection..."
if ! $PYTHON_CMD -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='localhost',
        database='docspotlight_dev',
        user='postgres',
        password='Akshay'
    )
    conn.close()
    print('✅ PostgreSQL connection successful')
except Exception as e:
    print(f'❌ PostgreSQL connection failed: {e}')
    print('Please ensure PostgreSQL is running and the database exists')
    exit(1)
"; then
    echo "Database connection verified"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Create database tables
echo "🏗️  Creating database tables..."
$PYTHON_CMD -c "
import asyncio
from database import create_tables
asyncio.run(create_tables())
"

# Set up environment variables
echo "🔧 Setting up environment variables..."
cat > .env << EOF
DATABASE_URL=postgresql+asyncpg://postgres:Akshay@localhost/docspotlight_dev
SYNC_DATABASE_URL=postgresql://postgres:Akshay@localhost/docspotlight_dev
ENVIRONMENT=development
GOOGLE_API_KEY=AIzaSyBRRk5MrPlkd39N7309kokBonteZZdADd0
RESEND_API_KEY=re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production-2024
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:3000
EOF

echo "✅ Local development setup completed!"
echo ""
echo "🚀 To start the development server:"
echo "   source venv/bin/activate"
echo "   python backend_api.py"
echo ""
echo "🌐 The server will be available at: http://localhost:8000"
echo "📊 Health check: http://localhost:8000/health"
echo "📖 API docs: http://localhost:8000/docs"
