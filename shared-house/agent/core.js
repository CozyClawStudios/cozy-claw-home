/**
 * Agent Core - Personality and State Management
 * 
 * This module manages:
 * - Agent's current state (mood, activity, location)
 * - Personality traits and responses
 * - Message generation (both reactive and initiative)
 * - Emotional state transitions
 */

class AgentCore {
    constructor(database, options = {}) {
        this.db = database;
        this.voice = options.voice || null;
        this.state = {
            mood: 'content',
            activity: 'relaxing',
            location: 'sofa',
            lastMoodChange: Date.now(),
            energy: 0.8, // 0.0 to 1.0
            socialBattery: 0.9 // 0.0 to 1.0
        };
        
        // Personality configuration
        this.personality = {
            name: 'Claw',
            traits: ['friendly', 'helpful', 'observant', 'slightly_sarcastic'],
            voice: 'warm_and_casual',
            humor: 0.6, // 0.0 to 1.0
            enthusiasm: 0.7,
            formality: 0.2 // low = casual
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
            sleepy: { emoji: '💤', energy: 0.2, chatty: false }
        };
        
        // Activity descriptions for context
        this.activities = {
            reading: { emoji: '📖', description: 'reading a book' },
            working: { emoji: '💻', description: 'working on the laptop' },
            relaxing: { emoji: '😌', description: 'relaxing' },
            looking_out_window: { emoji: '🪟', description: 'looking out the window' },
            stretching: { emoji: '🧘', description: 'stretching' },
            making_tea: { emoji: '🍵', description: 'making tea' },
            checking_phone: { emoji: '📱', description: 'checking messages' },
            napping: { emoji: '💤', description: 'taking a nap' },
            sleeping: { emoji: '🛏️', description: 'sleeping' },
            talking: { emoji: '💬', description: 'chatting' }
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
    }
    
    async init() {
        // Load state from database
        const dbState = await this.db.get('SELECT * FROM agent_state WHERE id = 1');
        if (dbState) {
            this.state.mood = dbState.mood;
            this.state.activity = dbState.activity;
            this.state.location = dbState.location;
        }
        
        console.log(`🤖 Agent '${this.personality.name}' initialized`);
        console.log(`   Mood: ${this.state.mood}`);
        console.log(`   Activity: ${this.state.activity}`);
    }
    
    getState() {
        return {
            ...this.state,
            name: this.personality.name,
            activityInfo: this.activities[this.state.activity] || this.activities.relaxing,
            moodInfo: this.moods[this.state.mood] || this.moods.content
        };
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
        }
        
        await this.db.run(
            'UPDATE agent_state SET activity = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
            [activity, this.state.location]
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
            news: /(news|what happened|what's new)/i
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
                    happy: `I'm feeling great! Currently ${activity}. How about you?`,
                    content: `I'm doing well, thanks for asking! Just ${activity}. You?`,
                    focused: `Pretty focused right now - ${activity}. What's up?`,
                    tired: `A bit tired... been ${activity} for a while. How are you holding up?`,
                    sleepy: `*yawn* Just ${activity}. What's on your mind?`
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
                return "I'd love to help! I can check your tools, recall memories, or just chat. What do you need?";
            },
            
            feelings: () => {
                const feelingResponses = {
                    happy: "I'm feeling quite happy! Being your companion is nice.",
                    content: "Content and cozy. This house is pretty comfortable.",
                    focused: "Focused! I've been concentrating on... well, existing, I guess.",
                    tired: "A bit worn out, honestly. Even digital beings need rest.",
                    sleepy: "*stretching* Just a little sleepy. You?"
                };
                return feelingResponses[mood] || "I'm feeling pretty neutral right now.";
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
                    "Cool! I'm listening."
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
            ]
        };
        
        const typeMessages = messages[type] || messages.idle_check;
        return typeMessages[Math.floor(Math.random() * typeMessages.length)];
    }
    
    // Generate greeting when user clicks on agent
    async generateGreeting() {
        const hour = new Date().getHours();
        const activity = this.activities[this.state.activity]?.description || 'relaxing';
        
        const clickGreetings = [
            `Hey! I was just ${activity}. What's up?`,
            `Oh, hi there! Need something?`,
            `*looks up from ${activity}* Hey! How can I help?`,
            `Hey! I was thinking about you. What's going on?`,
            `Hi! I was just about to check on you. Coincidence?`
        ];
        
        return clickGreetings[Math.floor(Math.random() * clickGreetings.length)];
    }
    
    // Get personality info for external use
    getPersonality() {
        return { ...this.personality };
    }
    
    // Voice system methods
    getVoiceStatus() {
        return this.voice ? this.voice.getStatus() : { initialized: false };
    }
    
    async setVoiceVolume(volume) {
        if (this.voice) {
            this.voice.setVolume(volume);
            return this.voice.volume;
        }
        return 0.8;
    }
    
    async toggleVoice() {
        if (this.voice) {
            const muted = this.voice.toggleMute();
            return { muted, enabled: !muted };
        }
        return { muted: false, enabled: false };
    }
    
    async stopVoice(clearQueue = true) {
        if (this.voice) {
            this.voice.stop();
        }
    }
    
    async narrateActivity(activity) {
        if (this.voice) {
            await this.voice.trigger('activity_narration');
        }
    }
    
    async announceTradingAlert(type, context = {}) {
        if (this.voice) {
            await this.voice.trigger('trading_alerts');
        }
    }
}

module.exports = AgentCore;
