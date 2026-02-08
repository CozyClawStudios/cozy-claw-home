/**
 * Cozy Claw Home - Celest Companion
 * A cozy personal space with your AI companion
 */

// ==================== APP STATE ====================
const app = {
    memories: [],
    isFirstLoad: !localStorage.getItem('cozyHomeVisited'),
    settings: {
        voiceEnabled: true,
        initiativeEnabled: true,
        energy: 2
    },
    celest: {
        mood: 'happy',
        activity: 'relaxing'
    }
};

// ==================== WELCOME & FIRST-TIME EXPERIENCE ====================

function enterHouse() {
    const overlay = document.getElementById('welcomeOverlay');
    overlay.classList.add('hidden');
    
    // Check if first time user
    if (app.isFirstLoad) {
        localStorage.setItem('cozyHomeVisited', 'true');
        
        // Show Celest's welcome message after a short delay
        setTimeout(() => {
            showWelcomeMessage();
        }, 800);
        
        // Start tutorial highlight on decorate button
        setTimeout(() => {
            startTutorialHighlight();
        }, 1500);
    }
}

function showWelcomeMessage() {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    
    if (hour >= 12 && hour < 17) {
        greeting = 'Good afternoon';
    } else if (hour >= 17) {
        greeting = 'Good evening';
    }
    
    const message = `${greeting}! Ready to decorate?`;
    
    // Show in thought bubble
    const thoughtBubble = document.getElementById('thoughtBubble');
    thoughtBubble.textContent = message;
    thoughtBubble.classList.add('visible');
    
    // Also add to chat history
    addMessage('Celest', message, true);
    
    // Hide after 5 seconds
    setTimeout(() => {
        thoughtBubble.classList.remove('visible');
    }, 5000);
}

function startTutorialHighlight() {
    const decorateBtn = document.getElementById('decorateBtn');
    if (decorateBtn) {
        decorateBtn.classList.add('tutorial-highlight');
        
        // Add tooltip
        decorateBtn.title = 'Click here to decorate your room!';
        
        // Remove highlight when clicked
        decorateBtn.addEventListener('click', () => {
            decorateBtn.classList.remove('tutorial-highlight');
            decorateBtn.title = 'Decorate';
        }, { once: true });
    }
}

// ==================== CHAT SYSTEM ====================

function addMessage(sender, text, isAgent = false) {
    const history = document.getElementById('messageHistory');
    if (!history) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isAgent ? 'agent' : 'user'}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div>${text}</div>
        <div class="message-time">${sender} • ${time}</div>
    `;
    
    history.appendChild(messageDiv);
    history.scrollTop = history.scrollHeight;
    
    // Update memory count
    if (isAgent) {
        app.memories.push({ sender, text, time: Date.now() });
        updateMemoryCount();
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    addMessage('You', text, false);
    input.value = '';
    
    // Simulate Celest's response
    setTimeout(() => {
        const responses = [
            "That's interesting! Tell me more.",
            "I love chatting with you! 💕",
            "Hmm, let me think about that...",
            "You're so creative! ✨",
            "Want to decorate the room together?",
            "This is so cozy! 🏠"
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        addMessage('Celest', response, true);
        
        // Show in thought bubble too
        const thoughtBubble = document.getElementById('thoughtBubble');
        thoughtBubble.textContent = response;
        thoughtBubble.classList.add('visible');
        
        setTimeout(() => {
            thoughtBubble.classList.remove('visible');
        }, 3000);
    }, 1000);
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// ==================== VOICE INPUT ====================

function toggleVoice() {
    const btn = document.getElementById('voiceBtn');
    
    if (btn.classList.contains('recording')) {
        btn.classList.remove('recording');
        // Stop recording logic would go here
    } else {
        btn.classList.add('recording');
        // Start recording logic would go here
        
        // Simulate voice input after 2 seconds
        setTimeout(() => {
            btn.classList.remove('recording');
            const voiceMessages = [
                "Hey Celest!",
                "Let's decorate",
                "What do you think?",
                "This looks nice"
            ];
            const randomMsg = voiceMessages[Math.floor(Math.random() * voiceMessages.length)];
            document.getElementById('chatInput').value = randomMsg;
            sendMessage();
        }, 2000);
    }
}

// ==================== AGENT INTERACTION ====================

function clickAgent() {
    const agent = document.getElementById('agent');
    const thoughtBubble = document.getElementById('thoughtBubble');
    
    // Change mood
    const moods = ['happy', 'sleepy', 'focused'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    agent.className = `agent mood-${randomMood}`;
    
    // Show random thought
    const thoughts = [
        "I love this room! 🏠",
        "You're the best! 💕",
        "*happy wiggle*",
        "Want to chat?",
        "This is so cozy! ✨",
        "*blink blink*"
    ];
    const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
    
    thoughtBubble.textContent = thought;
    thoughtBubble.classList.add('visible');
    
    setTimeout(() => {
        thoughtBubble.classList.remove('visible');
    }, 3000);
}

// ==================== MODALS ====================

function openMemoryPanel() {
    const modal = document.getElementById('memoryModal');
    modal.classList.add('visible');
    updateMemoryStats();
}

function openToolsPanel() {
    const modal = document.getElementById('toolsModal');
    const grid = document.getElementById('toolsGrid');
    
    // Populate tools if empty
    if (!grid.innerHTML.trim()) {
        const tools = [
            { icon: '🎨', name: 'Decoration', status: 'Active' },
            { icon: '📅', name: 'Calendar', status: 'Connected' },
            { icon: '📝', name: 'Notes', status: 'Ready' },
            { icon: '🎵', name: 'Music', status: 'Paused' },
            { icon: '🌤️', name: 'Weather', status: 'Updated' },
            { icon: '⚡', name: 'Automation', status: 'Idle' }
        ];
        
        tools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.innerHTML = `
                <div class="tool-icon">${tool.icon}</div>
                <div class="tool-name">${tool.name}</div>
                <div class="tool-status">${tool.status}</div>
            `;
            grid.appendChild(card);
        });
    }
    
    modal.classList.add('visible');
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('visible');
}

function closeModal(event, modalId) {
    if (event.target === event.currentTarget) {
        document.getElementById(modalId).classList.remove('visible');
    }
}

function closeModalDirect(modalId) {
    document.getElementById(modalId).classList.remove('visible');
}

// ==================== MEMORY & STATS ====================

function updateMemoryCount() {
    const countEl = document.getElementById('memoryCount');
    if (countEl) {
        countEl.textContent = app.memories.length;
    }
}

function updateMemoryStats() {
    const totalEl = document.getElementById('statTotal');
    const recentEl = document.getElementById('statRecent');
    const listEl = document.getElementById('memoryList');
    
    if (totalEl) totalEl.textContent = app.memories.length;
    
    // Count memories from this week
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentCount = app.memories.filter(m => m.time > weekAgo).length;
    if (recentEl) recentEl.textContent = recentCount;
    
    // Populate list
    if (listEl) {
        listEl.innerHTML = '';
        
        if (app.memories.length === 0) {
            listEl.innerHTML = `
                <div class="memory-item" style="opacity: 0.6;">
                    <div class="memory-icon">💭</div>
                    <div class="memory-content">
                        <div class="memory-text">No memories yet. Start chatting with Celest!</div>
                    </div>
                </div>
            `;
        } else {
            [...app.memories].reverse().slice(0, 10).forEach(memory => {
                const date = new Date(memory.time).toLocaleDateString();
                const item = document.createElement('div');
                item.className = 'memory-item';
                item.innerHTML = `
                    <div class="memory-icon">💬</div>
                    <div class="memory-content">
                        <div class="memory-text">${memory.text}</div>
                        <div class="memory-meta">${memory.sender} • ${date}</div>
                    </div>
                `;
                listEl.appendChild(item);
            });
        }
    }
}

// ==================== SETTINGS ====================

function toggleSetting(setting) {
    const toggle = document.getElementById(setting + 'Toggle');
    toggle.classList.toggle('active');
    
    app.settings[setting + 'Enabled'] = toggle.classList.contains('active');
    
    // Save to localStorage
    localStorage.setItem('cozyHomeSettings', JSON.stringify(app.settings));
}

function updateEnergy(value) {
    const label = document.getElementById('energyValue');
    const levels = ['Chill', 'Normal', 'Hyper'];
    label.textContent = levels[value - 1];
    
    app.settings.energy = parseInt(value);
    localStorage.setItem('cozyHomeSettings', JSON.stringify(app.settings));
}

function loadSettings() {
    const saved = localStorage.getItem('cozyHomeSettings');
    if (saved) {
        try {
            app.settings = { ...app.settings, ...JSON.parse(saved) };
            
            // Apply saved settings
            const voiceToggle = document.getElementById('voiceToggle');
            const initiativeToggle = document.getElementById('initiativeToggle');
            
            if (voiceToggle && !app.settings.voiceEnabled) {
                voiceToggle.classList.remove('active');
            }
            if (initiativeToggle && !app.settings.initiativeEnabled) {
                initiativeToggle.classList.remove('active');
            }
        } catch (e) {
            console.warn('Failed to load settings');
        }
    }
}

// ==================== DECORATION PANEL ====================

const decorPanel = {
    isOpen: false,
    
    open() {
        this.isOpen = true;
        // Create panel if doesn't exist
        let panel = document.getElementById('decorPanel');
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'decorPanel';
            panel.style.cssText = `
                position: fixed;
                top: 0;
                right: 0;
                width: 300px;
                height: 100vh;
                background: var(--bg-room, #1a1a2e);
                border-left: 1px solid rgba(255,255,255,0.1);
                z-index: 50;
                padding: 20px;
                overflow-y: auto;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            
            const items = [
                { emoji: '🪴', name: 'Plant' },
                { emoji: '🖼️', name: 'Painting' },
                { emoji: '🛋️', name: 'Couch' },
                { emoji: '📚', name: 'Books' },
                { emoji: '🕯️', name: 'Candle' },
                { emoji: '🧸', name: 'Teddy' },
                { emoji: '🎸', name: 'Guitar' },
                { emoji: '🏺', name: 'Vase' }
            ];
            
            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #ff9a9e; font-size: 1.3rem;">🎨 Decorate</h2>
                    <button onclick="decorPanel.close()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    ${items.map(item => `
                        <div class="decor-item" onclick="decorPanel.placeItem('${item.emoji}')" style="
                            background: rgba(255,255,255,0.05);
                            padding: 20px;
                            border-radius: 12px;
                            text-align: center;
                            cursor: pointer;
                            transition: all 0.3s;
                            border: 2px solid transparent;
                        " onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">
                            <div style="font-size: 2rem; margin-bottom: 8px;">${item.emoji}</div>
                            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">${item.name}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,154,158,0.1); border-radius: 12px; font-size: 0.85rem; color: rgba(255,255,255,0.7);">
                    💡 Click an item to place it in your room!
                </div>
            `;
            
            document.body.appendChild(panel);
        }
        
        // Show panel
        requestAnimationFrame(() => {
            panel.style.transform = 'translateX(0)';
        });
    },
    
    close() {
        this.isOpen = false;
        const panel = document.getElementById('decorPanel');
        if (panel) {
            panel.style.transform = 'translateX(100%)';
        }
    },
    
    placeItem(emoji) {
        const room = document.querySelector('.room');
        
        // Create placed item
        const item = document.createElement('div');
        item.style.cssText = `
            position: absolute;
            font-size: 2.5rem;
            cursor: move;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            animation: place-in 0.3s ease;
            left: ${20 + Math.random() * 60}%;
            top: ${30 + Math.random() * 40}%;
            z-index: 3;
        `;
        item.textContent = emoji;
        
        // Make draggable
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        item.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = item.offsetLeft;
            initialTop = item.offsetTop;
            item.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            item.style.left = `${initialLeft + dx}px`;
            item.style.top = `${initialTop + dy}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            item.style.cursor = 'move';
        });
        
        // Double click to remove
        item.addEventListener('dblclick', () => {
            item.remove();
        });
        
        room.appendChild(item);
        
        // Close panel
        this.close();
        
        // Celest reacts
        addMessage('Celest', `Ooh, that ${emoji} looks nice! ✨`, true);
    }
};

// ==================== INITIALIZATION ====================

let roomRenderer;
let layerPanel;

async function init() {
    loadSettings();
    updateMemoryCount();
    
    // Initialize layered room system
    try {
        // Create room renderer
        roomRenderer = new RoomRenderer('room', {
            gridWidth: 20,
            gridHeight: 15
        });
        
        // Load room state
        await roomRenderer.loadRoomState('main');
        
        // Create layer panel
        layerPanel = new LayerPanel({
            position: 'right',
            width: 350
        });
        layerPanel.setRoomRenderer(roomRenderer);
        
        // Replace old decor panel with new layer panel
        window.decorPanel = {
            open: () => layerPanel.open(),
            close: () => layerPanel.close(),
            toggle: () => layerPanel.toggle()
        };
        
        // Set up room event listeners
        document.addEventListener('room:itemMove', async (e) => {
            try {
                await fetch(`/api/room/item/${e.detail.id}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ x: e.detail.x, y: e.detail.y })
                });
            } catch (err) {
                console.error('Failed to move item:', err);
            }
        });
        
        document.addEventListener('room:itemRemove', async (e) => {
            try {
                await fetch(`/api/room/item/${e.detail.id}`, {
                    method: 'DELETE'
                });
            } catch (err) {
                console.error('Failed to remove item:', err);
            }
        });
        
        document.addEventListener('room:itemDrop', async (e) => {
            const { x, y, itemId, layer } = e.detail;
            try {
                // Find item in catalog to get details
                const catalogItem = layerPanel.catalog.find(i => i.id === itemId);
                await roomRenderer.placeItem({
                    itemType: catalogItem?.category || 'decor',
                    itemKey: itemId,
                    x,
                    y,
                    layer,
                    icon: catalogItem?.icon || '📦',
                    name: catalogItem?.name || 'Item'
                });
            } catch (err) {
                console.error('Failed to place item:', err);
            }
        });
        
        console.log('🏠 Layered room system initialized');
    } catch (err) {
        console.error('Failed to initialize layered room system:', err);
    }
    
    console.log('🏠 Cozy Claw Home initialized');
    console.log('First load:', app.isFirstLoad);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ==================== EXPORTS ====================
window.app = app;
window.enterHouse = enterHouse;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.toggleVoice = toggleVoice;
window.clickAgent = clickAgent;
window.openMemoryPanel = openMemoryPanel;
window.openToolsPanel = openToolsPanel;
window.openSettings = openSettings;
window.closeModal = closeModal;
window.closeModalDirect = closeModalDirect;
window.toggleSetting = toggleSetting;
window.updateEnergy = updateEnergy;
window.decorPanel = decorPanel;
window.roomRenderer = roomRenderer;
window.layerPanel = layerPanel;
