// bot-config.example.js
// Copy this file to bot-config.js and fill in your values

module.exports = {
  // Bot token from BotFather (required for webhook handling)
  BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
  
  // Your deployed app URL (must be HTTPS for production)
  APP_URL: 'https://your-app.herokuapp.com',
  
  // Webhook configuration (optional - for advanced bot features)
  WEBHOOK_URL: 'https://your-app.herokuapp.com/webhook',
  
  // Bot settings
  BOT_CONFIG: {
    // Bot commands visible in Telegram
    commands: [
      { command: 'start', description: 'Launch the Gaussian Splat Viewer' },
      { command: 'help', description: 'Get help with the app' }
    ],
    
    // Bot description
    description: 'View 3D Gaussian splats with touch controls and mobile optimization',
    
    // Bot short description
    short_description: 'Interactive 3D Gaussian splat viewer'
  },
  
  // Mini App configuration
  MINI_APP_CONFIG: {
    // App title shown in Telegram
    title: 'Gaussian Splat Viewer',
    
    // App description
    description: 'View 3D Gaussian splats in your browser with mobile-optimized controls',
    
    // Icon requirements: 512x512 PNG
    icon_path: './assets/app-icon-512.png',
    
    // Whether the app should open in full screen
    full_screen: true
  },
  
  // Analytics (optional)
  ANALYTICS: {
    enabled: false,
    // Add your analytics service config here
    // google_analytics_id: 'GA_MEASUREMENT_ID',
    // mixpanel_token: 'YOUR_MIXPANEL_TOKEN'
  }
};