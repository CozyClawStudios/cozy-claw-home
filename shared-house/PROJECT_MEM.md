# PROJECT_MEM.md - Cozy Claw Home v4.0

**Project:** Cozy Claw Home  
**Version:** 4.0.0  
**Created:** 2026-02-08  
**Last Updated:** 2026-02-08  
**Status:** ✅ Complete

---

## 🎯 Current Goal
Cozy Claw Home v4.0 - A local-first AI companion platform where your AI agent lives in a cozy virtual home.

---

## ✅ Completed Features

### 1. Avatar System
- 6 unique avatars: 🤖 Robot, 🐱 Cat, 🦊 Fox, 👻 Ghost, 🌟 Star, 🍵 Tea Cup
- Each with unique personality traits and voice styles
- Custom colors and themes per avatar
- Avatar selection in setup wizard
- Avatar affects dialogue style and responses

### 2. Sticky Notes System
- Agent can leave notes around the room
- Note types: reminders, thoughts, jokes, observations, welcome
- Locations: wall, desk, fridge, window, mirror
- Notes fade over time (active → read → fading → archived)
- Visual sticky notes with colors per type
- Click to read/mark as read

### 3. Daily Memory System
- Agent asks "How was your day?" and stores response
- Tracks: mood, day rating (1-10), highlights, stress level
- Memory Book visualization with timeline
- Brings up past days in conversation
- Streak tracking for consecutive entries

### 4. Visual Activities
- Agent walks to different locations (desk, sofa, window, kitchen)
- Smooth CSS transitions between locations
- Activities: reading, working, relaxing, looking out window, making tea/coffee
- Steam animation when making coffee/tea
- Thought bubbles for agent messages

### 5. Natural Dialogue Engine
- Context-aware greetings based on time of day
- Return greetings based on time away (short/medium/long/veryLong)
- Uses user's name naturally in conversation
- Avatar-specific jokes and responses
- Warm, slightly sassy personality
- Remembers conversation threads

### 6. ClawBot Integration (Optional)
- WebSocket connection to external ClawBot
- Config setting: `USE_CLAWBOT_PERSONALITY`
- Falls back to local personality if ClawBot unavailable
- Real-time message forwarding
- Connection status monitoring

### 7. Local-First Architecture
- SQLite database (no cloud required)
- Config file for user preferences (`config.json`)
- Optional cloud sync ready
- No external dependencies required

---

## 🛠️ Technical Implementation

### Files Modified/Created
1. `/package.json` - Renamed to cozy-claw-home v4.0.0
2. `/server.js` - Added v4.0 features (daily checkin, notes, ClawBot)
3. `/agent/core.js` - Avatar system, natural dialogue engine
4. `/agent/memory.js` - Sticky notes, daily memories
5. `/agent/tools.js` - ClawBot WebSocket connector
6. `/public/index.html` - Visual activities, memory book, setup wizard

### Database Schema Additions
- `sticky_notes` table - For agent notes
- `daily_memories` table - For day tracking
- `user_preferences` table - For settings

### API Endpoints
- `GET /api/notes` - Get sticky notes
- `POST /api/notes` - Create note
- `GET /api/daily/book` - Get memory book data
- `POST /api/daily` - Record daily memory
- `GET /api/avatars` - Get available avatars
- `POST /api/avatar` - Set avatar
- `GET /api/clawbot/status` - ClawBot connection status

### Socket.IO Events
- `notes:list` - Notes update
- `notes:read` - Mark note as read
- `daily:record` - Record daily checkin
- `memorybook:data` - Memory book data
- `avatar:set` - Change avatar
- `setup:complete` - Finish setup

---

## 📦 Package Information

**Package Name:** `cozy-claw-home`  
**Install:** `npm install cozy-claw-home`  
**Run:** `npm start`  
**Setup:** `npm run setup` (first run)

---

## 🔌 ClawBot Integration

### Configuration
```json
{
  "USE_CLAWBOT_PERSONALITY": true,
  "CLAWBOT_WS_URL": "ws://localhost:8080/clawbot",
  "CLAWBOT_API_KEY": "your-api-key"
}
```

### How It Works
1. User enables ClawBot in setup or settings
2. Server establishes WebSocket connection
3. User messages are forwarded to ClawBot
4. ClawBot responses are rendered in the UI
5. Local personality acts as "host"
6. Automatic fallback if connection lost

---

## 🎨 Visual Features

### Room Locations
- **Window** - Agent looks out, comments on weather/time
- **Desk** - Agent works on computer
- **Sofa** - Agent relaxes, reads, naps
- **Kitchen** - Agent makes tea/coffee with steam animation
- **Bookshelf** - Agent reads

### Notes Locations
- Wall, desk, fridge, window, mirror
- Each with slight rotation for natural look
- Hover to straighten
- Colors based on note type

---

## 🚀 How to Run

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:3000
# Follow setup wizard on first run
```

---

## 📝 Daily Check-in Flow

1. Agent asks "How was your day?" at configured time (default 8pm)
2. User opens memory book or responds in chat
3. User rates day (1-5 stars) and enters mood
4. Data stored in daily_memories table
5. Agent can reference past days in conversation

---

## 🧪 Testing Checklist

- [x] Setup wizard displays on first run
- [x] Avatar selection works
- [x] Agent moves between locations
- [x] Sticky notes appear and fade
- [x] Memory book shows timeline
- [x] Daily check-in saves data
- [x] Natural greetings work
- [x] ClawBot connection (if configured)
- [x] Steam animation on coffee/tea
- [x] Responsive design on mobile

---

## 💡 Future Ideas (v4.1+)

- PWA support with offline mode
- Cloud sync for multiple devices
- More avatar customization
- Mini-games (cooking, etc.)
- Voice input/output
- Mobile app
- Multi-agent support
- Weather API integration
- Calendar integration

---

## 🐛 Known Issues

None currently - fresh release!

---

## 📊 Stats to Track

- Daily active users (self-hosted)
- Memory count growth
- Conversation length
- Most popular avatar
- Average day rating

---

**This is the foundation - make it beautiful, warm, and genuinely companionable.** 💕
