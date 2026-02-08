/**
 * Layer Panel - UI for controlling room layers
 * Allows users to edit floor, walls, windows, furniture, and decor
 */

class LayerPanel {
    constructor(options = {}) {
        this.options = {
            position: 'right',
            width: 350,
            ...options
        };
        
        this.isOpen = false;
        this.activeTab = 'floor';
        this.selectedItem = null;
        this.roomRenderer = null;
        
        this.tabs = {
            floor: { name: 'Floor', icon: '🟫', layer: 0 },
            wall: { name: 'Walls', icon: '🧱', layer: 1 },
            window: { name: 'Window', icon: '🪟', layer: 2 },
            furniture: { name: 'Furniture', icon: '🛋️', layer: 3 },
            decor: { name: 'Decor', icon: '🎨', layer: 4 }
        };

        this.catalog = [];
        this.init();
    }

    init() {
        this.createPanel();
        this.loadCatalog();
        
        // Listen for room renderer events
        document.addEventListener('room:itemSelect', (e) => {
            this.onItemSelect(e.detail);
        });
    }

    setRoomRenderer(renderer) {
        this.roomRenderer = renderer;
    }

    createPanel() {
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'layerPanel';
        panel.className = 'layer-panel';
        panel.style.cssText = `
            position: fixed;
            top: 0;
            ${this.options.position}: -${this.options.width}px;
            width: ${this.options.width}px;
            height: 100vh;
            background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%);
            border-left: 1px solid rgba(255,255,255,0.1);
            z-index: 1000;
            transition: ${this.options.position} 0.3s ease;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        panel.innerHTML = `
            <!-- Header -->
            <div class="layer-panel-header" style="
                padding: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h2 style="color: #ff9a9e; margin: 0; font-size: 1.3rem;">🏠 Decorate</h2>
                <button id="layerPanelClose" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 1.5rem;
                    cursor: pointer;
                ">×</button>
            </div>

            <!-- Layer Tabs -->
            <div class="layer-tabs" style="
                display: flex;
                gap: 5px;
                padding: 10px;
                overflow-x: auto;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            ">
                ${Object.entries(this.tabs).map(([key, tab]) => `
                    <button class="layer-tab" data-tab="${key}" style="
                        background: rgba(255,255,255,0.05);
                        border: none;
                        padding: 10px 15px;
                        border-radius: 10px;
                        color: #fff;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: all 0.3s;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        ${tab.icon} ${tab.name}
                    </button>
                `).join('')}
            </div>

            <!-- Content Area -->
            <div class="layer-content" id="layerContent" style="
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            ">
                <!-- Dynamic content goes here -->
            </div>

            <!-- Footer -->
            <div class="layer-panel-footer" style="
                padding: 15px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                gap: 10px;
            ">
                <button id="layerResetBtn" style="
                    flex: 1;
                    background: rgba(239,68,68,0.2);
                    border: 1px solid #ef4444;
                    padding: 12px;
                    border-radius: 10px;
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">Reset</button>
                <button id="layerSaveBtn" style="
                    flex: 1;
                    background: linear-gradient(135deg, #ff9a9e, #fad0c4);
                    border: none;
                    padding: 12px;
                    border-radius: 10px;
                    color: #1a1a2e;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 0.9rem;
                ">Save</button>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;

        // Bind events
        panel.querySelector('#layerPanelClose').addEventListener('click', () => this.close());
        panel.querySelector('#layerResetBtn').addEventListener('click', () => this.reset());
        panel.querySelector('#layerSaveBtn').addEventListener('click', () => this.save());

        // Tab switching
        panel.querySelectorAll('.layer-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Add global styles
        this.addStyles();
    }

    addStyles() {
        if (!document.getElementById('layer-panel-styles')) {
            const style = document.createElement('style');
            style.id = 'layer-panel-styles';
            style.textContent = `
                .layer-panel { box-shadow: -5px 0 30px rgba(0,0,0,0.5); }
                
                .layer-tab:hover { background: rgba(255,255,255,0.1) !important; }
                .layer-tab.active { 
                    background: rgba(255,154,158,0.3) !important; 
                    border: 1px solid #ff9a9e !important;
                }
                
                .layer-content::-webkit-scrollbar { width: 6px; }
                .layer-content::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .layer-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                
                .layer-option {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid transparent;
                    border-radius: 12px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-align: center;
                }
                .layer-option:hover { 
                    background: rgba(255,255,255,0.1); 
                    border-color: rgba(255,154,158,0.3);
                }
                .layer-option.selected { 
                    border-color: #ff9a9e; 
                    background: rgba(255,154,158,0.1);
                }
                
                .color-swatch {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 3px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .color-swatch:hover { transform: scale(1.1); }
                .color-swatch.selected { border-color: #fff; box-shadow: 0 0 0 2px #ff9a9e; }
                
                .pattern-option {
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .pattern-option:hover { border-color: rgba(255,154,158,0.5); }
                .pattern-option.selected { border-color: #ff9a9e; }
                
                .catalog-item {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid transparent;
                    border-radius: 10px;
                    padding: 15px;
                    text-align: center;
                    cursor: grab;
                    transition: all 0.3s;
                }
                .catalog-item:hover {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,154,158,0.5);
                    transform: translateY(-2px);
                }
                .catalog-item.dragging { opacity: 0.5; }
            `;
            document.head.appendChild(style);
        }
    }

    async loadCatalog() {
        try {
            const response = await fetch('/api/decor/catalog');
            if (!response.ok) throw new Error('Failed to load catalog');
            this.catalog = await response.json();
        } catch (err) {
            console.error('Failed to load catalog:', err);
            this.catalog = this.getLocalCatalog();
        }
    }

    getLocalCatalog() {
        return [
            // Furniture
            { id: 'sofa_classic', name: 'Classic Sofa', category: 'seating', icon: '🛋️' },
            { id: 'chair_wood', name: 'Wooden Chair', category: 'seating', icon: '🪑' },
            { id: 'desk_wood', name: 'Desk', category: 'tables', icon: '🪵' },
            { id: 'table_round', name: 'Round Table', category: 'tables', icon: '🔘' },
            { id: 'bookshelf', name: 'Bookshelf', category: 'storage', icon: '📚' },
            // Decor
            { id: 'plant', name: 'Plant', category: 'decor', icon: '🪴' },
            { id: 'painting', name: 'Painting', category: 'decor', icon: '🖼️' },
            { id: 'lamp', name: 'Lamp', category: 'lighting', icon: '💡' },
            { id: 'rug', name: 'Rug', category: 'decor', icon: '⭕' },
        ];
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab styles
        this.panel.querySelectorAll('.layer-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Highlight layer in renderer
        if (this.roomRenderer) {
            const layerIndex = this.tabs[tabName].layer;
            this.roomRenderer.setEditMode(true, layerIndex);
        }

        // Render tab content
        this.renderTabContent(tabName);
    }

    renderTabContent(tabName) {
        const content = this.panel.querySelector('#layerContent');
        
        switch(tabName) {
            case 'floor':
                content.innerHTML = this.renderFloorEditor();
                this.bindFloorEvents();
                break;
            case 'wall':
                content.innerHTML = this.renderWallEditor();
                this.bindWallEvents();
                break;
            case 'window':
                content.innerHTML = this.renderWindowEditor();
                this.bindWindowEvents();
                break;
            case 'furniture':
                content.innerHTML = this.renderItemCatalog('furniture');
                this.bindCatalogEvents('furniture');
                break;
            case 'decor':
                content.innerHTML = this.renderItemCatalog('decor');
                this.bindCatalogEvents('decor');
                break;
        }
    }

    // ==================== FLOOR EDITOR ====================

    renderFloorEditor() {
        const floorTypes = [
            { id: 'wood', name: 'Wood', icon: '🪵', color: '#3d3d5c' },
            { id: 'carpet', name: 'Carpet', icon: '🟫', color: '#4a3a4a' },
            { id: 'tile', name: 'Tile', icon: '⬜', color: '#4a4a5a' },
            { id: 'grass', name: 'Grass', icon: '🌿', color: '#2d4a2d' }
        ];

        const colors = ['#3d3d5c', '#4a3a4a', '#3a3a4a', '#4a4a3a', '#3a4a4a', '#2d3d4d'];

        return `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Floor Type</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${floorTypes.map(type => `
                        <div class="layer-option floor-type" data-type="${type.id}" style="
                            background: ${type.color}22;
                            border-color: ${type.color}44;
                        ">
                            <div style="font-size: 2rem; margin-bottom: 5px;">${type.icon}</div>
                            <div style="font-size: 0.85rem; color: #fff;">${type.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div>
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Color</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${colors.map(color => `
                        <div class="color-swatch floor-color" data-color="${color}" style="
                            background: ${color};
                        "></div>
                    `).join('')}
                    <input type="color" id="floorColorPicker" style="width: 40px; height: 40px; border: none; border-radius: 50%; cursor: pointer;">
                </div>
            </div>
        `;
    }

    bindFloorEvents() {
        // Floor type selection
        this.panel.querySelectorAll('.floor-type').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.floor-type').forEach(t => t.classList.remove('selected'));
                el.classList.add('selected');
                
                const type = el.dataset.type;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('floor', { type });
                }
            });
        });

        // Color selection
        this.panel.querySelectorAll('.floor-color').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.floor-color').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                
                const color = el.dataset.color;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('floor', { color });
                }
            });
        });

        // Custom color picker
        const picker = this.panel.querySelector('#floorColorPicker');
        if (picker) {
            picker.addEventListener('change', async (e) => {
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('floor', { color: e.target.value });
                }
            });
        }
    }

    // ==================== WALL EDITOR ====================

    renderWallEditor() {
        const wallTypes = [
            { id: 'paint', name: 'Paint', icon: '🎨' },
            { id: 'wallpaper', name: 'Wallpaper', icon: '📜' }
        ];

        const patterns = [
            { id: 'solid', name: 'Solid', preview: 'solid' },
            { id: 'striped', name: 'Stripes', preview: 'repeating-linear-gradient(90deg, #fff 0px, #fff 10px, transparent 10px, transparent 20px)' },
            { id: 'dots', name: 'Dots', preview: 'radial-gradient(circle, #fff 2px, transparent 2px)' }
        ];

        const colors = ['#3a3a55', '#4a3a3a', '#3a4a4a', '#4a4a3a', '#3a3a4a', '#4a3a4a'];

        return `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Wall Type</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${wallTypes.map(type => `
                        <div class="layer-option wall-type" data-type="${type.id}">
                            <div style="font-size: 2rem; margin-bottom: 5px;">${type.icon}</div>
                            <div style="font-size: 0.85rem; color: #fff;">${type.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Color</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${colors.map(color => `
                        <div class="color-swatch wall-color" data-color="${color}" style="
                            background: ${color};
                        "></div>
                    `).join('')}
                    <input type="color" id="wallColorPicker" style="width: 40px; height: 40px; border: none; border-radius: 50%; cursor: pointer;">
                </div>
            </div>

            <div>
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Pattern</h3>
                <div style="display: flex; gap: 10px;">
                    ${patterns.map(p => `
                        <div class="pattern-option wall-pattern" data-pattern="${p.id}" style="
                            background: ${p.id === 'solid' ? '#3a3a55' : '#3a3a55'};
                            background-image: ${p.preview !== 'solid' ? p.preview : 'none'};
                            background-size: ${p.id === 'dots' ? '15px 15px' : 'auto'};
                        " title="${p.name}"></div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindWallEvents() {
        this.panel.querySelectorAll('.wall-type').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.wall-type').forEach(t => t.classList.remove('selected'));
                el.classList.add('selected');
                
                const type = el.dataset.type;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('wall', { type });
                }
            });
        });

        this.panel.querySelectorAll('.wall-color').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.wall-color').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                
                const color = el.dataset.color;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('wall', { color });
                }
            });
        });

        this.panel.querySelectorAll('.wall-pattern').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.wall-pattern').forEach(p => p.classList.remove('selected'));
                el.classList.add('selected');
                
                const pattern = el.dataset.pattern;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('wall', { pattern });
                }
            });
        });

        const picker = this.panel.querySelector('#wallColorPicker');
        if (picker) {
            picker.addEventListener('change', async (e) => {
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('wall', { color: e.target.value });
                }
            });
        }
    }

    // ==================== WINDOW EDITOR ====================

    renderWindowEditor() {
        const views = [
            { id: 'city', name: 'City', icon: '🌃' },
            { id: 'forest', name: 'Forest', icon: '🌲' },
            { id: 'beach', name: 'Beach', icon: '🏖️' },
            { id: 'space', name: 'Space', icon: '🌌' },
            { id: 'mountain', name: 'Mountain', icon: '🏔️' }
        ];

        const times = [
            { id: 'day', name: 'Day', icon: '☀️' },
            { id: 'sunset', name: 'Sunset', icon: '🌅' },
            { id: 'night', name: 'Night', icon: '🌙' }
        ];

        const frames = [
            { id: 'classic', name: 'Classic', color: '#4a4a6a' },
            { id: 'modern', name: 'Modern', color: '#2a2a3a' },
            { id: 'rustic', name: 'Rustic', color: '#6a5a4a' }
        ];

        return `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">View</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    ${views.map(view => `
                        <div class="layer-option window-view" data-view="${view.id}">
                            <div style="font-size: 2rem; margin-bottom: 5px;">${view.icon}</div>
                            <div style="font-size: 0.8rem; color: #fff;">${view.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Time of Day</h3>
                <div style="display: flex; gap: 10px;">
                    ${times.map(time => `
                        <div class="layer-option window-time" data-time="${time.id}" style="flex: 1;">
                            <div style="font-size: 1.5rem; margin-bottom: 5px;">${time.icon}</div>
                            <div style="font-size: 0.8rem; color: #fff;">${time.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div>
                <h3 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Frame Style</h3>
                <div style="display: flex; gap: 10px;">
                    ${frames.map(frame => `
                        <div class="layer-option window-frame" data-frame="${frame.id}" style="flex: 1;">
                            <div style="
                                width: 40px; 
                                height: 40px; 
                                background: ${frame.color};
                                border-radius: 5px;
                                margin: 0 auto 5px;
                            "></div>
                            <div style="font-size: 0.8rem; color: #fff;">${frame.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindWindowEvents() {
        this.panel.querySelectorAll('.window-view').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.window-view').forEach(v => v.classList.remove('selected'));
                el.classList.add('selected');
                
                const view = el.dataset.view;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('window', { view });
                }
            });
        });

        this.panel.querySelectorAll('.window-time').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.window-time').forEach(t => t.classList.remove('selected'));
                el.classList.add('selected');
                
                const time = el.dataset.time;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('window', { time });
                }
            });
        });

        this.panel.querySelectorAll('.window-frame').forEach(el => {
            el.addEventListener('click', async () => {
                this.panel.querySelectorAll('.window-frame').forEach(f => f.classList.remove('selected'));
                el.classList.add('selected');
                
                const frame = el.dataset.frame;
                if (this.roomRenderer) {
                    await this.roomRenderer.updateLayer('window', { frame });
                }
            });
        });
    }

    // ==================== ITEM CATALOG ====================

    renderItemCatalog(layerType) {
        const layerMap = { furniture: 3, decor: 4 };
        const targetLayer = layerMap[layerType];
        
        const items = this.catalog.filter(item => {
            if (layerType === 'furniture') {
                return ['seating', 'tables', 'storage'].includes(item.category);
            }
            return ['decor', 'lighting', 'views'].includes(item.category);
        });

        return `
            <div style="margin-bottom: 15px;">
                <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0;">
                    💡 Drag items to place them, or click to select and then click in room
                </p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                ${items.map(item => `
                    <div class="catalog-item" 
                         draggable="true"
                         data-item-id="${item.id}"
                         data-item-type="${layerType}"
                         data-layer="${targetLayer}"
                    >
                        <div style="font-size: 2rem; margin-bottom: 5px;">${item.icon || '📦'}</div>
                        <div style="font-size: 0.8rem; color: #fff;">${item.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    bindCatalogEvents(layerType) {
        this.panel.querySelectorAll('.catalog-item').forEach(el => {
            // Drag start
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('itemData', JSON.stringify({
                    itemId: el.dataset.itemId,
                    itemType: el.dataset.itemType,
                    layer: parseInt(el.dataset.layer)
                }));
                el.classList.add('dragging');
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });

            // Click to select for placement
            el.addEventListener('click', () => {
                this.panel.querySelectorAll('.catalog-item').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                
                this.selectedItem = {
                    itemId: el.dataset.itemId,
                    itemType: el.dataset.itemType,
                    layer: parseInt(el.dataset.layer)
                };

                // Enable click-to-place mode
                if (this.roomRenderer) {
                    this.roomRenderer.state.pendingPlacement = this.selectedItem;
                }
            });
        });
    }

    // ==================== ACTIONS ====================

    open() {
        this.isOpen = true;
        this.panel.style[this.options.position] = '0';
        
        // Enter edit mode
        if (this.roomRenderer) {
            const layerIndex = this.tabs[this.activeTab].layer;
            this.roomRenderer.setEditMode(true, layerIndex);
        }

        // Load initial tab content
        this.switchTab(this.activeTab);
    }

    close() {
        this.isOpen = false;
        this.panel.style[this.options.position] = `-${this.options.width}px`;
        
        // Exit edit mode
        if (this.roomRenderer) {
            this.roomRenderer.setEditMode(false);
        }
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    async save() {
        // Create snapshot
        try {
            const response = await fetch('/api/room/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: 'main' })
            });

            const btn = this.panel.querySelector('#layerSaveBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Saved!';
            btn.style.background = '#4ade80';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1500);
        } catch (err) {
            console.error('Failed to save snapshot:', err);
            alert('Failed to save. Please try again.');
        }
    }

    async reset() {
        if (!confirm('Reset room to default? This cannot be undone.')) return;
        
        try {
            await fetch('/api/room/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: 'main' })
            });

            // Reload room
            if (this.roomRenderer) {
                await this.roomRenderer.loadRoomState('main');
            }
        } catch (err) {
            console.error('Failed to reset room:', err);
        }
    }

    onItemSelect(detail) {
        // Show item properties in panel
        console.log('Item selected:', detail);
    }
}

// Initialize global instance
window.LayerPanel = LayerPanel;
