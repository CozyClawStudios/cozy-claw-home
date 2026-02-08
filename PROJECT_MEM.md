# PROJECT_MEM.md - Cozy Claw Studio

**Project:** Cozy Claw Studio - AI Companion Platform  
**Created:** 2026-02-08  
**Last Updated:** 2026-02-08  

---

## 🎯 Current Goal
Launch as a functional companion platform (not a game) where users have a persistent AI roommate.

---

## ✅ Completed
- [x] Migrated to separate repository (was in stream-commander)
- [x] Complete platform rebuild (v3.0)
  - [x] 24/7 agent presence loop
  - [x] Persistent memory system (SQLite)
  - [x] Tool integration framework
  - [x] Cozy visual UI
- [x] Removed game mechanics (coins, shops, multiplayer)
- [x] Git repository initialized with clean history

---

## 🔄 In Progress
- [ ] Test local deployment (`npm start`)
- [ ] Connect real LLM (OpenAI/Claude integration)
- [ ] Implement actual tool APIs (currently mocked)
- [ ] Add voice output

---

## 📝 Key Decisions
- **Separate repo:** Moved out of stream-commander for clean separation
- **Local-first:** SQLite default, hosted option later
- **Not a game:** Focus on companion utility, not gamification
- **Agent-initiated:** Proactive conversations based on context

---

## 🔧 Technical Notes
- **Stack:** Node.js, Express, Socket.io, SQLite3
- **Agent loop:** 5s tick, 30s activity changes
- **Memory:** Importance scoring, decay system, query by relevance
- **Tools:** Trading, Calendar, Weather, News, Webhooks

---

## 🐛 Known Issues
- Tool APIs currently mocked (need real implementations)
- Voice output not yet connected
- Hosted mode not implemented

---

## 💡 Ideas / Backlog
- [ ] Memory export/import for backups
- [ ] Room decoration system
- [ ] Mobile app wrapper
- [ ] Discord/Slack integration
- [ ] Subscription model for hosted version

---

## 📂 Repo Structure
```
cozy-claw-studio/
├── shared-house/
│   ├── server.js          # Main server + agent loop
│   ├── agent/
│   │   ├── core.js        # Personality + responses
│   │   ├── memory.js      # Memory storage + query
│   │   └── tools.js       # External integrations
│   ├── public/
│   │   └── index.html     # Cozy UI
│   └── memory/            # SQLite database
└── README.md
```

---

*Part of the OpenClaw ecosystem*
