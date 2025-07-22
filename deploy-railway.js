#!/usr/bin/env node

// deploy-railway.js - Automated Railway deployment script
// Run with: node deploy-railway.js

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Deployment Script for Telegram Gaussian Splat Viewer\n');

function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return output.trim();
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    throw error;
  }
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');
  
  // Check if railway CLI is installed
  try {
    runCommand('railway --version', 'Checking Railway CLI');
  } catch (error) {
    console.log('📦 Railway CLI not found. Installing...');
    try {
      runCommand('npm install -g @railway/cli', 'Installing Railway CLI');
      console.log('✅ Railway CLI installed successfully\n');
    } catch (installError) {
      console.error('❌ Failed to install Railway CLI. Please install manually:');
      console.error('   npm install -g @railway/cli');
      console.error('   or visit: https://docs.railway.app/develop/cli\n');
      process.exit(1);
    }
  }
  
  // Check if git is initialized
  try {
    runCommand('git status', 'Checking git repository');
  } catch (error) {
    console.log('📦 Initializing git repository...');
    runCommand('git init', 'Git init');
    
    // Create .gitignore if it doesn't exist
    const gitignoreContent = `# Dependencies
node_modules/

# Environment variables
.env
.env.local
bot-config.js

# Logs
logs/
*.log
npm-debug.log*

# Runtime data
pids/
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/
.nyc_output/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Railway
.railway/
`;
    
    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', gitignoreContent);
      console.log('✅ Created .gitignore file');
    }
  }
}

function setupGit() {
  console.log('\n📁 Preparing git repository...');
  
  try {
    // Add all files
    runCommand('git add .', 'Adding files to git');
    
    // Check if there are changes to commit
    try {
      const status = runCommand('git status --porcelain', 'Checking git status');
      if (status) {
        runCommand('git commit -m "Initial commit for Railway deployment"', 'Creating initial commit');
      } else {
        console.log('✅ No changes to commit - repository is up to date');
      }
    } catch (error) {
      // Might fail if already committed, that's OK
      console.log('📝 Git commit status checked');
    }
  } catch (error) {
    console.log('⚠️  Git setup had some issues, but continuing...');
  }
}

function deployToRailway() {
  console.log('\n🚂 Deploying to Railway...');
  
  try {
    // Check if user is logged in
    try {
      runCommand('railway whoami', 'Checking Railway authentication');
    } catch (error) {
      console.log('🔐 Please log in to Railway...');
      console.log('Opening browser for authentication...');
      
      // Use spawn for interactive command
      const loginProcess = spawn('railway', ['login'], { 
        stdio: 'inherit',
        shell: true 
      });
      
      return new Promise((resolve, reject) => {
        loginProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Railway authentication successful');
            resolve();
          } else {
            reject(new Error('Railway authentication failed'));
          }
        });
      }).then(() => deployProject());
    }
    
    return deployProject();
    
  } catch (error) {
    console.error('❌ Railway deployment failed:', error.message);
    throw error;
  }
}

function deployProject() {
  console.log('\n🚀 Creating Railway project...');
  
  try {
    // Create new project or link existing
    const projectOutput = runCommand('railway project new', 'Creating new Railway project');
    console.log('✅ Railway project created');
    
  } catch (error) {
    console.log('📋 Trying to link to existing project...');
    try {
      runCommand('railway link', 'Linking to existing project');
    } catch (linkError) {
      console.error('❌ Could not create or link Railway project');
      console.error('Please run: railway login && railway project new');
      throw linkError;
    }
  }
  
  // Deploy the application
  console.log('\n📤 Deploying application...');
  const deployOutput = runCommand('railway up', 'Deploying to Railway');
  
  // Get the deployment URL
  console.log('\n🔗 Getting deployment URL...');
  try {
    const domainOutput = runCommand('railway domain', 'Getting Railway domain');
    console.log(`✅ Deployment successful!`);
    console.log(`🌐 Your app URL: ${domainOutput}`);
    
    return domainOutput;
  } catch (error) {
    console.log('⚠️  Deployment completed but could not get URL automatically');
    console.log('📋 Run "railway domain" to get your app URL');
    return null;
  }
}

function showNextSteps(appUrl) {
  console.log('\n🎉 Deployment Complete!\n');
  console.log('📋 Next Steps:');
  console.log('1. Your app is deployed at:', appUrl || 'Run "railway domain" to get URL');
  console.log('2. Copy bot-config.example.js to bot-config.js');
  console.log('3. Add your bot token from @BotFather');
  console.log('4. Run: npm run setup-bot');
  console.log('5. Use BotFather /newapp to create Mini App');
  console.log('6. Set the Web App URL to your Railway URL');
  console.log('\n🔧 Useful Railway Commands:');
  console.log('   railway logs        - View application logs');
  console.log('   railway open        - Open app in browser');
  console.log('   railway domain      - Get/set custom domain');
  console.log('   railway variables   - Manage environment variables');
  console.log('\n📖 Full documentation: TELEGRAM_SETUP.md');
}

async function main() {
  try {
    checkPrerequisites();
    setupGit();
    const appUrl = await deployToRailway();
    showNextSteps(appUrl);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\n🆘 Troubleshooting:');
    console.error('1. Make sure you have Node.js and npm installed');
    console.error('2. Check your internet connection');
    console.error('3. Try running: railway login');
    console.error('4. For help: https://docs.railway.app/');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}