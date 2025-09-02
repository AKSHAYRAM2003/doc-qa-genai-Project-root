# DocQA Production Deployment Guide

## 🚀 Quick Deployment

**For immediate deployment, run:**
```bash
./deploy-all.sh
```

This will deploy both backend and frontend automatically.

---

## 📋 Manual Step-by-Step Deployment

### Prerequisites

1. **Google Cloud CLI**: Install and authenticate
   ```bash
   # Install gcloud CLI (if not installed)
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Authenticate
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project doc-qa-genai-469807
   ```

2. **Vercel CLI**: Install if not present
   ```bash
   npm install -g vercel
   vercel login
   ```

### Step 1: Deploy Backend to Google Cloud Run

```bash
cd "doc-qa-app - Python"
./deploy-gcp.sh
```

This will:
- Set up the GCP project (doc-qa-genai-469807)
- Enable required APIs
- Deploy the FastAPI app to Cloud Run
- Configure environment variables automatically

### Step 2: Deploy Frontend to Vercel

```bash
cd docspotlight-NextJs
vercel --prod
```

When prompted:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (for new deployment)
- Project name: **docspotlight** or your preferred name
- Override settings? **N**

---

## 🔧 Environment Variables Configured

### Backend (automatically set in Cloud Run):
- `GOOGLE_API_KEY`: AIzaSyBRRk5MrPlkd39N7309kokBonteZZdADd0
- `RESEND_API_KEY`: re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg
- `DATABASE_URL`: sqlite+aiosqlite:///./storage/app.db
- `JWT_SECRET_KEY`: Production secret key
- `ENVIRONMENT`: production

### Frontend (set in Vercel):
- `NEXT_PUBLIC_API_URL`: Your backend URL (auto-configured)

---

## 🔍 Post-Deployment Testing

### 1. Test Backend Health
```bash
curl https://your-backend-url.run.app/health
```

### 2. Test Authentication
```bash
curl -X POST https://your-backend-url.run.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 3. Test Frontend
- Visit your Vercel URL
- Try registration/login
- Upload a document
- Test chat functionality

---

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**: 
   - Check that frontend URL is added to ALLOWED_ORIGINS
   - Run: `gcloud run services update doc-qa-backend --region=us-central1 --update-env-vars="ALLOWED_ORIGINS=https://your-vercel-url.vercel.app"`

2. **Database Persistence**: 
   - Cloud Run uses ephemeral storage
   - Data persists during the container's lifetime
   - For permanent storage, consider Cloud SQL (optional upgrade)

3. **API Key Issues**:
   - Verify Google API key is active
   - Check Resend API key has proper permissions

4. **Build Failures**:
   - Check package.json dependencies
   - Ensure all environment variables are set

---

## 📊 Monitoring & Logs

### Backend Logs (Cloud Run):
```bash
gcloud logs read --service=doc-qa-backend --region=us-central1
```

### Frontend Logs (Vercel):
- Visit Vercel dashboard
- Go to your project > Functions tab
- View runtime logs

---

## 🔒 Security Considerations

1. **JWT Secret**: Change the default JWT secret key
2. **API Keys**: Rotate keys periodically
3. **CORS**: Keep ALLOWED_ORIGINS restricted to your domains
4. **HTTPS**: Both services use HTTPS by default

---

## 🎯 URLs After Deployment

After successful deployment, you'll have:

- **Backend API**: `https://doc-qa-backend-[hash].a.run.app`
- **Frontend**: `https://your-project-name.vercel.app`
- **API Documentation**: `https://doc-qa-backend-[hash].a.run.app/docs`

---

## 📈 Next Steps (Optional)

1. **Custom Domain**: Add custom domain in Vercel
2. **Cloud SQL**: Upgrade from SQLite to PostgreSQL
3. **CDN**: Enable Vercel's Edge Network
4. **Monitoring**: Set up Google Cloud Monitoring
5. **CI/CD**: Automate deployments with GitHub Actions
