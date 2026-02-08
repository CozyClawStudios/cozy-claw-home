/**
 * Import Memories Script
 * Imports agent memories from JSON backup
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'memory', 'agent_memory.db');
const INPUT_FILE = process.argv[2];

if (!INPUT_FILE) {
    console.error('❌ Usage: node import-memories.js <backup-file.json>');
    process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ File not found:', INPUT_FILE);
    process.exit(1);
}

async function importMemories() {
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
        
        console.log('📥 Importing from:', INPUT_FILE);
        console.log('📅 Exported at:', data.exported_at);
        console.log('');
        
        // Import memories
        if (data.memories && data.memories.length > 0) {
            console.log(`🧠 Importing ${data.memories.length} memories...`);
            
            for (const mem of data.memories) {
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT OR IGNORE INTO memories 
                         (id, type, content, importance, confidence, context, source, created_at, last_accessed, access_count) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            mem.id,
                            mem.type,
                            mem.content,
                            mem.importance,
                            mem.confidence,
                            mem.context,
                            mem.source,
                            mem.created_at,
                            mem.last_accessed,
                            mem.access_count
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
        }
        
        // Import conversations
        if (data.conversations && data.conversations.length > 0) {
            console.log(`💬 Importing ${data.conversations.length} conversations...`);
            
            for (const conv of data.conversations) {
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT OR IGNORE INTO conversations 
                         (id, role, content, context, sentiment, timestamp) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            conv.id,
                            conv.role,
                            conv.content,
                            conv.context,
                            conv.sentiment,
                            conv.timestamp
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
        }
        
        // Import user profile
        if (data.user_profile) {
            console.log('👤 Importing user profile...');
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE user_profile SET 
                     name = ?, timezone = ?, wake_time = ?, sleep_time = ? 
                     WHERE id = 1`,
                    [
                        data.user_profile.name,
                        data.user_profile.timezone,
                        data.user_profile.wake_time,
                        data.user_profile.sleep_time
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        
        console.log('');
        console.log('✅ Import complete!');
        
    } catch (err) {
        console.error('❌ Import failed:', err);
        process.exit(1);
    } finally {
        db.close();
    }
}

importMemories();
