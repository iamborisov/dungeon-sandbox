class TGSplatApp {
    constructor() {
        this.app = null;
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    async _performInitialization() {
        try {
            await this.waitForDependencies();
            
            this.app = new Application();
            
            const config = this.buildConfiguration();
            await this.app.initialize(config);
            
            await this.setupApplicationHandlers();
            await this.loadInitialAssets();
            
            this.isInitialized = true;
            
            console.log('🚀 TGSplat application initialized successfully');
            
            return this.app;
            
        } catch (error) {
            console.error('❌ Failed to initialize TGSplat application:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    async waitForDependencies() {
        const dependencies = [
            { name: 'THREE.js', check: () => typeof THREE !== 'undefined' },
            { name: 'Application', check: () => typeof Application !== 'undefined' },
            { name: 'DOM', check: () => document.readyState === 'complete' || document.readyState === 'interactive' }
        ];

        const maxWaitTime = 10000;
        const checkInterval = 100;
        let elapsed = 0;

        while (elapsed < maxWaitTime) {
            const unmetDependencies = dependencies.filter(dep => !dep.check());
            
            if (unmetDependencies.length === 0) {
                return;
            }

            if (elapsed % 1000 === 0) {
                console.log('⏳ Waiting for dependencies:', unmetDependencies.map(d => d.name).join(', '));
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
        }

        const failedDependencies = dependencies.filter(dep => !dep.check()).map(d => d.name);
        throw new Error(`Dependencies not loaded within ${maxWaitTime}ms: ${failedDependencies.join(', ')}`);
    }

    buildConfiguration() {
        const isTelegram = !!window.Telegram?.WebApp;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         window.innerWidth <= 768;

        return {
            app: {
                name: 'TGSplat',
                version: '2.0.0',
                environment: isTelegram ? 'telegram' : 'standalone'
            },
            renderer: {
                antialias: !isMobile,
                alpha: false,
                powerPreference: 'high-performance',
                pixelRatio: isMobile ? 0.7 : 1.0
            },
            assets: {
                baseUrl: '/assets',
                defaultSplat: 'splats/banana.ply',
                preloadAssets: true
            },
            performance: {
                targetFPS: isMobile ? 30 : 60,
                enableProfiling: true,
                memoryThreshold: 100 * 1024 * 1024
            },
            telegram: {
                adaptTheme: isTelegram,
                enableHaptics: isTelegram,
                showMainButton: isTelegram
            },
            logging: {
                level: 'INFO',
                enableRemote: false
            }
        };
    }

    async setupApplicationHandlers() {
        const logger = this.app.getModule('logger');
        const telegram = this.app.getModule('telegram');
        const ui = this.app.getModule('ui');
        const renderer = this.app.getModule('renderer');
        const assets = this.app.getModule('assets');
        const performance = this.app.getModule('performance');

        this.app.eventBus.on('telegram:back:pressed', () => {
            this.handleBackButton();
        });

        this.app.eventBus.on('ui:error:retry', () => {
            this.retryInitialization();
        });

        this.app.eventBus.on('ui:quality:toggle', () => {
            this.toggleQuality();
        });

        this.app.eventBus.on('performance:memory:high', (data) => {
            logger.warn('High memory usage detected', data);
            ui.showNotification('High memory usage - optimizing performance', 'warning');
            performance.optimizePerformance();
        });

        this.app.eventBus.on('performance:frame:drop', (data) => {
            logger.warn('Frame drops detected', data);
            if (data.fps < 20) {
                performance.optimizePerformance();
            }
        });

        this.app.eventBus.on('assets:loading:failed', (data) => {
            logger.error('Asset loading failed', data);
            ui.showError('Asset Loading Failed', `Failed to load: ${data.url}`);
        });

        this.app.eventBus.on('renderer:initialized', () => {
            if (telegram.isStandalone()) {
                ui.showNotification('3D viewer ready', 'success');
            } else {
                telegram.showMainButton('3D Viewer Ready', '#4CAF50');
                setTimeout(() => telegram.hideMainButton(), 3000);
            }
        });

        window.addEventListener('beforeunload', () => {
            this.shutdown();
        });

        window.addEventListener('error', (event) => {
            logger.error('Unhandled error', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno
            }, event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            logger.error('Unhandled promise rejection', {
                reason: event.reason
            });
        });
    }

    async loadInitialAssets() {
        const assets = this.app.getModule('assets');
        const config = this.app.getModule('config');
        const ui = this.app.getModule('ui');

        ui.showLoading('Loading Gaussian Splat...', 'Preparing 3D viewer for optimal experience');

        try {
            const defaultSplat = config.get('assets.defaultSplat');
            await assets.loadAsset(defaultSplat, {
                transform: {
                    optimize: true
                }
            });

            await this.initializeScene();
            
        } catch (error) {
            this.app.getModule('logger').error('Failed to load initial assets', {}, error);
            await this.createFallbackScene();
        }

        ui.hideLoading();
    }

    async initializeScene() {
        const renderer = this.app.getModule('renderer');
        const assets = this.app.getModule('assets');
        const scene = this.app.getState('scene');
        const logger = this.app.getModule('logger');

        try {
            const splatAsset = assets.assetCache.values().next().value;
            
            if (splatAsset && splatAsset.geometry) {
                const material = new THREE.PointsMaterial({
                    size: 0.02,
                    vertexColors: splatAsset.geometry.attributes.color ? true : false,
                    color: splatAsset.geometry.attributes.color ? 0xffffff : 0xffdd00
                });

                const splatMesh = new THREE.Points(splatAsset.geometry, material);
                scene.add(splatMesh);

                this.app.setState('splatMesh', splatMesh);
                logger.info('Gaussian splat loaded successfully');

            } else {
                throw new Error('Invalid splat asset');
            }

        } catch (error) {
            logger.warn('Failed to load splat file, creating fallback', {}, error);
            await this.createFallbackScene();
        }
    }

    async createFallbackScene() {
        const scene = this.app.getState('scene');
        const logger = this.app.getModule('logger');

        logger.info('Creating fallback scene');

        const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0xcc9966,
            roughness: 0.8,
            metalness: 0.2
        });

        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);

        const pointsGeometry = new THREE.BufferGeometry();
        const pointsCount = 1000;
        const positions = new Float32Array(pointsCount * 3);
        const colors = new Float32Array(pointsCount * 3);

        for (let i = 0; i < pointsCount; i++) {
            const i3 = i * 3;
            
            const radius = 2 + Math.random() * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            colors[i3] = Math.random();
            colors[i3 + 1] = Math.random();
            colors[i3 + 2] = Math.random();
        }

        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const pointsMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const points = new THREE.Points(pointsGeometry, pointsMaterial);
        scene.add(points);

        this.app.setState('splatMesh', sphere);
    }

    handleBackButton() {
        const telegram = this.app.getModule('telegram');
        
        if (telegram.isStandalone()) {
            const ui = this.app.getModule('ui');
            ui.showNotification('Use browser back button to navigate', 'info');
        } else {
            telegram.close();
        }
    }

    async retryInitialization() {
        const ui = this.app.getModule('ui');
        
        ui.hideError();
        ui.showLoading('Retrying initialization...', 'Please wait while we try again');

        try {
            await this.loadInitialAssets();
        } catch (error) {
            ui.showError('Initialization Failed', 'Unable to start the application. Please check your connection and try again.');
        }
    }

    toggleQuality() {
        const renderer = this.app.getModule('renderer');
        const telegram = this.app.getModule('telegram');
        const ui = this.app.getModule('ui');

        const stats = renderer.getStats();
        let newQuality;

        if (stats.pixelRatio > 0.8) {
            newQuality = 'low';
            ui.showNotification('Switched to low quality', 'info');
        } else {
            newQuality = 'high';
            ui.showNotification('Switched to high quality', 'info');
        }

        renderer.setQuality(newQuality);
        
        if (telegram.hasCapability('haptics')) {
            telegram.hapticFeedback('selection');
        }
    }

    resetCamera() {
        const renderer = this.app.getModule('renderer');
        const telegram = this.app.getModule('telegram');
        
        renderer.resetCamera();
        
        if (telegram.hasCapability('haptics')) {
            telegram.hapticFeedback('impact', 'light');
        }
    }

    handleInitializationError(error) {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorMessage = document.getElementById('errorMessage');
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        if (errorOverlay && errorMessage) {
            errorMessage.textContent = error.message || 'Failed to initialize the application';
            errorOverlay.style.display = 'flex';
        }

        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.MainButton.setText('Close App');
            tg.MainButton.color = '#ff3b30';
            tg.MainButton.show();
            tg.MainButton.onClick(() => tg.close());
        }
    }

    getStats() {
        if (!this.isInitialized || !this.app) {
            return { initialized: false };
        }

        const renderer = this.app.getModule('renderer');
        const performance = this.app.getModule('performance');
        const assets = this.app.getModule('assets');

        return {
            initialized: true,
            renderer: renderer?.getStats(),
            performance: performance?.getStats(),
            assets: assets?.getCacheStats(),
            modules: Array.from(this.app.modules.keys())
        };
    }

    async shutdown() {
        if (this.app) {
            await this.app.shutdown();
            this.app = null;
        }
        
        this.isInitialized = false;
        this.initializationPromise = null;
    }
}

let tgSplatApp;

async function initializeTGSplat() {
    try {
        tgSplatApp = new TGSplatApp();
        await tgSplatApp.initialize();
        
        window.tgSplatApp = tgSplatApp;
        
        console.log('✅ TGSplat application ready');
        
    } catch (error) {
        console.error('❌ TGSplat initialization failed:', error);
    }
}

function retryLoading() {
    if (tgSplatApp) {
        tgSplatApp.retryInitialization();
    } else {
        initializeTGSplat();
    }
}

function resetCamera() {
    if (tgSplatApp) {
        tgSplatApp.resetCamera();
    }
}

function toggleQuality() {
    if (tgSplatApp) {
        tgSplatApp.toggleQuality();
    }
}

window.initializeTGSplat = initializeTGSplat;
window.retryLoading = retryLoading;
window.resetCamera = resetCamera;
window.toggleQuality = toggleQuality;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTGSplat);
} else {
    setTimeout(initializeTGSplat, 100);
}