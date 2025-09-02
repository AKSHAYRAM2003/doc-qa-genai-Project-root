#!/bin/bash

# GCP Cost Monitoring and Management Script
# Provides cost analysis and additional optimization features

set -e

PROJECT_ID="doc-qa-genai-469807"
SERVICE_NAME="doc-qa-backend"
REGION="us-central1"

echo "📊 GCP Cost Monitoring and Analysis..."

# Function to get current month spending
get_current_spending() {
    echo "💰 Current month spending:"
    gcloud billing accounts list --format="table(name,displayName)"
    
    # Get billing account
    BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" | head -1)
    
    if [ ! -z "$BILLING_ACCOUNT" ]; then
        echo "📋 Billing Account: $BILLING_ACCOUNT"
        # Note: Detailed billing data requires billing export to BigQuery
        echo "💡 For detailed cost analysis, enable billing export to BigQuery"
    fi
}

# Function to show service status
show_service_status() {
    echo "🔍 Current service status:"
    gcloud run services describe $SERVICE_NAME --region=$REGION --format="table(
        metadata.name,
        status.url,
        spec.template.metadata.annotations.autoscaling\.knative\.dev/minScale,
        spec.template.metadata.annotations.autoscaling\.knative\.dev/maxScale,
        spec.template.spec.containers[0].resources.limits.memory,
        spec.template.spec.containers[0].resources.limits.cpu
    )"
}

# Function to manually stop service (for immediate cost saving)
stop_service_now() {
    echo "⏹️  Stopping service immediately..."
    gcloud run services update $SERVICE_NAME \
        --region=$REGION \
        --min-instances=0 \
        --max-instances=0 \
        --no-traffic
    echo "✅ Service stopped. No traffic will be served."
}

# Function to manually start service
start_service_now() {
    echo "▶️  Starting service immediately..."
    gcloud run services update $SERVICE_NAME \
        --region=$REGION \
        --min-instances=0 \
        --max-instances=3 \
        --traffic=100
    echo "✅ Service started and receiving traffic."
}

# Function to show optimization recommendations
show_optimization_tips() {
    echo "💡 Cost Optimization Tips:"
    echo ""
    echo "1. 🕐 Scheduled Operations (IMPLEMENTED):"
    echo "   - Service runs only 7:01 AM - 11:59 PM"
    echo "   - Saves ~33% on compute costs"
    echo ""
    echo "2. 🔧 Resource Optimization (IMPLEMENTED):"
    echo "   - Memory: 1GB (reduced from 2GB)"
    echo "   - CPU: 1 core (reduced from 2 cores)"
    echo "   - Max instances: 3 (reduced from 10)"
    echo "   - CPU throttling enabled"
    echo ""
    echo "3. 📊 Additional Savings:"
    echo "   - Use Cloud SQL only if needed (currently using SQLite)"
    echo "   - Enable compression for API responses"
    echo "   - Use CDN for static assets"
    echo "   - Consider regional deployment vs global"
    echo ""
    echo "4. 🚨 Billing Alerts (CONFIGURED):"
    echo "   - \$5 budget with 50%, 75%, 90%, 100% alerts"
    echo "   - \$10 backup budget"
    echo "   - High usage alerts"
}

# Function to check scheduler jobs
check_scheduler_status() {
    echo "⏰ Scheduler jobs status:"
    gcloud scheduler jobs list --location=$REGION --format="table(
        name,
        schedule,
        timeZone,
        state,
        lastAttemptTime
    )" 2>/dev/null || echo "No scheduler jobs found. Run setup-cost-optimization.sh first."
}

# Main menu
echo "🎛️  GCP Cost Management Dashboard"
echo "=================================="
echo ""

case "${1:-status}" in
    "status")
        get_current_spending
        echo ""
        show_service_status
        echo ""
        check_scheduler_status
        ;;
    "stop")
        stop_service_now
        ;;
    "start")
        start_service_now
        ;;
    "tips")
        show_optimization_tips
        ;;
    "setup")
        echo "🔧 Setting up cost optimization..."
        chmod +x setup-cost-optimization.sh setup-billing-alerts.sh
        echo "Enter your email for billing alerts:"
        read -p "Email: " USER_EMAIL
        
        # Update email in billing alerts script
        sed -i.bak "s/your-email@example.com/$USER_EMAIL/g" setup-billing-alerts.sh
        
        ./setup-cost-optimization.sh
        ./setup-billing-alerts.sh
        echo "✅ Cost optimization setup complete!"
        ;;
    *)
        echo "Usage: $0 [status|stop|start|tips|setup]"
        echo ""
        echo "Commands:"
        echo "  status  - Show current service and billing status (default)"
        echo "  stop    - Stop service immediately (manual override)"
        echo "  start   - Start service immediately (manual override)"
        echo "  tips    - Show cost optimization recommendations"
        echo "  setup   - Run complete cost optimization setup"
        echo ""
        ;;
esac
