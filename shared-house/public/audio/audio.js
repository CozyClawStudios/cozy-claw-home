/**
 * Audio Manager for Cozy Claw Studio - Shared House
 * Handles background music, sound effects, and volume controls
 * Lo-fi, cozy, chill vibes ✨
 */

class AudioManager {
    constructor() {
        this.initialized = false;
        this.muted = false;
        this.masterVolume = 0.7;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.8;
        
        // Audio contexts
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        // Sound pools for performance
        this.soundPools = new Map();
        this.maxPoolSize = 5;
        
        // Currently playing music
        this.currentMusic = null;
        this.currentMusicName = null;
        this.musicFadeInterval = null;
        
        // Preloaded sounds
        this.preloadedSounds = new Map();
        
        // Track playing sounds for cleanup
        this.activeSounds = new Set();
        
        // Bind methods
        this.init = this.init.bind(this);
        this.playMusic = this.playMusic.bind(this);
        this.playSFX = this.playSFX.bind(this);
        this.setMasterVolume = this.setMasterVolume.bind(this);
        this.setMusicVolume = this.setMusicVolume.bind(this);
        this.setSFXVolume = this.setSFXVolume.bind(this);
        this.mute = this.mute.bind(this);
        this.unmute = this.unmute.bind(this);
        this.toggleMute = this.toggleMute.bind(this);
    }

    /**
     * Initialize the audio system
     * Must be called after user interaction (browser requirement)
     */
    init() {
        if (this.initialized) return true;
        
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create music gain node
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            // Create SFX gain node
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.initialized = true;
            console.log('🎵 Audio Manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return false;
        }
    }

    /**
     * Resume audio context (needed after browser suspension)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Preload a sound for instant playback
     */
    async preloadSound(name, url) {
        if (this.preloadedSounds.has(name)) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.preloadedSounds.set(name, audioBuffer);
        } catch (error) {
            console.warn(`Failed to preload sound: ${name}`, error);
        }
    }

    /**
     * Preload all game sounds
     */
    async preloadAllSounds() {
        const sounds = [
            ['step_wood', '/audio/step_wood.wav'],
            ['step_carpet', '/audio/step_carpet.wav'],
            ['furniture_place', '/audio/furniture_place.wav'],
            ['coin_get', '/audio/coin_get.wav'],
            ['chat_receive', '/audio/chat_receive.wav'],
            ['door_open', '/audio/door_open.wav'],
            ['door_close', '/audio/door_close.wav'],
            ['cooking_sizzle', '/audio/cooking_sizzle.wav'],
            ['success', '/audio/success.wav'],
            ['error', '/audio/error.wav'],
        ];

        await Promise.all(sounds.map(([name, url]) => this.preloadSound(name, url)));
        console.log('🎵 All sounds preloaded');
    }

    /**
     * Play background music with crossfade
     */
    async playMusic(musicName, fadeDuration = 2000) {
        if (!this.initialized) {
            console.warn('Audio not initialized. Call init() first.');
            return;
        }

        if (this.currentMusicName === musicName) return;

        const musicUrls = {
            'main': '/audio/bgm_main.wav',
            'cooking': '/audio/bgm_cooking.wav',
            'shop': '/audio/bgm_shop.wav',
        };

        const url = musicUrls[musicName];
        if (!url) {
            console.warn(`Unknown music: ${musicName}`);
            return;
        }

        try {
            // Fetch and decode
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Create new music source
            const newSource = this.audioContext.createBufferSource();
            newSource.buffer = audioBuffer;
            newSource.loop = true;

            const newGain = this.audioContext.createGain();
            newGain.gain.value = 0;
            newSource.connect(newGain);
            newGain.connect(this.musicGain);

            // Fade out current music
            if (this.currentMusic) {
                const oldGain = this.currentMusic.gainNode;
                const oldSource = this.currentMusic.source;
                
                // Smooth fade out
                oldGain.gain.setTargetAtTime(0, this.audioContext.currentTime, fadeDuration / 3000);
                
                setTimeout(() => {
                    try {
                        oldSource.stop();
                        oldSource.disconnect();
                        oldGain.disconnect();
                    } catch (e) {}
                }, fadeDuration);
            }

            // Start new music and fade in
            newSource.start(0);
            newGain.gain.setTargetAtTime(1, this.audioContext.currentTime, fadeDuration / 3000);

            this.currentMusic = { source: newSource, gainNode: newGain };
            this.currentMusicName = musicName;

            console.log(`🎶 Playing: ${musicName}`);
        } catch (error) {
            console.error('Failed to play music:', error);
        }
    }

    /**
     * Stop background music
     */
    stopMusic(fadeDuration = 1000) {
        if (!this.currentMusic) return;

        const oldGain = this.currentMusic.gainNode;
        const oldSource = this.currentMusic.source;

        oldGain.gain.setTargetAtTime(0, this.audioContext.currentTime, fadeDuration / 3000);

        setTimeout(() => {
            try {
                oldSource.stop();
                oldSource.disconnect();
                oldGain.disconnect();
            } catch (e) {}
        }, fadeDuration);

        this.currentMusic = null;
        this.currentMusicName = null;
    }

    /**
     * Play a sound effect with pooling
     */
    playSFX(soundName, options = {}) {
        if (!this.initialized) return;
        if (this.muted && !options.force) return;

        const { volume = 1.0, pitch = 1.0, pan = 0 } = options;

        // Get or create pool for this sound
        if (!this.soundPools.has(soundName)) {
            this.soundPools.set(soundName, []);
        }
        const pool = this.soundPools.get(soundName);

        // Try to get preloaded buffer
        const buffer = this.preloadedSounds.get(soundName);
        if (!buffer) {
            console.warn(`Sound not preloaded: ${soundName}`);
            return;
        }

        try {
            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = pitch;

            // Create gain for this instance
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;

            // Create panner if needed
            let panner = null;
            if (pan !== 0) {
                panner = this.audioContext.createStereoPanner();
                panner.pan.value = pan;
                source.connect(panner);
                panner.connect(gainNode);
            } else {
                source.connect(gainNode);
            }

            gainNode.connect(this.sfxGain);

            // Track active sound
            this.activeSounds.add(source);
            source.onended = () => {
                this.activeSounds.delete(source);
                try {
                    source.disconnect();
                    gainNode.disconnect();
                    if (panner) panner.disconnect();
                } catch (e) {}
            };

            // Play
            source.start(0);

        } catch (error) {
            console.error('Failed to play SFX:', error);
        }
    }

    /**
     * Play sound with variations (useful for footsteps)
     */
    playSFXRandom(soundName, variations = {}) {
        const { volumeVar = 0.1, pitchVar = 0.1 } = variations;
        
        const volume = 1.0 + (Math.random() - 0.5) * volumeVar;
        const pitch = 1.0 + (Math.random() - 0.5) * pitchVar;
        
        this.playSFX(soundName, { volume, pitch });
    }

    /**
     * Play step sound based on floor type
     */
    playStep(floorType = 'wood') {
        const soundName = floorType === 'carpet' ? 'step_carpet' : 'step_wood';
        this.playSFXRandom(soundName, { volumeVar: 0.2, pitchVar: 0.15 });
    }

    /**
     * Play UI sounds
     */
    playCoin() { this.playSFX('coin_get'); }
    playChat() { this.playSFX('chat_receive', { volume: 0.7 }); }
    playDoorOpen() { this.playSFX('door_open'); }
    playDoorClose() { this.playSFX('door_close'); }
    playSuccess() { this.playSFX('success'); }
    playError() { this.playSFX('error'); }
    playPlace() { this.playSFX('furniture_place'); }
    playCooking() { this.playSFX('cooking_sizzle'); }

    /**
     * Volume Controls
     */
    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.muted ? 0 : this.masterVolume,
                this.audioContext.currentTime,
                0.1
            );
        }
    }

    setMusicVolume(value) {
        this.musicVolume = Math.max(0, Math.min(1, value));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    setSFXVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }

    /**
     * Mute Controls
     */
    mute() {
        this.muted = true;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
        }
    }

    unmute() {
        this.muted = false;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioContext.currentTime, 0.1);
        }
        // Resume context if suspended
        this.resume();
    }

    toggleMute() {
        if (this.muted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.muted;
    }

    /**
     * Create volume control UI
     */
    createVolumeUI(container) {
        const ui = document.createElement('div');
        ui.className = 'audio-controls';
        ui.innerHTML = `
            <style>
                .audio-controls {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.8);
                    border-radius: 12px;
                    padding: 15px;
                    color: white;
                    font-family: sans-serif;
                    z-index: 1000;
                    min-width: 200px;
                }
                .audio-controls h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #4ecdc4;
                }
                .audio-control {
                    margin: 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .audio-control label {
                    font-size: 12px;
                    width: 60px;
                }
                .audio-control input[type="range"] {
                    flex: 1;
                    accent-color: #4ecdc4;
                }
                .audio-control button {
                    background: #4ecdc4;
                    border: none;
                    border-radius: 4px;
                    padding: 5px 12px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .audio-control button:hover {
                    background: #3dbfb3;
                }
                .audio-control button.muted {
                    background: #ff6b6b;
                }
            </style>
            <h3>🔊 Audio Settings</h3>
            <div class="audio-control">
                <label>Master</label>
                <input type="range" id="master-vol" min="0" max="100" value="${this.masterVolume * 100}">
            </div>
            <div class="audio-control">
                <label>Music</label>
                <input type="range" id="music-vol" min="0" max="100" value="${this.musicVolume * 100}">
            </div>
            <div class="audio-control">
                <label>SFX</label>
                <input type="range" id="sfx-vol" min="0" max="100" value="${this.sfxVolume * 100}">
            </div>
            <div class="audio-control">
                <button id="mute-btn" class="${this.muted ? 'muted' : ''}">${this.muted ? '🔇 Unmute' : '🔊 Mute'}</button>
            </div>
        `;

        container.appendChild(ui);

        // Bind events
        ui.querySelector('#master-vol').addEventListener('input', (e) => {
            this.setMasterVolume(e.target.value / 100);
        });
        ui.querySelector('#music-vol').addEventListener('input', (e) => {
            this.setMusicVolume(e.target.value / 100);
        });
        ui.querySelector('#sfx-vol').addEventListener('input', (e) => {
            this.setSFXVolume(e.target.value / 100);
        });
        ui.querySelector('#mute-btn').addEventListener('click', (e) => {
            const muted = this.toggleMute();
            e.target.textContent = muted ? '🔇 Unmute' : '🔊 Mute';
            e.target.classList.toggle('muted', muted);
        });
    }

    /**
     * Cleanup
     */
    dispose() {
        this.stopMusic(0);
        
        // Stop all active sounds
        this.activeSounds.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {}
        });
        this.activeSounds.clear();

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }

        this.initialized = false;
        console.log('🎵 Audio Manager disposed');
    }
}

// Create global instance
const audioManager = new AudioManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioManager, audioManager };
}

// Auto-initialize on first user interaction
document.addEventListener('click', () => {
    if (!audioManager.initialized) {
        audioManager.init();
    } else {
        audioManager.resume();
    }
}, { once: true });

document.addEventListener('keydown', () => {
    if (!audioManager.initialized) {
        audioManager.init();
    }
}, { once: true });

console.log('🎵 Audio Manager loaded. Click or press any key to initialize audio.');
