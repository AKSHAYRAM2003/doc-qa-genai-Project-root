#!/bin/bash

# GCP Deployment Script for DocQA Backend
# Make sure you have gcloud CLI installed and authenticated

set -e

PROJECT_ID="doc-qa-genai-469807"
SERVICE_NAME="doc-qa-backend"
REGION="us-central1"
DATABASE_INSTANCE_NAME="docqa-postgres"
DATABASE_NAME="docqa"
DATABASE_USER="docqa_user"
BUCKET_NAME="${PROJECT_ID}-docqa-storage"

echo "🚀 Starting deployment to Google Cloud Run..."

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com

# Create Cloud SQL instance if it doesn't exist
echo "🗄️  Setting up Cloud SQL database..."
if ! gcloud sql instances describe $DATABASE_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "Creating Cloud SQL PostgreSQL instance..."
    gcloud sql instances create $DATABASE_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04 \
        --maintenance-release-channel=production \
        --project=$PROJECT_ID
else
    echo "Cloud SQL instance already exists"
fi

# Create database if it doesn't exist
echo "📊 Creating database..."
if ! gcloud sql databases describe $DATABASE_NAME --instance=$DATABASE_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    gcloud sql databases create $DATABASE_NAME --instance=$DATABASE_INSTANCE_NAME --project=$PROJECT_ID
fi

# Create database user if it doesn't exist
echo "👤 Setting up database user..."
if ! gcloud sql users describe $DATABASE_USER --instance=$DATABASE_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    # Generate a secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    gcloud sql users create $DATABASE_USER --instance=$DATABASE_INSTANCE_NAME --password=$DB_PASSWORD --project=$PROJECT_ID
    echo "Database password: $DB_PASSWORD"
    echo "⚠️  Please save this password securely!"
else
    echo "Database user already exists. Please ensure you have the password."
    read -p "Enter database password for $DATABASE_USER: " -s DB_PASSWORD
    echo
fi

# Get the connection name for Cloud SQL
CONNECTION_NAME=$(gcloud sql instances describe $DATABASE_INSTANCE_NAME --project=$PROJECT_ID --format="value(connectionName)")
echo "Database connection name: $CONNECTION_NAME"

# Create Cloud Storage bucket if it doesn't exist
echo "🪣 Setting up Cloud Storage bucket..."
if ! gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
    gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME
    # Set up lifecycle policy to manage costs
    cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF
    gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME
    rm lifecycle.json
else
    echo "Cloud Storage bucket already exists"
fi

# Create database URLs for Cloud SQL
DATABASE_URL="postgresql+asyncpg://$DATABASE_USER:$DB_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME"
SYNC_DATABASE_URL="postgresql://$DATABASE_USER:$DB_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME"

echo "☁️ Deploying to Cloud Run with cost optimization..."
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