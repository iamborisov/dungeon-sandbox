class LoggerModule {
    constructor(app) {
        this.app = app;
        this.logLevel = 'INFO';
        this.logQueue = [];
        this.maxQueueSize = 1000;
        this.logTargets = new Set();
        this.context = {};
        this.startTime = Date.now();
    }

    async initialize() {
        this.logLevel = this.app.config?.logging?.level || 'INFO';
        
        this.addTarget(new ConsoleLogTarget());
        
        if (this.app.config?.logging?.enableRemote) {
            this.addTarget(new RemoteLogTarget(this.app.config.logging.remoteEndpoint));
        }
        
        this.info('Logger initialized', { level: this.logLevel });
    }

    addTarget(target) {
        this.logTargets.add(target);
    }

    removeTarget(target) {
        this.logTargets.delete(target);
    }

    setContext(key, value) {
        this.context[key] = value;
    }

    log(level, message, data = {}, error = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: { ...this.context, ...data },
            error: error ? this.serializeError(error) : null,
            uptime: Date.now() - this.startTime,
            sessionId: this.getSessionId()
        };

        if (this.shouldLog(level)) {
            this.logTargets.forEach(target => {
                try {
                    target.write(logEntry);
                } catch (e) {
                    console.error('Log target failed:', e);
                }
            });
        }

        this.addToQueue(logEntry);
    }

    debug(message, data = {}) {
        this.log('DEBUG', message, data);
    }

    info(message, data = {}) {
        this.log('INFO', message, data);
    }

    warn(message, data = {}) {
        this.log('WARN', message, data);
    }

    error(message, data = {}, error = null) {
        this.log('ERROR', message, data, error);
    }

    fatal(message, data = {}, error = null) {
        this.log('FATAL', message, data, error);
    }

    performance(name, data = {}) {
        this.log('PERF', `Performance: ${name}`, {
            ...data,
            memory: this.getMemoryInfo(),
            timing: performance.now()
        });
    }

    shouldLog(level) {
        const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4, PERF: 1 };
        return levels[level] >= levels[this.logLevel];
    }

    serializeError(error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause ? this.serializeError(error.cause) : null
        };
    }

    addToQueue(logEntry) {
        this.logQueue.push(logEntry);
        if (this.logQueue.length > this.maxQueueSize) {
            this.logQueue.shift();
        }
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = Math.random().toString(36).substr(2, 9);
        }
        return this.sessionId;
    }

    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    getLogs(filter = {}) {
        let logs = [...this.logQueue];
        
        if (filter.level) {
            logs = logs.filter(log => log.level === filter.level);
        }
        
        if (filter.since) {
            logs = logs.filter(log => new Date(log.timestamp) >= filter.since);
        }
        
        if (filter.message) {
            logs = logs.filter(log => log.message.includes(filter.message));
        }
        
        return logs;
    }

    exportLogs(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.logQueue, null, 2);
            case 'csv':
                return this.logsToCsv();
            default:
                return this.logQueue;
        }
    }

    logsToCsv() {
        const headers = ['timestamp', 'level', 'message', 'uptime'];
        const rows = this.logQueue.map(log => [
            log.timestamp,
            log.level,
            `"${log.message.replace(/"/g, '""')}"`,
            log.uptime
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    async shutdown() {
        this.info('Logger shutting down');
        
        for (const target of this.logTargets) {
            if (target.close) {
                await target.close();
            }
        }
        
        this.logTargets.clear();
    }
}

class ConsoleLogTarget {
    write(logEntry) {
        const { level, message, data, error } = logEntry;
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        
        const logMethod = {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error',
            FATAL: 'error',
            PERF: 'info'
        }[level] || 'log';
        
        const prefix = `[${timestamp}] ${level}:`;
        
        if (Object.keys(data).length > 0 || error) {
            console[logMethod](prefix, message, { data, error });
        } else {
            console[logMethod](prefix, message);
        }
    }
}

class RemoteLogTarget {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.queue = [];
        this.sending = false;
        this.batchSize = 10;
        this.flushInterval = 5000;
        
        setInterval(() => this.flush(), this.flushInterval);
    }

    write(logEntry) {
        this.queue.push(logEntry);
        
        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }

    async flush() {
        if (this.sending || this.queue.length === 0) return;
        
        this.sending = true;
        const batch = this.queue.splice(0, this.batchSize);
        
        try {
            await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: batch })
            });
        } catch (error) {
            console.warn('Failed to send logs to remote target:', error);
            this.queue.unshift(...batch);
        } finally {
            this.sending = false;
        }
    }

    async close() {
        await this.flush();
    }
}

window.LoggerModule = LoggerModule;