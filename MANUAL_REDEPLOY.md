# 🔄 Manual Railway Redeploy Instructions

Since Railway didn't auto-deploy from GitHub, here's how to manually trigger the redeploy:

## 🎯 Method 1: Railway Dashboard (Recommended)

1. **Go to [railway.app](https://railway.app)**
2. **Open your project** (dungeon-sandbox or telegram-gaussian-splat)
3. **Click on the service** that's connected to GitHub
4. **Go to "Deployments" tab**
5. **Click "Deploy Latest Commit"** or the redeploy button
6. **Wait for build to complete** (2-5 minutes)

## 🎯 Method 2: Force Deploy via Source Tab

1. **Railway Dashboard** → Your project
2. **Service Settings** → "Source" tab
3. **Click "Deploy"** or "Redeploy"
4. **Select latest commit** from GitHub

## 🎯 Method 3: Reconnect GitHub (If needed)

If auto-deploy isn't working:
1. **Service Settings** → "Source" tab
2. **Disconnect GitHub** (if connected)
3. **Reconnect GitHub repository**: `iamborisov/dungeon-sandbox`
4. **Enable auto-deploy** on push
5. **Manually deploy first time**

## ✅ After Successful Redeploy

Test the deployment:
```bash
curl https://dungeon-sandbox-production.up.railway.app/health
```

Should return:
```json
{"status":"ok","bot_configured":false}
```

## 🔧 Then Set Environment Variables

Railway Dashboard → Variables:
```
TG_TOKEN=your_bot_token_from_botfather
APP_URL=https://dungeon-sandbox-production.up.railway.app
WEBHOOK_URL=https://dungeon-sandbox-production.up.railway.app/webhook
```

## 🤖 Get Bot Token

Message [@BotFather](https://t.me/botfather):
- `/newbot` (create new) or `/token` (existing bot)
- Copy the token: `123456789:ABCdef...`

## 🎉 Final Test

After setting TG_TOKEN:
```bash
curl https://dungeon-sandbox-production.up.railway.app/health
```

Should return:
```json
{"status":"ok","bot_configured":true}
```

Then create Mini App in BotFather and test!

---

**Current Status**: Need manual redeploy in Railway dashboard
**Next**: Trigger redeploy → Set TG_TOKEN → Create Mini App → Test bot