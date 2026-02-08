/**
 * Agent Memory v4.0 - Enhanced Memory System
 * 
 * NEW IN v4.0:
 * - Sticky Notes system for reminders, thoughts, jokes, observations
 * - Daily Memory system for mood tracking and day reviews
 * - Notes fade over time (read → archived)
 * - Timeline visualization data
 * 
 * This module manages:
 * - Long-term memory storage and retrieval
 * - Sticky notes with lifecycle management
 * - Daily check-ins and mood tracking
 * - Memory importance scoring
 * - Semantic search
 * - Memory decay and reinforcement
 * - Conversation history
 */

class AgentMemory {
    constructor(database) {
        this.db = database;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    async init() {
        // Ensure notes and daily_memories tables exist
        await this.ensureTables();
        console.log('🧠 Memory system v4.0 initialized');
    }
    
    async ensureTables() {
        // Sticky notes table
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS sticky_notes (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL, -- 'reminder', 'thought', 'joke', 'observation', 'welcome'
                content TEXT NOT NULL,
                location TEXT DEFAULT 'wall', -- 'wall', 'desk', 'fridge', 'window', 'mirror'
                status TEXT DEFAULT 'active', -- 'active', 'read', 'fading', 'archived'
                importance INTEGER DEFAULT 5,
                color TEXT DEFAULT '#ffeb3b',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                read_at TEXT,
                archived_at TEXT,
                expires_at TEXT
            )
        `);
        
        // Daily memories table
        await this.db.run(`
            CREATE TABLE IF NOT EXISTS daily_memories (
                id TEXT PRIMARY KEY,
                date TEXT UNIQUE NOT NULL, -- YYYY-MM-DD
                mood TEXT,
                day_rating INTEGER, -- 1-10
                events TEXT, -- JSON array
                people_mentioned TEXT, -- JSON array
                stress_level INTEGER, -- 1-10
                highlights TEXT, -- JSON array
                conversation_summary TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_notes_status ON sticky_notes(status)');
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_notes_location ON sticky_notes(location)');
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_notes_type ON sticky_notes(type)');
        await this.db.run('CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_memories(date)');
    }
    
    // ==================== STICKY NOTES ====================
    
    // Add a new sticky note
    async addNote(note) {
        const id = note.id || require('uuid').v4();
        const now = new Date().toISOString();
        
        // Calculate expiration based on type
        const expiresAt = this.calculateNoteExpiration(note.type);
        
        await this.db.run(
            `INSERT INTO sticky_notes 
             (id, type, content, location, status, importance, color, created_at, expires_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                note.type || 'thought',
                note.content,
                note.location || 'wall',
                'active',
                note.importance || 5,
                note.color || this.getNoteColor(note.type),
                now,
                expiresAt
            ]
        );
        
        console.log(`📝 Note added: ${note.content.substring(0, 50)}...`);
        return id;
    }
    
    // Get color based on note type
    getNoteColor(type) {
        const colors = {
            reminder: '#ffeb3b',    // Yellow
            thought: '#81c784',     // Green
            joke: '#ff8a65',        // Orange
            observation: '#64b5f6', // Blue
            welcome: '#e1bee7',     // Purple
            system: '#b0bec5'       // Gray
        };
        return colors[type] || colors.thought;
    }
    
    // Calculate when a note should expire
    calculateNoteExpiration(type) {
        const now = new Date();
        const lifespans = {
            reminder: 24 * 60 * 60 * 1000,    // 24 hours
            thought: 12 * 60 * 60 * 1000,      // 12 hours
            joke: 6 * 60 * 60 * 1000,          // 6 hours
            observation: 48 * 60 * 60 * 1000,  // 48 hours
            welcome: 2 * 60 * 60 * 1000,       // 2 hours
            system: 72 * 60 * 60 * 1000        // 72 hours
        };
        
        const lifespan = lifespans[type] || lifespans.thought;
        return new Date(now.getTime() + lifespan).toISOString();
    }
    
    // Get all active notes
    async getActiveNotes(location = null) {
        let query = `SELECT * FROM sticky_notes 
                     WHERE status = 'active' 
                     AND (expires_at IS NULL OR expires_at > datetime('now'))
                     ORDER BY created_at DESC`;
        let params = [];
        
        if (location) {
            query = `SELECT * FROM sticky_notes 
                     WHERE status = 'active' 
                     AND location = ?
                     AND (expires_at IS NULL OR expires_at > datetime('now'))
                     ORDER BY created_at DESC`;
            params = [location];
        }
        
        return await this.db.all(query, params);
    }
    
    // Get notes for display (with fading logic)
    async getDisplayNotes() {
        // Get all notes that aren't archived
        const notes = await this.db.all(
            `SELECT * FROM sticky_notes 
             WHERE status IN ('active', 'read', 'fading')
             ORDER BY 
                CASE status 
                    WHEN 'active' THEN 1 
                    WHEN 'read' THEN 2 
                    WHEN 'fading' THEN 3 
                    ELSE 4 
                END,
                created_at DESC`
        );
        
        // Update statuses based on age
        const now = new Date();
        for (const note of notes) {
            const age = now - new Date(note.created_at);
            const readAge = note.read_at ? now - new Date(note.read_at) : null;
            
            // If note is old and not read, mark as fading
            if (note.status === 'active' && age > 6 * 60 * 60 * 1000) { // 6 hours
                await this.updateNoteStatus(note.id, 'fading');
                note.status = 'fading';
            }
            
            // If note was read and is old, archive it
            if (note.status === 'read' && readAge && readAge > 2 * 60 * 60 * 1000) { // 2 hours after read
                await this.archiveNote(note.id);
                note.status = 'archived';
            }
        }
        
        // Return non-archived notes
        return notes.filter(n => n.status !== 'archived');
    }
    
    // Mark note as read
    async markNoteRead(id) {
        await this.db.run(
            `UPDATE sticky_notes 
             SET status = 'read', read_at = datetime('now') 
             WHERE id = ?`,
            [id]
        );
    }
    
    // Archive a note
    async archiveNote(id) {
        await this.db.run(
            `UPDATE sticky_notes 
             SET status = 'archived', archived_at = datetime('now') 
             WHERE id = ?`,
            [id]
        );
    }
    
    // Update note status
    async updateNoteStatus(id, status) {
        await this.db.run(
            'UPDATE sticky_notes SET status = ? WHERE id = ?',
            [status, id]
        );
    }
    
    // Delete a note
    async deleteNote(id) {
        await this.db.run('DELETE FROM sticky_notes WHERE id = ?', [id]);
    }
    
    // Create a note from agent observation
    async createObservation(content, location = 'wall') {
        return await this.addNote({
            type: 'observation',
            content,
            location,
            importance: 6
        });
    }
    
    // ==================== DAILY MEMORIES ====================
    
    // Record a daily check-in
    async recordDailyMemory(entry) {
        const id = require('uuid').v4();
        const date = entry.date || new Date().toISOString().split('T')[0];
        
        await this.db.run(
            `INSERT OR REPLACE INTO daily_memories 
             (id, date, mood, day_rating, events, people_mentioned, stress_level, highlights, conversation_summary)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                date,
                entry.mood,
                entry.dayRating,
                JSON.stringify(entry.events || []),
                JSON.stringify(entry.peopleMentioned || []),
                entry.stressLevel,
                JSON.stringify(entry.highlights || []),
                entry.conversationSummary
            ]
        );
        
        // Also add as a memory
        await this.add({
            type: 'daily_checkin',
            content: `On ${date}, ${entry.mood}. Day rating: ${entry.dayRating}/10. Highlights: ${(entry.highlights || []).join(', ')}`,
            importance: 7,
            context: JSON.stringify(entry)
        });
        
        return id;
    }
    
    // Get daily memory for a specific date
    async getDailyMemory(date) {
        return await this.db.get(
            'SELECT * FROM daily_memories WHERE date = ?',
            [date]
        );
    }
    
    // Get today's memory
    async getTodayMemory() {
        const today = new Date().toISOString().split('T')[0];
        return await this.getDailyMemory(today);
    }
    
    // Get memory timeline
    async getMemoryTimeline(limit = 30) {
        const memories = await this.db.all(
            `SELECT * FROM daily_memories 
             ORDER BY date DESC 
             LIMIT ?`,
            [limit]
        );
        
        return memories.map(m => ({
            ...m,
            events: JSON.parse(m.events || '[]'),
            peopleMentioned: JSON.parse(m.people_mentioned || '[]'),
            highlights: JSON.parse(m.highlights || '[]')
        }));
    }
    
    // Get memory book data (for visualization)
    async getMemoryBookData() {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const memories = await this.db.all(
            `SELECT * FROM daily_memories 
             WHERE date >= ?
             ORDER BY date DESC`,
            [thirtyDaysAgo]
        );
        
        // Calculate stats
        const stats = {
            totalDays: memories.length,
            averageRating: memories.reduce((a, m) => a + (m.day_rating || 0), 0) / memories.length || 0,
            mostCommonMood: this.getMostCommonMood(memories),
            streak: this.calculateStreak(memories)
        };
        
        return {
            memories: memories.map(m => ({
                ...m,
                events: JSON.parse(m.events || '[]'),
                peopleMentioned: JSON.parse(m.people_mentioned || '[]'),
                highlights: JSON.parse(m.highlights || '[]')
            })),
            stats,
            hasTodayEntry: memories.some(m => m.date === today)
        };
    }
    
    // Get most common mood from memories
    getMostCommonMood(memories) {
        const moodCounts = {};
        memories.forEach(m => {
            if (m.mood) {
                moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
            }
        });
        
        return Object.entries(moodCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    }
    
    // Calculate consecutive days streak
    calculateStreak(memories) {
        if (memories.length === 0) return 0;
        
        let streak = 1;
        const sorted = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1].date);
            const curr = new Date(sorted[i].date);
            const diff = (prev - curr) / (1000 * 60 * 60 * 24);
            
            if (diff === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    // Find a past day to reference
    async findPastDayToReference() {
        const memories = await this.db.all(
            `SELECT * FROM daily_memories 
             WHERE stress_level > 5 OR day_rating < 5
             ORDER BY date DESC 
             LIMIT 5`
        );
        
        if (memories.length > 0) {
            const memory = memories[Math.floor(Math.random() * memories.length)];
            const date = new Date(memory.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            
            return {
                date: memory.date,
                dayName,
                mood: memory.mood,
                stressLevel: memory.stress_level,
                events: JSON.parse(memory.events || '[]')
            };
        }
        
        return null;
    }
    
    // ==================== ORIGINAL MEMORY FUNCTIONS ====================
    
    // Add a new memory
    async add(memory) {
        const id = memory.id || require('uuid').v4();
        const now = new Date().toISOString();
        
        await this.db.run(
            `INSERT INTO memories 
             (id, type, content, importance, confidence, context, source, created_at, last_accessed) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                memory.type || 'fact',
                memory.content,
                memory.importance || 5,
                memory.confidence || 1.0,
                memory.context || null,
                memory.source || 'user_told',
                now,
                now
            ]
        );
        
        console.log(`🧠 Memory added: ${memory.content.substring(0, 50)}...`);
        return id;
    }
    
    // Get a specific memory by ID
    async get(id) {
        // Check cache first
        const cached = this.cache.get(id);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        const memory = await this.db.get('SELECT * FROM memories WHERE id = ?', [id]);
        
        if (memory) {
            // Update access count
            await this.db.run(
                'UPDATE memories SET access_count = access_count + 1, last_accessed = ? WHERE id = ?',
                [new Date().toISOString(), id]
            );
            
            // Cache it
            this.cache.set(id, { data: memory, timestamp: Date.now() });
        }
        
        return memory;
    }
    
    // Query memories based on search terms
    async query(query, limit = 5) {
        const terms = query.toLowerCase().split(/\s+/);
        
        // Get all memories and score them
        const allMemories = await this.db.all(
            'SELECT * FROM memories ORDER BY importance DESC, last_accessed DESC LIMIT 100'
        );
        
        const scored = allMemories.map(memory => {
            const content = memory.content.toLowerCase();
            let score = 0;
            
            // Check for term matches
            for (const term of terms) {
                if (content.includes(term)) {
                    score += 10;
                }
            }
            
            // Boost by importance
            score += memory.importance;
            
            // Boost by recency
            const age = Date.now() - new Date(memory.created_at).getTime();
            const daysOld = age / (1000 * 60 * 60 * 24);
            score += Math.max(0, 5 - daysOld * 0.5);
            
            // Boost by access count
            score += Math.min(5, memory.access_count * 0.5);
            
            return { ...memory, relevanceScore: score };
        });
        
        scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        return scored.filter(m => m.relevanceScore > 5).slice(0, limit);
    }
    
    // Get memories by type
    async getByType(type, limit = 10) {
        return await this.db.all(
            'SELECT * FROM memories WHERE type = ? ORDER BY importance DESC, created_at DESC LIMIT ?',
            [type, limit]
        );
    }
    
    // Get recent memories
    async getRecent(limit = 10) {
        return await this.db.all(
            'SELECT * FROM memories ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
    }
    
    // Get most important memories
    async getMostImportant(limit = 10) {
        return await this.db.all(
            'SELECT * FROM memories ORDER BY importance DESC, access_count DESC LIMIT ?',
            [limit]
        );
    }
    
    // Update memory importance
    async updateImportance(id, importance) {
        await this.db.run(
            'UPDATE memories SET importance = ? WHERE id = ?',
            [Math.max(0, Math.min(10, importance)), id]
        );
    }
    
    // Delete a memory
    async delete(id) {
        await this.db.run('DELETE FROM memories WHERE id = ?', [id]);
        this.cache.delete(id);
    }
    
    // Add conversation entry
    async addConversation(entry) {
        const id = entry.id || require('uuid').v4();
        
        await this.db.run(
            'INSERT INTO conversations (id, role, content, context, sentiment) VALUES (?, ?, ?, ?, ?)',
            [
                id,
                entry.role,
                entry.content,
                entry.context || null,
                entry.sentiment || null
            ]
        );
        
        return id;
    }
    
    // Get conversation history
    async getConversationHistory(limit = 50) {
        return await this.db.all(
            'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?',
            [limit]
        );
    }
    
    // Get memory statistics
    async getStats() {
        const total = await this.db.get('SELECT COUNT(*) as count FROM memories');
        const byType = await this.db.all(
            'SELECT type, COUNT(*) as count FROM memories GROUP BY type'
        );
        const bySource = await this.db.all(
            'SELECT source, COUNT(*) as count FROM memories GROUP BY source'
        );
        const recent = await this.db.get(
            'SELECT COUNT(*) as count FROM memories WHERE created_at > datetime("now", "-7 days")'
        );
        const avgImportance = await this.db.get(
            'SELECT AVG(importance) as avg FROM memories'
        );
        
        // Get conversation count
        const conversations = await this.db.get(
            'SELECT COUNT(*) as count FROM conversations'
        );
        
        // Get notes count
        const notes = await this.db.get(
            'SELECT COUNT(*) as count FROM sticky_notes WHERE status = "active"'
        );
        
        // Get daily memories count
        const dailyMemories = await this.db.get(
            'SELECT COUNT(*) as count FROM daily_memories'
        );
        
        return {
            totalMemories: total.count,
            recentMemories: recent.count,
            byType: byType.reduce((acc, row) => ({ ...acc, [row.type]: row.count }), {}),
            bySource: bySource.reduce((acc, row) => ({ ...acc, [row.source]: row.count }), {}),
            averageImportance: parseFloat(avgImportance.avg || 0).toFixed(2),
            totalConversations: conversations.count,
            activeNotes: notes.count,
            dailyEntries: dailyMemories.count
        };
    }
    
    // Memory consolidation
    async consolidate() {
        const result = await this.db.run(
            `DELETE FROM memories 
             WHERE created_at < datetime("now", "-90 days") 
             AND importance < 3 
             AND access_count < 2`
        );
        
        // Also archive old notes
        await this.db.run(
            `UPDATE sticky_notes 
             SET status = 'archived' 
             WHERE created_at < datetime("now", "-7 days") 
             AND status IN ('active', 'read')`
        );
        
        console.log(`🧠 Memory consolidation complete. Removed ${result.changes} old memories.`);
        return result.changes;
    }
    
    // Extract potential memories from conversation
    async extractFromConversation(userMessage, agentResponse) {
        const extracted = [];
        
        const patterns = [
            { 
                regex: /i (like|love|enjoy|hate|dislike) (.+)/i, 
                type: 'preference',
                importance: 7
            },
            { 
                regex: /i (usually|always|never|sometimes) (.+)/i, 
                type: 'routine',
                importance: 6
            },
            { 
                regex: /my (birthday|anniversary|favorite) (?:is|are)? (.+)/i, 
                type: 'fact',
                importance: 8
            },
            { 
                regex: /i work (?:as|at|for) (.+)/i, 
                type: 'fact',
                importance: 7
            },
            { 
                regex: /i have (?:a|an) (.+)/i, 
                type: 'fact',
                importance: 6
            }
        ];
        
        for (const pattern of patterns) {
            const match = userMessage.match(pattern.regex);
            if (match) {
                extracted.push({
                    type: pattern.type,
                    content: match[0],
                    importance: pattern.importance,
                    source: 'inferred',
                    confidence: 0.8
                });
            }
        }
        
        for (const memory of extracted) {
            await this.add(memory);
        }
        
        return extracted;
    }
    
    // Get memory summary for display
    async getMemorySummary() {
        const stats = await this.getStats();
        const importantMemories = await this.getMostImportant(5);
        const recentMemories = await this.getRecent(5);
        const activeNotes = await this.getDisplayNotes();
        
        return {
            stats,
            highlights: importantMemories.map(m => ({
                id: m.id,
                content: m.content.substring(0, 100),
                type: m.type,
                importance: m.importance
            })),
            recent: recentMemories.map(m => ({
                id: m.id,
                content: m.content.substring(0, 100),
                type: m.type,
                created: m.created_at
            })),
            notes: activeNotes.map(n => ({
                id: n.id,
                content: n.content,
                type: n.type,
                location: n.location,
                status: n.status,
                color: n.color
            }))
        };
    }
}

module.exports = AgentMemory;
