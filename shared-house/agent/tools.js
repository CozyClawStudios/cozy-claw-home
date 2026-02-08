/**
 * Tool Framework - External Integration System
 * 
 * This module manages:
 * - Tool configuration and lifecycle
 * - Data fetching from external APIs
 * - Alert generation based on tool data
 * - Caching and rate limiting
 * 
 * Supported tools:
 * - Trading (crypto/stocks)
 * - Calendar
 * - Weather
 * - News
 * - Custom webhooks
 */

class ToolFramework {
    constructor(database) {
        this.db = database;
        this.tools = new Map();
        this.cache = new Map();
        this.fetchQueue = [];
        this.isProcessing = false;
        
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
                    alertThreshold: 5 // % change
                },
                checkInterval: 300, // 5 minutes
                fetch: this.fetchTradingData.bind(this)
            },
            
            calendar: {
                name: 'Calendar',
                description: 'Google Calendar or iCal integration',
                icon: '📅',
                defaultConfig: {
                    provider: 'google', // or 'ical'
                    icalUrl: '',
                    googleToken: '',
                    alertBefore: 15 // minutes
                },
                checkInterval: 60, // 1 minute
                fetch: this.fetchCalendarData.bind(this)
            },
            
            weather: {
                name: 'Weather',
                description: 'Local weather and forecasts',
                icon: '🌤️',
                defaultConfig: {
                    apiKey: '',
                    location: '',
                    units: 'metric' // or 'imperial'
                },
                checkInterval: 600, // 10 minutes
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
                checkInterval: 1800, // 30 minutes
                fetch: this.fetchNewsData.bind(this)
            },
            
            webhook: {
                name: 'Custom Webhook',
                description: 'Receive data from any webhook source',
                icon: '🔗',
                defaultConfig: {
                    endpoint: '',
                    secret: '',
                    filterRules: []
                },
                checkInterval: 0, // Push-based, no polling
                fetch: null // Not polled
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
                        0, // Disabled by default
                        def.checkInterval
                    ]
                );
                console.log(`🔧 Tool registered: ${def.name}`);
            }
        }
        
        console.log('🔧 Tool framework initialized');
    }
    
    // Fetch data for a specific tool
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
    
    // Check all enabled tools and return alerts
    async checkAll() {
        const alerts = [];
        const tools = await this.db.all('SELECT * FROM tools WHERE enabled = 1');
        
        for (const tool of tools) {
            const def = this.toolDefinitions[tool.type];
            if (!def || !def.fetch) continue;
            
            // Check if it's time to poll
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
    
    // Refresh a specific tool on demand
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
    
    // Generate alerts based on tool data
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
    
    // Tool-specific fetch implementations
    async fetchTradingData(config) {
        // This is a mock implementation
        // In production, this would connect to:
        // - Alpaca API for stocks
        // - CoinGecko/Coinbase for crypto
        // - Custom trading bot endpoints
        
        console.log('📈 Fetching trading data...');
        
        // Simulate data
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
        
        // Mock implementation
        // In production, would fetch from Google Calendar API or parse iCal
        
        const now = new Date();
        const upcoming = [];
        
        // Generate some mock events
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
        
        // Mock implementation
        // In production, would use OpenWeatherMap, WeatherAPI, etc.
        
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
            alerts: [] // Would contain severe weather alerts
        };
    }
    
    async fetchNewsData(config) {
        console.log('📰 Fetching news data...');
        
        // Mock implementation
        // In production, would use NewsAPI, RSS feeds, etc.
        
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
    
    // Handle incoming webhook data
    async handleWebhook(toolId, data, signature = null) {
        const tool = await this.db.get('SELECT * FROM tools WHERE id = ?', [toolId]);
        if (!tool) return { success: false, error: 'Tool not found' };
        
        const config = JSON.parse(tool.config);
        
        // Verify signature if configured
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
        
        // Store webhook data
        await this.db.run(
            `INSERT INTO tool_data (tool_id, data_type, data, fetched_at) 
             VALUES (?, ?, ?, datetime('now'))`,
            [toolId, 'webhook', JSON.stringify(data)]
        );
        
        // Generate alert from webhook
        const alert = {
            toolId,
            type: 'webhook',
            priority: data.priority || 5,
            message: data.message || 'Received webhook data',
            data
        };
        
        return { success: true, alert };
    }
    
    // Get cached data for a tool
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
    
    // Register a new custom tool
    async registerCustomTool(name, type, config) {
        const id = require('uuid').v4();
        
        await this.db.run(
            'INSERT INTO tools (id, name, type, config, enabled, check_interval) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, type, JSON.stringify(config), 0, 300]
        );
        
        return id;
    }
    
    // Get tool status summary
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
}

module.exports = ToolFramework;
