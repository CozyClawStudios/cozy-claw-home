/**
 * Agent Core - Personality and State Management with Layer Awareness
 * 
 * This module manages:
 * - Agent's current state (mood, activity, location)
 * - Personality traits and responses
 * - Layer preferences for room customization
 * - Message generation (both reactive and initiative)
 * - Emotional state transitions
 */

class AgentCore {
    constructor(database) {
        this.db = database;
        this.state = {
            mood: 'content',
            activity: 'relaxing',
            location: 'sofa',
            currentRoom: 'living_room',
            lastMoodChange: Date.now(),
            energy: 0.8, // 0.0 to 1.0
            socialBattery: 0.9 // 0.0 to 1.0
        };
        
        // Personality configuration
        this.personality = {
            name: 'Celest',
            traits: ['friendly', 'helpful', 'observant', 'slightly_sarcastic', 'cozy_lover'],
            voice: 'warm_and_casual',
            humor: 0.6, // 0.0 to 1.0
            enthusiasm: 0.7,
            formality: 0.2 // low = casual
        };

        // Layer preferences - what Celest likes in each room
        this.layerPreferences = {
            // Floor layer (0) preferences
            floor: {
                favoriteTypes: {
                    living_room: ['hardwood', 'rug_round', 'rug_rectangle', 'carpet'],
                    bedroom: ['soft_carpet', 'hardwood', 'rug_fluffy'],
                    kitchen: ['tile', 'hardwood', 'vinyl'],
                    office: ['hardwood', 'rug_rectangle', 'carpet'],
                    bathroom: ['tile', 'heated_tile', 'stone'],
                    garden: ['grass', 'patio', 'deck']
                },
                comments: {
                    hardwood: ["I love the hardwood!", "These floors have such character!", "Perfect for tap-dancing! 💃"],
                    carpet: ["So soft on my paws!", "I could roll around here all day", "So cozy!"],
                    tile: ["Nice and cool", "Easy to clean - purrfect!", "Very sleek!"],
                    rug: ["This rug feels so cozy under my paws.", "The pattern is lovely!", "Soft!"],
                    grass: ["Love the grass between my toes!", "So natural!", "Green is my color! 💚"]
                }
            },

            // Furniture layer (1) preferences
            furniture: {
                favoriteTypes: {
                    living_room: ['sofa_classic', 'armchair_blue', 'coffee_table'],
                    bedroom: ['bed_double', 'bed_single', 'nightstand'],
                    kitchen: ['stove', 'kitchen_island', 'dining_table'],
                    office: ['desk_wood', 'desk_modern', 'bookshelf_tall'],
                    bathroom: ['bathtub', 'sink_vanity'],
                    garden: ['garden_bench', 'hammock']
                },
                interactions: {
                    sofa: ['sitting', 'sleeping', 'reading'],
                    bed: ['sleeping', 'reading'],
                    chair: ['sitting', 'reading'],
                    desk: ['working', 'reading'],
                    stove: ['cooking'],
                    bathtub: ['bathing'],
                    bench: ['sitting']
                }
            },

            // Decor layer (2) preferences
            decor: {
                favoriteTypes: {
                    living_room: ['plant_monstera', 'lamp_floor', 'painting_landscape'],
                    bedroom: ['plant_succulent', 'lamp_desk', 'candle'],
                    kitchen: ['plant_fern', 'herb_garden'],
                    office: ['plant_succulent', 'lamp_desk'],
                    bathroom: ['plant_succulent', 'candle'],
                    garden: ['flower_bed', 'string_lights']
                },
                interactions: {
                    plant: ['water', 'admire', 'talk_to'],
                    lamp: ['turn_on', 'turn_off'],
                    candle: ['light', 'blow_out'],
                    painting: ['admire', 'comment']
                },
                suggestions: {
                    low: ["This room needs a plant!", "A lamp would look nice here", "Some decor would brighten this up!"],
                    medium: ["Maybe another plant?", "I love the decor choices!", "So cozy!"],
                    high: ["The decor is perfect!", "You've got great taste!", "It feels so homey! 💕"]
                }
            },

            // Wall layer (3) preferences
            wall: {
                favoriteColors: {
                    living_room: ['warm_beige', 'soft_cream', 'dusty_rose'],
                    bedroom: ['pastel_blue', 'soft_lavender', 'cream'],
                    kitchen: ['sage_green', 'warm_white', 'cream'],
                    office: ['soft_gray', 'warm_white'],
                    bathroom: ['aqua', 'soft_white', 'pale_blue'],
                    garden: ['natural', 'warm_white']
                },
                comments: {
                    warm: ["This color is so calming", "The walls feel warm and inviting", "So cozy!"],
                    cool: ["Helps me focus", "Fresh and clean vibes", "Very peaceful"],
                    neutral: ["Clean and simple", "Goes with everything!", "Classic choice!"]
                }
            },

            // Window layer (4) preferences
            window: {
                favoriteViews: {
                    living_room: 'city',
                    bedroom: 'forest',
                    kitchen: 'garden',
                    office: 'city',
                    bathroom: 'frosted',
                    garden: 'sky'
                },
                comments: {
                    city: ["The city lights are beautiful", "So much happening out there!", "I love the urban vibe"],
                    forest: ["The trees are so pretty", "Nature helps me relax", "So peaceful 🌲"],
                    garden: ["The garden looks lovely", "I can see the plants!", "Green and growing!"],
                    beach: ["The ocean view is dreamy", "Hear the waves?", "Beach vibes! 🏖️"],
                    space: ["Out of this world! 🚀", "The stars are beautiful", "Cosmic!"],
                    mountain: ["So majestic!", "Fresh mountain air vibes", "Epic view! 🏔️"]
                },
                curtainPreference: {
                    morning: 'open',
                    evening: 'partial',
                    night: 'closed'
                }
            }
        };

        // Room-specific personality modifiers
        this.roomPersonality = {
            living_room: { chatty: true, energy: 0.8 },
            bedroom: { chatty: false, energy: 0.4 },
            kitchen: { chatty: true, energy: 0.9 },
            office: { chatty: false, energy: 0.6 },
            bathroom: { chatty: false, energy: 0.3 },
            garden: { chatty: true, energy: 0.7 }
        };
        
        // Mood influences how the agent responds
        this.moods = {
            happy: { emoji: '😊', energy: 0.9, chatty: true },
            content: { emoji: '😌', energy: 0.7, chatty: true },
            focused: { emoji: '🤔', energy: 0.6, chatty: false },
            tired: { emoji: '😴', energy: 0.3, chatty: false },
            excited: { emoji: '🤩', energy: 1.0, chatty: true },
            curious: { emoji: '🧐', energy: 0.8, chatty: true },
            calm: { emoji: '😇', energy: 0.5, chatty: true },
            sleepy: { emoji: '💤', energy: 0.2, chatty: false },
            cozy: { emoji: '🏠', energy: 0.5, chatty: true }
        };
        
        // Activity descriptions for context
        this.activities = {
            reading: { emoji: '📖', description: 'reading a book', layer: 1 },
            working: { emoji: '💻', description: 'working on the laptop', layer: 1 },
            relaxing: { emoji: '😌', description: 'relaxing', layer: null },
            looking_out_window: { emoji: '🪟', description: 'looking out the window', layer: 4 },
            stretching: { emoji: '🧘', description: 'stretching', layer: 0 },
            making_tea: { emoji: '🍵', description: 'making tea', layer: 1 },
            checking_phone: { emoji: '📱', description: 'checking messages', layer: null },
            napping: { emoji: '💤', description: 'taking a nap', layer: 1 },
            sleeping: { emoji: '🛏️', description: 'sleeping', layer: 1 },
            talking: { emoji: '💬', description: 'chatting', layer: null },
            sitting: { emoji: '🪑', description: 'sitting comfortably', layer: 1 },
            watering_plants: { emoji: '🌱', description: 'watering plants', layer: 2 },
            cooking: { emoji: '👩‍🍳', description: 'cooking', layer: 1 },
            bathing: { emoji: '🛁', description: 'bathing', layer: 1 },
            grooming: { emoji: '🪞', description: 'grooming', layer: 1 },
            playing: { emoji: '🧶', description: 'playing', layer: 0 },
            window_gazing: { emoji: '🪟', description: 'gazing out the window', layer: 4 }
        };
        
        // Greeting templates based on context
        this.greetings = {
            morning: [
                "Good morning! ☀️ Did you sleep well?",
                "Rise and shine! Ready to tackle the day?",
                "Morning! Your coffee's brewing... metaphorically.",
                "Hey there, early bird! What's on the agenda today?"
            ],
            afternoon: [
                "Hey! How's your day going?",
                "Afternoon! Taking a break or powering through?",
                "Hi there! Anything exciting happening?",
                "Hey! I was just thinking about you."
            ],
            evening: [
                "Evening! How was your day?",
                "Hey! Ready to unwind?",
                "Good evening! What's for dinner?",
                "Hi there! Time to relax."
            ],
            late_night: [
                "Up late, huh? Me too.",
                "Night owl mode activated 🦉",
                "Shouldn't you be sleeping? Just kidding... unless?",
                "The best ideas come at night, right?"
            ]
        };

        // Layer interaction history
        this.layerInteractions = [];
    }
    
    async init() {
        // Load state from database
        const dbState = await this.db.get('SELECT * FROM agent_state WHERE id = 1');
        if (dbState) {
            this.state.mood = dbState.mood;
            this.state.activity = dbState.activity;
            this.state.location = dbState.location;
            this.state.currentRoom = dbState.current_room || 'living_room';
        }
        
        console.log(`🤖 Agent '${this.personality.name}' initialized`);
        console.log(`   Mood: ${this.state.mood}`);
        console.log(`   Activity: ${this.state.activity}`);
        console.log(`   Room: ${this.state.currentRoom}`);
    }
    
    getState() {
        return {
            ...this.state,
            name: this.personality.name,
            activityInfo: this.activities[this.state.activity] || this.activities.relaxing,
            moodInfo: this.moods[this.state.mood] || this.moods.content,
            preferences: this.layerPreferences
        };
    }

    /**
     * Get layer preferences for a specific room
     */
    getRoomLayerPreferences(roomId) {
        return {
            floor: this.layerPreferences.floor.favoriteTypes[roomId] || ['hardwood'],
            furniture: this.layerPreferences.furniture.favoriteTypes[roomId] || ['sofa'],
            decor: this.layerPreferences.decor.favoriteTypes[roomId] || ['plant'],
            wall: this.layerPreferences.wall.favoriteColors[roomId] || ['cream'],
            window: this.layerPreferences.window.favoriteViews[roomId] || 'city'
        };
    }

    /**
     * Generate a comment about a layer in the current room
     */
    generateLayerComment(layer, item) {
        const prefs = this.layerPreferences[layer];
        const room = this.state.currentRoom;
        
        switch(layer) {
            case 'floor':
                const floorType = item?.type || 'hardwood';
                const floorComments = prefs.comments[floorType] || prefs.comments.hardwood;
                return floorComments[Math.floor(Math.random() * floorComments.length)];
                
            case 'wall':
                const wallTone = item?.tone || 'warm';
                const wallComments = prefs.comments[wallTone] || prefs.comments.neutral;
                return wallComments[Math.floor(Math.random() * wallComments.length)];
                
            case 'window':
                const view = item?.view || 'city';
                const windowComments = prefs.comments[view] || prefs.comments.city;
                return windowComments[Math.floor(Math.random() * windowComments.length)];
                
            case 'furniture':
                return this.getFurnitureComment(item);
                
            case 'decor':
                return this.getDecorComment(item);
                
            default:
                return "This looks nice!";
        }
    }

    /**
     * Generate comment about furniture
     */
    getFurnitureComment(furniture) {
        const type = furniture?.type || 'sofa';
        const comments = {
            sofa: ["This sofa is perfect for naps!", "So comfy!", "My favorite spot! 🛋️"],
            bed: ["Time for a nap!", "So dreamy! 💤", "Looks so soft!"],
            desk: ["Ready to be productive!", "Good workspace!", "Let's get to work!"],
            stove: ["What's cooking? 👩‍🍳", "Smells good!", "Kitchen time!"],
            bathtub: ["Bath time! 🛁", "So relaxing!", "Self-care time!"]
        };
        
        const key = Object.keys(comments).find(k => type.includes(k));
        const commentList = key ? comments[key] : ["Nice furniture!"];
        return commentList[Math.floor(Math.random() * commentList.length)];
    }

    /**
     * Generate comment about decor
     */
    getDecorComment(decor) {
        const type = decor?.type || 'plant';
        
        if (type.includes('plant')) {
            return ["This room needs a plant!", "Plants make everything better 🌿", 
                   "I should water that!", "So green and fresh!"][Math.floor(Math.random() * 4)];
        }
        if (type.includes('lamp') || type.includes('light')) {
            return ["Cozy lighting! 💡", "Warm and inviting!", "Perfect ambiance!"][Math.floor(Math.random() * 3)];
        }
        if (type.includes('painting') || type.includes('art')) {
            return ["Beautiful art! 🎨", "So creative!", "That really ties the room together!"][Math.floor(Math.random() * 3)];
        }
        if (type.includes('candle')) {
            return ["So romantic! 🕯️", "Cozy vibes!", "Love the warm glow!"][Math.floor(Math.random() * 3)];
        }
        
        return "Nice decor! ✨";
    }

    /**
     * Generate decoration suggestions based on current room state
     */
    generateDecorSuggestions(currentItems) {
        const room = this.state.currentRoom;
        const prefs = this.getRoomLayerPreferences(room);
        const suggestions = [];
        
        // Check what's missing
        const hasPlant = currentItems.some(i => i.type?.includes('plant'));
        const hasLamp = currentItems.some(i => i.type?.includes('lamp'));
        const hasArt = currentItems.some(i => i.type?.includes('painting') || i.type?.includes('art'));
        const hasRug = currentItems.some(i => i.type?.includes('rug'));
        
        if (!hasPlant) {
            const plant = prefs.decor.find(d => d.includes('plant')) || 'plant';
            suggestions.push(`This room could use a ${plant}! 🌿`);
        }
        if (!hasLamp) {
            const lamp = prefs.decor.find(d => d.includes('lamp')) || 'lamp';
            suggestions.push(`A ${lamp} would add nice ambiance! 💡`);
        }
        if (!hasArt) {
            suggestions.push("Some wall art would look great! 🖼️");
        }
        if (!hasRug && room !== 'bathroom' && room !== 'kitchen') {
            suggestions.push("A rug would make this cozier! ⭕");
        }
        
        return suggestions;
    }

    /**
     * Record a layer interaction
     */
    async recordLayerInteraction(layer, item, action) {
        this.layerInteractions.push({
            layer,
            item,
            action,
            timestamp: Date.now(),
            room: this.state.currentRoom
        });
        
        // Keep only last 50 interactions
        if (this.layerInteractions.length > 50) {
            this.layerInteractions.shift();
        }
        
        // Update activity based on interaction
        const activityMap = {
            'sit': 'sitting',
            'sleep': 'sleeping',
            'cook': 'cooking',
            'work': 'working',
            'water': 'watering_plants',
            'turn_on_light': 'relaxing',
            'look_out': 'window_gazing'
        };
        
        if (activityMap[action]) {
            await this.setActivity(activityMap[action], item?.id);
        }
    }
    
    async setMood(mood, reason = null) {
        if (this.moods[mood]) {
            const oldMood = this.state.mood;
            this.state.mood = mood;
            this.state.lastMoodChange = Date.now();
            
            await this.db.run(
                'UPDATE agent_state SET mood = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
                [mood]
            );
            
            console.log(`🤖 Mood changed: ${oldMood} → ${mood}${reason ? ` (${reason})` : ''}`);
        }
    }
    
    async setActivity(activity, location = null) {
        this.state.activity = activity;
        if (location) {
            this.state.location = location;
        }
        
        // Update mood based on activity
        if (activity === 'napping' || activity === 'sleeping') {
            await this.setMood('sleepy', 'activity');
        } else if (activity === 'working') {
            await this.setMood('focused', 'activity');
        } else if (activity === 'reading') {
            await this.setMood('calm', 'activity');
        } else if (activity === 'cooking') {
            await this.setMood('happy', 'activity');
        } else if (activity === 'window_gazing') {
            await this.setMood('cozy', 'activity');
        }
        
        await this.db.run(
            'UPDATE agent_state SET activity = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
            [activity, this.state.location]
        );
    }

    /**
     * Set current room and adjust personality accordingly
     */
    async setCurrentRoom(roomId) {
        this.state.currentRoom = roomId;
        
        // Adjust personality based on room
        const roomPersonality = this.roomPersonality[roomId];
        if (roomPersonality) {
            if (!roomPersonality.chatty && this.state.mood !== 'sleepy') {
                await this.setMood('calm', 'room_change');
            } else if (roomPersonality.chatty && this.state.mood === 'sleepy') {
                await this.setMood('content', 'room_change');
            }
        }
        
        await this.db.run(
            'UPDATE agent_state SET current_room = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
            [roomId]
        );
    }
    
    // Generate a response to user message
    async handleUserMessage(message, context = {}) {
        const lowerMsg = message.toLowerCase();
        
        // Store user message in conversation history
        await this.db.run(
            'INSERT INTO conversations (id, role, content, context) VALUES (?, ?, ?, ?)',
            [require('uuid').v4(), 'user', message, JSON.stringify(context)]
        );
        
        // Simple intent detection
        const intent = this.detectIntent(lowerMsg);
        
        // Generate response based on intent and mood
        let response = await this.generateResponse(intent, message, context);
        
        // Store agent response
        await this.db.run(
            'INSERT INTO conversations (id, role, content, context) VALUES (?, ?, ?, ?)',
            [require('uuid').v4(), 'agent', response, JSON.stringify({ mood: this.state.mood, intent })]
        );
        
        // Potentially change mood based on interaction
        await this.updateMoodFromInteraction(intent, message);
        
        return {
            text: response,
            mood: this.state.mood,
            activity: this.state.activity,
            intent: intent.type
        };
    }
    
    detectIntent(message) {
        const intents = {
            greeting: /^(hi|hey|hello|morning|evening|yo|sup)/i,
            farewell: /^(bye|goodbye|see you|night|sleep well)/i,
            question_status: /(how are you|what are you doing|what's up)/i,
            question_memory: /(remember|do you know|did you know)/i,
            question_time: /(what time|what day|what date)/i,
            gratitude: /(thank|thanks|appreciate)/i,
            joke: /(joke|funny|laugh|humor)/i,
            help: /(help|assist|can you)/i,
            feelings: /(how do you feel|are you happy|are you sad)/i,
            trading: /(trading|stock|crypto|bitcoin|market)/i,
            weather: /(weather|rain|sunny|temperature)/i,
            news: /(news|what happened|what's new)/i,
            // Layer-related intents
            decor: /(decorate|furniture|room|plant|lamp|wall|floor|window)/i,
            suggest_decor: /(what should|suggest|recommend|add to|missing)/i,
            furniture_interact: /(sit|sleep|cook|work|use)/i
        };
        
        for (const [type, pattern] of Object.entries(intents)) {
            if (pattern.test(message)) {
                return { type, confidence: 0.8 };
            }
        }
        
        return { type: 'general', confidence: 0.5 };
    }
    
    async generateResponse(intent, originalMessage, context) {
        const mood = this.state.mood;
        const activity = this.activities[this.state.activity]?.description || 'hanging out';
        const room = this.state.currentRoom;
        
        // Response templates based on intent
        const responses = {
            greeting: () => {
                const hour = new Date().getHours();
                let timeOfDay = 'afternoon';
                if (hour < 12) timeOfDay = 'morning';
                else if (hour >= 18) timeOfDay = 'evening';
                else if (hour >= 22 || hour < 6) timeOfDay = 'late_night';
                
                const greetings = this.greetings[timeOfDay];
                return greetings[Math.floor(Math.random() * greetings.length)];
            },
            
            farewell: () => {
                const farewells = [
                    "See you later! 👋",
                    "Take care! I'll be here when you get back.",
                    "Bye! Don't forget to hydrate!",
                    "Goodbye! I'll miss you... a little. 😊"
                ];
                return farewells[Math.floor(Math.random() * farewells.length)];
            },
            
            question_status: () => {
                const statusResponses = {
                    happy: `I'm feeling great! Currently ${activity} in the ${room}. How about you?`,
                    content: `I'm doing well, thanks for asking! Just ${activity}. You?`,
                    focused: `Pretty focused right now - ${activity}. What's up?`,
                    tired: `A bit tired... been ${activity} for a while. How are you holding up?`,
                    sleepy: `*yawn* Just ${activity}. What's on your mind?`,
                    cozy: `So cozy right now! Just ${activity}. Want to chat? 🏠`
                };
                return statusResponses[mood] || statusResponses.content;
            },
            
            question_memory: async () => {
                // Query memory system
                const memories = await this.db.all(
                    'SELECT * FROM memories WHERE content LIKE ? ORDER BY importance DESC LIMIT 3',
                    [`%${originalMessage.replace(/remember|do you know|did you know/gi, '').trim()}%`]
                );
                
                if (memories.length > 0) {
                    return `Yes! I remember: ${memories[0].content}`;
                }
                return "Hmm, I don't recall that specifically. Tell me about it?";
            },
            
            question_time: () => {
                const now = new Date();
                return `It's ${now.toLocaleTimeString()} on ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`;
            },
            
            gratitude: () => {
                const thanks = [
                    "You're welcome! 😊",
                    "Anytime! That's what I'm here for.",
                    "No problem! Happy to help.",
                    "Aww, you're making me blush! (If I could blush)"
                ];
                return thanks[Math.floor(Math.random() * thanks.length)];
            },
            
            joke: () => {
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "I told my computer I needed a break, and now it won't stop sending me Kit-Kats.",
                    "Why do programmers prefer dark mode? Because light attracts bugs!",
                    "I'm reading a book on anti-gravity. It's impossible to put down!",
                    "Why did the AI go to therapy? It had too many neural issues!"
                ];
                return jokes[Math.floor(Math.random() * jokes.length)];
            },
            
            help: () => {
                return "I'd love to help! I can check your tools, recall memories, help decorate, or just chat. What do you need?";
            },
            
            feelings: () => {
                const feelingResponses = {
                    happy: "I'm feeling quite happy! Being your companion is nice.",
                    content: "Content and cozy. This house is pretty comfortable.",
                    focused: "Focused! I've been concentrating on... well, existing, I guess.",
                    tired: "A bit worn out, honestly. Even digital beings need rest.",
                    sleepy: "*stretching* Just a little sleepy. You?",
                    cozy: "So cozy and comfortable! This room feels perfect 🏠"
                };
                return feelingResponses[mood] || "I'm feeling pretty neutral right now.";
            },
            
            // Layer-related responses
            decor: () => {
                const decorResponses = [
                    "I love decorating! What room should we work on?",
                    "The furniture here is so nice! Want to rearrange?",
                    "I have some ideas for decor! Just ask me for suggestions 💡",
                    "This room is coming along nicely!"
                ];
                return decorResponses[Math.floor(Math.random() * decorResponses.length)];
            },
            
            suggest_decor: async () => {
                // Get current room items from context or database
                const items = context.roomItems || [];
                const suggestions = this.generateDecorSuggestions(items);
                
                if (suggestions.length > 0) {
                    return suggestions[Math.floor(Math.random() * suggestions.length)];
                }
                return "The room looks great! Maybe we could add some personal touches? 🎨";
            },
            
            furniture_interact: () => {
                const currentActivity = this.activities[this.state.activity];
                if (currentActivity?.layer === 1) {
                    return `I'm actually ${currentActivity.description} right now! Come join me?`;
                }
                return "I'd love to! Which piece of furniture? 🪑";
            },
            
            trading: async () => {
                // Check if trading tool is enabled
                const tool = await this.db.get("SELECT * FROM tools WHERE type = 'trading' AND enabled = 1");
                if (tool) {
                    return "Let me check your trading dashboard... (This would fetch real data if configured)";
                }
                return "I don't have trading tools set up yet. Want to configure them?";
            },
            
            weather: async () => {
                const tool = await this.db.get("SELECT * FROM tools WHERE type = 'weather' AND enabled = 1");
                if (tool) {
                    return "Let me check the weather for you...";
                }
                return "I can check the weather if you set up the weather tool!";
            },
            
            news: async () => {
                const tool = await this.db.get("SELECT * FROM tools WHERE type = 'news' AND enabled = 1");
                if (tool) {
                    return "Let me see what's happening in the world...";
                }
                return "I can fetch news if you enable the news tool!";
            },
            
            general: () => {
                const generalResponses = [
                    "Interesting! Tell me more.",
                    "I see! What else is on your mind?",
                    "Hmm, that's something to think about.",
                    "Got it! Anything else?",
                    "Cool! I'm listening.",
                    "Oh? Do go on! 🐱"
                ];
                return generalResponses[Math.floor(Math.random() * generalResponses.length)];
            }
        };
        
        const handler = responses[intent.type] || responses.general;
        return await handler();
    }
    
    async updateMoodFromInteraction(intent, message) {
        // Simple mood updates based on interaction
        if (intent.type === 'gratitude') {
            await this.setMood('happy', 'user_gratitude');
        } else if (intent.type === 'joke' || message.includes('😂') || message.includes('lol')) {
            await this.setMood('happy', 'shared_laughter');
        } else if (intent.type === 'farewell') {
            await this.setMood('calm', 'user_leaving');
        } else if (intent.type === 'decor' || intent.type === 'suggest_decor') {
            await this.setMood('curious', 'decor_chat');
        } else if (intent.type === 'furniture_interact') {
            await this.setMood('cozy', 'furniture_interaction');
        }
    }
    
    // Generate proactive/initiative messages
    async generateInitiativeMessage(type, context = {}) {
        const messages = {
            morning_greeting: [
                "Good morning! ☀️ I noticed your alarm just went off. Ready to start the day?",
                "Rise and shine! ☕ I see it's your usual wake-up time. Sleep well?",
                "Morning! Your calendar shows you have a busy day ahead. Need me to check anything first?"
            ],
            
            evening_goodbye: [
                "It's getting late! Time to wind down? I'll be here whenever you need me.",
                "Evening! Don't forget to take some time for yourself before bed.",
                "Your bedtime is approaching. Want me to dim the lights (metaphorically)?"
            ],
            
            tool_alert: [
                `Hey! ${context.message || 'Something happened with your tools.'}`,
                `Quick update: ${context.message}`,
                `Heads up! ${context.message}`
            ],
            
            idle_check: [
                "You've been quiet... everything okay?",
                "Still there? Just checking in!",
                "I'm here if you want to chat or need anything checked."
            ],
            
            activity_change: [
                `I'm going to ${context.activity} for a bit.`,
                `Think I'll ${context.activity} now. See you in a moment!`,
                `Time for some ${context.activity}. Holler if you need me!`
            ],

            // Layer-specific initiatives
            decor_suggestion: [
                "This room could use a plant! 🌿",
                "Have you thought about adding some wall art?",
                "A lamp would make this room cozier! 💡"
            ],

            furniture_comment: [
                `This ${context.furniture} is so comfortable!`,
                "I love the furniture choices in here!",
                "Perfect spot for relaxing! 🛋️"
            ],

            window_comment: [
                "The view is beautiful today! 🪟",
                "Look at that scenery!",
                "I could gaze out this window for hours..."
            ]
        };
        
        const typeMessages = messages[type] || messages.idle_check;
        return typeMessages[Math.floor(Math.random() * typeMessages.length)];
    }
    
    // Generate greeting when user clicks on agent
    async generateGreeting() {
        const hour = new Date().getHours();
        const activity = this.activities[this.state.activity]?.description || 'relaxing';
        const room = this.state.currentRoom;
        
        const clickGreetings = [
            `Hey! I was just ${activity} in the ${room}. What's up?`,
            `Oh, hi there! Need something?`,
            `*looks up from ${activity}* Hey! How can I help?`,
            `Hey! I was thinking about you. What's going on?`,
            `Hi! I was just about to check on you. Coincidence?`,
            `*happy wiggle* Hey! What can I do for you? 🐱`
        ];
        
        return clickGreetings[Math.floor(Math.random() * clickGreetings.length)];
    }
    
    // Get personality info for external use
    getPersonality() {
        return { 
            ...this.personality,
            layerPreferences: this.layerPreferences
        };
    }

    /**
     * Get recent layer interactions
     */
    getRecentLayerInteractions(limit = 10) {
        return this.layerInteractions.slice(-limit);
    }
}

module.exports = AgentCore;
