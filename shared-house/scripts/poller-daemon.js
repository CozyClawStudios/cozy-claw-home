#!/usr/bin/env node
/**
 * Companion House Poller Daemon
 * Runs continuously, polls every 5 seconds
 */

const { spawn } = require('child_process');
const path = require('path');

const POLL_INTERVAL = 5000; // 5 seconds
const SCRIPT_PATH = path.join(__dirname, 'poller.js');

console.log('🔄 Companion House Poller Daemon starting...');
console.log(`📡 Polling every ${POLL_INTERVAL/1000}s`);
console.log('Press Ctrl+C to stop\n');

function runPoll() {
    const child = spawn('node', [SCRIPT_PATH], {
        stdio: 'inherit',
        detached: false
    });
    
    child.on('error', (err) => {
        console.error('Poller error:', err.message);
    });
}

// Run immediately
runPoll();

// Then every 5 seconds
setInterval(runPoll, POLL_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Poller daemon stopping...');
    process.exit(0);
});
