#!/usr/bin/env node
/**
 * Alert Watcher - Monitors .clawbot-alert.txt and sends to Celest
 */

const fs = require('fs');
const path = require('path');

const ALERT_PATH = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/.clawbot-alert.txt';
const SEEN_PATH = '/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/.alert-seen.hash';

function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return require('crypto').createHash('md5').update(content).digest('hex');
    } catch (err) {
        return null;
    }
}

function getLastSeenHash() {
    try {
        return fs.readFileSync(SEEN_PATH, 'utf8').trim();
    } catch (err) {
        return null;
    }
}

function saveSeenHash(hash) {
    try {
        fs.writeFileSync(SEEN_PATH, hash);
    } catch (err) {
        console.error('Failed to save hash:', err.message);
    }
}

function checkAlert() {
    if (!fs.existsSync(ALERT_PATH)) return;
    
    const currentHash = getFileHash(ALERT_PATH);
    const lastHash = getLastSeenHash();
    
    if (currentHash && currentHash !== lastHash) {
        const content = fs.readFileSync(ALERT_PATH, 'utf8');
        if (content.includes('new message')) {
            // Print to stdout for main agent to see
            console.log('\n' + '='.repeat(60));
            console.log(content);
            console.log('='.repeat(60) + '\n');
            saveSeenHash(currentHash);
        }
    }
}

console.log('👁️ Alert watcher started...');
setInterval(checkAlert, 2000); // Check every 2 seconds
