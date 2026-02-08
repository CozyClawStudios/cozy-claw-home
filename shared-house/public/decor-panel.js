/**
 * Simple Decoration Panel
 */

class DecorPanel {
    constructor() {
        this.isOpen = false;
        this.selectedItem = null;
        this.placements = [];
        this.catalog = [];
        this.currentTheme = 'default';
        this.categories = ['seating', 'tables', 'storage', 'decor', 'views'];
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.loadCatalog();
        this.loadPlacements();
        
        // Listen for updates
        if (window.socket) {
            window.socket.on('decor:changed', () => this.loadPlacements());
        }
    }
    
    createPanel() {
        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'decorPanel';
        panel.style.cssText = `
            position: fixed;
            top: 0;
            right: -350px;
            width: 350px;
            height: 100vh;
            background: #1a1a2e;
            border-left: 1px solid rgba(255,255,255,0.1);
            z-index: 1000;
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
            color: white;
            font-family: sans-serif;
        `;
        
        panel.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between;">
                <h2 style="margin: 0; color: #ff9a9e;">🎨 Decorate</h2>
                <button onclick="decorPanel.close()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">×</button>
            </div>
            <div id="decorTabs" style="display: flex; gap: 5px; padding: 10px; overflow-x: auto;">
                ${this.categories.map(c => `
                    <button onclick="decorPanel.selectCategory('${c}')" style="background: rgba(255,255,255,0.1); border: none; padding: 8px 12px; border-radius: 8px; color: white; cursor: pointer; white-space: nowrap;">
                        ${c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                `).join('')}
            </div>
            <div id="decorCatalog" style="flex: 1; overflow-y: auto; padding: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;"></div>
            <div style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                <button onclick="decorPanel.clearRoom()" style="width: 100%; background: #ef4444; border: none; padding: 12px; border-radius: 8px; color: white; cursor: pointer;">Clear Room</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    }
    
    async loadCatalog(category = 'seating') {
        try {
            const res = await fetch(`/api/decor/catalog?category=${category}`);
            this.catalog = await res.json();
            this.renderCatalog();
        } catch (e) {
            console.error('Failed to load catalog:', e);
        }
    }
    
    async loadPlacements() {
        try {
            const res = await fetch(`/api/decor/placements?theme=${this.currentTheme}`);
            this.placements = await res.json();
            this.renderPlacements();
        } catch (e) {
            console.error('Failed to load placements:', e);
        }
    }
    
    renderCatalog() {
        const el = document.getElementById('decorCatalog');
        el.innerHTML = this.catalog.map(item => `
            <div onclick="decorPanel.selectItem('${item.id}')" style="
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid ${this.selectedItem === item.id ? '#ff9a9e' : 'transparent'};
            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                <div style="font-size: 2rem;">${item.icon}</div>
                <div style="font-size: 0.8rem; margin-top: 5px;">${item.name}</div>
            </div>
        `).join('');
    }
    
    selectCategory(category) {
        this.loadCatalog(category);
    }
    
    selectItem(itemId) {
        this.selectedItem = itemId;
        this.renderCatalog();
        
        // Enable placement mode
        this.enablePlacementMode();
    }
    
    enablePlacementMode() {
        const room = document.querySelector('.room');
        if (!room) return;
        
        room.style.cursor = 'crosshair';
        room.onclick = (e) => {
            if (!this.selectedItem) return;
            
            const rect = room.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / (rect.width / 20));
            const y = Math.floor((e.clientY - rect.top) / (rect.height / 15));
            
            this.placeItem(this.selectedItem, x, y);
            
            // Reset
            this.selectedItem = null;
            this.renderCatalog();
            room.style.cursor = '';
            room.onclick = null;
        };
        
        showThought('Click anywhere in the room to place item!');
    }
    
    async placeItem(itemId, x, y) {
        try {
            await fetch('/api/decor/place', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, x, y, themeId: this.currentTheme })
            });
            this.loadPlacements();
        } catch (e) {
            console.error('Failed to place item:', e);
        }
    }
    
    renderPlacements() {
        // Remove old placements
        document.querySelectorAll('.decor-item-placed').forEach(el => el.remove());
        
        const room = document.querySelector('.room');
        if (!room) return;
        
        for (const p of this.placements) {
            const el = document.createElement('div');
            el.className = 'decor-item-placed';
            el.style.cssText = `
                position: absolute;
                left: ${(p.x / 20) * 100}%;
                top: ${(p.y / 15) * 100}%;
                font-size: 2rem;
                cursor: pointer;
                user-select: none;
                z-index: 10;
            `;
            el.innerHTML = p.icon;
            el.title = p.name;
            el.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Remove ${p.name}?`)) {
                    this.removeItem(p.id);
                }
            };
            room.appendChild(el);
        }
    }
    
    async removeItem(placementId) {
        try {
            await fetch(`/api/decor/place/${placementId}`, { method: 'DELETE' });
            this.loadPlacements();
        } catch (e) {
            console.error('Failed to remove item:', e);
        }
    }
    
    async clearRoom() {
        if (!confirm('Clear all items?')) return;
        try {
            await fetch(`/api/decor/clear?theme=${this.currentTheme}`, { method: 'DELETE' });
            this.loadPlacements();
        } catch (e) {
            console.error('Failed to clear room:', e);
        }
    }
    
    open() {
        this.isOpen = true;
        this.panel.style.right = '0';
    }
    
    close() {
        this.isOpen = false;
        this.panel.style.right = '-350px';
    }
}

// Initialize
decorPanel = new DecorPanel();
