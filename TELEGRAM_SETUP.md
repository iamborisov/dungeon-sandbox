# Telegram Bot Setup Guide

This guide will help you create a Telegram bot and configure it as a Mini App for the Gaussian Splat Viewer.

## Step 1: Create a Telegram Bot

1. **Start a chat with BotFather**
   - Open Telegram and search for `@BotFather`
   - Start a chat and send `/start`

2. **Create a new bot**
   ```
   /newbot
   ```
   - Choose a name for your bot (e.g., "Gaussian Splat Viewer")
   - Choose a username (must end with 'bot', e.g., "gsplat_viewer_bot")
   - Save the bot token provided by BotFather (you'll need this later)

## Step 2: Create the Mini App

1. **Create a new Mini App**
   ```
   /newapp
   ```
   - Select your bot from the list
   - Choose a title for your Mini App (e.g., "Splat Viewer")
   - Provide a description (e.g., "View 3D Gaussian splats in your browser")
   - Upload an icon (512x512 PNG recommended)
   - Enter your Web App URL (see deployment section below)
   - Choose GIF/video preview (optional but recommended)

2. **Additional Mini App Settings**
   ```
   /editapp
   ```
   - Select your bot and app
   - You can modify title, description, icon, or URL later

## Step 3: Deploy Your App

### Option A: Quick Deploy with Railway

1. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway deploy
   ```
   
2. **Get your app URL from Railway dashboard**

### Option B: Deploy to Heroku

1. **Create Heroku app**
   ```bash
   # Install Heroku CLI, then:
   heroku create your-app-name
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

2. **Your app URL will be**: `https://your-app-name.herokuapp.com`

### Option C: Deploy to Render

1. Connect your GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Your app URL will be provided by Render

## Step 4: Configure the Mini App URL

1. **Go back to BotFather**
   ```
   /editapp
   ```
   - Select your bot
   - Select your app
   - Choose "Edit Web App URL"
   - Enter your deployed app URL (e.g., `https://your-app.herokuapp.com`)

## Step 5: Configure Bot Commands (Optional)

1. **Set bot commands**
   ```
   /setcommands
   ```
   - Select your bot
   - Enter commands:
   ```
   start - Launch the Gaussian Splat Viewer
   help - Get help with the app
   ```

2. **Set bot description**
   ```
   /setdescription
   ```
   - Select your bot
   - Enter: "View 3D Gaussian splats with touch controls and mobile optimization"

## Step 6: Test Your Mini App

1. **Find your bot in Telegram**
   - Search for your bot's username
   - Send `/start` to launch the Mini App
   - The app should open in Telegram's in-app browser

2. **Test on different devices**
   - Mobile phones (iOS/Android)
   - Desktop Telegram
   - Telegram Web

## Step 7: Bot Integration Features

Your Mini App automatically gets these Telegram features:

- **Theme Integration**: Adapts to user's Telegram theme
- **Main Button**: Shows loading status and actions
- **Back Button**: Handles navigation
- **Haptic Feedback**: Provides tactile responses
- **Full Screen**: Expands to use full webview space

## Advanced Configuration

### Custom Bot Responses

Add this to your `server.js` to handle bot commands:

```javascript
// Add webhook endpoint for bot updates
app.post('/webhook', express.json(), (req, res) => {
  const update = req.body;
  
  if (update.message && update.message.text === '/start') {
    // User started the bot - you could send welcome message
    // or analytics tracking here
  }
  
  res.status(200).send('OK');
});
```

### Analytics Integration

Track Mini App usage:

```javascript
// Add to your index.html
if (tg) {
  // Track when app opens
  fetch('/analytics/open', {
    method: 'POST',
    body: JSON.stringify({
      userId: tg.initDataUnsafe?.user?.id,
      platform: tg.platform
    })
  });
}
```

## Troubleshooting

### Common Issues:

1. **"Mini App not found"**
   - Check that your URL is correctly set in BotFather
   - Ensure your server is running and accessible
   - Verify HTTPS is working (required for Mini Apps)

2. **App doesn't load**
   - Check browser console for errors
   - Verify CSP headers allow Telegram domains
   - Test your app URL directly in a browser

3. **Telegram integration not working**
   - Ensure `telegram-web-app.js` is loaded
   - Check that `window.Telegram.WebApp` is available
   - Verify you're calling `tg.ready()` after page load

4. **Performance issues on mobile**
   - Mobile optimizations are already included
   - Consider reducing 3D scene complexity
   - Monitor using Babylon.js inspector

### Getting Help:

- Telegram Mini Apps documentation: https://core.telegram.org/bots/webapps
- BotFather commands: https://core.telegram.org/bots#botfather
- This project's README.md for technical details

## Security Notes:

- Never expose your bot token in client-side code
- Use HTTPS for all Mini App URLs (required by Telegram)
- Validate user data received from Telegram
- Consider rate limiting for production use