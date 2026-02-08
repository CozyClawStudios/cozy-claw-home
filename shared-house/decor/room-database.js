/**
 * Cozy Claw Home - Room Database
 * Handles persistent storage of room states
 */

const RoomDatabase = (function() {
    'use strict';

    // Storage keys
    const STORAGE_KEY = 'cozy_claw_home_rooms';
    const STORAGE_KEY_BACKUP = 'cozy_claw_home_rooms_backup';
    const STORAGE_KEY_COLOR_SCHEMES = 'cozy_claw_home_color_schemes';

    // In-memory cache
    let cache = null;
    let lastSave = 0;
    let saveInProgress = false;

    /**
     * Initialize database
     */
    function init() {
        // Load initial data
        loadAllRooms();
        console.log('🏠 Room Database initialized');
    }

    /**
     * Get storage object (localStorage or fallback)
     */
    function getStorage() {
        if (typeof localStorage !== 'undefined') {
            return localStorage;
        }
        // Fallback to memory-only storage
        return {
            _data: {},
            getItem: function(key) {
                return this._data[key] || null;
            },
            setItem: function(key, value) {
                this._data[key] = value;
            },
            removeItem: function(key) {
                delete this._data[key];
            }
        };
    }

    /**
     * Load all room states
     */
    function loadAllRooms() {
        if (cache !== null) {
            return cache;
        }

        try {
            const storage = getStorage();
            const data = storage.getItem(STORAGE_KEY);
            
            if (data) {
                cache = JSON.parse(data);
                console.log('💾 Loaded room states from storage');
                return cache;
            }
        } catch (e) {
            console.error('Error loading room states:', e);
            // Try backup
            try {
                const storage = getStorage();
                const backup = storage.getItem(STORAGE_KEY_BACKUP);
                if (backup) {
                    cache = JSON.parse(backup);
                    console.log('💾 Restored room states from backup');
                    return cache;
                }
            } catch (backupError) {
                console.error('Backup also failed:', backupError);
            }
        }

        // Return empty object if nothing found
        cache = {};
        return cache;
    }

    /**
     * Load specific room state
     */
    function loadRoom(roomId) {
        const rooms = loadAllRooms();
        return rooms[roomId] || null;
    }

    /**
     * Save all room states
     */
    function saveAllRooms(rooms) {
        if (saveInProgress) {
            // Queue save for later
            setTimeout(() => saveAllRooms(rooms), 100);
            return;
        }

        saveInProgress = true;
        
        try {
            const storage = getStorage();
            
            // Create backup of current data first
            const currentData = storage.getItem(STORAGE_KEY);
            if (currentData) {
                storage.setItem(STORAGE_KEY_BACKUP, currentData);
            }

            // Save new data
            const data = JSON.stringify(rooms);
            storage.setItem(STORAGE_KEY, data);
            
            // Update cache
            cache = { ...rooms };
            lastSave = Date.now();
            
            console.log('💾 Saved all room states');
        } catch (e) {
            console.error('Error saving room states:', e);
            
            // If quota exceeded, try cleaning up
            if (e.name === 'QuotaExceededError') {
                cleanupOldData();
                try {
                    const storage = getStorage();
                    storage.setItem(STORAGE_KEY, JSON.stringify(rooms));
                    cache = { ...rooms };
                    lastSave = Date.now();
                } catch (retryError) {
                    console.error('Still failed after cleanup:', retryError);
                }
            }
        } finally {
            saveInProgress = false;
        }
    }

    /**
     * Save specific room state
     */
    function saveRoom(roomId, roomState) {
        const rooms = loadAllRooms();
        rooms[roomId] = {
            ...roomState,
            lastSaved: Date.now()
        };
        saveAllRooms(rooms);
    }

    /**
     * Auto-save with debouncing
     */
    function autoSave(roomId, roomState) {
        // Update cache immediately
        if (cache === null) {
            cache = {};
        }
        cache[roomId] = roomState;

        // Debounced save to storage
        clearTimeout(autoSave._timeout);
        autoSave._timeout = setTimeout(() => {
            saveRoom(roomId, roomState);
        }, 500);
    }

    /**
     * Clean up old data if storage is full
     */
    function cleanupOldData() {
        try {
            const storage = getStorage();
            
            // Remove old chat history if present
            const keys = Object.keys(storage._data || {});
            keys.forEach(key => {
                if (key.includes('chat_history') || key.includes('temp_')) {
                    storage.removeItem(key);
                }
            });
            
            console.log('🧹 Cleaned up old data');
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    }

    /**
     * Save color scheme
     */
    function saveColorScheme(name, scheme) {
        try {
            const storage = getStorage();
            let schemes = {};
            
            const existing = storage.getItem(STORAGE_KEY_COLOR_SCHEMES);
            if (existing) {
                schemes = JSON.parse(existing);
            }
            
            schemes[name] = {
                ...scheme,
                createdAt: Date.now()
            };
            
            storage.setItem(STORAGE_KEY_COLOR_SCHEMES, JSON.stringify(schemes));
            console.log('🎨 Saved color scheme:', name);
            return true;
        } catch (e) {
            console.error('Error saving color scheme:', e);
            return false;
        }
    }

    /**
     * Load color schemes
     */
    function loadColorSchemes() {
        try {
            const storage = getStorage();
            const data = storage.getItem(STORAGE_KEY_COLOR_SCHEMES);
            
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Error loading color schemes:', e);
        }
        return {};
    }

    /**
     * Delete color scheme
     */
    function deleteColorScheme(name) {
        try {
            const storage = getStorage();
            const schemes = loadColorSchemes();
            
            if (schemes[name]) {
                delete schemes[name];
                storage.setItem(STORAGE_KEY_COLOR_SCHEMES, JSON.stringify(schemes));
                console.log('🗑️ Deleted color scheme:', name);
                return true;
            }
        } catch (e) {
            console.error('Error deleting color scheme:', e);
        }
        return false;
    }

    /**
     * Export all data for download
     */
    function exportData() {
        const data = {
            rooms: loadAllRooms(),
            colorSchemes: loadColorSchemes(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cozy-claw-home-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📤 Exported room data');
    }

    /**
     * Import data from file
     */
    function importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.rooms) {
                        saveAllRooms(data.rooms);
                    }
                    
                    if (data.colorSchemes) {
                        const storage = getStorage();
                        storage.setItem(STORAGE_KEY_COLOR_SCHEMES, JSON.stringify(data.colorSchemes));
                    }
                    
                    // Invalidate cache to force reload
                    cache = null;
                    
                    console.log('📥 Imported room data');
                    resolve(data);
                } catch (err) {
                    console.error('Import error:', err);
                    reject(err);
                }
            };
            
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Reset all data
     */
    function resetAll() {
        try {
            const storage = getStorage();
            storage.removeItem(STORAGE_KEY);
            storage.removeItem(STORAGE_KEY_BACKUP);
            storage.removeItem(STORAGE_KEY_COLOR_SCHEMES);
            cache = null;
            
            console.log('🗑️ Reset all room data');
            return true;
        } catch (e) {
            console.error('Error resetting data:', e);
            return false;
        }
    }

    /**
     * Get storage stats
     */
    function getStats() {
        const rooms = loadAllRooms();
        const schemes = loadColorSchemes();
        
        let totalFurniture = 0;
        Object.values(rooms).forEach(room => {
            if (room.furniture) {
                totalFurniture += room.furniture.length;
            }
        });
        
        return {
            rooms: Object.keys(rooms).length,
            totalFurniture,
            colorSchemes: Object.keys(schemes).length,
            lastSave: lastSave,
            roomDetails: Object.keys(rooms).map(id => ({
                id,
                furniture: rooms[id]?.furniture?.length || 0,
                lastModified: rooms[id]?.lastModified || 0
            }))
        };
    }

    // Initialize on load
    if (typeof window !== 'undefined') {
        window.addEventListener('load', init);
    }

    // Public API
    return {
        init,
        loadAllRooms,
        loadRoom,
        saveAllRooms,
        saveRoom,
        autoSave,
        saveColorScheme,
        loadColorSchemes,
        deleteColorScheme,
        exportData,
        importData,
        resetAll,
        getStats
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomDatabase;
}