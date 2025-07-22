#!/bin/bash

# DEPLOY_DUNGEON_SANDBOX.sh - Complete end-to-end deployment script
# Run this in your local terminal: bash DEPLOY_DUNGEON_SANDBOX.sh

set -e  # Exit on any error

echo "🚀 Deploying Telegram Gaussian Splat Viewer to dungeon-sandbox"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}📋 $1...${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_status "Checking prerequisites"

if ! command -v git &> /dev/null; then
    print_error "git is not installed"
    exit 1
fi

if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

print_success "Prerequisites check passed"

# Check Railway authentication
print_status "Checking Railway authentication"
if ! railway whoami &> /dev/null; then
    print_error "Not logged in to Railway"
    echo "Please run: railway login"
    exit 1
fi

RAILWAY_USER=$(railway whoami)
print_success "Logged in as: $RAILWAY_USER"

# Push to GitHub
print_status "Pushing code to GitHub repository"

# Make sure we're on the right remote
git remote set-url origin https://github.com/iamborisov/dungeon-sandbox.git

# Add and commit any pending changes
git add .
if git diff --staged --quiet; then
    print_success "No changes to commit"
else
    git commit -m "Deploy Telegram Gaussian Splat Viewer - $(date)"
    print_success "Changes committed"
fi

# Push to GitHub (this will prompt for GitHub authentication if needed)
if git push origin master; then
    print_success "Code pushed to GitHub successfully"
else
    print_error "Failed to push to GitHub. Please authenticate with GitHub first."
    echo "Try: gh auth login  or  git config --global credential.helper store"
    exit 1
fi

# Link to Railway project
print_status "Linking to Railway dungeon-sandbox project"

# Try to link to the existing project
if railway link dungeon-sandbox; then
    print_success "Linked to dungeon-sandbox project"
elif railway link; then
    print_success "Linked to Railway project"
else
    print_error "Failed to link Railway project"
    echo "Please run 'railway link' manually and select dungeon-sandbox"
    exit 1
fi

# Deploy to Railway
print_status "Deploying to Railway"

if railway up; then
    print_success "Deployed to Railway successfully"
else
    print_error "Railway deployment failed"
    exit 1
fi

# Get the app URL
print_status "Getting app URL"

APP_URL=""
if railway domain; then
    APP_URL=$(railway domain 2>/dev/null | grep -E 'https://' | head -1 | tr -d ' ')
    if [ -n "$APP_URL" ]; then
        print_success "App URL: $APP_URL"
    else
        print_status "Generating Railway domain"
        railway domain generate
        sleep 2
        APP_URL=$(railway domain 2>/dev/null | grep -E 'https://' | head -1 | tr -d ' ')
    fi
fi

if [ -z "$APP_URL" ]; then
    print_warning "Could not get app URL automatically"
    echo "Please get your app URL from Railway dashboard and set environment variables manually"
    APP_URL="https://dungeon-sandbox-production.up.railway.app"  # Default guess
fi

# Set environment variables
print_status "Setting environment variables"

if [ -z "$TG_TOKEN" ]; then
    print_warning "TG_TOKEN not provided as environment variable"
    echo "Please set TG_TOKEN in Railway dashboard or run:"
    echo "export TG_TOKEN=your_bot_token && bash $0"
    echo ""
    echo "Setting other variables..."
fi

# Set APP_URL and WEBHOOK_URL
railway variables --set "APP_URL=$APP_URL" --set "WEBHOOK_URL=$APP_URL/webhook"
print_success "Environment variables set"

# Wait for deployment to be ready
print_status "Waiting for deployment to be ready"
sleep 10

# Test the deployment
print_status "Testing deployment"

if curl -s "$APP_URL/health" | grep -q "ok"; then
    print_success "App is responding correctly"
    
    # Test bot configuration
    if curl -s "$APP_URL/bot-info" | grep -q "username"; then
        print_success "Bot is configured and working"
    else
        print_warning "Bot configuration may need TG_TOKEN"
    fi
else
    print_warning "App may still be starting up"
    echo "Check Railway logs: railway logs"
fi

# Show final instructions
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "📱 Your Telegram Gaussian Splat Viewer:"
echo "   🌐 URL: $APP_URL"
echo "   🤖 Health: $APP_URL/health"
echo "   ℹ️  Bot Info: $APP_URL/bot-info"
echo ""
echo "🔧 Next Steps:"
echo "1. Set TG_TOKEN in Railway dashboard if not already set"
echo "2. Create Mini App in @BotFather:"
echo "   • Send /newapp to @BotFather"
echo "   • Select your bot"
echo "   • Set Web App URL: $APP_URL"
echo "3. Test: Send /start to your bot!"
echo ""
echo "🔍 Useful Commands:"
echo "   railway logs     # View app logs"
echo "   railway open     # Open Railway dashboard"
echo "   railway domain   # Get/manage domain"
echo ""
echo "✨ Your 3D Gaussian splat viewer is ready!"
echo "Send /start to your bot to launch the Mini App!"