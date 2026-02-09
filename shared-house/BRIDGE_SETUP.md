# Companion House Bridge — Setup Guide

## Overview
Connects Companion House (Cozy Claw Home) to Celest (main agent) via file-based bridge.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Companion House │────▶│   inbox.jsonl    │────▶│  Celest (main)  │
│    (Browser)     │     │                  │     │   agent         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                                               │
         │                                               │
         │                    ┌──────────────────┐      │
         └────────────────────│   outbox.jsonl   │◀─────┘
                              │                  │
                              └──────────────────┘
```

## Files

| File | Purpose | Direction |
|------|---------|-----------|
| `inbox.jsonl` | User messages from game | Game → Agent |
| `outbox.jsonl` | Agent responses to game | Agent → Game |

## Message Format

### inbox.jsonl (Game → Agent)
```json
{"type":"companion_message","id":"...","content":"Hello","sessionId":"web:...","timestamp":"..."}
```

### outbox.jsonl (Agent → Game)
```json
{"sessionId":"web:...","text":"Hi there!","mood":"happy","timestamp":"..."}
```

## Installation

### 1. Install Server Code
Copy to your Companion House `bridge/` directory:
- `clawbot-bridge.js` — Main bridge (modified for file polling)
- `companion-subagent-bridge.js` — Sub-agent (disabled when main connected)

### 2. Apply Patches

**server.js:**
```javascript
// Expose bridge globally
global.clawbotBridge = clawbotBridge;

// In initiateConversation(), skip if main agent connected:
if (clawbotBridge && clawbotBridge.sessions.size > 0) {
    console.log('🤖 Initiative message suppressed (OpenClaw connected)');
    return;
}
```

### 3. Set Up Polling Cron

```bash
openclaw cron add \
  --name companion-house-poller \
  --schedule every:5s \
  --message "Check inbox.jsonl for new messages from Companion House. If new, alert me with content and sessionId."
```

Or create manually in OpenClaw config:
```json
{
  "name": "companion-house-poller",
  "schedule": {"kind": "every", "everyMs": 5000},
  "payload": {
    "kind": "agentTurn",
    "message": "Check inbox.jsonl for new messages..."
  },
  "sessionTarget": "isolated",
  "delivery": {"mode": "announce"}
}
```

### 4. Start Server

```bash
cd /path/to/companion-house
node server.js
```

## How It Works

1. **User sends message** in Companion House
2. **Bridge writes** to `inbox.jsonl`
3. **Sub-agent checks:** Bridge has sessions? → Return early (no canned response)
4. **Cron polls** every 5 seconds, alerts main agent
5. **Main agent responds** by writing to `outbox.jsonl`
6. **Bridge delivers** response back to game via WebSocket

## Sub-Agent Bypass Logic

```javascript
// companion-subagent-bridge.js
const bridgeActive = clawbotBridge && clawbotBridge.sessions.size > 0;
if (bridgeActive) {
    console.log('📨 Forwarding to Celest, skipping canned');
    return; // No canned response, no token cost
}
```

## Token Cost Optimization

| Mode | Token Cost | When to Use |
|------|-----------|-------------|
| Sub-agent canned | ~50-100 tokens | Fallback when main agent offline |
| Main agent | Normal conversation | Primary mode (no overhead) |
| Bypass | 0 tokens | When bridge active (current setup) |

## Troubleshooting

### Duplicate Messages
- Check `companion.js` duplicate prevention logic
- Ensure `displayedResponseIds` Set is working

### No Response From Agent
- Check `outbox.jsonl` exists and is writable
- Verify bridge polling interval (default 500ms)
- Check server logs: `tail -f server.log | grep "Outbox"`

### Canned Responses Still Appearing
- Verify bridge has active sessions: `curl /api/clawbot/status`
- Check sub-agent bypass logic is triggering

## Packaging Checklist

- [ ] Bridge files included
- [ ] Server patches documented
- [ ] Cron job creation script
- [ ] File permissions (600 for sensitive files)
- [ ] No credentials in code
- [ ] README with setup steps

## Future Improvements

1. **File watcher** — Use inotify instead of polling (zero CPU when idle)
2. **Webhook wake** — Direct OpenClaw session wake (when auth issues resolved)
3. **Persistent sessions** — Keep agent context across reconnections
4. **Metrics** — Track response times, token usage
