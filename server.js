const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://cdn.babylonjs.com"],
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

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoint for Telegram bot (optional)
app.post('/webhook', express.json(), (req, res) => {
  const update = req.body;
  
  // Log bot interactions for analytics
  if (update.message) {
    console.log(`Bot message from user ${update.message.from.id}: ${update.message.text}`);
    
    // You can handle specific commands here
    if (update.message.text === '/start') {
      // User started the bot - track this event
      console.log('User started the bot');
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

app.listen(PORT, () => {
  console.log(`Telegram Gaussian Splat Viewer running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
});