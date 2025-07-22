#!/usr/bin/env node

// deploy-complete.js - Complete end-to-end deployment automation
// Run with: node deploy-complete.js <TG_TOKEN>

const { execSync } = require('child_process');
const https = require('https');

const TG_TOKEN = process.argv[2];

if (!TG_TOKEN) {
  console.error('❌ Usage: node deploy-complete.js <TG_TOKEN>');
  console.error('   Get your token from @BotFather in Telegram');
  process.exit(1);
}

console.log('🚀 Complete Telegram Gaussian Splat Viewer Deployment\n');

function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    throw error;
  }
}

function runCommandSilent(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

// Helper function for Telegram API calls
function telegramAPI(method, data = {}) {
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

async function validateToken() {
  console.log('🔐 Validating Telegram bot token...');
  try {
    const botInfo = await telegramAPI('getMe');
    console.log(`✅ Bot validated: @${botInfo.username} (${botInfo.first_name})\n`);
    return botInfo;
  } catch (error) {
    console.error('❌ Invalid bot token:', error.message);
    console.error('   Get a valid token from @BotFather in Telegram');
    process.exit(1);
  }
}

function commitChanges() {
  console.log('📁 Preparing git repository...');
  
  // Add all changes
  runCommandSilent('git add .');
  
  // Check if there are changes to commit
  const status = runCommandSilent('git status --porcelain');
  if (status && status.trim()) {
    runCommand('git commit -m "Deploy Telegram Gaussian Splat Viewer with runtime bot setup"', 'Committing changes');
  } else {
    console.log('✅ Repository is up to date\n');
  }
}

async function deployToRailway() {
  console.log('🚂 Deploying to Railway...');
  
  try {
    // Check Railway authentication
    const whoami = runCommandSilent('railway whoami');
    if (!whoami) {
      console.log('🔐 Railway authentication required...');
      runCommand('railway login', 'Logging in to Railway');
    } else {
      console.log(`✅ Railway authenticated: ${whoami.trim()}`);
    }
    
    // Check if project is linked
    const status = runCommandSilent('railway status');
    if (!status || status.includes('not linked')) {
      console.log('🔗 Linking Railway project...');
      // Try to use existing dungeon-sandbox project
      runCommand('railway link dungeon-sandbox --environment production', 'Linking to Railway project');
    }
    
    // Set environment variable
    console.log('⚙️ Setting environment variables...');
    runCommand(`railway variables set TG_TOKEN="${TG_TOKEN}"`, 'Setting TG_TOKEN');
    
    // Deploy
    console.log('📤 Deploying to Railway...');
    runCommand('railway up', 'Deploying application');
    
    // Get domain
    console.log('🌐 Getting deployment URL...');
    const domain = runCommandSilent('railway domain');
    
    if (domain && domain.trim()) {
      const appUrl = domain.trim();
      console.log(`✅ App deployed at: ${appUrl}\n`);
      
      // Set APP_URL environment variable
      runCommand(`railway variables set APP_URL="${appUrl}"`, 'Setting APP_URL');
      runCommand(`railway variables set WEBHOOK_URL="${appUrl}/webhook"`, 'Setting WEBHOOK_URL');
      
      return appUrl;
    } else {
      console.log('⚠️ Could not get deployment URL automatically');
      console.log('   Run "railway domain" to get your app URL\n');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Railway deployment failed:', error.message);
    console.log('\n🆘 Manual Railway steps:');
    console.log('1. Run: railway login');
    console.log('2. Run: railway up');
    console.log('3. Run: railway domain');
    console.log('4. Set environment variables in Railway dashboard');
    throw error;
  }
}

async function setupBot(appUrl, botInfo) {
  if (!appUrl) {
    console.log('⚠️ App URL not available, skipping automatic bot setup');
    return;
  }
  
  console.log('🤖 Setting up Telegram bot...');
  
  try {
    // Set bot commands
    const commands = [
      { command: 'start', description: 'Launch the Gaussian Splat Viewer' },
      { command: 'help', description: 'Get help with the app' }
    ];
    
    await telegramAPI('setMyCommands', { commands });
    console.log('✅ Bot commands configured');
    
    // Set bot description
    await telegramAPI('setMyDescription', {
      description: 'View 3D Gaussian splats with touch controls and mobile optimization'
    });
    console.log('✅ Bot description set');
    
    // Set webhook
    const webhookUrl = `${appUrl}/webhook`;
    await telegramAPI('setWebhook', { url: webhookUrl });
    console.log(`✅ Webhook configured: ${webhookUrl}`);
    
    console.log('\n🎉 Bot setup completed!\n');
    
  } catch (error) {
    console.error('❌ Bot setup failed:', error.message);
    console.log('   Bot can be configured manually later via the app endpoints');
  }
}

function showFinalInstructions(appUrl, botInfo) {
  console.log('🎉 DEPLOYMENT COMPLETE!\n');
  
  console.log('📱 Your Telegram Gaussian Splat Viewer is ready:');
  console.log(`   🤖 Bot: @${botInfo.username}`);
  if (appUrl) {
    console.log(`   🌐 App URL: ${appUrl}`);
  }
  console.log('   💎 Features: 3D Gaussian splat viewer with mobile optimization');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Open Telegram and find your bot');
  console.log('2. Send /start to launch the Mini App');
  console.log('3. The 3D viewer will open in Telegram');
  
  if (!appUrl) {
    console.log('\n⚠️  Manual steps needed:');
    console.log('1. Run "railway domain" to get your app URL');
    console.log('2. Visit your app URL + "/setup-bot" to configure the bot');
  }
  
  console.log('\n🔧 App Endpoints:');
  if (appUrl) {
    console.log(`   ${appUrl}/health - Health check`);
    console.log(`   ${appUrl}/bot-info - Bot information`);
    console.log(`   ${appUrl}/setup-bot - Manual bot setup`);
  }
  
  console.log('\n🎯 To create a Mini App in Telegram (if not working):');
  console.log('1. Send /newapp to @BotFather');
  console.log('2. Select your bot');
  console.log('3. Enter app details and your Railway URL');
  
  console.log('\n✨ Enjoy your 3D Gaussian splat viewer!');
}

async function main() {
  try {
    // Validate token first
    const botInfo = await validateToken();
    
    // Prepare repository
    commitChanges();
    
    // Deploy to Railway
    const appUrl = await deployToRailway();
    
    // Setup bot
    await setupBot(appUrl, botInfo);
    
    // Show final instructions
    showFinalInstructions(appUrl, botInfo);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\n🆘 Get help:');
    console.error('1. Check your internet connection');
    console.error('2. Verify your Telegram bot token');
    console.error('3. Ensure Railway CLI is installed');
    console.error('4. Try the manual deployment steps in DEPLOY_NOW.md');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}