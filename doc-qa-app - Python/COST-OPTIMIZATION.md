# 💰 Cost-Optimized GCP Deployment Guide

## 🎯 Cost Savings Overview

Your app will now run with significant cost reductions:

### ⏰ **Time-Based Savings (33% reduction)**
- **Active Hours**: 7:01 AM - 11:59 PM daily
- **Inactive Hours**: 12:00 AM - 7:00 AM (service stopped)
- **Annual Savings**: ~33% on compute costs

### 🔧 **Resource Optimization (50% reduction)**
- **Memory**: 1GB (down from 2GB)
- **CPU**: 1 core (down from 2 cores)
- **Max Instances**: 3 (down from 10)
- **CPU Throttling**: Enabled for idle periods

### 📊 **Billing Protection**
- **$5 Monthly Budget**: Alerts at 50%, 75%, 90%, 100%
- **$10 Backup Budget**: Additional safety net
- **Real-time Monitoring**: Email alerts for usage spikes

---

## 🚀 Quick Setup (All-in-One)

```bash
# Deploy with cost optimization
./deploy-gcp.sh

# Set up cost controls (enter your email when prompted)
./cost-monitor.sh setup
```

---

## 📋 Step-by-Step Setup

### Step 1: Deploy Cost-Optimized Backend
```bash
./deploy-gcp.sh
```

### Step 2: Set Up Automated Scheduling
```bash
./setup-cost-optimization.sh
```

### Step 3: Configure Billing Alerts
```bash
# Edit the script first to add your email
nano setup-billing-alerts.sh
# Change: EMAIL="your-email@example.com"

./setup-billing-alerts.sh
```

### Step 4: Deploy Frontend
```bash
cd ../docspotlight-NextJs
vercel --prod
```

---

## 🎛️ Cost Management Commands

### Monitor Current Status
```bash
./cost-monitor.sh status
```

### Manual Control (Override Schedule)
```bash
# Stop service immediately (emergency cost control)
./cost-monitor.sh stop

# Start service immediately
./cost-monitor.sh start
```

### View Optimization Tips
```bash
./cost-monitor.sh tips
```

---

## ⏰ Automated Schedule

| Time | Action | Description |
|------|--------|-------------|
| 12:00 AM | 🛑 **STOP** | Service scales to 0 instances |
| 7:01 AM | ▶️ **START** | Service scales back to normal |

**Timezone**: Configured for your local timezone (America/New_York by default)

---

## 💳 Billing Alerts Configuration

### Primary Budget: $5/month
- **50% Alert**: $2.50 - Early warning
- **75% Alert**: $3.75 - Attention needed
- **90% Alert**: $4.50 - Take action
- **100% Alert**: $5.00 - Budget exceeded

### Backup Budget: $10/month
- **80% Alert**: $8.00 - High usage warning
- **100% Alert**: $10.00 - Critical threshold

---

## 📊 Expected Monthly Costs

### Estimated Costs (with optimizations):
- **Cloud Run**: $2-5/month (depending on usage)
- **Cloud Scheduler**: $0.10/month (2 jobs)
- **Cloud Functions**: $0-0.50/month (minimal usage)
- **Storage**: $0.02/month (SQLite files)
- **Networking**: $0-1/month (depending on traffic)

**Total Estimated**: **$2-7/month** 🎉

### Previous Costs (without optimization):
- **Cloud Run**: $8-15/month
- **Total**: **$8-15/month**

**Savings**: **60-70% cost reduction!** 💰

---

## 🔍 Monitoring & Alerts

### Email Notifications You'll Receive:
1. **Daily Start/Stop**: Service status changes
2. **Budget Alerts**: When spending thresholds are reached
3. **Usage Spikes**: High CPU/memory usage
4. **Service Errors**: If start/stop fails

### View Costs in Real-Time:
- **GCP Console**: [Billing Dashboard](https://console.cloud.google.com/billing)
- **Budget Reports**: Track spending against limits
- **Usage Reports**: See detailed resource consumption

---

## 🛠️ Troubleshooting

### Service Won't Start/Stop
```bash
# Check scheduler jobs
gcloud scheduler jobs list --location=us-central1

# Check Cloud Functions
gcloud functions list --region=us-central1

# Manual override
./cost-monitor.sh start  # or stop
```

### High Costs Alert
```bash
# Check current usage
./cost-monitor.sh status

# Immediately stop service
./cost-monitor.sh stop

# Review optimization tips
./cost-monitor.sh tips
```

### Billing Alerts Not Working
```bash
# Verify notification channels
gcloud alpha monitoring channels list

# Check budget configuration
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID
```

---

## 🔧 Advanced Optimizations

### For Even Lower Costs:

1. **Regional Deployment**: Use closest region to users
2. **Request Batching**: Combine multiple API calls
3. **Caching**: Implement response caching
4. **Compression**: Enable gzip for responses
5. **Cold Start Optimization**: Minimize container size

### Future Upgrades (when needed):
- **Cloud SQL**: For better data persistence
- **Load Balancer**: For high traffic
- **CDN**: For global distribution
- **Multi-region**: For redundancy

---

## ✅ Success Metrics

After setup, you should see:
- ✅ Service automatically stops at midnight
- ✅ Service automatically starts at 7:01 AM
- ✅ Email alerts for budget thresholds
- ✅ 60-70% cost reduction
- ✅ All app features working normally during active hours

---

## 🎯 Next Steps

1. **Monitor First Month**: Track actual vs estimated costs
2. **Adjust Schedule**: Modify active hours if needed
3. **Fine-tune Resources**: Adjust memory/CPU based on usage
4. **Set Up Monitoring**: Add custom metrics for your app

Your DocQA app is now **production-ready** and **cost-optimized**! 🚀💰
