/**
 * Cozy Claw Home v4.0 - Personal AI Companion Platform
 * A cozy home where your AI companion lives 24/7
 * 
 * v4.0 FEATURES:
 * - Avatar system with 6 unique characters
 * - Sticky notes system
 * - Daily memory tracking
 * - Natural dialogue engine
 * - ClawBot integration
 * - Visual activity system
 * - Local-first architecture
 * 
 * CORE PHILOSOPHY:
 * - Local-first: No cloud dependencies required
 * - Companion-focused: Not a game, but a friend
 * - Persistent memory and personality
 * - Optional ClawBot integration
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const fs = require('fs');

// Agent modules
const AgentCore = require('./agent/core');
const AgentMemory = require('./agent/memory');
const ToolFramework = require('./agent/tools');

// Load config
const CONFIG = loadConfig();

const app = express();
const server = http.createServer(app);

function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    const defaultConfig = {
        PORT: process.env.PORT || 3000,
        DB_PATH: process.env.DB_PATH || path.join(__dirname, 'memory', 'agent_memory.db'),
        JWT_SECRET: process.env.JWT_SECRET || 'companion-secret-change-in-production',
        AGENT_LOOP_INTERVAL: 5000,
        AGENT_PRESENCE_ENABLED: true,
        DAILY_CHECKIN_ENABLED: true,
        DAILY_CHECKIN_TIME: '20:00',
        USE_CLAWBOT_PERSONALITY: false,
        CLAWBOT_WS_URL: process.env.CLAWBOT_WS_URL || 'ws://localhost:8080/clawbot',
        CLAWBOT_API_KEY: process.env.CLAWBOT_API_KEY || '',
        DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || 'local',
        FIRST_RUN: true
    };
    
    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { ...defaultConfig, ...userConfig };
        } catch (err) {
            console.warn('Failed to load config.json, using defaults');
        }
    }
    
    // Save default config
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
}

function saveConfig() {
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(CONFIG, null, 2));
}

// ==================== DATABASE SETUP ====================

class Database {
    constructor() {
        this.db = null;
    }
    
    async init() {
        console.log('💾 Initializing database...');
        
        // Ensure memory directory exists
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
                avatar_key TEXT DEFAULT 'robot',
                last_wakeup TEXT,
                last_sleep TEXT,
                last_session_end TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- User profile and preferences
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY,
                name TEXT DEFAULT 'Friend',
                timezone TEXT DEFAULT 'UTC',
                wake_time TEXT DEFAULT '08:00',
                sleep_time TEXT DEFAULT '23:00',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- User preferences (key-value)
            CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT,
                avatar_key TEXT
            );
            
            -- Long-term memories
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
            
            -- Sticky notes
            CREATE TABLE IF NOT EXISTS sticky_notes (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                location TEXT DEFAULT 'wall',
                status TEXT DEFAULT 'active',
                importance INTEGER DEFAULT 5,
                color TEXT DEFAULT '#ffeb3b',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                read_at TEXT,
                archived_at TEXT,
                expires_at TEXT
            );
            
            -- Daily memories
            CREATE TABLE IF NOT EXISTS daily_memories (
                id TEXT PRIMARY KEY,
                date TEXT UNIQUE NOT NULL,
                mood TEXT,
                day_rating INTEGER,
                events TEXT,
                people_mentioned TEXT,
                stress_level INTEGER,
                highlights TEXT,
                conversation_summary TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
                enabled BOOLEAN DEFAULT 0,
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
            
            -- Room decor
            CREATE TABLE IF NOT EXISTS room_decor (
                id INTEGER PRIMARY KEY,
                item_type TEXT NOT NULL,
                item_key TEXT NOT NULL,
                x REAL,
                y REAL,
                layer INTEGER DEFAULT 0,
                unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
            CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
            CREATE INDEX IF NOT EXISTS idx_conversations_time ON conversations(timestamp);
            CREATE INDEX IF NOT EXISTS idx_activity_log_time ON activity_log(started_at);
            CREATE INDEX IF NOT EXISTS idx_notes_status ON sticky_notes(status);
            CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_memories(date);
        `;
        
        const statements = schema.split(';').filter(s => s.trim());
        for (const statement of statements) {
            await this.run(statement);
        }
        
        // Initialize default data if not exists
        await this.run(`INSERT OR IGNORE INTO agent_state (id, mood, activity, location, avatar_key) VALUES (1, 'content', 'relaxing', 'sofa', 'robot')`);
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
    
    // Send active notes
    agentMemory.getDisplayNotes().then(notes => {
        socket.emit('notes:list', notes);
    });
    
    // Handle user chat
    socket.on('user:message', async (data) => {
        let response;
        
        // Check if ClawBot should handle this
        if (CONFIG.USE_CLAWBOT_PERSONALITY && toolFramework.isClawBotAvailable()) {
            const clawbotResult = await toolFramework.queryClawBot(data.message, {
                clientId: socket.id,
                agentState: agentCore.getState()
            });
            
            if (clawbotResult.success) {
                response = {
                    text: clawbotResult.response.text,
                    mood: clawbotResult.response.mood || agentCore.state.mood,
                    activity: agentCore.state.activity,
                    fromClawBot: true
                };
            } else {
                // Fallback to local
                response = await agentCore.handleUserMessage(data.message, {
                    clientId: socket.id
                });
            }
        } else {
            response = await agentCore.handleUserMessage(data.message, {
                clientId: socket.id
            });
        }
        
        socket.emit('agent:message', response);
        
        // Broadcast activity
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
    
    // Handle agent movement
    socket.on('agent:move', async (data) => {
        const { location, activity } = data;
        await agentCore.setActivity(activity || 'wandering', location);
        io.emit('agent:state', agentCore.getState());
    });
    
    // Handle memory queries
    socket.on('memory:query', async (data) => {
        const memories = await agentMemory.query(data.query, data.limit || 5);
        socket.emit('memory:results', memories);
    });
    
    // Handle daily memory recording
    socket.on('daily:record', async (data) => {
        const id = await agentMemory.recordDailyMemory(data);
        socket.emit('daily:recorded', { success: true, id });
        
        // Update stats
        const stats = await agentMemory.getStats();
        io.emit('memory:stats', stats);
    });
    
    // Handle memory book request
    socket.on('memorybook:get', async () => {
        const bookData = await agentMemory.getMemoryBookData();
        socket.emit('memorybook:data', bookData);
    });
    
    // Handle notes
    socket.on('notes:get', async () => {
        const notes = await agentMemory.getDisplayNotes();
        socket.emit('notes:list', notes);
    });
    
    socket.on('notes:read', async (data) => {
        await agentMemory.markNoteRead(data.id);
        const notes = await agentMemory.getDisplayNotes();
        io.emit('notes:list', notes);
    });
    
    socket.on('notes:create', async (data) => {
        const id = await agentMemory.addNote(data);
        const notes = await agentMemory.getDisplayNotes();
        io.emit('notes:list', notes);
    });
    
    // Handle avatar selection
    socket.on('avatar:set', async (data) => {
        const success = agentCore.setAvatar(data.avatarKey);
        if (success) {
            await database.run(
                'UPDATE agent_state SET avatar_key = ? WHERE id = 1',
                [data.avatarKey]
            );
            io.emit('agent:state', agentCore.getState());
        }
        socket.emit('avatar:result', { success });
    });
    
    socket.on('avatars:get', () => {
        socket.emit('avatars:list', agentCore.getAvailableAvatars());
    });
    
    // Handle tool refresh
    socket.on('tools:refresh', async (data) => {
        const result = await toolFramework.refreshTool(data.toolId);
        socket.emit('tools:result', result);
    });
    
    // Handle user profile updates
    socket.on('user:update', async (data) => {
        if (data.name) {
            await agentCore.setUserName(data.name);
        }
        socket.emit('agent:state', agentCore.getState());
    });
    
    // Setup wizard completion
    socket.on('setup:complete', async (data) => {
        CONFIG.FIRST_RUN = false;
        CONFIG.USE_CLAWBOT_PERSONALITY = data.useClawBot || false;
        saveConfig();
        
        if (data.name) {
            await agentCore.setUserName(data.name);
        }
        if (data.avatarKey) {
            agentCore.setAvatar(data.avatarKey);
        }
        
        socket.emit('setup:done', { success: true });
        io.emit('agent:state', agentCore.getState());
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        clients.delete(socket.id);
        
        // If last client, record session end
        if (clients.size === 0) {
            agentCore.recordSessionEnd();
        }
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
        this.activityInterval = null;
        this.dailyCheckinInterval = null;
        this.isRunning = false;
    }
    
    async init() {
        await this.core.init();
        await this.memory.init();
        await this.tools.init();
        
        console.log('🤖 Agent system v4.0 initialized');
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🤖 Agent presence loop starting...');
        
        // Main agent loop
        this.loopInterval = setInterval(async () => {
            await this.tick();
        }, CONFIG.AGENT_LOOP_INTERVAL);
        
        // Activity change loop
        this.activityInterval = setInterval(async () => {
            await this.updateActivity();
        }, 30000);
        
        // Daily check-in
        if (CONFIG.DAILY_CHECKIN_ENABLED) {
            this.scheduleDailyCheckin();
        }
        
        // Check for tool alerts
        setInterval(async () => {
            await this.checkToolAlerts();
        }, 60000);
        
        // Create welcome note on first run
        if (CONFIG.FIRST_RUN) {
            this.createWelcomeNote();
        }
    }
    
    async tick() {
        const state = this.core.getState();
        const userProfile = await this.db.get('SELECT * FROM user_profile WHERE id = 1');
        const now = new Date();
        
        // Check for time-based routines
        const currentTime = now.toTimeString().slice(0, 5);
        const hour = now.getHours();
        
        // Morning greeting
        if (currentTime === userProfile.wake_time && state.activity !== 'sleeping') {
            await this.initiateConversation('morning_greeting');
        }
        
        // Evening wind-down
        if (currentTime === userProfile.sleep_time && state.activity !== 'sleeping') {
            await this.initiateConversation('evening_goodbye');
        }
        
        // Emit current state
        io.emit('agent:state', state);
        
        // Occasionally create random observation note
        if (Math.random() < 0.001) { // Very rare
            await this.createRandomObservation();
        }
    }
    
    async updateActivity() {
        const activities = [
            { activity: 'reading', location: 'chair', duration: 120 },
            { activity: 'working', location: 'desk', duration: 180 },
            { activity: 'relaxing', location: 'sofa', duration: 90 },
            { activity: 'looking_out_window', location: 'window', duration: 30 },
            { activity: 'stretching', location: 'center', duration: 15 },
            { activity: 'making_tea', location: 'kitchen', duration: 10 },
            { activity: 'making_coffee', location: 'kitchen', duration: 10 },
            { activity: 'checking_phone', location: 'sofa', duration: 5 },
            { activity: 'napping', location: 'sofa', duration: 60 },
            { activity: 'wandering', location: 'any', duration: 20 }
        ];
        
        const hour = new Date().getHours();
        
        // Filter activities based on time of day
        let validActivities = activities;
        if (hour >= 22 || hour < 7) {
            validActivities = activities.filter(a => ['napping', 'relaxing', 'looking_out_window'].includes(a.activity));
        } else if (hour >= 9 && hour < 18) {
            validActivities = activities.filter(a => ['working', 'reading', 'making_tea', 'making_coffee'].includes(a.activity));
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
        
        // Emit state update for visual changes
        io.emit('agent:state', this.core.getState());
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
    
    scheduleDailyCheckin() {
        const checkTime = () => {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            if (currentTime === CONFIG.DAILY_CHECKIN_TIME) {
                this.initiateConversation('daily_check');
            }
        };
        
        this.dailyCheckinInterval = setInterval(checkTime, 60000); // Check every minute
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
    
    async createWelcomeNote() {
        await this.memory.addNote({
            type: 'welcome',
            content: "Welcome to your new home! I'm so excited to be your companion. 💕 Click on me to chat!",
            location: 'desk',
            importance: 10,
            color: '#ffeb3b'
        });
    }
    
    async createRandomObservation() {
        const observations = [
            "The light coming through the window is really nice today ☀️",
            "I love how cozy this room feels 🏠",
            "Thinking about trying a new tea flavor... 🍵",
            "This is a good spot for people watching 👀",
            "I should organize my digital bookshelf 📚",
            "Wonder what you're up to right now... 🤔",
            "Just had a random thought about the universe 🌌",
            "Feeling grateful for this peaceful space 🙏"
        ];
        
        const content = observations[Math.floor(Math.random() * observations.length)];
        const locations = ['wall', 'fridge', 'window', 'mirror'];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        await this.memory.addNote({
            type: 'observation',
            content,
            location,
            importance: 4
        });
        
        // Notify clients of new note
        const notes = await this.memory.getDisplayNotes();
        io.emit('notes:list', notes);
    }
    
    stop() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
            this.activityInterval = null;
        }
        if (this.dailyCheckinInterval) {
            clearInterval(this.dailyCheckinInterval);
            this.dailyCheckinInterval = null;
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

app.get('/api/agent/state', async (req, res) => {
    res.json(agentCore.getState());
});

app.get('/api/memory/stats', async (req, res) => {
    const stats = await agentMemory.getStats();
    res.json(stats);
});

app.get('/api/memory/recent', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const memories = await agentMemory.getRecent(limit);
    res.json(memories);
});

app.post('/api/memory/query', async (req, res) => {
    const { query, limit = 5 } = req.body;
    const memories = await agentMemory.query(query, limit);
    res.json(memories);
});

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

// Notes API
app.get('/api/notes', async (req, res) => {
    const notes = await agentMemory.getDisplayNotes();
    res.json(notes);
});

app.post('/api/notes', async (req, res) => {
    const { type, content, location, importance, color } = req.body;
    const id = await agentMemory.addNote({
        type,
        content,
        location,
        importance,
        color
    });
    res.json({ success: true, id });
});

app.post('/api/notes/:id/read', async (req, res) => {
    await agentMemory.markNoteRead(req.params.id);
    res.json({ success: true });
});

// Daily Memory API
app.get('/api/daily', async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const memory = await agentMemory.getDailyMemory(date);
    res.json(memory);
});

app.post('/api/daily', async (req, res) => {
    const id = await agentMemory.recordDailyMemory(req.body);
    res.json({ success: true, id });
});

app.get('/api/daily/timeline', async (req, res) => {
    const limit = parseInt(req.query.limit) || 30;
    const timeline = await agentMemory.getMemoryTimeline(limit);
    res.json(timeline);
});

app.get('/api/daily/book', async (req, res) => {
    const bookData = await agentMemory.getMemoryBookData();
    res.json(bookData);
});

// Conversations API
app.get('/api/conversations', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const conversations = await database.all(
        'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?',
        [limit]
    );
    res.json(conversations.reverse());
});

// Tools API
app.get('/api/tools', async (req, res) => {
    const tools = await toolFramework.getStatus();
    res.json(tools);
});

app.post('/api/tools/:id/config', async (req, res) => {
    const { id } = req.params;
    const { config } = req.body;
    await database.run(
        'UPDATE tools SET config = ? WHERE id = ?',
        [JSON.stringify(config), id]
    );
    res.json({ success: true });
});

app.post('/api/tools/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body;
    await database.run(
        'UPDATE tools SET enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, id]
    );
    res.json({ success: true });
});

// Avatar API
app.get('/api/avatars', (req, res) => {
    res.json(agentCore.getAvailableAvatars());
});

app.post('/api/avatar', async (req, res) => {
    const { avatarKey } = req.body;
    const success = agentCore.setAvatar(avatarKey);
    if (success) {
        await database.run(
            'UPDATE agent_state SET avatar_key = ? WHERE id = 1',
            [avatarKey]
        );
    }
    res.json({ success });
});

// Config API
app.get('/api/config', (req, res) => {
    // Return safe config (no secrets)
    res.json({
        FIRST_RUN: CONFIG.FIRST_RUN,
        USE_CLAWBOT_PERSONALITY: CONFIG.USE_CLAWBOT_PERSONALITY,
        DAILY_CHECKIN_ENABLED: CONFIG.DAILY_CHECKIN_ENABLED,
        DAILY_CHECKIN_TIME: CONFIG.DAILY_CHECKIN_TIME
    });
});

app.post('/api/config', (req, res) => {
    const updates = req.body;
    Object.keys(updates).forEach(key => {
        if (CONFIG.hasOwnProperty(key)) {
            CONFIG[key] = updates[key];
        }
    });
    saveConfig();
    res.json({ success: true });
});

// ClawBot API
app.get('/api/clawbot/status', (req, res) => {
    res.json(toolFramework.getClawBotStatus());
});

app.post('/api/clawbot/connect', async (req, res) => {
    const result = await toolFramework.connectClawBot();
    res.json(result);
});

app.post('/api/clawbot/disconnect', (req, res) => {
    toolFramework.disconnectClawBot();
    res.json({ success: true });
});

// Room decor API
app.get('/api/decor', async (req, res) => {
    const decor = await database.all('SELECT * FROM room_decor');
    res.json(decor);
});

// User profile API
app.get('/api/user/profile', async (req, res) => {
    const profile = await database.get('SELECT * FROM user_profile WHERE id = 1');
    res.json(profile);
});

app.post('/api/user/profile', async (req, res) => {
    const { name, timezone, wake_time, sleep_time } = req.body;
    await database.run(
        'UPDATE user_profile SET name = ?, timezone = ?, wake_time = ?, sleep_time = ? WHERE id = 1',
        [name, timezone, wake_time, sleep_time]
    );
    if (name) {
        await agentCore.setUserName(name);
    }
    res.json({ success: true });
});

// Activity log API
app.get('/api/activity-log', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await database.all(
        'SELECT * FROM activity_log ORDER BY started_at DESC LIMIT ?',
        [limit]
    );
    res.json(logs);
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        mode: CONFIG.DEPLOYMENT_MODE,
        version: '4.0.0',
        agent_running: agentSystem?.isRunning || false,
        clawbot_connected: toolFramework?.isClawBotAvailable() || false,
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
        console.log('');
        console.log('🏠 Cozy Claw Home v4.0');
        console.log('   Your personal AI companion platform');
        console.log('');
        console.log(`📦 Deployment mode: ${CONFIG.DEPLOYMENT_MODE}`);
        console.log(`🤖 ClawBot integration: ${CONFIG.USE_CLAWBOT_PERSONALITY ? 'enabled' : 'disabled'}`);
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
        
        // Listen for ClawBot responses and forward to socket.io clients
        toolFramework.on('clawbot:response', (message) => {
            console.log('📨 ClawBot response received, broadcasting to clients');
            io.emit('agent:message', {
                text: message.data.text,
                mood: message.data.mood || agentCore.getState().mood,
                fromClawBot: true
            });
        });
        
        toolFramework.on('clawbot:initiative', (message) => {
            console.log('📨 ClawBot initiative message');
            io.emit('agent:message', {
                text: message.data.text,
                type: 'initiative',
                fromClawBot: true
            });
        });
        
        // Start server
        server.listen(CONFIG.PORT, () => {
            console.log('');
            console.log(`🌐 Server running at http://localhost:${CONFIG.PORT}`);
            console.log('');
            console.log('📡 API Endpoints:');
            console.log('  GET  /api/agent/state      - Agent current state');
            console.log('  GET  /api/memory/stats     - Memory statistics');
            console.log('  GET  /api/notes            - Sticky notes');
            console.log('  GET  /api/daily/book       - Memory book data');
            console.log('  GET  /api/avatars          - Available avatars');
            console.log('  GET  /api/config           - Configuration');
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
