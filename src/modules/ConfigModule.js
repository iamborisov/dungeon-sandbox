class ConfigModule {
    constructor(app) {
        this.app = app;
        this.config = {};
        this.defaults = {
            renderer: {
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance',
                pixelRatio: {
                    mobile: 0.7,
                    desktop: 1.0,
                    max: 2.0
                }
            },
            camera: {
                fov: 75,
                near: 0.1,
                far: 1000,
                position: [10, 10, 10],
                target: [0, 0, 0]
            },
            controls: {
                enableDamping: true,
                dampingFactor: 0.05,
                minDistance: 2,
                maxDistance: 50,
                autoRotate: false,
                autoRotateSpeed: 0.5
            },
            mobile: {
                maxPoints: 500,
                reducedQuality: true,
                disableShadows: true
            },
            telegram: {
                theme: {
                    adaptToTelegram: true,
                    fallbackColors: {
                        bg: '#ffffff',
                        text: '#000000',
                        hint: '#999999',
                        button: '#2481cc',
                        buttonText: '#ffffff'
                    }
                }
            },
            performance: {
                targetFPS: 30,
                enableProfiling: false,
                memoryThreshold: 100 * 1024 * 1024 // 100MB
            },
            assets: {
                baseUrl: '/assets',
                defaultSplat: 'splats/banana.ply',
                preloadAssets: true,
                compressionLevel: 'medium'
            }
        };
    }

    async initialize() {
        this.config = this.mergeConfigs(this.defaults, this.detectEnvironmentConfig());
        this.app.setState('config', this.config);
        this.app.eventBus.emit('config:loaded', this.config);
    }

    detectEnvironmentConfig() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         window.innerWidth <= 768;
        
        const hasWebGL2 = this.checkWebGL2Support();
        const isLowEnd = this.detectLowEndDevice();
        
        return {
            environment: {
                isMobile,
                hasWebGL2,
                isLowEnd,
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    devicePixelRatio: window.devicePixelRatio
                }
            },
            renderer: {
                antialias: !isMobile && !isLowEnd,
                pixelRatio: isMobile ? this.defaults.renderer.pixelRatio.mobile : this.defaults.renderer.pixelRatio.desktop
            },
            performance: {
                targetFPS: isMobile || isLowEnd ? 30 : 60
            }
        };
    }

    checkWebGL2Support() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    detectLowEndDevice() {
        const memory = navigator.deviceMemory;
        const cores = navigator.hardwareConcurrency;
        
        return memory && memory < 4 || cores && cores < 4;
    }

    mergeConfigs(defaults, override) {
        const result = {};
        
        for (const key in defaults) {
            if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                result[key] = this.mergeConfigs(defaults[key], override[key] || {});
            } else {
                result[key] = override[key] !== undefined ? override[key] : defaults[key];
            }
        }
        
        for (const key in override) {
            if (!(key in defaults)) {
                result[key] = override[key];
            }
        }
        
        return result;
    }

    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        let target = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[keys[keys.length - 1]] = value;
        this.app.eventBus.emit('config:changed', { path, value });
    }

    update(partialConfig) {
        this.config = this.mergeConfigs(this.config, partialConfig);
        this.app.setState('config', this.config);
        this.app.eventBus.emit('config:updated', this.config);
    }

    validate() {
        const errors = [];
        
        if (!this.get('renderer.pixelRatio')) {
            errors.push('Invalid renderer pixel ratio configuration');
        }
        
        if (!this.get('camera.fov') || this.get('camera.fov') <= 0) {
            errors.push('Invalid camera FOV configuration');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

window.ConfigModule = ConfigModule;