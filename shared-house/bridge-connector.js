#!/usr/bin/env node
/**
 * Celest Bridge Connector
 * Connects main agent (Celest) to the ClawBot Bridge
 * Polls the message queue and forwards to OpenClaw session
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3000';
const SESSION_FILE = path.join(__dirname, '.clawbot-session');

console.log('🔌 Celest Bridge Connector');
console.log(`📡 Connecting to: ${BRIDGE_URL}`);

// Connect to bridge
const socket = io(BRIDGE_URL, {
    transports: ['websocket', 'polling']
});

// Track session
let sessionId = null;

socket.on('connect', () => {
    console.log('✅ Connected to bridge');
    console.log(`🔑 Socket ID: ${socket.id}`);
    
    // Register as main agent
    socket.emit('agent:register', {
        name: 'Celest',
        version: '1.0.0',
        capabilities: ['chat', 'tools', 'initiative']
    });
});

socket.on('agent:registered', (data) => {
    console.log('🤖 Registered as main agent');
    console.log(`📊 Pending messages: ${data.queuedMessages}`);
    
    // Save session info
    fs.writeFileSync(SESSION_FILE, JSON.stringify({
        sessionId: socket.id,
        registeredAt: new Date().toISOString()
    }));
});

// Receive user messages from bridge
socket.on('clawbot:message', async (message) => {
    console.log('💬 Received message:', message.content);
    console.log(`🆔 Session: ${message.sessionId}`);
    
    // Forward to OpenClaw via sessions_send or system mechanism
    // For now, write to a file that the main agent can read
    const forwardPath = path.join(__dirname, '.clawbot', 'in', `${message.id}.txt`);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(forwardPath), { recursive: true });
    
    // Write message for main agent to pick up
    fs.writeFileSync(forwardPath, JSON.stringify({
        type: 'from_bridge',
        message: message.content,
        sessionId: message.sessionId,
        messageId: message.id,
        timestamp: message.timestamp
    }, null, 2));
    
    console.log(`📤 Forwarded to: ${forwardPath}`);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from bridge');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});

// Keep alive
console.log('⏳ Waiting for messages...');
console.log('Press Ctrl+C to exit');

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    socket.disconnect();
    process.exit(0);
});
