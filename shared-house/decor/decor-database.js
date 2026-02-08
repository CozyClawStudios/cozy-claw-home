/**
 * Simple Decor Database
 * Furniture and room customization
 */

const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

class DecorDatabase {
    constructor(database) {
        this.db = database;
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        // Create tables
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS decor_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                icon TEXT NOT NULL,
                width INTEGER DEFAULT 1,
                height INTEGER DEFAULT 1,
                layer INTEGER DEFAULT 1,
                unlocked BOOLEAN DEFAULT 1,
                unlock_requirement TEXT
            )
        `);
        
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS decor_placements (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                rotation INTEGER DEFAULT 0,
                theme_id TEXT DEFAULT 'default',
                placed_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS decor_themes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                wall_color TEXT,
                floor_color TEXT,
                accent_color TEXT,
                unlocked BOOLEAN DEFAULT 1
            )
        `);
        
        // Seed initial items
        await this.seedItems();
        await this.seedThemes();
        
        this.initialized = true;
        console.log('🎨 Decor database initialized');
    }
    
    async seedItems() {
        const items = [
            // Seating
            { id: 'sofa-classic', name: 'Classic Sofa', category: 'seating', icon: '🛋️', width: 3, height: 1 },
            { id: 'sofa-modern', name: 'Modern Sofa', category: 'seating', icon: '🛋️', width: 3, height: 1 },
            { id: 'armchair', name: 'Armchair', category: 'seating', icon: '🪑', width: 1, height: 1 },
            { id: 'beanbag', name: 'Bean Bag', category: 'seating', icon: '🟤', width: 1, height: 1 },
            
            // Tables
            { id: 'desk-wood', name: 'Wooden Desk', category: 'tables', icon: '📝', width: 2, height: 1 },
            { id: 'coffee-table', name: 'Coffee Table', category: 'tables', icon: '🪵', width: 2, height: 1 },
            
            // Storage
            { id: 'bookshelf', name: 'Bookshelf', category: 'storage', icon: '📚', width: 1, height: 2 },
            { id: 'cabinet', name: 'Cabinet', category: 'storage', icon: '🗄️', width: 2, height: 1 },
            
            // Decor
            { id: 'plant-1', name: 'Potted Plant', category: 'decor', icon: '🪴', width: 1, height: 1 },
            { id: 'plant-2', name: 'Monstera', category: 'decor', icon: '🌿', width: 1, height: 1 },
            { id: 'rug', name: 'Rug', category: 'decor', icon: '🟦', width: 3, height: 2 },
            { id: 'lamp', name: 'Floor Lamp', category: 'decor', icon: '🛋️', width: 1, height: 1 },
            
            // Views
            { id: 'window-city', name: 'City View', category: 'views', icon: '🏙️', width: 2, height: 2 },
            { id: 'window-forest', name: 'Forest View', category: 'views', icon: '🌲', width: 2, height: 2 },
            { id: 'window-beach', name: 'Beach View', category: 'views', icon: '🏖️', width: 2, height: 2 }
        ];
        
        for (const item of items) {
            await this.db.run(
                `INSERT OR IGNORE INTO decor_items (id, name, category, icon, width, height) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [item.id, item.name, item.category, item.icon, item.width, item.height]
            );
        }
    }
    
    async seedThemes() {
        const themes = [
            { id: 'cozy', name: 'Cozy', wall_color: '#3a3a55', floor_color: '#3d3d5c', accent_color: '#ff9a9e' },
            { id: 'modern', name: 'Modern', wall_color: '#2a2a3a', floor_color: '#3a3a4a', accent_color: '#4ecdc4' },
            { id: 'nature', name: 'Nature', wall_color: '#2d3d2d', floor_color: '#3d4d3d', accent_color: '#4ade80' }
        ];
        
        for (const theme of themes) {
            await this.db.run(
                `INSERT OR IGNORE INTO decor_themes (id, name, wall_color, floor_color, accent_color) 
                 VALUES (?, ?, ?, ?, ?)`,
                [theme.id, theme.name, theme.wall_color, theme.floor_color, theme.accent_color]
            );
        }
    }
    
    async getCatalog(category) {
        let sql = 'SELECT * FROM decor_items WHERE unlocked = 1';
        const params = [];
        
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        
        return await this.db.all(sql, params);
    }
    
    async getPlacements(themeId = 'default') {
        return await this.db.all(
            `SELECT p.*, i.name, i.icon, i.width, i.height, i.category
             FROM decor_placements p
             JOIN decor_items i ON p.item_id = i.id
             WHERE p.theme_id = ?`,
            [themeId]
        );
    }
    
    async placeItem(itemId, x, y, options = {}) {
        const id = uuidv4();
        const { rotation = 0, themeId = 'default' } = options;
        
        await this.db.run(
            `INSERT INTO decor_placements (id, item_id, x, y, rotation, theme_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, itemId, x, y, rotation, themeId]
        );
        
        return { id, itemId, x, y, rotation };
    }
    
    async moveItem(placementId, x, y, rotation) {
        await this.db.run(
            `UPDATE decor_placements SET x = ?, y = ?, rotation = ? WHERE id = ?`,
            [x, y, rotation, placementId]
        );
        return { id: placementId, x, y, rotation };
    }
    
    async removeItem(placementId) {
        await this.db.run(`DELETE FROM decor_placements WHERE id = ?`, [placementId]);
    }
    
    async clearTheme(themeId) {
        await this.db.run(`DELETE FROM decor_placements WHERE theme_id = ?`, [themeId]);
    }
    
    async getThemes() {
        return await this.db.all('SELECT * FROM decor_themes WHERE unlocked = 1');
    }
}

module.exports = DecorDatabase;
