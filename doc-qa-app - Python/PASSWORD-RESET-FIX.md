# 🔐 Password Reset Production Fix Guide

## ❌ **Issue Identified**
The password reset emails were hardcoded to use `http://localhost:3001` instead of the actual frontend URL.

## ✅ **Fix Applied**

### Backend Changes:
1. **Dynamic Frontend URL**: Updated `auth_routes.py` to use environment variable
2. **Environment Configuration**: Added `FRONTEND_URL` to production config
3. **Deployment Script**: Updated to set correct frontend URL after deployment

### Code Changes Made:
```python
# Before (hardcoded):
reset_url = f"http://localhost:3001/auth/reset-password?token={reset_token}"

# After (dynamic):
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
reset_url = f"{frontend_url}/auth/reset-password?token={reset_token}"
```

## 🚀 **Production Deployment Process**

The deployment now follows this sequence:

1. **Deploy Backend** → Gets backend URL
2. **Deploy Frontend** → Gets frontend URL  
3. **Update Backend** → Sets frontend URL in backend environment
4. **✅ Password Reset Works** → Emails contain correct frontend URL

### Environment Variables Set:
```bash
# Production Backend Environment:
FRONTEND_URL=https://your-app.vercel.app
RESEND_API_KEY=re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg
# ... other variables
```

## 🧪 **Local Development Setup**

### For Local Testing:
```bash
# 1. Copy environment file
cp .env.development .env

# 2. Start backend (port 8000)
uvicorn backend_api:app --reload

# 3. Start frontend (port 3000)
cd ../docspotlight-NextJs
npm run dev

# 4. Test password reset
./test-password-reset.sh
```

### Local Environment (`.env`):
```bash
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg
# ... other variables
```

## ✅ **Production Ready Features**

### Password Reset Flow:
1. **User requests reset** → Frontend calls `/auth/forgot-password`
2. **Backend sends email** → Uses correct production frontend URL
3. **User clicks link** → Opens production frontend reset page
4. **User resets password** → Frontend calls `/auth/reset-password`

### URLs in Production:
- **Email Link**: `https://your-app.vercel.app/auth/reset-password?token=...`
- **Backend API**: `https://your-backend.run.app/auth/forgot-password`
- **Frontend Page**: `https://your-app.vercel.app/auth/reset-password`

## 🔧 **Deployment Commands**

### Automatic (Recommended):
```bash
./deploy-all.sh
```
This handles the frontend URL configuration automatically.

### Manual:
```bash
# 1. Deploy backend
./deploy-gcp.sh

# 2. Deploy frontend
cd ../docspotlight-NextJs
vercel --prod

# 3. Update backend with frontend URL
gcloud run services update doc-qa-backend \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=https://YOUR-VERCEL-URL"
```

## 🧪 **Testing in Production**

After deployment, test the complete flow:

1. **Register/Login** → Verify auth works
2. **Request Password Reset** → Check email received
3. **Click Email Link** → Should open correct production URL
4. **Reset Password** → Verify form works
5. **Login with New Password** → Confirm reset worked

## 📧 **Email Template**

The reset email now dynamically generates:
```html
<a href="https://your-production-frontend.vercel.app/auth/reset-password?token=...">
    Reset Your Password
</a>
```

## 🎯 **Verification Checklist**

Before going live, verify:

- ✅ `FRONTEND_URL` environment variable set in Cloud Run
- ✅ Frontend reset page exists and works
- ✅ Backend forgot-password endpoint working
- ✅ Email service (Resend) configured
- ✅ CORS allows frontend domain
- ✅ Test complete password reset flow

## 🚀 **Ready for Production!**

The password reset functionality is now **production-ready** with:
- ✅ Dynamic frontend URL configuration
- ✅ Proper environment variable handling
- ✅ Automated deployment setup
- ✅ Complete local development support

Deploy with confidence! 🎉
