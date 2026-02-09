/**
 * ClawBot Bridge - Connects UI to Main Agent
 * 
 * This module:
 * 1. Receives messages from UI via WebSocket/HTTP
 * 2. Queues them for the main agent
 * 3. Receives responses from main agent
 * 4. Routes responses back to UI via WebSocket
 */

const MessageQueue = require('./message-queue');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class ClawBotBridge extends EventEmitter {
    constructor(io, database) {
        super();
        this.io = io;
        this.db = database;
        this.queue = new MessageQueue();
        
        // Track active sessions
        this.sessions = new Map();
        
        // Response polling intervals
        this.pollers = new Map();
        
        // Main agent session ID (set when agent connects)
        this.mainAgentSession = null;
        
        // Stats
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            responsesDelivered: 0,
            errors: 0
        };
    }
    
    async init() {
        await this.queue.init();
        
        // Set up queue watcher for responses from main agent
        this.queue.watch(this.handleAgentResponse.bind(this));
        
        // Set up Socket.IO handlers
        this.setupSocketHandlers();
        
        // Start polling outbox.jsonl for Celest's responses (OpenClaw integration)
        this.startOutboxPolling();
        
        // Start heartbeat
        setInterval(() => this.heartbeat(), 30000);
        
        console.log('🌉 ClawBot Bridge initialized');
    }
    
    // Poll outbox.jsonl for responses from Celest (main agent via file)
    startOutboxPolling() {
        const fs = require('fs');
        const path = require('path');
        const outboxPath = path.join(__dirname, '..', 'outbox.jsonl');
        let lastSize = 0;
        
        setInterval(() => {
            try {
                if (!fs.existsSync(outboxPath)) return;
                
                const stats = fs.statSync(outboxPath);
                if (stats.size === lastSize) return; // No changes
                lastSize = stats.size;
                
                const content = fs.readFileSync(outboxPath, 'utf8');
                const lines = content.split('\n').filter(Boolean);
                
                for (const line of lines) {
                    try {
                        const resp = JSON.parse(line);
                        if (resp.sessionId && resp.text) {
                            // Deliver to the correct session
                            this.deliverResponse(resp.sessionId, {
                                text: resp.text,
                                mood: resp.mood || 'content',
                                timestamp: resp.timestamp || new Date().toISOString()
                            });
                        }
                    } catch (err) {
                        console.error('Failed to parse outbox entry:', err.message);
                    }
                }
                
                // Clear outbox after processing
                fs.writeFileSync(outboxPath, '');
                
            } catch (err) {
                console.error('Outbox poll error:', err.message);
            }
        }, 500); // Poll every 500ms
        
        console.log('📁 Outbox polling started (Celest responses)');
    }
    
    // Deliver response to a specific session
    deliverResponse(sessionId, response) {
        if (!sessionId.startsWith('web:')) return;
        
        const socketId = sessionId.replace('web:', '');
        const socket = this.io.sockets.sockets.get(socketId);
        
        if (socket) {
            socket.emit('agent:message', {
                text: response.text,
                mood: response.mood || 'content',
                timestamp: response.timestamp,
                initiative: false
            });
            this.stats.responsesDelivered++;
            console.log('📥 Delivered to', socketId, ':', response.text.substring(0, 40));
        } else {
            // Socket disconnected, store in queue for later
            this.queue.storeResponse(sessionId, {
                type: 'agent_response',
                content: response.text,
                metadata: response
            });
        }
    }
    
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Bridge: Client connected:', socket.id);
            
            // Register session
            const sessionId = `web:${socket.id}`;
            this.sessions.set(socket.id, {
                id: socket.id,
                sessionId,
                connectedAt: new Date().toISOString(),
                lastActivity: Date.now()
            });
            
            // Start response polling for this session
            this.startResponsePolling(socket);
            
            // Handle user messages
            socket.on('user:message', async (data) => {
                await this.handleUserMessage(socket, data);
            });
            
            // Handle agent registration (main agent connecting)
            socket.on('agent:register', (data) => {
                this.handleAgentRegistration(socket, data);
            });
            
            // Handle agent responses
            socket.on('agent:response', async (data) => {
                await this.handleAgentDirectResponse(socket, data);
            });
            
            // Handle errors
            socket.on('error', (err) => {
                console.error('❌ Bridge: Socket error:', socket.id, err.message);
            });
            
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                console.log('🔌 Bridge: Client disconnected:', socket.id, 'Reason:', reason);
                this.handleDisconnect(socket);
            });
        });
    }
    
    async handleUserMessage(socket, data) {
        const session = this.sessions.get(socket.id);
        if (!session) return;
        
        session.lastActivity = Date.now();
        this.stats.messagesReceived++;
        
        const message = {
            id: uuidv4(),
            type: 'user_message',
            content: data.message,
            sessionId: session.sessionId,
            socketId: socket.id,
            metadata: {
                clientInfo: data.clientInfo,
                timestamp: Date.now()
            }
        };
        
        try {
            // CRITICAL: Always write to inbox.jsonl for Celest to pick up
            const fs = require('fs');
            const path = require('path');
            const inboxPath = path.join(__dirname, '..', 'inbox.jsonl');
            const inboxEntry = {
                type: 'companion_message',
                id: message.id,
                content: message.content,
                sessionId: message.sessionId,
                timestamp: new Date().toISOString(),
                source: 'cozy-claw-home'
            };
            fs.appendFileSync(inboxPath, JSON.stringify(inboxEntry) + '\n');
            console.log('📨 Written to inbox.jsonl:', message.content.substring(0, 40));
            
            // Also forward to main agent via Socket.IO if connected
            if (this.mainAgentSession) {
                const agentSocket = this.io.sockets.sockets.get(this.mainAgentSession);
                if (agentSocket) {
                    agentSocket.emit('clawbot:message', message);
                    console.log('📤 Forwarded to main agent session:', message.id);
                }
            }
            
            // Also enqueue to message queue
            await this.queue.enqueue(message);
            
            // Write to inbox.jsonl for Celest to poll
            this.writeToInbox(message);
            
            // Notify UI that message is queued
            socket.emit('message:queued', {
                messageId: message.id,
                status: 'pending'
            });
            
            console.log('📤 Message queued and forwarded to OpenClaw:', message.id);
            
        } catch (err) {
            console.error('Failed to handle message:', err);
            this.stats.errors++;
            socket.emit('message:error', {
                error: 'Failed to queue message',
                messageId: message.id
            });
        }
    }
    
    // Forward message to Celest via OpenClaw webhook
    forwardToOpenClaw(message) {
        const http = require('http');
        
        const postData = JSON.stringify({
            text: `[Companion House] ${message.content}`,
            mode: 'now'
        });
        
        const options = {
            hostname: 'localhost',
            port: 18789,
            path: '/hooks/wake',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer deeb04453b8bea4ac88c28a0a3e8f1a876254cf87d454dc0',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Delivered to Celest:', message.content.substring(0, 40));
            } else {
                console.error('❌ Webhook returned:', res.statusCode);
                // Fallback to file queue
                this.fallbackToFile(message);
            }
        });
        
        req.on('error', (err) => {
            console.error('❌ Webhook error:', err.message);
            // Fallback to file queue
            this.fallbackToFile(message);
        });
        
        req.write(postData);
        req.end();
    }
    
    // Fallback to file queue if webhook fails
    fallbackToFile(message) {
        const fs = require('fs');
        const path = require('path');
        
        const queueFile = path.join(__dirname, '..', '.clawbot-queue.jsonl');
        const entry = {
            type: 'companion_message',
            id: message.id,
            content: message.content,
            sessionId: message.sessionId,
            timestamp: new Date().toISOString(),
            source: 'cozy-claw-home'
        };
        
        try {
            fs.appendFileSync(queueFile, JSON.stringify(entry) + '\n');
            console.log('📁 Fallback to file queue:', message.content.substring(0, 40));
        } catch (err) {
            console.error('❌ Failed to queue:', err.message);
        }
    }
    
    // Write message to inbox.jsonl for Celest to poll
    writeToInbox(message) {
        const fs = require('fs');
        const path = require('path');
        const inboxPath = path.join(__dirname, '..', 'inbox.jsonl');
        
        const entry = {
            type: 'companion_message',
            id: message.id,
            content: message.content,
            sessionId: message.sessionId,
            timestamp: new Date().toISOString(),
            source: 'cozy-claw-home'
        };
        
        try {
            fs.appendFileSync(inboxPath, JSON.stringify(entry) + '\n');
            console.log('📨 Written to inbox.jsonl:', message.content.substring(0, 40));
        } catch (err) {
            console.error('❌ Failed to write to inbox:', err.message);
        }
    }
    
    handleAgentRegistration(socket, data) {
        this.mainAgentSession = socket.id;
        console.log('🤖 Main agent registered:', socket.id);
        
        socket.emit('agent:registered', {
            sessionId: socket.id,
            queuedMessages: this.queue.getPending().length
        });
        
        this.emit('agent:connected', { socketId: socket.id });
    }
    
    async handleAgentDirectResponse(socket, data) {
        // Main agent sending response directly
        const { originalMessageId, sessionId, response } = data;
        
        // Extract web socket ID from sessionId (web:SOCKET_ID)
        const socketId = sessionId.replace('web:', '');
        const clientSocket = this.io.sockets.sockets.get(socketId);
        
        if (clientSocket) {
            clientSocket.emit('agent:message', {
                text: response.text,
                mood: response.mood || 'content',
                initiative: false,
                messageId: uuidv4(),
                replyTo: originalMessageId
            });
            
            this.stats.responsesDelivered++;
            console.log('📥 Response delivered to:', socketId);
        }
        
        // Also store in queue
        await this.queue.storeResponse(sessionId, {
            type: 'agent_response',
            content: response.text,
            metadata: response
        });
    }
    
    handleAgentResponse(response) {
        // Response from main agent via file queue
        const { sessionId, content, metadata = {} } = response;
        
        if (!sessionId.startsWith('web:')) return;
        
        const socketId = sessionId.replace('web:', '');
        const socket = this.io.sockets.sockets.get(socketId);
        
        if (socket) {
            socket.emit('agent:message', {
                text: content,
                mood: metadata.mood || 'content',
                initiative: metadata.initiative || false,
                timestamp: new Date().toISOString()
            });
            
            this.stats.responsesDelivered++;
        }
        
        this.emit('response:delivered', { sessionId, response });
    }
    
    startResponsePolling(socket) {
        const session = this.sessions.get(socket.id);
        if (!session) return;
        
        // Track delivered response IDs to prevent duplicates
        const deliveredIds = new Set();
        
        // Poll for new responses every 500ms
        let lastCheck = new Date(0);
        
        const poll = setInterval(async () => {
            if (!this.sessions.has(socket.id)) {
                clearInterval(poll);
                return;
            }
            
            const responses = await this.queue.getResponses(session.sessionId, lastCheck);
            for (const resp of responses) {
                // Skip if already delivered
                if (deliveredIds.has(resp.id)) continue;
                deliveredIds.add(resp.id);
                
                if (resp.type === 'agent_response') {
                    socket.emit('agent:message', {
                        text: resp.content,
                        mood: resp.metadata?.mood || 'content',
                        timestamp: resp.timestamp
                    });
                    this.stats.responsesDelivered++;
                }
            }
            
            if (responses.length > 0) {
                lastCheck = new Date();
            }
        }, 500);
        
        this.pollers.set(socket.id, poll);
    }
    
    handleDisconnect(socket) {
        console.log('🔌 Bridge: Client disconnected:', socket.id);
        
        // Clear poller
        const poll = this.pollers.get(socket.id);
        if (poll) {
            clearInterval(poll);
            this.pollers.delete(socket.id);
        }
        
        // Remove session
        this.sessions.delete(socket.id);
        
        // If main agent disconnected, clear reference
        if (this.mainAgentSession === socket.id) {
            this.mainAgentSession = null;
            console.log('🤖 Main agent disconnected');
            this.emit('agent:disconnected');
        }
    }
    
    // HTTP API handlers
    async apiSendMessage(req, res) {
        try {
            const { message, sessionId = 'api:default', metadata = {} } = req.body;
            
            if (!message) {
                return res.status(400).json({ error: 'Message required' });
            }
            
            const msg = await this.queue.enqueue({
                type: 'user_message',
                content: message,
                sessionId,
                metadata
            });
            
            // Forward to OpenClaw
            this.forwardToOpenClaw({ content: message, id: msg.id, sessionId });
            
            res.json({
                success: true,
                messageId: msg.id,
                status: 'queued'
            });
            
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    
    async apiGetResponses(req, res) {
        try {
            const { sessionId, since } = req.query;
            
            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID required' });
            }
            
            const responses = await this.queue.getResponses(sessionId, since);
            
            res.json({
                success: true,
                sessionId,
                responses
            });
            
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    
    async apiWebhook(req, res) {
        // Webhook for external agents (Celest sending responses back)
        try {
            const { type = 'message', data } = req.body;
            
            switch (type) {
                case 'message':
                    // External agent sending a message to user
                    // First deliver directly to WebSocket if session is active
                    if (data.sessionId && data.text) {
                        this.deliverResponse(data.sessionId, {
                            text: data.text,
                            mood: data.mood || 'content',
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    // Also store in queue for persistence
                    await this.queue.storeResponse(data.sessionId, {
                        type: 'agent_response',
                        content: data.text,
                        metadata: data.metadata || { mood: data.mood || 'content' }
                    });
                    break;
                    
                case 'status':
                    // External agent status update
                    this.emit('agent:status', data);
                    break;
                    
                default:
                    return res.status(400).json({ error: 'Unknown webhook type' });
            }
            
            res.json({ success: true });
            
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    
    apiGetStatus(req, res) {
        // Check if outbox has recent activity (indicates Celest is responding)
        const fs = require('fs');
        const path = require('path');
        const outboxPath = path.join(__dirname, '..', 'outbox.jsonl');
        let outboxActive = false;
        
        try {
            if (fs.existsSync(outboxPath)) {
                const stats = fs.statSync(outboxPath);
                const ageMs = Date.now() - stats.mtime.getTime();
                outboxActive = ageMs < 60000; // Active if modified in last minute
            }
        } catch (err) {
            // Ignore
        }
        
        res.json({
            status: 'active',
            mainAgentConnected: !!this.mainAgentSession || outboxActive,
            activeSessions: this.sessions.size,
            stats: this.stats,
            queue: this.queue.getStats()
        });
    }
    
    heartbeat() {
        // Clean up stale sessions
        const now = Date.now();
        for (const [socketId, session] of this.sessions) {
            if (now - session.lastActivity > 5 * 60 * 1000) { // 5 minutes
                console.log('Cleaning up stale session:', socketId);
                this.sessions.delete(socketId);
            }
        }
        
        this.emit('heartbeat', this.stats);
    }
    
    // Get pending messages for main agent to process
    async getPendingMessages() {
        return await this.queue.getPending();
    }
    
    // Mark message as processed
    async markProcessed(message) {
        if (message._filepath) {
            await this.queue.markProcessed(message._filepath);
        }
    }
    
    // Send response back to user
    async sendResponse(sessionId, response) {
        await this.queue.storeResponse(sessionId, {
            type: 'agent_response',
            content: response.text,
            metadata: response
        });
        
        // Also try direct socket delivery
        if (sessionId.startsWith('web:')) {
            const socketId = sessionId.replace('web:', '');
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('agent:message', {
                    text: response.text,
                    mood: response.mood || 'content',
                    initiative: response.initiative || false
                });
            }
        }
    }
}

module.exports = ClawBotBridge;
