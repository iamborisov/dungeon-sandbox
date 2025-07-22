# Telegram Gaussian Splat Viewer

A Telegram mini app for viewing Gaussian splats using Babylon.js with mobile optimizations.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open `http://localhost:3000` in your browser or configure as a Telegram mini app.

## Telegram Mini App Setup

### Quick Setup:
1. **See [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) for detailed instructions**

### Automated Setup:
1. Copy `bot-config.example.js` to `bot-config.js`
2. Fill in your bot token from [@BotFather](https://t.me/botfather)
3. Run `npm run setup-bot` to configure automatically
4. Use BotFather's `/newapp` to create the Mini App
5. Set your deployed URL as the Web App URL

### Manual Setup:
1. Create bot with [@BotFather](https://t.me/botfather) → `/newbot`
2. Create Mini App → `/newapp`
3. Set Web App URL to your deployed server
4. The app automatically integrates with Telegram's theme and controls

## Adding Real Gaussian Splat Files

Currently, the app shows a placeholder visualization. To load actual .ply splat files:

### Option 1: Using Babylon.js SceneLoader
Replace the placeholder code in `index.html` around line 340:

```javascript
// Replace the placeholder sphere creation with:
BABYLON.SceneLoader.ImportMesh("", "assets/", "your-splat.ply", scene, (meshes) => {
    splatMesh = meshes[0];
    camera.setTarget(splatMesh.position);
}, null, (scene, message, exception) => {
    throw new Error(`Failed to load splat: ${message}`);
});
```

### Option 2: Using GaussianSplattingMesh (if available)
```javascript
splatMesh = new BABYLON.GaussianSplattingMesh("splat", scene);
await splatMesh.loadFromUrl("assets/your-splat.ply");
```

### Where to Get .ply Splat Files

1. **Create your own**: Use tools like:
   - [3D Gaussian Splatting](https://github.com/graphdeco-inria/gaussian-splatting)
   - [Nerfstudio](https://docs.nerf.studio/en/latest/)
   - [Luma AI](https://lumalabs.ai/) (exports to .splat format, needs conversion)

2. **Download samples**: 
   - [Polycam samples](https://poly.cam/gaussian-splatting)
   - [Hugging Face datasets](https://huggingface.co/datasets?search=gaussian+splatting)

3. **Convert formats**:
   - Use [splat-converter](https://github.com/antimatter15/splat) for .splat to .ply
   - Use [gsplat tools](https://github.com/nerfstudio-project/gsplat) for various conversions

### File Structure for Splats
Create an `assets/` directory and place your .ply files there:
```
tgsplat/
├── assets/
│   ├── scene1.ply
│   ├── scene2.ply
│   └── ...
├── index.html
├── server.js
└── package.json
```

## Mobile Optimizations Included

- Hardware scaling reduction (0.7x) for mobile devices
- 30 FPS cap for battery preservation
- Disabled anti-aliasing on mobile
- Simplified mesh LOD system
- Touch-optimized camera controls
- Reduced particle and effect systems

## Telegram Integration Features

- ✅ Automatic theme color adaptation
- ✅ Full-screen expansion
- ✅ MainButton status updates
- ✅ BackButton handling
- ✅ Haptic feedback on interactions
- ✅ Vertical swipe disabled for 3D controls

## Development Notes

- The app is designed to work offline-first where possible
- WebGL support is automatically detected
- Error handling includes retry mechanisms
- Performance monitoring could be added via Babylon.js tools

## Deployment

Deploy to any hosting service that supports Node.js:
- Heroku
- Railway
- Render
- Vercel (with server functions)
- DigitalOcean App Platform

Set the `PORT` environment variable if required by your hosting service.