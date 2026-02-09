/**
 * Agent Adapter - Connects Companion House to Celest (Main Agent)
 * 
 * Flow: Game UI → Bridge → inbox.jsonl → (Celest reads) → outbox.jsonl → Bridge → Game UI
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
            useSocket: options.useSocket !== false,
            useFilePolling: options.useFilePolling !== false,
            pollInterval: options.pollInterval || 1000,
            ...options
        };
        
        this.socket = null;
        this.queue = null;
        this.connected = false;
        this.pollTimer = null;
        this.processingMessages = new Set();
        this.pendingResponses = new Map(); // Track pending responses
        
        this.inboxPath = path.join(__dirname, '..', 'inbox.jsonl');
        this.outboxPath = path.join(__dirname, '..', 'outbox.jsonl');
    }
    
    async connect() {
        console.log('🔌 AgentAdapter: Connecting to bridge...');
        
        if (this.options.useSocket) {
            await this.connectSocket();
        }
        
        if (this.options.useFilePolling) {
            await this.connectFilePolling();
        }
        
        // Start polling for Celest's responses
        this.startResponsePolling();
        
        this.connected = true;
        this.emit('connected');
        
        console.log('✅ AgentAdapter: Connected to bridge');
    }
    
    async connectSocket() {
        return new Promise((resolve) => {
            this.socket = io(this.options.bridgeUrl, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
            
            this.socket.on('connect', () => {
                console.log('📡 AgentAdapter: Socket connected');
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
                console.log('📡 AgentAdapter: Socket error:', err.message);
                resolve();
            });
            
            setTimeout(() => resolve(), 5000);
        });
    }
    
    async connectFilePolling() {
        // Use the same queue directory as the server
        const queueDir = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/memory/message-queue';
        this.queue = new MessageQueue(queueDir);
        await this.queue.init();
        
        this.queue.watch((message) => {
            this.handleMessage(message);
        });
        
        console.log('📁 AgentAdapter: File polling active');
    }
    
    handleMessage(message) {
        if (this.processingMessages.has(message.id)) {
            return;
        }
        this.processingMessages.add(message.id);
        
        setTimeout(() => {
            this.processingMessages.delete(message.id);
        }, 5 * 60 * 1000);
        
        console.log('📨 AgentAdapter: Received message:', message.id);
        this.emit('message', message);
    }
    
    async sendResponse(sessionId, response) {
        const responseData = {
            text: typeof response === 'string' ? response : response.text,
            mood: response.mood || 'content',
            initiative: response.initiative || false,
            timestamp: new Date().toISOString()
        };
        
        if (this.queue) {
            await this.queue.storeResponse(sessionId, {
                type: 'agent_response',
                content: responseData.text,
                metadata: responseData
            });
            console.log('📤 AgentAdapter: Stored response in queue');
        }
        
        this.emit('response:sent', { sessionId, response: responseData });
    }
    
    async markProcessed(message) {
        if (this.queue && message._filepath) {
            await this.queue.markProcessed(message._filepath);
        }
    }
    
    // NEW: Poll for responses from Celest (outbox.jsonl)
    startResponsePolling() {
        setInterval(async () => {
            try {
                if (!fs.existsSync(this.outboxPath)) {
                    return;
                }
                
                const lines = fs.readFileSync(this.outboxPath, 'utf8')
                    .split('\n')
                    .filter(line => line.trim());
                
                if (lines.length === 0) return;
                
                // Clear outbox after reading
                fs.writeFileSync(this.outboxPath, '');
                
                for (const line of lines) {
                    try {
                        const response = JSON.parse(line);
                        if (response.sessionId && response.text) {
                            console.log('📥 Celest response:', response.text.substring(0, 50));
                            await this.sendResponse(response.sessionId, {
                                text: response.text,
                                mood: response.mood || 'content'
                            });
                        }
                    } catch (err) {
                        console.error('Failed to parse response:', err.message);
                    }
                }
            } catch (err) {
                // Silent fail - will retry
            }
        }, 1000); // Poll every second
    }
    
    getStats() {
        if (this.queue) {
            return this.queue.getStats();
        }
        return { pending: 0 };
    }
    
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

class FileAdapter extends EventEmitter {
    constructor(queueDir) {
        super();
        this.queue = new MessageQueue(queueDir);
        this.pollInterval = 1000;
        this.pollTimer = null;
    }
    
    async connect() {
        await this.queue.init();
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
        
        // Write to inbox for Celest to pick up
        const inboxEntry = {
            type: 'companion_message',
            id: msg.id,
            content: msg.content,
            sessionId: msg.sessionId,
            timestamp: new Date().toISOString(),
            source: 'cozy-claw-home'
        };
        
        fs.appendFileSync(adapter.inboxPath, JSON.stringify(inboxEntry) + '\n');
        console.log('📨 Forwarded to inbox (waiting for Celest response)');
        
        // Don't send immediate response - wait for Celest
        await adapter.markProcessed(msg);
    });
    
    adapter.connect().catch(err => {
        console.error('Failed to connect:', err);
        process.exit(1);
    });
    
    process.on('SIGINT', () => {
        console.log('\n👋 Disconnecting...');
        adapter.disconnect();
        process.exit(0);
    });
}
