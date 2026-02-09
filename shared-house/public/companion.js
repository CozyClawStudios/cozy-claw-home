/**
 * Companion Frontend - Main JavaScript
 * Handles the visual companion experience
 * 
 * NEW: Integrated with ClawBot Bridge for real agent communication
 */

// ==================== STATE ====================

// Generate or retrieve persistent client ID
function getClientId() {
    let clientId = localStorage.getItem('companionClientId');
    if (!clientId) {
        clientId = 'client_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('companionClientId', clientId);
    }
    return clientId;
}

const state = {
    socket: null,
    connected: false,
    clientId: getClientId(), // Persistent across sessions
    agent: {
        mood: 'content',
        activity: 'relaxing',
        location: 'sofa'
    },
    messages: [],
    settings: {
        voiceEnabled: false,  // Disabled by default
        initiativeEnabled: true,
        energy: 2
    },
    voiceRecording: false,
    recognition: null,
    
    // NEW: Bridge state
    bridge: {
        messageQueue: [],
        pendingResponses: false
    }
};

// ==================== INITIALIZATION ====================

function init() {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = false;
        state.recognition.onresult = handleVoiceResult;
        state.recognition.onerror = handleVoiceError;
    }
    
    // Connect to server
    connectSocket();
    
    // Load saved settings
    loadSettings();
    
    // Start activity animation loop
    setInterval(updateAgentVisuals, 1000);
    
    // NEW: Poll for bridge responses
    setInterval(pollBridgeResponses, 500);
}

function enterHouse() {
    document.getElementById('welcomeOverlay').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('welcomeOverlay').style.display = 'none';
    }, 500);
    
    // Focus chat input
    document.getElementById('chatInput').focus();
}

// ==================== SOCKET CONNECTION ====================

function connectSocket() {
    console.log('🔄 Connecting socket with v2 config...');
    const socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
        console.log('✅ Connected to companion server');
        state.connected = true;
        updateConnectionStatus();
        
        // Send persistent client ID to server
        socket.emit('client:register', { clientId: state.clientId });
        console.log('📡 Registered client ID:', state.clientId);
        
        // NEW: Request bridge status
        fetchBridgeStatus();
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        state.connected = false;
        updateConnectionStatus();
    });
    
    socket.on('agent:state', (agentState) => {
        updateAgentState(agentState);
    });
    
    socket.on('agent:message', (message) => {
        // Track this message ID to prevent HTTP polling from duplicating it
        const responseId = (message.timestamp || Date.now()) + '|' + (message.text || '').substring(0, 50);
        if (!displayedResponseIds.has(responseId)) {
            displayedResponseIds.add(responseId);
            receiveAgentMessage(message);
        }
    });
    
    socket.on('agent:activity', (activity) => {
        showActivity(activity);
    });
    
    socket.on('memory:stats', (stats) => {
        updateMemoryStats(stats);
    });
    
    // NEW: Bridge-specific events
    socket.on('message:queued', (data) => {
        console.log('📬 Message queued:', data.messageId);
        state.bridge.pendingResponses = true;
    });
    
    socket.on('message:error', (data) => {
        console.error('Message error:', data.error);
        showThought('Sorry, I had trouble sending that message.');
    });
    
    state.socket = socket;
    
    // Make socket globally available for decor panel
    window.socket = socket;
}

function updateConnectionStatus() {
    const statusEl = document.getElementById('agentStatus');
    if (state.connected) {
        statusEl.textContent = 'Online';
        statusEl.style.color = '#4ade80';
    } else {
        statusEl.textContent = 'Reconnecting...';
        statusEl.style.color = '#fbbf24';
    }
}

// NEW: Fetch bridge status
async function fetchBridgeStatus() {
    try {
        const response = await fetch('/api/clawbot/status');
        const status = await response.json();
        console.log('🌉 Bridge status:', status);
        
        // Update UI to show if main agent is connected
        if (status.mainAgentConnected) {
            const statusEl = document.getElementById('agentStatus');
            if (statusEl) {
                statusEl.textContent = 'Agent Ready';
                statusEl.style.color = '#4ecdc4';
            }
        }
    } catch (err) {
        console.log('Bridge not available:', err.message);
    }
}

// Track last response timestamp AND displayed IDs to prevent duplicates
let lastResponseTimestamp = new Date(0).toISOString();
const displayedResponseIds = new Set();

// NEW: Poll for bridge responses
async function pollBridgeResponses() {
    try {
        const sessionId = state.socket?.id ? `web:${state.socket.id}` : 'web:default';
        
        // Skip polling if socket is connected (responses come via Socket.IO)
        if (state.socket?.connected) {
            // Socket.IO handles responses directly, HTTP polling is backup only
            return;
        }
        
        const response = await fetch(`/api/clawbot/responses?sessionId=${sessionId}&since=${encodeURIComponent(lastResponseTimestamp)}`);
        const data = await response.json();
        
        if (data.responses?.length > 0) {
            console.log('📥 Received', data.responses.length, 'responses from bridge (HTTP fallback)');
            let foundNew = false;
            let newestTimestamp = lastResponseTimestamp;
            
            for (const resp of data.responses) {
                // Create unique ID for this response
                const responseId = resp.timestamp + '|' + resp.content.substring(0, 50);
                
                // Skip if already displayed
                if (displayedResponseIds.has(responseId)) {
                    console.log('⏭️ Already displayed, skipping:', resp.content.substring(0, 30));
                    continue;
                }
                
                // Only show responses newer than our last seen
                if (resp.timestamp > lastResponseTimestamp) {
                    console.log('📝 Displaying NEW response (HTTP):', resp.content.substring(0, 50));
                    receiveAgentMessage({
                        text: resp.content,
                        mood: resp.metadata?.mood || 'content',
                        initiative: resp.metadata?.initiative || false,
                        timestamp: resp.timestamp
                    });
                    displayedResponseIds.add(responseId);
                    foundNew = true;
                }
                
                // Track newest timestamp
                if (resp.timestamp > newestTimestamp) {
                    newestTimestamp = resp.timestamp;
                }
            }
            
            // Update last timestamp
            if (foundNew) {
                lastResponseTimestamp = newestTimestamp;
                console.log('✅ Updated lastResponseTimestamp to:', lastResponseTimestamp);
            }
            
            // Clean up old IDs to prevent memory bloat (keep last 50)
            if (displayedResponseIds.size > 50) {
                const idsArray = Array.from(displayedResponseIds);
                displayedResponseIds.clear();
                idsArray.slice(-50).forEach(id => displayedResponseIds.add(id));
            }
        }
    } catch (err) {
        console.error('❌ Poll error:', err.message);
    }
}

// ==================== AGENT INTERACTION ====================

function updateAgentState(newState) {
    state.agent = { ...state.agent, ...newState };
    
    // Update activity indicator
    const activityEl = document.getElementById('activityIndicator');
    const activityInfo = newState.activityInfo || { emoji: '😌', description: 'relaxing' };
    activityEl.textContent = `${activityInfo.emoji} ${activityInfo.description}`;
    activityEl.classList.add('visible');
    
    // Update agent mood visuals
    const agentEl = document.getElementById('agent');
    agentEl.className = 'agent mood-' + newState.mood;
    
    // Position agent based on location
    positionAgent(newState.location);
}

function positionAgent(location) {
    const container = document.getElementById('agentContainer');
    const positions = {
        sofa: { bottom: '25%', left: '25%' },
        desk: { bottom: '25%', left: '80%' },
        chair: { bottom: '22%', left: '80%' },
        window: { bottom: '45%', left: '15%' },
        center: { bottom: '25%', left: '50%' },
        kitchen: { bottom: '25%', left: '60%' }
    };
    
    const pos = positions[location] || positions.center;
    container.style.bottom = pos.bottom;
    container.style.left = pos.left;
    container.style.transform = location === 'sofa' ? 'translateX(-50%) scale(0.9)' : 'translateX(-50%)';
}

function clickAgent() {
    // Visual feedback
    const agent = document.getElementById('agent');
    agent.style.transform = 'scale(0.95)';
    setTimeout(() => {
        agent.style.transform = '';
    }, 150);
    
    // Send click to server
    if (state.socket) {
        state.socket.emit('agent:click');
    }
    
    // Show thought bubble briefly
    showThought('Hey! Need something?');
}

function showActivity(activity) {
    const message = activity.message || `Now ${activity.type}`;
    showThought(message, 3000);
}

function showThought(text, duration = 5000) {
    const bubble = document.getElementById('thoughtBubble');
    bubble.textContent = text;
    bubble.classList.add('visible');
    
    if (duration > 0) {
        setTimeout(() => {
            bubble.classList.remove('visible');
        }, duration);
    }
}

function updateAgentVisuals() {
    // Subtle continuous animations are handled by CSS
}

// ==================== CHAT ====================

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Prevent duplicate messages within 1 second
    const hash = getMessageHash(text, Date.now());
    if (hash === lastMessageHash) {
        console.log('Duplicate message prevented');
        return;
    }
    lastMessageHash = hash;
    
    // Add user message to UI
    addMessage({
        role: 'user',
        content: text,
        timestamp: new Date()
    });
    
    // Clear input
    input.value = '';
    
    // NEW: Send via bridge
    console.log('Sending message. Socket exists:', !!state.socket, 'Connected:', state.socket?.connected);
    if (state.socket && state.socket.connected) {
        state.socket.emit('user:message', { 
            message: text,
            clientInfo: {
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            }
        });
        console.log('✅ Message emitted to socket');
        
        // Show pending indicator
        showThought('Thinking...', 10000);
    } else {
        console.error('❌ Cannot send: socket not connected');
        showThought('Not connected — try refreshing');
    }
}

// Track delivered response IDs to prevent duplicates
const deliveredResponseIds = new Set();

function receiveAgentMessage(message) {
    // Create a unique ID for this message
    const messageId = message.text + (message.timestamp || Date.now());
    
    // Skip if already delivered
    if (deliveredResponseIds.has(messageId)) {
        console.log('⚠️ Duplicate response prevented:', message.text.substring(0, 30));
        return;
    }
    deliveredResponseIds.add(messageId);
    
    // Limit set size to prevent memory leaks
    if (deliveredResponseIds.size > 100) {
        const firstKey = deliveredResponseIds.values().next().value;
        deliveredResponseIds.delete(firstKey);
    }
    
    addMessage({
        role: 'agent',
        content: message.text,
        timestamp: new Date(message.timestamp),
        mood: message.mood
    });
    
    // Show thought bubble
    showThought(message.text);
    
    // Voice output if enabled
    if (state.settings.voiceEnabled && 'speechSynthesis' in window) {
        speak(message.text);
    }
}

function addMessage(msg) {
    state.messages.push(msg);
    
    // Also call game.js version if it exists (for proper UI display)
    if (typeof gameAddMessage === 'function') {
        gameAddMessage(msg);
        return;
    }
    
    const historyEl = document.getElementById('messageHistory');
    if (!historyEl) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${msg.role}`;
    
    const time = msg.timestamp ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageEl.innerHTML = `
        <div>${escapeHtml(msg.content)}</div>
        <div class="message-time">${msg.role === 'agent' ? 'Celest' : 'You'} • ${time}</div>
    `;
    
    historyEl.appendChild(messageEl);
    historyEl.scrollTop = historyEl.scrollHeight;
    
    // Keep only last 20 messages
    while (historyEl.children.length > 20) {
        historyEl.removeChild(historyEl.firstChild);
    }
}

// Expose for game.js to use
window.companionAddMessage = addMessage;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== VOICE ====================

function toggleVoice() {
    if (!state.recognition) {
        alert('Voice input not supported in this browser');
        return;
    }
    
    const btn = document.getElementById('voiceBtn');
    
    if (state.voiceRecording) {
        state.recognition.stop();
        state.voiceRecording = false;
        btn.classList.remove('recording');
    } else {
        state.recognition.start();
        state.voiceRecording = true;
        btn.classList.add('recording');
        showThought('Listening...');
    }
}

function handleVoiceResult(event) {
    // Don't process if TTS is speaking (prevent echo)
    if (ttsSpeaking) {
        console.log('Ignoring voice input - TTS is speaking');
        state.voiceRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        return;
    }
    
    const transcript = event.results[0][0].transcript;
    document.getElementById('chatInput').value = transcript;
    sendMessage();
    
    state.voiceRecording = false;
    document.getElementById('voiceBtn').classList.remove('recording');
}

function handleVoiceError(event) {
    console.error('Voice recognition error:', event.error);
    state.voiceRecording = false;
    document.getElementById('voiceBtn').classList.remove('recording');
    showThought('Sorry, I didn\'t catch that');
}

let ttsSpeaking = false;
let lastMessageHash = ''; // Prevent duplicates

function getMessageHash(text, timestamp) {
    return text + '|' + Math.floor(timestamp / 1000); // Same second = duplicate
}

function speak(text) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    ttsSpeaking = true;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
        ttsSpeaking = false;
    };
    
    // Try to find a pleasant voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Samantha') ||
        v.name.includes('Victoria')
    );
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// ==================== MEMORY PANEL ====================

function openMemoryPanel() {
    document.getElementById('memoryModal').classList.add('visible');
    fetchMemoryData();
}

async function fetchMemoryData() {
    try {
        const response = await fetch('/api/memory/stats');
        const stats = await response.json();
        updateMemoryDisplay(stats);
        
        const memoriesResponse = await fetch('/api/memory/recent?limit=10');
        const memories = await memoriesResponse.json();
        renderMemories(memories);
    } catch (err) {
        console.error('Failed to fetch memory data:', err);
    }
}

function updateMemoryStats(stats) {
    document.getElementById('memoryCount').textContent = stats.totalMemories || 0;
}

function updateMemoryDisplay(stats) {
    document.getElementById('statTotal').textContent = stats.totalMemories || 0;
    document.getElementById('statRecent').textContent = stats.recentMemories || 0;
}

function renderMemories(memories) {
    const listEl = document.getElementById('memoryList');
    listEl.innerHTML = '';
    
    const icons = {
        fact: '📚',
        preference: '❤️',
        routine: '🔄',
        event: '📅',
        conversation: '💬'
    };
    
    memories.forEach(memory => {
        const item = document.createElement('div');
        item.className = 'memory-item';
        item.innerHTML = `
            <div class="memory-icon">${icons[memory.type] || '📝'}</div>
            <div class="memory-content">
                <div class="memory-text">${escapeHtml(memory.content)}</div>
                <div class="memory-meta">${memory.type} • Importance: ${memory.importance}/10</div>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// ==================== TOOLS PANEL ====================

function openToolsPanel() {
    document.getElementById('toolsModal').classList.add('visible');
    fetchToolsData();
}

async function fetchToolsData() {
    try {
        const response = await fetch('/api/tools');
        const tools = await response.json();
        renderTools(tools);
    } catch (err) {
        console.error('Failed to fetch tools:', err);
    }
}

function renderTools(tools) {
    const gridEl = document.getElementById('toolsGrid');
    gridEl.innerHTML = '';
    
    tools.forEach(tool => {
        const card = document.createElement('div');
        card.className = `tool-card ${tool.enabled ? 'active' : ''}`;
        card.onclick = () => toggleTool(tool.id, !tool.enabled);
        card.innerHTML = `
            <div class="tool-icon">${tool.icon}</div>
            <div class="tool-name">${escapeHtml(tool.name)}</div>
            <div class="tool-status">${tool.enabled ? '● Active' : '○ Disabled'}</div>
        `;
        gridEl.appendChild(card);
    });
}

async function toggleTool(toolId, enabled) {
    try {
        await fetch(`/api/tools/${toolId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        fetchToolsData();
    } catch (err) {
        console.error('Failed to toggle tool:', err);
    }
}

// ==================== SETTINGS ====================

function openSettings() {
    document.getElementById('settingsModal').classList.add('visible');
}

function toggleSetting(name) {
    if (name === 'voice') {
        state.settings.voiceEnabled = !state.settings.voiceEnabled;
        document.getElementById('voiceToggle').classList.toggle('active');
    } else if (name === 'initiative') {
        state.settings.initiativeEnabled = !state.settings.initiativeEnabled;
        document.getElementById('initiativeToggle').classList.toggle('active');
    }
    saveSettings();
}

function updateEnergy(value) {
    state.settings.energy = parseInt(value);
    const labels = ['Chill', 'Normal', 'Energetic'];
    document.getElementById('energyValue').textContent = labels[value - 1];
    saveSettings();
}

function saveSettings() {
    localStorage.setItem('companionSettings', JSON.stringify(state.settings));
}

function loadSettings() {
    const saved = localStorage.getItem('companionSettings');
    if (saved) {
        state.settings = { ...state.settings, ...JSON.parse(saved) };
    }
    
    // Apply settings to UI
    document.getElementById('voiceToggle').classList.toggle('active', state.settings.voiceEnabled);
    document.getElementById('initiativeToggle').classList.toggle('active', state.settings.initiativeEnabled);
}

// ==================== MODALS ====================

function closeModal(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('visible');
    }
}

function closeModalDirect(modalId) {
    document.getElementById(modalId).classList.remove('visible');
}

// ==================== START ====================

document.addEventListener('DOMContentLoaded', init);

// Preload voices for speech synthesis
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
}

// decorPanel is defined in game.js
