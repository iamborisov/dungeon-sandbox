# 🚀 Railway Setup Steps - dungeon-sandbox-production.up.railway.app

Your app domain is ready! The app is currently showing a 404, which means either:
1. The deployment is still in progress
2. The service needs environment variables to start properly

## 📋 Complete Setup Checklist

### 1. 🔧 Set Environment Variables in Railway Dashboard

**Go to**: Railway Dashboard → dungeon-sandbox service → Variables tab

**Add these variables:**
```
TG_TOKEN=your_bot_token_from_botfather
APP_URL=https://dungeon-sandbox-production.up.railway.app
WEBHOOK_URL=https://dungeon-sandbox-production.up.railway.app/webhook
```

### 2. 🤖 Get Your Bot Token

**If you don't have a bot yet:**
1. Message [@BotFather](https://t.me/botfather) in Telegram
2. Send `/newbot`
3. Choose a name (e.g., "Gaussian Splat Viewer")
4. Choose a username (e.g., "gaussian_viewer_bot")
5. Copy the token (looks like: `123456789:ABCdefGHI...`)

**If you already have a bot:**
1. Message [@BotFather](https://t.me/botfather)
2. Send `/token`
3. Select your bot
4. Copy the token

### 3. ✅ Test After Setting Variables

Once you set the `TG_TOKEN` variable, test these endpoints:

**Health Check:**
```
https://dungeon-sandbox-production.up.railway.app/health
```
Should return: `{"status":"ok","bot_configured":true}`

**Bot Info:**
```
https://dungeon-sandbox-production.up.railway.app/bot-info
```
Should return your bot details

**Main App:**
```
https://dungeon-sandbox-production.up.railway.app/
```
Should show the 3D Gaussian Splat viewer

### 4. 📱 Create Telegram Mini App

**Once the app is responding:**
1. Message [@BotFather](https://t.me/botfather)
2. Send `/newapp`
3. Select your bot
4. Fill in:
   - **Title**: Gaussian Splat Viewer
   - **Description**: View 3D Gaussian splats with mobile controls
   - **Web App URL**: `https://dungeon-sandbox-production.up.railway.app`
   - **Photo**: Upload 640x360 image (optional)

### 5. 🎉 Test Your Bot!

1. Find your bot in Telegram
2. Send `/start`
3. Your 3D Gaussian Splat viewer should open as a Mini App!

## 🔍 Troubleshooting

**If app still shows 404 after setting variables:**
- Check Railway logs in dashboard
- Make sure the deployment completed successfully
- Verify the service is running

**If bot doesn't respond:**
- Double-check TG_TOKEN is set correctly
- Check the bot-info endpoint for errors
- Verify webhook configuration

**If Mini App doesn't open:**
- Ensure Web App URL matches exactly: `https://dungeon-sandbox-production.up.railway.app`
- No trailing slash, must be HTTPS

## 🎯 Expected Results

**Working correctly when:**
- ✅ Health endpoint returns `{"status":"ok","bot_configured":true}`
- ✅ Bot responds to `/start` with a Mini App
- ✅ 3D viewer loads with placeholder Gaussian splat scene
- ✅ Touch controls work for camera movement
- ✅ App adapts to Telegram's theme colors

## 🚨 Current Status

```
🌐 Domain: https://dungeon-sandbox-production.up.railway.app
🔄 App Status: 404 (needs TG_TOKEN to start properly)
📋 Next: Set environment variables in Railway dashboard
```

Your Telegram Gaussian Splat Viewer is ready - just needs the bot token! 🤖✨