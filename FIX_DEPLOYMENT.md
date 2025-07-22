# 🚨 Fix Railway Deployment

The Railway CLI deployment had service linking issues. Here's how to deploy successfully:

## ✅ Quick Fix - Deploy via Railway Web Interface

### Step 1: Push to GitHub
```bash
# In your local terminal:
cd /path/to/tgsplat
git remote set-url origin https://github.com/iamborisov/telegram-gaussian-splat.git
git push -u origin master
```

### Step 2: Deploy from Railway Dashboard
1. **Go to [railway.app](https://railway.app)**
2. **Create New Project** → "Deploy from GitHub repo"
3. **Connect GitHub** if not already connected
4. **Select repository**: `telegram-gaussian-splat` (or create it first)
5. **Railway auto-detects Node.js** → Click "Deploy"

### Step 3: Set Environment Variables
In Railway dashboard → Your project → Variables:
```
TG_TOKEN=your_bot_token_here
APP_URL=https://your-app-name.up.railway.app
WEBHOOK_URL=https://your-app-name.up.railway.app/webhook
```

### Step 4: Get Your App URL
- Railway dashboard → Your service → Settings → Domains
- Generate domain or use the provided URL

### Step 5: Test the App
- Visit: `https://your-app-name.up.railway.app/health`
- Should return: `{"status":"ok","bot_configured":true}`

## 🤖 Auto Bot Setup

Once deployed with correct environment variables:
1. **Bot will auto-configure** (commands, description, webhook)
2. **Visit**: `https://your-app-name.up.railway.app/bot-info` to verify

## 📱 Create Telegram Mini App

1. **@BotFather** → `/newapp`
2. **Select your bot**
3. **Web App URL**: Your Railway app URL
4. **Test**: Send `/start` to your bot

## 🔧 Alternative: Fix Current Deployment

If you want to fix the existing `telegram-gaussian-splat` project:

1. **Railway Dashboard** → `telegram-gaussian-splat` project
2. **Add Service** → "GitHub Repo" → Connect this repository
3. **Set environment variables** as above
4. **Redeploy**

## ✅ App Status

The app is **fully functional**:
- ✅ Local testing confirmed working
- ✅ All code and configuration files ready
- ✅ Railway configuration files present
- ✅ Automatic bot setup included
- ✅ Mobile-optimized 3D viewer ready

**Issue**: Railway CLI service linking in non-interactive environment
**Solution**: Deploy via Railway web interface

Your Telegram Gaussian Splat Viewer is ready to go! 🚀