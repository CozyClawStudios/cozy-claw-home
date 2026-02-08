# ClawBot Integration Guide

This guide explains how to connect Cozy Claw Home to an external ClawBot for enhanced AI capabilities.

## What is ClawBot Integration?

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
