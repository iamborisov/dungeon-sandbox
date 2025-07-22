# Railway Deployment Guide

Complete guide to deploy your Telegram Gaussian Splat Viewer to Railway.

## Quick Deploy (Automated)

```bash
# One-command deployment
node deploy-railway.js
```

This script will:
- Install Railway CLI if needed
- Set up git repository
- Deploy to Railway
- Provide your app URL
- Show next steps

## Manual Railway Setup

### Prerequisites

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Create Railway account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub/Google

### Step 1: Login to Railway

```bash
railway login
```

This opens your browser for authentication.

### Step 2: Initialize Git (if not done)

```bash
git init
git add .
git commit -m "Initial commit"
```

### Step 3: Create Railway Project

```bash
# Create new project
railway project new

# Or link to existing project
railway link
```

### Step 4: Deploy

```bash
railway up
```

### Step 5: Get Your App URL

```bash
railway domain
```

## Railway Configuration Files

The project includes these Railway-specific files:

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `nixpacks.toml`
- Specifies Node.js 18.x
- Configures npm install
- Sets start command

### `.railwayignore`
- Excludes development files
- Keeps deployment lean

## Environment Variables

Set environment variables in Railway dashboard or CLI:

```bash
# Set bot token (optional for webhook)
railway variables set BOT_TOKEN=your_bot_token_here

# Set custom port (Railway auto-assigns PORT)
railway variables set NODE_ENV=production
```

## Post-Deployment Setup

1. **Get your Railway URL**
   ```bash
   railway domain
   # Output: https://your-app-name.up.railway.app
   ```

2. **Configure your bot**
   ```bash
   # Copy config template
   cp bot-config.example.js bot-config.js
   
   # Edit bot-config.js with your details
   # Set APP_URL to your Railway URL
   
   # Configure bot automatically
   npm run setup-bot
   ```

3. **Create Telegram Mini App**
   - Open [@BotFather](https://t.me/botfather)
   - Send `/newapp`
   - Select your bot
   - Set Web App URL to your Railway URL
   - Add title, description, icon

## Railway Dashboard Features

Access at [railway.app/dashboard](https://railway.app/dashboard):

- **Deployments**: View deployment history and logs
- **Metrics**: Monitor CPU, memory, network usage
- **Variables**: Manage environment variables
- **Settings**: Configure custom domains, scaling
- **Logs**: Real-time application logs

## Useful Railway Commands

```bash
# View logs
railway logs

# Open app in browser
railway domain --open

# Check deployment status
railway status

# Redeploy
railway up

# Environment variables
railway variables
railway variables set KEY=value
railway variables delete KEY

# Connect to database (if added)
railway connect

# Local development with Railway env
railway run npm start
```

## Custom Domain Setup

1. **In Railway Dashboard**
   - Go to your project
   - Navigate to Settings → Domains
   - Add your custom domain

2. **DNS Configuration**
   - Add CNAME record pointing to Railway
   - Railway provides the target

3. **Update bot configuration**
   - Update `APP_URL` in bot-config.js
   - Re-run bot setup: `npm run setup-bot`
   - Update Mini App URL in BotFather

## Scaling and Performance

Railway automatically scales based on usage:

- **Starter Plan**: 500 hours/month, $5/month after
- **Developer Plan**: $20/month, more resources
- **Team Plan**: $20/user/month, collaboration features

For high traffic:
- Monitor metrics in dashboard
- Consider upgrading plan
- Optimize mobile settings in app

## Troubleshooting

### Common Issues:

1. **Deployment fails**
   ```bash
   # Check logs
   railway logs
   
   # Verify files
   railway status
   
   # Redeploy
   railway up
   ```

2. **App not accessible**
   ```bash
   # Check domain
   railway domain
   
   # Verify deployment
   railway status
   
   # Check logs for errors
   railway logs --tail
   ```

3. **Bot webhook not working**
   ```bash
   # Check webhook status
   npm run check-webhook
   
   # Verify Railway URL is accessible
   curl https://your-app.up.railway.app/health
   
   # Update webhook URL
   npm run setup-bot
   ```

4. **Environment variables**
   ```bash
   # List all variables
   railway variables
   
   # Add missing variables
   railway variables set BOT_TOKEN=your_token
   ```

### Debug Steps:

1. **Check Railway logs**
   ```bash
   railway logs --tail
   ```

2. **Test locally first**
   ```bash
   npm start
   # Visit http://localhost:3000
   ```

3. **Verify build process**
   ```bash
   railway logs --deployment
   ```

4. **Check health endpoint**
   ```bash
   curl https://your-app.up.railway.app/health
   ```

## Railway vs Other Platforms

| Feature | Railway | Heroku | Vercel |
|---------|---------|--------|--------|
| Setup | Simple CLI | Git-based | Git-based |
| Pricing | Usage-based | Dyno hours | Function calls |
| Scaling | Automatic | Manual/Auto | Automatic |
| Databases | Built-in | Add-ons | External |
| WebSockets | ✅ Yes | ✅ Yes | ❌ No |
| Node.js | ✅ Yes | ✅ Yes | ✅ Yes |

Railway is ideal for this project because:
- Simple deployment process
- Automatic HTTPS
- Built-in domain management
- Excellent for WebGL/3D apps
- Good for Telegram bots with webhooks

## Getting Help

- **Railway Docs**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app/
- **This Project Issues**: Check README.md for troubleshooting