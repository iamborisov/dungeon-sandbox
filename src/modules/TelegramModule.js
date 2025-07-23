class TelegramModule {
    constructor(app) {
        this.app = app;
        this.tg = null;
        this.isInitialized = false;
        this.themeParams = {};
        this.userInfo = {};
        this.capabilities = new Set();
    }

    async initialize() {
        const logger = this.app.getModule('logger');
        
        try {
            this.tg = window.Telegram?.WebApp;
            
            if (!this.tg) {
                logger.warn('Telegram WebApp not available - running in standalone mode');
                this.initializeStandalone();
                return;
            }

            logger.info('Initializing Telegram WebApp integration');
            
            this.tg.ready();
            this.tg.expand();
            
            this.detectCapabilities();
            this.extractThemeParams();
            this.extractUserInfo();
            this.setupEventHandlers();
            this.setupSwipeHandling();
            this.setupMainButton();
            this.setupBackButton();
            
            this.isInitialized = true;
            this.app.eventBus.emit('telegram:initialized', {
                capabilities: Array.from(this.capabilities),
                theme: this.themeParams,
                user: this.userInfo
            });
            
            logger.info('Telegram WebApp initialized successfully', {
                version: this.tg.version,
                capabilities: Array.from(this.capabilities)
            });
            
        } catch (error) {
            logger.error('Failed to initialize Telegram WebApp', {}, error);
            this.initializeStandalone();
        }
    }

    initializeStandalone() {
        this.isInitialized = false;
        this.themeParams = this.getDefaultTheme();
        this.applyTheme();
        
        this.app.eventBus.emit('telegram:standalone', {
            theme: this.themeParams
        });
    }

    detectCapabilities() {
        const version = parseFloat(this.tg.version || '6.0');
        
        if (version >= 6.1) {
            this.capabilities.add('swipe_control');
            this.capabilities.add('back_button');
        }
        
        if (version >= 6.2) {
            this.capabilities.add('haptic_feedback');
        }
        
        if (version >= 6.3) {
            this.capabilities.add('cloud_storage');
        }
        
        if (this.tg.MainButton) {
            this.capabilities.add('main_button');
        }
        
        if (this.tg.HapticFeedback) {
            this.capabilities.add('haptics');
        }
    }

    extractThemeParams() {
        const params = this.tg.themeParams || {};
        
        this.themeParams = {
            bgColor: params.bg_color || '#ffffff',
            textColor: params.text_color || '#000000',
            hintColor: params.hint_color || '#999999',
            linkColor: params.link_color || '#2481cc',
            buttonColor: params.button_color || '#2481cc',
            buttonTextColor: params.button_text_color || '#ffffff',
            secondaryBgColor: params.secondary_bg_color || '#f0f0f0',
            headerBgColor: params.header_bg_color || '#ffffff',
            accentTextColor: params.accent_text_color || '#2481cc',
            sectionBgColor: params.section_bg_color || '#ffffff',
            sectionHeaderTextColor: params.section_header_text_color || '#6d6d71',
            subtitleTextColor: params.subtitle_text_color || '#999999',
            destructiveTextColor: params.destructive_text_color || '#ff3b30'
        };
        
        this.applyTheme();
    }

    extractUserInfo() {
        const initData = this.tg.initDataUnsafe || {};
        
        this.userInfo = {
            id: initData.user?.id,
            firstName: initData.user?.first_name,
            lastName: initData.user?.last_name,
            username: initData.user?.username,
            languageCode: initData.user?.language_code,
            isPremium: initData.user?.is_premium,
            allowsWriteToPm: initData.user?.allows_write_to_pm
        };
    }

    applyTheme() {
        const root = document.documentElement;
        
        Object.entries(this.themeParams).forEach(([key, value]) => {
            const cssVar = `--tg-theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });
        
        this.app.eventBus.emit('telegram:theme:applied', this.themeParams);
    }

    getDefaultTheme() {
        return {
            bgColor: '#ffffff',
            textColor: '#000000',
            hintColor: '#999999',
            linkColor: '#2481cc',
            buttonColor: '#2481cc',
            buttonTextColor: '#ffffff',
            secondaryBgColor: '#f0f0f0',
            headerBgColor: '#ffffff',
            accentTextColor: '#2481cc',
            sectionBgColor: '#ffffff',
            sectionHeaderTextColor: '#6d6d71',
            subtitleTextColor: '#999999',
            destructiveTextColor: '#ff3b30'
        };
    }

    setupEventHandlers() {
        if (this.tg.onEvent) {
            this.tg.onEvent('themeChanged', () => {
                this.extractThemeParams();
                this.app.eventBus.emit('telegram:theme:changed', this.themeParams);
            });
            
            this.tg.onEvent('viewportChanged', (data) => {
                this.app.eventBus.emit('telegram:viewport:changed', data);
            });
        }
    }

    setupSwipeHandling() {
        if (this.capabilities.has('swipe_control') && this.tg.disableVerticalSwipes) {
            this.tg.disableVerticalSwipes();
            this.app.getModule('logger')?.info('Disabled vertical swipes for better 3D interaction');
        }
    }

    setupMainButton() {
        if (!this.capabilities.has('main_button')) return;
        
        this.mainButton = new TelegramMainButton(this.tg.MainButton, this.app);
    }

    setupBackButton() {
        if (!this.capabilities.has('back_button')) return;
        
        this.tg.BackButton.onClick(() => {
            this.app.eventBus.emit('telegram:back:pressed');
            
            if (this.app.getState('canGoBack')) {
                this.app.eventBus.emit('navigation:back');
            } else {
                this.close();
            }
        });
    }

    showMainButton(text, color = null) {
        if (this.mainButton) {
            this.mainButton.show(text, color);
        }
    }

    hideMainButton() {
        if (this.mainButton) {
            this.mainButton.hide();
        }
    }

    showBackButton() {
        if (this.capabilities.has('back_button')) {
            this.tg.BackButton.show();
        }
    }

    hideBackButton() {
        if (this.capabilities.has('back_button')) {
            this.tg.BackButton.hide();
        }
    }

    hapticFeedback(type = 'impact', style = 'medium') {
        if (!this.capabilities.has('haptics')) return;
        
        try {
            switch (type) {
                case 'impact':
                    this.tg.HapticFeedback.impactOccurred(style);
                    break;
                case 'notification':
                    this.tg.HapticFeedback.notificationOccurred(style);
                    break;
                case 'selection':
                    this.tg.HapticFeedback.selectionChanged();
                    break;
            }
        } catch (error) {
            this.app.getModule('logger')?.warn('Haptic feedback failed', {}, error);
        }
    }

    sendData(data) {
        if (this.isInitialized && this.tg.sendData) {
            this.tg.sendData(JSON.stringify(data));
        }
    }

    close() {
        if (this.isInitialized && this.tg.close) {
            this.tg.close();
        }
    }

    ready() {
        if (this.isInitialized && this.tg.ready) {
            this.tg.ready();
        }
    }

    hasCapability(capability) {
        return this.capabilities.has(capability);
    }

    getTheme() {
        return { ...this.themeParams };
    }

    getUserInfo() {
        return { ...this.userInfo };
    }

    isStandalone() {
        return !this.isInitialized;
    }

    async shutdown() {
        this.app.getModule('logger')?.info('Telegram module shutting down');
        
        if (this.mainButton) {
            this.mainButton.hide();
        }
        
        if (this.capabilities.has('back_button')) {
            this.tg.BackButton.hide();
        }
    }
}

class TelegramMainButton {
    constructor(mainButton, app) {
        this.button = mainButton;
        this.app = app;
        this.isVisible = false;
        this.currentCallback = null;
    }

    show(text, color = null) {
        this.button.setText(text);
        
        if (color) {
            this.button.color = color;
        }
        
        if (!this.isVisible) {
            this.button.show();
            this.isVisible = true;
        }
    }

    hide() {
        if (this.isVisible) {
            this.button.hide();
            this.isVisible = false;
        }
        
        if (this.currentCallback) {
            this.button.offClick(this.currentCallback);
            this.currentCallback = null;
        }
    }

    onClick(callback) {
        if (this.currentCallback) {
            this.button.offClick(this.currentCallback);
        }
        
        this.currentCallback = callback;
        this.button.onClick(callback);
    }

    setProgress(show = true) {
        if (show) {
            this.button.showProgress(false);
        } else {
            this.button.hideProgress();
        }
    }

    enable() {
        this.button.enable();
    }

    disable() {
        this.button.disable();
    }
}

window.TelegramModule = TelegramModule;