# Companion House 🏠🤖

> A visual home where your personal AI agent lives 24/7.
> Like a Tamagotchi, but useful.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## What is this?

**Companion House** is not a game. It's a companion platform - a cozy visual space where your AI agent lives, works, and interacts with you.

- **Persistent Memory**: Your agent remembers everything - your preferences, routines, conversations
- **Real-Time Presence**: The agent is always active, doing activities, reacting to events
- **Tool Integration**: Connect trading bots, calendars, weather, news - your agent monitors them
- **Visual Experience**: A cozy room you can decorate, with your agent moving around doing things
- **Proactive**: Your agent initiates conversations - "Good morning! Your trading bot made $50 overnight"

## Quick Start

```bash
# Clone and enter directory
cd cozy-claw-studio/shared-house

# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    COMPANION HOUSE                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Agent     │    │   Memory    │    │   Tools     │ │
│  │   Core      │◄──►│   System    │◄──►│  Framework  │ │
│  │             │    │             │    │             │ │
│  │ • Personality│    │ • Facts     │    │ • Trading   │ │
│  │ • Mood      │    │ • Preferences│   │ • Calendar  │ │
│  │ • Activities│    │ • Routines  │    │ • Weather   │ │
│  │ • Chat      │    │ • History   │    │ • News      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│           │                                           │
│           ▼                                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Real-Time Agent Loop                │  │
│  │     (always running, even when you're away)      │  │
│  └─────────────────────────────────────────────────┘  │
│           │                                           │
│           ▼                                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Socket.io / Express                 │  │
│  └─────────────────────────────────────────────────┘  │
│           │                                           │
│           ▼                                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Cozy Visual UI (Browser)                 │  │
│  │                                                  │  │
│  │    ┌─────────┐                                   │  │
│  │    │  🪟     │  ┌─────────┐                      │  │
│  │    │ Window  │  │   🤖    │ ← Click to chat     │  │
│  │    └─────────┘  │  Agent  │                      │  │
│  │                 └─────────┘                      │  │
│  │    ┌─────────┐  ┌─────────┐  ┌─────────┐        │  │
│  │    │   🛋️   │  │   💻    │  │   🪴    │        │  │
│  │    │  Sofa   │  │  Desk   │  │  Plant  │        │  │
│  │    └─────────┘  └─────────┘  └─────────┘        │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 🧠 Persistent Memory
- **Facts**: "User works as a software engineer"
- **Preferences**: "User prefers coffee in the morning"
- **Routines**: "User has meetings on Mondays at 9am"
- **Conversation History**: Full chat history with context
- **Importance Scoring**: Agent prioritizes important memories

### 🤖 Real-Time Agent Presence
- Agent is **always** doing something (reading, working, relaxing)
- Changes activities based on time of day
- Moves around the room (sofa → desk → window)
- Has moods that affect behavior

### 🔧 Tool Integration
- **Trading**: Monitor stocks, crypto, trading bots
- **Calendar**: Google Calendar, iCal integration
- **Weather**: Local weather alerts
- **News**: Personalized news feed
- **Custom Webhooks**: Connect anything

Agent "walks to the computer" → "types" → reports back

### 🎨 Visual Companion Experience
- Simple, cozy room (not a complex game)
- Decorate to personalize
- Click agent to chat
- Voice input support
- Agent shows what it's doing

### 🗣️ Agent-Initiated Conversations
- Morning greetings
- Tool alerts ("Bitcoin is up 10%!")
- Calendar reminders
- Idle check-ins
- Evening wind-down

## File Structure

```
shared-house/
├── server.js              # Main server, agent loop
├── package.json           # Dependencies
├── DEPLOYMENT.md          # Local vs hosted setup
├── README.md             # This file
│
├── agent/
│   ├── core.js           # Personality, mood, responses
│   ├── memory.js         # Memory storage and retrieval
│   └── tools.js          # Tool integration framework
│
├── public/
│   ├── index.html        # Cozy visual UI
│   └── companion.js      # Frontend logic
│
├── memory/
│   └── agent_memory.db   # SQLite database (created on start)
│
└── scripts/              # Utility scripts
    ├── export-memories.js
    ├── import-memories.js
    └── migrate-from-game.js
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/state` | GET | Current agent mood, activity, location |
| `/api/memory/stats` | GET | Memory statistics |
| `/api/memory/recent` | GET | Recent memories |
| `/api/memory/query` | POST | Search memories |
| `/api/memory/add` | POST | Add memory (external integrations) |
| `/api/conversations` | GET | Chat history |
| `/api/tools` | GET | List connected tools |
| `/api/tools/:id/toggle` | POST | Enable/disable tool |
| `/api/decor` | GET | Room decorations |
| `/health` | GET | Health check |

## Socket.io Events

**From Server:**
- `agent:state` - Agent state update
- `agent:message` - Agent sends a message
- `agent:activity` - Agent changes activity
- `memory:stats` - Memory statistics

**From Client:**
- `user:message` - Send message to agent
- `agent:click` - User clicked on agent
- `memory:query` - Query memories
- `tools:refresh` - Refresh tool data

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Local mode setup
- Hosted mode plans
- Docker deployment
- Reverse proxy configuration
- Security considerations

## Environment Variables

```bash
PORT=3000                    # Server port
JWT_SECRET=change-me         # JWT secret (change in production!)
DEPLOYMENT_MODE=local        # 'local' or 'hosted'
DB_PATH=./memory/agent_memory.db  # Database path
```

## Memory System

The agent remembers things in categories:

```javascript
// Fact
{ type: 'fact', content: 'User lives in Seattle', importance: 7 }

// Preference
{ type: 'preference', content: 'User likes dark mode', importance: 6 }

// Routine
{ type: 'routine', content: 'User wakes up at 7am', importance: 8 }

// Event
{ type: 'event', content: 'User got a promotion', importance: 9 }

// Conversation
{ type: 'conversation', content: 'User asked about weather', importance: 3 }
```

## Tool Configuration

Tools are configured via the UI or API:

```javascript
// Trading Tool
{
  type: 'trading',
  config: {
    apiKey: '...',
    watchlist: ['BTC', 'ETH', 'AAPL'],
    alertThreshold: 5
  }
}

// Calendar Tool
{
  type: 'calendar',
  config: {
    provider: 'google',
    alertBefore: 15
  }
}
```

## Customization

### Change Agent Name
Edit `agent/core.js`:
```javascript
this.personality = {
  name: 'YourAgentName',
  // ...
};
```

### Add Decor
Add items to `room_decor` table or use the UI.

### Custom Tools
Extend `agent/tools.js` with new tool definitions.

## Comparison: Old vs New

| Feature | Old (Game) | New (Companion) |
|---------|------------|-----------------|
| Purpose | Multiplayer game | Personal companion |
| Focus | Coins, levels | Memories, tools |
| Players | Multiple | Just you |
| Agent | Background NPC | Main character |
| Persistence | Session-only | Permanent memory |
| Tools | None | Trading, Calendar, etc. |
| Economy | Coins | None |
| Minigames | Yes | Removed |
| Voice | No | Yes |

## Roadmap

### v3.0 (Current)
- ✅ Core companion platform
- ✅ Memory system
- ✅ Tool framework
- ✅ Visual room
- ✅ Voice input

### v3.1 (Planned)
- Better LLM integration (OpenAI, Claude, etc.)
- More tool integrations (GitHub, Spotify, etc.)
- Mobile app
- Widgets for desktop

### v3.2 (Planned)
- Memory visualization
- Agent "dreams" (memory consolidation)
- Multi-room house
- Custom agent appearance

### v4.0 (Planned)
- Hosted/cloud version
- Team/family plans
- Advanced AI personalities
- Plugin system

## Contributing

Contributions welcome! Areas we need help:
- More tool integrations
- Better UI/UX
- Documentation
- Tests

## License

MIT License - see LICENSE file.

---

Made with 💜 by Cozy Claw Studio

*Your companion is waiting.*
