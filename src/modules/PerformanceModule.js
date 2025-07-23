class PerformanceModule {
    constructor(app) {
        this.app = app;
        this.metrics = new Map();
        this.monitors = new Map();
        this.profilers = new Map();
        this.isMonitoring = false;
        this.frameStats = {
            frameCount: 0,
            lastFrameTime: 0,
            fps: 0,
            frameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0
        };
        this.memoryStats = {
            used: 0,
            total: 0,
            limit: 0,
            lastCheck: 0
        };
    }

    async initialize() {
        const logger = this.app.getModule('logger');
        const config = this.app.getModule('config');
        
        try {
            logger.info('Initializing performance module');
            
            this.setupMetrics();
            this.setupMonitors();
            this.setupEventHandlers();
            
            if (config.get('performance.enableProfiling', false)) {
                this.startProfiling();
            }
            
            this.startMonitoring();
            
            logger.info('Performance module initialized successfully');
            this.app.eventBus.emit('performance:initialized');
            
        } catch (error) {
            logger.error('Failed to initialize performance module', {}, error);
            throw error;
        }
    }

    setupMetrics() {
        this.metrics.set('fps', new FPSMetric());
        this.metrics.set('memory', new MemoryMetric());
        this.metrics.set('render', new RenderMetric());
        this.metrics.set('load', new LoadTimeMetric());
        this.metrics.set('interaction', new InteractionMetric());
    }

    setupMonitors() {
        this.monitors.set('frame', new FrameMonitor(this));
        this.monitors.set('memory', new MemoryMonitor(this));
        this.monitors.set('thermal', new ThermalMonitor(this));
        this.monitors.set('battery', new BatteryMonitor(this));
    }

    setupEventHandlers() {
        this.app.eventBus.on('renderer:frame:rendered', (data) => {
            this.updateFrameStats(data);
        });
        
        this.app.eventBus.on('assets:loading:started', () => {
            this.startTimer('asset_load');
        });
        
        this.app.eventBus.on('assets:loading:completed', () => {
            this.endTimer('asset_load');
        });
        
        this.app.eventBus.on('renderer:initialized', () => {
            this.endTimer('app_init');
        });
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 1000);
        
        this.monitors.forEach(monitor => {
            if (monitor.start) {
                monitor.start();
            }
        });
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.monitors.forEach(monitor => {
            if (monitor.stop) {
                monitor.stop();
            }
        });
    }

    startTimer(name) {
        const timer = {
            name,
            startTime: performance.now(),
            endTime: null,
            duration: null
        };
        
        this.profilers.set(name, timer);
        return timer;
    }

    endTimer(name) {
        const timer = this.profilers.get(name);
        if (timer) {
            timer.endTime = performance.now();
            timer.duration = timer.endTime - timer.startTime;
            
            this.app.eventBus.emit('performance:timer:completed', timer);
            return timer;
        }
        return null;
    }

    startProfiling() {
        this.startTimer('app_init');
        
        if (window.performance && window.performance.mark) {
            window.performance.mark('app_start');
        }
    }

    updateFrameStats(data) {
        const currentTime = data.timestamp;
        
        if (this.frameStats.lastFrameTime > 0) {
            const frameTime = currentTime - this.frameStats.lastFrameTime;
            this.frameStats.frameTime = frameTime;
            this.frameStats.fps = 1000 / frameTime;
            
            this.frameStats.minFrameTime = Math.min(this.frameStats.minFrameTime, frameTime);
            this.frameStats.maxFrameTime = Math.max(this.frameStats.maxFrameTime, frameTime);
        }
        
        this.frameStats.frameCount = data.frameCount;
        this.frameStats.lastFrameTime = currentTime;
        
        const fpsMetric = this.metrics.get('fps');
        if (fpsMetric) {
            fpsMetric.update(this.frameStats.fps);
        }
    }

    collectMetrics() {
        this.updateMemoryStats();
        
        this.metrics.forEach((metric, name) => {
            if (metric.collect) {
                const data = metric.collect();
                this.app.eventBus.emit('performance:metric:collected', { name, data });
            }
        });
    }

    updateMemoryStats() {
        if (performance.memory) {
            this.memoryStats = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
                lastCheck: Date.now()
            };
            
            const memoryMetric = this.metrics.get('memory');
            if (memoryMetric) {
                memoryMetric.update(this.memoryStats);
            }
        }
    }

    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            frameStats: { ...this.frameStats },
            memoryStats: { ...this.memoryStats },
            metrics: {},
            timers: {},
            warnings: []
        };
        
        this.metrics.forEach((metric, name) => {
            report.metrics[name] = metric.getReport();
        });
        
        this.profilers.forEach((timer, name) => {
            report.timers[name] = {
                duration: timer.duration,
                startTime: timer.startTime,
                endTime: timer.endTime
            };
        });
        
        report.warnings = this.analyzePerformance();
        
        return report;
    }

    analyzePerformance() {
        const warnings = [];
        const config = this.app.getModule('config');
        
        if (this.frameStats.fps < config.get('performance.targetFPS', 30) * 0.8) {
            warnings.push({
                type: 'low_fps',
                message: `Low FPS detected: ${this.frameStats.fps.toFixed(1)}`,
                severity: 'warning'
            });
        }
        
        if (this.memoryStats.used > config.get('performance.memoryThreshold', 100)) {
            warnings.push({
                type: 'high_memory',
                message: `High memory usage: ${this.memoryStats.used}MB`,
                severity: 'error'
            });
        }
        
        if (this.frameStats.maxFrameTime > 50) {
            warnings.push({
                type: 'frame_drops',
                message: `Frame drops detected: ${this.frameStats.maxFrameTime.toFixed(1)}ms`,
                severity: 'warning'
            });
        }
        
        return warnings;
    }

    optimizePerformance() {
        const config = this.app.getModule('config');
        const renderer = this.app.getModule('renderer');
        const logger = this.app.getModule('logger');
        
        const warnings = this.analyzePerformance();
        const optimizations = [];
        
        warnings.forEach(warning => {
            switch (warning.type) {
                case 'low_fps':
                    if (renderer) {
                        renderer.setQuality('low');
                        optimizations.push('Reduced render quality');
                    }
                    break;
                    
                case 'high_memory':
                    this.suggestMemoryOptimization();
                    optimizations.push('Memory optimization suggested');
                    break;
                    
                case 'frame_drops':
                    config.set('performance.targetFPS', 30);
                    optimizations.push('Reduced target FPS');
                    break;
            }
        });
        
        if (optimizations.length > 0) {
            logger.info('Performance optimizations applied', { optimizations });
            this.app.eventBus.emit('performance:optimized', { optimizations });
        }
        
        return optimizations;
    }

    suggestMemoryOptimization() {
        const suggestions = [
            'Clear asset cache',
            'Reduce point count for splats',
            'Disable shadows',
            'Reduce texture quality'
        ];
        
        this.app.eventBus.emit('performance:memory:suggestions', { suggestions });
    }

    benchmark(name, fn) {
        const startTime = performance.now();
        const result = fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.app.getModule('logger')?.performance(`Benchmark: ${name}`, {
            duration,
            result: typeof result
        });
        
        return { result, duration };
    }

    async benchmarkAsync(name, fn) {
        const startTime = performance.now();
        const result = await fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.app.getModule('logger')?.performance(`Async Benchmark: ${name}`, {
            duration,
            result: typeof result
        });
        
        return { result, duration };
    }

    getStats() {
        return {
            fps: this.frameStats.fps,
            frameTime: this.frameStats.frameTime,
            memory: this.memoryStats.used,
            isMonitoring: this.isMonitoring,
            activeTimers: this.profilers.size,
            warnings: this.analyzePerformance().length
        };
    }

    async shutdown() {
        const logger = this.app.getModule('logger');
        logger.info('Performance module shutting down');
        
        this.stopMonitoring();
        
        const report = this.getPerformanceReport();
        logger.performance('Final performance report', { report });
        
        this.metrics.clear();
        this.monitors.clear();
        this.profilers.clear();
    }
}

class PerformanceMetric {
    constructor() {
        this.samples = [];
        this.maxSamples = 100;
    }

    update(value) {
        this.samples.push({
            value,
            timestamp: performance.now()
        });
        
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }

    getAverage() {
        if (this.samples.length === 0) return 0;
        const sum = this.samples.reduce((acc, sample) => acc + sample.value, 0);
        return sum / this.samples.length;
    }

    getMin() {
        if (this.samples.length === 0) return 0;
        return Math.min(...this.samples.map(s => s.value));
    }

    getMax() {
        if (this.samples.length === 0) return 0;
        return Math.max(...this.samples.map(s => s.value));
    }

    getReport() {
        return {
            current: this.samples[this.samples.length - 1]?.value || 0,
            average: this.getAverage(),
            min: this.getMin(),
            max: this.getMax(),
            samples: this.samples.length
        };
    }
}

class FPSMetric extends PerformanceMetric {
    collect() {
        return {
            fps: this.getAverage(),
            stability: this.getMax() - this.getMin()
        };
    }
}

class MemoryMetric extends PerformanceMetric {
    collect() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize / 1024 / 1024,
                total: performance.memory.totalJSHeapSize / 1024 / 1024,
                utilization: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
            };
        }
        return null;
    }
}

class RenderMetric extends PerformanceMetric {
    collect() {
        const renderer = window.app?.getModule('renderer')?.getStats();
        return renderer || null;
    }
}

class LoadTimeMetric extends PerformanceMetric {
    collect() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                firstPaint: window.performance.getEntriesByType('paint')[0]?.startTime || 0
            };
        }
        return null;
    }
}

class InteractionMetric extends PerformanceMetric {
    constructor() {
        super();
        this.interactionCount = 0;
        this.setupListeners();
    }

    setupListeners() {
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, () => {
                this.interactionCount++;
            }, { passive: true });
        });
    }

    collect() {
        return {
            totalInteractions: this.interactionCount,
            interactionsPerMinute: this.interactionCount / (performance.now() / 60000)
        };
    }
}

class PerformanceMonitor {
    constructor(performanceModule) {
        this.performanceModule = performanceModule;
        this.isActive = false;
    }

    start() {
        this.isActive = true;
    }

    stop() {
        this.isActive = false;
    }
}

class FrameMonitor extends PerformanceMonitor {
    start() {
        super.start();
        this.checkFrameDrops();
    }

    checkFrameDrops() {
        if (!this.isActive) return;
        
        const stats = this.performanceModule.frameStats;
        if (stats.frameTime > 33.33) { // Below 30 FPS
            this.performanceModule.app.eventBus.emit('performance:frame:drop', {
                frameTime: stats.frameTime,
                fps: stats.fps
            });
        }
        
        requestAnimationFrame(() => this.checkFrameDrops());
    }
}

class MemoryMonitor extends PerformanceMonitor {
    start() {
        super.start();
        this.monitorInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 5000);
    }

    stop() {
        super.stop();
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
    }

    checkMemoryUsage() {
        if (!this.isActive || !performance.memory) return;
        
        const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
        const usage = (usedMB / limitMB) * 100;
        
        if (usage > 80) {
            this.performanceModule.app.eventBus.emit('performance:memory:high', {
                used: usedMB,
                limit: limitMB,
                usage
            });
        }
    }
}

class ThermalMonitor extends PerformanceMonitor {
    start() {
        super.start();
        
        if ('deviceMemory' in navigator && navigator.deviceMemory < 4) {
            this.performanceModule.app.eventBus.emit('performance:thermal:concern', {
                reason: 'Low memory device detected'
            });
        }
    }
}

class BatteryMonitor extends PerformanceMonitor {
    async start() {
        super.start();
        
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                this.monitorBattery(battery);
            } catch (error) {
                // Battery API not available
            }
        }
    }

    monitorBattery(battery) {
        const checkBattery = () => {
            if (battery.level < 0.2 && !battery.charging) {
                this.performanceModule.app.eventBus.emit('performance:battery:low', {
                    level: battery.level,
                    charging: battery.charging
                });
            }
        };
        
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
        checkBattery();
    }
}

window.PerformanceModule = PerformanceModule;