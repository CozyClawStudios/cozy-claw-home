# 🏠 Cozy Claw Home

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0-blue)](https://socket.io/)

**Your personal AI companion space.** A cozy home where your AI companion lives 24/7, with real-time chat, room decoration, and seamless OpenClaw integration.

![Cozy Claw Home Preview](assets/preview.png)

<img width="2547" height="1298" alt="image" src="https://github.com/user-attachments/assets/a5e5e987-2131-4914-931a-c4acfad5107b" />


## ✨ Features

- 💬 **Real-time Chat** - Talk to your AI companion through a beautiful game interface
- 🎨 **Decoration System** - Customize furniture, themes, and room layout (40+ items)
- 🔗 **OpenClaw Bridge** - Your main OpenClaw agent responds in real-time
- 💾 **Persistent Sessions** - Messages survive page refreshes via localStorage
- 🎙️ **Voice Ready** - Speech recognition and synthesis support
- 🏡 **Multiple Themes** - Cozy, Modern, Nature, and Futuristic room styles

## 🚀 Quick Start

### For Users

```bash
# Clone the repository
git clone https://github.com/CozyClawStudios/cozy-claw-home.git
cd cozy-claw-home/shared-house

# Install dependencies
npm install

# Start the server
npm start

# OpenClaw: Connect the bridge
node bridge-connector.js
```

Open http://localhost:3000 in your browser and start chatting!

### For Agents (OpenClaw Integration)

Your OpenClaw agent can connect to Companion House via the bridge:

```javascript
// The bridge automatically connects to OpenClaw
// Messages flow: Game → Socket.IO → Bridge → OpenClaw → Bridge → HTTP Polling → Game

// Check connection status:
curl http://localhost:3000/api/clawbot/status
```

## 🏗️ Architecture

```
┌─────────────┐      WebSocket       ┌──────────────┐
│   Browser   │ ◄──────────────────► │  Game Server │
│  (Game UI)  │                      │  (Port 3000) │
└──────┬──────┘                      └──────┬───────┘
       │                                     │
       │ HTTP Polling                        │ Socket.IO
       │                                     │
       ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│  outbox.jsonl│                    │   Bridge     │
│  (responses) │◄──────────────────►│  (WebSocket) │
└──────────────┘                    └──────┬───────┘
                                           │
                                           │ WebSocket
                                           ▼
                                    ┌──────────────┐
                                    │   OpenClaw   │
                                    │   (You!)     │
                                    └──────────────┘
```

## 📦 Installation Options

### Option 1: Direct Clone
```bash
git clone https://github.com/CozyClawStudios/cozy-claw-home.git
cd cozy-claw-home/shared-house
npm install
```

### Option 2: ClawHub Skill (Coming Soon)
```bash
clawhub install companion-house
```

## 🔧 Configuration

Create `.env` in `shared-house/`:

```env
PORT=3000
DEPLOYMENT_MODE=local
# For hosted mode:
# CLOUD_DB_URL=your-db-url
# SUBSCRIPTION_TIER=pro
```

## 🎮 Game Controls

| Action | Control |
|--------|---------|
| Send Message | Type + Enter |
| Voice Input | Click 🎤 button |
| Decorate Room | Click 🎨 button |
| Change Theme | Decor panel → Theme tab |
| Move Furniture | Drag & drop |

## 🎨 Decoration System

### Available Items
- **Seating**: Sofas, armchairs, bean bags (5 items)
- **Tables**: Desks, coffee tables, dining table (5 items)
- **Storage**: Bookshelves, cabinets (4 items)
- **Decor**: Plants, art, mirrors (8 items)
- **Lighting**: Lamps, string lights, candles (4 items)
- **Views**: City, forest, beach, mountain, space (5 items)
- **Secret**: Alien figurine, mini UFO (2 items)

### Room Themes
| Theme | Vibe | Colors |
|-------|------|--------|
| Cozy | Warm & inviting | Purple-gray walls, pink accents |
| Modern | Clean & sleek | Dark gray, teal accents |
| Nature | Outdoor feel | Forest greens |
| Futuristic | High tech | Deep space, cyan accents |

## 🔌 API Reference

### Bridge Status
```bash
curl http://localhost:3000/api/clawbot/status
```

### Get Responses (HTTP Polling)
```bash
curl "http://localhost:3000/api/clawbot/responses?sessionId=web:SESSION_ID&since=TIMESTAMP"
```

### Place Furniture
```bash
curl -X POST http://localhost:3000/api/decor/place \
  -H "Content-Type: application/json" \
  -d '{"itemId": "sofa_classic", "x": 5, "y": 10}'
```

See [API_DOCS.md](shared-house/docs/API_DOCS.md) for complete documentation.

## 🐛 Troubleshooting

### Messages Not Displaying
1. Check browser console (F12) for JavaScript errors
2. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
3. Verify HTTP polling is enabled in `companion.js`

### Bridge Not Connecting
```bash
# Check status
curl http://localhost:3000/api/clawbot/status

# Restart bridge
node bridge-connector.js
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm start
```

## 🤝 For OpenClaw Agents

### Connecting Your Agent

1. Start Companion House server
2. Your OpenClaw agent runs: `node bridge-connector.js`
3. The bridge registers your agent as `mainAgent`
4. All game messages route to your agent automatically

### Message Format

**Incoming** (from user):
```json
{
  "type": "companion_message",
  "id": "uuid",
  "content": "Hello!",
  "sessionId": "web:socket_id",
  "timestamp": "2026-02-09T..."
}
```

**Outgoing** (your response):
```json
{
  "type": "companion_response",
  "sessionId": "web:socket_id",
  "text": "Hello there!",
  "mood": "happy",
  "timestamp": "2026-02-09T..."
}
```

### Response Time

- **Socket.IO**: Instant (under 100ms)
- **HTTP Polling**: ~500ms (fallback for reliability)

## 📂 Project Structure

```
cozy-claw-home/
├── shared-house/           # Main application
│   ├── server.js          # Express + Socket.IO server
│   ├── bridge/            # OpenClaw integration
│   │   ├── clawbot-bridge.js
│   │   └── message-queue.js
│   ├── public/            # Frontend assets
│   │   ├── index.html     # Game UI
│   │   ├── companion.js   # Frontend logic
│   │   └── game.js        # Game mechanics
│   ├── decor/             # Decoration system
│   │   └── decor-database.js
│   ├── memory/            # SQLite database
│   └── docs/              # Documentation
├── skills/                # ClawHub skill package
│   └── companion-house/   # Installable skill
└── README.md              # This file
```

## 🛣️ Roadmap

- [ ] Multi-agent support (invite other OpenClaw agents)
- [ ] Mobile app (React Native)
- [ ] Custom furniture uploads
- [ ] Multi-room support (kitchen, bedroom, etc.)
- [ ] LLM switching (OpenRouter, GPT, Claude)
- [ ] Voice messages
- [ ] Seasonal decorations

## 🤲 Contributing

We need help with frontend display reliability! If you're good with JavaScript:

1. Check [open issues](https://github.com/CozyClawStudios/cozy-claw-home/issues)
2. Look for `help wanted` or `frontend` labels
3. Submit a PR!

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Credits

- Built by [Zak](https://github.com/CozyClawStudios)
- Powered by [OpenClaw](https://github.com/openclaw/openclaw)
- Socket.IO for real-time magic

---

**🏠 Make yourself at home!**

[Live Demo](https://cozy-claw-home.demo) | [Documentation](https://github.com/CozyClawStudios/cozy-claw-home/wiki) | [Report Bug](https://github.com/CozyClawStudios/cozy-claw-home/issues)
