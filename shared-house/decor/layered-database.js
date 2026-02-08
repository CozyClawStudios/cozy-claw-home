/**
 * Layered Room Database Schema
 * Stores room configuration in layers for proper rendering and management
 * 
 * Layer Architecture (bottom to top):
 * 0 = FLOOR    - Wood, carpet, tile, grass
 * 1 = WALL     - Paint colors, wallpapers  
 * 2 = WINDOW   - Views (city, forest, beach, etc.)
 * 3 = FURNITURE - Tables, chairs, beds, etc.
 * 4 = DECOR    - Plants, pictures, lamps, etc.
 * 5 = CHARACTER - Celest, user avatar
 */

class LayeredRoomDatabase {
    constructor(database) {
        this.db = database;
    }

    async init() {
        await this.createSchema();
        await this.seedLayerDefaults();
        console.log('🏠 Layered room database initialized');
    }

    async createSchema() {
        const schema = `
            -- Room layer configuration (one row per room)
            CREATE TABLE IF NOT EXISTS room_layers (
                room_id TEXT PRIMARY KEY DEFAULT 'main',
                
                -- Floor Layer (0)
                floor_type TEXT DEFAULT 'wood',
                floor_color TEXT DEFAULT '#3d3d5c',
                floor_texture TEXT DEFAULT 'smooth',
                
                -- Wall Layer (1)  
                wall_type TEXT DEFAULT 'paint',
                wall_color TEXT DEFAULT '#3a3a55',
                wall_pattern TEXT DEFAULT 'solid',
                
                -- Window Layer (2)
                window_view TEXT DEFAULT 'city',
                window_time TEXT DEFAULT 'day',
                window_frame TEXT DEFAULT 'classic',
                
                -- Metadata
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- Layered items (furniture and decor on specific layers)
            CREATE TABLE IF NOT EXISTS room_items (
                id TEXT PRIMARY KEY,
                room_id TEXT DEFAULT 'main',
                item_type TEXT NOT NULL, -- 'furniture', 'decor', 'lighting'
                item_key TEXT NOT NULL,  -- reference to catalog
                
                -- Position
                x REAL NOT NULL,
                y REAL NOT NULL,
                z_index INTEGER DEFAULT 0,
                rotation INTEGER DEFAULT 0,
                scale REAL DEFAULT 1.0,
                
                -- Layer assignment
                layer INTEGER DEFAULT 3, -- 3=furniture, 4=decor
                
                -- State
                visible BOOLEAN DEFAULT 1,
                locked BOOLEAN DEFAULT 0,
                
                -- Metadata
                placed_by TEXT DEFAULT 'user',
                placed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (room_id) REFERENCES room_layers(room_id)
            );

            -- Layer visibility toggles (per user preference)
            CREATE TABLE IF NOT EXISTS layer_visibility (
                room_id TEXT,
                layer INTEGER,
                visible BOOLEAN DEFAULT 1,
                opacity REAL DEFAULT 1.0,
                PRIMARY KEY (room_id, layer)
            );

            -- Room snapshots for undo/redo
            CREATE TABLE IF NOT EXISTS room_snapshots (
                id TEXT PRIMARY KEY,
                room_id TEXT,
                snapshot_data TEXT, -- JSON
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_room_items_layer ON room_items(layer);
            CREATE INDEX IF NOT EXISTS idx_room_items_room ON room_items(room_id);
            CREATE INDEX IF NOT EXISTS idx_room_items_type ON room_items(item_type);
        `;

        const statements = schema.split(';').filter(s => s.trim());
        for (const stmt of statements) {
            await this.db.run(stmt);
        }
    }

    async seedLayerDefaults() {
        // Check if main room exists
        const existing = await this.db.get(
            'SELECT room_id FROM room_layers WHERE room_id = ?',
            ['main']
        );
        
        if (!existing) {
            await this.db.run(
                `INSERT INTO room_layers (room_id, floor_type, floor_color, wall_type, wall_color, window_view)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['main', 'wood', '#3d3d5c', 'paint', '#3a3a55', 'city']
            );
            console.log('✅ Seeded default room layers');
        }

        // Initialize layer visibility
        for (let layer = 0; layer <= 5; layer++) {
            await this.db.run(
                `INSERT OR IGNORE INTO layer_visibility (room_id, layer, visible, opacity)
                 VALUES (?, ?, ?, ?)`,
                ['main', layer, 1, 1.0]
            );
        }
    }

    // ==================== LAYER GETTERS ====================

    async getAllLayers(roomId = 'main') {
        const layers = await this.db.get(
            'SELECT * FROM room_layers WHERE room_id = ?',
            [roomId]
        );
        
        if (!layers) {
            // Create default room if not exists
            await this.seedLayerDefaults();
            return this.getAllLayers(roomId);
        }

        const visibility = await this.db.all(
            'SELECT layer, visible, opacity FROM layer_visibility WHERE room_id = ?',
            [roomId]
        );

        return {
            ...layers,
            layerVisibility: visibility.reduce((acc, v) => {
                acc[v.layer] = { visible: !!v.visible, opacity: v.opacity };
                return acc;
            }, {})
        };
    }

    async getLayer(roomId, layerType) {
        const layers = await this.getAllLayers(roomId);
        
        switch(layerType) {
            case 'floor':
                return {
                    type: layers.floor_type,
                    color: layers.floor_color,
                    texture: layers.floor_texture
                };
            case 'wall':
                return {
                    type: layers.wall_type,
                    color: layers.wall_color,
                    pattern: layers.wall_pattern
                };
            case 'window':
                return {
                    view: layers.window_view,
                    time: layers.window_time,
                    frame: layers.window_frame
                };
            default:
                throw new Error(`Unknown layer type: ${layerType}`);
        }
    }

    // ==================== LAYER UPDATES ====================

    async updateLayer(roomId, layerType, data) {
        const validFields = {
            floor: ['floor_type', 'floor_color', 'floor_texture'],
            wall: ['wall_type', 'wall_color', 'wall_pattern'],
            window: ['window_view', 'window_time', 'window_frame']
        };

        const fields = validFields[layerType];
        if (!fields) {
            throw new Error(`Invalid layer type: ${layerType}`);
        }

        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            const dbField = `${layerType}_${key}`;
            if (fields.includes(dbField)) {
                updates.push(`${dbField} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(roomId);

        await this.db.run(
            `UPDATE room_layers SET ${updates.join(', ')} WHERE room_id = ?`,
            values
        );

        return { success: true, layer: layerType, data };
    }

    async updateFloor(roomId, { type, color, texture }) {
        return this.updateLayer(roomId, 'floor', { type, color, texture });
    }

    async updateWall(roomId, { type, color, pattern }) {
        return this.updateLayer(roomId, 'wall', { type, color, pattern });
    }

    async updateWindow(roomId, { view, time, frame }) {
        return this.updateLayer(roomId, 'window', { view, time, frame });
    }

    // ==================== ITEM MANAGEMENT ====================

    async getItems(roomId = 'main', layer = null) {
        let sql = `
            SELECT i.*, d.name, d.icon, d.width, d.height, d.category
            FROM room_items i
            LEFT JOIN decor_items d ON i.item_key = d.id
            WHERE i.room_id = ? AND i.visible = 1
        `;
        const params = [roomId];

        if (layer !== null) {
            sql += ' AND i.layer = ?';
            params.push(layer);
        }

        sql += ' ORDER BY i.layer, i.z_index, i.y, i.x';

        return await this.db.all(sql, params);
    }

    async getItemsByLayer(roomId = 'main') {
        const items = await this.getItems(roomId);
        const byLayer = {
            0: [], // floor
            1: [], // wall
            2: [], // window
            3: [], // furniture
            4: [], // decor
            5: []  // character
        };

        for (const item of items) {
            const layer = item.layer || 3;
            if (byLayer[layer]) {
                byLayer[layer].push(item);
            }
        }

        return byLayer;
    }

    async placeItem(roomId, itemData) {
        const {
            itemType,
            itemKey,
            x,
            y,
            layer = 3,
            zIndex = 0,
            rotation = 0,
            scale = 1.0
        } = itemData;

        const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await this.db.run(
            `INSERT INTO room_items 
             (id, room_id, item_type, item_key, x, y, layer, z_index, rotation, scale)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, roomId, itemType, itemKey, x, y, layer, zIndex, rotation, scale]
        );

        return { id, ...itemData };
    }

    async moveItem(itemId, { x, y, rotation, layer, zIndex }) {
        const updates = [];
        const values = [];

        if (x !== undefined) { updates.push('x = ?'); values.push(x); }
        if (y !== undefined) { updates.push('y = ?'); values.push(y); }
        if (rotation !== undefined) { updates.push('rotation = ?'); values.push(rotation); }
        if (layer !== undefined) { updates.push('layer = ?'); values.push(layer); }
        if (zIndex !== undefined) { updates.push('z_index = ?'); values.push(zIndex); }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(itemId);

        const result = await this.db.run(
            `UPDATE room_items SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        if (result.changes === 0) {
            throw new Error('Item not found');
        }

        return { id: itemId, x, y, rotation, layer, zIndex };
    }

    async removeItem(itemId) {
        const result = await this.db.run(
            'DELETE FROM room_items WHERE id = ?',
            [itemId]
        );

        if (result.changes === 0) {
            throw new Error('Item not found');
        }

        return { success: true };
    }

    async updateItemLayer(itemId, newLayer) {
        return this.moveItem(itemId, { layer: newLayer });
    }

    // ==================== LAYER VISIBILITY ====================

    async setLayerVisibility(roomId, layer, visible, opacity = null) {
        const updates = ['visible = ?'];
        const values = [visible ? 1 : 0];

        if (opacity !== null) {
            updates.push('opacity = ?');
            values.push(opacity);
        }

        values.push(roomId, layer);

        await this.db.run(
            `INSERT OR REPLACE INTO layer_visibility (room_id, layer, visible, opacity)
             VALUES (?, ?, ?, COALESCE(?, (SELECT opacity FROM layer_visibility WHERE room_id = ? AND layer = ?), 1.0))`,
            [roomId, layer, visible ? 1 : 0, opacity, roomId, layer]
        );

        return { layer, visible, opacity };
    }

    // ==================== FULL ROOM STATE ====================

    async getFullRoomState(roomId = 'main') {
        const [layers, itemsByLayer] = await Promise.all([
            this.getAllLayers(roomId),
            this.getItemsByLayer(roomId)
        ]);

        return {
            roomId,
            layers: {
                floor: {
                    type: layers.floor_type,
                    color: layers.floor_color,
                    texture: layers.floor_texture
                },
                wall: {
                    type: layers.wall_type,
                    color: layers.wall_color,
                    pattern: layers.wall_pattern
                },
                window: {
                    view: layers.window_view,
                    time: layers.window_time,
                    frame: layers.window_frame
                }
            },
            layerVisibility: layers.layerVisibility,
            items: itemsByLayer
        };
    }

    // ==================== SNAPSHOTS (UNDO/REDO) ====================

    async createSnapshot(roomId) {
        const state = await this.getFullRoomState(roomId);
        const id = `snap_${Date.now()}`;

        await this.db.run(
            'INSERT INTO room_snapshots (id, room_id, snapshot_data) VALUES (?, ?, ?)',
            [id, roomId, JSON.stringify(state)]
        );

        // Clean up old snapshots (keep last 10)
        await this.db.run(
            `DELETE FROM room_snapshots 
             WHERE room_id = ? 
             AND id NOT IN (
                 SELECT id FROM room_snapshots 
                 WHERE room_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 10
             )`,
            [roomId, roomId]
        );

        return { id };
    }

    async restoreSnapshot(snapshotId) {
        const snapshot = await this.db.get(
            'SELECT * FROM room_snapshots WHERE id = ?',
            [snapshotId]
        );

        if (!snapshot) {
            throw new Error('Snapshot not found');
        }

        const data = JSON.parse(snapshot.snapshot_data);
        
        // Restore layers
        await this.updateLayer(snapshot.room_id, 'floor', data.layers.floor);
        await this.updateLayer(snapshot.room_id, 'wall', data.layers.wall);
        await this.updateLayer(snapshot.room_id, 'window', data.layers.window);

        // Note: Items are not restored to avoid conflicts
        // This is primarily for layer style undo/redo

        return { success: true, restored: data };
    }

    // ==================== MIGRATION FROM OLD SYSTEM ====================

    async migrateFromLegacy(decorDB) {
        console.log('🔄 Migrating from legacy decor system...');
        
        // Get all placements from old system
        const placements = await decorDB.getPlacements('default');
        
        for (const p of placements) {
            // Map old layer values to new system
            // Old: 0=floor, 1=furniture, 2=decor, 3=wall
            // New: 3=furniture, 4=decor
            let newLayer = 3;
            if (p.layer === 2) newLayer = 4; // decor
            if (p.layer === 0) continue; // skip floor items (now in layer config)
            if (p.layer === 3) newLayer = 4; // wall items become decor

            try {
                await this.placeItem('main', {
                    itemType: p.category,
                    itemKey: p.item_id,
                    x: p.x,
                    y: p.y,
                    layer: newLayer,
                    zIndex: p.y, // use y position as z-index for depth sorting
                    rotation: p.rotation || 0,
                    scale: p.scale || 1.0
                });
            } catch (err) {
                console.warn(`Failed to migrate item ${p.item_id}:`, err.message);
            }
        }

        console.log(`✅ Migrated ${placements.length} items to layered system`);
        return { migrated: placements.length };
    }
}

module.exports = LayeredRoomDatabase;
