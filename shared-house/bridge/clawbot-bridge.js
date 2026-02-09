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
        
        // Start heartbeat
        setInterval(() => this.heartbeat(), 30000);
        
        console.log('🌉 ClawBot Bridge initialized');
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
            
            // Handle disconnection
            socket.on('disconnect', () => {
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
            // Method 1: Direct forward to main agent session (if connected)
            if (this.mainAgentSession) {
                const agentSocket = this.io.sockets.sockets.get(this.mainAgentSession);
                if (agentSocket) {
                    agentSocket.emit('clawbot:message', message);
                    console.log('📤 Forwarded to main agent session:', message.id);
                    
                    // Also store in queue for persistence
                    await this.queue.enqueue(message);
                    return;
                }
            }
            
            // Method 2: Queue for agent to pick up
            await this.queue.enqueue(message);
            
            // Method 3: Direct HTTP webhook to OpenClaw gateway
            this.forwardToOpenClaw(message);
            
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
    
    // Forward message to OpenClaw via HTTP webhook
    forwardToOpenClaw(message) {
        const http = require('http');
        const { exec } = require('child_process');
        
        // Use openclaw CLI to send to main session
        const escapedMessage = message.content.replace(/"/g, '\\"').replace(/\n/g, ' ');
        const cmd = `openclaw sessions send --session-key "agent:main:main" --message "[Companion House] ${escapedMessage}"`;
        
        exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
            if (err) {
                console.error('❌ Failed to forward to OpenClaw:', err.message);
            } else {
                console.log('✅ Forwarded to OpenClaw:', message.content.substring(0, 40));
            }
        });
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
        
        // Poll for new responses every 500ms
        let lastCheck = new Date(0);
        
        const poll = setInterval(async () => {
            if (!this.sessions.has(socket.id)) {
                clearInterval(poll);
                return;
            }
            
            const responses = await this.queue.getResponses(session.sessionId, lastCheck);
            for (const resp of responses) {
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
        // Webhook for external agents
        try {
            const { type = 'message', data } = req.body;
            
            switch (type) {
                case 'message':
                    // External agent sending a message to user
                    await this.queue.storeResponse(data.sessionId, {
                        type: 'agent_response',
                        content: data.text,
                        metadata: data.metadata
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
        res.json({
            status: 'active',
            mainAgentConnected: !!this.mainAgentSession,
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
