#!/bin/bash

# Complete Deployment Script for DocQA App
# This script deploys both backend (GCP Cloud Run) and frontend (Vercel)

set -e

echo "🚀 Starting complete DocQA deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated with gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null 2>&1; then
    print_error "Please authenticate with gcloud first:"
    echo "   gcloud auth login"
    echo "   gcloud auth application-default login"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI is not installed. Installing it now..."
    npm install -g vercel
fi

print_status "Prerequisites check completed"

# Step 1: Deploy Backend to GCP Cloud Run
echo ""
echo "📦 Step 1: Deploying Backend to Google Cloud Run..."
cd "doc-qa-app - Python"

# Make the deployment script executable
chmod +x deploy-gcp.sh

# Run the GCP deployment
./deploy-gcp.sh

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe doc-qa-backend --region=us-central1 --format="value(status.url)")
print_status "Backend deployed at: $SERVICE_URL"

# Step 2: Update Frontend Environment Variables
echo ""
echo "🔧 Step 2: Updating frontend environment variables..."
cd ../docspotlight-NextJs

# Create or update .env.local with the backend URL
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=$SERVICE_URL
NEXT_PUBLIC_APP_NAME="DocSpotlight"
NEXT_PUBLIC_APP_VERSION="1.0.0"
EOF

print_status "Frontend environment variables updated"

# Step 3: Deploy Frontend to Vercel
echo ""
echo "🌐 Step 3: Deploying Frontend to Vercel..."

# Login to Vercel (if not already logged in)
if ! vercel whoami > /dev/null 2>&1; then
    echo "Please login to Vercel:"
    vercel login
fi

# Deploy to Vercel
vercel --prod --env NEXT_PUBLIC_API_URL=$SERVICE_URL

# Get the deployed frontend URL
FRONTEND_URL=$(vercel ls --scope $(vercel whoami) | grep docspotlight | awk '{print $2}' | head -1)
if [ -z "$FRONTEND_URL" ]; then
    # Fallback: get from vercel output
    FRONTEND_URL=$(vercel ls | grep docspotlight | awk '{print "https://" $2}' | head -1)
fi

print_status "Frontend deployed at: https://$FRONTEND_URL"

# Step 4: Update backend with correct frontend URL
echo ""
echo "🔄 Step 4: Updating backend with frontend URL..."
cd "../doc-qa-app - Python"

# Update the Cloud Run service with the frontend URL for password reset emails
gcloud run services update doc-qa-backend \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=https://$FRONTEND_URL" \
  --update-env-vars="ALLOWED_ORIGINS=https://$FRONTEND_URL,https://localhost:3000"

print_status "Backend updated with frontend URL"

# Final summary
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Backend URL:  $SERVICE_URL"
echo "   Frontend URL: https://$FRONTEND_URL"
echo ""
echo "🔗 Quick Links:"
echo "   Health Check: $SERVICE_URL/health"
echo "   API Docs:     $SERVICE_URL/docs"
echo "   Frontend:     https://$FRONTEND_URL"
echo ""
echo "✅ Your DocQA app is now live in production!"
