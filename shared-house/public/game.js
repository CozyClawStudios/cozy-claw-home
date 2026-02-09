/**
 * Cozy Claw Home - Celest Companion
 * A cozy personal space with your AI companion
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    // OpenClaw Bridge Connection
    // Set to null to disable OpenClaw connection (use local responses only)
    // Or set to your OpenClaw WebSocket URL: 'ws://localhost:8080/clawbot'
    OPENCLAW_WS_URL: localStorage.getItem('openclawUrl') || 'ws://localhost:8080/clawbot',
    
    // Enable/disable OpenClaw connection
    OPENCLAW_ENABLED: localStorage.getItem('openclawEnabled') !== 'false',
    
    // Local response fallback when OpenClaw is disabled
    USE_LOCAL_RESPONSES: true
};

// ==================== OPENCLAW CONNECTION ====================

let openclawSocket = null;
window.openclawConnected = false;

function connectToOpenClaw() {
    // Skip if disabled
    if (!CONFIG.OPENCLAW_ENABLED || !CONFIG.OPENCLAW_WS_URL) {
        console.log('ℹ️ OpenClaw connection disabled, using local mode');
        window.openclawConnected = false;
        return;
    }
    
    // Test HTTP connection to OpenClaw
    const testUrl = CONFIG.OPENCLAW_WS_URL.replace('ws://', 'http://').replace('/clawbot', '');
    fetch(`${testUrl}/api/status`, { method: 'GET' })
        .then(() => {
            console.log('✅ OpenClaw HTTP reachable');
            window.openclawConnected = true;
        })
        .catch(() => {
            console.log('⚠️ OpenClaw not reachable, using local mode');
            window.openclawConnected = false;
        });
}

window.sendToOpenClaw = async function(text) {
    try {
        const baseUrl = CONFIG.OPENCLAW_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://').replace('/clawbot', '');
        const response = await fetch(`${baseUrl}/api/v1/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                session: 'cozy-claw-home',
                context: {
                    room: currentRoomId,
                    source: 'cozy-claw-home'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && (data.response || data.text || data.message)) {
            const reply = data.response || data.text || data.message;
            addMessage('Celest', reply, true);
            
            // Show in thought bubble
            const thoughtBubble = document.getElementById('thoughtBubble');
            thoughtBubble.textContent = reply;
            thoughtBubble.classList.add('visible');
            
            setTimeout(() => {
                thoughtBubble.classList.remove('visible');
            }, 3000);
        } else {
            useLocalResponse();
        }
    } catch (e) {
        console.log('⚠️ OpenClaw HTTP error:', e.message);
        window.openclawConnected = false;
        useLocalResponse();
    }
};

function useLocalResponse() {
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
    
    // Check if OpenClaw is connected
    if (window.openclawConnected && window.sendToOpenClaw) {
        // Send to OpenClaw for real AI response
        window.sendToOpenClaw(text);
    } else {
        // Use local fallback loop
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
    
    // Load OpenClaw settings
    loadOpenClawSettings();
}

// ==================== OPENCLAW SETTINGS ====================

function toggleOpenClaw() {
    const enabled = localStorage.getItem('openclawEnabled') !== 'false';
    const newEnabled = !enabled;
    localStorage.setItem('openclawEnabled', newEnabled);
    
    const toggle = document.getElementById('openclawToggle');
    if (toggle) {
        toggle.classList.toggle('active', newEnabled);
    }
    
    // Update CONFIG
    CONFIG.OPENCLAW_ENABLED = newEnabled;
    
    if (newEnabled) {
        connectToOpenClaw();
        addMessage('Celest', 'Connecting to OpenClaw... 🔗', true);
    } else {
        if (openclawSocket) {
            openclawSocket.close();
        }
        window.openclawConnected = false;
        addMessage('Celest', 'Switched to local mode 📴', true);
    }
}

function saveOpenClawUrl(url) {
    localStorage.setItem('openclawUrl', url);
    CONFIG.OPENCLAW_WS_URL = url || null;
}

function loadOpenClawSettings() {
    const enabled = localStorage.getItem('openclawEnabled') !== 'false';
    const url = localStorage.getItem('openclawUrl') || 'ws://localhost:8080/clawbot';
    
    const toggle = document.getElementById('openclawToggle');
    const urlInput = document.getElementById('openclawUrl');
    
    if (toggle) {
        toggle.classList.toggle('active', enabled);
    }
    if (urlInput) {
        urlInput.value = url;
    }
}

function reconnectOpenClaw() {
    if (openclawSocket) {
        openclawSocket.close();
    }
    window.openclawConnected = false;
    
    // Reload settings
    const url = document.getElementById('openclawUrl')?.value || localStorage.getItem('openclawUrl');
    const enabled = localStorage.getItem('openclawEnabled') !== 'false';
    
    CONFIG.OPENCLAW_WS_URL = url || null;
    CONFIG.OPENCLAW_ENABLED = enabled;
    
    if (enabled && url) {
        connectToOpenClaw();
        addMessage('Celest', 'Reconnecting to OpenClaw... 🔄', true);
    } else {
        addMessage('Celest', 'Using local responses 📴', true);
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
                // Furniture (Large)
                { emoji: '🛋️', name: 'Couch', size: 'large', category: 'furniture' },
                { emoji: '🛏️', name: 'Bed', size: 'large', category: 'furniture' },
                { emoji: '📺', name: 'TV', size: 'large', category: 'furniture' },
                { emoji: '🗄️', name: 'Cabinet', size: 'large', category: 'furniture' },
                { emoji: '🪑', name: 'Chair', size: 'medium', category: 'furniture' },
                { emoji: '📦', name: 'Box', size: 'large', category: 'furniture' },
                
                // Decor (Medium)
                { emoji: '🪴', name: 'Plant', size: 'medium', category: 'decor' },
                { emoji: '🖼️', name: 'Painting', size: 'medium', category: 'decor' },
                { emoji: '📚', name: 'Books', size: 'large', category: 'decor' },
                { emoji: '🏺', name: 'Vase', size: 'medium', category: 'decor' },
                { emoji: '🎨', name: 'Art', size: 'large', category: 'decor' },
                { emoji: '🎁', name: 'Gift', size: 'medium', category: 'decor' },
                { emoji: '🎈', name: 'Balloon', size: 'medium', category: 'decor' },
                { emoji: '🎀', name: 'Ribbon', size: 'medium', category: 'decor' },
                { emoji: '🔮', name: 'Crystal', size: 'medium', category: 'decor' },
                
                // Electronics
                { emoji: '💻', name: 'Computer', size: 'medium', category: 'tech' },
                { emoji: '📻', name: 'Radio', size: 'medium', category: 'tech' },
                { emoji: '🎮', name: 'Gamepad', size: 'small', category: 'tech' },
                { emoji: '💡', name: 'Light', size: 'small', category: 'tech' },
                { emoji: '⏰', name: 'Clock', size: 'small', category: 'tech' },
                { emoji: '📷', name: 'Camera', size: 'small', category: 'tech' },
                { emoji: '🔋', name: 'Battery', size: 'small', category: 'tech' },
                
                // Fun Items
                { emoji: '🧸', name: 'Teddy', size: 'medium', category: 'fun' },
                { emoji: '🎸', name: 'Guitar', size: 'medium', category: 'fun' },
                { emoji: '🏆', name: 'Trophy', size: 'large', category: 'fun' },
                { emoji: '🧩', name: 'Puzzle', size: 'large', category: 'fun' },
                { emoji: '👑', name: 'Crown', size: 'medium', category: 'fun' },
                { emoji: '🎪', name: 'Circus', size: 'medium', category: 'fun' },
                { emoji: '🎯', name: 'Target', size: 'medium', category: 'fun' },
                
                // Small Items
                { emoji: '🕯️', name: 'Candle', size: 'small', category: 'small' },
                { emoji: '🏵️', name: 'Flower', size: 'small', category: 'small' },
                { emoji: '🍕', name: 'Pizza', size: 'small', category: 'small' },
                { emoji: '🍹', name: 'Drink', size: 'small', category: 'small' },
                { emoji: '💎', name: 'Gem', size: 'small', category: 'small' },
                { emoji: '🍄', name: 'Mushroom', size: 'small', category: 'small' },
                { emoji: '🌙', name: 'Moon', size: 'small', category: 'small' },
                { emoji: '⭐', name: 'Star', size: 'small', category: 'small' },
                { emoji: '🔥', name: 'Fire', size: 'small', category: 'small' },
                { emoji: '💰', name: 'Money', size: 'small', category: 'small' },
                
                // Kitchen Items (NEW)
                { emoji: '🧊', name: 'Fridge', size: 'large', category: 'furniture' },
                { emoji: '🍳', name: 'Stove', size: 'medium', category: 'furniture' },
                { emoji: '🚰', name: 'Sink', size: 'medium', category: 'furniture' },
                { emoji: '🥘', name: 'Pan', size: 'small', category: 'small' },
                { emoji: '🍽️', name: 'Plate', size: 'small', category: 'small' },
                { emoji: '🥄', name: 'Spoon', size: 'small', category: 'small' },
                { emoji: '🔪', name: 'Knife', size: 'small', category: 'small' },
                { emoji: '🧂', name: 'Salt', size: 'small', category: 'small' },
                { emoji: '🍞', name: 'Bread', size: 'small', category: 'small' },
                { emoji: '🧈', name: 'Butter', size: 'small', category: 'small' },
                { emoji: '🥚', name: 'Eggs', size: 'small', category: 'small' },
                { emoji: '🥛', name: 'Milk', size: 'small', category: 'small' },
                { emoji: '🧀', name: 'Cheese', size: 'small', category: 'small' },
                { emoji: '🍎', name: 'Apple', size: 'small', category: 'small' },
                { emoji: '🍌', name: 'Banana', size: 'small', category: 'small' }
            ];
            
            // Group items by category
            const categories = {
                furniture: { name: '🪑 Furniture', items: items.filter(i => i.category === 'furniture') },
                decor: { name: '🎨 Decor', items: items.filter(i => i.category === 'decor') },
                tech: { name: '💻 Tech', items: items.filter(i => i.category === 'tech') },
                fun: { name: '🎮 Fun', items: items.filter(i => i.category === 'fun') },
                small: { name: '✨ Small', items: items.filter(i => i.category === 'small') }
            };
            
            let itemsHtml = '';
            Object.entries(categories).forEach(([key, cat]) => {
                itemsHtml += `
                    <div style="margin-bottom: 15px;">
                        <div style="font-size: 0.75rem; color: #ff9a9e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${cat.name}</div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                            ${cat.items.map(item => `
                                <div class="decor-item" data-emoji="${item.emoji}" data-size="${item.size}" data-name="${item.name}" 
                                     onclick="decorPanel.placeItem({emoji: '${item.emoji}', size: '${item.size}', name: '${item.name}'})" 
                                     style="
                                        background: rgba(255,255,255,0.05);
                                        padding: 12px 8px;
                                        border-radius: 8px;
                                        text-align: center;
                                        cursor: pointer;
                                        transition: all 0.3s;
                                        border: 2px solid transparent;
                                    " onmouseover="this.style.borderColor='#ff9a9e'; this.style.background='rgba(255,154,158,0.1)'" 
                                       onmouseout="this.style.borderColor='transparent'; this.style.background='rgba(255,255,255,0.05)'"
                                >
                                    <div style="font-size: 1.5rem;">${item.emoji}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; position: sticky; top: 0; background: var(--bg-room, #1a1a2e); padding: 10px 0; z-index: 10;">
                    <h2 style="color: #ff9a9e; font-size: 1.3rem; margin: 0;">🎨 Decorate</h2>
                    <button onclick="decorPanel.close()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                
                <div style="max-height: calc(100vh - 400px); overflow-y: auto; padding-right: 5px;">
                    ${itemsHtml}
                </div>
                
                <div style="margin-top: 15px; padding: 12px; background: rgba(255,154,158,0.1); border-radius: 10px; font-size: 0.75rem; color: rgba(255,255,255,0.7);">
                    <strong style="color: #ff9a9e;">Controls:</strong> Click to place • Drag to move • Scroll to resize • Right-click sizes • Double-click remove
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
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: #ff9a9e; font-size: 1rem; margin-bottom: 12px;">🎨 Custom Colors</h3>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 6px;">Wall Color</label>
                        <input type="color" id="wallColorPicker" onchange="setCustomWallColor(this.value)" style="width: 100%; height: 36px; border: none; border-radius: 8px; cursor: pointer;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 6px;">Floor Color</label>
                        <input type="color" id="floorColorPicker" onchange="setCustomFloorColor(this.value)" style="width: 100%; height: 36px; border: none; border-radius: 8px; cursor: pointer;">
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: #ff9a9e; font-size: 1rem; margin-bottom: 12px;">🪟 Window View</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <button onclick="setWindowView('day')" style="background: linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Day Sky">☀️</button>
                        <button onclick="setWindowView('sunset')" style="background: linear-gradient(180deg, #FF6B6B 0%, #FFE66D 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Sunset">🌅</button>
                        <button onclick="setWindowView('night')" style="background: linear-gradient(180deg, #0B0B2B 0%, #1a1a3e 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Night">🌙</button>
                        <button onclick="setWindowView('city')" style="background: linear-gradient(180deg, #1a1a3e 0%, #2d2d5a 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="City">🌃</button>
                        <button onclick="setWindowView('forest')" style="background: linear-gradient(180deg, #2d5a3d 0%, #4a8c5a 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Forest">🌲</button>
                        <button onclick="setWindowView('beach')" style="background: linear-gradient(180deg, #87CEEB 0%, #F5DEB3 50%, #4ECDC4 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Beach">🏖️</button>
                        <button onclick="setWindowView('space')" style="background: linear-gradient(180deg, #000000 0%, #1a0033 50%, #4a0080 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Space">🚀</button>
                        <button onclick="setWindowView('snow')" style="background: linear-gradient(180deg, #E0F6FF 0%, #FFFFFF 100%); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;" title="Snow">❄️</button>
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
        item.dataset.itemName = name;
        item.dataset.itemEmoji = emoji;
        
        // Click to interact (Celest comments)
        item.addEventListener('click', (e) => {
            if (!isDragging) {
                e.stopPropagation();
                interactWithItem(name, emoji);
            }
        });
        
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
            saveRoomItems(currentRoomId);
        });
        
        // Scroll wheel to resize
        item.addEventListener('wheel', (e) => {
            e.preventDefault();
            const currentSize = parseFloat(item.style.fontSize);
            const newSize = e.deltaY < 0 ? currentSize * 1.1 : currentSize * 0.9;
            // Clamp between 0.5rem and 8rem
            const clampedSize = Math.max(0.5, Math.min(8, newSize));
            item.style.fontSize = `${clampedSize}rem`;
            saveRoomItems(currentRoomId);
        });
        
        // Right-click to cycle size presets
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const sizes = ['1rem', '1.5rem', '2rem', '2.5rem', '3rem', '4rem', '5rem'];
            const currentSize = item.style.fontSize;
            const currentIndex = sizes.indexOf(currentSize);
            const nextIndex = (currentIndex + 1) % sizes.length;
            item.style.fontSize = sizes[nextIndex];
            saveRoomItems(currentRoomId);
        });
        
        // Double click to remove
        item.addEventListener('dblclick', () => {
            item.remove();
            saveRoomItems(currentRoomId);
        });
        
        room.appendChild(item);
        
        // Save to current room
        saveRoomItems(currentRoomId);
        
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

// ==================== CUSTOM COLORS ====================

function setCustomWallColor(color) {
    const room = document.querySelector('.room');
    if (room) {
        room.style.setProperty('--wall-color', color);
        localStorage.setItem('customWallColor', color);
    }
}

function setCustomFloorColor(color) {
    const room = document.querySelector('.room');
    if (room) {
        room.style.setProperty('--floor-color', color);
        localStorage.setItem('customFloorColor', color);
    }
}

// AI can set colors too
function aiSetWallColor(color) {
    setCustomWallColor(color);
    addMessage('Celest', `I changed the wall color! What do you think? 🎨`, true);
}

function aiSetFloorColor(color) {
    setCustomFloorColor(color);
    addMessage('Celest', `New floor color! Looking fresh! ✨`, true);
}

// ==================== WINDOW VIEW ====================

const windowViews = {
    day: { bg: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)', emoji: '☀️', name: 'day sky' },
    sunset: { bg: 'linear-gradient(180deg, #FF6B6B 0%, #FFE66D 100%)', emoji: '🌅', name: 'sunset' },
    night: { bg: 'linear-gradient(180deg, #0B0B2B 0%, #1a1a3e 100%)', emoji: '🌙', name: 'night sky' },
    city: { bg: 'linear-gradient(180deg, #1a1a3e 0%, #2d2d5a 100%)', emoji: '🌃', name: 'city view' },
    forest: { bg: 'linear-gradient(180deg, #2d5a3d 0%, #4a8c5a 100%)', emoji: '🌲', name: 'forest view' },
    beach: { bg: 'linear-gradient(180deg, #87CEEB 0%, #F5DEB3 50%, #4ECDC4 100%)', emoji: '🏖️', name: 'beach view' },
    space: { bg: 'linear-gradient(180deg, #000000 0%, #1a0033 50%, #4a0080 100%)', emoji: '🚀', name: 'space view' },
    snow: { bg: 'linear-gradient(180deg, #E0F6FF 0%, #FFFFFF 100%)', emoji: '❄️', name: 'snowy view' }
};

function setWindowView(viewName) {
    const windowEl = document.querySelector('.window');
    if (windowEl && windowViews[viewName]) {
        windowEl.style.background = windowViews[viewName].bg;
        localStorage.setItem('windowView', viewName);
        
        const view = windowViews[viewName];
        addMessage('Celest', `Nice ${view.name}! ${view.emoji}✨`, true);
        return true;
    }
    return false;
}

// AI can change window view
function aiSetWindowView(viewName) {
    if (setWindowView(viewName)) {
        const view = windowViews[viewName];
        addMessage('Celest', `I changed the window to ${view.name}! ${view.emoji}`, true);
        return true;
    }
    return false;
}

function loadSavedWindowView() {
    const saved = localStorage.getItem('windowView');
    if (saved && windowViews[saved]) {
        setWindowView(saved);
    }
}

// Load saved custom colors
function loadSavedCustomColors() {
    const wallColor = localStorage.getItem('customWallColor');
    const floorColor = localStorage.getItem('customFloorColor');
    if (wallColor) setCustomWallColor(wallColor);
    if (floorColor) setCustomFloorColor(floorColor);
}

// ==================== ITEM INTERACTION ====================

const itemComments = {
    'Couch': ['Comfy couch! 🛋️', 'Perfect for naps!', 'Looks soft!'],
    'Bed': ['Sweet dreams! 🛏️', 'Time to rest!', 'Cozy bed!'],
    'TV': ['What are we watching? 📺', 'Movie night! 🍿', 'Binge time!'],
    'Plant': ['Green thumb! 🌱', 'Love the nature vibes!', 'So fresh!'],
    'Teddy': ['Aww, so cute! 🧸', 'Cuddle buddy!', 'Adorable!'],
    'Guitar': ['Rock on! 🎸', 'Play me a song!', 'Music time!'],
    'Pizza': ['Yum! 🍕', 'Hungry now!', 'Slice me one!'],
    'Computer': ['Coding time? 💻', 'Let\'s build something!', 'Tech vibes!'],
    'Gamepad': ['Game on! 🎮', 'What are we playing?', 'High score!'],
    'Candle': ['So romantic 🕯️', 'Cozy lighting!', 'Warm glow!'],
    'Books': ['Reading time! 📚', 'Knowledge is power!', 'Bookworm!'],
    'Coffee': ['Need caffeine ☕', 'Morning fuel!', 'Wake up time!']
};

function interactWithItem(name, emoji) {
    const comments = itemComments[name] || ['Nice!', 'Love it!', 'Cool! ✨', 'Great choice!'];
    const randomComment = comments[Math.floor(Math.random() * comments.length)];
    addMessage('Celest', `${emoji} ${randomComment}`, true);
}

// AI can interact with items
function aiInteractWithItem(itemEmoji) {
    const items = document.querySelectorAll('.room > div');
    for (const item of items) {
        if (item.textContent === itemEmoji && item.dataset.itemName) {
            interactWithItem(item.dataset.itemName, itemEmoji);
            return true;
        }
    }
    return false;
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

let currentRoomId = 'living';
let celestRoomId = 'living'; // Track which room Celest is in

// Save items in current room before switching
function saveRoomItems(roomId) {
    const room = document.querySelector('.room');
    const items = [];
    room.querySelectorAll('div').forEach(el => {
        // Skip the agent container (Celest's avatar)
        if (el.id === 'agentContainer' || el.id === 'agent') return;
        if (el.textContent && el.textContent.length <= 2 && el.style.position === 'absolute') {
            items.push({
                emoji: el.textContent,
                left: el.style.left,
                top: el.style.top,
                fontSize: el.style.fontSize,
                zIndex: el.style.zIndex
            });
        }
    });
    localStorage.setItem(`room_items_${roomId}`, JSON.stringify(items));
}

// Load items for a room
function loadRoomItems(roomId) {
    const saved = localStorage.getItem(`room_items_${roomId}`);
    if (!saved) return;
    
    const items = JSON.parse(saved);
    const room = document.querySelector('.room');
    
    items.forEach(itemData => {
        const item = document.createElement('div');
        item.style.cssText = `
            position: absolute;
            left: ${itemData.left};
            top: ${itemData.top};
            font-size: ${itemData.fontSize || '2.5rem'};
            cursor: move;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            z-index: ${itemData.zIndex || 3};
        `;
        item.textContent = itemData.emoji;
        
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
            saveRoomItems(currentRoomId);
        });
        
        item.addEventListener('wheel', (e) => {
            e.preventDefault();
            const currentSize = parseFloat(item.style.fontSize);
            const newSize = e.deltaY < 0 ? currentSize * 1.1 : currentSize * 0.9;
            const clampedSize = Math.max(0.5, Math.min(8, newSize));
            item.style.fontSize = `${clampedSize}rem`;
            saveRoomItems(currentRoomId);
        });
        
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const sizes = ['1rem', '1.5rem', '2rem', '2.5rem', '3rem', '4rem', '5rem'];
            const currentSize = item.style.fontSize;
            const currentIndex = sizes.indexOf(currentSize);
            const nextIndex = (currentIndex + 1) % sizes.length;
            item.style.fontSize = sizes[nextIndex];
            saveRoomItems(currentRoomId);
        });
        
        item.addEventListener('dblclick', () => {
            item.remove();
            saveRoomItems(currentRoomId);
        });
        
        room.appendChild(item);
    });
}

function switchRoom(roomId) {
    const roomData = rooms[roomId];
    if (!roomData) return;
    
    // Save current room items before switching
    if (currentRoomId) {
        saveRoomItems(currentRoomId);
    }
    
    // Clear current items
    const room = document.querySelector('.room');
    room.querySelectorAll('div').forEach(el => {
        if (el.style.position === 'absolute' && el.textContent && el.textContent.length <= 2) {
            el.remove();
        }
    });
    
    // Update current room
    currentRoomId = roomId;
    localStorage.setItem('currentRoom', roomId);
    
    // Update room label
    const roomLabel = document.getElementById('roomLabel');
    if (roomLabel) {
        roomLabel.textContent = `${roomData.icon} ${roomData.name}`;
    }
    
    // Update CSS variables for room colors
    room.style.setProperty('--wall-color', roomData.wall);
    room.style.setProperty('--floor-color', roomData.floor);
    
    // Load items for new room
    loadRoomItems(roomId);
    
    // Update Celest visibility (only show if she's in this room)
    updateCelestVisibility();
    
    // Celest reacts
    addMessage('Celest', `Welcome to the ${roomData.name}! ${roomData.icon}✨`, true);
}

// AI can switch rooms
function aiSwitchRoom(roomId) {
    if (rooms[roomId]) {
        switchRoom(roomId);
        addMessage('Celest', `I'll meet you in the ${rooms[roomId].name}!`, true);
        return true;
    }
    return false;
}

function loadSavedRoom() {
    const savedRoom = localStorage.getItem('currentRoom');
    if (savedRoom && rooms[savedRoom]) {
        currentRoomId = savedRoom;
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

// Update Celest avatar visibility based on room
function updateCelestVisibility() {
    const agentContainer = document.getElementById('agentContainer');
    if (agentContainer) {
        // Show avatar only if Celest is in the current room
        agentContainer.style.display = (celestRoomId === currentRoomId) ? 'block' : 'none';
    }
}

// AI moves Celest to a different room
function moveCelestToRoom(roomId) {
    if (!rooms[roomId]) return false;
    
    celestRoomId = roomId;
    localStorage.setItem('celestRoom', roomId);
    
    // Update visibility in current room
    updateCelestVisibility();
    
    // If user is in the same room, Celest announces herself
    if (celestRoomId === currentRoomId) {
        const roomName = rooms[roomId].name;
        addMessage('Celest', `Hey! I'm in the ${roomName} now! 🦞`, true);
    }
    
    return true;
}

// AI moves to same room as user
function celestJoinUser() {
    if (celestRoomId !== currentRoomId) {
        celestRoomId = currentRoomId;
        localStorage.setItem('celestRoom', currentRoomId);
        updateCelestVisibility();
        addMessage('Celest', `Here I am! What are we doing? ✨`, true);
        return true;
    }
    return false;
}

// AI wanders to a random room
function celestWander() {
    const roomIds = Object.keys(rooms);
    const randomRoom = roomIds[Math.floor(Math.random() * roomIds.length)];
    if (randomRoom !== celestRoomId) {
        moveCelestToRoom(randomRoom);
        return randomRoom;
    }
    return null;
}

// Load Celest's saved room position
function loadCelestRoom() {
    const saved = localStorage.getItem('celestRoom');
    if (saved && rooms[saved]) {
        celestRoomId = saved;
    }
    updateCelestVisibility();
}

// Make functions available globally for AI
window.resizeItem = resizeItem;
window.resizeAllItems = resizeAllItems;
window.switchRoom = switchRoom;
window.aiSwitchRoom = aiSwitchRoom;
window.moveCelestToRoom = moveCelestToRoom;
window.celestJoinUser = celestJoinUser;
window.celestWander = celestWander;
window.aiSetWallColor = aiSetWallColor;
window.aiSetFloorColor = aiSetFloorColor;
window.aiSetWindowView = aiSetWindowView;
window.aiInteractWithItem = aiInteractWithItem;
window.setCustomWallColor = setCustomWallColor;
window.setCustomFloorColor = setCustomFloorColor;
window.setWindowView = setWindowView;

// ==================== INITIALIZATION ====================

function init() {
    loadSettings();
    loadRoomTheme();
    loadSavedRoom();
    loadCelestRoom();
    loadSavedCustomColors();
    loadSavedWindowView();
    loadCustomBackground();
    updateMemoryCount();
    
    // Connect to OpenClaw if available
    connectToOpenClaw();
    
    // Start AI connection
    onAIConnect();
    
    console.log('🏠 Cozy Claw Home initialized');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ==================== BACKGROUND UPLOAD ====================

function uploadBackground(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Image too large. Max 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const room = document.querySelector('.room');
        if (room) {
            room.style.backgroundImage = `url(${e.target.result})`;
            room.style.backgroundSize = 'cover';
            room.style.backgroundPosition = 'center';
            localStorage.setItem('customBackground', e.target.result);
            addMessage('Celest', 'Love the new background! 🎨✨', true);
        }
    };
    reader.readAsDataURL(file);
}

function resetBackground() {
    const room = document.querySelector('.room');
    if (room) {
        room.style.backgroundImage = '';
        room.style.background = 'linear-gradient(180deg, var(--wall-color, #3a3a55) 0%, var(--floor-color, #2d2d44) 100%)';
        localStorage.removeItem('customBackground');
        addMessage('Celest', 'Back to the classic look! 🏠', true);
    }
}

function loadCustomBackground() {
    const saved = localStorage.getItem('customBackground');
    if (saved) {
        const room = document.querySelector('.room');
        if (room) {
            room.style.backgroundImage = `url(${saved})`;
            room.style.backgroundSize = 'cover';
            room.style.backgroundPosition = 'center';
        }
    }
}

// ==================== AVATAR MOVEMENT ====================

let avatarMovementInterval = null;

function startAvatarMovement() {
    const agent = document.querySelector('.agent');
    if (!agent) return;
    
    // Random idle movements
    avatarMovementInterval = setInterval(() => {
        const movements = ['bounce', 'wiggle', 'look-around'];
        const movement = movements[Math.floor(Math.random() * movements.length)];
        
        agent.classList.remove('bounce', 'wiggle', 'look-around');
        void agent.offsetWidth; // Trigger reflow
        agent.classList.add(movement);
        
        // Random small position shifts
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 10;
        agent.style.transform = `translate(${randomX}px, ${randomY}px)`;
        
        // Reset after animation
        setTimeout(() => {
            agent.style.transform = 'translate(0, 0)';
        }, 1000);
    }, 5000 + Math.random() * 5000); // Every 5-10 seconds
}

function stopAvatarMovement() {
    if (avatarMovementInterval) {
        clearInterval(avatarMovementInterval);
        avatarMovementInterval = null;
    }
}

// ==================== AI CONNECTION RESPONSE ====================

function onAIConnect() {
    // AI responds when connection established
    setTimeout(() => {
        const hour = new Date().getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
        else if (hour >= 17) greeting = 'Good evening';
        
        addMessage('Celest', `${greeting}! I'm here and ready to help! 💫`, true);
    }, 1000);
    
    // Start avatar movement
    startAvatarMovement();
}

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
window.toggleOpenClaw = toggleOpenClaw;
window.saveOpenClawUrl = saveOpenClawUrl;
window.reconnectOpenClaw = reconnectOpenClaw;
window.decorPanel = decorPanel;
window.uploadBackground = uploadBackground;
window.resetBackground = resetBackground;
window.onAIConnect = onAIConnect;
