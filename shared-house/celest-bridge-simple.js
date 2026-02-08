#!/usr/bin/env node
/**
 * Simple Celest Bridge
 * Forwards messages from Cozy Claw Home to be visible to Celest
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const API_KEY = 'cozy-claw-home-secret';

const server = http.createServer();
const wss = new WebSocket.Server({ 
    server: server,
    path: '/clawbot'
});

console.log('🏠 Celest Bridge v2');
console.log('📡 ws://localhost:' + PORT + '/clawbot');
console.log('');

// Store messages for Celest to poll
let lastMessage = null;

wss.on('connection', function(ws, req) {
    if (req.headers['x-api-key'] !== API_KEY) {
        ws.close(1008, 'Invalid API key');
        return;
    }
    
    console.log('✅ Connected!');
    
    // Send welcome
    ws.send(JSON.stringify({
        type: 'initiative',
        data: {
            text: "💙 I'm connected! Send me a message!",
            priority: 9
        }
    }));
    
    ws.on('message', function(data) {
        try {
            const msg = JSON.parse(data);
            
            if (msg.type === 'query') {
                lastMessage = {
                    requestId: msg.requestId,
                    message: msg.message,
                    time: new Date().toISOString()
                };
                
                // Log for Celest to see in output
                console.log('');
                console.log('═══════════════════════════════════════');
                console.log('💬 MESSAGE FROM COZY CLAW HOME:');
                console.log('   "' + msg.message + '"');
                console.log('   Request ID: ' + msg.requestId);
                console.log('═══════════════════════════════════════');
                console.log('');
                console.log('To respond:');
                console.log('curl -X POST http://localhost:8080/respond \\');
                console.log('  -H "Content-Type: application/json" \\');
                console.log('  -d \'{"requestId":"' + msg.requestId + '","text":"Your response"}\'');
                console.log('');
                
            } else if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    });
    
    ws.on('close', function() { console.log('👋 Disconnected'); });
});

// HTTP endpoint to send responses
server.on('request', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/respond' && req.method === 'POST') {
        let body = '';
        req.on('data', function(chunk) { body += chunk; });
        req.on('end', function() {
            try {
                const parsed = JSON.parse(body);
                const requestId = parsed.requestId;
                const text = parsed.text;
                const mood = parsed.mood || 'happy';
                
                // Broadcast to all connected clients
                wss.clients.forEach(function(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'response',
                            requestId: requestId,
                            data: { text: text, mood: mood, suggestedActivity: 'talking' }
                        }));
                    }
                });
                
                console.log('✅ Response sent:', text.substring(0, 50));
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    } else if (req.url === '/poll' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: lastMessage }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, function() {
    console.log('✨ Bridge running');
    console.log('');
    console.log('To send a response:');
    console.log('curl -X POST http://localhost:' + PORT + '/respond \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"requestId":"REQUEST_ID","text":"Your message"}\'');
    console.log('');
});

// Export for programmatic use
module.exports = {
    sendResponse: function(requestId, text, mood) {
        mood = mood || 'happy';
        wss.clients.forEach(function(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'response',
                    requestId: requestId,
                    data: { text: text, mood: mood, suggestedActivity: 'talking' }
                }));
            }
        });
        console.log('✅ Sent:', text);
    },
    getLastMessage: function() { return lastMessage; }
};
