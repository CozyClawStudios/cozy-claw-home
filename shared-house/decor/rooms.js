/**
 * Cozy Claw Home - Room Management System
 * Handles multiple rooms, navigation, and room state
 */

const RoomManager = (function() {
    'use strict';

    // Room definitions with cozy, warm aesthetics
    const ROOM_DEFINITIONS = {
        living: {
            id: 'living',
            name: 'Living Room',
            icon: '🛋️',
            description: 'A cozy space to relax and unwind',
            width: 800,
            height: 600,
            defaultWallColor: '#F5E6D3', // Warm cream
            defaultFloorColor: '#D4A574', // Warm wood
            defaultFloorTexture: 'wood',
            defaultWindowView: 'forest',
            lighting: 'cozy',
            startEmpty: true,
            availableFurniture: ['sofa', 'loveseat', 'armchair', 'tv', 'tv_stand', 'bookshelf', 
                'coffee_table', 'side_table', 'floor_lamp', 'table_lamp', 'rug', 'plant', 
                'hanging_plant', 'painting', 'clock', 'speaker', 'game_console'],
            features: ['window', 'doorway_kitchen', 'doorway_bedroom']
        },
        kitchen: {
            id: 'kitchen',
            name: 'Kitchen',
            icon: '🍳',
            description: 'The heart of the home',
            width: 800,
            height: 600,
            defaultWallColor: '#FFF8E7', // Buttermilk
            defaultFloorColor: '#E8D5C4', // Light tile
            defaultFloorTexture: 'tile',
            defaultWindowView: 'garden',
            lighting: 'bright',
            startEmpty: true,
            availableFurniture: ['fridge', 'stove', 'microwave', 'sink', 'kitchen_counter', 
                'kitchen_island', 'bar_stool', 'dining_table', 'dining_chair', 'hanging_pot',
                'spice_rack', 'fruit_bowl', 'coffee_maker', 'toaster', 'blender', 'dish_rack',
                'trash_can', 'plant', 'herb_garden', 'wine_rack'],
            features: ['window', 'doorway_living', 'doorway_outdoor']
        },
        bedroom: {
            id: 'bedroom',
            name: 'Bedroom',
            icon: '🛏️',
            description: 'A peaceful retreat',
            width: 800,
            height: 600,
            defaultWallColor: '#E8E0F0', // Soft lavender
            defaultFloorColor: '#C4B5A0', // Oak wood
            defaultFloorTexture: 'wood',
            defaultWindowView: 'night_sky',
            lighting: 'soft',
            startEmpty: true,
            availableFurniture: ['bed_single', 'bed_double', 'bed_bunk', 'nightstand', 'dresser',
                'wardrobe', 'desk', 'desk_chair', 'vanity', 'mirror', 'floor_lamp', 'table_lamp',
                'alarm_clock', 'rug', 'plant', 'hanging_plant', 'bookshelf', 'laundry_basket',
                'stuffed_animal', 'photo_frame'],
            features: ['window', 'doorway_living', 'doorway_bathroom']
        },
        bathroom: {
            id: 'bathroom',
            name: 'Bathroom',
            icon: '🛁',
            description: 'Refresh and rejuvenate',
            width: 600,
            height: 500,
            defaultWallColor: '#E0F4F8', // Soft aqua
            defaultFloorColor: '#B8D4E3', // Light blue tile
            defaultFloorTexture: 'tile',
            defaultWindowView: 'sky',
            lighting: 'bright',
            startEmpty: true,
            availableFurniture: ['bathtub', 'shower', 'sink_vanity', 'toilet', 'towel_rack',
                'towel_basket', 'bath_mat', 'mirror', 'shelf', 'plant', 'candle', 'soap_dispenser',
                'toothbrush_holder', 'trash_can', 'scale', 'laundry_hamper'],
            features: ['window_frosted', 'doorway_bedroom']
        },
        outdoor: {
            id: 'outdoor',
            name: 'Garden Patio',
            icon: '🌿',
            description: 'Nature and fresh air',
            width: 900,
            height: 650,
            defaultWallColor: '#87CEEB', // Sky blue (background)
            defaultFloorColor: '#90EE90', // Light green grass
            defaultFloorTexture: 'grass',
            defaultWindowView: 'sunset',
            lighting: 'natural',
            startEmpty: true,
            availableFurniture: ['garden_bench', 'patio_table', 'patio_chair', 'hammock', 'grill',
                'fire_pit', 'flower_pot', 'flower_bed', 'shrub', 'tree', 'garden_lantern',
                'string_lights', 'bird_feeder', 'watering_can', 'garden_gnome', 'fence_section',
                'outdoor_rug', 'cooler', 'patio_umbrella'],
            features: ['fence', 'gate', 'doorway_kitchen']
        }
    };

    // Window view definitions with mood effects
    const WINDOW_VIEWS = {
        city: {
            name: 'City Skyline',
            icon: '🏙️',
            mood: 'energetic',
            lighting: 0.9,
            colorTint: '#FFE4B5',
            description: 'Twinkling city lights'
        },
        forest: {
            name: 'Forest',
            icon: '🌲',
            mood: 'peaceful',
            lighting: 0.8,
            colorTint: '#D4EDDA',
            description: 'Tall trees and birdsong'
        },
        beach: {
            name: 'Beach',
            icon: '🏖️',
            mood: 'relaxed',
            lighting: 1.0,
            colorTint: '#FFF8DC',
            description: 'Waves and sunshine'
        },
        space: {
            name: 'Space',
            icon: '🌌',
            mood: 'dreamy',
            lighting: 0.6,
            colorTint: '#E6E6FA',
            description: 'Stars and galaxies'
        },
        mountains: {
            name: 'Mountains',
            icon: '🏔️',
            mood: 'inspiring',
            lighting: 0.85,
            colorTint: '#F0F8FF',
            description: 'Snow-capped peaks'
        },
        night_sky: {
            name: 'Night Sky',
            icon: '🌃',
            mood: 'cozy',
            lighting: 0.5,
            colorTint: '#191970',
            description: 'Moon and stars'
        },
        sunset: {
            name: 'Sunset',
            icon: '🌅',
            mood: 'romantic',
            lighting: 0.75,
            colorTint: '#FFB6C1',
            description: 'Golden hour glow'
        },
        garden: {
            name: 'Garden',
            icon: '🌻',
            mood: 'cheerful',
            lighting: 0.95,
            colorTint: '#F0FFF0',
            description: 'Blooming flowers'
        },
        sky: {
            name: 'Blue Sky',
            icon: '☁️',
            mood: 'fresh',
            lighting: 1.0,
            colorTint: '#E0F6FF',
            description: 'Clouds drifting by'
        }
    };

    // Floor textures
    const FLOOR_TEXTURES = {
        wood: {
            name: 'Hardwood',
            icon: '🪵',
            pattern: 'planks',
            colors: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D4A574']
        },
        carpet: {
            name: 'Carpet',
            icon: '🧶',
            pattern: 'soft',
            colors: ['#D2B48C', '#C19A6B', '#8B7355', '#A0522D', '#BC8F8F']
        },
        tile: {
            name: 'Tile',
            icon: '⬜',
            pattern: 'grid',
            colors: ['#F5F5F5', '#E8E8E8', '#D3D3D3', '#C0C0C0', '#B8D4E3']
        },
        grass: {
            name: 'Grass',
            icon: '🌱',
            pattern: 'natural',
            colors: ['#228B22', '#32CD32', '#90EE90', '#7CFC00', '#98FB98']
        }
    };

    // Current state
    let currentRoomId = 'living';
    let roomStates = {};
    let listeners = [];

    /**
     * Initialize room states
     */
    function init() {
        // Load from database if available
        if (typeof RoomDatabase !== 'undefined') {
            roomStates = RoomDatabase.loadAllRooms() || {};
        }

        // Initialize each room with defaults if not loaded
        Object.keys(ROOM_DEFINITIONS).forEach(roomId => {
            if (!roomStates[roomId]) {
                roomStates[roomId] = createDefaultRoomState(roomId);
            }
        });

        currentRoomId = 'living';
        notifyListeners('init', { roomId: currentRoomId, state: roomStates[currentRoomId] });
    }

    /**
     * Create default state for a room
     */
    function createDefaultRoomState(roomId) {
        const def = ROOM_DEFINITIONS[roomId];
        return {
            id: roomId,
            wallColor: def.defaultWallColor,
            floorColor: def.defaultFloorColor,
            floorTexture: def.defaultFloorTexture,
            windowView: def.defaultWindowView,
            lighting: def.lighting,
            furniture: def.startEmpty ? [] : [], // Start empty per requirements
            decorations: [],
            lastModified: Date.now(),
            visitCount: 0,
            firstVisit: true
        };
    }

    /**
     * Get current room definition
     */
    function getCurrentRoom() {
        return ROOM_DEFINITIONS[currentRoomId];
    }

    /**
     * Get current room state
     */
    function getCurrentRoomState() {
        return roomStates[currentRoomId];
    }

    /**
     * Switch to a different room
     */
    function switchRoom(roomId) {
        if (!ROOM_DEFINITIONS[roomId]) {
            console.error(`Room ${roomId} does not exist`);
            return false;
        }

        // Save current room state
        saveCurrentRoom();

        // Switch rooms
        const previousRoom = currentRoomId;
        currentRoomId = roomId;

        // Update visit tracking
        roomStates[roomId].visitCount++;
        roomStates[roomId].lastVisited = Date.now();

        const isFirstVisit = roomStates[roomId].firstVisit;
        roomStates[roomId].firstVisit = false;

        // Notify listeners
        notifyListeners('roomChange', {
            from: previousRoom,
            to: roomId,
            state: roomStates[roomId],
            isFirstVisit: isFirstVisit
        });

        // Save to database
        if (typeof RoomDatabase !== 'undefined') {
            RoomDatabase.saveRoom(roomId, roomStates[roomId]);
        }

        return true;
    }

    /**
     * Save current room state
     */
    function saveCurrentRoom() {
        roomStates[currentRoomId].lastModified = Date.now();
        if (typeof RoomDatabase !== 'undefined') {
            RoomDatabase.saveRoom(currentRoomId, roomStates[currentRoomId]);
        }
    }

    /**
     * Update room customization
     */
    function updateRoomCustomization(updates) {
        const state = roomStates[currentRoomId];
        
        if (updates.wallColor !== undefined) state.wallColor = updates.wallColor;
        if (updates.floorColor !== undefined) state.floorColor = updates.floorColor;
        if (updates.floorTexture !== undefined) state.floorTexture = updates.floorTexture;
        if (updates.windowView !== undefined) state.windowView = updates.windowView;
        if (updates.lighting !== undefined) state.lighting = updates.lighting;

        state.lastModified = Date.now();

        notifyListeners('customization', {
            roomId: currentRoomId,
            updates: updates,
            state: state
        });

        saveCurrentRoom();
        return state;
    }

    /**
     * Add furniture to current room
     */
    function addFurniture(furnitureItem) {
        const state = roomStates[currentRoomId];
        furnitureItem.placedAt = Date.now();
        furnitureItem.id = 'furn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        state.furniture.push(furnitureItem);
        
        notifyListeners('furnitureAdded', {
            roomId: currentRoomId,
            furniture: furnitureItem
        });

        saveCurrentRoom();
        return furnitureItem;
    }

    /**
     * Remove furniture from current room
     */
    function removeFurniture(furnitureId) {
        const state = roomStates[currentRoomId];
        const index = state.furniture.findIndex(f => f.id === furnitureId);
        
        if (index !== -1) {
            const removed = state.furniture.splice(index, 1)[0];
            notifyListeners('furnitureRemoved', {
                roomId: currentRoomId,
                furniture: removed
            });
            saveCurrentRoom();
            return removed;
        }
        return null;
    }

    /**
     * Move furniture within current room
     */
    function moveFurniture(furnitureId, x, y) {
        const state = roomStates[currentRoomId];
        const furniture = state.furniture.find(f => f.id === furnitureId);
        
        if (furniture) {
            furniture.x = x;
            furniture.y = y;
            furniture.lastMoved = Date.now();
            
            notifyListeners('furnitureMoved', {
                roomId: currentRoomId,
                furniture: furniture
            });
            
            saveCurrentRoom();
            return furniture;
        }
        return null;
    }

    /**
     * Get window view config
     */
    function getWindowView(viewId) {
        return WINDOW_VIEWS[viewId] || WINDOW_VIEWS.forest;
    }

    /**
     * Get current window view
     */
    function getCurrentWindowView() {
        const state = roomStates[currentRoomId];
        return WINDOW_VIEWS[state.windowView] || WINDOW_VIEWS.forest;
    }

    /**
     * Get floor texture config
     */
    function getFloorTexture(textureId) {
        return FLOOR_TEXTURES[textureId] || FLOOR_TEXTURES.wood;
    }

    /**
     * Get available rooms
     */
    function getAvailableRooms() {
        return Object.values(ROOM_DEFINITIONS).map(def => ({
            id: def.id,
            name: def.name,
            icon: def.icon,
            description: def.description,
            isCurrent: def.id === currentRoomId,
            visitCount: roomStates[def.id]?.visitCount || 0,
            hasFurniture: (roomStates[def.id]?.furniture?.length || 0) > 0
        }));
    }

    /**
     * Get room-specific furniture catalog
     */
    function getRoomFurnitureCatalog(roomId = currentRoomId) {
        const def = ROOM_DEFINITIONS[roomId];
        if (!def) return [];
        
        return def.availableFurniture.map(type => ({
            type: type,
            ...FurnitureCatalog.getItem(type)
        }));
    }

    /**
     * Check if room is valid
     */
    function isValidRoom(roomId) {
        return !!ROOM_DEFINITIONS[roomId];
    }

    /**
     * Add event listener
     */
    function addListener(callback) {
        listeners.push(callback);
    }

    /**
     * Remove event listener
     */
    function removeListener(callback) {
        listeners = listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners
     */
    function notifyListeners(event, data) {
        listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (e) {
                console.error('Error in room listener:', e);
            }
        });
    }

    /**
     * Reset room to default (empty)
     */
    function resetRoom(roomId = currentRoomId) {
        roomStates[roomId] = createDefaultRoomState(roomId);
        
        notifyListeners('roomReset', {
            roomId: roomId,
            state: roomStates[roomId]
        });

        saveCurrentRoom();
        return roomStates[roomId];
    }

    /**
     * Export all room data
     */
    function exportData() {
        return {
            currentRoomId,
            roomStates,
            exportedAt: Date.now()
        };
    }

    /**
     * Import room data
     */
    function importData(data) {
        if (data.roomStates) {
            roomStates = { ...roomStates, ...data.roomStates };
        }
        if (data.currentRoomId && ROOM_DEFINITIONS[data.currentRoomId]) {
            switchRoom(data.currentRoomId);
        }
        notifyListeners('import', { data });
    }

    // Public API
    return {
        init,
        getCurrentRoom,
        getCurrentRoomState,
        switchRoom,
        saveCurrentRoom,
        updateRoomCustomization,
        addFurniture,
        removeFurniture,
        moveFurniture,
        getWindowView,
        getCurrentWindowView,
        getFloorTexture,
        getAvailableRooms,
        getRoomFurnitureCatalog,
        isValidRoom,
        addListener,
        removeListener,
        resetRoom,
        exportData,
        importData,
        ROOM_DEFINITIONS,
        WINDOW_VIEWS,
        FLOOR_TEXTURES
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomManager;
}