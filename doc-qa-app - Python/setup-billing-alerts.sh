#!/bin/bash

# GCP Billing Alerts Setup Script
# Sets up billing alerts and budget notifications

set -e

PROJECT_ID="doc-qa-genai-469807"
EMAIL="your-email@example.com"  # Replace with your email

echo "💳 Setting up billing alerts and budgets..."

# Enable billing API
gcloud services enable billingbudgets.googleapis.com
gcloud services enable monitoring.googleapis.com

# Get billing account ID
BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" | head -1)

if [ -z "$BILLING_ACCOUNT" ]; then
    echo "❌ No billing account found. Please set up billing first."
    exit 1
fi

echo "📋 Using billing account: $BILLING_ACCOUNT"

# Create notification channel for email alerts
echo "📧 Creating email notification channel..."
cat > notification-channel.json << EOF
{
  "type": "email",
  "displayName": "Billing Alerts Email",
  "description": "Email notifications for billing alerts",
  "labels": {
    "email_address": "$EMAIL"
  }
}
EOF

# Create the notification channel
NOTIFICATION_CHANNEL=$(gcloud alpha monitoring channels create --channel-content-from-file=notification-channel.json --format="value(name)")

echo "✅ Notification channel created: $NOTIFICATION_CHANNEL"

# Create budget alerts
echo "💰 Creating budget alerts..."

# Budget 1: $5 monthly limit with alerts at 50%, 75%, 90%, 100%
cat > budget-5usd.json << EOF
{
  "displayName": "Monthly Budget - \$5 Limit",
  "budgetFilter": {
    "projects": ["projects/$PROJECT_ID"]
  },
  "amount": {
    "specifiedAmount": {
      "currencyCode": "USD",
      "units": "5"
    }
  },
  "thresholdRules": [
    {
      "thresholdPercent": 0.5,
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": 0.75,
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": 0.9,
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": 1.0,
      "spendBasis": "CURRENT_SPEND"
    }
  ],
  "allUpdatesRule": {
    "monitoringNotificationChannels": [
      "$NOTIFICATION_CHANNEL"
    ],
    "disableDefaultIamRecipients": false
  }
}
EOF

# Budget 2: $10 monthly limit (backup alert)
cat > budget-10usd.json << EOF
{
  "displayName": "Monthly Budget - \$10 Warning",
  "budgetFilter": {
    "projects": ["projects/$PROJECT_ID"]
  },
  "amount": {
    "specifiedAmount": {
      "currencyCode": "USD",
      "units": "10"
    }
  },
  "thresholdRules": [
    {
      "thresholdPercent": 0.8,
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": 1.0,
      "spendBasis": "CURRENT_SPEND"
    }
  ],
  "allUpdatesRule": {
    "monitoringNotificationChannels": [
      "$NOTIFICATION_CHANNEL"
    ],
    "disableDefaultIamRecipients": false
  }
}
EOF

# Create budgets
gcloud billing budgets create --billing-account=$BILLING_ACCOUNT --budget-from-file=budget-5usd.json
gcloud billing budgets create --billing-account=$BILLING_ACCOUNT --budget-from-file=budget-10usd.json

# Create alerting policy for high usage
echo "🚨 Creating usage alert policy..."
cat > usage-alert-policy.json << EOF
{
  "displayName": "High Cloud Run Usage Alert",
  "conditions": [
    {
      "displayName": "Cloud Run CPU Utilization > 80%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/container/cpu/utilizations\"",
        "comparison": "COMPARISON_GREATER_THAN",
        "thresholdValue": 0.8,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN",
            "crossSeriesReducer": "REDUCE_MEAN",
            "groupByFields": ["resource.labels.service_name"]
          }
        ]
      }
    }
  ],
  "notificationChannels": [
    "$NOTIFICATION_CHANNEL"
  ],
  "combiner": "OR",
  "enabled": true
}
EOF

gcloud alpha monitoring policies create --policy-from-file=usage-alert-policy.json

# Clean up temporary files
rm -f notification-channel.json budget-5usd.json budget-10usd.json usage-alert-policy.json

echo "✅ Billing alerts setup completed!"
echo ""
echo "📋 Billing Alerts Summary:"
echo "   - \$5 monthly budget with alerts at 50%, 75%, 90%, 100%"
echo "   - \$10 backup budget with alerts at 80%, 100%"
echo "   - High CPU usage alerts"
echo "   - Email notifications to: $EMAIL"
echo ""
echo "💡 Tip: Update the EMAIL variable in this script with your actual email address"
