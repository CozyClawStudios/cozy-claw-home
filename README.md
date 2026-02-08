# Cozy Claw Studio 🏠

*Your personal AI companion's home*

A visual, cozy space where your AI companion lives 24/7. Not a game—just a warm, companionable presence that remembers you, checks on you, and helps with your daily life.

---

## ✨ What This Is

Imagine a Tamagotchi, but instead of feeding it and playing mini-games, you have a helpful AI roommate who:

- **Remembers everything** - Your preferences, routines, conversations
- **Lives on their own schedule** - Reads, works, relaxes, naps
- **Checks your tools** - Trading bots, calendar, weather, news
- **Initiates conversations** - "Your Bitcoin is up 10%!" or "Meeting in 15 minutes"
- **Is just... there** - A comforting presence you can chat with anytime

---

## 🚀 Quick Start

### Local Mode (Privacy-First)

```bash
cd shared-house
npm install
npm start
```

Open http://localhost:3000 and your companion will be waiting.

All data stays on your machine in a local SQLite database.

### Hosted Mode (Coming Soon)

For those who want access from anywhere, a cloud-hosted version will be available.

---

## 🏗️ Architecture

```
Cozy Claw Studio
├── agent/
│   ├── core.js      # Personality, state, responses
│   ├── memory.js    # Long-term memory storage
│   └── tools.js     # External integrations
├── public/
│   └── index.html   # The cozy room UI
├── memory/          # SQLite database
└── server.js        # Real-time companion loop
```

---

## 🧠 Memory System

The companion remembers:

- **Facts** - "User works as a developer"
- **Preferences** - "User likes coffee in the morning"
- **Routines** - "User usually wakes up at 8am"
- **Events** - "User had a meeting yesterday"
- **Conversations** - Full chat history with context

Memories are scored by importance and decay naturally if not accessed.

---

## 🔧 Tool Integrations

Connect external services:

| Tool | What It Does |
|------|--------------|
| 📈 **Trading** | Monitor crypto/stocks, alert on big moves |
| 📅 **Calendar** | Check upcoming events, meeting reminders |
| 🌤️ **Weather** | Daily forecast, severe weather alerts |
| 📰 **News** | Headlines on topics you care about |
| 🔗 **Webhook** | Custom integrations via webhooks |

---

## 🎨 The Experience

### Your Companion Has...

- **Moods** - Happy, focused, tired, curious, calm
- **Activities** - Reading, working, relaxing, napping
- **Locations** - Moves around the room naturally
- **Initiative** - Can start conversations based on context

### You Can...

- **Click them** to start a conversation
- **Chat** naturally about anything
- **Ask about memories** - "What do you remember about me?"
- **Configure tools** - Set up trading, calendar, etc.
- **Decorate** - Personalize the room (coming soon)

---

## 🛠️ Tech Stack

- **Node.js** + **Express** - Backend
- **Socket.io** - Real-time communication
- **SQLite** - Local data storage
- **Vanilla JS** - No heavy frontend frameworks

---

## 🔒 Privacy

**Local mode**: Everything stays on your machine. No data leaves.

**Hosted mode** (future): Encrypted at rest, you own your data.

---

## 📜 License

MIT - Make it yours.

---

*Built with ☕ and 🤖 by the OpenClaw community*
