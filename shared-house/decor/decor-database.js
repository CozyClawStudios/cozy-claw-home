/**
 * Decor System - Database operations for room decoration
 */

class DecorDatabase {
    constructor(database) {
        this.db = database;
    }
    
    async init() {
        await this.createSchema();
        await this.seedCatalog();
        console.log('🎨 Decor database initialized');
    }
    
    async createSchema() {
        const schema = `
            -- Available decor items (catalog)
            CREATE TABLE IF NOT EXISTS decor_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL, -- 'seating', 'tables', 'storage', 'decor', 'lighting', 'views'
                subcategory TEXT, -- 'sofa', 'desk', 'plant', 'lamp', etc.
                style TEXT DEFAULT 'default', -- 'modern', 'rustic', 'cozy', 'futuristic'
                width INTEGER DEFAULT 1, -- grid units
                height INTEGER DEFAULT 1,
                layer INTEGER DEFAULT 1, -- 0=floor, 1=furniture, 2=decor, 3=wall
                icon TEXT, -- emoji or icon name
                color TEXT, -- hex color
                unlock_type TEXT DEFAULT 'immediate', -- 'immediate', 'interaction', 'secret'
                unlock_requirement INTEGER DEFAULT 0, -- interactions needed if unlock_type='interaction'
                max_quantity INTEGER DEFAULT 10,
                metadata TEXT -- JSON with extra data
            );
            
            -- User's placed items
            CREATE TABLE IF NOT EXISTS decor_placements (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                theme_id TEXT DEFAULT 'default',
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                rotation INTEGER DEFAULT 0, -- 0, 90, 180, 270
                scale REAL DEFAULT 1.0,
                flipped BOOLEAN DEFAULT 0,
                placed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES decor_items(id)
            );
            
            -- Room themes
            CREATE TABLE IF NOT EXISTS decor_themes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                wall_color TEXT DEFAULT '#3a3a55',
                floor_color TEXT DEFAULT '#3d3d5c',
                accent_color TEXT DEFAULT '#ff9a9e',
                unlocked BOOLEAN DEFAULT 1,
                unlock_requirement INTEGER DEFAULT 0
            );
            
            -- Unlock progress tracking
            CREATE TABLE IF NOT EXISTS unlock_progress (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                unlocked_at TEXT,
                UNIQUE(item_id)
            );
            
            -- User decor stats
            CREATE TABLE IF NOT EXISTS decor_stats (
                total_interactions INTEGER DEFAULT 0,
                total_placements INTEGER DEFAULT 0,
                current_theme TEXT DEFAULT 'cozy',
                last_updated TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_decor_items_category ON decor_items(category);
            CREATE INDEX IF NOT EXISTS idx_decor_items_style ON decor_items(style);
            CREATE INDEX IF NOT EXISTS idx_decor_placements_theme ON decor_placements(theme_id);
        `;
        
        const statements = schema.split(';').filter(s => s.trim());
        for (const stmt of statements) {
            await this.db.run(stmt);
        }
    }
    
    async seedCatalog() {
        // Check if already seeded
        const count = await this.db.get('SELECT COUNT(*) as count FROM decor_items');
        if (count.count > 0) return;
        
        const items = [
            // Seating
            { id: 'sofa_classic', name: 'Classic Sofa', category: 'seating', subcategory: 'sofa', style: 'cozy', width: 3, height: 1, layer: 1, icon: '🛋️', color: '#5a5a7a' },
            { id: 'sofa_modern', name: 'Modern Sofa', category: 'seating', subcategory: 'sofa', style: 'modern', width: 3, height: 1, layer: 1, icon: '🛋️', color: '#4a4a6a' },
            { id: 'sofa_rustic', name: 'Rustic Sofa', category: 'seating', subcategory: 'sofa', style: 'rustic', width: 3, height: 1, layer: 1, icon: '🛋️', color: '#6a5a4a' },
            { id: 'armchair_blue', name: 'Blue Armchair', category: 'seating', subcategory: 'armchair', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🪑', color: '#4a6a8a' },
            { id: 'armchair_red', name: 'Red Armchair', category: 'seating', subcategory: 'armchair', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🪑', color: '#8a4a4a' },
            { id: 'bean_bag', name: 'Bean Bag', category: 'seating', subcategory: 'bean_bag', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🟤', color: '#8a6a4a' },
            
            // Tables
            { id: 'desk_wood', name: 'Wooden Desk', category: 'tables', subcategory: 'desk', style: 'rustic', width: 2, height: 1, layer: 1, icon: '🪵', color: '#6a5a4a' },
            { id: 'desk_modern', name: 'Modern Desk', category: 'tables', subcategory: 'desk', style: 'modern', width: 2, height: 1, layer: 1, icon: '⬜', color: '#5a5a6a' },
            { id: 'desk_white', name: 'White Desk', category: 'tables', subcategory: 'desk', style: 'modern', width: 2, height: 1, layer: 1, icon: '⬜', color: '#e0e0e0' },
            { id: 'coffee_table_wood', name: 'Coffee Table', category: 'tables', subcategory: 'coffee_table', style: 'cozy', width: 2, height: 1, layer: 1, icon: '🪵', color: '#6a5a4a' },
            { id: 'coffee_table_glass', name: 'Glass Coffee Table', category: 'tables', subcategory: 'coffee_table', style: 'modern', width: 2, height: 1, layer: 1, icon: '🔲', color: '#8a9aaa' },
            { id: 'dining_table', name: 'Dining Table', category: 'tables', subcategory: 'dining', style: 'cozy', width: 3, height: 2, layer: 1, icon: '🪵', color: '#5a4a3a' },
            
            // Storage
            { id: 'bookshelf_tall', name: 'Tall Bookshelf', category: 'storage', subcategory: 'bookshelf', style: 'cozy', width: 1, height: 2, layer: 1, icon: '📚', color: '#6a5a4a' },
            { id: 'bookshelf_wide', name: 'Wide Bookshelf', category: 'storage', subcategory: 'bookshelf', style: 'cozy', width: 2, height: 1, layer: 1, icon: '📚', color: '#6a5a4a' },
            { id: 'bookshelf_modern', name: 'Modern Bookshelf', category: 'storage', subcategory: 'bookshelf', style: 'modern', width: 2, height: 2, layer: 1, icon: '⬛', color: '#3a3a4a' },
            { id: 'cabinet', name: 'Storage Cabinet', category: 'storage', subcategory: 'cabinet', style: 'cozy', width: 2, height: 1, layer: 1, icon: '🗄️', color: '#5a4a3a' },
            
            // Plants
            { id: 'plant_succulent', name: 'Succulent', category: 'decor', subcategory: 'plant', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🌵', color: '#4ade80' },
            { id: 'plant_fern', name: 'Fern', category: 'decor', subcategory: 'plant', style: 'nature', width: 1, height: 1, layer: 2, icon: '🌿', color: '#22c55e' },
            { id: 'plant_monstera', name: 'Monstera', category: 'decor', subcategory: 'plant', style: 'nature', width: 1, height: 2, layer: 2, icon: '🌴', color: '#16a34a' },
            { id: 'plant_flower', name: 'Flower Pot', category: 'decor', subcategory: 'plant', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🌸', color: '#ff9a9e' },
            { id: 'plant_hanging', name: 'Hanging Plant', category: 'decor', subcategory: 'plant', style: 'cozy', width: 1, height: 1, layer: 3, icon: '🪴', color: '#4ade80' },
            
            // Rugs
            { id: 'rug_round', name: 'Round Rug', category: 'decor', subcategory: 'rug', style: 'cozy', width: 3, height: 2, layer: 0, icon: '⭕', color: '#ff9a9e' },
            { id: 'rug_rectangular', name: 'Rectangular Rug', category: 'decor', subcategory: 'rug', style: 'modern', width: 4, height: 2, layer: 0, icon: '⬜', color: '#e0e0e0' },
            { id: 'rug_pattern', name: 'Patterned Rug', category: 'decor', subcategory: 'rug', style: 'cozy', width: 3, height: 2, layer: 0, icon: '🔲', color: '#fad0c4' },
            
            // Wall Art
            { id: 'painting_landscape', name: 'Landscape Painting', category: 'decor', subcategory: 'wall_art', style: 'cozy', width: 2, height: 1, layer: 3, icon: '🖼️', color: '#4ade80' },
            { id: 'painting_abstract', name: 'Abstract Art', category: 'decor', subcategory: 'wall_art', style: 'modern', width: 1, height: 1, layer: 3, icon: '🎨', color: '#ff9a9e' },
            { id: 'poster_movie', name: 'Movie Poster', category: 'decor', subcategory: 'wall_art', style: 'cozy', width: 1, height: 2, layer: 3, icon: '🎬', color: '#4a4a6a' },
            { id: 'mirror', name: 'Wall Mirror', category: 'decor', subcategory: 'wall_art', style: 'modern', width: 1, height: 2, layer: 3, icon: '🪞', color: '#8a9aaa' },
            
            // Lighting
            { id: 'lamp_floor', name: 'Floor Lamp', category: 'lighting', subcategory: 'lamp', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🛋️', color: '#ffecd2' },
            { id: 'lamp_desk', name: 'Desk Lamp', category: 'lighting', subcategory: 'lamp', style: 'modern', width: 1, height: 1, layer: 2, icon: '💡', color: '#fff3cd' },
            { id: 'lamp_string', name: 'String Lights', category: 'lighting', subcategory: 'lamp', style: 'cozy', width: 3, height: 1, layer: 3, icon: '✨', color: '#ffd700' },
            { id: 'candle', name: 'Candles', category: 'lighting', subcategory: 'candle', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🕯️', color: '#ffaa44' },
            
            // Window Views (special items)
            { id: 'window_city', name: 'City View', category: 'views', subcategory: 'window', style: 'modern', width: 3, height: 2, layer: 3, icon: '🌃', color: '#1a1a3e' },
            { id: 'window_forest', name: 'Forest View', category: 'views', subcategory: 'window', style: 'nature', width: 3, height: 2, layer: 3, icon: '🌲', color: '#1a3e1a' },
            { id: 'window_beach', name: 'Beach View', category: 'views', subcategory: 'window', style: 'nature', width: 3, height: 2, layer: 3, icon: '🏖️', color: '#3e3e1a' },
            { id: 'window_space', name: 'Space View', category: 'views', subcategory: 'window', style: 'futuristic', width: 3, height: 2, layer: 3, icon: '🌌', color: '#0d0d1a', unlock_type: 'secret' },
            { id: 'window_mountain', name: 'Mountain View', category: 'views', subcategory: 'window', style: 'nature', width: 3, height: 2, layer: 3, icon: '🏔️', color: '#2d2d4a' },
            
            // Secret items
            { id: 'egg_alien', name: 'Alien Figurine', category: 'decor', subcategory: 'figurine', style: 'futuristic', width: 1, height: 1, layer: 2, icon: '👽', color: '#4ade80', unlock_type: 'secret' },
            { id: 'egg_ufo', name: 'Mini UFO', category: 'decor', subcategory: 'figurine', style: 'futuristic', width: 1, height: 1, layer: 2, icon: '🛸', color: '#8a8aaa', unlock_type: 'secret' },
        ];
        
        const themes = [
            { id: 'cozy', name: 'Cozy Cottage', description: 'Warm and inviting', wall_color: '#3a3a55', floor_color: '#3d3d5c', accent_color: '#ff9a9e' },
            { id: 'modern', name: 'Modern Minimal', description: 'Clean and sleek', wall_color: '#2a2a3a', floor_color: '#3a3a4a', accent_color: '#4ecdc4' },
            { id: 'nature', name: 'Nature Retreat', description: 'Bring the outdoors in', wall_color: '#2d3d2d', floor_color: '#3d4d3d', accent_color: '#4ade80' },
            { id: 'futuristic', name: 'Cyber Future', description: 'High tech living', wall_color: '#0d0d1a', floor_color: '#1a1a2e', accent_color: '#00ffff', unlock_type: 'interaction', unlock_requirement: 50 }
        ];
        
        // Insert items
        for (const item of items) {
            await this.db.run(
                `INSERT OR IGNORE INTO decor_items 
                 (id, name, category, subcategory, style, width, height, layer, icon, color, unlock_type, unlock_requirement)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [item.id, item.name, item.category, item.subcategory, item.style, item.width, item.height, item.layer, item.icon, item.color, item.unlock_type || 'immediate', item.unlock_requirement || 0]
            );
        }
        
        // Insert themes
        for (const theme of themes) {
            await this.db.run(
                `INSERT OR IGNORE INTO decor_themes 
                 (id, name, description, wall_color, floor_color, accent_color, unlock_requirement)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [theme.id, theme.name, theme.description, theme.wall_color, theme.floor_color, theme.accent_color, theme.unlock_requirement || 0]
            );
        }
        
        console.log(`✅ Seeded ${items.length} decor items and ${themes.length} themes`);
    }
    
    // Get catalog of available items
    async getCatalog(category = null, style = null) {
        let sql = 'SELECT * FROM decor_items';
        const params = [];
        
        const conditions = [];
        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }
        if (style) {
            conditions.push('style = ?');
            params.push(style);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' ORDER BY category, name';
        
        return await this.db.all(sql, params);
    }
    
    // Get user's placed items
    async getPlacements(themeId = 'default') {
        return await this.db.all(
            `SELECT p.*, i.name, i.category, i.subcategory, i.icon, i.color, i.width, i.height, i.layer
             FROM decor_placements p
             JOIN decor_items i ON p.item_id = i.id
             WHERE p.theme_id = ?
             ORDER BY p.y, p.x`,
            [themeId]
        );
    }
    
    // Place an item
    async placeItem(itemId, x, y, options = {}) {
        const { rotation = 0, scale = 1.0, flipped = false, themeId = 'default' } = options;
        
        // Check if item exists
        const item = await this.db.get('SELECT * FROM decor_items WHERE id = ?', [itemId]);
        if (!item) {
            throw new Error('Item not found');
        }
        
        const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await this.db.run(
            `INSERT INTO decor_placements (id, item_id, theme_id, x, y, rotation, scale, flipped)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, itemId, themeId, x, y, rotation, scale, flipped ? 1 : 0]
        );
        
        // Update stats
        await this.db.run(
            'UPDATE decor_stats SET total_placements = total_placements + 1, last_updated = CURRENT_TIMESTAMP'
        );
        
        return { id, itemId, x, y };
    }
    
    // Move an item
    async moveItem(placementId, x, y, rotation = null) {
        let sql = 'UPDATE decor_placements SET x = ?, y = ?';
        const params = [x, y];
        
        if (rotation !== null) {
            sql += ', rotation = ?';
            params.push(rotation);
        }
        
        sql += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(placementId);
        
        const result = await this.db.run(sql, params);
        
        if (result.changes === 0) {
            throw new Error('Placement not found');
        }
        
        return { id: placementId, x, y };
    }
    
    // Remove an item
    async removeItem(placementId) {
        const result = await this.db.run(
            'DELETE FROM decor_placements WHERE id = ?',
            [placementId]
        );
        
        if (result.changes === 0) {
            throw new Error('Placement not found');
        }
        
        return { success: true };
    }
    
    // Clear all placements for a theme
    async clearTheme(themeId) {
        await this.db.run(
            'DELETE FROM decor_placements WHERE theme_id = ?',
            [themeId]
        );
        return { success: true };
    }
    
    // Get themes
    async getThemes() {
        return await this.db.all(
            `SELECT t.*, 
                    CASE WHEN t.unlock_requirement = 0 THEN 1
                         WHEN s.total_interactions >= t.unlock_requirement THEN 1
                         ELSE 0 END as unlocked
             FROM decor_themes t
             LEFT JOIN decor_stats s ON 1=1`
        );
    }
    
    // Get current theme
    async getCurrentTheme() {
        const stats = await this.db.get('SELECT current_theme FROM decor_stats');
        const themeId = stats?.current_theme || 'cozy';
        return await this.db.get('SELECT * FROM decor_themes WHERE id = ?', [themeId]);
    }
    
    // Set theme
    async setTheme(themeId) {
        await this.db.run(
            'UPDATE decor_stats SET current_theme = ?',
            [themeId]
        );
        return { success: true };
    }
    
    // Record interaction (for unlocks)
    async recordInteraction() {
        await this.db.run(
            'UPDATE decor_stats SET total_interactions = total_interactions + 1, last_updated = CURRENT_TIMESTAMP'
        );
        
        // Check for unlocks
        const stats = await this.db.get('SELECT total_interactions FROM decor_stats');
        
        // Unlock items/themes based on progress
        await this.db.run(
            `UPDATE decor_themes SET unlocked = 1 
             WHERE unlock_requirement > 0 
             AND unlock_requirement <= ?`,
            [stats.total_interactions]
        );
        
        return { totalInteractions: stats.total_interactions };
    }
    
    // Get unlock progress
    async getUnlockProgress() {
        const stats = await this.db.get('SELECT * FROM decor_stats');
        const lockedItems = await this.db.all(
            'SELECT * FROM decor_items WHERE unlock_type != "immediate"'
        );
        
        return {
            totalInteractions: stats?.total_interactions || 0,
            lockedItems: lockedItems.map(item => ({
                ...item,
                progress: Math.min(100, ((stats?.total_interactions || 0) / item.unlock_requirement) * 100)
            }))
        };
    }
    
    // Get stats
    async getStats() {
        const stats = await this.db.get('SELECT * FROM decor_stats');
        const placementCount = await this.db.get('SELECT COUNT(*) as count FROM decor_placements');
        
        return {
            ...stats,
            totalPlaced: placementCount.count
        };
    }
}

module.exports = DecorDatabase;
