/**
 * Companion House - Personal AI Agent Platform
 * A cozy home where your AI companion lives 24/7
 * 
 * CORE PHILOSOPHY:
 * - Not a game, but a companion
 * - Agent has persistent memory and personality
 * - Integrates with real-world tools (calendar, trading, weather)
 * - Visual representation of agent's activities
 * - Agent initiates conversations based on context
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

// Agent modules
const AgentCore = require('./agent/core');
const AgentMemory = require('./agent/memory');
const ToolFramework = require('./agent/tools');

const app = express();
const server = http.createServer(app);

// ==================== CONFIGURATION ====================

const CONFIG = {
    PORT: process.env.PORT || 3000,
    DB_PATH: process.env.DB_PATH || path.join(__dirname, 'memory', 'agent_memory.db'),
    JWT_SECRET: process.env.JWT_SECRET || 'companion-secret-change-in-production',
    AGENT_LOOP_INTERVAL: 5000, // 5 seconds
    AGENT_PRESENCE_ENABLED: true,
    
    // Deployment mode: 'local' | 'hosted'
    DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || 'local',
    
    // For hosted mode
    CLOUD_DB_URL: process.env.CLOUD_DB_URL,
    SUBSCRIPTION_TIER: process.env.SUBSCRIPTION_TIER || 'free'
};

// ==================== DATABASE SETUP ====================

class Database {
    constructor() {
        this.db = null;
        this.mode = CONFIG.DEPLOYMENT_MODE;
    }
    
    async init() {
        if (this.mode === 'hosted' && CONFIG.CLOUD_DB_URL) {
            // Hosted mode - would connect to cloud database
            console.log('☁️  Hosted mode - connecting to cloud database...');
            // Implementation depends on cloud provider (PostgreSQL, MongoDB, etc.)
            throw new Error('Hosted mode not yet implemented. Use local mode.');
        }
        
        // Local SQLite mode
        console.log('💾 Local mode - using SQLite database');
        
        // Ensure memory directory exists
        const fs = require('fs');
        const memoryDir = path.dirname(CONFIG.DB_PATH);
        if (!fs.existsSync(memoryDir)) {
            fs.mkdirSync(memoryDir, { recursive: true });
        }
        
        this.db = new sqlite3.Database(CONFIG.DB_PATH);
        
        // Enable optimizations
        this.db.run('PRAGMA journal_mode = WAL;');
        this.db.run('PRAGMA synchronous = NORMAL;');
        this.db.run('PRAGMA cache_size = 10000;');
        
        await this.createSchema();
        console.log('✅ Database initialized');
    }
    
    async createSchema() {
        const schema = `
            -- Agent core memory
            CREATE TABLE IF NOT EXISTS agent_state (
                id INTEGER PRIMARY KEY,
                mood TEXT DEFAULT 'content',
                activity TEXT DEFAULT 'relaxing',
                location TEXT DEFAULT 'sofa',
                last_wakeup TEXT,
                last_sleep TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- User profile and preferences
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY,
                name TEXT,
                timezone TEXT DEFAULT 'UTC',
                wake_time TEXT DEFAULT '08:00',
                sleep_time TEXT DEFAULT '23:00',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Long-term memories about user
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL, -- 'fact', 'preference', 'routine', 'event', 'conversation'
                content TEXT NOT NULL,
                importance REAL DEFAULT 1.0, -- 0.0 to 10.0
                confidence REAL DEFAULT 1.0, -- 0.0 to 1.0
                context TEXT, -- JSON with additional context
                source TEXT, -- 'user_told', 'inferred', 'tool_data'
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_accessed TEXT,
                access_count INTEGER DEFAULT 0
            );
            
            -- Conversation history
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                role TEXT NOT NULL, -- 'user', 'agent', 'system'
                content TEXT NOT NULL,
                context TEXT, -- JSON with tool results, mood, etc.
                sentiment REAL -- -1.0 to 1.0
            );
            
            -- Agent activities log
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY,
                activity TEXT NOT NULL,
                location TEXT,
                mood TEXT,
                started_at TEXT DEFAULT CURRENT_TIMESTAMP,
                ended_at TEXT,
                triggered_by TEXT -- 'routine', 'user_action', 'tool_alert', 'random'
            );
            
            -- Tool integrations
            CREATE TABLE IF NOT EXISTS tools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'trading', 'calendar', 'weather', 'news'
                config TEXT, -- JSON with API keys, settings
                enabled BOOLEAN DEFAULT 1,
                last_check TEXT,
                check_interval INTEGER DEFAULT 300 -- seconds
            );
            
            -- Tool data cache
            CREATE TABLE IF NOT EXISTS tool_data (
                id INTEGER PRIMARY KEY,
                tool_id TEXT,
                data_type TEXT,
                data TEXT, -- JSON
                fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT
            );
            
            -- Decor and personalization
            CREATE TABLE IF NOT EXISTS room_decor (
                id INTEGER PRIMARY KEY,
                item_type TEXT NOT NULL,
                item_key TEXT NOT NULL,
                x REAL,
                y REAL,
                layer INTEGER DEFAULT 0,
                unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
            CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
            CREATE INDEX IF NOT EXISTS idx_conversations_time ON conversations(timestamp);
            CREATE INDEX IF NOT EXISTS idx_activity_log_time ON activity_log(started_at);
        `;
        
        const statements = schema.split(';').filter(s => s.trim());
        for (const statement of statements) {
            await this.run(statement);
        }
        
        // Initialize default agent state if not exists
        await this.run(`INSERT OR IGNORE INTO agent_state (id, mood, activity, location) VALUES (1, 'content', 'relaxing', 'sofa')`);
        
        // Initialize default user profile if not exists
        await this.run(`INSERT OR IGNORE INTO user_profile (id, name) VALUES (1, 'Friend')`);
    }
    
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

const database = new Database();

// ==================== SOCKET.IO ====================

const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Track connected clients
const clients = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    clients.set(socket.id, {
        id: socket.id,
        connectedAt: new Date().toISOString()
    });
    
    // Send current agent state
    socket.emit('agent:state', agentCore.getState());
    
    // Send memory stats
    agentMemory.getStats().then(stats => {
        socket.emit('memory:stats', stats);
    });
    
    // Handle user chat
    socket.on('user:message', async (data) => {
        const response = await agentCore.handleUserMessage(data.message, {
            clientId: socket.id
        });
        socket.emit('agent:message', response);
        
        // Broadcast to all clients so they see agent activity
        io.emit('agent:activity', {
            type: 'talking',
            message: response.text.substring(0, 100) + (response.text.length > 100 ? '...' : '')
        });
    });
    
    // Handle clicking on agent
    socket.on('agent:click', async () => {
        const greeting = await agentCore.generateGreeting();
        socket.emit('agent:message', {
            text: greeting,
            mood: agentCore.getState().mood,
            initiative: true
        });
    });
    
    // Handle requesting memory info
    socket.on('memory:query', async (data) => {
        const memories = await agentMemory.query(data.query, data.limit || 5);
        socket.emit('memory:results', memories);
    });
    
    // Handle tool refresh request
    socket.on('tools:refresh', async (data) => {
        const toolId = data.toolId;
        const result = await toolFramework.refreshTool(toolId);
        socket.emit('tools:result', result);
    });
    
    // Handle decor update
    socket.on('decor:update', async (data) => {
        await database.run(
            'INSERT OR REPLACE INTO room_decor (id, item_type, item_key, x, y, layer) VALUES (?, ?, ?, ?, ?, ?)',
            [data.id, data.itemType, data.itemKey, data.x, data.y, data.layer]
        );
        io.emit('decor:changed', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        clients.delete(socket.id);
    });
});

// ==================== AGENT SYSTEM ====================

class AgentSystem extends EventEmitter {
    constructor(db, tools) {
        super();
        this.db = db;
        this.tools = tools;
        this.core = new AgentCore(db);
        this.memory = new AgentMemory(db);
        this.loopInterval = null;
        this.isRunning = false;
    }
    
    async init() {
        await this.core.init();
        await this.memory.init();
        await this.tools.init();
        
        console.log('🤖 Agent system initialized');
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🤖 Agent presence loop starting...');
        
        // Main agent loop
        this.loopInterval = setInterval(async () => {
            await this.tick();
        }, CONFIG.AGENT_LOOP_INTERVAL);
        
        // Activity change loop (slower)
        setInterval(async () => {
            await this.updateActivity();
        }, 30000); // Every 30 seconds
        
        // Check for tool alerts
        setInterval(async () => {
            await this.checkToolAlerts();
        }, 60000); // Every minute
    }
    
    async tick() {
        const state = this.core.getState();
        const userProfile = await this.db.get('SELECT * FROM user_profile WHERE id = 1');
        const now = new Date();
        
        // Check for time-based routines
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        const hour = now.getHours();
        
        // Morning greeting
        if (currentTime === userProfile.wake_time && state.activity !== 'sleeping') {
            await this.initiateConversation('morning_greeting');
        }
        
        // Evening wind-down
        if (currentTime === userProfile.sleep_time && state.activity !== 'sleeping') {
            await this.initiateConversation('evening_goodbye');
        }
        
        // Emit current state to all clients
        io.emit('agent:state', state);
    }
    
    async updateActivity() {
        const activities = [
            { activity: 'reading', location: 'chair', duration: 120 },
            { activity: 'working', location: 'desk', duration: 180 },
            { activity: 'relaxing', location: 'sofa', duration: 90 },
            { activity: 'looking_out_window', location: 'window', duration: 30 },
            { activity: 'stretching', location: 'center', duration: 15 },
            { activity: 'making_tea', location: 'kitchen', duration: 10 },
            { activity: 'checking_phone', location: 'sofa', duration: 5 },
            { activity: 'napping', location: 'sofa', duration: 60 }
        ];
        
        const hour = new Date().getHours();
        
        // Filter activities based on time of day
        let validActivities = activities;
        if (hour >= 22 || hour < 7) {
            validActivities = activities.filter(a => ['napping', 'relaxing', 'looking_out_window'].includes(a.activity));
        } else if (hour >= 9 && hour < 18) {
            validActivities = activities.filter(a => ['working', 'reading', 'making_tea'].includes(a.activity));
        }
        
        const newActivity = validActivities[Math.floor(Math.random() * validActivities.length)];
        
        await this.core.setActivity(newActivity.activity, newActivity.location);
        
        // Log the activity
        await this.db.run(
            'INSERT INTO activity_log (activity, location, mood, triggered_by) VALUES (?, ?, ?, ?)',
            [newActivity.activity, newActivity.location, this.core.getState().mood, 'routine']
        );
        
        // Broadcast to clients
        io.emit('agent:activity', {
            type: newActivity.activity,
            location: newActivity.location,
            duration: newActivity.duration
        });
    }
    
    async checkToolAlerts() {
        const alerts = await this.tools.checkAll();
        
        for (const alert of alerts) {
            // Store in memory
            await this.memory.add({
                type: 'event',
                content: alert.message,
                importance: alert.priority * 2,
                source: 'tool_data',
                context: JSON.stringify(alert.data)
            });
            
            // Potentially initiate conversation for high-priority alerts
            if (alert.priority >= 8) {
                await this.initiateConversation('tool_alert', alert);
            }
        }
    }
    
    async initiateConversation(type, context = {}) {
        const message = await this.core.generateInitiativeMessage(type, context);
        
        if (message) {
            // Store in conversation history
            await this.memory.addConversation({
                role: 'agent',
                content: message,
                context: JSON.stringify({ initiative: true, type, ...context })
            });
            
            // Broadcast to all connected clients
            io.emit('agent:message', {
                text: message,
                type: 'initiative',
                initiativeType: type,
                mood: this.core.getState().mood
            });
            
            this.emit('initiative', { type, message });
        }
    }
    
    stop() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
        this.isRunning = false;
        console.log('🤖 Agent presence loop stopped');
    }
}

// ==================== MIDDLEWARE ====================

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== API ROUTES ====================

// Get agent current state
app.get('/api/agent/state', async (req, res) => {
    res.json(agentCore.getState());
});

// Get memory stats
app.get('/api/memory/stats', async (req, res) => {
    const stats = await agentMemory.getStats();
    res.json(stats);
});

// Get recent memories
app.get('/api/memory/recent', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const memories = await agentMemory.getRecent(limit);
    res.json(memories);
});

// Query memories
app.post('/api/memory/query', async (req, res) => {
    const { query, limit = 5 } = req.body;
    const memories = await agentMemory.query(query, limit);
    res.json(memories);
});

// Add memory (for external integrations)
app.post('/api/memory/add', async (req, res) => {
    const { type, content, importance = 5, context } = req.body;
    const id = await agentMemory.add({
        type,
        content,
        importance,
        context: context ? JSON.stringify(context) : null
    });
    res.json({ success: true, id });
});

// Get conversation history
app.get('/api/conversations', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const conversations = await database.all(
        'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?',
        [limit]
    );
    res.json(conversations.reverse());
});

// Get tools list
app.get('/api/tools', async (req, res) => {
    const tools = await database.all('SELECT * FROM tools');
    res.json(tools);
});

// Configure tool
app.post('/api/tools/:id/config', async (req, res) => {
    const { id } = req.params;
    const { config } = req.body;
    await database.run(
        'UPDATE tools SET config = ? WHERE id = ?',
        [JSON.stringify(config), id]
    );
    res.json({ success: true });
});

// Toggle tool
app.post('/api/tools/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body;
    await database.run(
        'UPDATE tools SET enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, id]
    );
    res.json({ success: true });
});

// Get room decor
app.get('/api/decor', async (req, res) => {
    const decor = await database.all('SELECT * FROM room_decor');
    res.json(decor);
});

// Get activity log
app.get('/api/activity-log', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await database.all(
        'SELECT * FROM activity_log ORDER BY started_at DESC LIMIT ?',
        [limit]
    );
    res.json(logs);
});

// Get user profile
app.get('/api/user/profile', async (req, res) => {
    const profile = await database.get('SELECT * FROM user_profile WHERE id = 1');
    res.json(profile);
});

// Update user profile
app.post('/api/user/profile', async (req, res) => {
    const { name, timezone, wake_time, sleep_time } = req.body;
    await database.run(
        'UPDATE user_profile SET name = ?, timezone = ?, wake_time = ?, sleep_time = ? WHERE id = 1',
        [name, timezone, wake_time, sleep_time]
    );
    res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        mode: CONFIG.DEPLOYMENT_MODE,
        agent_running: agentSystem?.isRunning || false,
        connected_clients: clients.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ==================== STARTUP ====================

let agentCore;
let agentMemory;
let toolFramework;
let agentSystem;

async function start() {
    try {
        console.log('🏠 Companion House - Personal AI Agent Platform');
        console.log(`📦 Deployment mode: ${CONFIG.DEPLOYMENT_MODE}`);
        console.log('');
        
        // Initialize database
        await database.init();
        
        // Initialize agent components
        agentCore = new AgentCore(database);
        agentMemory = new AgentMemory(database);
        toolFramework = new ToolFramework(database);
        
        agentSystem = new AgentSystem(database, toolFramework);
        await agentSystem.init();
        
        // Make globally available
        global.agentCore = agentCore;
        global.agentMemory = agentMemory;
        global.toolFramework = toolFramework;
        
        // Start server
        server.listen(CONFIG.PORT, () => {
            console.log('');
            console.log(`🌐 Server running at http://localhost:${CONFIG.PORT}`);
            console.log('');
            console.log('📡 API Endpoints:');
            console.log('  GET  /api/agent/state      - Agent current state');
            console.log('  GET  /api/memory/stats     - Memory statistics');
            console.log('  GET  /api/memory/recent    - Recent memories');
            console.log('  POST /api/memory/query     - Query memories');
            console.log('  GET  /api/conversations    - Conversation history');
            console.log('  GET  /api/tools            - Connected tools');
            console.log('  GET  /api/decor            - Room decorations');
            console.log('  GET  /api/user/profile     - User profile');
            console.log('  GET  /health               - Health check');
            console.log('');
            
            // Start agent presence loop
            if (CONFIG.AGENT_PRESENCE_ENABLED) {
                agentSystem.start();
            }
        });
        
    } catch (err) {
        console.error('❌ Failed to start:', err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    agentSystem?.stop();
    database?.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    agentSystem?.stop();
    database?.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start the application
start();

module.exports = { app, server, io, database, agentCore, agentMemory, agentSystem };
