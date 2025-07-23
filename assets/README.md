# Assets Directory

This directory contains static assets for the Telegram Gaussian Splat Viewer.

## Directory Structure

- `splats/` - Gaussian splat files (.ply, .splat)
- `textures/` - Texture files (.jpg, .png, .webp)
- `models/` - 3D model files (.glb, .gltf, .obj)

## Usage

Assets are served at `/assets/` URL path. For example:

- `assets/splats/scene.ply` → `https://your-app.com/assets/splats/scene.ply`
- `assets/textures/example.jpg` → `https://your-app.com/assets/textures/example.jpg`

## Supported File Types

### Gaussian Splat Files
- `.ply` - Point cloud data
- `.splat` - Gaussian splat format

### Textures
- `.jpg`, `.jpeg` - JPEG images
- `.png` - PNG images
- `.webp` - WebP images

### 3D Models
- `.glb` - Binary GLTF
- `.gltf` - GLTF JSON
- `.obj` - Wavefront OBJ

## Adding Your Own Files

1. Upload files to the appropriate subdirectory
2. Access via `/assets/[subfolder]/[filename]`
3. Use in your Three.js code:

```javascript
// Example: Loading a .ply file
const loader = new THREE.PLYLoader();
loader.load('/assets/splats/my-scene.ply', (geometry) => {
    const material = new THREE.PointsMaterial({ size: 0.01 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
});
```

## File Size Recommendations

- Keep files under 50MB for good mobile performance
- Use compressed formats when possible
- Consider multiple LOD (Level of Detail) versions for large scenes

## CORS and Security

All assets are served with appropriate CORS headers for cross-origin access.
Files are cached for 7 days to improve performance.