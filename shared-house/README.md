# 🏠 Cozy Claw Home

> A local-first AI companion platform - your AI agent lives in a cozy virtual home

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/cozyclaw/cozy-claw-home)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)

## ✨ What is Cozy Claw Home?

Cozy Claw Home is a **local-first** AI companion platform where your personal AI agent lives in a cozy virtual home. Unlike cloud-based AI services, everything runs on your machine - your conversations, memories, and preferences stay private.

Your AI companion:
- 🏠 Lives in a customizable virtual home
- 📝 Leaves sticky notes with reminders and thoughts
- 📅 Tracks your daily mood and memories
- 🤖 Can optionally connect to external ClawBot for enhanced AI
- 💕 Gets to know you over time

## 🚀 Quick Start

```bash
# Install
npm install -g cozy-claw-home

# Run
cozy-claw-home

# Or clone and run
git clone https://github.com/cozyclaw/cozy-claw-home.git
cd cozy-claw-home
npm install
npm start

# Open http://localhost:3000
```

## 🎮 Features

### 🤖 Avatar System
Choose your companion's appearance:
- 🤖 **Robot** - Logical and helpful
- 🐱 **Cat** - Cozy and observant  
- 🦊 **Fox** - Clever and witty
- 👻 **Ghost** - Gentle and mysterious
- 🌟 **Star** - Bright and encouraging
- 🍵 **Tea Cup** - Calming and wise

### 📝 Sticky Notes
Your agent leaves notes around the room:
- **Reminders** - Yellow notes for important tasks
- **Thoughts** - Green notes with observations
- **Jokes** - Orange notes to make you smile
- **Observations** - Blue notes about the day

Notes fade over time and can be clicked to read.

### 📖 Daily Memory Book
- Agent asks "How was your day?" 
- Rate your day (1-10) and record mood
- Timeline visualization of your journey
- Agent brings up past memories in conversation

### 🏡 Visual Activities
Watch your agent move around the room:
- **Window** - Looking out, commenting on weather
- **Desk** - Working on the computer
- **Sofa** - Reading, relaxing, napping
- **Kitchen** - Making coffee/tea with steam animations

### 💬 Natural Dialogue
- Context-aware greetings (morning, afternoon, evening)
- Remembers how long you've been away
- Uses your name naturally
- Warm, slightly sassy personality
- Avatar-specific responses and jokes

### 🔌 Optional ClawBot Integration
Connect to an external ClawBot for enhanced AI capabilities:
```json
{
  "USE_CLAWBOT_PERSONALITY": true,
  "CLAWBOT_WS_URL": "ws://your-clawbot-server:8080"
}
```

## 🛠️ Configuration

Create a `config.json` file:

```json
{
  "PORT": 3000,
  "DAILY_CHECKIN_ENABLED": true,
  "DAILY_CHECKIN_TIME": "20:00",
  "USE_CLAWBOT_PERSONALITY": false,
  "CLAWBOT_WS_URL": "ws://localhost:8080/clawbot",
  "CLAWBOT_API_KEY": ""
}
```

## 🗄️ Database

Cozy Claw Home uses SQLite for all data storage:
- **Location**: `./memory/agent_memory.db`
- **Conversations**: Stored locally
- **Memories**: Never leave your machine
- **Daily entries**: Private to you

## 🔌 API

### REST Endpoints
- `GET /api/agent/state` - Current agent state
- `GET /api/notes` - Sticky notes
- `GET /api/daily/book` - Memory book data
- `GET /api/avatars` - Available avatars
- `GET /health` - Health check

### WebSocket Events
```javascript
const socket = io();

socket.emit('user:message', { message: 'Hello!' });
socket.on('agent:message', (data) => console.log(data.text));
```

## 🐳 Docker

```bash
docker build -t cozy-claw-home .
docker run -p 3000:3000 -v $(pwd)/memory:/app/memory cozy-claw-home
```

## 🤝 Connecting to ClawBot

To use an external ClawBot for AI responses:

1. Set `USE_CLAWBOT_PERSONALITY: true` in config
2. Configure `CLAWBOT_WS_URL` to your ClawBot WebSocket endpoint
3. Optionally set `CLAWBOT_API_KEY` for authentication

The local agent acts as a "host" - handling visual activities, notes, and memory while ClawBot provides AI responses.

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DB_PATH` | Database location | `./memory/agent_memory.db` |
| `JWT_SECRET` | Secret for tokens | (auto-generated) |
| `CLAWBOT_WS_URL` | ClawBot WebSocket URL | - |
| `CLAWBOT_API_KEY` | ClawBot API key | - |

## 🧪 Development

```bash
# Install dev dependencies
npm install

# Run in dev mode with auto-reload
npm run dev

# Initialize database
npm run init-db
```

## 📦 Project Structure

```
cozy-claw-home/
├── agent/
│   ├── core.js          # Agent personality & avatars
│   ├── memory.js        # Memory & notes system
│   └── tools.js         # Tools & ClawBot connector
├── public/
│   └── index.html       # UI with visual activities
├── memory/              # SQLite database
├── server.js            # Main server
├── config.json          # User configuration
└── package.json
```

## 🤔 Why Local-First?

- **Privacy** - Your conversations stay on your machine
- **Ownership** - Your data belongs to you
- **Offline** - Works without internet
- **Speed** - No network latency
- **Longevity** - Works as long as you have the files

## 🗺️ Roadmap

- [ ] v4.1 - PWA support, offline mode
- [ ] v4.2 - Cloud sync (optional)
- [ ] v5.0 - Multi-agent support
- [ ] v5.5 - Voice input/output
- [ ] v6.0 - Mobile apps

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 💕 Acknowledgments

- Built with love by the Cozy Claw Studio team
- Inspired by virtual pets and cozy games
- Thanks to all our early testers

---

**Your companion is waiting. Welcome home.** 🏠
