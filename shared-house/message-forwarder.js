#!/usr/bin/env node
/**
 * Celest Message Forwarder
 * Bridges Companion House file-based messaging with OpenClaw sessions
 * 
 * Flow: inbox.jsonl → OpenClaw session → outbox.jsonl
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const BASE_DIR = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house';
const INBOX_PATH = path.join(BASE_DIR, 'inbox.jsonl');
const OUTBOX_PATH = path.join(BASE_DIR, 'outbox.jsonl');
const SEEN_PATH = path.join(BASE_DIR, '.seen-messages');

// Track processed message IDs
let seenMessages = new Set();
let lastInboxSize = 0;

// Load seen messages
function loadSeen() {
    try {
        if (fs.existsSync(SEEN_PATH)) {
            const data = fs.readFileSync(SEEN_PATH, 'utf8');
            seenMessages = new Set(data.split('\n').filter(Boolean));
        }
    } catch (err) {
        console.log('Note: No seen messages file yet');
    }
}

// Save seen messages
function saveSeen() {
    try {
        fs.writeFileSync(SEEN_PATH, Array.from(seenMessages).join('\n'));
    } catch (err) {
        console.error('Failed to save seen messages:', err.message);
    }
}

// Forward message to OpenClaw via sessions_send
function forwardToCelest(message) {
    return new Promise((resolve) => {
        const sessionKey = 'main'; // Use main session
        const text = `[From Companion House] ${message.content}`;
        
        // Use openclaw CLI to send message to session
        const cmd = `openclaw sessions send --session-key "${sessionKey}" --message "${text.replace(/"/g, '\\"')}"`;
        
        exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
            if (err) {
                console.error('Forward error:', err.message);
                resolve(false);
            } else {
                console.log('📤 Forwarded to Celest:', message.content.substring(0, 40));
                resolve(true);
            }
        });
    });
}

// Poll inbox for new messages
async function pollInbox() {
    try {
        if (!fs.existsSync(INBOX_PATH)) {
            return;
        }
        
        const stats = fs.statSync(INBOX_PATH);
        if (stats.size === lastInboxSize) {
            return; // No changes
        }
        lastInboxSize = stats.size;
        
        const content = fs.readFileSync(INBOX_PATH, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        
        for (const line of lines) {
            try {
                const msg = JSON.parse(line);
                
                if (!msg.id || seenMessages.has(msg.id)) {
                    continue;
                }
                
                console.log('📨 New message from', msg.sessionId, ':', msg.content);
                
                // Forward to Celest
                await forwardToCelest(msg);
                
                // Mark as seen
                seenMessages.add(msg.id);
                saveSeen();
                
            } catch (err) {
                console.error('Failed to parse message:', err.message);
            }
        }
        
    } catch (err) {
        console.error('Poll error:', err.message);
    }
}

// Write response from Celest to outbox
function writeResponse(sessionId, text, mood = 'happy') {
    try {
        const response = {
            sessionId,
            text,
            mood,
            timestamp: new Date().toISOString()
        };
        
        fs.appendFileSync(OUTBOX_PATH, JSON.stringify(response) + '\n');
        console.log('📥 Wrote response for', sessionId, ':', text.substring(0, 40));
        return true;
    } catch (err) {
        console.error('Failed to write response:', err.message);
        return false;
    }
}

// Interactive mode - read responses from stdin
function startInteractiveMode() {
    console.log('💬 Interactive mode: Type responses as:');
    console.log('  sessionId|Your response here');
    console.log('  Example: web:abc123|Hello Zak!');
    console.log('');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'forwarder> '
    });
    
    rl.prompt();
    
    rl.on('line', (line) => {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const sessionId = parts[0].trim();
            const text = parts.slice(1).join('|').trim();
            writeResponse(sessionId, text);
        } else if (line.trim() === 'quit' || line.trim() === 'exit') {
            rl.close();
            return;
        } else {
            console.log('Usage: sessionId|Your message');
        }
        rl.prompt();
    });
    
    rl.on('close', () => {
        console.log('\n👋 Forwarder shutting down...');
        process.exit(0);
    });
}

// Main
console.log('🔄 Celest Message Forwarder');
console.log('📁 Watching:', INBOX_PATH);
console.log('📤 Writing to:', OUTBOX_PATH);
console.log('');

loadSeen();

// Start polling inbox
setInterval(pollInbox, 500); // Check every 500ms

// Also check immediately
pollInbox();

console.log('⏳ Polling for messages...');

// If run with --interactive flag, start interactive mode
if (process.argv.includes('--interactive')) {
    startInteractiveMode();
} else {
    console.log('Run with --interactive to type responses manually');
    console.log('Press Ctrl+C to exit');
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Forwarder stopped');
    saveSeen();
    process.exit(0);
});
