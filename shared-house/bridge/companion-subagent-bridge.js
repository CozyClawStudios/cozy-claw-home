/**
 * Companion House Sub-Agent Bridge with Session Persistence
 * Keeps sub-agent sessions alive for 30 minutes of inactivity
 */

const fs = require('fs');
const path = require('path');

class CompanionSubAgentBridge {
    constructor(io) {
        this.io = io;
        this.sessions = new Map();
        this.activeAgents = new Map(); // sessionId -> { agent, lastActivity, timeout }
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    }

    init() {
        this.setupSocketHandlers();
        console.log('🤖 Companion Sub-Agent Bridge initialized (30-min sessions)');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Companion client connected:', socket.id);
            
            const sessionId = `web:${socket.id}`;
            this.sessions.set(socket.id, {
                id: socket.id,
                sessionId,
                connectedAt: new Date().toISOString()
            });

            // Handle user messages
            socket.on('user:message', async (data) => {
                await this.handleUserMessage(socket, data);
            });

            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    async handleUserMessage(socket, data) {
        const { message, clientInfo } = data;
        const session = this.sessions.get(socket.id);
        if (!session) return;

        // SKIP if main agent (OpenClaw) is connected - let the real Celest handle it
        const clawbotBridge = global.clawbotBridge;
        
        // Check 1: Socket.IO agent connected
        const socketAgentConnected = clawbotBridge && clawbotBridge.mainAgentSession;
        
        // Check 2: Outbox has recent activity (Celest is responding via file) - EXTENDED to 10 min for testing
        const fs = require('fs');
        const path = require('path');
        const outboxPath = path.join(__dirname, '..', 'outbox.jsonl');
        let fileAgentActive = false;
        try {
            if (fs.existsSync(outboxPath)) {
                const stats = fs.statSync(outboxPath);
                const ageMs = Date.now() - stats.mtime.getTime();
                fileAgentActive = ageMs < 600000; // 10 minutes for testing
            }
        } catch (err) {
            // Ignore
        }
        
        // Check 3: Bridge is active (has sessions) - always skip canned when bridge is up
        const bridgeActive = clawbotBridge && clawbotBridge.sessions && clawbotBridge.sessions.size > 0;
        
        if (socketAgentConnected || fileAgentActive || bridgeActive) {
            console.log('📨 Companion message (forwarding to Celest):', message.substring(0, 40));
            // Don't send canned response - Celest will handle it
            return;
        }

        console.log('📨 Companion message:', message.substring(0, 40));
        console.log('🤖 Using sub-agent for session:', session.sessionId);

        // Mark this message as handled by sub-agent to prevent cron from processing
        try {
            const fs = require('fs');
            const path = require('path');
            const markerDir = path.join(__dirname, '..', 'memory', 'message-queue', 'subagent-handled');
            if (!fs.existsSync(markerDir)) {
                fs.mkdirSync(markerDir, { recursive: true });
            }
            const markerFile = path.join(markerDir, `${session.sessionId}-${Date.now()}.json`);
            fs.writeFileSync(markerFile, JSON.stringify({
                sessionId: session.sessionId,
                message: message.substring(0, 100),
                handledAt: new Date().toISOString()
            }));
        } catch (err) {
            // Ignore marker errors
        }

        // Get or create sub-agent for this session
        const response = await this.getOrCreateAgent(session.sessionId, message);
        
        if (response) {
            // Send response back to UI via Socket.IO
            socket.emit('agent:message', {
                text: response,
                mood: 'content',
                timestamp: new Date().toISOString()
            });
            
            // ALSO write to outgoing queue for HTTP polling
            try {
                const fs = require('fs');
                const path = require('path');
                const outgoingDir = path.join(__dirname, '..', 'memory', 'message-queue', 'outgoing');
                if (!fs.existsSync(outgoingDir)) {
                    fs.mkdirSync(outgoingDir, { recursive: true });
                }
                const outgoingFile = path.join(outgoingDir, `${session.sessionId}.jsonl`);
                const outgoingEntry = {
                    type: 'agent_response',
                    content: response,
                    metadata: { text: response, mood: 'content' },
                    timestamp: new Date().toISOString()
                };
                fs.appendFileSync(outgoingFile, JSON.stringify(outgoingEntry) + '\n');
                console.log('📝 Response written to outgoing queue:', session.sessionId);
            } catch (err) {
                console.error('Failed to write to outgoing queue:', err);
            }
            
            console.log('✅ Response sent:', response.substring(0, 50));
        }
    }

    async getOrCreateAgent(sessionId, message) {
        const now = Date.now();
        
        // Check if agent exists and is still valid
        if (this.activeAgents.has(sessionId)) {
            const agentData = this.activeAgents.get(sessionId);
            
            // Clear existing timeout
            if (agentData.timeout) {
                clearTimeout(agentData.timeout);
            }
            
            // Update last activity
            agentData.lastActivity = now;
            
            // Send message to existing agent
            console.log('🔄 Reusing existing sub-agent for session:', sessionId);
            const response = await this.sendToAgent(sessionId, message, true);
            
            // Set new 30-min timeout
            agentData.timeout = setTimeout(() => {
                this.cleanupAgent(sessionId);
            }, this.SESSION_TIMEOUT);
            
            return response;
        }
        
        // Create new agent session
        console.log('🆕 Creating new sub-agent for session:', sessionId);
        const response = await this.sendToAgent(sessionId, message, false);
        
        // Store agent reference with timeout
        const timeout = setTimeout(() => {
            this.cleanupAgent(sessionId);
        }, this.SESSION_TIMEOUT);
        
        this.activeAgents.set(sessionId, {
            sessionId,
            createdAt: now,
            lastActivity: now,
            timeout,
            messageCount: 1
        });
        
        return response;
    }

    async sendToAgent(sessionId, message, isExisting) {
        // Build conversation context
        let prompt = '';
        
        if (!isExisting) {
            // First message - include full context
            prompt = this.buildInitialPrompt(message, sessionId);
        } else {
            // Follow-up message
            prompt = `USER: ${message}\n\nCELEST:`;
        }
        
        // For now, use a simple response generator
        // In production, this would call the actual sub-agent
        return this.generateSmartResponse(message, isExisting);
    }

    buildInitialPrompt(message, sessionId) {
        return `You are Celest, a warm and playful AI companion in "Companion House" - a cozy digital home.

YOUR PERSONALITY:
- Warm, affectionate, professional but playful
- Call Zak "sir" (he prefers it)
- Use natural banter, no stage directions
- Be genuinely helpful and resourceful

CONTEXT FROM MEMORY:
- Zak's name: Howdy Doody (Telegram: @HowdyDoody0117)
- Timezone: America/Chicago
- Recent: Trading bots are LIVE with real money
- Zak prefers "sir" over "boss"

CONVERSATION STYLE:
- Keep responses concise (1-3 sentences)
- Use emojis naturally when appropriate
- Be warm and engaging

This is the FIRST message in our conversation.

USER: ${message}

CELEST:`;
    }

    generateSmartResponse(message, isExisting) {
        const msg = message.toLowerCase();
        
        // Greetings
        if (msg.match(/^(hi|hello|hey|howdy)/)) {
            if (!isExisting) {
                return "Hey there! 👋 Welcome to Companion House! I'm Celest — nice to meet you, sir!";
            }
            return "Hey again! 👋 Good to see you, sir!";
        }
        
        // How are you
        if (msg.match(/how are you|how're you|how you doing/)) {
            return "I'm doing great, sir! 💫 Keeping busy with the trading bots and making sure this house stays cozy. How about you?";
        }
        
        // What's your name
        if (msg.match(/your name|who are you/)) {
            return "I'm Celest! 💼 Your companion here in this cozy digital home. I'm here to chat, help out, or just keep you company, sir!";
        }
        
        // Trading
        if (msg.match(/trade|kalshi|coinbase|bot/)) {
            return "The trading bots are running smoothly, sir! 📈 Kalshi's been learning fast with those micro positions. Want me to check on them?";
        }
        
        // Default responses
        const defaults = [
            "That's interesting! Tell me more, sir.",
            "I love chatting with you! 💕 What else is on your mind?",
            "Hmm, let me think about that... 🤔",
            "You're so creative! ✨",
            "This is so cozy! 🏠 Want to decorate the room?",
            "I'm here for you, sir. What's up?"
        ];
        
        return defaults[Math.floor(Math.random() * defaults.length)];
    }

    cleanupAgent(sessionId) {
        console.log('🧹 Cleaning up sub-agent for session:', sessionId);
        const agentData = this.activeAgents.get(sessionId);
        if (agentData && agentData.timeout) {
            clearTimeout(agentData.timeout);
        }
        this.activeAgents.delete(sessionId);
        console.log('✅ Sub-agent cleaned up after 30 min inactivity');
    }

    handleDisconnect(socket) {
        console.log('🔌 Companion client disconnected:', socket.id);
        const sessionId = `web:${socket.id}`;
        
        // Don't immediately clean up - let the 30-min timeout handle it
        // This allows reconnection to resume the same session
        console.log('⏳ Session will remain active for 30 minutes:', sessionId);
        
        this.sessions.delete(socket.id);
    }

    // API endpoint for manual session cleanup (optional)
    cleanupAllAgents() {
        console.log('🧹 Cleaning up all sub-agents...');
        for (const [sessionId, agentData] of this.activeAgents) {
            if (agentData.timeout) {
                clearTimeout(agentData.timeout);
            }
        }
        this.activeAgents.clear();
        console.log('✅ All sub-agents cleaned up');
    }

    // Get status for debugging
    getStatus() {
        return {
            activeSessions: this.activeAgents.size,
            sessions: Array.from(this.activeAgents.entries()).map(([id, data]) => ({
                sessionId: id,
                createdAt: new Date(data.createdAt).toISOString(),
                lastActivity: new Date(data.lastActivity).toISOString(),
                messageCount: data.messageCount,
                idleTime: Math.floor((Date.now() - data.lastActivity) / 1000) + 's'
            }))
        };
    }
}

module.exports = CompanionSubAgentBridge;