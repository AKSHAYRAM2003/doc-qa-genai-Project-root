#!/bin/bash

# Resume GCP Deployment Script
# This script continues deployment from where we left off

set -e

PROJECT_ID="doc-qa-genai-469807"
SERVICE_NAME="doc-qa-backend"
REGION="us-central1"
DATABASE_INSTANCE_NAME="docqa-postgres"
DATABASE_NAME="docqa"
DATABASE_USER="docqa_user"
BUCKET_NAME="${PROJECT_ID}-docqa-storage"

echo "🔄 Resuming GCP deployment..."

# Check if Cloud SQL instance is ready
echo "🗄️  Checking Cloud SQL instance status..."
INSTANCE_STATE=$(gcloud sql instances describe $DATABASE_INSTANCE_NAME --format="value(state)" 2>/dev/null || echo "NOT_FOUND")

if [ "$INSTANCE_STATE" = "NOT_FOUND" ]; then
    echo "❌ Cloud SQL instance not found. Please run the full deployment script first."
    exit 1
elif [ "$INSTANCE_STATE" != "RUNNABLE" ]; then
    echo "⏳ Cloud SQL instance is still being created (state: $INSTANCE_STATE)"
    echo "Waiting for instance to be ready..."
    
    # Wait for the instance to be ready (max 10 minutes)
    for i in {1..60}; do
        sleep 10
        CURRENT_STATE=$(gcloud sql instances describe $DATABASE_INSTANCE_NAME --format="value(state)" 2>/dev/null || echo "ERROR")
        echo "   Status check $i/60: $CURRENT_STATE"
        
        if [ "$CURRENT_STATE" = "RUNNABLE" ]; then
            echo "✅ Cloud SQL instance is ready!"
            break
        elif [ "$CURRENT_STATE" = "ERROR" ] || [ $i -eq 60 ]; then
            echo "❌ Timeout waiting for Cloud SQL instance to be ready"
            exit 1
        fi
    done
else
    echo "✅ Cloud SQL instance is ready!"
fi

# Create database if it doesn't exist
echo "📊 Creating database..."
if ! gcloud sql databases describe $DATABASE_NAME --instance=$DATABASE_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    gcloud sql databases create $DATABASE_NAME --instance=$DATABASE_INSTANCE_NAME --project=$PROJECT_ID
    echo "Database '$DATABASE_NAME' created"
else
    echo "Database '$DATABASE_NAME' already exists"
fi

# Create database user if it doesn't exist
echo "👤 Setting up database user..."
if ! gcloud sql users describe $DATABASE_USER --instance=$DATABASE_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    # Generate a secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    gcloud sql users create $DATABASE_USER --instance=$DATABASE_INSTANCE_NAME --password=$DB_PASSWORD --project=$PROJECT_ID
    echo "Database user created with password: $DB_PASSWORD"
    echo "⚠️  Please save this password securely!"
else
    echo "Database user already exists. Please ensure you have the password."
    read -p "Enter database password for $DATABASE_USER: " -s DB_PASSWORD
    echo
fi

# Get the connection name for Cloud SQL
CONNECTION_NAME=$(gcloud sql instances describe $DATABASE_INSTANCE_NAME --project=$PROJECT_ID --format="value(connectionName)")
echo "Database connection name: $CONNECTION_NAME"

# Check if storage bucket exists
echo "🪣 Checking Cloud Storage bucket..."
if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
    echo "✅ Cloud Storage bucket exists"
else
    echo "❌ Cloud Storage bucket not found. Creating..."
    gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME
fi

# Create database URLs for Cloud SQL
DATABASE_URL="postgresql+asyncpg://$DATABASE_USER:$DB_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME"
SYNC_DATABASE_URL="postgresql://$DATABASE_USER:$DB_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME"

echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --concurrency=80 \
  --timeout=300 \
  --min-instances=0 \
  --max-instances=5 \
  --cpu-throttling \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --set-env-vars="GOOGLE_API_KEY=AIzaSyBRRk5MrPlkd39N7309kokBonteZZdADd0" \
  --set-env-vars="RESEND_API_KEY=re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg" \
  --set-env-vars="DATABASE_URL=$DATABASE_URL" \
  --set-env-vars="SYNC_DATABASE_URL=$SYNC_DATABASE_URL" \
  --set-env-vars="STORAGE_BUCKET=$BUCKET_NAME" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --set-env-vars="JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production-2024" \
  --set-env-vars="JWT_ALGORITHM=HS256" \
  --set-env-vars="ACCESS_TOKEN_EXPIRE_MINUTES=1440" \
  --set-env-vars="ENVIRONMENT=production" \
  --set-env-vars="FRONTEND_URL=https://PLACEHOLDER-FRONTEND-URL" \
  --port=8000

# Get the service URL
echo "🔗 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "🌐 Service URL: $SERVICE_URL"
echo "🗄️  Database Instance: $DATABASE_INSTANCE_NAME"
echo "🪣 Storage Bucket: gs://$BUCKET_NAME"
echo "🔗 Connection Name: $CONNECTION_NAME"
echo ""
echo "🔧 Next Steps:"
echo "1. Update your frontend to use the service URL: $SERVICE_URL"
echo "2. Test the /health endpoint: curl $SERVICE_URL/health"
echo "3. Monitor logs: gcloud logs tail /projects/$PROJECT_ID/logs/run.googleapis.com%2Frequests --format=json"
echo ""
echo "💰 Cost Optimization Features Enabled:"
echo "- Auto-scaling (0-5 instances)"
echo "- CPU throttling when idle"
echo "- Minimal instance class (db-f1-micro)"
echo "- Storage lifecycle management"
