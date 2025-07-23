class UIModule {
    constructor(app) {
        this.app = app;
        this.components = new Map();
        this.overlays = new Map();
        this.animations = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        const logger = this.app.getModule('logger');
        
        try {
            logger.info('Initializing UI module');
            
            this.initializeComponents();
            this.setupEventHandlers();
            this.applyTheme();
            
            this.isInitialized = true;
            logger.info('UI module initialized successfully');
            this.app.eventBus.emit('ui:initialized');
            
        } catch (error) {
            logger.error('Failed to initialize UI module', {}, error);
            throw error;
        }
    }

    initializeComponents() {
        this.components.set('loading', new LoadingOverlay(this.app));
        this.components.set('error', new ErrorOverlay(this.app));
        this.components.set('controls', new ControlsPanel(this.app));
        this.components.set('progress', new ProgressIndicator(this.app));
        this.components.set('notifications', new NotificationSystem(this.app));
        
        this.components.forEach((component, name) => {
            if (component.initialize) {
                component.initialize();
            }
        });
    }

    setupEventHandlers() {
        this.app.eventBus.on('telegram:theme:changed', () => {
            this.applyTheme();
        });
        
        this.app.eventBus.on('assets:loading:started', (data) => {
            this.showLoading('Loading assets...');
        });
        
        this.app.eventBus.on('assets:loading:completed', () => {
            this.hideLoading();
        });
        
        this.app.eventBus.on('assets:loading:failed', (data) => {
            this.showError('Failed to load assets', data.error.message);
        });
        
        this.app.eventBus.on('assets:progress:updated', (data) => {
            this.updateProgress(data.percentage, `Loading assets... ${data.loaded}/${data.total}`);
        });
        
        this.app.eventBus.on('renderer:initialized', () => {
            this.showControls();
        });
    }

    applyTheme() {
        const telegram = this.app.getModule('telegram');
        const theme = telegram.getTheme();
        
        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            const cssVar = `--tg-theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });
        
        this.app.eventBus.emit('ui:theme:applied', theme);
    }

    showLoading(message = 'Loading...', hint = '') {
        const loading = this.components.get('loading');
        if (loading) {
            loading.show(message, hint);
        }
    }

    hideLoading() {
        const loading = this.components.get('loading');
        if (loading) {
            loading.hide();
        }
    }

    updateLoadingText(message) {
        const loading = this.components.get('loading');
        if (loading) {
            loading.updateText(message);
        }
    }

    showError(title, message, options = {}) {
        const error = this.components.get('error');
        if (error) {
            error.show(title, message, options);
        }
    }

    hideError() {
        const error = this.components.get('error');
        if (error) {
            error.hide();
        }
    }

    showControls() {
        const controls = this.components.get('controls');
        if (controls) {
            controls.show();
        }
    }

    hideControls() {
        const controls = this.components.get('controls');
        if (controls) {
            controls.hide();
        }
    }

    updateProgress(percentage, message = '') {
        const progress = this.components.get('progress');
        if (progress) {
            progress.update(percentage, message);
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notifications = this.components.get('notifications');
        if (notifications) {
            notifications.show(message, type, duration);
        }
    }

    createOverlay(name, config) {
        const overlay = new CustomOverlay(this.app, config);
        this.overlays.set(name, overlay);
        return overlay;
    }

    showOverlay(name) {
        const overlay = this.overlays.get(name);
        if (overlay) {
            overlay.show();
        }
    }

    hideOverlay(name) {
        const overlay = this.overlays.get(name);
        if (overlay) {
            overlay.hide();
        }
    }

    animateElement(element, animation, duration = 300) {
        const animationId = Math.random().toString(36).substr(2, 9);
        
        const animationPromise = new Promise((resolve) => {
            element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            
            Object.entries(animation).forEach(([property, value]) => {
                element.style[property] = value;
            });
            
            setTimeout(() => {
                element.style.transition = '';
                this.animations.delete(animationId);
                resolve();
            }, duration);
        });
        
        this.animations.set(animationId, animationPromise);
        return animationPromise;
    }

    createButton(config) {
        return new UIButton(config, this.app);
    }

    createSlider(config) {
        return new UISlider(config, this.app);
    }

    createToggle(config) {
        return new UIToggle(config, this.app);
    }

    async shutdown() {
        const logger = this.app.getModule('logger');
        logger.info('UI module shutting down');
        
        this.components.forEach((component) => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        this.overlays.forEach((overlay) => {
            if (overlay.destroy) {
                overlay.destroy();
            }
        });
        
        this.components.clear();
        this.overlays.clear();
        this.animations.clear();
    }
}

class LoadingOverlay {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('loadingOverlay');
        this.textElement = this.element?.querySelector('.loading-text');
        this.hintElement = this.element?.querySelector('.loading-hint');
        this.isVisible = false;
    }

    initialize() {
        if (!this.element) {
            this.createElement();
        }
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.id = 'loadingOverlay';
        this.element.className = 'loading-overlay';
        
        this.element.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">Loading...</div>
            <div class="loading-hint"></div>
        `;
        
        document.body.appendChild(this.element);
        
        this.textElement = this.element.querySelector('.loading-text');
        this.hintElement = this.element.querySelector('.loading-hint');
    }

    show(message = 'Loading...', hint = '') {
        if (!this.element) return;
        
        this.updateText(message);
        if (hint) {
            this.hintElement.textContent = hint;
        }
        
        this.element.classList.remove('hidden');
        this.element.style.display = 'flex';
        this.isVisible = true;
        
        this.app.eventBus.emit('ui:loading:shown', { message, hint });
    }

    hide() {
        if (!this.element || !this.isVisible) return;
        
        this.element.classList.add('hidden');
        
        setTimeout(() => {
            this.element.style.display = 'none';
            this.isVisible = false;
        }, 300);
        
        this.app.eventBus.emit('ui:loading:hidden');
    }

    updateText(message) {
        if (this.textElement) {
            this.textElement.textContent = message;
        }
    }
}

class ErrorOverlay {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('errorOverlay');
        this.titleElement = this.element?.querySelector('.error-title');
        this.messageElement = this.element?.querySelector('.error-message');
        this.retryButton = this.element?.querySelector('.retry-button');
        this.isVisible = false;
    }

    initialize() {
        if (!this.element) {
            this.createElement();
        }
        
        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => {
                this.app.eventBus.emit('ui:error:retry');
            });
        }
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.id = 'errorOverlay';
        this.element.className = 'error-overlay';
        
        this.element.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-title">Error</div>
            <div class="error-message"></div>
            <button class="retry-button">Try Again</button>
        `;
        
        document.body.appendChild(this.element);
        
        this.titleElement = this.element.querySelector('.error-title');
        this.messageElement = this.element.querySelector('.error-message');
        this.retryButton = this.element.querySelector('.retry-button');
        
        this.retryButton.addEventListener('click', () => {
            this.app.eventBus.emit('ui:error:retry');
        });
    }

    show(title, message, options = {}) {
        if (!this.element) return;
        
        this.titleElement.textContent = title;
        this.messageElement.textContent = message;
        
        if (options.hideRetry) {
            this.retryButton.style.display = 'none';
        } else {
            this.retryButton.style.display = 'block';
        }
        
        this.element.style.display = 'flex';
        this.isVisible = true;
        
        this.app.eventBus.emit('ui:error:shown', { title, message, options });
    }

    hide() {
        if (!this.element || !this.isVisible) return;
        
        this.element.style.display = 'none';
        this.isVisible = false;
        
        this.app.eventBus.emit('ui:error:hidden');
    }
}

class ControlsPanel {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('controls');
        this.buttons = new Map();
        this.isVisible = false;
    }

    initialize() {
        if (!this.element) {
            this.createElement();
        }
        
        this.createDefaultButtons();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.id = 'controls';
        this.element.className = 'controls-panel';
        
        document.body.appendChild(this.element);
    }

    createDefaultButtons() {
        this.addButton('reset', 'Reset View', () => {
            this.app.eventBus.emit('renderer:camera:reset');
        });
        
        this.addButton('quality', 'Quality', () => {
            this.app.eventBus.emit('ui:quality:toggle');
        });
    }

    addButton(id, text, onClick) {
        const button = document.createElement('button');
        button.className = 'control-button';
        button.textContent = text;
        button.addEventListener('click', onClick);
        
        this.buttons.set(id, button);
        this.element.appendChild(button);
        
        return button;
    }

    removeButton(id) {
        const button = this.buttons.get(id);
        if (button) {
            this.element.removeChild(button);
            this.buttons.delete(id);
        }
    }

    show() {
        if (!this.element) return;
        
        this.element.style.display = 'flex';
        this.isVisible = true;
        
        this.app.eventBus.emit('ui:controls:shown');
    }

    hide() {
        if (!this.element || !this.isVisible) return;
        
        this.element.style.display = 'none';
        this.isVisible = false;
        
        this.app.eventBus.emit('ui:controls:hidden');
    }
}

class ProgressIndicator {
    constructor(app) {
        this.app = app;
        this.element = null;
        this.isVisible = false;
    }

    initialize() {
        this.createElement();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'progress-indicator';
        this.element.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text"></div>
        `;
        
        document.body.appendChild(this.element);
    }

    update(percentage, message = '') {
        if (!this.element) return;
        
        const fill = this.element.querySelector('.progress-fill');
        const text = this.element.querySelector('.progress-text');
        
        fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        text.textContent = message;
        
        if (!this.isVisible) {
            this.show();
        }
        
        if (percentage >= 100) {
            setTimeout(() => this.hide(), 1000);
        }
    }

    show() {
        if (!this.element) return;
        
        this.element.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        if (!this.element || !this.isVisible) return;
        
        this.element.style.display = 'none';
        this.isVisible = false;
    }
}

class NotificationSystem {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.notifications = new Map();
    }

    initialize() {
        this.createElement();
    }

    createElement() {
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const id = Math.random().toString(36).substr(2, 9);
        const notification = document.createElement('div');
        
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        setTimeout(() => {
            notification.classList.add('notification-enter');
        }, 10);
        
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }
        
        return id;
    }

    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.add('notification-exit');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }
}

class UIButton {
    constructor(config, app) {
        this.app = app;
        this.config = config;
        this.element = this.createElement();
    }

    createElement() {
        const button = document.createElement('button');
        button.className = `ui-button ${this.config.className || ''}`;
        button.textContent = this.config.text || '';
        
        if (this.config.onClick) {
            button.addEventListener('click', this.config.onClick);
        }
        
        return button;
    }

    setText(text) {
        this.element.textContent = text;
    }

    setEnabled(enabled) {
        this.element.disabled = !enabled;
    }

    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

class UISlider {
    constructor(config, app) {
        this.app = app;
        this.config = config;
        this.element = this.createElement();
        this.value = config.value || 0;
    }

    createElement() {
        const container = document.createElement('div');
        container.className = `ui-slider ${this.config.className || ''}`;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = this.config.min || 0;
        slider.max = this.config.max || 100;
        slider.step = this.config.step || 1;
        slider.value = this.config.value || 0;
        
        slider.addEventListener('input', (e) => {
            this.value = parseFloat(e.target.value);
            if (this.config.onChange) {
                this.config.onChange(this.value);
            }
        });
        
        container.appendChild(slider);
        return container;
    }

    setValue(value) {
        this.value = value;
        const slider = this.element.querySelector('input');
        slider.value = value;
    }

    getValue() {
        return this.value;
    }

    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

class UIToggle {
    constructor(config, app) {
        this.app = app;
        this.config = config;
        this.element = this.createElement();
        this.checked = config.checked || false;
    }

    createElement() {
        const container = document.createElement('div');
        container.className = `ui-toggle ${this.config.className || ''}`;
        
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = this.config.checked || false;
        
        toggle.addEventListener('change', (e) => {
            this.checked = e.target.checked;
            if (this.config.onChange) {
                this.config.onChange(this.checked);
            }
        });
        
        container.appendChild(toggle);
        return container;
    }

    setChecked(checked) {
        this.checked = checked;
        const toggle = this.element.querySelector('input');
        toggle.checked = checked;
    }

    isChecked() {
        return this.checked;
    }

    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

window.UIModule = UIModule;