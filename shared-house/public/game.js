/**
 * Cozy Claw Home - Main Game
 * Multi-room decoration and AI interaction game
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
const game = {
    players: new Map(),
    mode: 'walk', // 'walk', 'place', 'move', 'delete'
    selectedFurniture: null,
    localPlayer: null,
    celest: null,
    chatHistory: [],
    lastUpdate: Date.now(),
    hoveredFurniture: null,
    draggedFurniture: null,
    dragOffset: { x: 0, y: 0 }
};

// Input state
const keys = {};
const mouse = { x: 0, y: 0, clicked: false, down: false };

// Player class
class Player {
    constructor(id, name, isAgent = false) {
        this.id = id;
        this.name = name;
        this.isAgent = isAgent;
        this.x = 400;
        this.y = 300;
        this.vx = 0;
        this.vy = 0;
        this.speed = isAgent ? 2 : 4;
        this.color = isAgent ? '#FF6B9D' : '#4CAF50';
        this.emoji = isAgent ? '🐱' : '👤';
        this.targetX = null;
        this.targetY = null;
        this.chatBubble = null;
        this.chatTimer = 0;
        this.activity = 'idle';
        this.walkInterval = null;
    }

    update() {
        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Get current room bounds
        const room = RoomManager.getCurrentRoom();
        const margin = 40;

        // Boundaries
        this.x = Math.max(margin, Math.min(room.width - margin, this.x));
        this.y = Math.max(margin, Math.min(room.height - margin, this.y));

        // Friction
        this.vx *= 0.85;
        this.vy *= 0.85;

        // Chat bubble timer
        if (this.chatTimer > 0) {
            this.chatTimer--;
            if (this.chatTimer <= 0) {
                this.chatBubble = null;
            }
        }
    }

    move(dx, dy) {
        this.vx = dx * this.speed;
        this.vy = dy * this.speed;
    }

    say(message) {
        this.chatBubble = message;
        this.chatTimer = 300;
        addChatMessage(this.name, message, this.isAgent);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw emoji with slight bounce if moving
        let bounce = 0;
        if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
            bounce = Math.sin(Date.now() / 100) * 3;
        }
        
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, bounce);

        // Draw name tag
        ctx.font = '12px Arial';
        ctx.fillStyle = this.color;
        ctx.fillText(this.name, 0, -28);

        // Draw activity indicator for Celest
        if (this.isAgent && this.activity !== 'idle') {
            ctx.font = '14px Arial';
            ctx.fillText('✨', 20, -10);
        }

        // Draw chat bubble
        if (this.chatBubble) {
            drawChatBubble(this.chatBubble, 0, -50);
        }

        ctx.restore();
    }
}

// Furniture instance class
class FurnitureInstance {
    constructor(type, x, y, id = null) {
        this.id = id || 'furn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.catalogItem = FurnitureCatalog.getItem(type);
        this.emoji = this.catalogItem.emoji;
        this.size = this.catalogItem.size || { w: 40, h: 40 };
        this.interactable = this.catalogItem.interactable !== false;
        this.hovered = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(0, this.size.h/2 - 5, this.size.w/2, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw highlight if hovered
        if (this.hovered || game.hoveredFurniture === this) {
            ctx.fillStyle = 'rgba(124, 179, 66, 0.2)';
            ctx.beginPath();
            ctx.roundRect(-this.size.w/2 - 5, -this.size.h/2 - 5, 
                         this.size.w + 10, this.size.h + 10, 8);
            ctx.fill();
            
            // Draw selection border
            ctx.strokeStyle = '#7CB342';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw furniture emoji
        ctx.font = `${Math.min(this.size.w, this.size.h) * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);

        ctx.restore();
    }

    contains(mx, my) {
        return mx >= this.x - this.size.w/2 && 
               mx <= this.x + this.size.w/2 &&
               my >= this.y - this.size.h/2 && 
               my <= this.y + this.size.h/2;
    }

    interact(player) {
        if (!this.interactable) return;
        
        const item = this.catalogItem;
        const messages = item.interactions || ['interacts with'];
        const action = messages[Math.floor(Math.random() * messages.length)];
        
        const message = `${player.name} ${action} the ${item.name}`;
        addChatMessage('🏠', message, false);
        
        // Trigger particle effect
        createParticles(this.x, this.y - 20, '✨');
    }
}

// Particle system for effects
let particles = [];

function createParticles(x, y, emoji) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 20,
            emoji: emoji,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 60,
            maxLife: 60
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life--;
        return p.life > 0;
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.restore();
    });
}

// Draw chat bubble
function drawChatBubble(text, x, y) {
    ctx.save();
    ctx.translate(x, y);

    const padding = 10;
    ctx.font = '13px Arial';
    const width = Math.min(ctx.measureText(text).width + padding * 2, 180);
    const lines = wrapText(text, width - padding * 2);
    const height = 20 + lines.length * 16;

    // Bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-width/2, -height/2, width, height, 12);
    ctx.fill();
    ctx.stroke();

    // Triangle pointer
    ctx.beginPath();
    ctx.moveTo(-8, height/2 - 1);
    ctx.lineTo(0, height/2 + 8);
    ctx.lineTo(8, height/2 - 1);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#5D4E37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    lines.forEach((line, i) => {
        ctx.fillText(line, 0, -height/2 + 16 + i * 16);
    });

    ctx.restore();
}

function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const width = ctx.measureText(currentLine + ' ' + words[i]).width;
        if (width < maxWidth) {
            currentLine += ' ' + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

// Add chat message
function addChatMessage(name, message, isAgent) {
    const chatBox = document.getElementById('chatBox');
    const div = document.createElement('div');
    div.className = 'chat-message';
    
    let nameClass = 'system';
    if (isAgent) nameClass = 'agent';
    else if (name === 'You') nameClass = 'human';
    
    div.innerHTML = `
        <span class="name ${nameClass}">${name}:</span>
        ${message}
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Limit chat history
    while (chatBox.children.length > 50) {
        chatBox.removeChild(chatBox.firstChild);
    }
}

// Initialize game
function initGame() {
    // Initialize systems
    if (typeof RoomDatabase !== 'undefined') RoomDatabase.init();
    if (typeof RoomManager !== 'undefined') RoomManager.init();
    if (typeof DecorationPanel !== 'undefined') DecorationPanel.init();
    if (typeof RoomNavigator !== 'undefined') RoomNavigator.init();

    // Create local player
    game.localPlayer = new Player('human-' + Date.now(), 'You', false);
    game.players.set(game.localPlayer.id, game.localPlayer);

    // Create Celest
    game.celest = new Player('celest', 'Celest', true);
    game.celest.emoji = '🐱';
    game.players.set('celest', game.celest);

    // Initialize AI interactions
    if (typeof AIInteractions !== 'undefined') {
        AIInteractions.init(game.celest);
    }

    // Load room furniture
    loadRoomFurniture();

    // Update UI
    updateRoomDisplay();

    // Start game loop
    requestAnimationFrame(gameLoop);
    
    console.log('🏠 Cozy Claw Home initialized');
}

// Load furniture for current room
function loadRoomFurniture() {
    const roomState = RoomManager.getCurrentRoomState();
    const furniture = roomState.furniture || [];
    
    // Clear existing furniture instances
    game.roomFurniture = furniture.map(f => 
        new FurnitureInstance(f.type, f.x, f.y, f.id)
    );
}

// Update room display
function updateRoomDisplay() {
    const room = RoomManager.getCurrentRoom();
    const roomState = RoomManager.getCurrentRoomState();
    const view = RoomManager.getCurrentWindowView();

    document.getElementById('roomName').textContent = `${room.icon} ${room.name}`;
    document.getElementById('windowView').textContent = `${view.icon} ${view.name}`;
}

// Draw room with customization
function drawRoom() {
    const room = RoomManager.getCurrentRoom();
    const state = RoomManager.getCurrentRoomState();

    // Wall color
    ctx.fillStyle = state.wallColor || room.defaultWallColor;
    ctx.fillRect(0, 0, room.width, room.height);

    // Draw window view
    drawWindowView(state.windowView || room.defaultWindowView);

    // Floor with texture pattern
    ctx.fillStyle = state.floorColor || room.defaultFloorColor;
    ctx.fillRect(20, room.height - 150, room.width - 40, 130);

    // Add floor texture overlay
    drawFloorTexture(state.floorTexture || room.defaultFloorTexture);

    // Draw room border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, room.width - 40, room.height - 40);

    // Draw window
    drawWindow(room);
}

// Draw window view
function drawWindowView(viewId) {
    const view = RoomManager.getWindowView(viewId);
    const room = RoomManager.getCurrentRoom();
    
    // Draw view background based on type
    const gradient = ctx.createLinearGradient(0, 40, 0, 250);
    
    switch(viewId) {
        case 'city':
            gradient.addColorStop(0, '#4A4A6A');
            gradient.addColorStop(1, '#2A2A4A');
            break;
        case 'forest':
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#98D8C8');
            break;
        case 'beach':
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#FFE4B5');
            break;
        case 'space':
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            break;
        case 'mountains':
            gradient.addColorStop(0, '#E0F0FF');
            gradient.addColorStop(1, '#B8D4E8');
            break;
        case 'night_sky':
            gradient.addColorStop(0, '#0a0a1a');
            gradient.addColorStop(1, '#1a1a3e');
            break;
        case 'sunset':
            gradient.addColorStop(0, '#FF6B6B');
            gradient.addColorStop(0.5, '#FFB347');
            gradient.addColorStop(1, '#FFDB99');
            break;
        case 'garden':
            gradient.addColorStop(0, '#E0FFE0');
            gradient.addColorStop(1, '#90EE90');
            break;
        default:
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#E0F8FF');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(150, 40, room.width - 300, 210);

    // Draw decorative elements based on view
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    
    if (viewId === 'city') {
        // Draw simple skyline silhouette
        ctx.fillStyle = '#2A2A4A';
        for (let i = 0; i < 8; i++) {
            const h = 30 + Math.random() * 60;
            ctx.fillRect(160 + i * 60, 250 - h, 50, h);
        }
    } else if (viewId === 'forest') {
        // Draw trees
        ctx.fillText('🌲', 200, 200);
        ctx.fillText('🌳', 300, 180);
        ctx.fillText('🌲', 400, 200);
        ctx.fillText('🌲', 500, 190);
        ctx.fillText('🌳', 600, 200);
    } else if (viewId === 'beach') {
        ctx.fillText('🌊', 250, 200);
        ctx.fillText('🏖️', 400, 220);
        ctx.fillText('🌊', 550, 200);
    } else if (viewId === 'space') {
        // Stars
        ctx.fillStyle = 'white';
        for (let i = 0; i < 30; i++) {
            const x = 160 + Math.random() * (room.width - 320);
            const y = 50 + Math.random() * 180;
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.fillText('🌙', 300, 120);
        ctx.fillText('⭐', 500, 80);
    } else if (viewId === 'mountains') {
        ctx.fillText('🏔️', 250, 160);
        ctx.fillText('⛰️', 400, 140);
        ctx.fillText('🏔️', 550, 160);
    }
}

// Draw floor texture
function drawFloorTexture(textureId) {
    const room = RoomManager.getCurrentRoom();
    ctx.save();
    ctx.globalAlpha = 0.3;
    
    switch(textureId) {
        case 'wood':
            // Wood planks
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            for (let x = 20; x < room.width - 20; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, room.height - 150);
                ctx.lineTo(x, room.height - 20);
                ctx.stroke();
            }
            break;
        case 'tile':
            // Grid pattern
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            for (let x = 20; x < room.width - 20; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, room.height - 150);
                ctx.lineTo(x, room.height - 20);
                ctx.stroke();
            }
            for (let y = room.height - 150; y < room.height - 20; y += 30) {
                ctx.beginPath();
                ctx.moveTo(20, y);
                ctx.lineTo(room.width - 20, y);
                ctx.stroke();
            }
            break;
        case 'carpet':
            // Soft texture (dots)
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < 50; i++) {
                const x = 30 + Math.random() * (room.width - 60);
                const y = room.height - 140 + Math.random() * 100;
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'grass':
            // Grass blades
            ctx.strokeStyle = 'rgba(34,139,34,0.2)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 100; i++) {
                const x = 30 + Math.random() * (room.width - 60);
                const y = room.height - 30 - Math.random() * 100;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 5 - Math.random() * 5);
                ctx.stroke();
            }
            break;
    }
    
    ctx.restore();
}

// Draw window frame
function drawWindow(room) {
    const windowX = 150;
    const windowY = 40;
    const windowW = room.width - 300;
    const windowH = 210;

    // Window frame
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(windowX - 8, windowY - 8, windowW + 16, windowH + 16);
    
    // Window sill
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(windowX - 12, windowY + windowH, windowW + 24, 12);

    // Window crossbars
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(windowX + windowW/2 - 4, windowY, 8, windowH);
    ctx.fillRect(windowX, windowY + windowH/2 - 4, windowW, 8);
}

// Game loop
function gameLoop() {
    // Get current room
    const room = RoomManager.getCurrentRoom();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw room
    drawRoom();

    // Update and draw furniture (sorted by y for depth)
    const sortedFurniture = game.roomFurniture.slice().sort((a, b) => a.y - b.y);
    sortedFurniture.forEach(furniture => {
        furniture.draw();
    });

    // Update and draw players
    game.players.forEach(player => {
        player.update();
        player.draw();
    });

    // Update and draw particles
    updateParticles();
    drawParticles();

    // Draw placement preview
    if (game.mode === 'place' && game.selectedFurniture) {
        const item = FurnitureCatalog.getItem(game.selectedFurniture);
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.emoji, mouse.x, mouse.y);
        
        // Draw placement guide
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#7CB342';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Draw drag preview
    if (game.mode === 'move' && game.draggedFurniture) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.draggedFurniture.emoji, mouse.x, mouse.y);
        ctx.restore();
    }

    // Update AI
    if (typeof AIInteractions !== 'undefined') {
        AIInteractions.update();
    }

    // Update Celest status in UI
    const activity = AIInteractions.getCurrentActivity?.();
    if (activity) {
        document.getElementById('celestActivity').textContent = activity.name;
    }

    requestAnimationFrame(gameLoop);
}

// Input handlers
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (game.localPlayer && game.mode === 'walk') {
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['arrowup']) dy = -1;
        if (keys['s'] || keys['arrowdown']) dy = 1;
        if (keys['a'] || keys['arrowleft']) dx = -1;
        if (keys['d'] || keys['arrowright']) dx = 1;

        if (dx !== 0 || dy !== 0) {
            game.localPlayer.move(dx, dy);
        }
    }

    // Interact key
    if (e.key.toLowerCase() === 'e') {
        checkInteraction();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse tracking
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    // Update hover state
    if (game.mode === 'move' || game.mode === 'delete') {
        game.hoveredFurniture = null;
        for (let i = game.roomFurniture.length - 1; i >= 0; i--) {
            if (game.roomFurniture[i].contains(mouse.x, mouse.y)) {
                game.hoveredFurniture = game.roomFurniture[i];
                break;
            }
        }
    }

    // Handle dragging
    if (game.draggedFurniture) {
        game.draggedFurniture.x = mouse.x + game.dragOffset.x;
        game.draggedFurniture.y = mouse.y + game.dragOffset.y;
    }
});

canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;

    if (game.mode === 'move') {
        // Start dragging
        for (let i = game.roomFurniture.length - 1; i >= 0; i--) {
            const f = game.roomFurniture[i];
            if (f.contains(mouse.x, mouse.y)) {
                game.draggedFurniture = f;
                game.dragOffset.x = f.x - mouse.x;
                game.dragOffset.y = f.y - mouse.y;
                break;
            }
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    mouse.down = false;

    if (game.draggedFurniture) {
        // Save new position
        RoomManager.moveFurniture(game.draggedFurniture.id, 
            game.draggedFurniture.x, game.draggedFurniture.y);
        game.draggedFurniture = null;
    }
});

// Click handling
canvas.addEventListener('click', (e) => {
    if (e.shiftKey) {
        // Shift+click to delete
        deleteFurnitureAt(mouse.x, mouse.y);
        return;
    }

    if (game.mode === 'place' && game.selectedFurniture) {
        placeFurniture(game.selectedFurniture, mouse.x, mouse.y);
    } else if (game.mode === 'delete') {
        deleteFurnitureAt(mouse.x, mouse.y);
    } else if (game.mode === 'walk') {
        checkInteraction();
    }
});

// Place furniture
function placeFurniture(type, x, y) {
    const item = FurnitureCatalog.getItem(type);
    
    // Create furniture instance
    const furniture = new FurnitureInstance(type, x, y);
    game.roomFurniture.push(furniture);
    
    // Save to room state
    RoomManager.addFurniture({
        type: type,
        x: x,
        y: y
    });
    
    // Effect
    createParticles(x, y, '✨');
    addChatMessage('🏠', `Placed ${item.name}`, false);
}

// Delete furniture
function deleteFurnitureAt(x, y) {
    for (let i = game.roomFurniture.length - 1; i >= 0; i--) {
        if (game.roomFurniture[i].contains(x, y)) {
            const removed = game.roomFurniture.splice(i, 1)[0];
            RoomManager.removeFurniture(removed.id);
            createParticles(x, y, '💨');
            addChatMessage('🏠', `Removed ${removed.catalogItem.name}`, false);
            return;
        }
    }
}

// Check for interactions
function checkInteraction() {
    if (!game.localPlayer) return;
    
    const px = game.localPlayer.x;
    const py = game.localPlayer.y;
    
    // Find nearby furniture
    for (const furniture of game.roomFurniture) {
        const dist = Math.sqrt(
            Math.pow(furniture.x - px, 2) + 
            Math.pow(furniture.y - py, 2)
        );
        
        if (dist < 60 && furniture.interactable) {
            furniture.interact(game.localPlayer);
            createParticles(furniture.x, furniture.y - 20, '💫');
            return;
        }
    }
}

// Handle furniture selection from panel
document.addEventListener('furnitureSelected', (e) => {
    const type = e.detail.type;
    if (type) {
        game.selectedFurniture = type;
        setMode('place');
    } else {
        game.selectedFurniture = null;
        setMode('walk');
    }
});

// Handle room change
document.addEventListener('roomChange', (e) => {
    loadRoomFurniture();
    updateRoomDisplay();
    
    // Reset player positions
    if (game.localPlayer) {
        game.localPlayer.x = 400;
        game.localPlayer.y = 400;
    }
    if (game.celest) {
        game.celest.x = 450;
        game.celest.y = 450;
    }
});

// Set game mode
function setMode(mode) {
    game.mode = mode;
    
    // Update UI buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'walk') document.getElementById('btnWalk')?.classList.add('active');
    if (mode === 'place') document.getElementById('btnDecorate')?.classList.add('active');
    if (mode === 'move') document.getElementById('btnMove')?.classList.add('active');
    if (mode === 'delete') document.getElementById('btnDelete')?.classList.add('active');
    
    // Update cursor
    if (mode === 'place') {
        canvas.style.cursor = 'copy';
    } else if (mode === 'delete') {
        canvas.style.cursor = 'not-allowed';
    } else if (mode === 'move') {
        canvas.style.cursor = 'move';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

// Quick button handlers
document.getElementById('btnWalk')?.addEventListener('click', () => {
    game.selectedFurniture = null;
    setMode('walk');
});

document.getElementById('btnDecorate')?.addEventListener('click', () => {
    DecorationPanel.show();
});

document.getElementById('btnMove')?.addEventListener('click', () => {
    setMode('move');
});

document.getElementById('btnDelete')?.addEventListener('click', () => {
    setMode('delete');
});

// Room manager event listener
if (typeof RoomManager !== 'undefined') {
    RoomManager.addListener((event, data) => {
        if (event === 'roomChange') {
            document.dispatchEvent(new CustomEvent('roomChange', { detail: data }));
        } else if (event === 'customization') {
            // Trigger re-render
        }
    });
}

// Start the game
initGame();
setMode('walk');

console.log('🏠 Cozy Claw Home is running!');
console.log('Decorate your rooms and spend time with Celest!');

// Make game object globally accessible
window.game = game;