const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const TG_TOKEN = process.env.TG_TOKEN;

// Bot configuration
const BOT_CONFIG = {
  token: TG_TOKEN,
  baseUrl: process.env.APP_URL || `http://localhost:${PORT}`,
  webhookUrl: process.env.WEBHOOK_URL || `${process.env.APP_URL || `http://localhost:${PORT}`}/webhook`
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://telegram.org",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com", 
        "https://threejs.org"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// Serve src directory for modular architecture
app.use('/src', express.static(path.join(__dirname, 'src'), {
  maxAge: '1h',
  etag: true
}));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bot_configured: !!TG_TOKEN,
    app_url: BOT_CONFIG.baseUrl
  });
});

// Assets directory listing function
function getAssetsListing(req, res) {
  const fs = require('fs');
  const assetsPath = path.join(__dirname, 'assets');
  
  try {
    function getDirectoryContents(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const contents = [];
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const relativeItemPath = path.join(relativePath, item.name).replace(/\\/g, '/');
        
        if (item.isDirectory()) {
          contents.push({
            name: item.name,
            type: 'directory',
            path: `/assets/${relativeItemPath}`,
            children: getDirectoryContents(itemPath, relativeItemPath)
          });
        } else {
          const stats = fs.statSync(itemPath);
          contents.push({
            name: item.name,
            type: 'file',
            path: `/assets/${relativeItemPath}`,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
      
      return contents;
    }
    
    const contents = getDirectoryContents(assetsPath);
    
    res.json({
      path: '/assets',
      contents: contents,
      total_files: contents.filter(item => item.type === 'file').length,
      total_directories: contents.filter(item => item.type === 'directory').length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read assets directory',
      message: error.message 
    });
  }
}

// Assets directory listing endpoints (handle both with and without trailing slash)
app.get('/assets', getAssetsListing);
app.get('/assets/', getAssetsListing);

// Serve assets directory for .ply files, textures, models, etc.
// This comes after the listing endpoints so they take precedence
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '7d', // Cache assets longer since they change less frequently
  etag: true,
  // Add proper MIME types for 3D files
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.ply')) {
      res.setHeader('Content-Type', 'application/octet-stream');
    } else if (filePath.endsWith('.splat')) {
      res.setHeader('Content-Type', 'application/octet-stream');
    } else if (filePath.endsWith('.glb') || filePath.endsWith('.gltf')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  }
}));

// Webhook endpoint for Telegram bot (optional)
app.post('/webhook', express.json(), async (req, res) => {
  const update = req.body;
  
  // Log bot interactions for analytics
  if (update.message) {
    console.log(`Bot message from user ${update.message.from.id}: ${update.message.text}`);
    
    // Handle specific commands
    if (update.message.text === '/start') {
      console.log('User started the bot');
      
      try {
        // Send welcome message with inline keyboard to launch the app
        await telegramAPI('sendMessage', {
          chat_id: update.message.chat.id,
          text: '🌟 Welcome to Gaussian Splat Viewer!\n\nExperience 3D Gaussian splats with mobile-optimized controls.',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🚀 Launch 3D Viewer',
                web_app: { url: BOT_CONFIG.baseUrl }
              }
            ]]
          }
        });
      } catch (error) {
        console.error('Failed to send welcome message:', error);
      }
    } else if (update.message.text === '/help') {
      try {
        await telegramAPI('sendMessage', {
          chat_id: update.message.chat.id,
          text: '🔧 Gaussian Splat Viewer Help\n\n' +
                '• Use /start to launch the 3D viewer\n' +
                '• Touch and drag to rotate the view\n' +
                '• Pinch to zoom in/out\n' +
                '• Use the quality toggle for performance\n\n' +
                'Optimized for mobile devices with WebGL support.'
        });
      } catch (error) {
        console.error('Failed to send help message:', error);
      }
    }
  }
  
  // Always respond with 200 to acknowledge receipt
  res.status(200).send('OK');
});

// Handle 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

// Helper function for Telegram API calls
function telegramAPI(method, data = {}) {
  if (!TG_TOKEN) {
    return Promise.reject(new Error('TG_TOKEN not configured'));
  }
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TG_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.ok) {
            resolve(result.result);
          } else {
            reject(new Error(result.description || 'API Error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Bot setup endpoint
app.post('/setup-bot', async (req, res) => {
  if (!TG_TOKEN) {
    return res.status(400).json({ error: 'TG_TOKEN not configured' });
  }

  try {
    console.log('🤖 Setting up Telegram bot...');
    
    // Get bot info
    const botInfo = await telegramAPI('getMe');
    console.log(`✅ Bot: @${botInfo.username} (${botInfo.first_name})`);
    
    // Set bot commands
    const commands = [
      { command: 'start', description: 'Launch the Gaussian Splat Viewer' },
      { command: 'help', description: 'Get help with the app' }
    ];
    
    await telegramAPI('setMyCommands', { commands });
    console.log('✅ Bot commands set');
    
    // Set bot description
    await telegramAPI('setMyDescription', {
      description: 'View 3D Gaussian splats with touch controls and mobile optimization'
    });
    console.log('✅ Bot description set');
    
    // Set webhook
    if (BOT_CONFIG.webhookUrl && BOT_CONFIG.webhookUrl.startsWith('https://')) {
      await telegramAPI('setWebhook', { url: BOT_CONFIG.webhookUrl });
      console.log(`✅ Webhook set to: ${BOT_CONFIG.webhookUrl}`);
    }
    
    res.json({
      success: true,
      bot: botInfo,
      webhook_url: BOT_CONFIG.webhookUrl,
      app_url: BOT_CONFIG.baseUrl
    });
    
  } catch (error) {
    console.error('❌ Bot setup failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Bot info endpoint
app.get('/bot-info', async (req, res) => {
  if (!TG_TOKEN) {
    return res.status(400).json({ error: 'TG_TOKEN not configured' });
  }

  try {
    const botInfo = await telegramAPI('getMe');
    const webhookInfo = await telegramAPI('getWebhookInfo');
    
    res.json({
      bot: botInfo,
      webhook: webhookInfo,
      config: {
        app_url: BOT_CONFIG.baseUrl,
        webhook_url: BOT_CONFIG.webhookUrl
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Telegram Gaussian Splat Viewer running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
  
  // Auto-setup bot if token is provided
  if (TG_TOKEN) {
    try {
      console.log('\n🤖 Auto-configuring Telegram bot...');
      const botInfo = await telegramAPI('getMe');
      console.log(`✅ Bot connected: @${botInfo.username}`);
      
      // Auto-setup webhook if we have a proper URL
      if (BOT_CONFIG.webhookUrl && BOT_CONFIG.webhookUrl.startsWith('https://')) {
        setTimeout(async () => {
          try {
            await telegramAPI('setWebhook', { url: BOT_CONFIG.webhookUrl });
            console.log(`✅ Webhook automatically set to: ${BOT_CONFIG.webhookUrl}`);
          } catch (error) {
            console.log(`⚠️ Webhook setup will retry: ${error.message}`);
          }
        }, 5000); // Wait 5 seconds for server to be ready
      }
    } catch (error) {
      console.log(`⚠️ Bot setup will be available at /setup-bot: ${error.message}`);
    }
  } else {
    console.log('⚠️  TG_TOKEN not set - bot features disabled');
    console.log('   Set TG_TOKEN environment variable to enable bot integration');
  }
});