/**
 * Room Renderer - Layered rendering system for rooms
 * 
 * Layer Architecture (bottom to top):
 * 0 = FLOOR    - Wood, carpet, tile, grass
 * 1 = WALL     - Paint colors, wallpapers  
 * 2 = WINDOW   - Views (city, forest, beach, etc.)
 * 3 = FURNITURE - Tables, chairs, beds, etc.
 * 4 = DECOR    - Plants, pictures, lamps, etc.
 * 5 = CHARACTER - Celest, user avatar
 */

class RoomRenderer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId) || document.querySelector('.room');
        this.options = {
            gridWidth: 20,
            gridHeight: 15,
            debug: false,
            ...options
        };
        
        this.layers = {};
        this.items = {};
        this.state = {
            roomId: 'main',
            layerVisibility: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
            editMode: false,
            activeLayer: null
        };

        this.layerNames = {
            0: 'floor',
            1: 'wall', 
            2: 'window',
            3: 'furniture',
            4: 'decor',
            5: 'character'
        };

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('RoomRenderer: No container found');
            return;
        }

        this.setupLayers();
        this.applyStyles();
        console.log('🏠 RoomRenderer initialized');
    }

    setupLayers() {
        // Create layer containers (bottom to top)
        const layerOrder = [0, 1, 2, 3, 4, 5];
        
        for (const layerIndex of layerOrder) {
            const layerName = this.layerNames[layerIndex];
            const layerEl = document.createElement('div');
            layerEl.className = `room-layer room-layer-${layerName}`;
            layerEl.dataset.layer = layerIndex;
            layerEl.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: ${layerIndex >= 3 ? 'auto' : 'none'};
                z-index: ${layerIndex + 1};
                transition: opacity 0.3s ease;
            `;

            this.container.appendChild(layerEl);
            this.layers[layerIndex] = layerEl;
        }

        // Create grid overlay for placement
        this.createGridOverlay();
    }

    createGridOverlay() {
        const grid = document.createElement('div');
        grid.className = 'room-grid-overlay';
        grid.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: grid;
            grid-template-columns: repeat(${this.options.gridWidth}, 1fr);
            grid-template-rows: repeat(${this.options.gridHeight}, 1fr);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 100;
        `;

        // Create grid cells
        for (let y = 0; y < this.options.gridHeight; y++) {
            for (let x = 0; x < this.options.gridWidth; x++) {
                const cell = document.createElement('div');
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.style.cssText = `
                    border: 1px dashed rgba(255,255,255,0.1);
                    pointer-events: auto;
                `;
                cell.addEventListener('click', (e) => this.onGridClick(x, y, e));
                cell.addEventListener('dragover', (e) => e.preventDefault());
                cell.addEventListener('drop', (e) => this.onGridDrop(e, x, y));
                grid.appendChild(cell);
            }
        }

        this.container.appendChild(grid);
        this.gridOverlay = grid;
    }

    applyStyles() {
        // Add base styles if not already present
        if (!document.getElementById('room-renderer-styles')) {
            const style = document.createElement('style');
            style.id = 'room-renderer-styles';
            style.textContent = `
                .room-layer-floor {
                    background: linear-gradient(180deg, transparent 70%, var(--floor-color, #3d3d5c) 70%);
                }
                
                .room-layer-wall {
                    background: var(--wall-color, #3a3a55);
                }
                
                .room-layer-window::before {
                    content: '';
                    position: absolute;
                    top: 15%;
                    left: 10%;
                    width: 120px;
                    height: 100px;
                    background: linear-gradient(180deg, var(--window-sky-top, #1a1a3e) 0%, var(--window-sky-bottom, #2d2d5e) 100%);
                    border-radius: 10px;
                    border: 8px solid #4a4a6a;
                    overflow: hidden;
                }
                
                .room-layer-window.view-city::before {
                    background: linear-gradient(180deg, #1a1a3e 0%, #2d2d5e 100%);
                }
                
                .room-layer-window.view-forest::before {
                    background: linear-gradient(180deg, #1a3e1a 0%, #2d5e2d 100%);
                }
                
                .room-layer-window.view-beach::before {
                    background: linear-gradient(180deg, #1a3e5e 0%, #2d5e8e 50%, #5e8e8e 100%);
                }
                
                .room-layer-window.view-space::before {
                    background: linear-gradient(180deg, #0a0a1a 0%, #1a1a3e 100%);
                }
                
                .room-item {
                    position: absolute;
                    transition: transform 0.2s, filter 0.2s;
                    cursor: grab;
                    user-select: none;
                }
                
                .room-item:hover {
                    filter: brightness(1.2) drop-shadow(0 0 10px rgba(255,154,158,0.5));
                    z-index: 1000 !important;
                }
                
                .room-item.dragging {
                    cursor: grabbing;
                    opacity: 0.8;
                    z-index: 1000 !important;
                }
                
                .room-item.selected {
                    outline: 2px solid #ff9a9e;
                    outline-offset: 4px;
                }
                
                .room-grid-overlay.active {
                    opacity: 1 !important;
                }
                
                .room-grid-overlay .grid-cell:hover {
                    background: rgba(255,154,158,0.2);
                }
                
                /* Floor types */
                .floor-wood { --floor-color: #3d3d5c; }
                .floor-carpet { --floor-color: #4a3a4a; }
                .floor-tile { --floor-color: #4a4a5a; }
                .floor-grass { --floor-color: #2d4a2d; }
                
                /* Wall types */
                .wall-paint-solid { --wall-color: #3a3a55; }
                .wall-paint-warm { --wall-color: #4a3a3a; }
                .wall-paint-cool { --wall-color: #3a4a4a; }
                .wall-pattern-striped { 
                    --wall-color: #3a3a55;
                    background-image: repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px);
                }
                .wall-pattern-dots {
                    --wall-color: #3a3a55;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.1) 2px, transparent 2px);
                    background-size: 20px 20px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==================== LAYER RENDERING ====================

    renderLayer(layerIndex, data) {
        const layerEl = this.layers[layerIndex];
        if (!layerEl) return;

        switch(layerIndex) {
            case 0: // Floor
                this.renderFloor(layerEl, data);
                break;
            case 1: // Wall
                this.renderWall(layerEl, data);
                break;
            case 2: // Window
                this.renderWindow(layerEl, data);
                break;
            case 3: // Furniture
            case 4: // Decor
                // Items are rendered separately
                break;
            case 5: // Character
                this.renderCharacter(layerEl, data);
                break;
        }
    }

    renderFloor(layerEl, { type = 'wood', color = '#3d3d5c', texture = 'smooth' }) {
        const gradients = {
            wood: 'linear-gradient(180deg, #4a4a5a 0%, #3d3d5c 100%)',
            carpet: `radial-gradient(ellipse at center, ${color}88 0%, ${color} 70%)`,
            tile: `repeating-linear-gradient(90deg, ${color}, ${color} 20px, ${this.adjustColor(color, 10)} 20px, ${this.adjustColor(color, 10)} 40px)`,
            grass: 'linear-gradient(180deg, #3d4a3d 0%, #2d3d2d 100%)'
        };

        layerEl.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30%;
            background: ${gradients[type] || gradients.wood};
            z-index: 1;
        `;

        // Apply custom color if not using preset
        if (color && !gradients[type]) {
            layerEl.style.background = color;
        }
    }

    renderWall(layerEl, { type = 'paint', color = '#3a3a55', pattern = 'solid' }) {
        const baseStyles = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: '30%',
            backgroundColor: color,
            zIndex: 1
        };

        // Apply pattern
        if (pattern === 'striped') {
            baseStyles.backgroundImage = `repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.05) 30px, rgba(255,255,255,0.05) 60px)`;
        } else if (pattern === 'dots') {
            baseStyles.backgroundImage = `radial-gradient(circle, rgba(255,255,255,0.08) 2px, transparent 2px)`;
            baseStyles.backgroundSize = '25px 25px';
        }

        Object.assign(layerEl.style, baseStyles);
    }

    renderWindow(layerEl, { view = 'city', time = 'day', frame = 'classic' }) {
        const viewColors = {
            city: time === 'day' ? ['#87CEEB', '#E0F6FF'] : ['#1a1a3e', '#2d2d5e'],
            forest: time === 'day' ? ['#87CEEB', '#98FB98'] : ['#0d1a0d', '#1a3d1a'],
            beach: time === 'day' ? ['#87CEEB', '#FFE4B5'] : ['#1a1a3e', '#2d2d4a'],
            space: ['#000000', '#0a0a1a']
        };

        const colors = viewColors[view] || viewColors.city;
        
        // Clear previous content
        layerEl.innerHTML = '';

        // Create window element
        const windowEl = document.createElement('div');
        windowEl.className = `room-window view-${view}`;
        windowEl.style.cssText = `
            position: absolute;
            top: 15%;
            left: 10%;
            width: 120px;
            height: 100px;
            background: linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%);
            border-radius: 10px;
            border: 8px solid ${frame === 'modern' ? '#2a2a3a' : '#4a4a6a'};
            overflow: hidden;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
        `;

        // Add window frame cross
        const frameH = document.createElement('div');
        frameH.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 4px;
            background: ${frame === 'modern' ? '#2a2a3a' : '#4a4a6a'};
            transform: translateY(-50%);
        `;

        const frameV = document.createElement('div');
        frameV.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 4px;
            background: ${frame === 'modern' ? '#2a2a3a' : '#4a4a6a'};
            transform: translateX(-50%);
        `;

        windowEl.appendChild(frameH);
        windowEl.appendChild(frameV);

        // Add stars for space view
        if (view === 'space') {
            for (let i = 0; i < 20; i++) {
                const star = document.createElement('div');
                star.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: white;
                    border-radius: 50%;
                    top: ${Math.random() * 100}%;
                    left: ${Math.random() * 100}%;
                    animation: twinkle ${2 + Math.random() * 3}s infinite;
                `;
                windowEl.appendChild(star);
            }
        }

        layerEl.appendChild(windowEl);
    }

    renderCharacter(layerEl, data = {}) {
        // Character is handled by the existing agent-container
        // Just ensure it's properly positioned
        const agentContainer = document.getElementById('agentContainer');
        if (agentContainer) {
            agentContainer.style.zIndex = '10';
        }
    }

    // ==================== ITEM RENDERING ====================

    renderItem(itemData) {
        const { id, layer, x, y, icon, name, rotation = 0, scale = 1 } = itemData;
        const layerEl = this.layers[layer];
        
        if (!layerEl) {
            console.warn(`Layer ${layer} not found for item ${id}`);
            return;
        }

        // Remove existing if present
        const existing = layerEl.querySelector(`[data-item-id="${id}"]`);
        if (existing) existing.remove();

        // Create item element
        const itemEl = document.createElement('div');
        itemEl.className = 'room-item';
        itemEl.dataset.itemId = id;
        itemEl.dataset.layer = layer;
        
        // Convert grid position to percentage
        const leftPct = (x / this.options.gridWidth) * 100;
        const topPct = (y / this.options.gridHeight) * 100;

        itemEl.style.cssText = `
            position: absolute;
            left: ${leftPct}%;
            top: ${topPct}%;
            font-size: 2.5rem;
            line-height: 1;
            transform: rotate(${rotation}deg) scale(${scale});
            z-index: ${itemData.z_index || y};
        `;
        itemEl.textContent = icon || '📦';
        itemEl.title = name || 'Item';

        // Add interaction handlers
        this.attachItemHandlers(itemEl, itemData);

        layerEl.appendChild(itemEl);
        this.items[id] = itemEl;

        return itemEl;
    }

    renderItems(itemsByLayer) {
        // Clear existing items
        for (const layerEl of Object.values(this.layers)) {
            layerEl.querySelectorAll('.room-item').forEach(el => el.remove());
        }
        this.items = {};

        // Render items by layer (furniture=3, decor=4)
        for (const [layerIndex, items] of Object.entries(itemsByLayer)) {
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    this.renderItem({ ...item, layer: parseInt(layerIndex) });
                }
            }
        }
    }

    attachItemHandlers(itemEl, itemData) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        itemEl.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = itemEl.offsetLeft;
            initialTop = itemEl.offsetTop;
            
            itemEl.classList.add('dragging');
            
            // Select item
            this.selectItem(itemData.id);
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            itemEl.style.left = `${initialLeft + dx}px`;
            itemEl.style.top = `${initialTop + dy}px`;
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            itemEl.classList.remove('dragging');
            
            // Calculate grid position
            const rect = this.container.getBoundingClientRect();
            const itemRect = itemEl.getBoundingClientRect();
            
            const relX = itemRect.left - rect.left + itemRect.width / 2;
            const relY = itemRect.top - rect.top + itemRect.height / 2;
            
            const gridX = Math.floor((relX / rect.width) * this.options.gridWidth);
            const gridY = Math.floor((relY / rect.height) * this.options.gridHeight);

            // Emit move event
            this.emit('itemMove', {
                id: itemData.id,
                x: Math.max(0, Math.min(gridX, this.options.gridWidth - 1)),
                y: Math.max(0, Math.min(gridY, this.options.gridHeight - 1))
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Right-click to remove
        itemEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`Remove ${itemData.name || 'this item'}?`)) {
                this.emit('itemRemove', { id: itemData.id });
            }
        });
    }

    // ==================== STATE MANAGEMENT ====================

    async loadRoomState(roomId = 'main') {
        try {
            const response = await fetch(`/api/room/layers?roomId=${roomId}`);
            if (!response.ok) throw new Error('Failed to load room state');
            
            const state = await response.json();
            this.applyRoomState(state);
            return state;
        } catch (err) {
            console.error('Failed to load room state:', err);
            // Apply default state
            this.applyDefaultState();
        }
    }

    applyRoomState(state) {
        this.state.roomId = state.roomId;
        this.state.layerVisibility = state.layerVisibility || {};

        // Render base layers
        if (state.layers) {
            this.renderLayer(0, state.layers.floor);
            this.renderLayer(1, state.layers.wall);
            this.renderLayer(2, state.layers.window);
        }

        // Render items
        if (state.items) {
            this.renderItems(state.items);
        }

        // Apply visibility
        this.applyLayerVisibility();
    }

    applyDefaultState() {
        this.renderLayer(0, { type: 'wood', color: '#3d3d5c' });
        this.renderLayer(1, { type: 'paint', color: '#3a3a55', pattern: 'solid' });
        this.renderLayer(2, { view: 'city', time: 'day', frame: 'classic' });
    }

    applyLayerVisibility() {
        for (const [layerIndex, visible] of Object.entries(this.state.layerVisibility)) {
            const layerEl = this.layers[layerIndex];
            if (layerEl) {
                layerEl.style.opacity = visible ? '1' : '0';
                layerEl.style.pointerEvents = visible ? 'auto' : 'none';
            }
        }
    }

    setLayerVisibility(layerIndex, visible) {
        this.state.layerVisibility[layerIndex] = visible;
        this.applyLayerVisibility();
    }

    selectItem(itemId) {
        // Deselect previous
        document.querySelectorAll('.room-item.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Select new
        const itemEl = this.items[itemId];
        if (itemEl) {
            itemEl.classList.add('selected');
            this.state.selectedItem = itemId;
            this.emit('itemSelect', { id: itemId });
        }
    }

    // ==================== EDIT MODE ====================

    setEditMode(enabled, activeLayer = null) {
        this.state.editMode = enabled;
        this.state.activeLayer = activeLayer;

        if (enabled) {
            this.container.classList.add('edit-mode');
            if (this.gridOverlay) {
                this.gridOverlay.style.opacity = '1';
                this.gridOverlay.classList.add('active');
            }
        } else {
            this.container.classList.remove('edit-mode');
            if (this.gridOverlay) {
                this.gridOverlay.style.opacity = '0';
                this.gridOverlay.classList.remove('active');
            }
        }

        // Highlight active layer
        for (const [index, layerEl] of Object.entries(this.layers)) {
            if (activeLayer !== null && parseInt(index) !== activeLayer) {
                layerEl.style.opacity = '0.3';
            } else {
                layerEl.style.opacity = '1';
            }
        }
    }

    // ==================== EVENT HANDLING ====================

    onGridClick(x, y, event) {
        if (!this.state.editMode) return;
        
        this.emit('gridClick', { 
            x, 
            y, 
            layer: this.state.activeLayer,
            shiftKey: event.shiftKey
        });
    }

    onGridDrop(event, x, y) {
        event.preventDefault();
        
        const itemData = event.dataTransfer.getData('itemData');
        if (itemData) {
            const data = JSON.parse(itemData);
            this.emit('itemDrop', { x, y, ...data });
        }
    }

    // Simple event emitter
    emit(eventName, data) {
        const event = new CustomEvent(`room:${eventName}`, { detail: data });
        document.dispatchEvent(event);
        
        // Also call registered handlers
        if (this._handlers && this._handlers[eventName]) {
            this._handlers[eventName].forEach(cb => cb(data));
        }
    }

    on(eventName, callback) {
        if (!this._handlers) this._handlers = {};
        if (!this._handlers[eventName]) this._handlers[eventName] = [];
        this._handlers[eventName].push(callback);
    }

    // ==================== UTILITIES ====================

    adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
    }

    // ==================== API HELPERS ====================

    async updateLayer(layerType, data) {
        try {
            const response = await fetch(`/api/room/layer/${layerType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: this.state.roomId, ...data })
            });
            
            if (!response.ok) throw new Error('Failed to update layer');
            
            const result = await response.json();
            
            // Re-render the layer
            const layerMap = { floor: 0, wall: 1, window: 2 };
            this.renderLayer(layerMap[layerType], data);
            
            return result;
        } catch (err) {
            console.error('Failed to update layer:', err);
            throw err;
        }
    }

    async placeItem(itemData) {
        try {
            const response = await fetch('/api/room/item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: this.state.roomId,
                    ...itemData
                })
            });
            
            if (!response.ok) throw new Error('Failed to place item');
            
            const result = await response.json();
            
            // Render the new item
            this.renderItem({ ...itemData, id: result.id });
            
            return result;
        } catch (err) {
            console.error('Failed to place item:', err);
            throw err;
        }
    }
}

// Initialize global instance
window.RoomRenderer = RoomRenderer;
