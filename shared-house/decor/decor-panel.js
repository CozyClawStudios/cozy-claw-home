/**
 * Cozy Claw Home - Decoration Panel
 * Enhanced decoration system with room customization
 */

const DecorationPanel = (function() {
    'use strict';

    let panel = null;
    let isVisible = false;
    let currentTab = 'furniture';
    let selectedItem = null;

    /**
     * Initialize the decoration panel
     */
    function init() {
        createPanel();
        createStyles();
        attachEventListeners();
        
        console.log('🎨 Decoration Panel initialized');
    }

    /**
     * Create the panel HTML
     */
    function createPanel() {
        if (document.getElementById('decoration-panel')) {
            panel = document.getElementById('decoration-panel');
            return;
        }

        panel = document.createElement('div');
        panel.id = 'decoration-panel';
        panel.className = 'decoration-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-title">🎨 Decorate</span>
                <button class="panel-close" id="panel-close">✕</button>
            </div>
            
            <div class="panel-tabs">
                <button class="panel-tab active" data-tab="furniture">🪑 Furniture</button>
                <button class="panel-tab" data-tab="walls">🎨 Walls & Floor</button>
                <button class="panel-tab" data-tab="window">🪟 Window</button>
            </div>
            
            <div class="panel-content" id="panel-content">
                <!-- Dynamic content goes here -->
            </div>
        `;

        document.body.appendChild(panel);
    }

    /**
     * Create panel styles
     */
    function createStyles() {
        if (document.getElementById('decoration-panel-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'decoration-panel-styles';
        styles.textContent = `
            .decoration-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                max-height: calc(100vh - 40px);
                background: rgba(255, 253, 250, 0.98);
                border-radius: 20px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.9);
                z-index: 1001;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Segoe UI', system-ui, sans-serif;
            }

            .decoration-panel.visible {
                display: flex;
            }

            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, #FFE4B5, #FFD4A3);
                border-bottom: 2px solid #E8D4C4;
            }

            .panel-title {
                font-weight: 700;
                font-size: 18px;
                color: #5D4E37;
            }

            .panel-close {
                background: rgba(255, 255, 255, 0.5);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 10px;
                cursor: pointer;
                color: #5D4E37;
                font-size: 16px;
                transition: all 0.2s;
            }

            .panel-close:hover {
                background: rgba(255, 255, 255, 0.8);
                transform: rotate(90deg);
            }

            .panel-tabs {
                display: flex;
                background: #F5E6D3;
                padding: 4px;
                gap: 4px;
            }

            .panel-tab {
                flex: 1;
                padding: 10px 8px;
                border: none;
                background: transparent;
                border-radius: 12px;
                cursor: pointer;
                font-size: 13px;
                color: #8B7355;
                transition: all 0.2s;
                font-weight: 500;
            }

            .panel-tab:hover {
                background: rgba(255, 255, 255, 0.4);
            }

            .panel-tab.active {
                background: white;
                color: #5D4E37;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }

            .panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            /* Furniture Tab Styles */
            .furniture-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }

            .furniture-item {
                aspect-ratio: 1;
                background: linear-gradient(145deg, #FFF8F0, #F5E6D3);
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s ease;
                padding: 8px;
            }

            .furniture-item:hover {
                transform: translateY(-4px) scale(1.05);
                border-color: #D4A574;
                box-shadow: 0 8px 20px rgba(212, 165, 116, 0.3);
            }

            .furniture-item.selected {
                border-color: #7CB342;
                background: linear-gradient(145deg, #E8F5E9, #C8E6C9);
            }

            .furniture-item-emoji {
                font-size: 32px;
                margin-bottom: 4px;
            }

            .furniture-item-name {
                font-size: 10px;
                text-align: center;
                color: #5D4E37;
                font-weight: 500;
                line-height: 1.2;
            }

            .furniture-category-label {
                grid-column: 1 / -1;
                font-size: 12px;
                font-weight: 700;
                color: #8B7355;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 8px;
                margin-bottom: 4px;
                padding-bottom: 8px;
                border-bottom: 1px solid #E8D4C4;
            }

            /* Color Picker Styles */
            .color-section {
                margin-bottom: 24px;
            }

            .color-section-title {
                font-weight: 600;
                color: #5D4E37;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .color-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 8px;
            }

            .color-swatch {
                aspect-ratio: 1;
                border-radius: 12px;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
            }

            .color-swatch:hover {
                transform: scale(1.15);
                border-color: #D4A574;
            }

            .color-swatch.selected {
                border-color: #7CB342;
                box-shadow: 0 0 0 3px rgba(124, 179, 66, 0.3);
            }

            .texture-options {
                display: flex;
                gap: 12px;
                margin-top: 8px;
            }

            .texture-option {
                flex: 1;
                padding: 12px;
                background: linear-gradient(145deg, #FFF8F0, #F5E6D3);
                border-radius: 12px;
                text-align: center;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s;
            }

            .texture-option:hover {
                border-color: #D4A574;
            }

            .texture-option.selected {
                border-color: #7CB342;
                background: linear-gradient(145deg, #E8F5E9, #C8E6C9);
            }

            .texture-icon {
                font-size: 24px;
                margin-bottom: 4px;
            }

            .texture-name {
                font-size: 11px;
                color: #5D4E37;
                font-weight: 500;
            }

            /* Window View Styles */
            .view-grid {
                display: grid;
                gap: 10px;
            }

            .view-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px;
                background: linear-gradient(145deg, #FFF8F0, #F5E6D3);
                border-radius: 14px;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s;
            }

            .view-option:hover {
                border-color: #D4A574;
                transform: translateX(4px);
            }

            .view-option.selected {
                border-color: #7CB342;
                background: linear-gradient(145deg, #E8F5E9, #C8E6C9);
            }

            .view-icon {
                font-size: 32px;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                border-radius: 12px;
            }

            .view-info {
                flex: 1;
            }

            .view-name {
                font-weight: 600;
                color: #5D4E37;
                margin-bottom: 2px;
            }

            .view-desc {
                font-size: 12px;
                color: #8B7355;
            }

            /* Tutorial styles */
            .tutorial-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .tutorial-card {
                background: white;
                padding: 32px;
                border-radius: 24px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .tutorial-emoji {
                font-size: 64px;
                margin-bottom: 16px;
            }

            .tutorial-title {
                font-size: 24px;
                font-weight: 700;
                color: #5D4E37;
                margin-bottom: 12px;
            }

            .tutorial-text {
                color: #8B7355;
                line-height: 1.6;
                margin-bottom: 24px;
            }

            .tutorial-btn {
                background: linear-gradient(135deg, #FFE4B5, #FFD4A3);
                border: none;
                padding: 14px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                color: #5D4E37;
                cursor: pointer;
                transition: all 0.2s;
            }

            .tutorial-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(212, 165, 116, 0.4);
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Close button
        document.getElementById('panel-close')?.addEventListener('click', hide);

        // Tab buttons
        panel?.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Room change listener
        if (typeof RoomManager !== 'undefined') {
            RoomManager.addListener((event) => {
                if (event === 'roomChange') {
                    renderContent();
                }
            });
        }
    }

    /**
     * Switch tabs
     */
    function switchTab(tab) {
        currentTab = tab;
        
        // Update tab buttons
        panel?.querySelectorAll('.panel-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        renderContent();
    }

    /**
     * Render panel content based on current tab
     */
    function renderContent() {
        const content = document.getElementById('panel-content');
        if (!content) return;

        switch (currentTab) {
            case 'furniture':
                renderFurnitureTab(content);
                break;
            case 'walls':
                renderWallsTab(content);
                break;
            case 'window':
                renderWindowTab(content);
                break;
        }
    }

    /**
     * Render furniture tab
     */
    function renderFurnitureTab(content) {
        const items = FurnitureCatalog.getForCurrentRoom();
        const room = RoomManager.getCurrentRoom();
        
        content.innerHTML = `
            <div class="furniture-grid">
                <div class="furniture-category-label">
                    ${room?.icon} ${room?.name} Items
                </div>
                ${items.map(item => `
                    <div class="furniture-item ${selectedItem === item.type ? 'selected' : ''}" 
                         data-type="${item.type}"
                         title="${item.description}">
                        <div class="furniture-item-emoji">${item.emoji}</div>
                        <div class="furniture-item-name">${item.name}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers
        content.querySelectorAll('.furniture-item').forEach(item => {
            item.addEventListener('click', () => selectFurniture(item.dataset.type));
        });
    }

    /**
     * Render walls and floor tab
     */
    function renderWallsTab(content) {
        const roomState = RoomManager.getCurrentRoomState();
        
        const wallColors = [
            '#F5E6D3', '#FFE4B5', '#FFF8E7', '#E8E0F0', '#E0F4F8',
            '#F0E6DC', '#FAEBD7', '#FFEFD5', '#FFF5EE', '#FDF5E6',
            '#E6D5C3', '#D4C4B0', '#C9B8A4', '#F5F5DC', '#FFFACD',
            '#FFE4E1', '#E6E6FA', '#F0FFF0', '#FFF0F5', '#F5FFFA'
        ];

        const floorColors = [
            '#D4A574', '#C4B5A0', '#E8D5C4', '#B8D4E3', '#90EE90',
            '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2B48C',
            '#C19A6B', '#8B7355', '#BC8F8F', '#F5F5F5', '#E8E8E8',
            '#D3D3D3', '#C0C0C0', '#228B22', '#32CD32', '#7CFC00'
        ];

        content.innerHTML = `
            <div class="color-section">
                <div class="color-section-title">
                    🎨 Wall Color
                </div>
                <div class="color-grid">
                    ${wallColors.map(color => `
                        <div class="color-swatch ${roomState.wallColor === color ? 'selected' : ''}"
                             style="background: ${color}"
                             data-color="${color}"
                             data-type="wall"></div>
                    `).join('')}
                </div>
            </div>

            <div class="color-section">
                <div class="color-section-title">
                    🟫 Floor Color
                </div>
                <div class="color-grid">
                    ${floorColors.map(color => `
                        <div class="color-swatch ${roomState.floorColor === color ? 'selected' : ''}"
                             style="background: ${color}"
                             data-color="${color}"
                             data-type="floor"></div>
                    `).join('')}
                </div>
            </div>

            <div class="color-section">
                <div class="color-section-title">
                    🪵 Floor Texture
                </div>
                <div class="texture-options">
                    ${Object.entries(RoomManager.FLOOR_TEXTURES).map(([key, texture]) => `
                        <div class="texture-option ${roomState.floorTexture === key ? 'selected' : ''}"
                             data-texture="${key}">
                            <div class="texture-icon">${texture.icon}</div>
                            <div class="texture-name">${texture.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="color-section">
                <div class="color-section-title">
                    💡 Lighting
                </div>
                <div class="texture-options">
                    <div class="texture-option ${roomState.lighting === 'cozy' ? 'selected' : ''}"
                         data-lighting="cozy">
                        <div class="texture-icon">🕯️</div>
                        <div class="texture-name">Cozy</div>
                    </div>
                    <div class="texture-option ${roomState.lighting === 'bright' ? 'selected' : ''}"
                         data-lighting="bright">
                        <div class="texture-icon">☀️</div>
                        <div class="texture-name">Bright</div>
                    </div>
                    <div class="texture-option ${roomState.lighting === 'soft' ? 'selected' : ''}"
                         data-lighting="soft">
                        <div class="texture-icon">🌅</div>
                        <div class="texture-name">Soft</div>
                    </div>
                    <div class="texture-option ${roomState.lighting === 'natural' ? 'selected' : ''}"
                         data-lighting="natural">
                        <div class="texture-icon">🌿</div>
                        <div class="texture-name">Natural</div>
                    </div>
                </div>
            </div>
        `;

        // Add click handlers
        content.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                const type = swatch.dataset.type;
                
                if (type === 'wall') {
                    RoomManager.updateRoomCustomization({ wallColor: color });
                } else {
                    RoomManager.updateRoomCustomization({ floorColor: color });
                }
                
                renderWallsTab(content);
            });
        });

        content.querySelectorAll('.texture-option[data-texture]').forEach(opt => {
            opt.addEventListener('click', () => {
                RoomManager.updateRoomCustomization({ 
                    floorTexture: opt.dataset.texture 
                });
                renderWallsTab(content);
            });
        });

        content.querySelectorAll('.texture-option[data-lighting]').forEach(opt => {
            opt.addEventListener('click', () => {
                RoomManager.updateRoomCustomization({ 
                    lighting: opt.dataset.lighting 
                });
                renderWallsTab(content);
            });
        });
    }

    /**
     * Render window view tab
     */
    function renderWindowTab(content) {
        const roomState = RoomManager.getCurrentRoomState();
        
        content.innerHTML = `
            <div class="view-grid">
                ${Object.entries(RoomManager.WINDOW_VIEWS).map(([key, view]) => `
                    <div class="view-option ${roomState.windowView === key ? 'selected' : ''}"
                         data-view="${key}">
                        <div class="view-icon">${view.icon}</div>
                        <div class="view-info">
                            <div class="view-name">${view.name}</div>
                            <div class="view-desc">${view.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        content.querySelectorAll('.view-option').forEach(opt => {
            opt.addEventListener('click', () => {
                RoomManager.updateRoomCustomization({ 
                    windowView: opt.dataset.view 
                });
                renderWindowTab(content);
            });
        });
    }

    /**
     * Select furniture for placement
     */
    function selectFurniture(type) {
        selectedItem = selectedItem === type ? null : type;
        renderContent();
        
        // Dispatch event for game to handle placement
        const event = new CustomEvent('furnitureSelected', {
            detail: { type: selectedItem }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get selected furniture
     */
    function getSelectedFurniture() {
        return selectedItem;
    }

    /**
     * Show the panel
     */
    function show() {
        panel?.classList.add('visible');
        isVisible = true;
        renderContent();
    }

    /**
     * Hide the panel
     */
    function hide() {
        panel?.classList.remove('visible');
        isVisible = false;
        selectedItem = null;
    }

    /**
     * Toggle panel visibility
     */
    function toggle() {
        if (isVisible) {
            hide();
        } else {
            show();
        }
    }

    /**
     * Check if panel is visible
     */
    function isPanelVisible() {
        return isVisible;
    }

    /**
     * Show first-time tutorial
     */
    function showTutorial() {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-card">
                <div class="tutorial-emoji">🏠</div>
                <div class="tutorial-title">Welcome to Your Cozy Home!</div>
                <div class="tutorial-text">
                    Your home is empty and waiting for your personal touch!
                    <br><br>
                    🪑 Select furniture from the catalog<br>
                    🎨 Customize walls and floors<br>
                    🪟 Choose your window view<br>
                    🐱 Celest will explore and use your furniture!
                </div>
                <button class="tutorial-btn" onclick="this.closest('.tutorial-overlay').remove()">
                    Let's Decorate! ✨
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // Public API
    return {
        init,
        show,
        hide,
        toggle,
        isPanelVisible,
        getSelectedFurniture,
        showTutorial,
        switchTab
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DecorationPanel;
}