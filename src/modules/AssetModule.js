class AssetModule {
    constructor(app) {
        this.app = app;
        this.assetCache = new Map();
        this.loadingPromises = new Map();
        this.loaders = new Map();
        this.compressionWorker = null;
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async initialize() {
        const logger = this.app.getModule('logger');
        
        try {
            logger.info('Initializing asset module');
            
            this.initializeLoaders();
            await this.initializeCompressionWorker();
            this.setupEventHandlers();
            
            logger.info('Asset module initialized successfully');
            this.app.eventBus.emit('assets:initialized');
            
        } catch (error) {
            logger.error('Failed to initialize asset module', {}, error);
            throw error;
        }
    }

    initializeLoaders() {
        if (typeof THREE !== 'undefined') {
            this.loaders.set('ply', new THREE.PLYLoader());
            this.loaders.set('gltf', new THREE.GLTFLoader());
            this.loaders.set('obj', new THREE.OBJLoader());
            this.loaders.set('texture', new THREE.TextureLoader());
        }
        
        this.loaders.set('json', new JSONLoader());
        this.loaders.set('binary', new BinaryLoader());
    }

    async initializeCompressionWorker() {
        if (window.Worker) {
            try {
                this.compressionWorker = new Worker('/src/workers/compressionWorker.js');
                this.setupWorkerHandlers();
            } catch (error) {
                this.app.getModule('logger')?.warn('Compression worker not available', {}, error);
            }
        }
    }

    setupWorkerHandlers() {
        this.compressionWorker.onmessage = (event) => {
            const { id, result, error } = event.data;
            const promise = this.loadingPromises.get(id);
            
            if (promise) {
                if (error) {
                    promise.reject(new Error(error));
                } else {
                    promise.resolve(result);
                }
                this.loadingPromises.delete(id);
            }
        };
    }

    setupEventHandlers() {
        this.app.eventBus.on('config:changed', (data) => {
            if (data.path.startsWith('assets.')) {
                this.handleConfigChange(data.path, data.value);
            }
        });
    }

    async loadAsset(url, options = {}) {
        const logger = this.app.getModule('logger');
        const cacheKey = this.getCacheKey(url, options);
        
        if (this.assetCache.has(cacheKey) && !options.forceReload) {
            logger.debug('Asset loaded from cache', { url });
            return this.assetCache.get(cacheKey);
        }
        
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        
        const loadPromise = this.performLoad(url, options);
        this.loadingPromises.set(cacheKey, loadPromise);
        
        try {
            const asset = await loadPromise;
            this.assetCache.set(cacheKey, asset);
            this.loadingPromises.delete(cacheKey);
            
            this.updateProgress();
            logger.info('Asset loaded successfully', { url, size: this.getAssetSize(asset) });
            
            return asset;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            logger.error('Failed to load asset', { url }, error);
            throw error;
        }
    }

    async performLoad(url, options) {
        const extension = this.getFileExtension(url);
        const loader = this.getLoader(extension);
        
        if (!loader) {
            throw new Error(`No loader available for extension: ${extension}`);
        }
        
        const config = this.app.getModule('config');
        const baseUrl = config.get('assets.baseUrl', '/assets');
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}/${url}`;
        
        this.app.eventBus.emit('assets:loading:started', { url: fullUrl });
        
        try {
            let asset;
            
            if (loader instanceof AssetLoader) {
                asset = await loader.load(fullUrl, options);
            } else {
                asset = await this.loadWithThreeJSLoader(loader, fullUrl, options);
            }
            
            if (options.compress && this.compressionWorker) {
                asset = await this.compressAsset(asset, options.compressionLevel);
            }
            
            if (options.transform) {
                asset = await this.transformAsset(asset, options.transform);
            }
            
            this.app.eventBus.emit('assets:loading:completed', { url: fullUrl, asset });
            return asset;
            
        } catch (error) {
            this.app.eventBus.emit('assets:loading:failed', { url: fullUrl, error });
            throw error;
        }
    }

    async loadWithThreeJSLoader(loader, url, options) {
        return new Promise((resolve, reject) => {
            const onProgress = (progress) => {
                this.app.eventBus.emit('assets:loading:progress', {
                    url,
                    loaded: progress.loaded,
                    total: progress.total,
                    percentage: (progress.loaded / progress.total) * 100
                });
            };
            
            loader.load(url, resolve, onProgress, reject);
        });
    }

    async loadMultiple(urls, options = {}) {
        this.totalAssets = urls.length;
        this.loadedAssets = 0;
        
        const promises = urls.map(url => this.loadAsset(url, options));
        
        if (options.parallel !== false) {
            return Promise.all(promises);
        } else {
            const results = [];
            for (const promise of promises) {
                results.push(await promise);
            }
            return results;
        }
    }

    async preloadAssets(assetList) {
        const logger = this.app.getModule('logger');
        const config = this.app.getModule('config');
        
        if (!config.get('assets.preloadAssets', true)) {
            logger.info('Asset preloading disabled');
            return;
        }
        
        logger.info('Starting asset preload', { count: assetList.length });
        
        const preloadPromises = assetList.map(async (assetSpec) => {
            try {
                await this.loadAsset(assetSpec.url, {
                    ...assetSpec.options,
                    priority: 'low'
                });
            } catch (error) {
                logger.warn('Preload failed for asset', { url: assetSpec.url }, error);
            }
        });
        
        await Promise.allSettled(preloadPromises);
        logger.info('Asset preload completed');
    }

    async compressAsset(asset, level = 'medium') {
        if (!this.compressionWorker) {
            return asset;
        }
        
        const compressionId = Math.random().toString(36).substr(2, 9);
        
        return new Promise((resolve, reject) => {
            this.loadingPromises.set(compressionId, { resolve, reject });
            
            this.compressionWorker.postMessage({
                id: compressionId,
                type: 'compress',
                data: asset,
                level
            });
        });
    }

    async transformAsset(asset, transformConfig) {
        const transformer = new AssetTransformer(transformConfig);
        return transformer.transform(asset);
    }

    getLoader(extension) {
        return this.loaders.get(extension.toLowerCase());
    }

    getFileExtension(url) {
        return url.split('.').pop().toLowerCase();
    }

    getCacheKey(url, options) {
        return `${url}_${JSON.stringify(options)}`;
    }

    getAssetSize(asset) {
        if (asset instanceof ArrayBuffer) {
            return asset.byteLength;
        }
        
        if (asset.geometry && asset.geometry.attributes) {
            let size = 0;
            Object.values(asset.geometry.attributes).forEach(attr => {
                if (attr.array) {
                    size += attr.array.byteLength;
                }
            });
            return size;
        }
        
        return 0;
    }

    updateProgress() {
        this.loadedAssets++;
        const progress = this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 100 : 0;
        
        this.app.eventBus.emit('assets:progress:updated', {
            loaded: this.loadedAssets,
            total: this.totalAssets,
            percentage: progress
        });
    }

    handleConfigChange(path, value) {
        const logger = this.app.getModule('logger');
        
        switch (path) {
            case 'assets.baseUrl':
                logger.info('Asset base URL changed', { baseUrl: value });
                break;
                
            case 'assets.compressionLevel':
                logger.info('Asset compression level changed', { level: value });
                break;
        }
    }

    clearCache() {
        this.assetCache.clear();
        this.app.eventBus.emit('assets:cache:cleared');
    }

    getCacheStats() {
        let totalSize = 0;
        let assetCount = 0;
        
        for (const asset of this.assetCache.values()) {
            totalSize += this.getAssetSize(asset);
            assetCount++;
        }
        
        return {
            assetCount,
            totalSize,
            averageSize: assetCount > 0 ? totalSize / assetCount : 0
        };
    }

    async shutdown() {
        const logger = this.app.getModule('logger');
        logger.info('Asset module shutting down');
        
        if (this.compressionWorker) {
            this.compressionWorker.terminate();
            this.compressionWorker = null;
        }
        
        this.clearCache();
        this.loadingPromises.clear();
        this.loaders.clear();
    }
}

class AssetLoader {
    async load(url, options = {}) {
        throw new Error('AssetLoader.load must be implemented by subclass');
    }
}

class JSONLoader extends AssetLoader {
    async load(url, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.statusText}`);
        }
        return response.json();
    }
}

class BinaryLoader extends AssetLoader {
    async load(url, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load binary: ${response.statusText}`);
        }
        return response.arrayBuffer();
    }
}

class AssetTransformer {
    constructor(config) {
        this.config = config;
    }

    async transform(asset) {
        let result = asset;
        
        if (this.config.scale) {
            result = this.applyScale(result, this.config.scale);
        }
        
        if (this.config.rotation) {
            result = this.applyRotation(result, this.config.rotation);
        }
        
        if (this.config.position) {
            result = this.applyPosition(result, this.config.position);
        }
        
        if (this.config.optimize) {
            result = this.optimize(result);
        }
        
        return result;
    }

    applyScale(asset, scale) {
        if (asset.geometry) {
            asset.geometry.scale(scale.x || scale, scale.y || scale, scale.z || scale);
        }
        return asset;
    }

    applyRotation(asset, rotation) {
        if (asset.geometry) {
            asset.geometry.rotateX(rotation.x || 0);
            asset.geometry.rotateY(rotation.y || 0);
            asset.geometry.rotateZ(rotation.z || 0);
        }
        return asset;
    }

    applyPosition(asset, position) {
        if (asset.geometry) {
            asset.geometry.translate(position.x || 0, position.y || 0, position.z || 0);
        }
        return asset;
    }

    optimize(asset) {
        if (asset.geometry && asset.geometry.computeBoundingSphere) {
            asset.geometry.computeBoundingSphere();
            asset.geometry.computeBoundingBox();
        }
        return asset;
    }
}

window.AssetModule = AssetModule;