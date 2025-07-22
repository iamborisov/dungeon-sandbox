# 🚀 Complete Setup - Final Steps

Your Railway service "dungeon-sandbox" is now connected! Here's how to finish the setup:

## 1. 🔧 Set Environment Variables in Railway Dashboard

Go to your Railway dashboard → dungeon-sandbox service → Variables tab:

```
TG_TOKEN=your_bot_token_from_botfather
APP_URL=https://your-service-url.up.railway.app
WEBHOOK_URL=https://your-service-url.up.railway.app/webhook
```

**To get your bot token:**
1. Message [@BotFather](https://t.me/botfather)
2. Send `/newbot` (or `/token` if you have existing bot)
3. Copy the token (looks like: `123456789:ABCdef...`)

## 2. 🌐 Get Your Service URL

In Railway dashboard → dungeon-sandbox service → Settings → Domains:
- If no domain exists, click "Generate Domain"
- Copy the URL (e.g., `https://dungeon-sandbox-production-xxxx.up.railway.app`)
- Use this URL for `APP_URL` above

## 3. ✅ Test Your Deployment

After setting environment variables, visit these URLs:

**Health Check:**
```
https://your-service-url.up.railway.app/health
```
Should return: `{"status":"ok","bot_configured":true}`

**Bot Info:**
```
https://your-service-url.up.railway.app/bot-info
```
Should return your bot details and webhook info

## 4. 📱 Create Telegram Mini App

1. **Open [@BotFather](https://t.me/botfather)**
2. **Send**: `/newapp`
3. **Select your bot**
4. **Fill in details**:
   - **Title**: Gaussian Splat Viewer
   - **Description**: View 3D Gaussian splats with mobile controls
   - **Photo**: Upload 640x360 image (optional)
   - **GIF/Video**: Upload demo (optional)
   - **Web App URL**: `https://your-service-url.up.railway.app`

## 5. 🎉 Test Your Bot!

1. **Find your bot in Telegram**
2. **Send**: `/start`
3. **Result**: Your 3D Gaussian splat viewer should open as a Mini App!

## 🔧 If Bot Setup Doesn't Work Automatically

Visit this endpoint to manually configure the bot:
```
https://your-service-url.up.railway.app/setup-bot
```

## 🎯 What You'll Get

- **3D Gaussian Splat Viewer** with Babylon.js
- **Touch Controls** optimized for mobile
- **Telegram Theme Integration** (adapts to user's theme)
- **Full Screen Experience** in Telegram
- **Loading States** and error handling
- **Performance Optimized** for mobile devices

## 📊 Expected Results

**Working correctly when:**
- Health endpoint shows `bot_configured: true`
- Bot responds to `/start` command
- Mini App opens in Telegram
- 3D viewer loads with placeholder scene
- Touch controls work for camera movement

Your Telegram Gaussian Splat Viewer is ready! 🚀

## 🆘 Troubleshooting

**If bot doesn't respond:**
- Check TG_TOKEN is set correctly
- Verify webhook is configured (check bot-info endpoint)
- Check Railway logs for errors

**If Mini App doesn't open:**
- Verify Web App URL in BotFather matches Railway domain
- Ensure HTTPS (Railway provides this automatically)

**If 3D viewer doesn't load:**
- Check browser console for WebGL support
- Mobile devices should work with the included optimizations