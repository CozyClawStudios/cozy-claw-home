/**
 * Message Queue - File-based queue for agent communication
 * 
 * Provides reliable message passing between UI and main agent
 * Uses file-based storage for local-first approach
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class MessageQueue extends EventEmitter {
    constructor(queueDir = null) {
        super();
        this.queueDir = queueDir || path.join(__dirname, '..', 'memory', 'message-queue');
        this.incomingDir = path.join(this.queueDir, 'incoming');
        this.outgoingDir = path.join(this.queueDir, 'outgoing');
        this.processedDir = path.join(this.queueDir, 'processed');
        
        this.maxQueueSize = 1000;
        this.messageTTL = 24 * 60 * 60 * 1000; // 24 hours
        
        this.processing = false;
        this.watcher = null;
    }
    
    async init() {
        // Ensure directories exist
        for (const dir of [this.queueDir, this.incomingDir, this.outgoingDir, this.processedDir]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        
        // Start cleanup interval
        setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
        
        console.log('📬 Message queue initialized:', this.queueDir);
    }
    
    // Queue a message from UI to Agent
    async enqueue(message) {
        const msg = {
            id: message.id || uuidv4(),
            type: message.type || 'user_message',
            content: message.content || message.message,
            sessionId: message.sessionId || 'web:default',
            timestamp: new Date().toISOString(),
            metadata: message.metadata || {},
            responsePath: path.join(this.outgoingDir, `${message.sessionId || 'web:default'}.jsonl`)
        };
        
        const filepath = path.join(this.incomingDir, `${msg.id}.json`);
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(msg, null, 2));
            this.emit('message:enqueued', msg);
            return msg;
        } catch (err) {
            console.error('Failed to enqueue message:', err);
            throw err;
        }
    }
    
    // Store agent response
    async storeResponse(sessionId, response) {
        const responseFile = path.join(this.outgoingDir, `${sessionId}.jsonl`);
        const line = JSON.stringify({
            ...response,
            timestamp: new Date().toISOString()
        }) + '\n';
        
        try {
            fs.appendFileSync(responseFile, line);
            this.emit('response:stored', { sessionId, response });
            return true;
        } catch (err) {
            console.error('Failed to store response:', err);
            return false;
        }
    }
    
    // Get pending messages for processing
    async getPending() {
        try {
            const files = fs.readdirSync(this.incomingDir)
                .filter(f => f.endsWith('.json'))
                .sort(); // FIFO order
            
            const messages = [];
            for (const file of files.slice(0, 100)) { // Process in batches
                const filepath = path.join(this.incomingDir, file);
                try {
                    const content = fs.readFileSync(filepath, 'utf8');
                    const msg = JSON.parse(content);
                    messages.push({ ...msg, _filepath: filepath });
                } catch (err) {
                    console.error('Failed to read message:', file);
                }
            }
            
            return messages;
        } catch (err) {
            return [];
        }
    }
    
    // Mark message as processed
    async markProcessed(filepath) {
        try {
            const filename = path.basename(filepath);
            const dest = path.join(this.processedDir, filename);
            fs.renameSync(filepath, dest);
            this.emit('message:processed', { filename });
            return true;
        } catch (err) {
            console.error('Failed to mark processed:', err);
            return false;
        }
    }
    
    // Get responses for a session
    async getResponses(sessionId, since = null) {
        const responseFile = path.join(this.outgoingDir, `${sessionId}.jsonl`);
        
        try {
            if (!fs.existsSync(responseFile)) {
                return [];
            }
            
            const content = fs.readFileSync(responseFile, 'utf8');
            const lines = content.trim().split('\n').filter(Boolean);
            
            const responses = [];
            for (const line of lines) {
                try {
                    const resp = JSON.parse(line);
                    if (!since || new Date(resp.timestamp) > new Date(since)) {
                        responses.push(resp);
                    }
                } catch (err) {
                    // Skip invalid lines
                }
            }
            
            return responses;
        } catch (err) {
            return [];
        }
    }
    
    // Watch for new messages (for main agent)
    watch(callback) {
        if (this.watcher) {
            this.watcher.close();
        }
        
        // File system watcher
        this.watcher = fs.watch(this.incomingDir, (eventType, filename) => {
            if (eventType === 'rename' && filename?.endsWith('.json')) {
                // New file created
                setTimeout(() => {
                    const filepath = path.join(this.incomingDir, filename);
                    if (fs.existsSync(filepath)) {
                        try {
                            const content = fs.readFileSync(filepath, 'utf8');
                            const msg = JSON.parse(content);
                            callback({ ...msg, _filepath: filepath });
                        } catch (err) {
                            console.error('Failed to process watched file:', err);
                        }
                    }
                }, 100); // Small delay to ensure write is complete
            }
        });
        
        // Also poll as backup
        this.startPolling(callback);
        
        console.log('👁️  Watching message queue...');
    }
    
    // Polling fallback
    startPolling(callback) {
        let lastCheck = new Date(0);
        
        setInterval(async () => {
            const pending = await this.getPending();
            for (const msg of pending) {
                const msgTime = new Date(msg.timestamp);
                if (msgTime > lastCheck) {
                    callback(msg);
                }
            }
            lastCheck = new Date();
        }, 1000); // Poll every second
    }
    
    // Cleanup old messages
    async cleanup() {
        const cutoff = Date.now() - this.messageTTL;
        
        for (const dir of [this.incomingDir, this.processedDir]) {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filepath = path.join(dir, file);
                    const stats = fs.statSync(filepath);
                    if (stats.mtimeMs < cutoff) {
                        fs.unlinkSync(filepath);
                    }
                }
            } catch (err) {
                console.error('Cleanup error:', err);
            }
        }
        
        // Truncate large response files
        try {
            const files = fs.readdirSync(this.outgoingDir);
            for (const file of files) {
                const filepath = path.join(this.outgoingDir, file);
                const stats = fs.statSync(filepath);
                if (stats.size > 10 * 1024 * 1024) { // 10MB
                    // Keep last 100 lines
                    const content = fs.readFileSync(filepath, 'utf8');
                    const lines = content.trim().split('\n');
                    const lastLines = lines.slice(-100).join('\n') + '\n';
                    fs.writeFileSync(filepath, lastLines);
                }
            }
        } catch (err) {
            console.error('Response cleanup error:', err);
        }
    }
    
    // Get queue stats
    async getStats() {
        try {
            const incoming = fs.readdirSync(this.incomingDir).length;
            const processed = fs.readdirSync(this.processedDir).length;
            
            let outgoingSize = 0;
            const outgoingFiles = fs.readdirSync(this.outgoingDir);
            for (const file of outgoingFiles) {
                const stats = fs.statSync(path.join(this.outgoingDir, file));
                outgoingSize += stats.size;
            }
            
            return {
                pending: incoming,
                processed,
                activeSessions: outgoingFiles.length,
                outgoingSizeBytes: outgoingSize
            };
        } catch (err) {
            return { pending: 0, processed: 0, activeSessions: 0, outgoingSizeBytes: 0 };
        }
    }
    
    close() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

module.exports = MessageQueue;
