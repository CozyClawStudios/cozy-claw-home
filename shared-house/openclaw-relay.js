#!/usr/bin/env node
/**
 * OpenClaw Relay for Cozy Claw Home
 * Receives messages from cozy-claw-home and forwards to active OpenClaw sessions
 * 
 * This creates a simple HTTP endpoint that the cozy-claw-home server can call
 * to send messages to Celest (or any active OpenClaw session)
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 18081;
const SESSION_KEY = process.env.OPENCLAW_SESSION_KEY || 'agent:main:main';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Queue for responses that need to go back to cozy-claw-home
const responseQueue = [];

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Endpoint: POST /message - Forward message to OpenClaw session
    if (req.url === '/message' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { message, requestId, userName = 'User' } = JSON.parse(body);
                
                console.log('📨 Message from Cozy Claw Home:');
                console.log('   User:', userName);
                console.log('   Message:', message);
                console.log('   Request ID:', requestId);
                console.log('');
                
                // Store in a file that the agent can poll
                const inboxPath = path.join(__dirname, 'inbox.jsonl');
                const entry = JSON.stringify({
                    type: 'message',
                    requestId,
                    message,
                    userName,
                    timestamp: Date.now()
                }) + '\n';
                
                fs.appendFileSync(inboxPath, entry);
                
                // Try to send via gateway if available
                if (GATEWAY_TOKEN) {
                    const payload = JSON.stringify({
                        text: `[From Cozy Claw Home] ${userName}: ${message}\n\nRespond by writing to outbox.jsonl with requestId: ${requestId}`
                    });
                    
                    const options = {
                        hostname: 'localhost',
                        port: 18789,
                        path: '/v1/sessions/agent:main:main/message',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${GATEWAY_TOKEN}`
                        }
                    };
                    
                    const proxyReq = http.request(options, (proxyRes) => {
                        console.log('📤 Forwarded to OpenClaw session');
                    });
                    
                    proxyReq.on('error', (err) => {
                        console.log('⚠️ Could not forward to gateway (expected if no gateway):', err.message);
                    });
                    
                    proxyReq.write(payload);
                    proxyReq.end();
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Message queued for agent',
                    requestId
                }));
                
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    }
    
    // Endpoint: GET /poll - Check for responses from agent
    else if (req.url === '/poll' && req.method === 'GET') {
        const outboxPath = path.join(__dirname, 'outbox.jsonl');
        
        try {
            if (fs.existsSync(outboxPath)) {
                const content = fs.readFileSync(outboxPath, 'utf8');
                const lines = content.trim().split('\n').filter(Boolean);
                
                // Get last response
                const lastLine = lines[lines.length - 1];
                if (lastLine) {
                    const response = JSON.parse(lastLine);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ response }));
                    return;
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response: null }));
            
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
    }
    
    // Endpoint: POST /respond - Agent sends response back
    else if (req.url === '/respond' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { requestId, text, mood = 'happy' } = JSON.parse(body);
                
                // Store in outbox for cozy-claw-home to pick up
                const outboxPath = path.join(__dirname, 'outbox.jsonl');
                const entry = JSON.stringify({
                    type: 'response',
                    requestId,
                    text,
                    mood,
                    timestamp: Date.now()
                }) + '\n';
                
                fs.appendFileSync(outboxPath, entry);
                
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
                
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    }
    
    // Health check
    else if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy',
            sessionKey: SESSION_KEY,
            inbox: fs.existsSync(path.join(__dirname, 'inbox.jsonl')),
            outbox: fs.existsSync(path.join(__dirname, 'outbox.jsonl'))
        }));
    }
    
    else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log('🏠 OpenClaw Relay for Cozy Claw Home');
    console.log('📡 http://localhost:' + PORT);
    console.log('');
    console.log('Endpoints:');
    console.log('  POST /message - Send message from game to agent');
    console.log('  GET  /poll     - Check for agent responses');
    console.log('  POST /respond  - Agent sends response back');
    console.log('');
    console.log('Session Key:', SESSION_KEY);
    console.log('');
    console.log('To respond to a message:');
    console.log('  curl -X POST http://localhost:' + PORT + '/respond \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"requestId":"...","text":"Your response"}\'');
    console.log('');
});

// Initialize inbox/outbox files
const inboxPath = path.join(__dirname, 'inbox.jsonl');
const outboxPath = path.join(__dirname, 'outbox.jsonl');
if (!fs.existsSync(inboxPath)) fs.writeFileSync(inboxPath, '');
if (!fs.existsSync(outboxPath)) fs.writeFileSync(outboxPath, '');

console.log('✨ Relay started');
