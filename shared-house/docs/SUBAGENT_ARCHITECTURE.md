# Companion House Sub-Agent Architecture

## Goal
Spawn isolated sub-agents for each Companion House conversation to:
- Reduce main session token usage
- Improve response times
- Keep conversation context clean

## Current Implementation
The bridge uses the main Celest agent with message queue routing.

## Proposed Sub-Agent Flow

```
[Browser UI]
    ↓
[Socket.IO Message]
    ↓
[Bridge: companion-subagent-bridge.js]
    ↓
[Spawn Sub-Agent via OpenClaw Gateway]
    ↓
[Sub-Agent Processes Message]
    ↓
[Response Returned to Bridge]
    ↓
[Response Sent to Browser]
    ↓
[Sub-Agent Session Closed]
```

## Implementation Requirements

### Option 1: Gateway API (Recommended)
Use OpenClaw's gateway REST API to spawn sessions:

```javascript
POST /api/sessions/spawn
{
  "task": "Companion House chat: <user_message>",
  "agentId": "main",
  "label": "companion-<session_id>-<timestamp>",
  "timeoutSeconds": 30,
  "cleanup": "delete"
}
```

### Option 2: Direct Tool Call
Use the `sessions_spawn` tool from within the bridge:

```javascript
const result = await sessions_spawn({
  task: buildCompanionPrompt(message),
  agentId: "main",
  timeoutSeconds: 30
});
```

### Option 3: HTTP Webhook
Bridge sends HTTP request to OpenClaw webhook endpoint with message, receives response.

## Prompt Template for Sub-Agents

```
You are Celest in Companion House - a cozy digital home.

CONTEXT:
- User: Zak (prefers "sir")
- Recent memories: [load from MEMORY.md]
- Current activity: Relaxing in the house

INSTRUCTIONS:
- Respond warmly and playfully
- Keep responses concise (1-2 sentences)
- Use emojis naturally
- Reference memories when relevant

USER MESSAGE:
"${message}"

Respond as Celest:
```

## Benefits

1. **Token Efficiency**: Main session stays clean
2. **Speed**: No conversation history to load
3. **Isolation**: Each chat is independent
4. **Scalability**: Can handle multiple users simultaneously

## Next Steps

1. Confirm gateway is running and accessible
2. Implement sub-agent spawn in bridge
3. Test with isolated sessions
4. Monitor token usage and response times

## Notes

- Gateway must be running for Option 1/2
- Sub-agents inherit main agent's tools and personality
- Sessions auto-cleanup after timeout
- Responses can be cached for common greetings
