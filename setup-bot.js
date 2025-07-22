#!/usr/bin/env node

// setup-bot.js - Script to automatically configure your Telegram bot
// Run with: node setup-bot.js

const https = require('https');
const fs = require('fs');

// Load configuration
let config;
try {
  config = require('./bot-config.js');
} catch (error) {
  console.error('❌ bot-config.js not found. Copy bot-config.example.js to bot-config.js and fill in your values.');
  process.exit(1);
}

const BOT_TOKEN = config.BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ Please set your BOT_TOKEN in bot-config.js');
  process.exit(1);
}

// Helper function to make API calls
function telegramAPI(method, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
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

async function setupBot() {
  console.log('🤖 Setting up Telegram Bot...\n');

  try {
    // Get bot info
    console.log('📋 Getting bot information...');
    const botInfo = await telegramAPI('getMe');
    console.log(`✅ Bot: @${botInfo.username} (${botInfo.first_name})`);

    // Set bot commands
    if (config.BOT_CONFIG.commands) {
      console.log('\n⚙️  Setting bot commands...');
      await telegramAPI('setMyCommands', {
        commands: config.BOT_CONFIG.commands
      });
      console.log('✅ Commands set successfully');
    }

    // Set bot description
    if (config.BOT_CONFIG.description) {
      console.log('\n📝 Setting bot description...');
      await telegramAPI('setMyDescription', {
        description: config.BOT_CONFIG.description
      });
      console.log('✅ Description set successfully');
    }

    // Set bot short description
    if (config.BOT_CONFIG.short_description) {
      console.log('\n📄 Setting bot short description...');
      await telegramAPI('setMyShortDescription', {
        short_description: config.BOT_CONFIG.short_description
      });
      console.log('✅ Short description set successfully');
    }

    // Set webhook (if configured)
    if (config.WEBHOOK_URL) {
      console.log('\n🔗 Setting webhook...');
      await telegramAPI('setWebhook', {
        url: config.WEBHOOK_URL
      });
      console.log('✅ Webhook set successfully');
    }

    console.log('\n🎉 Bot setup completed successfully!');
    console.log('\n📱 Next steps:');
    console.log('1. Use BotFather to create a Mini App (/newapp)');
    console.log(`2. Set the Web App URL to: ${config.APP_URL}`);
    console.log('3. Test your bot by sending /start');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.message.includes('Unauthorized')) {
      console.error('\n💡 Make sure your BOT_TOKEN is correct');
    } else if (error.message.includes('Bad Request')) {
      console.error('\n💡 Check your configuration values');
    }
    
    process.exit(1);
  }
}

// Check if webhook is working
async function checkWebhook() {
  try {
    console.log('\n🔍 Checking webhook status...');
    const webhookInfo = await telegramAPI('getWebhookInfo');
    
    console.log(`📍 Webhook URL: ${webhookInfo.url || 'Not set'}`);
    console.log(`📊 Pending updates: ${webhookInfo.pending_update_count}`);
    
    if (webhookInfo.last_error_date) {
      console.log(`❌ Last error: ${webhookInfo.last_error_message}`);
    } else {
      console.log('✅ Webhook is working correctly');
    }
  } catch (error) {
    console.error('❌ Could not check webhook:', error.message);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkWebhook();
  } else {
    setupBot();
  }
}

module.exports = { setupBot, checkWebhook, telegramAPI };