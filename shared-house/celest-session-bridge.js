#!/usr/bin/env node
/**
 * Celest Session Bridge
 * Spawns a new OpenClaw agent session for each user message
 */

const { exec } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const API_KEY = 'cozy-claw-home-secret';
const OPENCLAW_BIN = 'openclaw'; // or path to openclaw binary

const server = http.createServer();
const wss = new WebSocket.Server({ 
    server: server,
    path: '/clawbot' 
});

console.log('🏠 Celest Session Bridge');
console.log('📡 ws://localhost:' + PORT + '/clawbot');
console.log('💡 Spawns new OpenClaw sessions for each message');
console.log('');

// Store active sessions
const sessions = new Map();

wss.on('connection', function(ws, req) {
    if (req.headers['x-api-key'] !== API_KEY) {
        ws.close(1008, 'Invalid API key');
        return;
    }
    
    console.log('✅ Cozy Claw Home connected!');
    
    // Send welcome
    ws.send(JSON.stringify({
        type: 'initiative',
        data: {
            text: "💙 I'm here! Send me a message and I'll respond!",
            priority: 9
        }
    }));
    
    ws.on('message', function(data) {
        try {
            const msg = JSON.parse(data);
            
            if (msg.type === 'query') {
                console.log('💬 User message:', msg.message);
                
                // Spawn a new OpenClaw session for this message
                const sessionKey = 'cozy-claw-' + Date.now();
                
                // For now, just echo that we received it
                // In production, this would spawn: openclaw sessions spawn --task "..."
                ws.send(JSON.stringify({
                    type: 'response',
                    requestId: msg.requestId,
                    data: {
                        text: "I received: " + msg.message + " (Session spawning not yet implemented - this would start a new OpenClaw session with Celest)",
                        mood: 'happy',
                        suggestedActivity: 'talking'
                    }
                }));
                
            } else if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    });
    
    ws.on('close', function() {
        console.log('👋 Client disconnected');
    });
});

server.listen(PORT, function() {
    console.log('✨ Bridge running on port ' + PORT);
});
