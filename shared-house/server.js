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
 * 
 * NEW FEATURES:
 * - ClawBot Bridge: Real connection to main agent via message queue
 * - Decoration System: Customizable furniture and room themes
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const WebSocket = require('ws'); // Add WebSocket client

// Agent modules
const AgentCore = require('./agent/core');
const AgentMemory = require('./agent/memory');
const ToolFramework = require('./agent/tools');
// const VoiceSystem = require('./agent/voice'); // FUTURE: Voice system not ready yet

// NEW: Bridge and Decor systems
const ClawBotBridge = require('./bridge/clawbot-bridge');
const DecorDatabase = require('./decor/decor-database');

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
            console.log('☁️  Hosted mode - connecting to cloud database...');
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
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                importance REAL DEFAULT 1.0,
                confidence REAL DEFAULT 1.0,
                context TEXT,
                source TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_accessed TEXT,
                access_count INTEGER DEFAULT 0
            );
            
            -- Conversation history
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                context TEXT,
                sentiment REAL
            );
            
            -- Agent activities log
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY,
                activity TEXT NOT NULL,
                location TEXT,
                mood TEXT,
                started_at TEXT DEFAULT CURRENT_TIMESTAMP,
                ended_at TEXT,
                triggered_by TEXT
            );
            
            -- Tool integrations
            CREATE TABLE IF NOT EXISTS tools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                config TEXT,
                enabled BOOLEAN DEFAULT 1,
                last_check TEXT,
                check_interval INTEGER DEFAULT 300
            );
            
            -- Tool data cache
            CREATE TABLE IF NOT EXISTS tool_data (
                id INTEGER PRIMARY KEY,
                tool_id TEXT,
                data_type TEXT,
                data TEXT,
                fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT
            );
            
            -- Decor and personalization (legacy, now handled by DecorDatabase)
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

// ==================== BRIDGE SETUP ====================
let clawbotBridge;


// ==================== AGENT SYSTEM ====================

class AgentSystem extends EventEmitter {
    constructor(db, tools) {
        super();
        this.db = db;
        this.tools = tools;
        // this.voice = new VoiceSystem(); // FUTURE: Voice system
        this.core = new AgentCore(db); // { voice: this.voice }
        this.memory = new AgentMemory(db);
        this.loopInterval = null;
        this.isRunning = false;
    }
    
    async init(io) {
        await this.core.init(io);
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
        }, 30000);
        
        // Check for tool alerts
        setInterval(async () => {
            await this.checkToolAlerts();
        }, 60000);

        // DISABLED: Economy milestones
        // setInterval(async () => {
        //     await this.checkEconomyMilestones();
        // }, 5 * 60 * 1000);
    }
    
    async tick() {
        const state = this.core.getState();
        const userProfile = await this.db.get('SELECT * FROM user_profile WHERE id = 1');
        const now = new Date();
        
        // Check for time-based routines
        const currentTime = now.toTimeString().slice(0, 5);
        
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
        
        let validActivities = activities;
        if (hour >= 22 || hour < 7) {
            validActivities = activities.filter(a => ['napping', 'relaxing', 'looking_out_window'].includes(a.activity));
        } else if (hour >= 9 && hour < 18) {
            validActivities = activities.filter(a => ['working', 'reading', 'making_tea'].includes(a.activity));
        }
        
        const newActivity = validActivities[Math.floor(Math.random() * validActivities.length)];
        
        await this.core.setActivity(newActivity.activity, newActivity.location);
        
        await this.db.run(
            'INSERT INTO activity_log (activity, location, mood, triggered_by) VALUES (?, ?, ?, ?)',
            [newActivity.activity, newActivity.location, this.core.getState().mood, 'routine']
        );
        
        io.emit('agent:activity', {
            type: newActivity.activity,
            location: newActivity.location,
            duration: newActivity.duration
        });
    }
    
    async checkToolAlerts() {
        const alerts = await this.tools.checkAll();
        
        for (const alert of alerts) {
            await this.memory.add({
                type: 'event',
                content: alert.message,
                importance: alert.priority * 2,
                source: 'tool_data',
                context: JSON.stringify(alert.data)
            });
            
            if (alert.priority >= 8) {
                await this.initiateConversation('tool_alert', alert);
            }
        }
    }
    
    async initiateConversation(type, context = {}) {
        const message = await this.core.generateInitiativeMessage(type, context);
        
        if (message) {
            await this.memory.addConversation({
                role: 'agent',
                content: message,
                context: JSON.stringify({ initiative: true, type, ...context })
            });
            
            io.emit('agent:message', {
                text: message,
                type: 'initiative',
                initiativeType: type,
                mood: this.core.getState().mood
            });
            
            this.emit('initiative', { type, message });
        }
    }

    // DISABLED: Economy milestones
    async checkEconomyMilestones() {
        return; // Feature disabled
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

// Add memory
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

// Legacy decor endpoint
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

// ==================== NEW: CLAWBOT BRIDGE API ====================

// Send message via bridge
app.post('/api/clawbot/message', async (req, res) => {
    if (clawbotBridge) {
        await clawbotBridge.apiSendMessage(req, res);
    } else {
        res.status(503).json({ error: 'Bridge not initialized' });
    }
});

// Get responses
app.get('/api/clawbot/responses', async (req, res) => {
    if (clawbotBridge) {
        await clawbotBridge.apiGetResponses(req, res);
    } else {
        res.status(503).json({ error: 'Bridge not initialized' });
    }
});

// Webhook for external agents
app.post('/api/clawbot/webhook', async (req, res) => {
    if (clawbotBridge) {
        await clawbotBridge.apiWebhook(req, res);
    } else {
        res.status(503).json({ error: 'Bridge not initialized' });
    }
});

// Bridge status
app.get('/api/clawbot/status', (req, res) => {
    if (clawbotBridge) {
        clawbotBridge.apiGetStatus(req, res);
    } else {
        res.status(503).json({ error: 'Bridge not initialized' });
    }
});

// ==================== NEW: DECOR API ====================

const decorDB = new DecorDatabase(database);

// Get decor catalog
app.get('/api/decor/catalog', async (req, res) => {
    try {
        const { category, style } = req.query;
        const items = await decorDB.getCatalog(category, style);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get placements
app.get('/api/decor/placements', async (req, res) => {
    try {
        const themeId = req.query.theme || 'default';
        const placements = await decorDB.getPlacements(themeId);
        res.json(placements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Place item
app.post('/api/decor/place', async (req, res) => {
    try {
        const { itemId, x, y, rotation, themeId } = req.body;
        const result = await decorDB.placeItem(itemId, x, y, { rotation, themeId });
        
        // Broadcast to all clients
        io.emit('decor:changed', { type: 'place', ...result });
        
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Move item
app.post('/api/decor/move', async (req, res) => {
    try {
        const { placementId, x, y, rotation } = req.body;
        const result = await decorDB.moveItem(placementId, x, y, rotation);
        
        io.emit('decor:changed', { type: 'move', ...result });
        
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Remove item
app.delete('/api/decor/place/:id', async (req, res) => {
    try {
        await decorDB.removeItem(req.params.id);
        
        io.emit('decor:changed', { type: 'remove', id: req.params.id });
        
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Clear theme
app.delete('/api/decor/clear', async (req, res) => {
    try {
        const themeId = req.query.theme || 'default';
        await decorDB.clearTheme(themeId);
        
        io.emit('decor:changed', { type: 'clear', themeId });
        
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get themes
app.get('/api/decor/themes', async (req, res) => {
    try {
        const themes = await decorDB.getThemes();
        res.json(themes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set theme
app.post('/api/decor/theme', async (req, res) => {
    try {
        const { themeId } = req.body;
        await decorDB.setTheme(themeId);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Record interaction
app.post('/api/decor/interaction', async (req, res) => {
    try {
        const result = await decorDB.recordInteraction();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unlock progress
app.get('/api/decor/unlocks', async (req, res) => {
    try {
        const progress = await decorDB.getUnlockProgress();
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get decor stats
app.get('/api/decor/stats', async (req, res) => {
    try {
        const stats = await decorDB.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/*
// Get current economy data (for dashboard)
app.get('/api/economy', async (req, res) => {
    try {
        res.json(summary);
    } catch (err) {
        console.error('Economy API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get weekly economy summary
app.get('/api/economy/weekly', async (req, res) => {
    try {
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all-time stats
app.get('/api/economy/stats', async (req, res) => {
    try {
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
*/

// ==================== OPENCLAW WEBSOCKET BRIDGE ====================

let openclawWs = null;
let openclawConnected = false;
const pendingRequests = new Map();

// Load OpenClaw token from config
let openclawToken = null;
try {
    const openclawConfig = require(path.join(process.env.HOME || '/home/zak', '.openclaw', 'openclaw.json'));
    openclawToken = openclawConfig?.gateway?.auth?.token;
    console.log('🔑 OpenClaw token loaded:', openclawToken ? 'Yes' : 'No');
} catch (e) {
    console.log('⚠️ Could not load OpenClaw config');
}

function connectToOpenClaw() {
    try {
        // Connect to OpenClaw WebSocket
        openclawWs = new WebSocket('ws://127.0.0.1:18789');
        
        openclawWs.on('open', () => {
            console.log('✅ Connected to OpenClaw WebSocket');
            // Wait for challenge - do not send auth here
        });
        
        openclawWs.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                console.log('📨 OpenClaw message:', JSON.stringify(msg, null, 2));
                
                // Handle connection challenge
                if (msg.type === 'event' && msg.event === 'connect.challenge') {
                    console.log('🔐 Responding to OpenClaw challenge...');
                    
                    const response = {
                        type: 'event',
                        event: 'connect.challenge_response',
                        payload: {
                            nonce: msg.payload?.nonce,
                            ts: msg.payload?.ts,
                            accepted: true
                        }
                    };
                    console.log('📤 Sending challenge response:', JSON.stringify(response));
                    openclawWs.send(JSON.stringify(response));
                    return;
                }
                
                // Handle successful connection
                if (msg.type === 'event' && msg.event === 'connect.ready') {
                    console.log('✅ OpenClaw connection established!');
                    openclawConnected = true;
                    return;
                }
                
                // Handle connection error
                if (msg.type === 'event' && msg.event === 'connect.error') {
                    console.error('❌ OpenClaw connection error:', msg.payload);
                    return;
                }
                
                // Handle response to chat messages
                if (msg.type === 'response' && msg.id) {
                    const pending = pendingRequests.get(msg.id);
                    if (pending) {
                        pending.resolve(msg);
                        pendingRequests.delete(msg.id);
                    }
                }
                
                // Handle agent messages (from Celest)
                if (msg.type === 'agent:message') {
                    console.log('💬 Agent message:', msg.data);
                    // Broadcast to all connected browser clients via Socket.IO
                    io.emit('agent:message', msg.data);
                }
            } catch (e) {
                console.error('Error parsing OpenClaw message:', e);
            }
        });
        
        openclawWs.on('close', () => {
            console.log('🔌 OpenClaw WebSocket disconnected');
            openclawConnected = false;
            setTimeout(connectToOpenClaw, 5000);
        });
        
        openclawWs.on('error', (err) => {
            console.error('❌ OpenClaw WebSocket error:', err.message);
            openclawConnected = false;
        });
    } catch (err) {
        console.error('Failed to connect to OpenClaw:', err.message);
        setTimeout(connectToOpenClaw, 5000);
    }
}

// Send message to OpenClaw and wait for response
function sendToOpenClaw(message, context = {}) {
    return new Promise((resolve, reject) => {
        if (!openclawWs || openclawWs.readyState !== WebSocket.OPEN) {
            reject(new Error('OpenClaw not connected'));
            return;
        }
        
        if (!openclawConnected) {
            reject(new Error('OpenClaw handshake not complete'));
            return;
        }
        
        const id = uuidv4();
        const timeout = setTimeout(() => {
            pendingRequests.delete(id);
            reject(new Error('OpenClaw response timeout'));
        }, 10000);
        
        pendingRequests.set(id, {
            resolve: (response) => {
                clearTimeout(timeout);
                resolve(response);
            },
            reject: (err) => {
                clearTimeout(timeout);
                reject(err);
            }
        });
        
        // Send message in OpenClaw format
        openclawWs.send(JSON.stringify({
            type: 'user:message',
            id: id,
            data: {
                text: message,
                context: context
            },
            timestamp: new Date().toISOString()
        }));
        
        console.log('📤 Sent to OpenClaw:', message);
    });
}

// HTTP endpoint for browser to send messages
app.post('/api/openclaw/chat', async (req, res) => {
    try {
        const { message, session, context } = req.body;
        
        if (!openclawConnected) {
            return res.status(503).json({ 
                error: 'OpenClaw not connected',
                useLocal: true
            });
        }
        
        const response = await sendToOpenClaw(message, {
            ...context,
            session,
            source: 'cozy-claw-home'
        });
        
        res.json({
            response: response.text || response.message || response.data,
            source: 'openclaw'
        });
    } catch (err) {
        console.error('OpenClaw chat error:', err.message);
        res.status(502).json({ 
            error: err.message,
            useLocal: true
        });
    }
});

// Status endpoint
app.get('/api/openclaw/status', (req, res) => {
    res.json({ 
        connected: openclawConnected,
        wsState: openclawWs ? openclawWs.readyState : 'null'
    });
});

// Start OpenClaw connection
connectToOpenClaw();

// ==================== FUTURE: VOICE API (Not Ready) ====================
/*
// Get voice system status
app.get('/api/voice/status', (req, res) => {
    try {
        const status = agentCore.getVoiceStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Speak text immediately
app.post('/api/voice/speak', async (req, res) => {
    try {
        const { text, priority = 'normal' } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        if (priority === 'high') {
            await agentCore.voice.speak(text);
        } else {
            await agentCore.voice.queueText(text);
        }
        
        res.json({ success: true, queued: priority !== 'high' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stop voice playback
app.post('/api/voice/stop', async (req, res) => {
    try {
        const { clearQueue = true } = req.body;
        await agentCore.stopVoice(clearQueue);
        res.json({ success: true, clearQueue });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set voice volume
app.post('/api/voice/volume', async (req, res) => {
    try {
        const { volume } = req.body;
        if (typeof volume !== 'number' || volume < 0 || volume > 1) {
            return res.status(400).json({ error: 'Volume must be between 0 and 1' });
        }
        
        const newVolume = await agentCore.setVoiceVolume(volume);
        res.json({ success: true, volume: newVolume });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle voice mute
app.post('/api/voice/toggle', async (req, res) => {
    try {
        const result = await agentCore.toggleVoice();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Trigger activity narration
app.post('/api/voice/narrate', async (req, res) => {
    try {
        const { activity } = req.body;
        if (!activity) {
            return res.status(400).json({ error: 'Activity type is required' });
        }
        
        await agentCore.narrateActivity(activity);
        res.json({ success: true, activity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Announce trading alert
app.post('/api/voice/alert', async (req, res) => {
    try {
        const { type, context = {} } = req.body;
        if (!type) {
            return res.status(400).json({ error: 'Alert type is required' });
        }
        
        await agentCore.announceTradingAlert(type, context);
        res.json({ success: true, type });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
*/

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        mode: CONFIG.DEPLOYMENT_MODE,
        agent_running: agentSystem?.isRunning || false,
        bridge_active: !!clawbotBridge,
        // voice_enabled: agentCore?.voice ? !agentCore.voice.muted : false, // FUTURE: Voice system
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
        
        // Initialize decor database
        await decorDB.init();
        
        // Initialize economy tracker - DISABLED
        
        // Initialize agent components
        agentCore = new AgentCore(database);
        agentMemory = new AgentMemory(database);
        toolFramework = new ToolFramework(database);
        
        agentSystem = new AgentSystem(database, toolFramework);
        await agentSystem.init(io);
        
        // Make globally available
        global.agentCore = agentCore;
        global.agentMemory = agentMemory;
        global.toolFramework = toolFramework;
        
        // Initialize ClawBot Bridge
        clawbotBridge = new ClawBotBridge(io, database);
        await clawbotBridge.init();
        
        console.log('');
        
        // Start server
        server.listen(CONFIG.PORT, () => {
            console.log('');
            console.log('🌐 Server running at http://localhost:' + CONFIG.PORT);
            console.log('');
            console.log('📡 API Endpoints:');
            console.log('  GET  /api/agent/state          - Agent current state');
            console.log('  GET  /api/memory/stats         - Memory statistics');
            console.log('  GET  /api/memory/recent        - Recent memories');
            console.log('  POST /api/memory/query         - Query memories');
            console.log('  GET  /api/conversations        - Conversation history');
            console.log('  GET  /api/tools                - Connected tools');
            console.log('');
            console.log('🌉 Bridge Endpoints:');
            console.log('  POST /api/clawbot/message      - Send message to agent');
            console.log('  GET  /api/clawbot/responses    - Get agent responses');
            console.log('  POST /api/clawbot/webhook      - Webhook for responses');
            console.log('  GET  /api/clawbot/status       - Bridge status');
            console.log('');
            console.log('🎨 Decor Endpoints:');
            console.log('  GET  /api/decor/catalog        - Get available items');
            console.log('  GET  /api/decor/placements     - Get current layout');
            console.log('  POST /api/decor/place          - Place an item');
            console.log('  POST /api/decor/move           - Move an item');
            console.log('  GET  /api/decor/themes         - Get room themes');
            console.log('');
            // DISABLED: Economy Endpoints
            // console.log('💰 Economy Endpoints:');
            // console.log('  GET  /api/economy              - Today\'s economy data');
            // console.log('  GET  /api/economy/weekly       - Weekly summary');
            // console.log('  GET  /api/economy/stats        - All-time stats');
            // console.log('');
            // console.log('🔊 Voice Endpoints:'); // FUTURE: Voice system
            // console.log('  GET  /api/voice/status         - Voice system status');
            // console.log('  POST /api/voice/speak          - Speak text (TTS)');
            // console.log('  POST /api/voice/stop           - Stop playback');
            // console.log('  POST /api/voice/volume         - Set volume (0-1)');
            // console.log('  POST /api/voice/toggle         - Toggle mute');
            // console.log('  POST /api/voice/narrate        - Activity narration');
            // console.log('  POST /api/voice/alert          - Trading alert');
            // console.log('');
            
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
    clawbotBridge?.close?.();
    database?.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    agentSystem?.stop();
    clawbotBridge?.close?.();
    database?.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start the application
start();

module.exports = { app, server, io, database, agentCore, agentMemory, agentSystem, clawbotBridge, decorDB };
