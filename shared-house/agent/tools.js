/**
 * Tool Framework v4.0 - External Integration System
 * 
 * NEW IN v4.0:
 * - ClawBot integration for external AI personality
 * - WebSocket connector to ClawBot
 * - Fallback to local personality when ClawBot unavailable
 * - Config-driven ClawBot settings
 * 
 * This module manages:
 * - Tool configuration and lifecycle
 * - ClawBot WebSocket connection
 * - Data fetching from external APIs
 * - Alert generation based on tool data
 * - Caching and rate limiting
 */

class ToolFramework {
    constructor(database) {
        this.db = database;
        this.tools = new Map();
        this.cache = new Map();
        this.fetchQueue = [];
        this.isProcessing = false;
        
        // ClawBot connection
        this.clawbot = {
            ws: null,
            connected: false,
            config: null,
            messageQueue: [],
            lastPing: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };
        
        // Built-in tool definitions
        this.toolDefinitions = {
            trading: {
                name: 'Trading Dashboard',
                description: 'Monitor stocks, crypto, and trading bots',
                icon: '📈',
                defaultConfig: {
                    apiKey: '',
                    apiSecret: '',
                    watchlist: ['BTC', 'ETH', 'AAPL'],
                    alertThreshold: 5
                },
                checkInterval: 300,
                fetch: this.fetchTradingData.bind(this)
            },
            
            calendar: {
                name: 'Calendar',
                description: 'Google Calendar or iCal integration',
                icon: '📅',
                defaultConfig: {
                    provider: 'google',
                    icalUrl: '',
                    googleToken: '',
                    alertBefore: 15
                },
                checkInterval: 60,
                fetch: this.fetchCalendarData.bind(this)
            },
            
            weather: {
                name: 'Weather',
                description: 'Local weather and forecasts',
                icon: '🌤️',
                defaultConfig: {
                    apiKey: '',
                    location: '',
                    units: 'metric'
                },
                checkInterval: 600,
                fetch: this.fetchWeatherData.bind(this)
            },
            
            news: {
                name: 'News Feed',
                description: 'Latest headlines and personalized news',
                icon: '📰',
                defaultConfig: {
                    apiKey: '',
                    topics: ['technology', 'science'],
                    sources: []
                },
                checkInterval: 1800,
                fetch: this.fetchNewsData.bind(this)
            },
            
            clawbot: {
                name: 'ClawBot Integration',
                description: 'Connect to external ClawBot for enhanced AI personality',
                icon: '🔗',
                defaultConfig: {
                    enabled: false,
                    wsUrl: 'ws://localhost:8080/clawbot',
                    apiKey: '',
                    fallbackOnDisconnect: true,
                    overridePersonality: true,
                    connectionTimeout: 5000,
                    heartbeatInterval: 30000
                },
                checkInterval: 0,
                fetch: null
            },
            
            webhook: {
                name: 'Custom Webhook',
                description: 'Receive data from any webhook source',
                icon: '🔌',
                defaultConfig: {
                    endpoint: '',
                    secret: '',
                    filterRules: []
                },
                checkInterval: 0,
                fetch: null
            }
        };
    }
    
    async init() {
        // Ensure default tools exist in database
        for (const [type, def] of Object.entries(this.toolDefinitions)) {
            const existing = await this.db.get('SELECT * FROM tools WHERE type = ?', [type]);
            if (!existing) {
                await this.db.run(
                    'INSERT INTO tools (id, name, type, config, enabled, check_interval) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        require('uuid').v4(),
                        def.name,
                        type,
                        JSON.stringify(def.defaultConfig),
                        0,
                        def.checkInterval
                    ]
                );
                console.log(`🔧 Tool registered: ${def.name}`);
            }
        }
        
        // Initialize ClawBot if enabled
        await this.initClawBot();
        
        console.log('🔧 Tool framework v4.0 initialized');
    }
    
    // ==================== CLAWBOT INTEGRATION ====================
    
    async initClawBot() {
        const tool = await this.db.get("SELECT * FROM tools WHERE type = 'clawbot'");
        if (!tool) return;
        
        this.clawbot.config = JSON.parse(tool.config);
        
        if (this.clawbot.config.enabled) {
            await this.connectClawBot();
        }
    }
    
    async connectClawBot() {
        if (!this.clawbot.config || !this.clawbot.config.enabled) {
            return { success: false, error: 'ClawBot not enabled' };
        }
        
        try {
            const WebSocket = require('ws');
            
            console.log(`🔗 Connecting to ClawBot at ${this.clawbot.config.wsUrl}...`);
            
            this.clawbot.ws = new WebSocket(this.clawbot.config.wsUrl, {
                headers: {
                    'X-API-Key': this.clawbot.config.apiKey
                },
                handshakeTimeout: this.clawbot.config.connectionTimeout || 5000
            });
            
            this.clawbot.ws.on('open', () => {
                console.log('✅ Connected to ClawBot');
                this.clawbot.connected = true;
                this.clawbot.reconnectAttempts = 0;
                this.clawbot.lastPing = Date.now();
                
                // Send any queued messages
                while (this.clawbot.messageQueue.length > 0) {
                    const msg = this.clawbot.messageQueue.shift();
                    this.sendToClawBot(msg);
                }
                
                // Start heartbeat
                this.startClawBotHeartbeat();
            });
            
            this.clawbot.ws.on('message', (data) => {
                this.handleClawBotMessage(data);
            });
            
            this.clawbot.ws.on('close', () => {
                console.log('⚠️ ClawBot connection closed');
                this.clawbot.connected = false;
                this.stopClawBotHeartbeat();
                
                if (this.clawbot.config.fallbackOnDisconnect) {
                    console.log('🔄 Falling back to local personality');
                }
                
                // Attempt reconnection
                if (this.clawbot.reconnectAttempts < this.clawbot.maxReconnectAttempts) {
                    this.clawbot.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.clawbot.reconnectAttempts), 30000);
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.clawbot.reconnectAttempts})`);
                    setTimeout(() => this.connectClawBot(), delay);
                }
            });
            
            this.clawbot.ws.on('error', (err) => {
                console.error('❌ ClawBot connection error:', err.message);
                this.clawbot.connected = false;
            });
            
            return { success: true };
            
        } catch (err) {
            console.error('❌ Failed to connect to ClawBot:', err.message);
            return { success: false, error: err.message };
        }
    }
    
    disconnectClawBot() {
        if (this.clawbot.ws) {
            this.clawbot.ws.close();
            this.clawbot.ws = null;
        }
        this.clawbot.connected = false;
        this.stopClawBotHeartbeat();
        console.log('🔌 Disconnected from ClawBot');
    }
    
    sendToClawBot(message) {
        if (!this.clawbot.connected || !this.clawbot.ws) {
            // Queue message for when connection is restored
            this.clawbot.messageQueue.push(message);
            return false;
        }
        
        try {
            this.clawbot.ws.send(JSON.stringify(message));
            return true;
        } catch (err) {
            console.error('Failed to send to ClawBot:', err);
            this.clawbot.messageQueue.push(message);
            return false;
        }
    }
    
    handleClawBotMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'response':
                    // Forward to any listeners
                    this.emit('clawbot:response', message);
                    break;
                    
                case 'initiative':
                    // ClawBot wants to say something proactively
                    this.emit('clawbot:initiative', message);
                    break;
                    
                case 'personality_update':
                    // ClawBot is updating personality settings
                    this.emit('clawbot:personality', message.data);
                    break;
                    
                case 'pong':
                    this.clawbot.lastPing = Date.now();
                    break;
                    
                case 'error':
                    console.error('ClawBot error:', message.error);
                    break;
                    
                default:
                    console.log('Unknown ClawBot message:', message);
            }
        } catch (err) {
            console.error('Failed to parse ClawBot message:', err);
        }
    }
    
    startClawBotHeartbeat() {
        if (this.clawbot.heartbeatInterval) {
            clearInterval(this.clawbot.heartbeatInterval);
        }
        
        const interval = this.clawbot.config.heartbeatInterval || 30000;
        this.clawbot.heartbeatInterval = setInterval(() => {
            if (this.clawbot.connected) {
                this.sendToClawBot({ type: 'ping', timestamp: Date.now() });
                
                // Check if we've missed pings
                if (Date.now() - this.clawbot.lastPing > interval * 3) {
                    console.log('⚠️ ClawBot heartbeat timeout');
                    this.clawbot.ws.terminate();
                }
            }
        }, interval);
    }
    
    stopClawBotHeartbeat() {
        if (this.clawbot.heartbeatInterval) {
            clearInterval(this.clawbot.heartbeatInterval);
            this.clawbot.heartbeatInterval = null;
        }
    }
    
    // Send user message to ClawBot and get response
    async queryClawBot(userMessage, context = {}) {
        if (!this.clawbot.connected) {
            return {
                success: false,
                fallback: true,
                error: 'ClawBot not connected'
            };
        }
        
        return new Promise((resolve, reject) => {
            const requestId = require('uuid').v4();
            
            // Set up one-time listener for response
            const handleResponse = (message) => {
                if (message.requestId === requestId) {
                    this.off('clawbot:response', handleResponse);
                    
                    // Clear timeout
                    clearTimeout(timeout);
                    
                    resolve({
                        success: true,
                        response: message.data,
                        fromClawBot: true
                    });
                }
            };
            
            this.on('clawbot:response', handleResponse);
            
            // Timeout after 10 seconds
            const timeout = setTimeout(() => {
                this.off('clawbot:response', handleResponse);
                resolve({
                    success: false,
                    fallback: true,
                    error: 'ClawBot response timeout'
                });
            }, 10000);
            
            // Send request
            this.sendToClawBot({
                type: 'query',
                requestId,
                message: userMessage,
                context
            });
        });
    }
    
    // Check if ClawBot is available
    isClawBotAvailable() {
        return this.clawbot.connected && this.clawbot.config && this.clawbot.config.enabled;
    }
    
    // Get ClawBot status
    getClawBotStatus() {
        return {
            connected: this.clawbot.connected,
            enabled: this.clawbot.config?.enabled || false,
            url: this.clawbot.config?.wsUrl,
            reconnectAttempts: this.clawbot.reconnectAttempts,
            queueLength: this.clawbot.messageQueue.length
        };
    }
    
    // ==================== STANDARD TOOLS ====================
    
    async fetchToolData(toolId) {
        const tool = await this.db.get('SELECT * FROM tools WHERE id = ?', [toolId]);
        if (!tool || !tool.enabled) return null;
        
        const def = this.toolDefinitions[tool.type];
        if (!def || !def.fetch) return null;
        
        try {
            const config = JSON.parse(tool.config);
            const data = await def.fetch(config);
            
            // Cache the data
            await this.db.run(
                `INSERT INTO tool_data (tool_id, data_type, data, fetched_at, expires_at) 
                 VALUES (?, ?, ?, datetime('now'), datetime('now', '+1 hour'))`,
                [toolId, 'latest', JSON.stringify(data)]
            );
            
            // Update last check time
            await this.db.run(
                'UPDATE tools SET last_check = datetime("now") WHERE id = ?',
                [toolId]
            );
            
            return data;
        } catch (err) {
            console.error(`Failed to fetch data for tool ${toolId}:`, err);
            return null;
        }
    }
    
    async checkAll() {
        const alerts = [];
        const tools = await this.db.all('SELECT * FROM tools WHERE enabled = 1');
        
        for (const tool of tools) {
            const def = this.toolDefinitions[tool.type];
            if (!def || !def.fetch) continue;
            
            if (def.checkInterval > 0) {
                const lastCheck = tool.last_check ? new Date(tool.last_check) : null;
                const shouldCheck = !lastCheck || 
                    (Date.now() - lastCheck.getTime()) > (def.checkInterval * 1000);
                
                if (shouldCheck) {
                    const data = await this.fetchToolData(tool.id);
                    if (data) {
                        const toolAlerts = this.generateAlerts(tool, data);
                        alerts.push(...toolAlerts);
                    }
                }
            }
        }
        
        return alerts;
    }
    
    async refreshTool(toolId) {
        const tool = await this.db.get('SELECT * FROM tools WHERE id = ?', [toolId]);
        if (!tool) return { success: false, error: 'Tool not found' };
        
        const data = await this.fetchToolData(toolId);
        return {
            success: !!data,
            data: data,
            timestamp: new Date().toISOString()
        };
    }
    
    generateAlerts(tool, data) {
        const alerts = [];
        const config = JSON.parse(tool.config);
        
        switch (tool.type) {
            case 'trading':
                if (data.changes) {
                    for (const [symbol, change] of Object.entries(data.changes)) {
                        if (Math.abs(change) >= config.alertThreshold) {
                            alerts.push({
                                toolId: tool.id,
                                type: 'trading',
                                priority: Math.abs(change) >= 10 ? 9 : 7,
                                message: `${symbol} is ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}%!`,
                                data: { symbol, change }
                            });
                        }
                    }
                }
                break;
                
            case 'calendar':
                if (data.upcoming) {
                    for (const event of data.upcoming) {
                        const minutesUntil = (new Date(event.start) - Date.now()) / 60000;
                        if (minutesUntil > 0 && minutesUntil <= config.alertBefore) {
                            alerts.push({
                                toolId: tool.id,
                                type: 'calendar',
                                priority: minutesUntil <= 5 ? 8 : 6,
                                message: `Upcoming: "${event.title}" in ${Math.round(minutesUntil)} minutes`,
                                data: event
                            });
                        }
                    }
                }
                break;
                
            case 'weather':
                if (data.alerts) {
                    for (const alert of data.alerts) {
                        alerts.push({
                            toolId: tool.id,
                            type: 'weather',
                            priority: alert.severity === 'extreme' ? 10 : 7,
                            message: `Weather alert: ${alert.description}`,
                            data: alert
                        });
                    }
                }
                break;
        }
        
        return alerts;
    }
    
    async fetchTradingData(config) {
        console.log('📈 Fetching trading data...');
        
        return {
            timestamp: new Date().toISOString(),
            portfolio: {
                total: 15420.50,
                dayChange: 245.30,
                dayChangePercent: 1.62
            },
            watchlist: config.watchlist.map(symbol => ({
                symbol,
                price: Math.random() * 1000,
                change24h: (Math.random() - 0.5) * 20
            })),
            changes: config.watchlist.reduce((acc, symbol) => {
                acc[symbol] = (Math.random() - 0.5) * 15;
                return acc;
            }, {})
        };
    }
    
    async fetchCalendarData(config) {
        console.log('📅 Fetching calendar data...');
        
        const now = new Date();
        const upcoming = [];
        
        const mockEvents = [
            { title: 'Team Standup', start: new Date(now.getTime() + 30 * 60000) },
            { title: 'Lunch with Sarah', start: new Date(now.getTime() + 3 * 60 * 60000) },
            { title: 'Project Review', start: new Date(now.getTime() + 5 * 60 * 60000) }
        ];
        
        return {
            timestamp: now.toISOString(),
            upcoming: mockEvents.map(e => ({
                ...e,
                start: e.start.toISOString()
            }))
        };
    }
    
    async fetchWeatherData(config) {
        console.log('🌤️ Fetching weather data...');
        
        const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        
        return {
            timestamp: new Date().toISOString(),
            location: config.location || 'Unknown',
            current: {
                temp: 22,
                condition,
                humidity: 65,
                windSpeed: 12
            },
            forecast: [
                { day: 'Today', high: 24, low: 18, condition },
                { day: 'Tomorrow', high: 26, low: 19, condition: 'sunny' }
            ],
            alerts: []
        };
    }
    
    async fetchNewsData(config) {
        console.log('📰 Fetching news data...');
        
        const headlines = [
            'Tech stocks rally on AI optimism',
            'New renewable energy milestone reached',
            'Space mission launches successfully',
            'Breakthrough in battery technology announced'
        ];
        
        return {
            timestamp: new Date().toISOString(),
            headlines: headlines.map((title, i) => ({
                id: i,
                title,
                source: 'Tech Daily',
                publishedAt: new Date().toISOString()
            }))
        };
    }
    
    async handleWebhook(toolId, data, signature = null) {
        const tool = await this.db.get('SELECT * FROM tools WHERE id = ?', [toolId]);
        if (!tool) return { success: false, error: 'Tool not found' };
        
        const config = JSON.parse(tool.config);
        
        if (config.secret && signature) {
            const crypto = require('crypto');
            const expected = crypto
                .createHmac('sha256', config.secret)
                .update(JSON.stringify(data))
                .digest('hex');
            
            if (signature !== expected) {
                return { success: false, error: 'Invalid signature' };
            }
        }
        
        await this.db.run(
            `INSERT INTO tool_data (tool_id, data_type, data, fetched_at) 
             VALUES (?, ?, ?, datetime('now'))`,
            [toolId, 'webhook', JSON.stringify(data)]
        );
        
        const alert = {
            toolId,
            type: 'webhook',
            priority: data.priority || 5,
            message: data.message || 'Received webhook data',
            data
        };
        
        return { success: true, alert };
    }
    
    async getCachedData(toolId) {
        const cached = await this.db.get(
            `SELECT * FROM tool_data 
             WHERE tool_id = ? AND expires_at > datetime('now')
             ORDER BY fetched_at DESC LIMIT 1`,
            [toolId]
        );
        
        if (cached) {
            return JSON.parse(cached.data);
        }
        return null;
    }
    
    async registerCustomTool(name, type, config) {
        const id = require('uuid').v4();
        
        await this.db.run(
            'INSERT INTO tools (id, name, type, config, enabled, check_interval) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, type, JSON.stringify(config), 0, 300]
        );
        
        return id;
    }
    
    async getStatus() {
        const tools = await this.db.all('SELECT * FROM tools');
        
        return tools.map(tool => ({
            id: tool.id,
            name: tool.name,
            type: tool.type,
            enabled: !!tool.enabled,
            lastCheck: tool.last_check,
            icon: this.toolDefinitions[tool.type]?.icon || '🔧'
        }));
    }
    
    // Event emitter for ClawBot messages
    emit(event, data) {
        // Simple event emitter - would be replaced with proper EventEmitter in production
        if (this.eventListeners && this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => cb(data));
        }
    }
    
    on(event, callback) {
        if (!this.eventListeners) this.eventListeners = {};
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners && this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
}

module.exports = ToolFramework;
