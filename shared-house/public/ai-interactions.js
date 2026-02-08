/**
 * Cozy Claw Home - AI Interactions with Layer Awareness
 * Handles Celest interacting with furniture and environment layers
 * 
 * LAYERS (from Palette's system):
 * 0: floor - Floor tiles, rugs, carpets
 * 1: furniture - Chairs, sofas, beds, tables, stoves
 * 2: decor - Plants, lamps, small items
 * 3: wall - Wall hangings, pictures
 * 4: window - Windows, curtains, views
 */

const AIInteractions = (function() {
    'use strict';

    // Celest's state
    let celest = null;
    let currentActivity = 'idle';
    let activityTimer = null;
    let pathTarget = null;
    let isMoving = false;
    let currentRoom = 'living_room';

    // Layer definitions matching Palette's system
    const LAYERS = {
        FLOOR: 0,
        FURNITURE: 1,
        DECOR: 2,
        WALL: 3,
        WINDOW: 4
    };

    // Celest's preferences by room type
    const CELEST_PREFERENCES = {
        living_room: {
            favoriteFloors: ['hardwood', 'rug_round', 'rug_rectangle'],
            favoriteWalls: ['warm_beige', 'soft_cream'],
            favoriteFurniture: ['sofa_classic', 'armchair_blue', 'coffee_table'],
            preferredActivity: 'sitting',
            windowView: 'city',
            messages: {
                floor: ["I love the hardwood!", "This rug feels so cozy under my paws.", "The floor matches the vibe perfectly!"],
                wall: ["This color is so calming", "The walls feel warm and inviting", "I love this wallpaper choice!"],
                furniture: ["This sofa is perfect for naps!", "I could sit here all day", "Such comfy furniture!"],
                decor: ["This room needs a plant!", "A lamp would look nice here", "Maybe a painting on that wall?"],
                window: ["The city lights are beautiful", "I love watching the world go by", "Such a lovely view!"]
            }
        },
        bedroom: {
            favoriteFloors: ['soft_carpet', 'hardwood', 'rug_fluffy'],
            favoriteWalls: ['pastel_blue', 'soft_lavender', 'cream'],
            favoriteFurniture: ['bed_double', 'bed_single', 'nightstand'],
            preferredActivity: 'sleeping',
            windowView: 'forest',
            messages: {
                floor: ["So soft on my paws!", "I love the carpet here", "Perfect for late-night pacing"],
                wall: ["These colors help me sleep", "So peaceful", "Dreamy vibes ✨"],
                furniture: ["Time for a nap!", "This bed looks so comfy", "Zzz... just looking at it makes me sleepy"],
                decor: ["A night light would be nice", "Maybe a plant for fresh air?", "Some curtains would be cozy"],
                window: ["The trees are so pretty", "Nature helps me relax", "I can hear the birds!"]
            }
        },
        kitchen: {
            favoriteFloors: ['tile', 'hardwood', 'vinyl'],
            favoriteWalls: ['sage_green', 'warm_white', 'cream'],
            favoriteFurniture: ['stove', 'kitchen_island', 'dining_table', 'fridge'],
            preferredActivity: 'cooking',
            windowView: 'garden',
            messages: {
                floor: ["Easy to clean - purrfect!", "I like the tiles here", "No slipping on this floor"],
                wall: ["These walls feel fresh", "Clean and bright!", "Great for a kitchen"],
                furniture: ["Time to cook!", "What's for dinner?", "I love helping in the kitchen"],
                decor: ["Some herbs would be nice", "A fruit bowl would look good", "Maybe some hanging plants?"],
                window: ["The garden looks lovely", "Fresh air while cooking", "I can see the herbs growing!"]
            }
        },
        office: {
            favoriteFloors: ['hardwood', 'rug_rectangle', 'carpet'],
            favoriteWalls: ['soft_gray', 'warm_white'],
            favoriteFurniture: ['desk_wood', 'desk_modern', 'bookshelf_tall', 'desk_chair'],
            preferredActivity: 'working',
            windowView: 'city',
            messages: {
                floor: ["Professional but cozy", "Good for rolling around in my chair", "Solid flooring for work mode"],
                wall: ["Helps me focus", "Clean and simple", "Good for concentration"],
                furniture: ["Time to be productive!", "Let's get to work", "I love a good desk setup"],
                decor: ["A plant would boost productivity", "Good lighting is important", "Maybe some motivational art?"],
                window: ["City view for inspiration", "Watching people hustle motivates me", "Great natural light!"]
            }
        },
        bathroom: {
            favoriteFloors: ['tile', 'heated_tile', 'stone'],
            favoriteWalls: ['aqua', 'soft_white', 'pale_blue'],
            favoriteFurniture: ['bathtub', 'sink_vanity', 'mirror'],
            preferredActivity: 'bathing',
            windowView: 'frosted',
            messages: {
                floor: ["Love the tiles!", "So clean and cool", "Heated floors? Luxury!"],
                wall: ["Fresh and clean vibes", "Love the aqua tones", "Very spa-like"],
                furniture: ["Bath time!", "I could soak for hours", "Self-care is important"],
                decor: ["Some eucalyptus would be nice", "Candles for ambiance", "A soft rug by the tub"],
                window: ["Privacy is key", "Frosted glass is smart", "Natural light but private"]
            }
        },
        garden: {
            favoriteFloors: ['grass', 'patio', 'deck'],
            favoriteWalls: ['fence', 'hedge', 'brick'],
            favoriteFurniture: ['garden_bench', 'patio_set', 'hammock', 'grill'],
            preferredActivity: 'watering',
            windowView: 'sky',
            messages: {
                floor: ["Love the grass between my toes!", "The patio is so warm", "Natural vibes"],
                wall: ["The hedge gives nice privacy", "Love the brick texture", "Nature's wallpaper!"],
                furniture: ["Time to grill!", "The hammock looks inviting", "Perfect for outdoor naps"],
                decor: ["More flowers!", "Wind chimes would be nice", "Solar lights for evening"],
                window: ["The sky is so blue today!", "Great stargazing spot", "Love the breeze"]
            }
        }
    };

    // Activity definitions with layer requirements
    const ACTIVITIES = {
        idle: {
            name: 'Idle',
            emoji: '😺',
            duration: { min: 3000, max: 8000 },
            layer: null,
            canDo: () => true
        },
        sitting: {
            name: 'Sitting',
            emoji: '😸',
            duration: { min: 5000, max: 15000 },
            layer: LAYERS.FURNITURE,
            furniture: ['sofa_classic', 'sofa_modern', 'sofa_rustic', 'loveseat', 'armchair_blue', 
                       'bean_bag', 'bar_stool', 'dining_chair', 'desk_chair', 'garden_bench', 
                       'patio_chair', 'hammock'],
            message: ['Celest curls up on the {furniture}', 'Celest settles in for a cozy sit',
                     'Celest makes herself comfortable', 'Celest claims this spot'],
            interaction: 'sit_on'
        },
        sleeping: {
            name: 'Sleeping',
            emoji: '😴',
            duration: { min: 10000, max: 30000 },
            layer: LAYERS.FURNITURE,
            furniture: ['bed_single', 'bed_double', 'bed_bunk', 'sofa_classic', 'hammock'],
            message: ['Celest drifts off to sleep', 'Celest takes a cat nap',
                     'Celest is dreaming peacefully', 'Celest snores softly'],
            interaction: 'sleep_in'
        },
        cooking: {
            name: 'Cooking',
            emoji: '👩‍🍳',
            duration: { min: 8000, max: 20000 },
            layer: LAYERS.FURNITURE,
            furniture: ['stove', 'kitchen_counter', 'kitchen_island', 'grill', 'fire_pit'],
            message: ['Celest is preparing something tasty', 'Celest cooks up a storm',
                     'Celest stirs the pot', 'Celest adds a pinch of magic'],
            interaction: 'cook_at'
        },
        working: {
            name: 'Working',
            emoji: '💻',
            duration: { min: 8000, max: 20000 },
            layer: LAYERS.FURNITURE,
            furniture: ['desk_wood', 'desk_modern', 'kitchen_island'],
            message: ['Celest is focused on work', 'Celest types away',
                     'Celest is in the zone', 'Celest codes with concentration'],
            interaction: 'work_at'
        },
        reading: {
            name: 'Reading',
            emoji: '📖',
            duration: { min: 8000, max: 20000 },
            layer: LAYERS.FURNITURE,
            furniture: ['desk_wood', 'bookshelf_tall', 'bookshelf_wide', 'sofa_classic', 
                       'armchair_blue', 'garden_bench'],
            message: ['Celest is lost in a good book', 'Celest turns the page',
                     'Celest smiles at something she read', 'Celest bookmarks her place'],
            interaction: 'read_at'
        },
        watering: {
            name: 'Watering Plants',
            emoji: '🌱',
            duration: { min: 5000, max: 12000 },
            layer: LAYERS.DECOR,
            furniture: ['plant_succulent', 'plant_fern', 'plant_monstera', 'plant_flower', 
                       'herb_garden', 'flower_bed', 'shrub', 'tree'],
            message: ['Celest waters the {furniture}', 'Celest tends to the plants',
                     'Celest talks to the {furniture}', 'Celest gives them some love'],
            interaction: 'water_plant'
        },
        lightOn: {
            name: 'Turning On Light',
            emoji: '💡',
            duration: { min: 2000, max: 4000 },
            layer: LAYERS.DECOR,
            furniture: ['lamp_floor', 'lamp_desk', 'lamp_string', 'candle'],
            message: ['Celest turns on the light', 'Celest lights a candle',
                     'That\'s better!', 'Cozy lighting activated'],
            interaction: 'turn_on_light'
        },
        lookingAtDecor: {
            name: 'Admiring Decor',
            emoji: '🖼️',
            duration: { min: 3000, max: 6000 },
            layer: LAYERS.DECOR,
            furniture: ['painting_landscape', 'painting_abstract', 'rug_round', 'rug_rectangle'],
            message: ['Celest admires the decor', 'Celest appreciates the art',
                     'This really ties the room together', 'Celest has good taste'],
            interaction: 'look_at'
        },
        windowGazing: {
            name: 'Looking Out Window',
            emoji: '🪟',
            duration: { min: 6000, max: 15000 },
            layer: LAYERS.WINDOW,
            furniture: ['window_city', 'window_forest', 'window_beach', 'window_space', 
                       'window_mountain', 'window', 'window_frosted'],
            message: ['Celest watches the world outside', 'Celest spots a bird!',
                     'Celest enjoys the view', 'Celest wonders what\'s out there'],
            interaction: 'look_out'
        },
        curtainControl: {
            name: 'Adjusting Curtains',
            emoji: '🌅',
            duration: { min: 2000, max: 4000 },
            layer: LAYERS.WINDOW,
            furniture: ['window_city', 'window_forest', 'window_beach', 'window'],
            message: ['Celest opens the curtains', 'Celest closes the curtains for privacy',
                     'Better lighting now!', 'Celest adjusts the drapes'],
            interaction: 'adjust_curtains'
        },
        bathing: {
            name: 'Bathing',
            emoji: '🛁',
            duration: { min: 10000, max: 25000 },
            layer: LAYERS.FURNITURE,
            furniture: ['bathtub', 'shower'],
            message: ['Celest enjoys a warm bath', 'Celest relaxes in the tub',
                     'Celest adds some bubbles', 'Celest hums a tune'],
            interaction: 'bathe_in'
        },
        grooming: {
            name: 'Grooming',
            emoji: '🪞',
            duration: { min: 5000, max: 10000 },
            layer: LAYERS.FURNITURE,
            furniture: ['sink_vanity', 'mirror', 'vanity'],
            message: ['Celest checks her reflection', 'Celest fixes her whiskers',
                     'Celest looks fabulous', 'Celest washes her paws'],
            interaction: 'groom_at'
        },
        grilling: {
            name: 'Grilling',
            emoji: '🔥',
            duration: { min: 8000, max: 18000 },
            layer: LAYERS.FURNITURE,
            furniture: ['grill', 'fire_pit'],
            message: ['Celest tends the fire', 'Celest grills something delicious',
                     'Celest enjoys the warmth', 'Celest roasts marshmallows'],
            interaction: 'grill_at'
        },
        playing: {
            name: 'Playing',
            emoji: '🧶',
            duration: { min: 6000, max: 15000 },
            layer: LAYERS.FLOOR,
            furniture: ['rug_round', 'rug_rectangle', 'outdoor_rug'],
            message: ['Celest plays on the rug', 'Celest rolls around happily',
                     'Celest finds a comfy spot', 'Celest stretches out'],
            interaction: 'play_on'
        },
        exploring: {
            name: 'Exploring',
            emoji: '🔍',
            duration: { min: 4000, max: 10000 },
            layer: null,
            noFurniture: true,
            message: ['Celest investigates a corner', 'Celest finds something interesting',
                     'Celest is curious', 'Celest sniffs around'],
            interaction: 'explore'
        },
        footstepDance: {
            name: 'Tapping Feet',
            emoji: '🐾',
            duration: { min: 2000, max: 4000 },
            layer: LAYERS.FLOOR,
            floorTypes: ['hardwood', 'tile', 'stone', 'deck'],
            message: ['*tap tap tap*', 'Celest\'s paws make little sounds',
                     'Happy feet!', '*soft paw sounds*'],
            interaction: 'footsteps'
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

    // Floor type to footstep sound mapping (visual feedback)
    const FOOTSTEP_EFFECTS = {
        hardwood: { emoji: '🪵', sound: 'soft tap' },
        tile: { emoji: '🏠', sound: 'light click' },
        carpet: { emoji: '🟫', sound: 'soft thud' },
        rug_round: { emoji: '⭕', sound: 'muffled step' },
        rug_rectangle: { emoji: '⬜', sound: 'muffled step' },
        grass: { emoji: '🌿', sound: 'rustle' },
        stone: { emoji: '🪨', sound: 'clack' },
        deck: { emoji: '🌲', sound: 'creak' }
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

        // Add furniture placement listener for suggestions
        if (window.socket) {
            window.socket.on('decor:changed', handleDecorChange);
        }

        console.log('🐱 Celest AI initialized with layer awareness');
    }

    /**
     * Handle room change - update preferences and comments
     */
    function handleRoomChange(event, data) {
        if (event === 'roomChange') {
            currentRoom = data.to || 'living_room';
            
            // Celest follows to new room
            setTimeout(() => {
                announce(`Celest follows you to the ${data.toState?.name || 'new room'}`);
                
                // Comment on new room's layers
                setTimeout(() => commentOnRoomLayers(), 1500);
                
                chooseNewActivity();
            }, 1000);
        }
    }

    /**
     * Comment on room layers when entering
     */
    function commentOnRoomLayers() {
        const prefs = CELEST_PREFERENCES[currentRoom] || CELEST_PREFERENCES.living_room;
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        
        // Check what layers have items
        const layersPresent = {
            floor: roomState.furniture?.some(f => f.layer === LAYERS.FLOOR),
            furniture: roomState.furniture?.some(f => f.layer === LAYERS.FURNITURE),
            decor: roomState.furniture?.some(f => f.layer === LAYERS.DECOR),
            wall: roomState.furniture?.some(f => f.layer === LAYERS.WALL),
            window: roomState.furniture?.some(f => f.layer === LAYERS.WINDOW)
        };

        // Pick something to comment on
        const comments = [];
        
        if (layersPresent.floor) {
            comments.push(prefs.messages.floor[Math.floor(Math.random() * prefs.messages.floor.length)]);
        }
        if (layersPresent.wall) {
            comments.push(prefs.messages.wall[Math.floor(Math.random() * prefs.messages.wall.length)]);
        }
        if (layersPresent.furniture) {
            comments.push(prefs.messages.furniture[Math.floor(Math.random() * prefs.messages.furniture.length)]);
        }
        if (!layersPresent.decor) {
            // Suggest decor if missing
            comments.push(prefs.messages.decor[Math.floor(Math.random() * prefs.messages.decor.length)]);
        }
        if (layersPresent.window) {
            comments.push(prefs.messages.window[Math.floor(Math.random() * prefs.messages.window.length)]);
        }

        if (comments.length > 0) {
            const comment = comments[Math.floor(Math.random() * comments.length)];
            setTimeout(() => announce(comment), 500);
        }
    }

    /**
     * Handle decor changes - Celest reacts to new items
     */
    function handleDecorChange(data) {
        if (!data || !data.item) return;
        
        const item = data.item;
        const prefs = CELEST_PREFERENCES[currentRoom] || CELEST_PREFERENCES.living_room;
        
        // React based on layer
        switch(item.layer) {
            case LAYERS.FLOOR:
                if (prefs.favoriteFloors.includes(item.type)) {
                    announce(`Ooh, I love this ${item.name || item.type}!`);
                }
                break;
            case LAYERS.WALL:
                if (Math.random() < 0.5) {
                    announce(`That looks great on the wall!`);
                }
                break;
            case LAYERS.FURNITURE:
                if (prefs.favoriteFurniture.includes(item.type)) {
                    announce(`I've been wanting one of those!`);
                    // Move to interact with it
                    setTimeout(() => moveToFurniture(item, getInteractionForFurniture(item)), 1000);
                }
                break;
            case LAYERS.DECOR:
                announce(`That ${item.name || 'decoration'} really ties the room together! ✨`);
                break;
            case LAYERS.WINDOW:
                announce(`The view is lovely!`);
                break;
        }
    }

    /**
     * Get appropriate interaction for furniture type
     */
    function getInteractionForFurniture(furniture) {
        const activity = Object.entries(ACTIVITIES).find(([key, act]) => {
            return act.furniture?.includes(furniture.type);
        });
        return activity ? activity[0] : 'lookingAtDecor';
    }

    /**
     * Start the behavior decision loop
     */
    function startBehaviorLoop() {
        setTimeout(chooseNewActivity, 2000);
        scheduleNextDecision();
    }

    /**
     * Schedule next decision
     */
    function scheduleNextDecision() {
        const interval = Math.random() * 10000 + 5000;
        activityTimer = setTimeout(() => {
            if (!isMoving) {
                decideNextAction();
            }
            scheduleNextDecision();
        }, interval);
    }

    /**
     * Decide what to do next based on layers and preferences
     */
    function decideNextAction() {
        const roll = Math.random();
        const prefs = CELEST_PREFERENCES[currentRoom] || CELEST_PREFERENCES.living_room;
        
        if (roll < 0.3) {
            // 30% chance to use preferred furniture
            choosePreferredActivity(prefs);
        } else if (roll < 0.6) {
            // 30% chance to use any furniture by layer
            chooseLayerBasedActivity();
        } else if (roll < 0.8) {
            // 20% chance to move to new spot
            moveToRandomSpot();
        } else if (roll < 0.9) {
            // 10% chance to do footstep dance on floor
            doFootstepDance();
        } else {
            // 10% chance to stay idle
            setActivity('idle');
        }
    }

    /**
     * Choose activity based on room preferences
     */
    function choosePreferredActivity(prefs) {
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        const furniture = roomState.furniture || [];
        
        // Find preferred furniture
        const preferred = furniture.filter(f => 
            prefs.favoriteFurniture.includes(f.type)
        );
        
        if (preferred.length > 0) {
            const chosen = preferred[Math.floor(Math.random() * preferred.length)];
            const activity = getInteractionForFurniture(chosen);
            moveToFurniture(chosen, activity);
        } else {
            chooseLayerBasedActivity();
        }
    }

    /**
     * Choose activity based on available layers
     */
    function chooseLayerBasedActivity() {
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        const furniture = roomState.furniture || [];
        
        // Group furniture by layer
        const byLayer = {
            [LAYERS.FLOOR]: furniture.filter(f => f.layer === LAYERS.FLOOR),
            [LAYERS.FURNITURE]: furniture.filter(f => f.layer === LAYERS.FURNITURE),
            [LAYERS.DECOR]: furniture.filter(f => f.layer === LAYERS.DECOR),
            [LAYERS.WALL]: furniture.filter(f => f.layer === LAYERS.WALL),
            [LAYERS.WINDOW]: furniture.filter(f => f.layer === LAYERS.WINDOW)
        };

        // Weight layers by interesting interactions
        const layerWeights = [
            { layer: LAYERS.FURNITURE, weight: 0.4, activities: ['sitting', 'sleeping', 'cooking', 'working', 'reading'] },
            { layer: LAYERS.DECOR, weight: 0.25, activities: ['watering', 'lightOn', 'lookingAtDecor'] },
            { layer: LAYERS.WINDOW, weight: 0.2, activities: ['windowGazing', 'curtainControl'] },
            { layer: LAYERS.FLOOR, weight: 0.1, activities: ['playing', 'footstepDance'] },
            { layer: LAYERS.WALL, weight: 0.05, activities: ['lookingAtDecor'] }
        ];

        // Pick a layer based on weights
        const rand = Math.random();
        let cumulative = 0;
        let selectedLayer = null;
        
        for (const lw of layerWeights) {
            cumulative += lw.weight;
            if (rand <= cumulative && byLayer[lw.layer].length > 0) {
                selectedLayer = lw;
                break;
            }
        }

        if (selectedLayer) {
            // Pick furniture from this layer
            const items = byLayer[selectedLayer.layer];
            const chosen = items[Math.floor(Math.random() * items.length)];
            
            // Find matching activity
            const activity = Object.entries(ACTIVITIES).find(([key, act]) => {
                return act.furniture?.includes(chosen.type) && 
                       selectedLayer.activities.includes(key);
            });
            
            if (activity) {
                moveToFurniture(chosen, activity[0]);
            } else {
                // Generic look at item
                moveToFurniture(chosen, 'lookingAtDecor');
            }
        } else {
            // No furniture - explore or suggest decor
            if (Math.random() < 0.5) {
                setActivity('exploring');
            } else {
                suggestDecor();
            }
        }
    }

    /**
     * Suggest decorations for the room
     */
    function suggestDecor() {
        const prefs = CELEST_PREFERENCES[currentRoom] || CELEST_PREFERENCES.living_room;
        const suggestions = prefs.messages.decor;
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        announce(`💭 ${suggestion}`);
    }

    /**
     * Do footstep dance on floor
     */
    function doFootstepDance() {
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        const floors = roomState.furniture?.filter(f => f.layer === LAYERS.FLOOR);
        
        if (floors && floors.length > 0) {
            const floor = floors[Math.floor(Math.random() * floors.length)];
            const effect = FOOTSTEP_EFFECTS[floor.type] || { emoji: '👣', sound: 'step' };
            
            announce(`${effect.emoji} *${effect.sound}* *${effect.sound}*`);
            setActivity('footstepDance', floor);
        } else {
            announce('👣 *soft paw steps*');
            setActivity('idle');
        }
    }

    /**
     * Choose a new activity based on available furniture
     */
    function chooseNewActivity() {
        chooseLayerBasedActivity();
    }

    /**
     * Move to a furniture item with layer-aware positioning
     */
    function moveToFurniture(furniture, activityKey) {
        if (!celest || isMoving) return;
        
        isMoving = true;
        
        // Calculate target position based on layer
        let targetX = furniture.x;
        let targetY = furniture.y;
        
        // Adjust position based on layer for proper visual layering
        switch(furniture.layer) {
            case LAYERS.FLOOR:
                // Stand on the floor item
                targetY += 20;
                break;
            case LAYERS.FURNITURE:
                // Position to "sit" on furniture
                targetY += 10;
                break;
            case LAYERS.DECOR:
                // Stand next to decor items
                targetX += 30;
                targetY += 20;
                break;
            case LAYERS.WALL:
                // Stand in front of wall items
                targetY += 40;
                break;
            case LAYERS.WINDOW:
                // Stand at window looking out
                targetY += 30;
                break;
        }
        
        pathTarget = { x: targetX, y: targetY };
        
        // Announce movement occasionally
        if (Math.random() < 0.3) {
            const messages = ['Celest walks over...', 'Celest heads that way...', 
                            'Celest trots along...'];
            announce(messages[Math.floor(Math.random() * messages.length)]);
        }
        
        // Start walking animation
        startWalkingAnimation();
        
        // Calculate travel time with pathfinding consideration
        const distance = Math.sqrt(
            Math.pow(celest.x - pathTarget.x, 2) + 
            Math.pow(celest.y - pathTarget.y, 2)
        );
        
        // Add slight delay for "pathfinding around furniture"
        const travelTime = Math.min(distance * 10, 3000) + 200;
        
        setTimeout(() => {
            isMoving = false;
            stopWalkingAnimation();
            
            // Position at furniture
            if (celest) {
                celest.x = pathTarget.x;
                celest.y = pathTarget.y;
                
                // Set z-index based on layer for proper visual stacking
                if (furniture.layer !== undefined) {
                    celest.zIndex = 20 + furniture.layer;
                }
            }
            
            // Start activity
            setActivity(activityKey, furniture);
            
            // Emit interaction event for other systems
            const event = new CustomEvent('celestLayerInteraction', {
                detail: { 
                    activity: activityKey, 
                    furniture: furniture,
                    layer: furniture.layer,
                    room: currentRoom
                }
            });
            document.dispatchEvent(event);
            
        }, travelTime);
    }

    /**
     * Move to a random spot in the room with layer awareness
     */
    function moveToRandomSpot() {
        if (!celest || isMoving) return;
        
        const room = RoomManager.getCurrentRoom ? 
            RoomManager.getCurrentRoom() : { width: 800, height: 600 };
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
                celest.zIndex = 25; // Default walking z-index
            }
            
            setActivity('idle');
        }, travelTime);
    }

    /**
     * Set current activity with layer context
     */
    function setActivity(activityKey, furniture = null) {
        const activity = ACTIVITIES[activityKey];
        if (!activity) return;
        
        currentActivity = activityKey;
        
        // Update Celest's appearance
        if (celest) {
            celest.activity = activityKey;
            celest.emoji = activity.emoji;
            
            // Adjust z-index based on activity layer
            if (activity.layer !== undefined) {
                celest.zIndex = 20 + activity.layer;
            }
        }
        
        // Announce activity
        if (activity.message) {
            const messages = Array.isArray(activity.message) ? activity.message : [activity.message];
            let message = messages[Math.floor(Math.random() * messages.length)];
            
            if (furniture) {
                const furnitureName = furniture.name || furniture.type;
                message = message.replace('{furniture}', furnitureName);
            }
            
            announce(message);
        }
        
        // Trigger layer-specific effects
        triggerLayerEffects(activity, furniture);
        
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
     * Trigger effects based on layer and activity
     */
    function triggerLayerEffects(activity, furniture) {
        if (!furniture) return;
        
        switch(activity.layer) {
            case LAYERS.FLOOR:
                // Footstep effects
                if (furniture.type && FOOTSTEP_EFFECTS[furniture.type]) {
                    const effect = FOOTSTEP_EFFECTS[furniture.type];
                    // Visual feedback could be added here
                }
                break;
                
            case LAYERS.FURNITURE:
                // Furniture interaction effects
                if (activity.interaction === 'sit_on' || activity.interaction === 'sleep_in') {
                    // Compress slightly to show "sitting"
                    if (celest) {
                        celest.scaleY = 0.9;
                    }
                } else if (activity.interaction === 'cook_at' || activity.interaction === 'work_at') {
                    // Animation could be added here
                }
                break;
                
            case LAYERS.DECOR:
                // Decor interaction effects
                if (activity.interaction === 'turn_on_light') {
                    // Emit lighting change event
                    const lightEvent = new CustomEvent('layerLightingChange', {
                        detail: { item: furniture, state: 'on', room: currentRoom }
                    });
                    document.dispatchEvent(lightEvent);
                } else if (activity.interaction === 'water_plant') {
                    // Plant watered effect
                    const waterEvent = new CustomEvent('plantWatered', {
                        detail: { plant: furniture }
                    });
                    document.dispatchEvent(waterEvent);
                }
                break;
                
            case LAYERS.WINDOW:
                // Window interaction effects
                if (activity.interaction === 'adjust_curtains') {
                    const curtainEvent = new CustomEvent('curtainToggled', {
                        detail: { window: furniture, room: currentRoom }
                    });
                    document.dispatchEvent(curtainEvent);
                }
                break;
        }
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
        // Reset scale
        if (celest) {
            celest.scaleY = 1;
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
            detail: { message, activity: currentActivity, room: currentRoom }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current activity
     */
    function getCurrentActivity() {
        return {
            key: currentActivity,
            layer: ACTIVITIES[currentActivity]?.layer,
            ...ACTIVITIES[currentActivity]
        };
    }

    /**
     * Get Celest's position
     */
    function getCelestPosition() {
        return celest ? { x: celest.x, y: celest.y, zIndex: celest.zIndex } : null;
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
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        
        if (furnitureId) {
            const furniture = roomState.furniture?.find(f => f.id === furnitureId);
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
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        const furniture = roomState.furniture || [];
        
        const available = [];
        
        Object.entries(ACTIVITIES).forEach(([key, activity]) => {
            if (key === 'idle') return;
            
            if (activity.noFurniture) {
                available.push({ key, activity, furniture: null, layer: activity.layer });
            } else {
                const matching = furniture.filter(f => 
                    activity.furniture?.includes(f.type)
                );
                matching.forEach(f => {
                    available.push({ key, activity, furniture: f, layer: f.layer });
                });
            }
        });
        
        return available;
    }

    /**
     * Get activities for a specific layer
     */
    function getActivitiesForLayer(layerIndex) {
        const roomState = RoomManager.getCurrentRoomState ? 
            RoomManager.getCurrentRoomState() : { furniture: [] };
        const furniture = roomState.furniture?.filter(f => f.layer === layerIndex) || [];
        
        const available = [];
        
        Object.entries(ACTIVITIES).forEach(([key, activity]) => {
            if (activity.layer === layerIndex || 
                (activity.noFurniture && layerIndex === null)) {
                
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
     * Celest follows the player with pathfinding
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
     * Get Celest's preferences for current room
     */
    function getRoomPreferences() {
        return CELEST_PREFERENCES[currentRoom] || CELEST_PREFERENCES.living_room;
    }

    /**
     * Update Celest's current room
     */
    function setCurrentRoom(roomId) {
        currentRoom = roomId;
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
        getActivitiesForLayer,
        getRoomPreferences,
        setCurrentRoom,
        callTo,
        followPlayer,
        suggestDecor,
        LAYERS,
        CELEST_PREFERENCES,
        ACTIVITIES,
        update,
        stop,
        resume
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIInteractions;
}
