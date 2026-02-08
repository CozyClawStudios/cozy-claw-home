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
                // Large items (3.5rem)
                { emoji: '🛋️', name: 'Couch', size: 'large' },
                { emoji: '🛏️', name: 'Bed', size: 'large' },
                { emoji: '📺', name: 'TV', size: 'large' },
                { emoji: '📚', name: 'Books', size: 'large' },
                { emoji: '📦', name: 'Box', size: 'large' },
                
                // Medium items (2.5rem)
                { emoji: '🪴', name: 'Plant', size: 'medium' },
                { emoji: '🖼️', name: 'Painting', size: 'medium' },
                { emoji: '🧸', name: 'Teddy', size: 'medium' },
                { emoji: '🎸', name: 'Guitar', size: 'medium' },
                { emoji: '🏺', name: 'Vase', size: 'medium' },
                { emoji: '💻', name: 'Computer', size: 'medium' },
                { emoji: '🪑', name: 'Chair', size: 'medium' },
                { emoji: '📻', name: 'Radio', size: 'medium' },
                
                // Small items (1.8rem)
                { emoji: '🕯️', name: 'Candle', size: 'small' },
                { emoji: '🏵️', name: 'Flower', size: 'small' },
                { emoji: '⏰', name: 'Clock', size: 'small' },
                { emoji: '📷', name: 'Camera', size: 'small' },
                { emoji: '🎮', name: 'Gamepad', size: 'small' },
                { emoji: '🍕', name: 'Pizza', size: 'small' },
                { emoji: '🍹', name: 'Drink', size: 'small' }
            ];
            
            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #ff9a9e; font-size: 1.3rem;">🎨 Decorate</h2>
                    <button onclick="decorPanel.close()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    ${items.map((item, index) => `
                        <div class="decor-item" data-emoji="${item.emoji}" data-size="${item.size}" data-name="${item.name}" onclick="decorPanel.placeItem({emoji: '${item.emoji}', size: '${item.size}', name: '${item.name}'})" style="
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
                            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 4px;">${item.size}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,154,158,0.1); border-radius: 12px; font-size: 0.85rem; color: rgba(255,255,255,0.7);">
                    💡 <strong>Controls:</strong><br>
                    • Click item to place<br>
                    • Drag to move<br>
                    • Scroll wheel to resize<br>
                    • Right-click to cycle sizes<br>
                    • Double-click to remove
                </div>
                
                <div style="margin-top: 20px;">
                    <h3 style="color: #ff9a9e; font-size: 1rem; margin-bottom: 12px;">🏠 Switch Room</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <button onclick="switchRoom('living')" style="background: rgba(255,255,255,0.1); border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🛋️ Living</button>
                        <button onclick="switchRoom('bedroom')" style="background: rgba(255,255,255,0.1); border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🛏️ Bedroom</button>
                        <button onclick="switchRoom('kitchen')" style="background: rgba(255,255,255,0.1); border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🍳 Kitchen</button>
                        <button onclick="switchRoom('office')" style="background: rgba(255,255,255,0.1); border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">💼 Office</button>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h3 style="color: #ff9a9e; font-size: 1rem; margin-bottom: 12px;">🎨 Room Style</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <button onclick="setRoomTheme('cozy')" style="background: #3a3a55; border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🏠 Cozy</button>
                        <button onclick="setRoomTheme('modern')" style="background: #2a2a3a; border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🏢 Modern</button>
                        <button onclick="setRoomTheme('nature')" style="background: #2d3d2d; border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🌿 Nature</button>
                        <button onclick="setRoomTheme('futuristic')" style="background: #0d0d1a; border: 2px solid transparent; padding: 12px; border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#ff9a9e'" onmouseout="this.style.borderColor='transparent'">🚀 Future</button>
                    </div>
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
    
    placeItem(itemData) {
        const room = document.querySelector('.room');
        
        // Handle both old string format and new object format
        const emoji = typeof itemData === 'string' ? itemData : itemData.emoji;
        const size = typeof itemData === 'string' ? 'medium' : (itemData.size || 'medium');
        const name = typeof itemData === 'string' ? 'item' : itemData.name;
        
        // Size map
        const sizeMap = {
            small: '1.8rem',
            medium: '2.5rem',
            large: '3.5rem'
        };
        
        // Create placed item
        const item = document.createElement('div');
        item.style.cssText = `
            position: absolute;
            font-size: ${sizeMap[size]};
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
        
        // Scroll wheel to resize
        item.addEventListener('wheel', (e) => {
            e.preventDefault();
            const currentSize = parseFloat(item.style.fontSize);
            const newSize = e.deltaY < 0 ? currentSize * 1.1 : currentSize * 0.9;
            // Clamp between 0.5rem and 8rem
            const clampedSize = Math.max(0.5, Math.min(8, newSize));
            item.style.fontSize = `${clampedSize}rem`;
        });
        
        // Right-click to cycle size presets
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const sizes = ['1rem', '1.5rem', '2rem', '2.5rem', '3rem', '4rem', '5rem'];
            const currentSize = item.style.fontSize;
            const currentIndex = sizes.indexOf(currentSize);
            const nextIndex = (currentIndex + 1) % sizes.length;
            item.style.fontSize = sizes[nextIndex];
        });
        
        // Double click to remove
        item.addEventListener('dblclick', () => {
            item.remove();
        });
        
        room.appendChild(item);
        
        // Close panel
        this.close();
        
        // Celest reacts
        addMessage('Celest', `Ooh, that ${name} looks nice! ✨`, true);
    }
};

// ==================== ROOM THEME FUNCTIONS ====================

function setRoomTheme(themeName) {
    const room = document.querySelector('.room');
    const roomLabel = document.getElementById('roomLabel');
    
    // Remove existing theme classes
    room.classList.remove('theme-cozy', 'theme-modern', 'theme-nature', 'theme-futuristic');
    
    // Add new theme class
    room.classList.add(`theme-${themeName}`);
    
    // Update room label
    const themeNames = {
        'cozy': '🏠 Cozy Room',
        'modern': '🏢 Modern Room',
        'nature': '🌿 Nature Room',
        'futuristic': '🚀 Future Room'
    };
    if (roomLabel) {
        roomLabel.textContent = themeNames[themeName] || '🏠 Living Room';
    }
    
    // Save theme preference
    localStorage.setItem('roomTheme', themeName);
    
    // Celest reacts to theme change
    const reactions = {
        'cozy': 'So warm and cozy! I love it! 🥰',
        'modern': 'Very sleek and modern! Nice choice! ✨',
        'nature': 'Bringing the outdoors in! I feel refreshed! 🌿',
        'futuristic': 'Whoa, feels like we\'re in space! 🚀'
    };
    addMessage('Celest', reactions[themeName] || 'Looking good! ✨', true);
}

// Load saved theme on page load
function loadRoomTheme() {
    const savedTheme = localStorage.getItem('roomTheme');
    if (savedTheme) {
        setRoomTheme(savedTheme);
    }
}

// ==================== ROOM SWITCHING ====================

const rooms = {
    living: { name: 'Living Room', icon: '🛋️', wall: '#3a3a55', floor: '#3d3d5c' },
    bedroom: { name: 'Bedroom', icon: '🛏️', wall: '#4a3a55', floor: '#4d3d5c' },
    kitchen: { name: 'Kitchen', icon: '🍳', wall: '#3a4a55', floor: '#3d4d5c' },
    office: { name: 'Office', icon: '💼', wall: '#2a3a4a', floor: '#2d3d4d' }
};

function switchRoom(roomId) {
    const roomData = rooms[roomId];
    if (!roomData) return;
    
    // Update room label
    const roomLabel = document.getElementById('roomLabel');
    if (roomLabel) {
        roomLabel.textContent = `${roomData.icon} ${roomData.name}`;
    }
    
    // Update CSS variables for room colors
    const room = document.querySelector('.room');
    if (room) {
        room.style.setProperty('--wall-color', roomData.wall);
        room.style.setProperty('--floor-color', roomData.floor);
    }
    
    // Save preference
    localStorage.setItem('currentRoom', roomId);
    
    // Clear current items (optional - or we could save/load per room)
    document.querySelectorAll('.placement-item').forEach(el => el.remove());
    
    // Celest reacts
    addMessage('Celest', `Welcome to the ${roomData.name}! ${roomData.icon}✨`, true);
}

function loadSavedRoom() {
    const savedRoom = localStorage.getItem('currentRoom');
    if (savedRoom && rooms[savedRoom]) {
        switchRoom(savedRoom);
    }
}

// ==================== AI ITEM RESIZE ====================

// Function for AI to resize any item
function resizeItem(itemEmoji, newSizeRem) {
    const items = document.querySelectorAll('.room > div');
    for (const item of items) {
        if (item.textContent === itemEmoji) {
            item.style.fontSize = `${newSizeRem}rem`;
            return true;
        }
    }
    return false;
}

// Function for AI to resize all items of a type
function resizeAllItems(itemEmoji, newSizeRem) {
    let count = 0;
    const items = document.querySelectorAll('.room > div');
    for (const item of items) {
        if (item.textContent === itemEmoji) {
            item.style.fontSize = `${newSizeRem}rem`;
            count++;
        }
    }
    return count;
}

// Make functions available globally for AI
window.resizeItem = resizeItem;
window.resizeAllItems = resizeAllItems;
window.switchRoom = switchRoom;

// ==================== INITIALIZATION ====================

function init() {
    loadSettings();
    loadRoomTheme();
    loadSavedRoom();
    updateMemoryCount();
    
    console.log('🏠 Cozy Claw Home initialized');
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
