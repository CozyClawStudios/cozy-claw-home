/**
 * Voice System - ElevenLabs TTS Integration
 * Provides voice presence for Celest in the Companion House
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class VoiceSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
        this.enabled = !!this.apiKey;
        this.voiceId = options.voiceId || 'XB0fDUnXU5powFXDhCwa'; // Nova
        this.volume = options.volume || 0.8;
        this.muted = options.muted || false;
        
        this.queue = [];
        this.isSpeaking = false;
        this.speechCount = 0;
        
        this.triggers = this.loadTriggers();
        
        console.log(this.enabled ? 
            '🔊 Voice System initialized' : 
            '🔊 Voice System initialized (MOCK MODE - no API key)'
        );
    }
    
    loadTriggers() {
        const triggersPath = path.join(__dirname, 'voice-triggers.json');
        if (fs.existsSync(triggersPath)) {
            return JSON.parse(fs.readFileSync(triggersPath, 'utf8'));
        }
        return this.getDefaultTriggers();
    }
    
    getDefaultTriggers() {
        return {
            voice: {
                id: 'XB0fDUnXU5powFXDhCwa',
                name: 'Nova',
                description: 'Warm, slightly British',
                settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            },
            triggers: {
                morning_greeting: {
                    cooldown: 3600000,
                    phrases: [
                        "Good morning, sir. Ready to seize the day?",
                        "Morning! Your trading bots are already awake.",
                        "Rise and shine. Let's see what opportunities await."
                    ]
                },
                afternoon_checkin: {
                    cooldown: 3600000,
                    phrases: [
                        "Afternoon, sir. How's the day treating you?",
                        "Hope your day's going well. Anything I can help with?"
                    ]
                },
                evening_winddown: {
                    cooldown: 3600000,
                    phrases: [
                        "Evening, sir. Time to review today's wins?",
                        "Winding down? Let me know if you need anything."
                    ]
                },
                activity_narration: {
                    cooldown: 300000,
                    phrases: [
                        "Let me check on the trading bots...",
                        "Just reviewing our progress...",
                        "Taking a look at the markets..."
                    ]
                },
                trading_alerts: {
                    cooldown: 0,
                    phrases: [
                        "Trading alert!",
                        "Update from the markets!",
                        "Sir, important trading update!"
                    ]
                },
                idle_banter: {
                    cooldown: 600000,
                    phrases: [
                        "Still here, sir.",
                        "Just thinking about our next move.",
                        "Quiet day, but that's okay."
                    ]
                },
                celebration: {
                    cooldown: 0,
                    phrases: [
                        "Fantastic! We're making progress!",
                        "Excellent work, sir!",
                        "Now that's what I like to see!"
                    ]
                },
                encouragement: {
                    cooldown: 1800000,
                    phrases: [
                        "We've got this, sir.",
                        "Keep pushing forward.",
                        "Every step counts."
                    ]
                },
                goodbye: {
                    cooldown: 0,
                    phrases: [
                        "Take care, sir!",
                        "See you soon!",
                        "I'll be here when you get back."
                    ]
                }
            }
        };
    }
    
    async queueText(text, options = {}) {
        // Same as speak but always queues
        await this.speak(text, { ...options, priority: 'normal' });
    }
    
    async speak(text, options = {}) {
        if (this.muted) {
            console.log('[VOICE MUTED]:', text);
            return;
        }
        
        const item = {
            text,
            priority: options.priority || 'normal',
            timestamp: Date.now(),
            metadata: options.metadata || {}
        };
        
        this.queue.push(item);
        this.emit('queued', item);
        
        if (!this.isSpeaking) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        if (this.queue.length === 0) {
            this.isSpeaking = false;
            this.emit('idle');
            return;
        }
        
        this.isSpeaking = true;
        const item = this.queue.shift();
        
        this.emit('speaking', item);
        
        if (this.enabled && this.apiKey) {
            // Real ElevenLabs TTS
            try {
                await this.callElevenLabs(item.text);
            } catch (err) {
                console.error('ElevenLabs error:', err.message);
                this.fallbackSpeak(item.text);
            }
        } else {
            // Mock mode - just log
            this.fallbackSpeak(item.text);
        }
        
        this.speechCount++;
        
        // Small pause between speeches
        await this.sleep(500);
        this.processQueue();
    }
    
    fallbackSpeak(text) {
        console.log(`[VOICE]: ${text}`);
        // Emit for browser TTS fallback
        this.emit('fallback_speak', { text, volume: this.volume });
    }
    
    async callElevenLabs(text) {
        // In real implementation, call ElevenLabs API
        // For now, just simulate delay
        const estimatedDuration = text.length * 50; // ~50ms per char
        await this.sleep(estimatedDuration);
    }
    
    getRandomPhrase(triggerType) {
        const trigger = this.triggers.triggers[triggerType];
        if (!trigger || !trigger.phrases) return null;
        
        const phrases = trigger.phrases;
        return phrases[Math.floor(Math.random() * phrases.length)];
    }
    
    async trigger(triggerType, customText = null) {
        const trigger = this.triggers.triggers[triggerType];
        if (!trigger) return;
        
        // Check cooldown
        const now = Date.now();
        if (trigger.lastTriggered && (now - trigger.lastTriggered) < trigger.cooldown) {
            return;
        }
        
        trigger.lastTriggered = now;
        
        const text = customText || this.getRandomPhrase(triggerType);
        if (text) {
            await this.speak(text, { priority: triggerType === 'trading_alerts' ? 'high' : 'normal' });
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.emit('volume_changed', this.volume);
    }
    
    toggleMute() {
        this.muted = !this.muted;
        this.emit('mute_changed', this.muted);
        return this.muted;
    }
    
    stop() {
        this.queue = [];
        this.isSpeaking = false;
        this.emit('stopped');
    }
    
    getStatus() {
        return {
            initialized: this.enabled,
            isSpeaking: this.isSpeaking,
            queueLength: this.queue.length,
            volume: this.volume,
            muted: this.muted,
            speechCount: this.speechCount,
            hasApiKey: !!this.apiKey,
            voiceId: this.voiceId,
            triggers: Object.keys(this.triggers.triggers || {})
        };
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = VoiceSystem;
