/**
 * Agent Adapter - For Main Agent to Connect to Bridge
 * 
 * This module allows the main agent (Celest) to:
 * 1. Connect to the bridge via WebSocket or file polling
 * 2. Receive messages from the UI
 * 3. Send responses back to the UI
 * 
 * Usage in main agent:
 *   const adapter = new AgentAdapter();
 *   await adapter.connect();
 *   adapter.on('message', async (msg) => {
 *     const response = await generateResponse(msg.content);
 *     await adapter.sendResponse(msg.sessionId, response);
 *   });
 */

const io = require('socket.io-client');
const MessageQueue = require('./message-queue');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AgentAdapter extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            bridgeUrl: options.bridgeUrl || 'http://localhost:3000',
            useSocket: options.useSocket !== false, // Default true
            useFilePolling: options.useFilePolling !== false, // Default true
            pollInterval: options.pollInterval || 1000,
            ...options
        };
        
        this.socket = null;
        this.queue = null;
        this.connected = false;
        this.pollTimer = null;
        this.processingMessages = new Set();
    }
    
    async connect() {
        console.log('🔌 AgentAdapter: Connecting to bridge...');
        
        // Try WebSocket first
        if (this.options.useSocket) {
            await this.connectSocket();
        }
        
        // Also set up file polling as backup/fallback
        if (this.options.useFilePolling) {
            await this.connectFilePolling();
        }
        
        this.connected = true;
        this.emit('connected');
        
        console.log('✅ AgentAdapter: Connected to bridge');
    }
    
    async connectSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.options.bridgeUrl, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
            
            this.socket.on('connect', () => {
                console.log('📡 AgentAdapter: Socket connected');
                
                // Register as main agent
                this.socket.emit('agent:register', {
                    name: 'Celest',
                    version: '1.0.0',
                    capabilities: ['chat', 'memory', 'tools']
                });
                
                resolve();
            });
            
            this.socket.on('clawbot:message', (message) => {
                this.handleMessage(message);
            });
            
            this.socket.on('disconnect', () => {
                console.log('📡 AgentAdapter: Socket disconnected');
                this.emit('disconnected');
            });
            
            this.socket.on('connect_error', (err) => {
                console.log('📡 AgentAdapter: Socket connection failed:', err.message);
                // Don't reject - we'll fall back to file polling
                resolve();
            });
            
            // Timeout after 5 seconds
            setTimeout(() => resolve(), 5000);
        });
    }
    
    async connectFilePolling() {
        this.queue = new MessageQueue();
        await this.queue.init();
        
        // Watch for new messages
        this.queue.watch((message) => {
            this.handleMessage(message);
        });
        
        console.log('📁 AgentAdapter: File polling active');
    }
    
    handleMessage(message) {
        // Prevent duplicate processing
        if (this.processingMessages.has(message.id)) {
            return;
        }
        this.processingMessages.add(message.id);
        
        // Clean up after 5 minutes
        setTimeout(() => {
            this.processingMessages.delete(message.id);
        }, 5 * 60 * 1000);
        
        console.log('📨 AgentAdapter: Received message:', message.id);
        this.emit('message', message);
    }
    
    // Send response back to user
    async sendResponse(sessionId, response) {
        const responseData = {
            text: typeof response === 'string' ? response : response.text,
            mood: response.mood || 'content',
            initiative: response.initiative || false,
            timestamp: new Date().toISOString()
        };
        
        // Try WebSocket first
        if (this.socket?.connected) {
            this.socket.emit('agent:response', {
                sessionId,
                response: responseData
            });
            console.log('📤 AgentAdapter: Sent via socket');
        }
        
        // Also store in queue for persistence
        if (this.queue) {
            await this.queue.storeResponse(sessionId, {
                type: 'agent_response',
                content: responseData.text,
                metadata: responseData
            });
        }
        
        this.emit('response:sent', { sessionId, response: responseData });
    }
    
    // Mark message as processed (removes from queue)
    async markProcessed(message) {
        if (this.queue && message._filepath) {
            await this.queue.markProcessed(message._filepath);
        }
    }
    
    // Get queue stats
    async getStats() {
        if (this.queue) {
            return await this.queue.getStats();
        }
        return { pending: 0 };
    }
    
    // Disconnect
    disconnect() {
        this.connected = false;
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        if (this.queue) {
            this.queue.close();
            this.queue = null;
        }
        
        this.emit('disconnected');
    }
}

// Simple file-based adapter for minimal setups
class FileAdapter extends EventEmitter {
    constructor(queueDir) {
        super();
        this.queue = new MessageQueue(queueDir);
        this.pollInterval = 1000;
        this.pollTimer = null;
    }
    
    async connect() {
        await this.queue.init();
        
        // Watch for messages
        this.queue.watch((message) => {
            this.emit('message', message);
        });
        
        console.log('📁 FileAdapter: Watching for messages...');
    }
    
    async sendResponse(sessionId, response) {
        await this.queue.storeResponse(sessionId, {
            type: 'agent_response',
            content: typeof response === 'string' ? response : response.text,
            metadata: response
        });
    }
    
    disconnect() {
        this.queue.close();
    }
}

module.exports = { AgentAdapter, FileAdapter };

// If run directly, start adapter
if (require.main === module) {
    const adapter = new AgentAdapter();
    
    adapter.on('connected', () => {
        console.log('✅ Agent adapter ready');
        console.log('Waiting for messages from UI...');
    });
    
    adapter.on('message', async (msg) => {
        console.log('\n📝 User message:', msg.content);
        console.log('   Session:', msg.sessionId);
        
        // Forward to OpenClaw inbox for Celest to process
        const inboxEntry = {
            type: 'companion_message',
            id: msg.id,
            content: msg.content,
            sessionId: msg.sessionId,
            timestamp: new Date().toISOString(),
            source: 'cozy-claw-home'
        };
        
        // Write to inbox file for OpenClaw to pick up
        const inboxPath = path.join(__dirname, '..', 'inbox.jsonl');
        fs.appendFileSync(inboxPath, JSON.stringify(inboxEntry) + '\n');
        console.log('📨 Forwarded to OpenClaw inbox');
        
        // Send immediate acknowledgment to user
        await adapter.sendResponse(msg.sessionId, {
            text: "Let me check that for you, sir...",
            mood: 'thinking'
        });
        
        await adapter.markProcessed(msg);
    });
    
    adapter.connect().catch(err => {
        console.error('Failed to connect:', err);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Disconnecting...');
        adapter.disconnect();
        process.exit(0);
    });
}
