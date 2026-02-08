#!/usr/bin/env node
/**
 * Celest Bridge - Connects Cozy Claw Home to the actual Celest agent
 * 
 * This bridge forwards user messages from the cozy-claw-home UI
 * to Celest (the main agent) and sends responses back.
 */

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const API_KEY = 'cozy-claw-home-secret';
const MESSAGE_FILE = '/tmp/celest_inbox.jsonl';
const RESPONSE_FILE = '/tmp/celest_outbox.jsonl';

// Track pending requests
const pendingRequests = new Map();

// Initialize message files
function initFiles() {
    [MESSAGE_FILE, RESPONSE_FILE].forEach(f => {
        if (!fs.existsSync(f)) fs.writeFileSync(f, '');
    });
}

// Watch for responses from Celest
function watchResponses(ws) {
    let lastSize = fs.statSync(RESPONSE_FILE).size;
    
    setInterval(() => {
        try {
            const stats = fs.statSync(RESPONSE_FILE);
            if (stats.size > lastSize) {
                const content = fs.readFileSync(RESPONSE_FILE, 'utf8');
                const lines = content.trim().split('\n').filter(Boolean);
                const newLines = lines.slice(-5); // Get last 5
                
                newLines.forEach(line => {
                    try {
                        const response = JSON.parse(line);
                        if (response.requestId && pendingRequests.has(response.requestId)) {
                            const client = pendingRequests.get(response.requestId);
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'response',
                                    requestId: response.requestId,
                                    data: {
                                        text: response.text,
                                        mood: response.mood || 'happy',
                                        suggestedActivity: 'talking'
                                    }
                                }));
                                pendingRequests.delete(response.requestId);
                                console.log('📨 Response sent to client');
                            }
                        }
                    } catch (e) {}
                });
                
                lastSize = stats.size;
            }
        } catch (e) {}
    }, 500);
}

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/clawbot' });

console.log('🏠 Celest Bridge Starting...');
console.log(`📡 WebSocket: ws://localhost:${PORT}/clawbot`);
console.log(`📝 Inbox: ${MESSAGE_FILE}`);
console.log(`📤 Outbox: ${RESPONSE_FILE}`);
console.log('');
console.log('To respond as Celest, add lines to:');
console.log(RESPONSE_FILE);
console.log('');

initFiles();

wss.on('connection', (ws, req) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
        ws.close(1008, 'Invalid API key');
        return;
    }
    
    console.log('✅ Cozy Claw Home connected!');
    watchResponses(ws);
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            
            if (msg.type === 'query') {
                // Write to inbox for Celest to read
                const entry = {
                    type: 'query',
                    requestId: msg.requestId,
                    message: msg.message,
                    context: msg.context,
                    timestamp: Date.now()
                };
                fs.appendFileSync(MESSAGE_FILE, JSON.stringify(entry) + '\n');
                pendingRequests.set(msg.requestId, ws);
                console.log('💬 User:', msg.message.substring(0, 50));
                
            } else if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    });
    
    ws.on('close', () => {
        console.log('👋 Client disconnected');
    });
    
    // Send welcome
    setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'initiative',
            data: {
                text: "Hey! I'm Celest! 💙 I'm connected now - type something and I'll respond!",
                priority: 9
            }
        }));
    }, 1000);
});

// Simple HTTP endpoint for manual responses
server.on('request', (req, res) => {
    if (req.url === '/send' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { requestId, text, mood } = JSON.parse(body);
                fs.appendFileSync(RESPONSE_FILE, JSON.stringify({
                    requestId, text, mood, timestamp: Date.now()
                }) + '\n');
                res.writeHead(200);
                res.end('OK');
            } catch (e) {
                res.writeHead(400);
                res.end('Error');
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`✨ Celest Bridge running on port ${PORT}`);
    console.log('');
    console.log('Quick test:');
    console.log('curl -X POST http://localhost:8080/send \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"requestId":"test","text":"Hello from Celest!"}\'');
    console.log('');
});

module.exports = { MESSAGE_FILE, RESPONSE_FILE };
