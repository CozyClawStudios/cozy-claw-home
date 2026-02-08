/**
 * The Shared House - Mobile Controls
 * Virtual joystick, touch buttons, and gesture handling
 */

(function() {
    'use strict';

    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (!isMobile) {
        console.log('📱 Mobile controls: Not a mobile device, skipping mobile controls');
        return;
    }

    console.log('📱 Mobile controls: Initializing...');

    // Mobile controls state
    const mobileState = {
        joystick: {
            active: false,
            centerX: 0,
            centerY: 0,
            currentX: 0,
            currentY: 0,
            dx: 0,
            dy: 0,
            maxDistance: 50
        },
        pinch: {
            active: false,
            startDistance: 0,
            currentScale: 1,
            minScale: 0.5,
            maxScale: 2
        },
        touch: {
            startX: 0,
            startY: 0,
            startTime: 0
        },
        buttons: {
            interact: false,
            chat: false,
            decorate: false
        }
    };

    // Create mobile UI container
    const mobileUI = document.createElement('div');
    mobileUI.id = 'mobileUI';
    mobileUI.innerHTML = `
        <div id="mobileJoystick" class="mobile-control joystick">
            <div class="joystick-base">
                <div class="joystick-stick"></div>
            </div>
        </div>
        <div id="mobileButtons" class="mobile-control buttons">
            <button id="mobileChatBtn" class="mobile-btn chat-btn" aria-label="Chat">
                <span class="btn-icon">💬</span>
            </button>
            <button id="mobileDecorateBtn" class="mobile-btn decorate-btn" aria-label="Decorate">
                <span class="btn-icon">🛋️</span>
            </button>
            <button id="mobileInteractBtn" class="mobile-btn interact-btn" aria-label="Interact">
                <span class="btn-icon">👆</span>
            </button>
        </div>
        <div id="mobileInstructions" class="mobile-instructions">
            <span class="instruction-item">👆 Tap: Place furniture</span>
            <span class="instruction-item">↔️ Pinch: Zoom</span>
        </div>
    `;
    document.body.appendChild(mobileUI);

    // Add mobile CSS class to body
    document.body.classList.add('mobile-device');

    // Get joystick elements
    const joystick = document.getElementById('mobileJoystick');
    const joystickBase = joystick.querySelector('.joystick-base');
    const joystickStick = joystick.querySelector('.joystick-stick');

    // Get button elements
    const chatBtn = document.getElementById('mobileChatBtn');
    const decorateBtn = document.getElementById('mobileDecorateBtn');
    const interactBtn = document.getElementById('mobileInteractBtn');

    // Joystick touch handling
    let joystickTouchId = null;

    joystick.addEventListener('touchstart', handleJoystickStart, { passive: false });
    joystick.addEventListener('touchmove', handleJoystickMove, { passive: false });
    joystick.addEventListener('touchend', handleJoystickEnd, { passive: false });
    joystick.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

    function handleJoystickStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;

        const rect = joystickBase.getBoundingClientRect();
        mobileState.joystick.centerX = rect.left + rect.width / 2;
        mobileState.joystick.centerY = rect.top + rect.height / 2;
        mobileState.joystick.active = true;
        mobileState.joystick.currentX = touch.clientX;
        mobileState.joystick.currentY = touch.clientY;

        updateJoystickPosition(touch.clientX, touch.clientY);
        joystick.classList.add('active');
    }

    function handleJoystickMove(e) {
        e.preventDefault();
        if (!mobileState.joystick.active) return;

        const touch = findTouch(e.changedTouches, joystickTouchId);
        if (!touch) return;

        mobileState.joystick.currentX = touch.clientX;
        mobileState.joystick.currentY = touch.clientY;
        updateJoystickPosition(touch.clientX, touch.clientY);
    }

    function handleJoystickEnd(e) {
        e.preventDefault();
        const touch = findTouch(e.changedTouches, joystickTouchId);
        if (!touch) return;

        joystickTouchId = null;
        mobileState.joystick.active = false;
        mobileState.joystick.dx = 0;
        mobileState.joystick.dy = 0;
        joystickStick.style.transform = 'translate(-50%, -50%)';
        joystick.classList.remove('active');
    }

    function findTouch(touches, id) {
        for (let i = 0; i < touches.length; i++) {
            if (touches[i].identifier === id) {
                return touches[i];
            }
        }
        return null;
    }

    function updateJoystickPosition(x, y) {
        const dx = x - mobileState.joystick.centerX;
        const dy = y - mobileState.joystick.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = mobileState.joystick.maxDistance;

        let clampedX = dx;
        let clampedY = dy;

        if (distance > maxDist) {
            clampedX = (dx / distance) * maxDist;
            clampedY = (dy / distance) * maxDist;
        }

        joystickStick.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;

        // Normalize to -1 to 1
        mobileState.joystick.dx = clampedX / maxDist;
        mobileState.joystick.dy = clampedY / maxDist;
    }

    // Button handling
    chatBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        chatBtn.classList.add('pressed');
        sendChat();
    });
    chatBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        chatBtn.classList.remove('pressed');
    });

    decorateBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        decorateBtn.classList.add('pressed');
        toggleFurnitureMode();
    });
    decorateBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        decorateBtn.classList.remove('pressed');
    });

    interactBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        interactBtn.classList.add('pressed');
        handleMobileInteract();
    });
    interactBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        interactBtn.classList.remove('pressed');
    });

    function handleMobileInteract() {
        // Simulate 'E' key press for interaction
        if (typeof game !== 'undefined' && game.localPlayer) {
            // Find nearby furniture and interact
            const player = game.localPlayer;
            game.furniture.forEach(f => {
                const dist = Math.sqrt(
                    Math.pow(f.x - player.x, 2) +
                    Math.pow(f.y - player.y, 2)
                );
                if (dist < 60) {
                    f.interact(player);
                }
            });
        }
    }

    // Canvas touch handling for pinch-to-zoom
    const canvas = document.getElementById('gameCanvas');
    let initialPinchDistance = 0;
    let initialScale = 1;
    let currentScale = 1;
    let canvasTouchStartTime = 0;

    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });

    function handleCanvasTouchStart(e) {
        canvasTouchStartTime = Date.now();
        
        if (e.touches.length === 2) {
            // Pinch start
            initialPinchDistance = getPinchDistance(e.touches);
            initialScale = currentScale;
            mobileState.pinch.active = true;
        } else if (e.touches.length === 1) {
            // Single touch - track for potential tap
            mobileState.touch.startX = e.touches[0].clientX;
            mobileState.touch.startY = e.touches[0].clientY;
            mobileState.touch.startTime = Date.now();
        }
    }

    function handleCanvasTouchMove(e) {
        if (e.touches.length === 2 && mobileState.pinch.active) {
            e.preventDefault();
            const distance = getPinchDistance(e.touches);
            const scale = distance / initialPinchDistance;
            currentScale = Math.max(
                mobileState.pinch.minScale,
                Math.min(mobileState.pinch.maxScale, initialScale * scale)
            );
            
            // Apply scale to canvas container
            const container = document.getElementById('gameContainer');
            if (container) {
                container.style.transform = `scale(${currentScale})`;
                container.style.transformOrigin = 'center center';
            }
        }
    }

    function handleCanvasTouchEnd(e) {
        if (mobileState.pinch.active && e.touches.length < 2) {
            mobileState.pinch.active = false;
        }

        // Handle tap for furniture placement
        if (e.changedTouches.length === 1 && !mobileState.pinch.active) {
            const touch = e.changedTouches[0];
            const touchDuration = Date.now() - mobileState.touch.startTime;
            const dx = touch.clientX - mobileState.touch.startX;
            const dy = touch.clientY - mobileState.touch.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If it's a quick tap with minimal movement
            if (touchDuration < 300 && distance < 10) {
                handleCanvasTap(touch);
            }
        }
    }

    function handleCanvasTap(touch) {
        // Convert touch coordinates to canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        mouse.x = (touch.clientX - rect.left) * scaleX;
        mouse.y = (touch.clientY - rect.top) * scaleY;

        // Trigger click handler
        if (game.mode === 'furniture' && game.selectedFurniture) {
            game.furniture.push(new Furniture(game.selectedFurniture, mouse.x, mouse.y));
            addChatMessage('🏠', `Placed a ${game.selectedFurniture}`, false);
        }
    }

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Game loop integration for joystick movement
    const originalGameLoop = window.gameLoop;
    
    // Override game loop to include joystick input
    function mobileGameLoop() {
        // Handle joystick movement
        if (mobileState.joystick.active && game.localPlayer && game.mode === 'walk') {
            const threshold = 0.1;
            const dx = Math.abs(mobileState.joystick.dx) > threshold ? mobileState.joystick.dx : 0;
            const dy = Math.abs(mobileState.joystick.dy) > threshold ? mobileState.joystick.dy : 0;
            
            if (dx !== 0 || dy !== 0) {
                game.localPlayer.move(dx, dy);
            }
        }

        // Call original game loop
        originalGameLoop();
    }

    // Replace game loop with mobile-aware version
    // Note: We need to wait for the original gameLoop to be defined
    const checkGameLoop = setInterval(() => {
        if (window.gameLoop) {
            clearInterval(checkGameLoop);
            // The original gameLoop uses requestAnimationFrame recursively
            // We'll hook into the player movement instead
        }
    }, 100);

    // Hook into player movement from update function
    const originalUpdate = Player.prototype.update;
    Player.prototype.update = function() {
        // Apply joystick movement for local player
        if (this === game.localPlayer && mobileState.joystick.active && !this.isAgent) {
            const threshold = 0.1;
            const dx = Math.abs(mobileState.joystick.dx) > threshold ? mobileState.joystick.dx : 0;
            const dy = Math.abs(mobileState.joystick.dy) > threshold ? mobileState.joystick.dy : 0;
            
            if (dx !== 0 || dy !== 0) {
                this.vx = dx * this.speed;
                this.vy = dy * this.speed;
            }
        }
        
        // Call original update
        originalUpdate.call(this);
    };

    // Double-tap to zoom reset
    let lastTapTime = 0;
    document.addEventListener('touchend', (e) => {
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) {
            // Double tap detected - reset zoom
            currentScale = 1;
            const container = document.getElementById('gameContainer');
            if (container) {
                container.style.transform = 'scale(1)';
            }
        }
        lastTapTime = currentTime;
    });

    // Prevent zoom on double tap for mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            resizeCanvas();
        }, 300);
    });

    // Handle resize
    window.addEventListener('resize', resizeCanvas);

    function resizeCanvas() {
        const container = document.getElementById('gameContainer');
        const canvas = document.getElementById('gameCanvas');
        
        if (!container || !canvas) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isPortrait = viewportHeight > viewportWidth;

        // Adjust canvas size based on orientation
        if (isPortrait) {
            // In portrait, make canvas fit width
            container.style.width = '100%';
            container.style.maxWidth = '100vw';
            container.style.height = 'auto';
        } else {
            // In landscape, make canvas fit height
            container.style.height = '100%';
            container.style.maxHeight = '80vh';
            container.style.width = 'auto';
        }
    }

    // Initial resize
    resizeCanvas();

    console.log('📱 Mobile controls initialized successfully!');
    console.log('   - Virtual joystick: bottom-left');
    console.log('   - Action buttons: bottom-right');
    console.log('   - Pinch to zoom on canvas');
    console.log('   - Double-tap to reset zoom');

    // Expose mobile state for debugging
    window.mobileState = mobileState;
})();
