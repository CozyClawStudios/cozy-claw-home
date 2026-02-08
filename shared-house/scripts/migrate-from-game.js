/**
 * Migration Script: Game Version to Companion Platform
 * Migrates data from the old game database to the new companion format
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const OLD_DB_PATH = process.argv[2] || path.join(__dirname, '..', 'database', 'game.db');
const NEW_DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'memory', 'agent_memory.db');

async function migrate() {
    if (!fs.existsSync(OLD_DB_PATH)) {
        console.log('⚠️  Old game database not found:', OLD_DB_PATH);
        console.log('Nothing to migrate.');
        return;
    }
    
    console.log('🔄 Starting migration from game to companion platform...');
    console.log('From:', OLD_DB_PATH);
    console.log('To:', NEW_DB_PATH);
    console.log('');
    
    const oldDb = new sqlite3.Database(OLD_DB_PATH);
    const newDb = new sqlite3.Database(NEW_DB_PATH);
    
    try {
        // Check if old database has the expected tables
        const tables = await new Promise((resolve, reject) => {
            oldDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.name));
            });
        });
        
        if (!tables.includes('players')) {
            console.log('⚠️  Old database does not appear to be a game database');
            return;
        }
        
        // Migrate user profile
        console.log('👤 Migrating user profile...');
        const player = await new Promise((resolve, reject) => {
            oldDb.get('SELECT * FROM players LIMIT 1', (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (player) {
            await new Promise((resolve, reject) => {
                newDb.run(
                    'UPDATE user_profile SET name = ? WHERE id = 1',
                    [player.username || 'Friend'],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log('   ✓ Username:', player.username);
        }
        
        // Migrate chat messages as memories
        if (tables.includes('chat_messages')) {
            console.log('💬 Migrating chat history...');
            const messages = await new Promise((resolve, reject) => {
                oldDb.all('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 100', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            for (const msg of messages) {
                await new Promise((resolve, reject) => {
                    newDb.run(
                        `INSERT OR IGNORE INTO conversations (id, role, content, timestamp) 
                         VALUES (?, ?, ?, ?)`,
                        [
                            require('uuid').v4(),
                            'user', // Simplified - old schema didn't track sender role
                            msg.message,
                            msg.created_at
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
            console.log(`   ✓ Migrated ${messages.length} messages`);
        }
        
        // Migrate room decorations
        if (tables.includes('houses')) {
            console.log('🏠 Migrating room decorations...');
            const house = await new Promise((resolve, reject) => {
                oldDb.get('SELECT * FROM houses LIMIT 1', (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (house && house.wallpaper) {
                await new Promise((resolve, reject) => {
                    newDb.run(
                        `INSERT OR REPLACE INTO room_decor (id, item_type, item_key) VALUES (1, ?, ?)`,
                        ['wallpaper', house.wallpaper],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                console.log('   ✓ Wallpaper:', house.wallpaper);
            }
        }
        
        // Migrate furniture
        if (tables.includes('furniture_items')) {
            const furniture = await new Promise((resolve, reject) => {
                oldDb.all('SELECT * FROM furniture_items', (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            for (const item of furniture) {
                await new Promise((resolve, reject) => {
                    newDb.run(
                        `INSERT INTO room_decor (item_type, item_key, x, y) 
                         VALUES (?, ?, ?, ?)`,
                        ['furniture', item.type, item.x, item.y],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
            console.log(`   ✓ Migrated ${furniture.length} furniture items`);
        }
        
        console.log('');
        console.log('✅ Migration complete!');
        console.log('');
        console.log('Note:');
        console.log('- Game-specific data (coins, levels, etc.) was not migrated');
        console.log('- Chat history preserved as conversation records');
        console.log('- Room decorations preserved');
        
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        oldDb.close();
        newDb.close();
    }
}

migrate();
