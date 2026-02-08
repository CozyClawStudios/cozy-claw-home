/**
 * Export Memories Script
 * Exports all agent memories to JSON for backup/migration
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'memory', 'agent_memory.db');
const OUTPUT_FILE = process.argv[2] || `memories_export_${new Date().toISOString().split('T')[0]}.json`;

async function exportMemories() {
    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Database not found:', DB_PATH);
        process.exit(1);
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        const memories = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM memories ORDER BY created_at DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const conversations = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 1000', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const agentState = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM agent_state WHERE id = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        const userProfile = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM user_profile WHERE id = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        const exportData = {
            exported_at: new Date().toISOString(),
            version: '3.0.0',
            stats: {
                total_memories: memories.length,
                total_conversations: conversations.length
            },
            agent_state: agentState,
            user_profile: userProfile,
            memories,
            conversations
        };
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2));
        
        console.log('✅ Export complete!');
        console.log(`📁 File: ${OUTPUT_FILE}`);
        console.log(`🧠 Memories: ${memories.length}`);
        console.log(`💬 Conversations: ${conversations.length}`);
        
    } catch (err) {
        console.error('❌ Export failed:', err);
        process.exit(1);
    } finally {
        db.close();
    }
}

exportMemories();
