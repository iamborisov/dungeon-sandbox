class Application {
    constructor() {
        this.modules = new Map();
        this.eventBus = new EventEmitter();
        this.config = null;
        this.state = {};
        this.isInitialized = false;
    }

    async initialize(config) {
        try {
            this.config = config;
            
            await this.loadModules();
            await this.initializeModules();
            
            this.isInitialized = true;
            this.eventBus.emit('application:initialized');
            
            return this;
        } catch (error) {
            throw new ApplicationError('Failed to initialize application', error);
        }
    }

    async loadModules() {
        const moduleSpecs = [
            { name: 'logger', module: LoggerModule },
            { name: 'config', module: ConfigModule },
            { name: 'telegram', module: TelegramModule },
            { name: 'renderer', module: RendererModule },
            { name: 'assets', module: AssetModule },
            { name: 'ui', module: UIModule },
            { name: 'performance', module: PerformanceModule }
        ];

        for (const spec of moduleSpecs) {
            const instance = new spec.module(this);
            this.modules.set(spec.name, instance);
        }
    }

    async initializeModules() {
        const initOrder = ['logger', 'config', 'telegram', 'renderer', 'assets', 'ui', 'performance'];
        
        for (const moduleName of initOrder) {
            const module = this.modules.get(moduleName);
            if (module && typeof module.initialize === 'function') {
                await module.initialize();
            }
        }
    }

    getModule(name) {
        return this.modules.get(name);
    }

    setState(key, value) {
        this.state[key] = value;
        this.eventBus.emit('state:changed', { key, value });
    }

    getState(key) {
        return this.state[key];
    }

    async shutdown() {
        this.eventBus.emit('application:shutdown');
        
        const shutdownOrder = Array.from(this.modules.keys()).reverse();
        for (const moduleName of shutdownOrder) {
            const module = this.modules.get(moduleName);
            if (module && typeof module.shutdown === 'function') {
                await module.shutdown();
            }
        }
        
        this.modules.clear();
        this.isInitialized = false;
    }
}

class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

class ApplicationError extends Error {
    constructor(message, cause = null) {
        super(message);
        this.name = 'ApplicationError';
        this.cause = cause;
        this.timestamp = new Date().toISOString();
    }
}

window.Application = Application;
window.EventEmitter = EventEmitter;
window.ApplicationError = ApplicationError;