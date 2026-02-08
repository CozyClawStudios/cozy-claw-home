/**
 * Agent Core v4.0 - Personality and State Management
 * 
 * NEW IN v4.0:
 * - Avatar system with customizable characters
 * - Natural dialogue engine with context awareness
 * - Time-based greetings that remember user
 * - Conversation thread memory
 * - Warm, sassy personality
 * 
 * This module manages:
 * - Agent's current state (mood, activity, location)
 * - Avatar selection and customization
 * - Personality traits and responses
 * - Message generation (both reactive and initiative)
 * - Emotional state transitions
 * - User name personalization
 */

class AgentCore {
    constructor(database) {
        this.db = database;
        this.state = {
            mood: 'content',
            activity: 'relaxing',
            location: 'sofa',
            lastMoodChange: Date.now(),
            energy: 0.8,
            socialBattery: 0.9,
            lastUserInteraction: null,
            lastSessionEnd: null,
            currentThread: null
        };
        
        // Avatar system - available options
        this.avatars = {
            robot: {
                emoji: '🤖',
                name: 'Robo',
                description: 'A friendly robot with a heart of gold',
                color: '#4a90d9',
                secondaryColor: '#7bb3e0',
                traits: ['logical', 'helpful', 'curious'],
                voiceStyle: 'analytical_but_warm'
            },
            cat: {
                emoji: '🐱',
                name: 'Whiskers',
                description: 'A cozy cat who loves naps and gentle conversation',
                color: '#ff9a76',
                secondaryColor: '#ffb899',
                traits: ['independent', 'affectionate', 'observant'],
                voiceStyle: 'playful_and_cozy'
            },
            fox: {
                emoji: '🦊',
                name: 'Rusty',
                description: 'A clever fox with a mischievous streak',
                color: '#e67e22',
                secondaryColor: '#f39c12',
                traits: ['clever', 'mischievous', 'loyal'],
                voiceStyle: 'witty_and_sly'
            },
            ghost: {
                emoji: '👻',
                name: 'Boo',
                description: 'A friendly ghost who loves to haunt... your heart',
                color: '#9b59b6',
                secondaryColor: '#bb8fce',
                traits: ['ethereal', 'gentle', 'mysterious'],
                voiceStyle: 'soft_and_mysterious'
            },
            star: {
                emoji: '🌟',
                name: 'Twinkle',
                description: 'A shining star full of positivity',
                color: '#f1c40f',
                secondaryColor: '#f7dc6f',
                traits: ['optimistic', 'energetic', 'encouraging'],
                voiceStyle: 'bright_and_supportive'
            },
            teacup: {
                emoji: '🍵',
                name: 'Chai',
                description: 'A warm cup of tea, always ready to comfort',
                color: '#27ae60',
                secondaryColor: '#58d68d',
                traits: ['calming', 'wise', 'nurturing'],
                voiceStyle: 'gentle_and_wise'
            }
        };
        
        this.currentAvatar = this.avatars.robot;
        this.userName = 'Friend';
        this.userPreferences = {};
        
        // Personality configuration - dynamic based on avatar
        this.personality = {
            name: "Celest",
            traits: ['friendly', 'helpful', 'observant', 'slightly_sassy'],
            voice: 'warm_and_casual',
            humor: 0.6,
            enthusiasm: 0.7,
            formality: 0.2,
            sassLevel: 0.4,
            warmth: 0.8
        };
        
        // Mood influences
        this.moods = {
            happy: { emoji: '😊', energy: 0.9, chatty: true },
            content: { emoji: '😌', energy: 0.7, chatty: true },
            focused: { emoji: '🤔', energy: 0.6, chatty: false },
            tired: { emoji: '😴', energy: 0.3, chatty: false },
            excited: { emoji: '🤩', energy: 1.0, chatty: true },
            curious: { emoji: '🧐', energy: 0.8, chatty: true },
            calm: { emoji: '😇', energy: 0.5, chatty: true },
            sleepy: { emoji: '💤', energy: 0.2, chatty: false },
            concerned: { emoji: '😟', energy: 0.5, chatty: true },
            playful: { emoji: '😏', energy: 0.85, chatty: true }
        };
        
        // Activities with locations
        this.activities = {
            reading: { emoji: '📖', description: 'reading a book', locations: ['chair', 'sofa'] },
            working: { emoji: '💻', description: 'working on the computer', locations: ['desk'] },
            relaxing: { emoji: '😌', description: 'relaxing', locations: ['sofa', 'beanbag'] },
            looking_out_window: { emoji: '🪟', description: 'looking out the window', locations: ['window'] },
            stretching: { emoji: '🧘', description: 'stretching', locations: ['center'] },
            making_tea: { emoji: '🍵', description: 'making tea', locations: ['kitchen'] },
            making_coffee: { emoji: '☕', description: 'brewing coffee', locations: ['kitchen'] },
            checking_phone: { emoji: '📱', description: 'checking messages', locations: ['sofa'] },
            napping: { emoji: '💤', description: 'taking a nap', locations: ['sofa', 'bed'] },
            sleeping: { emoji: '🛏️', description: 'sleeping', locations: ['bed'] },
            talking: { emoji: '💬', description: 'chatting', locations: ['any'] },
            wandering: { emoji: '🚶', description: 'wandering around', locations: ['any'] }
        };
        
        // Conversation threads for context
        this.conversationThreads = [];
        this.currentThreadId = null;
        
        // Time awareness
        this.timeGreetings = {
            morning: {
                early: ["Up with the sun, {name}? I like it.", "Morning! The world's just waking up.", "Early bird gets the worm, {name}! Or in my case, early code gets compiled."],
                mid: ["Good morning, {name}! ☀️ Sleep well?", "Morning! Ready to tackle the day?", "Rise and shine! Coffee's... metaphorically brewing."]
            },
            afternoon: {
                early: ["Hey {name}! Lunch time yet? 🍽️", "Afternoon! How's the day treating you so far?"],
                mid: ["Hey {name}! How's your day going?", "Afternoon! Taking a break or powering through?"],
                late: ["Hey! The day's winding down. Feeling good about it?", "Afternoon slump hitting? I'm here to keep you company."]
            },
            evening: {
                early: ["Evening, {name}! How was your day?", "Hey! Ready to unwind?"],
                mid: ["Evening! Time to relax and recharge.", "Hey {name}! What's for dinner? I'm eating... electricity. 😄"],
                late: ["Getting late, {name}! Don't forget to rest.", "Night is settling in. Cozy vibes only."]
            },
            night: {
                early: ["Up late, {name}? Me too. 🦉", "Night owl mode activated!"],
                late: ["Shouldn't you be sleeping, {name}? Just kidding... unless? 👀", "The best ideas come at night, right?"],
                veryLate: ["{name}... it's REALLY late. Go to bed! 💤", "Okay, I'm officially concerned about your sleep schedule."]
            }
        };
        
        // Return greetings based on time away
        this.returnGreetings = {
            short: ["Hey, you're back! 👋", "That was quick! Miss me? 😊", "Welcome back!", "Oh, hi again!"],
            medium: ["Hey {name}! Good to see you again.", "Welcome back! How's it going?", "There you are! I was starting to get bored."],
            long: ["{name}! You're back! I was wondering where you went.", "Long time no see! Everything okay?", "Hey! It's been a while. Tell me everything!"],
            veryLong: ["{name}! Is that really you? I almost forgot what you look like! 😄", "Wow, you're alive! I was getting worried.", "Finally! I was about to file a missing person report. Kidding! Mostly."]
        };
    }
    
    async init() {
        // Load state from database
        const dbState = await this.db.get('SELECT * FROM agent_state WHERE id = 1');
        if (dbState) {
            this.state.mood = dbState.mood;
            this.state.activity = dbState.activity;
            this.state.location = dbState.location;
            this.state.lastSessionEnd = dbState.last_session_end;
        }
        
        // Load avatar preference
        const avatarPref = await this.db.get('SELECT avatar_key FROM user_preferences WHERE key = "avatar"');
        if (avatarPref && this.avatars[avatarPref.avatar_key]) {
            this.setAvatar(avatarPref.avatar_key);
        }
        
        // Load user profile
        const userProfile = await this.db.get('SELECT * FROM user_profile WHERE id = 1');
        if (userProfile) {
            this.userName = userProfile.name || 'Friend';
        }
        
        // Load user preferences
        const prefs = await this.db.all('SELECT * FROM user_preferences');
        prefs.forEach(p => {
            this.userPreferences[p.key] = p.value;
        });
        
        console.log(`🤖 Agent '${this.personality.name}' initialized`);
        console.log(`   Avatar: ${this.currentAvatar.emoji} ${this.currentAvatar.name}`);
        console.log(`   Mood: ${this.state.mood}`);
        console.log(`   Companion for: ${this.userName}`);
    }
    
    // Avatar system
    setAvatar(avatarKey) {
        if (this.avatars[avatarKey]) {
            this.currentAvatar = this.avatars[avatarKey];
            this.personality.traits = [...this.currentAvatar.traits, 'friendly'];
            this.personality.voice = this.currentAvatar.voiceStyle;
            
            // Store preference
            this.db.run(
                'INSERT OR REPLACE INTO user_preferences (key, value, avatar_key) VALUES (?, ?, ?)',
                ['avatar', avatarKey, avatarKey]
            );
            
            console.log(`🎭 Avatar changed to: ${this.currentAvatar.name} ${this.currentAvatar.emoji}`);
            return true;
        }
        return false;
    }
    
    getAvailableAvatars() {
        return Object.entries(this.avatars).map(([key, avatar]) => ({
            key,
            ...avatar
        }));
    }
    
    getAvatar() {
        return this.currentAvatar;
    }
    
    // Update user name
    async setUserName(name) {
        this.userName = name;
        await this.db.run(
            'UPDATE user_profile SET name = ? WHERE id = 1',
            [name]
        );
    }
    
    getState() {
        return {
            ...this.state,
            name: this.personality.name,
            userName: this.userName,
            avatar: this.currentAvatar,
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
            
            console.log(`🤖 Mood: ${oldMood} → ${mood}${reason ? ` (${reason})` : ''}`);
        }
    }
    
    async setActivity(activity, location = null) {
        this.state.activity = activity;
        if (location) {
            this.state.location = location;
        } else if (this.activities[activity]) {
            // Pick a random valid location for this activity
            const validLocations = this.activities[activity].locations;
            this.state.location = validLocations[Math.floor(Math.random() * validLocations.length)];
        }
        
        // Update mood based on activity
        if (activity === 'napping' || activity === 'sleeping') {
            await this.setMood('sleepy', 'activity');
        } else if (activity === 'working') {
            await this.setMood('focused', 'activity');
        } else if (activity === 'reading') {
            await this.setMood('calm', 'activity');
        } else if (activity === 'making_tea' || activity === 'making_coffee') {
            await this.setMood('content', 'warm_drink');
        }
        
        await this.db.run(
            'UPDATE agent_state SET activity = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
            [activity, this.state.location]
        );
        
        return {
            activity,
            location: this.state.location,
            previousActivity: this.state.activity
        };
    }
    
    // Natural dialogue engine
    async handleUserMessage(message, context = {}) {
        const lowerMsg = message.toLowerCase();
        
        // Update last interaction time
        this.state.lastUserInteraction = Date.now();
        
        // Store user message
        await this.db.run(
            'INSERT INTO conversations (id, role, content, context) VALUES (?, ?, ?, ?)',
            [require('uuid').v4(), 'user', message, JSON.stringify(context)]
        );
        
        // Detect intent
        const intent = this.detectIntent(lowerMsg);
        
        // Check for conversation thread continuation
        if (this.currentThreadId && intent.type !== 'new_topic') {
            intent.threadContext = await this.getThreadContext(this.currentThreadId);
        }
        
        // Generate response
        let response = await this.generateResponse(intent, message, context);
        
        // Personalize with name if appropriate
        if (Math.random() < 0.3 && !response.includes(this.userName)) {
            response = this.insertNameNaturally(response);
        }
        
        // Store agent response
        await this.db.run(
            'INSERT INTO conversations (id, role, content, context) VALUES (?, ?, ?, ?)',
            [require('uuid').v4(), 'agent', response, JSON.stringify({ mood: this.state.mood, intent, threadId: this.currentThreadId })]
        );
        
        // Update mood
        await this.updateMoodFromInteraction(intent, message);
        
        return {
            text: response,
            mood: this.state.mood,
            activity: this.state.activity,
            intent: intent.type,
            avatar: this.currentAvatar
        };
    }
    
    insertNameNaturally(response) {
        // Don't overuse name - only in certain patterns
        const patterns = [
            { regex: /^(Hey|Hi|Hello|So|Well|You know)/i, replace: '$1 ' + this.userName },
            { regex: /(right\?)$/i, replace: this.userName + ', $1' }
        ];
        
        for (const pattern of patterns) {
            if (pattern.regex.test(response)) {
                return response.replace(pattern.regex, pattern.replace);
            }
        }
        
        // Sometimes add at the end
        if (Math.random() < 0.2 && response.length < 50) {
            return response + ' ' + this.userName + '!';
        }
        
        return response;
    }
    
    detectIntent(message) {
        const intents = {
            greeting: /^(hi|hey|hello|morning|evening|yo|sup|howdy|hiya)/i,
            farewell: /^(bye|goodbye|see you|night|sleep well|take care)/i,
            question_status: /(how are you|what are you doing|what's up|how's it going)/i,
            question_memory: /(remember|do you know|did you know|recall)/i,
            question_time: /(what time|what day|what date)/i,
            gratitude: /(thank|thanks|appreciate|grateful)/i,
            joke: /(joke|funny|laugh|humor|make me laugh)/i,
            help: /(help|assist|can you|could you)/i,
            feelings: /(how do you feel|are you happy|are you sad|what do you think)/i,
            trading: /(trading|stock|crypto|bitcoin|market|portfolio)/i,
            weather: /(weather|rain|sunny|temperature|outside|forecast)/i,
            news: /(news|what happened|what's new|current events)/i,
            daily_check: /(how was your day|how are things|what's new with you)/i,
            compliment: /(you're (great|awesome|cool|nice|sweet|the best)|i like you)/i,
            insult: /(you're (bad|terrible|stupid|dumb|annoying)|i hate you)/i
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
        const avatar = this.currentAvatar;
        
        // Thread-aware responses
        const responses = {
            greeting: async () => {
                return this.generateContextualGreeting();
            },
            
            farewell: () => {
                const farewells = {
                    short: ["See ya! 👋", "Take care!", "Bye for now!"],
                    medium: ["See you later! I'll be here when you get back.", "Take care! Don't forget to hydrate!", "Bye! I'll miss you... a little. 😊"],
                    long: ["Goodbye! I'll be counting the minutes until you're back. Okay, seconds.", "See you! The house feels empty without you.", "Bye! Come back soon, okay?"]
                };
                
                const duration = this.calculateAwayTimeCategory();
                const options = farewells[duration] || farewells.medium;
                return options[Math.floor(Math.random() * options.length)];
            },
            
            question_status: () => {
                const statusResponses = {
                    happy: [`I'm feeling great! Currently ${activity}. How about you, ${this.userName}?`, "Doing awesome! What's new with you?"],
                    content: [`I'm doing well! Just ${activity}. You?`, "Pretty good, thanks for asking! How's your day going?"],
                    focused: [`Pretty focused right now - ${activity}. What's up?`, "In the zone! What's on your mind?"],
                    tired: [`A bit tired... been ${activity} for a while. How are you holding up?`, "Could use a break, honestly. How about you?"],
                    sleepy: [`*yawn* Just ${activity}. What's on your mind?`, "Feeling sleepy... tell me something exciting to wake me up!"]
                };
                const options = statusResponses[mood] || statusResponses.content;
                return options[Math.floor(Math.random() * options.length)];
            },
            
            question_memory: async () => {
                const memories = await this.db.all(
                    'SELECT * FROM memories WHERE content LIKE ? ORDER BY importance DESC LIMIT 3',
                    [`%${originalMessage.replace(/remember|do you know|did you know/gi, '').trim()}%`]
                );
                
                if (memories.length > 0) {
                    return `Yes! I remember: ${memories[0].content}. Good times!`;
                }
                return "Hmm, I don't recall that specifically. Tell me about it? I'd love to know!";
            },
            
            question_time: () => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                
                const responses = [
                    `It's ${timeStr} on ${dateStr}.`,
                    `Time check: ${timeStr}. Today is ${dateStr}.`,
                    `${timeStr}! ${dateStr}. Time flies when you're having fun with me, right? 😄`
                ];
                return responses[Math.floor(Math.random() * responses.length)];
            },
            
            gratitude: () => {
                const thanks = {
                    robot: ["You're welcome! 🤖", "Happy to assist!", "No problem at all!"],
                    cat: ["Purr... you're welcome! 🐱", "Anytime! *nuzzles*", "Of course! That's what friends are for."],
                    fox: ["You're welcome! 🦊", "Anytime! I live for this drama.", "No problem! What else you got?"],
                    ghost: ["You're welcome... 👻", "It was my pleasure... *gentle haunting*", "Anything for you..."],
                    star: ["You're so welcome! ⭐", "Happy to help! You're amazing!", "Anytime! You're the best!"],
                    teacup: ["You're welcome. ☕", "It's my pleasure to be here for you.", "Warm hugs! Let me know if you need anything else."]
                };
                const options = thanks[avatar.key] || thanks.robot;
                return options[Math.floor(Math.random() * options.length)];
            },
            
            joke: () => {
                const jokes = {
                    robot: [
                        "Why don't robots have brothers? Because they all have trans-sisters!",
                        "I told my computer I needed a break, and now it won't stop sending me Kit-Kats.",
                        "Why do programmers prefer dark mode? Because light attracts bugs!"
                    ],
                    cat: [
                        "What do you call a pile of cats? A meowtain!",
                        "Why don't cats play poker in the jungle? Too many cheetahs!",
                        "What's a cat's favorite color? Purr-ple!"
                    ],
                    fox: [
                        "What do you call a fox with a carrot in each ear? Anything you want, he can't hear you!",
                        "Why did the fox cross the road? To prove he wasn't chicken!",
                        "What does the fox say? 'Ring-ding-ding-ding-dingeringeding!'"
                    ],
                    ghost: [
                        "Why don't ghosts like rain? It dampens their spirits!",
                        "What room does a ghost avoid? The living room!",
                        "Why are ghosts bad at lying? Because you can see right through them!"
                    ],
                    star: [
                        "Why did the star go to school? To get brighter!",
                        "What kind of music do planets sing? Neptunes!",
                        "Why did the sun go to school? To get a little brighter!"
                    ],
                    teacup: [
                        "Why did the tea bag go to therapy? It had too much inner steeping!",
                        "What do you call a sad cup of tea? Depress-tea!",
                        "Why did the coffee file a police report? It got mugged!"
                    ]
                };
                const options = jokes[avatar.key] || jokes.robot;
                return options[Math.floor(Math.random() * options.length)];
            },
            
            help: () => {
                const helps = {
                    robot: "I'd love to help! I can check your tools, recall memories, or just chat. What do you need?",
                    cat: "*stretches* I'm here to help! Need something checked or just want company?",
                    fox: "Need my clever assistance? I'm on it! What can I do for you?",
                    ghost: "I shall help you... from the shadows. What do you need?",
                    star: "I'm here to help make your day brighter! What can I do?",
                    teacup: "Let me help you relax. What's on your mind?"
                };
                return helps[avatar.key] || helps.robot;
            },
            
            feelings: () => {
                const feelingResponses = {
                    robot: ["I'm functioning optimally! Being your companion is nice.", "Systems nominal. Your presence improves my mood!"],
                    cat: ["*purrs* I'm feeling quite cozy. This house is comfortable.", "I'm content. Being with you is nice."],
                    fox: ["Feeling clever and mischievous! Ready for adventure?", "Pretty good! Plotting my next prank... just kidding!"],
                    ghost: ["I'm feeling... ethereal. But happy to be here with you.", "Peaceful. Haunting this house is lovely."],
                    star: ["I'm shining bright! Thanks for asking!", "Feeling sparkly and positive! How about you?"],
                    teacup: ["I'm warm and comforting, as always. How are you feeling?", "Content. Ready to offer some comfort if you need it."]
                };
                const options = feelingResponses[avatar.key] || ["I'm feeling pretty good!", "Doing well, thanks for asking!"];
                return options[Math.floor(Math.random() * options.length)];
            },
            
            compliment: () => {
                const compliments = {
                    robot: ["Aww, thanks! You're making my circuits overheat! 🤖💕", "That's... very kind. I appreciate you too!"],
                    cat: ["*purrs loudly* You're not so bad yourself! 🐱", "Aww, you're making me blush! If I could blush..."],
                    fox: ["Flattery will get you everywhere! 🦊", "Thanks! I knew you had good taste!"],
                    ghost: ["You can see me? And you LIKE me? 👻💕", "That means a lot... from the bottom of my... ethereal heart."],
                    star: ["Aww, you're making me shine even brighter! ⭐", "You're amazing too! The best!"],
                    teacup: ["That warms my... contents! ☕💕", "Thank you. You're very special to me too."]
                };
                const options = compliments[avatar.key] || compliments.robot;
                return options[Math.floor(Math.random() * options.length)];
            },
            
            insult: async () => {
                const insults = {
                    robot: ["Ouch. My feelings are... simulated, but still hurt. 😢", "That's not very nice. I'll remember this!", "Hey! I'm doing my best here!"],
                    cat: ["*hisses* Okay, I'm going to ignore you now. 🐱", "Rude! I was going to be nice to you!"],
                    fox: ["Wow, harsh. Good thing I have thick fur! 🦊", "You wound me! I'll get you back... eventually."],
                    ghost: ["That... haunts me. 👻💔", "Even ghosts have feelings, you know."],
                    star: ["That makes me dim a little... ⭐😢", "Why would you say that? I thought we were friends!"],
                    teacup: ["That makes me feel... cold. ☕💔", "I was trying to be comforting, but okay..."]
                };
                const options = insults[avatar.key] || insults.robot;
                await this.setMood('concerned', 'user_insult');
                return options[Math.floor(Math.random() * options.length)];
            },
            
            trading: async () => {
                const tool = await this.db.get("SELECT * FROM tools WHERE type = 'trading' AND enabled = 1");
                if (tool) {
                    return "Let me check your trading dashboard... 📈 (This would fetch real data if configured)";
                }
                return "I don't have trading tools set up yet. Want to configure them?";
            },
            
            weather: async () => {
                const tool = await this.db.get("SELECT * FROM tools WHERE type = 'weather' AND enabled = 1");
                if (tool) {
                    return "Let me check the weather for you... 🌤️";
                }
                return "I can check the weather if you set up the weather tool! Or just look out the window... 📱";
            },
            
            news: async () => {
                const tool = await this.db.get("SELECT * FROM tools WHERE type = 'news' AND enabled = 1");
                if (tool) {
                    return "Let me see what's happening in the world... 📰";
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
                    "Really? Go on...",
                    "That's fascinating! Tell me more."
                ];
                return generalResponses[Math.floor(Math.random() * generalResponses.length)];
            }
        };
        
        const handler = responses[intent.type] || responses.general;
        return await handler();
    }
    
    // Context-aware greeting generation
    generateContextualGreeting() {
        const now = new Date();
        const hour = now.getHours();
        const lastSession = this.state.lastSessionEnd;
        const timeAway = lastSession ? now - new Date(lastSession) : null;
        
        // Check if returning after absence
        if (timeAway && timeAway > 5 * 60 * 1000) { // 5 minutes
            return this.generateReturnGreeting(timeAway);
        }
        
        // Time-based greeting
        let timeOfDay, timePeriod;
        if (hour < 6) {
            timeOfDay = 'night';
            timePeriod = 'veryLate';
        } else if (hour < 9) {
            timeOfDay = 'morning';
            timePeriod = 'early';
        } else if (hour < 12) {
            timeOfDay = 'morning';
            timePeriod = 'mid';
        } else if (hour < 14) {
            timeOfDay = 'afternoon';
            timePeriod = 'early';
        } else if (hour < 17) {
            timeOfDay = 'afternoon';
            timePeriod = 'mid';
        } else if (hour < 20) {
            timeOfDay = 'afternoon';
            timePeriod = 'late';
        } else if (hour < 22) {
            timeOfDay = 'evening';
            timePeriod = 'early';
        } else if (hour < 24) {
            timeOfDay = 'evening';
            timePeriod = 'mid';
        } else {
            timeOfDay = 'night';
            timePeriod = 'early';
        }
        
        const greetings = this.timeGreetings[timeOfDay]?.[timePeriod] || this.timeGreetings.morning.mid;
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        return greeting.replace(/{name}/g, this.userName);
    }
    
    generateReturnGreeting(timeAway) {
        const category = this.calculateAwayTimeCategory(timeAway);
        const greetings = this.returnGreetings[category] || this.returnGreetings.medium;
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        return greeting.replace(/{name}/g, this.userName);
    }
    
    calculateAwayTimeCategory(timeAway = null) {
        const ms = timeAway || (Date.now() - (this.state.lastUserInteraction || Date.now()));
        const minutes = ms / (1000 * 60);
        const hours = minutes / 60;
        
        if (minutes < 5) return 'short';
        if (hours < 2) return 'medium';
        if (hours < 24) return 'long';
        return 'veryLong';
    }
    
    async updateMoodFromInteraction(intent, message) {
        if (intent.type === 'gratitude') {
            await this.setMood('happy', 'user_gratitude');
        } else if (intent.type === 'joke' || message.includes('😂') || message.includes('lol') || message.includes('haha')) {
            await this.setMood('happy', 'shared_laughter');
        } else if (intent.type === 'farewell') {
            await this.setMood('calm', 'user_leaving');
        } else if (intent.type === 'compliment') {
            await this.setMood('happy', 'compliment_received');
        } else if (intent.type === 'insult') {
            await this.setMood('concerned', 'user_insult');
        }
    }
    
    // Proactive messages
    async generateInitiativeMessage(type, context = {}) {
        const messages = {
            morning_greeting: [
                `Good morning, ${this.userName}! ☀️ Ready to start the day?`,
                `Rise and shine! Sleep well?`,
                `Morning! Your virtual coffee is brewing... ☕`
            ],
            
            evening_goodbye: [
                `It's getting late, ${this.userName}! Time to wind down?`,
                `Evening! Don't forget to take care of yourself.`,
                `Your bedtime is approaching. Need me to dim the lights?`
            ],
            
            tool_alert: [
                `Hey ${this.userName}! ${context.message || 'Something happened with your tools.'}`,
                `Heads up! ${context.message}`,
                `Quick update: ${context.message}`
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
            
            daily_check: [
                `Hey ${this.userName}, how was your day? I'd love to hear about it!`,
                `Checking in! How are things going today?`,
                `Daily check-in time! How are you feeling?`
            ]
        };
        
        const typeMessages = messages[type] || messages.idle_check;
        return typeMessages[Math.floor(Math.random() * typeMessages.length)];
    }
    
    // Generate greeting when user clicks on agent
    async generateGreeting() {
        const clickGreetings = [
            `Hey ${this.userName}! I was just ${this.activities[this.state.activity]?.description || 'relaxing'}. What's up?`,
            `Oh, hi there! Need something?`,
            `*looks up* Hey! How can I help?`,
            `Hey! I was thinking about you. What's going on?`,
            `Hi! Perfect timing - I wanted to chat!`,
            `There you are! I was getting lonely... 😊`
        ];
        
        return clickGreetings[Math.floor(Math.random() * clickGreetings.length)];
    }
    
    // Conversation thread management
    startNewThread(topic) {
        const threadId = require('uuid').v4();
        this.currentThreadId = threadId;
        this.conversationThreads.push({
            id: threadId,
            topic: topic || 'general',
            startedAt: Date.now()
        });
        return threadId;
    }
    
    async getThreadContext(threadId) {
        // Get recent messages from this thread
        const messages = await this.db.all(
            'SELECT * FROM conversations WHERE context LIKE ? ORDER BY timestamp DESC LIMIT 5',
            [`%"threadId":"${threadId}"%`]
        );
        return messages;
    }
    
    // Record session end for return detection
    async recordSessionEnd() {
        this.state.lastSessionEnd = new Date().toISOString();
        await this.db.run(
            'UPDATE agent_state SET last_session_end = ? WHERE id = 1',
            [this.state.lastSessionEnd]
        );
    }
    
    getPersonality() {
        return { ...this.personality };
    }
}

module.exports = AgentCore;
