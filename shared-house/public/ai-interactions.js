/**
 * Cozy Claw Home - AI Interactions
 * Handles Celest (and other AI) interacting with furniture and environment
 */

const AIInteractions = (function() {
    'use strict';

    // Celest's state
    let celest = null;
    let currentActivity = 'idle';
    let activityTimer = null;
    let pathTarget = null;
    let isMoving = false;

    // Activity definitions
    const ACTIVITIES = {
        idle: {
            name: 'Idle',
            emoji: '😺',
            duration: { min: 3000, max: 8000 },
            canDo: () => true
        },
        sitting: {
            name: 'Sitting',
            emoji: '😸',
            duration: { min: 5000, max: 15000 },
            furniture: ['sofa', 'loveseat', 'armchair', 'bar_stool', 'dining_chair', 
                       'desk_chair', 'garden_bench', 'patio_chair', 'hammock'],
            message: ['Celest curls up on the {furniture}', 'Celest settles in for a cozy sit',
                     'Celest makes herself comfortable', 'Celest claims this spot']
        },
        sleeping: {
            name: 'Sleeping',
            emoji: '😴',
            duration: { min: 10000, max: 30000 },
            furniture: ['bed_single', 'bed_double', 'bed_bunk', 'sofa', 'hammock'],
            message: ['Celest drifts off to sleep', 'Celest takes a cat nap',
                     'Celest is dreaming peacefully', 'Celest snores softly']
        },
        cooking: {
            name: 'Cooking',
            emoji: '👩‍🍳',
            duration: { min: 8000, max: 20000 },
            furniture: ['stove', 'kitchen_counter', 'kitchen_island'],
            message: ['Celest is preparing something tasty', 'Celest cooks up a storm',
                     'Celest stirs the pot', 'Celest adds a pinch of magic']
        },
        reading: {
            name: 'Reading',
            emoji: '📖',
            duration: { min: 8000, max: 20000 },
            furniture: ['desk', 'bookshelf', 'sofa', 'armchair', 'garden_bench'],
            message: ['Celest is lost in a good book', 'Celest turns the page',
                     'Celest smiles at something she read', 'Celest bookmarks her place']
        },
        watering: {
            name: 'Watering Plants',
            emoji: '🌱',
            duration: { min: 5000, max: 12000 },
            furniture: ['plant', 'hanging_plant', 'herb_garden', 'flower_pot', 
                       'flower_bed', 'shrub', 'tree'],
            message: ['Celest waters the {furniture}', 'Celest tends to the plants',
                     'Celest talks to the {furniture}', 'Celest gives them some love']
        },
        windowGazing: {
            name: 'Looking Out Window',
            emoji: '🪟',
            duration: { min: 6000, max: 15000 },
            furniture: ['window', 'window_frosted'],
            message: ['Celest watches the world outside', 'Celest spots a bird!',
                     'Celest enjoys the view', 'Celest wonders what\'s out there']
        },
        bathing: {
            name: 'Bathing',
            emoji: '🛁',
            duration: { min: 10000, max: 25000 },
            furniture: ['bathtub', 'shower'],
            message: ['Celest enjoys a warm bath', 'Celest relaxes in the tub',
                     'Celest adds some bubbles', 'Celest hums a tune']
        },
        grooming: {
            name: 'Grooming',
            emoji: '🪞',
            duration: { min: 5000, max: 10000 },
            furniture: ['sink_vanity', 'mirror', 'vanity'],
            message: ['Celest checks her reflection', 'Celest fixes her whiskers',
                     'Celest looks fabulous', 'Celest washes her paws']
        },
        grilling: {
            name: 'Grilling',
            emoji: '🔥',
            duration: { min: 8000, max: 18000 },
            furniture: ['grill', 'fire_pit'],
            message: ['Celest tends the fire', 'Celest grills something delicious',
                     'Celest enjoys the warmth', 'Celest roasts marshmallows']
        },
        playing: {
            name: 'Playing',
            emoji: '🧶',
            duration: { min: 6000, max: 15000 },
            furniture: ['rug', 'outdoor_rug', 'bed_single', 'bed_double'],
            noFurniture: true, // Can do anywhere
            message: ['Celest plays with a toy', 'Celest chases her tail',
                     'Celest discovers a dust bunny', 'Celest is feeling playful']
        },
        exploring: {
            name: 'Exploring',
            emoji: '🔍',
            duration: { min: 4000, max: 10000 },
            noFurniture: true,
            message: ['Celest investigates a corner', 'Celest finds something interesting',
                     'Celest is curious', 'Celest sniffs around']
        }
    };

    // Walking animation states
    const WALK_STATES = {
        idle: { frame: 0, emoji: '😺' },
        walk1: { frame: 1, emoji: '🐈' },
        walk2: { frame: 2, emoji: '🐈‍⬛' },
        sit: { frame: 3, emoji: '😸' },
        sleep: { frame: 4, emoji: '😴' },
        stand: { frame: 5, emoji: '🐱' }
    };

    /**
     * Initialize AI interactions
     */
    function init(celestAgent) {
        celest = celestAgent;
        currentActivity = 'idle';
        
        // Start behavior loop
        startBehaviorLoop();
        
        // Add room change listener
        if (typeof RoomManager !== 'undefined') {
            RoomManager.addListener(handleRoomChange);
        }

        console.log('🐱 Celest AI initialized');
    }

    /**
     * Handle room change
     */
    function handleRoomChange(event, data) {
        if (event === 'roomChange') {
            // Celest follows to new room
            setTimeout(() => {
                announce(`Celest follows you to the ${data.toState?.name || 'new room'}`);
                chooseNewActivity();
            }, 1000);
        }
    }

    /**
     * Start the behavior decision loop
     */
    function startBehaviorLoop() {
        // Make initial decision
        setTimeout(chooseNewActivity, 2000);
        
        // Continue loop
        scheduleNextDecision();
    }

    /**
     * Schedule next decision
     */
    function scheduleNextDecision() {
        // Random interval between 5-15 seconds for decisions
        const interval = Math.random() * 10000 + 5000;
        activityTimer = setTimeout(() => {
            if (!isMoving) {
                decideNextAction();
            }
            scheduleNextDecision();
        }, interval);
    }

    /**
     * Decide what to do next
     */
    function decideNextAction() {
        const roll = Math.random();
        
        if (roll < 0.4) {
            // 40% chance to use furniture
            chooseNewActivity();
        } else if (roll < 0.7) {
            // 30% chance to move to new spot
            moveToRandomSpot();
        } else {
            // 30% chance to stay idle
            setActivity('idle');
        }
    }

    /**
     * Choose a new activity based on available furniture
     */
    function chooseNewActivity() {
        const roomState = RoomManager.getCurrentRoomState();
        const furniture = roomState.furniture || [];
        
        // Find activities we can do with current furniture
        const possibleActivities = [];
        
        Object.entries(ACTIVITIES).forEach(([key, activity]) => {
            if (key === 'idle') return;
            
            if (activity.noFurniture) {
                // Can do anywhere
                possibleActivities.push({ key, activity, furniture: null });
            } else if (activity.furniture) {
                // Find matching furniture
                const matching = furniture.filter(f => 
                    activity.furniture.includes(f.type)
                );
                if (matching.length > 0) {
                    const chosen = matching[Math.floor(Math.random() * matching.length)];
                    possibleActivities.push({ key, activity, furniture: chosen });
                }
            }
        });
        
        if (possibleActivities.length === 0) {
            // No furniture available - explore or play
            const fallback = Math.random() < 0.5 ? 'exploring' : 'playing';
            setActivity(fallback);
            return;
        }
        
        // Choose random activity
        const choice = possibleActivities[Math.floor(Math.random() * possibleActivities.length)];
        
        // Move to furniture and use it
        if (choice.furniture) {
            moveToFurniture(choice.furniture, choice.key);
        } else {
            setActivity(choice.key);
        }
    }

    /**
     * Move to a furniture item
     */
    function moveToFurniture(furniture, activityKey) {
        if (!celest || isMoving) return;
        
        isMoving = true;
        pathTarget = { x: furniture.x, y: furniture.y + 30 };
        
        // Announce movement occasionally
        if (Math.random() < 0.3) {
            const messages = ['Celest walks over...', 'Celest heads that way...', 
                            'Celest trots along...'];
            announce(messages[Math.floor(Math.random() * messages.length)]);
        }
        
        // Start walking animation
        startWalkingAnimation();
        
        // Simulate arrival
        const distance = Math.sqrt(
            Math.pow(celest.x - pathTarget.x, 2) + 
            Math.pow(celest.y - pathTarget.y, 2)
        );
        const travelTime = Math.min(distance * 10, 3000);
        
        setTimeout(() => {
            isMoving = false;
            stopWalkingAnimation();
            
            // Position at furniture
            if (celest) {
                celest.x = pathTarget.x;
                celest.y = pathTarget.y;
            }
            
            // Start activity
            setActivity(activityKey, furniture);
        }, travelTime);
    }

    /**
     * Move to a random spot in the room
     */
    function moveToRandomSpot() {
        if (!celest || isMoving) return;
        
        const room = RoomManager.getCurrentRoom();
        const margin = 100;
        
        pathTarget = {
            x: margin + Math.random() * (room.width - margin * 2),
            y: margin + Math.random() * (room.height - margin * 2)
        };
        
        isMoving = true;
        startWalkingAnimation();
        
        const distance = Math.sqrt(
            Math.pow(celest.x - pathTarget.x, 2) + 
            Math.pow(celest.y - pathTarget.y, 2)
        );
        const travelTime = Math.min(distance * 8, 2500);
        
        setTimeout(() => {
            isMoving = false;
            stopWalkingAnimation();
            
            if (celest) {
                celest.x = pathTarget.x;
                celest.y = pathTarget.y;
            }
            
            setActivity('idle');
        }, travelTime);
    }

    /**
     * Set current activity
     */
    function setActivity(activityKey, furniture = null) {
        const activity = ACTIVITIES[activityKey];
        if (!activity) return;
        
        currentActivity = activityKey;
        
        // Update Celest's appearance
        if (celest) {
            celest.activity = activityKey;
            celest.emoji = activity.emoji;
        }
        
        // Announce activity
        if (activity.message) {
            const messages = Array.isArray(activity.message) ? activity.message : [activity.message];
            let message = messages[Math.floor(Math.random() * messages.length)];
            
            if (furniture) {
                const furnitureName = FurnitureCatalog.getItem(furniture.type)?.name || furniture.type;
                message = message.replace('{furniture}', furnitureName);
            }
            
            announce(message);
        }
        
        // Set activity end timer
        const duration = Math.random() * (activity.duration.max - activity.duration.min) + 
                        activity.duration.min;
        
        clearTimeout(activity.endTimer);
        activity.endTimer = setTimeout(() => {
            if (currentActivity === activityKey) {
                setActivity('idle');
            }
        }, duration);
    }

    /**
     * Start walking animation
     */
    function startWalkingAnimation() {
        if (!celest) return;
        
        let frame = 0;
        celest.walkInterval = setInterval(() => {
            frame = (frame + 1) % 2;
            celest.emoji = frame === 0 ? '🐈' : '🐈‍⬛';
        }, 300);
    }

    /**
     * Stop walking animation
     */
    function stopWalkingAnimation() {
        if (celest?.walkInterval) {
            clearInterval(celest.walkInterval);
            celest.walkInterval = null;
        }
    }

    /**
     * Announce something in chat
     */
    function announce(message) {
        if (typeof addChatMessage === 'function') {
            addChatMessage('🐱 Celest', message, true);
        }
        
        // Also dispatch event for other systems
        const event = new CustomEvent('celestActivity', {
            detail: { message, activity: currentActivity }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current activity
     */
    function getCurrentActivity() {
        return {
            key: currentActivity,
            ...ACTIVITIES[currentActivity]
        };
    }

    /**
     * Get Celest's position
     */
    function getCelestPosition() {
        return celest ? { x: celest.x, y: celest.y } : null;
    }

    /**
     * Check if Celest is busy
     */
    function isBusy() {
        return isMoving || currentActivity !== 'idle';
    }

    /**
     * Manually trigger an activity
     */
    function triggerActivity(activityKey, furnitureId = null) {
        if (furnitureId) {
            const roomState = RoomManager.getCurrentRoomState();
            const furniture = roomState.furniture.find(f => f.id === furnitureId);
            if (furniture) {
                moveToFurniture(furniture, activityKey);
                return true;
            }
        }
        
        if (ACTIVITIES[activityKey]) {
            setActivity(activityKey);
            return true;
        }
        return false;
    }

    /**
     * Get available activities for current furniture
     */
    function getAvailableActivities() {
        const roomState = RoomManager.getCurrentRoomState();
        const furniture = roomState.furniture || [];
        
        const available = [];
        
        Object.entries(ACTIVITIES).forEach(([key, activity]) => {
            if (key === 'idle') return;
            
            if (activity.noFurniture) {
                available.push({ key, activity, furniture: null });
            } else {
                const matching = furniture.filter(f => 
                    activity.furniture?.includes(f.type)
                );
                matching.forEach(f => {
                    available.push({ key, activity, furniture: f });
                });
            }
        });
        
        return available;
    }

    /**
     * Call Celest to a position
     */
    function callTo(x, y) {
        if (!celest || isMoving) return false;
        
        announce('Celest comes when called!');
        
        pathTarget = { x, y };
        isMoving = true;
        startWalkingAnimation();
        
        const distance = Math.sqrt(
            Math.pow(celest.x - pathTarget.x, 2) + 
            Math.pow(celest.y - pathTarget.y, 2)
        );
        const travelTime = Math.min(distance * 8, 3000);
        
        setTimeout(() => {
            isMoving = false;
            stopWalkingAnimation();
            
            if (celest) {
                celest.x = pathTarget.x;
                celest.y = pathTarget.y;
            }
            
            setActivity('idle');
        }, travelTime);
        
        return true;
    }

    /**
     * Celest follows the player
     */
    function followPlayer(playerX, playerY) {
        if (!celest || isMoving) return;
        
        const distance = Math.sqrt(
            Math.pow(celest.x - playerX, 2) + 
            Math.pow(celest.y - playerY, 2)
        );
        
        // Only follow if far enough
        if (distance > 100) {
            const angle = Math.atan2(playerY - celest.y, playerX - celest.x);
            const targetDistance = 80;
            
            pathTarget = {
                x: playerX - Math.cos(angle) * targetDistance,
                y: playerY - Math.sin(angle) * targetDistance
            };
            
            isMoving = true;
            startWalkingAnimation();
            
            const travelTime = Math.min(distance * 6, 2000);
            
            setTimeout(() => {
                isMoving = false;
                stopWalkingAnimation();
                
                if (celest) {
                    celest.x = pathTarget.x;
                    celest.y = pathTarget.y;
                }
            }, travelTime);
        }
    }

    /**
     * Update loop (called every frame if needed)
     */
    function update() {
        // Subtle idle animation
        if (celest && !isMoving && currentActivity === 'idle') {
            // Occasionally blink or twitch tail
            if (Math.random() < 0.001) {
                const originalEmoji = celest.emoji;
                celest.emoji = '😺';
                setTimeout(() => {
                    if (celest) celest.emoji = originalEmoji;
                }, 200);
            }
        }
    }

    /**
     * Stop all AI behavior
     */
    function stop() {
        clearTimeout(activityTimer);
        clearTimeout(activity.endTimer);
        stopWalkingAnimation();
    }

    /**
     * Resume AI behavior
     */
    function resume() {
        scheduleNextDecision();
    }

    // Public API
    return {
        init,
        getCurrentActivity,
        getCelestPosition,
        isBusy,
        triggerActivity,
        getAvailableActivities,
        callTo,
        followPlayer,
        update,
        stop,
        resume,
        ACTIVITIES
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIInteractions;
}