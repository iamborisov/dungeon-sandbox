# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TGSplat is a Telegram mini app for viewing Gaussian splats using Babylon.js with mobile optimizations. The app integrates with Telegram's Web App API and provides touch-optimized 3D viewing capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Access locally
http://localhost:3000
```

## Architecture

### Core Components
- **server.js**: Express server with security middleware (helmet, compression)
- **index.html**: Complete mini app with Telegram Web App integration and Babylon.js
- **package.json**: Node.js dependencies for Express server

### Key Technologies
- **Frontend**: Vanilla JavaScript with Babylon.js (CDN), Telegram Web App API
- **Backend**: Express.js with compression and security headers
- **3D Engine**: Babylon.js with mobile optimizations and touch controls

### Telegram Integration
- Automatic theme color adaptation from Telegram's theme parameters
- MainButton status updates and BackButton handling
- Full-screen expansion and haptic feedback
- Optimized for Telegram's mobile webview environment

### Mobile Optimizations
- Hardware scaling reduction (0.7x) for performance
- 30 FPS cap for battery preservation
- Disabled anti-aliasing and unnecessary Babylon.js features
- Touch-optimized ArcRotateCamera with inertia controls
- WebGL support detection with fallback error handling

## File Structure
- `index.html` - Complete Telegram mini app (under 50KB)
- `server.js` - Express server for hosting
- `assets/` - Directory for .ply Gaussian splat files (to be added)
- `README.md` - Setup and deployment instructions

## Development Notes
- Currently uses placeholder visualization (sphere with points)
- Real .ply files can be loaded by replacing placeholder code around `index.html:340`
- Mobile-first design with progressive enhancement
- Offline-first architecture where possible