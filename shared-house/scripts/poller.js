#!/usr/bin/env node
/**
 * Companion House Poller
 * Checks inbox.jsonl for new messages and alerts via OpenClaw webhook
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const INBOX_PATH = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/inbox.jsonl';
const STATE_PATH = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/.poller-state.json';
const GATEWAY_PORT = 18789;

// Read last check time from state file
function getLastCheckTime() {
    try {
        if (fs.existsSync(STATE_PATH)) {
            const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
            return state.lastCheck || 0;
        }
    } catch (err) {
        console.error('Failed to read state:', err.message);
    }
    return 0;
}

// Save last check time to state file
function saveLastCheckTime(timestamp) {
    try {
        fs.writeFileSync(STATE_PATH, JSON.stringify({ lastCheck: timestamp }, null, 2));
    } catch (err) {
        console.error('Failed to save state:', err.message);
    }
}

// Send alert by writing to notification file AND alerting main session
function sendAlert(newMessages) {
    if (newMessages.length === 0) return;
    
    const messageList = newMessages.map(m => 
        `- "${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''}" (session: ${m.sessionId})`
    ).join('\n');
    
    const alertText = `🚨 **Companion House: ${newMessages.length} new message(s)**\n\n${messageList}\n\nReply by writing to outbox.jsonl with format: {"sessionId":"...","text":"...","mood":"happy"}`;
    
    // Write to alert file
    const alertPath = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/.clawbot-alert.txt';
    try {
        fs.writeFileSync(alertPath, alertText);
        console.log('✅ Alert written to:', alertPath);
    } catch (err) {
        console.error('❌ Failed to write alert:', err.message);
    }
    
    // ALSO send to main OpenClaw session via CLI
    const { exec } = require('child_process');
    const cmd = `openclaw sessions send --session-key "main" --message "${alertText.replace(/"/g, '\\"').substring(0, 500)}"`;
    
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
            console.error('❌ Failed to send to main session:', err.message);
        } else {
            console.log('✅ Alert sent to main OpenClaw session');
        }
    });
}

// Main polling function
function poll() {
    const now = Date.now();
    const lastCheck = getLastCheckTime();
    
    console.log(`Polling... Last check: ${new Date(lastCheck).toISOString()}`);
    
    if (!fs.existsSync(INBOX_PATH)) {
        console.log('No inbox file yet');
        saveLastCheckTime(now);
        return;
    }
    
    const content = fs.readFileSync(INBOX_PATH, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    
    const newMessages = [];
    let newestTimestamp = lastCheck;
    
    for (const line of lines) {
        try {
            const msg = JSON.parse(line);
            if (msg.timestamp) {
                const msgTime = new Date(msg.timestamp).getTime();
                if (msgTime > lastCheck) {
                    newMessages.push(msg);
                }
                if (msgTime > newestTimestamp) {
                    newestTimestamp = msgTime;
                }
            }
        } catch (err) {
            // Skip invalid lines
        }
    }
    
    if (newMessages.length > 0) {
        console.log(`Found ${newMessages.length} new message(s)`);
        sendAlert(newMessages);
    } else {
        console.log('No new messages');
    }
    
    saveLastCheckTime(newestTimestamp > now ? newestTimestamp : now);
}

// Run immediately
poll();
