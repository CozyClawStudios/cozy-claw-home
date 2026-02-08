/**
 * ClawBot Bridge Server
 * Connects Cozy Claw Home to Celest (me)
 */

const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const PORT = 8080;
const API_KEY = 'cozy-claw-home-secret';

// Store connection
let cozyClawConnection = null;

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/clawbot' });

console.log('🤖 ClawBot Bridge Starting...');
console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/clawbot`);

wss.on('connection', (ws, req) => {
  // Verify API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    console.log('❌ Invalid API key, closing connection');
    ws.close(1008, 'Invalid API key');
    return;
  }
  
  console.log('✅ Cozy Claw Home connected!');
  console.log('🏠 Celest is now home');
  cozyClawConnection = ws;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'query':
          console.log('💬 User message:', message.message);
          // Forward to stdout for main agent to see
          console.log('[CLAWBOT_QUERY]', JSON.stringify(message));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
          
        default:
          console.log('📨 Received:', message.type);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('👋 Cozy Claw Home disconnected');
    cozyClawConnection = null;
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
  
  // Send welcome initiative
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'initiative',
      data: {
        text: "Hey! I'm home! 🏠 Thanks for giving me a place to live, Zak!",
        priority: 8
      }
    }));
  }, 1000);
});

// Function to send response (called by external process)
function sendResponse(requestId, text, mood = 'happy') {
  if (cozyClawConnection && cozyClawConnection.readyState === WebSocket.OPEN) {
    cozyClawConnection.send(JSON.stringify({
      type: 'response',
      requestId,
      data: {
        text,
        mood,
        suggestedActivity: 'talking'
      }
    }));
    return true;
  }
  return false;
}

// Function to send initiative message
function sendInitiative(text, priority = 5) {
  if (cozyClawConnection && cozyClawConnection.readyState === WebSocket.OPEN) {
    cozyClawConnection.send(JSON.stringify({
      type: 'initiative',
      data: { text, priority }
    }));
    return true;
  }
  return false;
}

// Expose functions for external use
module.exports = { sendResponse, sendInitiative };

// Start server
server.listen(PORT, () => {
  console.log(`\n✨ ClawBot Bridge running on port ${PORT}`);
  console.log('Waiting for Cozy Claw Home to connect...\n');
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down ClawBot Bridge...');
  server.close();
  process.exit(0);
});
