# ClawBot Integration Guide

This guide explains how to connect Cozy Claw Home to Celest (your OpenClaw agent).

## Current Status: ✅ Working via File Queue

**Messaging from game to Celest is LIVE and working.**

### How It Works

1. **Send message from game** → Message written to `.clawbot-queue.jsonl`
2. **Celest receives it instantly** → No action needed, messages appear in her conversation

### Quick Test

1. Open game at `http://localhost:3000`
2. Type a message and send
3. Celest receives it and responds

### Architecture

```
Game UI → Bridge → .clawbot-queue.jsonl → Celest reads → Response
```

The file queue is polled automatically. Messages typically arrive within 1-2 seconds.

---

## Setup

### 1. Start the Companion House Server

```bash
cd cozy-claw-studio/shared-house
npm start
```

### 2. Open in Browser

```bash
open http://localhost:3000
```

### 3. Send Messages

Just type and send. Messages appear in Celest's conversation automatically.

---

## Technical Details

### Bridge Configuration

The bridge is configured in `bridge/clawbot-bridge.js`:

- **Primary**: WebSocket for real-time bidirectional chat
- **Fallback**: File queue `.clawbot-queue.jsonl` for message delivery
- **Response Path**: Celest writes to `outbox.jsonl`, bridge reads and sends to game

### File Queue Format

Messages are JSON lines appended to `.clawbot-queue.jsonl`:

```json
{"type":"companion_message","id":"...","content":"your message","sessionId":"web:...","timestamp":"..."}
```

### Manual Check (if needed)

If messages seem delayed, tell Celest **"check game"** and she'll read the queue immediately.

---

## Troubleshooting

### Messages Not Arriving

1. Check server is running: `tmux ls | grep cozy-server`
2. Check queue file exists: `ls -la .clawbot-queue.jsonl`
3. Tell Celest "check game" to force a read

### Bridge Disconnected

Refresh the game browser - it auto-reconnects.

### Full Reset

```bash
tmux kill-session -t cozy-server
cd cozy-claw-studio/shared-house && npm start
```

---

## Future: WebSocket/Webhook Integration

The following describes planned improvements for even faster real-time messaging:

### WebSocket Bridge (Planned)

For even faster real-time chat, the bridge supports WebSocket connections:

```javascript
// bridge/clawbot-bridge.js connects via Socket.IO
// Messages flow both directions instantly
```

### Webhook Integration (Experimental)

Gateway webhooks (`POST /hooks/wake`) may enable push delivery in future versions.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clawbot/message` | POST | Send message to Celest |
| `/api/clawbot/responses` | GET | Get responses for session |
| `/api/clawbot/status` | GET | Bridge connection status |

### Send Message via API

```bash
curl -X POST http://localhost:3000/api/clawbot/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from API"}'
```

---

## File Structure

```
shared-house/
├── bridge/
│   └── clawbot-bridge.js    # Main bridge logic
├── .clawbot-queue.jsonl      # Incoming messages (auto-created)
├── outbox.jsonl              # Outgoing responses (auto-created)
└── CLAWBOT_INTEGRATION.md    # This file
```

---

## Summary

✅ **Working Now**: File-based messaging is live and reliable
⚡ **Speed**: Messages arrive in 1-2 seconds
🔧 **Maintenance**: Restart server if issues occur
📱 **Alternative**: Message Celest directly on Telegram/Discord

**Status**: Ready for daily use.

By default, Cozy Claw Home uses its built-in personality system with avatar-specific responses. However, you can optionally connect to an external ClawBot WebSocket server for more advanced AI responses.

**How it works:**
- Your local agent acts as the "host" - managing the visual home, activities, notes, and memory
- User messages are forwarded to the external ClawBot via WebSocket
- ClawBot's AI responses are displayed in the companion UI
- If ClawBot disconnects, the local personality automatically takes over

## Configuration

### 1. Edit config.json

```json
{
  "USE_CLAWBOT_PERSONALITY": true,
  "CLAWBOT_WS_URL": "ws://your-clawbot-server:8080/clawbot",
  "CLAWBOT_API_KEY": "your-api-key-here"
}
```

### 2. Environment Variables

You can also use environment variables:

```bash
export CLAWBOT_WS_URL="ws://localhost:8080/clawbot"
export CLAWBOT_API_KEY="your-api-key"
export USE_CLAWBOT_PERSONALITY="true"
```

### 3. Via Setup Wizard

On first run, the setup wizard will ask if you want to enable ClawBot integration.

## ClawBot WebSocket Protocol

### Connection

Cozy Claw Home connects to ClawBot via WebSocket with the following headers:

```
GET /clawbot HTTP/1.1
Host: your-clawbot-server:8080
Upgrade: websocket
Connection: Upgrade
X-API-Key: your-api-key
```

### Messages from Cozy Claw Home → ClawBot

#### Query (User Message)
```json
{
  "type": "query",
  "requestId": "uuid-string",
  "message": "Hello, how are you?",
  "context": {
    "clientId": "socket-id",
    "agentState": {
      "mood": "happy",
      "activity": "relaxing",
      "location": "sofa",
      "avatar": { ... }
    }
  }
}
```

#### Ping (Heartbeat)
```json
{
  "type": "ping",
  "timestamp": 1707331200000
}
```

### Messages from ClawBot → Cozy Claw Home

#### Response
```json
{
  "type": "response",
  "requestId": "uuid-string",
  "data": {
    "text": "I'm doing great! Thanks for asking!",
    "mood": "happy",
    "suggestedActivity": "talking"
  }
}
```

#### Initiative (Proactive Message)
```json
{
  "type": "initiative",
  "data": {
    "text": "Hey! Just checking in. How's your day going?",
    "priority": 5
  }
}
```

#### Personality Update
```json
{
  "type": "personality_update",
  "data": {
    "name": "Custom Name",
    "voice": "friendly",
    "avatarSuggestion": "cat"
  }
}
```

#### Pong (Heartbeat Response)
```json
{
  "type": "pong",
  "timestamp": 1707331200000
}
```

## Simple ClawBot Server Example (Node.js)

```javascript
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/clawbot' });

wss.on('connection', (ws, req) => {
  // Verify API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'your-expected-api-key') {
    ws.close(1008, 'Invalid API key');
    return;
  }
  
  console.log('Cozy Claw Home connected');
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'query':
        // Process user message and send response
        handleQuery(ws, message);
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  });
  
  ws.on('close', () => {
    console.log('Cozy Claw Home disconnected');
  });
});

async function handleQuery(ws, message) {
  // Your AI processing here
  const response = {
    type: 'response',
    requestId: message.requestId,
    data: {
      text: `You said: ${message.message}. This is a response from ClawBot!`,
      mood: 'happy'
    }
  };
  
  ws.send(JSON.stringify(response));
}

server.listen(8080, () => {
  console.log('ClawBot server running on port 8080');
});
```

## Connection Status

Check ClawBot connection status via API:

```bash
curl http://localhost:3000/api/clawbot/status
```

Response:
```json
{
  "connected": true,
  "enabled": true,
  "url": "ws://localhost:8080/clawbot",
  "reconnectAttempts": 0,
  "queueLength": 0
}
```

## Fallback Behavior

If ClawBot is enabled but unavailable:

1. First connection attempt fails → Shows warning in console
2. Subsequent attempts → Automatic reconnection with exponential backoff
3. User sends message → Falls back to local personality immediately
4. ClawBot reconnects → Switches back to ClawBot responses

## Troubleshooting

### Connection Refused
- Verify ClawBot server is running
- Check `CLAWBOT_WS_URL` is correct
- Ensure no firewall blocking the connection

### Invalid API Key
- Verify `CLAWBOT_API_KEY` matches what ClawBot expects
- Check headers are being sent correctly

### Messages Not Forwarded
- Check `USE_CLAWBOT_PERSONALITY` is `true` in config
- Verify WebSocket connection is established
- Check server logs for errors

### Slow Responses
- ClawBot should respond within 10 seconds
- Check network latency between Cozy Claw Home and ClawBot
- Consider local deployment if latency is high

## Security Considerations

1. **Use API Keys** - Always require API key authentication
2. **HTTPS/WSS** - Use wss:// for production
3. **Rate Limiting** - Implement rate limiting on ClawBot
4. **Input Validation** - Sanitize all incoming messages
5. **Connection Limits** - Limit concurrent connections per API key

## Advanced: Custom ClawBot with AI

You can integrate any AI service into your ClawBot:

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleQuery(ws, message) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a cozy, friendly AI companion." },
      { role: "user", content: message.message }
    ]
  });
  
  ws.send(JSON.stringify({
    type: 'response',
    requestId: message.requestId,
    data: {
      text: completion.choices[0].message.content,
      mood: 'happy'
    }
  }));
}
```

## Disabling ClawBot

To disable ClawBot and use only local personality:

1. Edit `config.json`:
```json
{
  "USE_CLAWBOT_PERSONALITY": false
}
```

2. Or via API:
```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"USE_CLAWBOT_PERSONALITY": false}'
```

3. Restart the server

---

**Note:** ClawBot integration is completely optional. Cozy Claw Home works great with its built-in personality system!
