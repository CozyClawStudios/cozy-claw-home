/**
 * Cozy Claw Home - Room Navigator UI
 * Handles room switching and navigation interface
 */

const RoomNavigator = (function() {
    'use strict';

    // DOM elements
    let container = null;
    let roomTabs = null;
    let currentRoomDisplay = null;
    let isVisible = true;

    // Animation state
    let transitionActive = false;

    /**
     * Initialize the room navigator
     */
    function init() {
        createUI();
        attachListeners();
        updateDisplay();
        
        console.log('🧭 Room Navigator initialized');
    }

    /**
     * Create the UI elements
     */
    function createUI() {
        // Check if already exists
        if (document.getElementById('room-navigator')) {
            container = document.getElementById('room-navigator');
            return;
        }

        // Create container
        container = document.createElement('div');
        container.id = 'room-navigator';
        container.innerHTML = `
            <div class="room-nav-header">
                <span class="nav-title">🏠 Rooms</span>
                <button class="nav-toggle" id="nav-toggle" title="Toggle Navigator">−</button>
            </div>
            <div class="room-tabs-container" id="room-tabs"></div>
            <div class="current-room-info" id="current-room-info"></div>
        `;

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            #room-navigator {
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(255, 253, 250, 0.95);
                border-radius: 16px;
                padding: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.8);
                z-index: 1000;
                min-width: 220px;
                font-family: 'Segoe UI', system-ui, sans-serif;
                transition: all 0.3s ease;
            }

            #room-navigator.collapsed {
                min-width: auto;
                padding: 12px;
            }

            #room-navigator.collapsed .room-tabs-container,
            #room-navigator.collapsed .current-room-info {
                display: none;
            }

            .room-nav-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .nav-title {
                font-weight: 700;
                color: #5D4E37;
                font-size: 15px;
            }

            .nav-toggle {
                background: #F5E6D3;
                border: none;
                width: 28px;
                height: 28px;
                border-radius: 8px;
                cursor: pointer;
                color: #5D4E37;
                font-size: 16px;
                transition: all 0.2s;
            }

            .nav-toggle:hover {
                background: #E8D4C4;
                transform: scale(1.05);
            }

            .room-tabs-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .room-tab {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 14px;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: rgba(245, 230, 211, 0.3);
                border: 2px solid transparent;
                position: relative;
            }

            .room-tab:hover {
                background: rgba(245, 230, 211, 0.6);
                transform: translateX(4px);
            }

            .room-tab.active {
                background: linear-gradient(135deg, #FFE4B5, #FFD4A3);
                border-color: #D4A574;
                box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
            }

            .room-tab.visited::after {
                content: '✓';
                position: absolute;
                right: 10px;
                color: #7CB342;
                font-size: 12px;
            }

            .room-tab-icon {
                font-size: 24px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 10px;
            }

            .room-tab-info {
                flex: 1;
            }

            .room-tab-name {
                font-weight: 600;
                color: #4A4035;
                font-size: 14px;
            }

            .room-tab-desc {
                font-size: 11px;
                color: #8B7D6B;
            }

            .room-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #D4A574;
            }

            .room-tab.active .room-indicator {
                background: #7CB342;
                box-shadow: 0 0 8px #7CB342;
            }

            .current-room-info {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(0, 0, 0, 0.08);
                text-align: center;
            }

            .current-room-label {
                font-size: 11px;
                color: #8B7D6B;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }

            .current-room-name {
                font-size: 18px;
                font-weight: 700;
                color: #5D4E37;
            }

            /* Room transition overlay */
            .room-transition-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #F5E6D3;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.4s ease;
            }

            .room-transition-overlay.active {
                opacity: 1;
                pointer-events: all;
            }

            .transition-icon {
                font-size: 80px;
                margin-bottom: 20px;
                animation: bounce 1s ease infinite;
            }

            .transition-text {
                font-size: 24px;
                color: #5D4E37;
                font-weight: 600;
            }

            .transition-dots {
                display: flex;
                gap: 8px;
                margin-top: 16px;
            }

            .transition-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #D4A574;
                animation: pulse 0.6s ease infinite;
            }

            .transition-dot:nth-child(2) { animation-delay: 0.2s; }
            .transition-dot:nth-child(3) { animation-delay: 0.4s; }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(0.8); opacity: 0.5; }
            }

            /* First visit tooltip */
            .room-tooltip {
                position: absolute;
                background: #5D4E37;
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 1001;
                pointer-events: none;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
            }

            .room-tooltip.show {
                opacity: 1;
                transform: translateY(0);
            }

            .room-tooltip::after {
                content: '';
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 6px 6px 0;
                border-style: solid;
                border-color: #5D4E37 transparent transparent;
            }
        `;
        document.head.appendChild(styles);

        // Add to document
        document.body.appendChild(container);

        // Create transition overlay
        createTransitionOverlay();
    }

    /**
     * Create transition overlay element
     */
    function createTransitionOverlay() {
        if (document.getElementById('room-transition')) return;

        const overlay = document.createElement('div');
        overlay.id = 'room-transition';
        overlay.className = 'room-transition-overlay';
        overlay.innerHTML = `
            <div class="transition-icon" id="transition-icon">🚪</div>
            <div class="transition-text" id="transition-text">Moving...</div>
            <div class="transition-dots">
                <div class="transition-dot"></div>
                <div class="transition-dot"></div>
                <div class="transition-dot"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Attach event listeners
     */
    function attachListeners() {
        // Toggle button
        const toggleBtn = document.getElementById('nav-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleVisibility);
        }

        // Room manager events
        if (typeof RoomManager !== 'undefined') {
            RoomManager.addListener(handleRoomEvent);
        }
    }

    /**
     * Handle room events from RoomManager
     */
    function handleRoomEvent(event, data) {
        switch (event) {
            case 'roomChange':
                onRoomChange(data);
                break;
            case 'init':
                updateTabs();
                break;
        }
    }

    /**
     * Called when room changes
     */
    function onRoomChange(data) {
        const { to, isFirstVisit } = data;
        const roomDef = RoomManager.ROOM_DEFINITIONS[to];

        // Show transition animation
        showTransition(roomDef);

        // Update after transition
        setTimeout(() => {
            updateTabs();
            updateDisplay();
            hideTransition();

            if (isFirstVisit) {
                showFirstVisitNotification(roomDef);
            }
        }, 800);
    }

    /**
     * Show transition overlay
     */
    function showTransition(roomDef) {
        const overlay = document.getElementById('room-transition');
        const icon = document.getElementById('transition-icon');
        const text = document.getElementById('transition-text');

        if (overlay && roomDef) {
            icon.textContent = roomDef.icon;
            text.textContent = `Entering ${roomDef.name}...`;
            overlay.classList.add('active');
        }
    }

    /**
     * Hide transition overlay
     */
    function hideTransition() {
        const overlay = document.getElementById('room-transition');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Show first visit notification
     */
    function showFirstVisitNotification(roomDef) {
        const notification = document.createElement('div');
        notification.className = 'first-visit-notification';
        notification.innerHTML = `
            <div class="notification-icon">${roomDef.icon}</div>
            <div class="notification-content">
                <div class="notification-title">Welcome to the ${roomDef.name}!</div>
                <div class="notification-desc">${roomDef.description}</div>
            </div>
        `;

        const styles = document.createElement('style');
        styles.textContent = `
            .first-visit-notification {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 253, 250, 0.98);
                padding: 20px 28px;
                border-radius: 20px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                gap: 16px;
                z-index: 1002;
                animation: slideUp 0.5s ease, fadeOut 0.5s ease 4.5s forwards;
                border: 2px solid #D4A574;
            }

            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }

            @keyframes fadeOut {
                to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }

            .notification-icon {
                font-size: 48px;
            }

            .notification-title {
                font-weight: 700;
                color: #5D4E37;
                font-size: 18px;
                margin-bottom: 4px;
            }

            .notification-desc {
                color: #8B7D6B;
                font-size: 14px;
            }
        `;
        document.head.appendChild(styles);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * Update room tabs
     */
    function updateTabs() {
        const tabsContainer = document.getElementById('room-tabs');
        if (!tabsContainer) return;

        const rooms = RoomManager.getAvailableRooms();
        
        tabsContainer.innerHTML = rooms.map(room => `
            <div class="room-tab ${room.isCurrent ? 'active' : ''} ${room.visitCount > 0 ? 'visited' : ''}" 
                 data-room-id="${room.id}"
                 title="${room.description}">
                <div class="room-tab-icon">${room.icon}</div>
                <div class="room-tab-info">
                    <div class="room-tab-name">${room.name}</div>
                    <div class="room-tab-desc">${room.furniture > 0 ? room.furniture + ' items' : 'Empty'}</div>
                </div>
                <div class="room-indicator"></div>
            </div>
        `).join('');

        // Add click handlers
        tabsContainer.querySelectorAll('.room-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const roomId = tab.dataset.roomId;
                if (roomId && !tab.classList.contains('active')) {
                    switchToRoom(roomId);
                }
            });
        });
    }

    /**
     * Switch to a room
     */
    function switchToRoom(roomId) {
        if (transitionActive) return;
        
        transitionActive = true;
        RoomManager.switchRoom(roomId);
        
        setTimeout(() => {
            transitionActive = false;
        }, 1000);
    }

    /**
     * Update current room display
     */
    function updateDisplay() {
        const currentRoom = RoomManager.getCurrentRoom();
        const infoContainer = document.getElementById('current-room-info');
        
        if (infoContainer && currentRoom) {
            infoContainer.innerHTML = `
                <div class="current-room-label">Current Room</div>
                <div class="current-room-name">${currentRoom.icon} ${currentRoom.name}</div>
            `;
        }
    }

    /**
     * Toggle navigator visibility
     */
    function toggleVisibility() {
        isVisible = !isVisible;
        container.classList.toggle('collapsed', !isVisible);
        
        const toggleBtn = document.getElementById('nav-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = isVisible ? '−' : '+';
        }
    }

    /**
     * Show the navigator
     */
    function show() {
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Hide the navigator
     */
    function hide() {
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Check if navigator is visible
     */
    function isNavigatorVisible() {
        return isVisible;
    }

    // Public API
    return {
        init,
        show,
        hide,
        isNavigatorVisible,
        toggleVisibility,
        updateTabs,
        switchToRoom
    };
})();

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', RoomNavigator.init);
    } else {
        RoomNavigator.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomNavigator;
}