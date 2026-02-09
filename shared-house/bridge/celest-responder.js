#!/usr/bin/env node
/**
 * Celest Response Bridge
 * Reads messages from inbox.jsonl and allows Celest to respond
 * 
 * Usage: node celest-responder.js
 * Or use as module: require('./celest-responder')
 */

const fs = require('fs');
const path = require('path');

class CelestResponder {
    constructor(basePath = __dirname) {
        this.inboxPath = path.join(basePath, '..', 'inbox.jsonl');
        this.outboxPath = path.join(basePath, '..', 'outbox.jsonl');
        this.processedIds = new Set();
    }
    
    readInbox() {
        try {
            if (!fs.existsSync(this.inboxPath)) {
                return [];
            }
            
            const content = fs.readFileSync(this.inboxPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const messages = [];
            for (const line of lines) {
                try {
                    const msg = JSON.parse(line);
                    if (!this.processedIds.has(msg.id)) {
                        messages.push(msg);
                        this.processedIds.add(msg.id);
                    }
                } catch (e) {
                    // Skip invalid lines
                }
            }
            
            return messages;
        } catch (err) {
            console.error('Error reading inbox:', err.message);
            return [];
        }
    }
    
    sendResponse(sessionId, text, mood = 'content') {
        const response = {
            sessionId,
            text,
            mood,
            timestamp: new Date().toISOString()
        };
        
        try {
            fs.appendFileSync(this.outboxPath, JSON.stringify(response) + '\n');
            console.log('✅ Response sent:', text.substring(0, 50));
            return true;
        } catch (err) {
            console.error('Error sending response:', err.message);
            return false;
        }
    }
    
    clearInbox() {
        try {
            fs.writeFileSync(this.inboxPath, '');
            this.processedIds.clear();
            console.log('🗑️  Inbox cleared');
        } catch (err) {
            console.error('Error clearing inbox:', err.message);
        }
    }
}

// If run directly, show pending messages
if (require.main === module) {
    const responder = new CelestResponder();
    const messages = responder.readInbox();
    
    if (messages.length === 0) {
        console.log('📭 No new messages in inbox');
    } else {
        console.log(`📬 ${messages.length} new message(s):\n`);
        messages.forEach((msg, i) => {
            console.log(`${i + 1}. Session: ${msg.sessionId}`);
            console.log(`   Content: "${msg.content}"`);
            console.log(`   Time: ${msg.timestamp}\n`);
        });
        
        console.log('To respond, use:');
        console.log(`  responder.sendResponse('sessionId', 'Your response here')`);
    }
}

module.exports = CelestResponder;
