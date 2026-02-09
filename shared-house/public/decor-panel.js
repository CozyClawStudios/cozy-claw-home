/**
 * Decoration Panel - UI for customizing the companion's home
 */

class DecorationPanel {
    constructor() {
        this.isOpen = false;
        this.selectedItem = null;
        this.placements = [];
        this.catalog = [];
        this.currentTheme = 'cozy';
        this.gridSize = { width: 20, height: 15 };
        this.cellSize = 40;
        
        this.categories = {
            seating: { name: 'Seating', icon: '🛋️' },
            tables: { name: 'Tables', icon: '🪑' },
            storage: { name: 'Storage', icon: '📚' },
            decor: { name: 'Decor', icon: '🎨' },
            lighting: { name: 'Lighting', icon: '💡' },
            views: { name: 'Views', icon: '🪟' }
        };
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.createGridOverlay();
        this.loadCatalog();
        this.loadPlacements();
        
        // Listen for decor updates from server
        if (window.socket) {
            window.socket.on('decor:changed', () => {
                this.loadPlacements();
            });
        }
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'decorPanel';
        panel.className = 'decor-panel';
        panel.style.cssText = `
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%);
            border-left: 1px solid rgba(255,255,255,0.1);
            z-index: 1000;
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
        `;
        
        panel.innerHTML = `
            <div class="decor-header" style="
                padding: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h2 style="color: #ff9a9e; margin: 0;">🏠 Decorate</h2>
                <button onclick="decorPanel.close()" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 1.5rem;
                    cursor: pointer;
                ">×</button>
            </div>
            
            <div class="decor-tabs" style="
                display: flex;
                gap: 5px;
                padding: 10px;
                overflow-x: auto;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            ">
                ${Object.entries(this.categories).map(([key, cat]) => `
                    <button class="decor-tab" data-category="${key}" onclick="decorPanel.selectCategory('${key}')" style="
                        background: rgba(255,255,255,0.05);
                        border: none;
                        padding: 10px 15px;
                        border-radius: 10px;
                        color: #fff;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: all 0.3s;
                    ">
                        ${cat.icon} ${cat.name}
                    </button>
                `).join('')}
            </div>
            
            <div class="decor-catalog" id="decorCatalog" style="
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            ">
                <!-- Items populated here -->
            </div>
            
            <div class="decor-footer" style="
                padding: 15px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                gap: 10px;
            ">
                <button onclick="decorPanel.clearRoom()" style="
                    flex: 1;
                    background: rgba(239,68,68,0.2);
                    border: 1px solid #ef4444;
                    padding: 12px;
                    border-radius: 10px;
                    color: #ef4444;
                    cursor: pointer;
                ">Clear All</button>
                <button onclick="decorPanel.saveLayout()" style="
                    flex: 1;
                    background: linear-gradient(135deg, #ff9a9e, #fad0c4);
                    border: none;
                    padding: 12px;
                    border-radius: 10px;
                    color: #1a1a2e;
                    cursor: pointer;
                    font-weight: bold;
                ">Save</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // Add toggle button to header
        this.addToggleButton();
    }
    
    addToggleButton() {
        const header = document.querySelector('.header-right');
        if (header) {
            const btn = document.createElement('button');
            btn.className = 'header-btn';
            btn.innerHTML = '🎨';
            btn.title = 'Decorate';
            btn.onclick = () => this.open();
            header.insertBefore(btn, header.firstChild);
        }
    }
    
    createGridOverlay() {
        const room = document.querySelector('.room');
        if (!room) return;
        
        const grid = document.createElement('div');
        grid.id = 'decorGrid';
        grid.className = 'decor-grid';
        grid.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: grid;
            grid-template-columns: repeat(${this.gridSize.width}, 1fr);
            grid-template-rows: repeat(${this.gridSize.height}, 1fr);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 100;
        `;
        
        // Create grid cells
        for (let y = 0; y < this.gridSize.height; y++) {
            for (let x = 0; x < this.gridSize.width; x++) {
                const cell = document.createElement('div');
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.style.cssText = `
                    border: 1px dashed rgba(255,255,255,0.1);
                    pointer-events: auto;
                    cursor: pointer;
                `;
                cell.onclick = () => this.onGridClick(x, y);
                cell.ondragover = (e) => e.preventDefault();
                cell.ondrop = (e) => this.onGridDrop(e, x, y);
                grid.appendChild(cell);
            }
        }
        
        room.appendChild(grid);
        this.grid = grid;
    }
    
    async loadCatalog() {
        try {
            const response = await fetch('/api/decor/catalog');
            if (!response.ok) throw new Error('Failed to fetch catalog');
            this.catalog = await response.json();
            // Fallback to local catalog if empty
            if (!this.catalog || this.catalog.length === 0) {
                this.catalog = this.getLocalCatalog();
            }
            this.selectCategory('seating');
        } catch (err) {
            console.error('Failed to load catalog:', err);
            // Use local fallback catalog
            this.catalog = this.getLocalCatalog();
            this.selectCategory('seating');
        }
    }

    // Local fallback catalog in case API fails
    getLocalCatalog() {
        return [
            { id: 'sofa_classic', name: 'Classic Sofa', category: 'seating', style: 'cozy', width: 3, height: 1, layer: 1, icon: '🛋️' },
            { id: 'sofa_modern', name: 'Modern Sofa', category: 'seating', style: 'modern', width: 3, height: 1, layer: 1, icon: '🛋️' },
            { id: 'armchair_blue', name: 'Blue Armchair', category: 'seating', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🪑' },
            { id: 'bean_bag', name: 'Bean Bag', category: 'seating', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🟤' },
            { id: 'desk_wood', name: 'Wooden Desk', category: 'tables', style: 'rustic', width: 2, height: 1, layer: 1, icon: '🪵' },
            { id: 'desk_modern', name: 'Modern Desk', category: 'tables', style: 'modern', width: 2, height: 1, layer: 1, icon: '🪑' },
            { id: 'coffee_table', name: 'Coffee Table', category: 'tables', style: 'cozy', width: 2, height: 1, layer: 1, icon: '🪵' },
            { id: 'dining_table', name: 'Dining Table', category: 'tables', style: 'cozy', width: 3, height: 2, layer: 1, icon: '🍽️' },
            { id: 'bookshelf_tall', name: 'Tall Bookshelf', category: 'storage', style: 'cozy', width: 1, height: 2, layer: 1, icon: '📚' },
            { id: 'bookshelf_wide', name: 'Wide Bookshelf', category: 'storage', style: 'cozy', width: 2, height: 1, layer: 1, icon: '📚' },
            { id: 'cabinet', name: 'Storage Cabinet', category: 'storage', style: 'cozy', width: 2, height: 1, layer: 1, icon: '🗄️' },
            { id: 'shelf_floating', name: 'Floating Shelves', category: 'storage', style: 'modern', width: 2, height: 1, layer: 3, icon: '🧱' },
            { id: 'shelf_corner', name: 'Corner Shelf', category: 'storage', style: 'cozy', width: 1, height: 2, layer: 1, icon: '📐' },
            { id: 'shelf_wall', name: 'Wall Shelf', category: 'storage', style: 'cozy', width: 2, height: 1, layer: 3, icon: '🪜' },
            { id: 'plant_succulent', name: 'Succulent', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🌵' },
            { id: 'plant_fern', name: 'Fern', category: 'decor', style: 'nature', width: 1, height: 1, layer: 2, icon: '🌿' },
            { id: 'plant_monstera', name: 'Monstera', category: 'decor', style: 'nature', width: 1, height: 2, layer: 2, icon: '🌴' },
            { id: 'plant_flower', name: 'Flower Pot', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🌸' },
            { id: 'plant_hanging', name: 'Hanging Plant', category: 'decor', style: 'nature', width: 1, height: 1, layer: 3, icon: '🪴' },
            { id: 'vase', name: 'Decorative Vase', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🏺' },
            { id: 'statue', name: 'Art Statue', category: 'decor', style: 'modern', width: 1, height: 1, layer: 2, icon: '🗿' },
            { id: 'clock', name: 'Wall Clock', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 3, icon: '🕐' },
            { id: 'mirror', name: 'Mirror', category: 'decor', style: 'modern', width: 1, height: 2, layer: 3, icon: '🪞' },
            { id: 'books', name: 'Stack of Books', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '📖' },
            { id: 'clock_table', name: 'Table Clock', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '⏰' },
            { id: 'mug', name: 'Coffee Mug', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '☕' },
            { id: 'teapot', name: 'Teapot', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🫖' },
            { id: 'crystal_ball', name: 'Crystal Ball', category: 'decor', style: 'modern', width: 1, height: 1, layer: 2, icon: '🔮' },
            { id: 'globe', name: 'Globe', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🌍' },
            { id: 'photo_frame', name: 'Photo Frame', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🖼️' },
            { id: 'rug_round', name: 'Round Rug', category: 'decor', style: 'cozy', width: 3, height: 2, layer: 0, icon: '⭕' },
            { id: 'painting_landscape', name: 'Landscape Painting', category: 'decor', style: 'cozy', width: 2, height: 1, layer: 3, icon: '🖼️' },
            { id: 'painting_abstract', name: 'Abstract Art', category: 'decor', style: 'modern', width: 1, height: 1, layer: 3, icon: '🎨' },
            { id: 'lamp_floor', name: 'Floor Lamp', category: 'lighting', subcategory: 'lamp', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🛋️' },
            { id: 'lamp_desk', name: 'Desk Lamp', category: 'lighting', style: 'modern', width: 1, height: 1, layer: 2, icon: '💡' },
            { id: 'lamp_string', name: 'String Lights', category: 'lighting', style: 'cozy', width: 3, height: 1, layer: 3, icon: '✨' },
            { id: 'candle', name: 'Candles', category: 'lighting', style: 'cozy', width: 1, height: 1, layer: 2, icon: '🕯️' },
            { id: 'window_city', name: 'City View', category: 'views', style: 'modern', width: 3, height: 2, layer: 3, icon: '🌃' },
            { id: 'window_forest', name: 'Forest View', category: 'views', style: 'nature', width: 3, height: 2, layer: 3, icon: '🌲' },
            { id: 'window_beach', name: 'Beach View', category: 'views', style: 'nature', width: 3, height: 2, layer: 3, icon: '🏖️' },
        ];
    }
    
    async loadPlacements() {
        try {
            const response = await fetch(`/api/decor/placements?theme=${this.currentTheme}`);
            this.placements = await response.json();
            this.renderPlacements();
        } catch (err) {
            console.error('Failed to load placements:', err);
        }
    }
    
    selectCategory(category) {
        // Update tabs
        document.querySelectorAll('.decor-tab').forEach(tab => {
            tab.style.background = tab.dataset.category === category 
                ? 'rgba(255,154,158,0.3)' 
                : 'rgba(255,255,255,0.05)';
            tab.style.border = tab.dataset.category === category 
                ? '1px solid #ff9a9e' 
                : 'none';
        });
        
        // Render items
        const catalogEl = document.getElementById('decorCatalog');
        const items = this.catalog.filter(item => item.category === category);
        
        catalogEl.innerHTML = items.map(item => `
            <div class="decor-item" 
                 draggable="true"
                 onclick="decorPanel.selectItem('${item.id}')"
                 ondragstart="decorPanel.dragStart(event, '${item.id}')"
                 style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    padding: 15px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 2px solid transparent;
                 "
                 onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                 onmouseout="this.style.background='rgba(255,255,255,0.05)'"
            ">
                <div style="font-size: 2rem; margin-bottom: 5px;">${item.icon}</div>
                <div style="font-size: 0.8rem; color: #fff;">${item.name}</div>
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${item.style}</div>
            </div>
        `).join('');
    }
    
    selectItem(itemId) {
        this.selectedItem = itemId;
        document.querySelectorAll('.decor-item').forEach(el => {
            el.style.border = '2px solid transparent';
        });
        event.currentTarget.style.border = '2px solid #ff9a9e';
    }
    
    dragStart(e, itemId) {
        e.dataTransfer.setData('itemId', itemId);
    }
    
    onGridClick(x, y) {
        if (!this.selectedItem) {
            // Show grid temporarily to help placement
            this.showGrid();
            return;
        }
        
        this.placeItem(this.selectedItem, x, y);
    }
    
    onGridDrop(e, x, y) {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('itemId');
        if (itemId) {
            this.placeItem(itemId, x, y);
        }
    }
    
    async placeItem(itemId, x, y) {
        try {
            const response = await fetch('/api/decor/place', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId,
                    x,
                    y,
                    themeId: this.currentTheme
                })
            });
            
            if (response.ok) {
                this.loadPlacements();
                this.showGridBriefly();
            }
        } catch (err) {
            console.error('Failed to place item:', err);
        }
    }
    
    async moveItem(placementId, x, y) {
        try {
            const response = await fetch('/api/decor/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placementId, x, y })
            });
            
            if (response.ok) {
                this.loadPlacements();
            }
        } catch (err) {
            console.error('Failed to move item:', err);
        }
    }
    
    async removeItem(placementId) {
        try {
            const response = await fetch(`/api/decor/place/${placementId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.loadPlacements();
            }
        } catch (err) {
            console.error('Failed to remove item:', err);
        }
    }
    
    renderPlacements() {
        // Remove existing placement elements
        document.querySelectorAll('.placement-item').forEach(el => el.remove());
        
        const room = document.querySelector('.room');
        if (!room) return;
        
        for (const p of this.placements) {
            const el = document.createElement('div');
            el.className = 'placement-item';
            el.dataset.placementId = p.id;
            
            // Ensure icon is set
            const icon = p.icon || '📦';
            
            el.style.cssText = `
                position: absolute;
                left: ${(p.x / this.gridSize.width) * 100}%;
                top: ${(p.y / this.gridSize.height) * 100}%;
                width: ${(p.width / this.gridSize.width) * 100}%;
                height: ${(p.height / this.gridSize.height) * 100}%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
                font-size: ${Math.min(p.width, p.height) * 1.8}rem;
                line-height: 1;
                cursor: move;
                user-select: none;
                z-index: ${10 + (p.layer || 1)};
                transition: transform 0.2s, filter 0.2s;
                text-align: center;
                overflow: visible;
                ${p.rotation ? `transform: rotate(${p.rotation}deg);` : ''}
            `;
            el.textContent = icon;
            el.title = p.name || 'Item';
            
            // Add hover effect
            el.onmouseenter = () => {
                el.style.filter = 'brightness(1.2) drop-shadow(0 0 10px rgba(255,154,158,0.5))';
                el.style.zIndex = '100';
            };
            el.onmouseleave = () => {
                el.style.filter = '';
                el.style.zIndex = `${10 + (p.layer || 1)}`;
            };
            
            // Drag handling
            let isDragging = false;
            let startX, startY;
            
            el.onmousedown = (e) => {
                if (e.button !== 0) return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                el.style.zIndex = 100;
                el.style.cursor = 'grabbing';
            };
            
            const handleMouseMove = (e) => {
                if (!isDragging) return;
                el.style.opacity = '0.7';
            };
            
            const handleMouseUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                el.style.opacity = '1';
                el.style.cursor = 'move';
                el.style.zIndex = 10 + (p.layer || 1);
                
                // Check if dropped on grid
                const gridEl = document.elementFromPoint(e.clientX, e.clientY);
                if (gridEl?.dataset.x !== undefined) {
                    const newX = parseInt(gridEl.dataset.x);
                    const newY = parseInt(gridEl.dataset.y);
                    if (newX !== p.x || newY !== p.y) {
                        this.moveItem(p.id, newX, newY);
                    }
                }
            };
            
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            
            // Right click to remove
            el.oncontextmenu = (e) => {
                e.preventDefault();
                if (confirm(`Remove ${p.name || 'this item'}?`)) {
                    this.removeItem(p.id);
                }
            };
            
            room.appendChild(el);
        }
    }
    
    showGrid() {
        if (this.grid) {
            this.grid.style.opacity = '1';
            this.grid.style.pointerEvents = 'auto';
        }
    }
    
    hideGrid() {
        if (this.grid) {
            this.grid.style.opacity = '0';
            this.grid.style.pointerEvents = 'none';
        }
    }
    
    showGridBriefly() {
        this.showGrid();
        setTimeout(() => this.hideGrid(), 2000);
    }
    
    open() {
        this.isOpen = true;
        this.panel.style.right = '0';
        this.showGrid();
        this.loadPlacements();
    }
    
    close() {
        this.isOpen = false;
        this.panel.style.right = '-400px';
        this.hideGrid();
    }
    
    async clearRoom() {
        if (!confirm('Clear all items from the room?')) return;
        
        try {
            await fetch(`/api/decor/clear?theme=${this.currentTheme}`, {
                method: 'DELETE'
            });
            this.loadPlacements();
        } catch (err) {
            console.error('Failed to clear room:', err);
        }
    }
    
    async saveLayout() {
        // Layout is auto-saved, but this gives user feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Saved!';
        btn.style.background = '#4ade80';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
        
        // Record interaction for unlocks
        try {
            await fetch('/api/decor/interaction', { method: 'POST' });
        } catch (err) {
            // Silent fail
        }
    }
}

// Initialize
decorPanel = new DecorationPanel();
