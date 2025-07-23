class RendererModule {
    constructor(app) {
        this.app = app;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.canvas = null;
        this.animationId = null;
        this.isRendering = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
    }

    async initialize() {
        const logger = this.app.getModule('logger');
        const config = this.app.getModule('config');
        
        try {
            logger.info('Initializing renderer module');
            
            if (!this.checkWebGLSupport()) {
                throw new Error('WebGL is not supported on this device');
            }
            
            this.canvas = document.getElementById('renderCanvas');
            if (!this.canvas) {
                throw new Error('Render canvas not found');
            }
            
            await this.initializeScene();
            await this.initializeCamera();
            await this.initializeRenderer();
            await this.initializeControls();
            await this.initializeLighting();
            
            this.setupEventHandlers();
            this.startRenderLoop();
            
            logger.info('Renderer module initialized successfully');
            this.app.eventBus.emit('renderer:initialized');
            
        } catch (error) {
            logger.error('Failed to initialize renderer', {}, error);
            throw error;
        }
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || 
                      canvas.getContext('webgl') || 
                      canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    async initializeScene() {
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js library not loaded');
        }
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        this.app.setState('scene', this.scene);
        this.app.eventBus.emit('renderer:scene:created', this.scene);
    }

    async initializeCamera() {
        const config = this.app.getModule('config');
        const cameraConfig = config.get('camera');
        
        this.camera = new THREE.PerspectiveCamera(
            cameraConfig.fov,
            window.innerWidth / window.innerHeight,
            cameraConfig.near,
            cameraConfig.far
        );
        
        this.camera.position.set(...cameraConfig.position);
        this.camera.lookAt(...cameraConfig.target);
        
        this.app.setState('camera', this.camera);
        this.app.eventBus.emit('renderer:camera:created', this.camera);
    }

    async initializeRenderer() {
        const config = this.app.getModule('config');
        const rendererConfig = config.get('renderer');
        const envConfig = config.get('environment');
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: rendererConfig.antialias && !envConfig.isMobile,
            alpha: rendererConfig.alpha,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: rendererConfig.powerPreference
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        const pixelRatio = Math.min(
            window.devicePixelRatio * rendererConfig.pixelRatio,
            rendererConfig.pixelRatio.max
        );
        this.renderer.setPixelRatio(pixelRatio);
        
        if (envConfig.isMobile || envConfig.isLowEnd) {
            this.applyMobileOptimizations();
        }
        
        this.app.setState('renderer', this.renderer);
        this.app.eventBus.emit('renderer:renderer:created', this.renderer);
    }

    async initializeControls() {
        const config = this.app.getModule('config');
        const controlsConfig = config.get('controls');
        
        if (typeof THREE.OrbitControls === 'undefined') {
            this.app.getModule('logger')?.warn('OrbitControls not available');
            return;
        }
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        
        Object.assign(this.controls, {
            enableDamping: controlsConfig.enableDamping,
            dampingFactor: controlsConfig.dampingFactor,
            screenSpacePanning: false,
            minDistance: controlsConfig.minDistance,
            maxDistance: controlsConfig.maxDistance,
            maxPolarAngle: Math.PI * 0.9,
            minPolarAngle: Math.PI * 0.1,
            autoRotate: controlsConfig.autoRotate,
            autoRotateSpeed: controlsConfig.autoRotateSpeed
        });
        
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };
        
        this.controls.target.set(0, 0, 0);
        
        this.app.setState('controls', this.controls);
        this.app.eventBus.emit('renderer:controls:created', this.controls);
    }

    async initializeLighting() {
        const lightingSetup = new LightingManager(this.scene);
        await lightingSetup.initialize();
        
        this.app.setState('lighting', lightingSetup);
        this.app.eventBus.emit('renderer:lighting:created', lightingSetup);
    }

    applyMobileOptimizations() {
        const logger = this.app.getModule('logger');
        
        this.renderer.shadowMap.enabled = false;
        this.renderer.antialias = false;
        this.targetFPS = 30;
        
        logger.info('Applied mobile optimizations', {
            shadows: false,
            antialias: false,
            targetFPS: this.targetFPS
        });
    }

    setupEventHandlers() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseRendering();
            } else {
                this.resumeRendering();
            }
        });
        
        this.app.eventBus.on('config:changed', (data) => {
            if (data.path.startsWith('renderer.')) {
                this.applyConfigChange(data.path, data.value);
            }
        });
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.app.eventBus.emit('renderer:resize', {
            width: window.innerWidth,
            height: window.innerHeight,
            aspect: this.camera.aspect
        });
    }

    startRenderLoop() {
        this.isRendering = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    animate() {
        if (!this.isRendering) return;
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        const targetFrameTime = 1000 / this.targetFPS;
        
        if (deltaTime >= targetFrameTime) {
            this.render();
            this.frameCount++;
            this.lastFrameTime = currentTime - (deltaTime % targetFrameTime);
        }
    }

    render() {
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        this.app.eventBus.emit('renderer:frame:rendered', {
            frameCount: this.frameCount,
            timestamp: performance.now()
        });
    }

    pauseRendering() {
        this.isRendering = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        this.app.eventBus.emit('renderer:paused');
    }

    resumeRendering() {
        if (this.controls) {
            this.controls.enabled = true;
        }
        
        this.startRenderLoop();
        this.app.eventBus.emit('renderer:resumed');
    }

    applyConfigChange(path, value) {
        const logger = this.app.getModule('logger');
        
        switch (path) {
            case 'renderer.pixelRatio':
                this.renderer.setPixelRatio(Math.min(value, 2));
                logger.info('Updated pixel ratio', { value });
                break;
                
            case 'renderer.antialias':
                logger.info('Antialias change requires renderer restart');
                break;
        }
    }

    resetCamera() {
        if (!this.camera || !this.controls) return;
        
        const config = this.app.getModule('config');
        const cameraConfig = config.get('camera');
        
        this.camera.position.set(...cameraConfig.position);
        this.controls.target.set(...cameraConfig.target);
        this.controls.update();
        
        this.app.eventBus.emit('renderer:camera:reset');
    }

    setQuality(level) {
        const config = this.app.getModule('config');
        
        switch (level) {
            case 'low':
                this.renderer.setPixelRatio(0.6);
                this.targetFPS = 30;
                break;
            case 'medium':
                this.renderer.setPixelRatio(0.8);
                this.targetFPS = 45;
                break;
            case 'high':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.targetFPS = 60;
                break;
        }
        
        this.app.eventBus.emit('renderer:quality:changed', level);
    }

    getStats() {
        return {
            isRendering: this.isRendering,
            frameCount: this.frameCount,
            targetFPS: this.targetFPS,
            pixelRatio: this.renderer?.getPixelRatio(),
            size: this.renderer?.getSize(new THREE.Vector2()),
            triangles: this.renderer?.info.render.triangles || 0,
            calls: this.renderer?.info.render.calls || 0,
            memory: {
                geometries: this.renderer?.info.memory.geometries || 0,
                textures: this.renderer?.info.memory.textures || 0
            }
        };
    }

    async shutdown() {
        const logger = this.app.getModule('logger');
        logger.info('Renderer module shutting down');
        
        this.pauseRendering();
        
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        if (this.scene) {
            this.scene.clear();
            this.scene = null;
        }
        
        window.removeEventListener('resize', this.onWindowResize);
    }
}

class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.lights = new Map();
    }

    async initialize() {
        this.createAmbientLight();
        this.createDirectionalLight();
        this.createPointLight();
    }

    createAmbientLight() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.lights.set('ambient', ambientLight);
        this.scene.add(ambientLight);
    }

    createDirectionalLight() {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.lights.set('directional', directionalLight);
        this.scene.add(directionalLight);
    }

    createPointLight() {
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
        pointLight.position.set(10, 10, 10);
        this.lights.set('point', pointLight);
        this.scene.add(pointLight);
    }

    setIntensity(lightName, intensity) {
        const light = this.lights.get(lightName);
        if (light) {
            light.intensity = intensity;
        }
    }

    setColor(lightName, color) {
        const light = this.lights.get(lightName);
        if (light) {
            light.color.setHex(color);
        }
    }
}

window.RendererModule = RendererModule;