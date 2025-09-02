#!/bin/bash

# GCP Cost Optimization Setup Script
# This script sets up:
# 1. Cloud Scheduler to stop/start service (7:01 AM - 11:59 PM)
# 2. Billing alerts and notifications
# 3. Cost-effective service configuration

set -e

PROJECT_ID="doc-qa-genai-469807"
SERVICE_NAME="doc-qa-backend"
REGION="us-central1"
SCHEDULER_REGION="us-central1"

echo "💰 Setting up GCP cost optimization..."

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable billing.googleapis.com
gcloud services enable monitoring.googleapis.com

# Create service account for scheduler
echo "👤 Creating service account for scheduler..."
gcloud iam service-accounts create cloud-run-scheduler \
    --display-name="Cloud Run Scheduler" \
    --description="Service account for managing Cloud Run service schedule" || true

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:cloud-run-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:cloud-run-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create Cloud Function to stop the service (sets traffic to 0)
echo "⏹️  Creating stop function..."
cat > stop-service.js << 'EOF'
const {CloudRunClient} = require('@google-cloud/run');
const client = new CloudRunClient();

exports.stopService = async (req, res) => {
  const projectId = 'doc-qa-genai-469807';
  const region = 'us-central1';
  const serviceName = 'doc-qa-backend';
  
  const name = `projects/${projectId}/locations/${region}/services/${serviceName}`;
  
  try {
    // Update service to allocate 0 traffic (effectively stopping it)
    const [operation] = await client.replaceService({
      service: {
        name: name,
        spec: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/minScale': '0',
                'autoscaling.knative.dev/maxScale': '0',
                'run.googleapis.com/cpu-throttling': 'true'
              }
            }
          },
          traffic: [{
            percent: 0,
            latestRevision: true
          }]
        }
      }
    });
    
    console.log('Service stopped successfully');
    res.status(200).send('Service stopped');
  } catch (error) {
    console.error('Error stopping service:', error);
    res.status(500).send('Error stopping service');
  }
};
EOF

# Create Cloud Function to start the service (sets traffic to 100)
echo "▶️  Creating start function..."
cat > start-service.js << 'EOF'
const {CloudRunClient} = require('@google-cloud/run');
const client = new CloudRunClient();

exports.startService = async (req, res) => {
  const projectId = 'doc-qa-genai-469807';
  const region = 'us-central1';
  const serviceName = 'doc-qa-backend';
  
  const name = `projects/${projectId}/locations/${region}/services/${serviceName}`;
  
  try {
    // Update service to allocate 100% traffic (starting it)
    const [operation] = await client.replaceService({
      service: {
        name: name,
        spec: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/minScale': '0',
                'autoscaling.knative.dev/maxScale': '5',
                'run.googleapis.com/cpu-throttling': 'false'
              }
            }
          },
          traffic: [{
            percent: 100,
            latestRevision: true
          }]
        }
      }
    });
    
    console.log('Service started successfully');
    res.status(200).send('Service started');
  } catch (error) {
    console.error('Error starting service:', error);
    res.status(500).send('Error starting service');
  }
};
EOF

# Create package.json for Cloud Functions
cat > package.json << 'EOF'
{
  "name": "cloud-run-scheduler",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/run": "^0.7.0"
  }
}
EOF

# Deploy Cloud Functions
echo "☁️ Deploying Cloud Functions..."
gcloud functions deploy stop-service \
    --runtime=nodejs18 \
    --trigger=http \
    --allow-unauthenticated \
    --region=$REGION \
    --source=. \
    --entry-point=stopService \
    --service-account=cloud-run-scheduler@$PROJECT_ID.iam.gserviceaccount.com

gcloud functions deploy start-service \
    --runtime=nodejs18 \
    --trigger=http \
    --allow-unauthenticated \
    --region=$REGION \
    --source=. \
    --entry-point=startService \
    --service-account=cloud-run-scheduler@$PROJECT_ID.iam.gserviceaccount.com

# Get function URLs
STOP_URL=$(gcloud functions describe stop-service --region=$REGION --format="value(httpsTrigger.url)")
START_URL=$(gcloud functions describe start-service --region=$REGION --format="value(httpsTrigger.url)")

# Create Cloud Scheduler jobs
echo "⏰ Creating scheduler jobs..."

# Stop service at 12:00 AM (midnight) - UTC (converts to local timezone)
gcloud scheduler jobs create http stop-service-job \
    --location=$SCHEDULER_REGION \
    --schedule="0 0 * * *" \
    --uri=$STOP_URL \
    --http-method=POST \
    --time-zone="America/New_York" \
    --description="Stop Cloud Run service at midnight" || true

# Start service at 7:01 AM - UTC (converts to local timezone)
gcloud scheduler jobs create http start-service-job \
    --location=$SCHEDULER_REGION \
    --schedule="1 7 * * *" \
    --uri=$START_URL \
    --http-method=POST \
    --time-zone="America/New_York" \
    --description="Start Cloud Run service at 7:01 AM" || true

echo "✅ Cost optimization setup completed!"
echo ""
echo "📋 Summary:"
echo "   Service runs: 7:01 AM - 11:59 PM daily"
echo "   Stop function: $STOP_URL"
echo "   Start function: $START_URL"
echo ""
echo "Next: Run the billing alerts setup script"
