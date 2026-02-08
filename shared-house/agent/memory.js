/**
 * Agent Memory - Persistent Memory System
 * 
 * This module manages:
 * - Long-term memory storage and retrieval
 * - Memory importance scoring
 * - Semantic search (simple keyword-based)
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
        console.log('🧠 Memory system initialized');
    }
    
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
            score += Math.max(0, 5 - daysOld * 0.5); // Recent memories get a boost
            
            // Boost by access count (frequently accessed memories are important)
            score += Math.min(5, memory.access_count * 0.5);
            
            return { ...memory, relevanceScore: score };
        });
        
        // Sort by relevance and return top results
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
        
        return {
            totalMemories: total.count,
            recentMemories: recent.count,
            byType: byType.reduce((acc, row) => ({ ...acc, [row.type]: row.count }), {}),
            bySource: bySource.reduce((acc, row) => ({ ...acc, [row.source]: row.count }), {}),
            averageImportance: parseFloat(avgImportance.avg || 0).toFixed(2),
            totalConversations: conversations.count
        };
    }
    
    // Memory consolidation - remove old, unimportant memories
    async consolidate() {
        // Delete memories that are:
        // - Older than 90 days
        // - Importance < 3
        // - Access count < 2
        const result = await this.db.run(
            `DELETE FROM memories 
             WHERE created_at < datetime("now", "-90 days") 
             AND importance < 3 
             AND access_count < 2`
        );
        
        console.log(`🧠 Memory consolidation complete. Removed ${result.changes} old memories.`);
        return result.changes;
    }
    
    // Extract potential memories from conversation
    async extractFromConversation(userMessage, agentResponse) {
        const extracted = [];
        
        // Simple extraction patterns
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
        
        // Add extracted memories
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
            }))
        };
    }
}

module.exports = AgentMemory;
