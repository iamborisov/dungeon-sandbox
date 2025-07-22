# Manual Railway Deployment Steps

Since the automated script requires interactive input, here are the manual steps to deploy your Telegram Gaussian Splat viewer:

## 🚂 Deploy to Railway (Manual Steps)

### Step 1: Access Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Sign in with your account (iamborisov@gmail.com)
3. You should see your "dungeon-sandbox" project

### Step 2: Create New Project for This App
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not already connected
4. **OR** select "Empty Project" to deploy directly

### Step 3: Deploy via GitHub (Recommended)

**Option A: GitHub Deployment**
1. Push this code to a GitHub repository:
   ```bash
   # If you don't have a GitHub repo, create one first
   git remote add origin https://github.com/yourusername/telegram-gaussian-splat.git
   git push -u origin master
   ```
2. In Railway dashboard, select "Deploy from GitHub repo"
3. Choose your repository
4. Railway will automatically detect it's a Node.js project
5. Click "Deploy"

**Option B: Direct Upload**
1. In Railway dashboard, click "New Project"
2. Select "Empty Project"
3. Click on the new project
4. Click "Add Service"
5. Select "GitHub Repo" or "Empty Service"
6. If Empty Service, you'll need to connect via CLI later

### Step 4: CLI Deployment (Alternative)
```bash
# In your local terminal (not in this environment):
railway login
railway init  # Select existing or create new project
railway up    # This will deploy your code
```

### Step 5: Get Your App URL
After deployment:
1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Settings" → "Domains"
4. Click "Generate Domain" to get a Railway subdomain
5. Copy the URL (e.g., `https://yourapp-production-xxxx.up.railway.app`)

### Step 6: Configure Your Bot
1. Copy the configuration template:
   ```bash
   cp bot-config.example.js bot-config.js
   ```

2. Edit `bot-config.js` with your details:
   ```javascript
   module.exports = {
     BOT_TOKEN: 'your_bot_token_from_botfather',
     APP_URL: 'https://yourapp-production-xxxx.up.railway.app',
     // ... other settings
   }
   ```

3. Run the bot setup:
   ```bash
   npm run setup-bot
   ```

### Step 7: Create Telegram Mini App
1. Open [@BotFather](https://t.me/botfather) in Telegram
2. Send `/newapp`
3. Select your bot
4. Enter app details:
   - Title: "Gaussian Splat Viewer"
   - Description: "View 3D Gaussian splats with mobile controls"
   - Upload icon (512x512 PNG)
   - **Web App URL**: Your Railway URL from Step 5
5. Send the preview GIF/photo (optional)

### Step 8: Test Your Mini App
1. Find your bot in Telegram
2. Send `/start`
3. The Mini App should open
4. Test the 3D viewer functionality

## 🔧 Quick GitHub Repository Setup

If you need to create a GitHub repository:

```bash
# Initialize git (already done)
git status

# Create repository on GitHub.com first, then:
git remote add origin https://github.com/yourusername/telegram-gaussian-splat.git
git push -u origin master
```

## 🌐 Your App is Ready!

All files are prepared and committed:
- ✅ Express server with security headers
- ✅ Telegram Web App integration
- ✅ Babylon.js 3D viewer with mobile optimizations
- ✅ Railway configuration files
- ✅ Bot setup automation
- ✅ Complete documentation

## 📱 What You'll Get:

1. **Railway URL**: `https://yourapp-production-xxxx.up.railway.app`
2. **Telegram Mini App**: Accessible through your bot
3. **Mobile-optimized**: Touch controls, theme integration
4. **Production-ready**: HTTPS, security headers, compression

## 🆘 If You Need Help:

1. **Railway Issues**: Check [Railway Status](https://status.railway.app/)
2. **Bot Issues**: Use `/setwebhook` with your Railway URL
3. **App Issues**: Check Railway logs in the dashboard
4. **Local Testing**: Run `npm start` and visit `http://localhost:3000`

The app is fully prepared and ready to deploy! 🚀