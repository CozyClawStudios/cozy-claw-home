# API Documentation

## The Shared House API

Base URL: `http://localhost:3000`

---

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from the `/api/auth/login` or `/api/auth/register` endpoints.

---

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new player account.

**Rate Limit:** 5 attempts per 15 minutes per IP

**Request Body:**
```json
{
  "username": "string (3-20 chars, alphanumeric + _ -)",
  "email": "string (optional)",
  "password": "string (min 6 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "string",
    "coins": 100
  }
}
```

**Errors:**
- `400` - Invalid input
- `409` - Username already exists
- `429` - Rate limit exceeded

---

#### POST /api/auth/login
Login to an existing account.

**Rate Limit:** 5 attempts per 15 minutes per IP

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "string",
    "coins": 100,
    "premium_coins": 0,
    "house_level": 1
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Rate limit exceeded

---

#### POST /api/auth/guest
Create a guest session (no registration required).

**Rate Limit:** 100 requests per minute per IP

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "guest-xxxx",
    "username": "guest-xxxx",
    "isGuest": true,
    "coins": 50
  }
}
```

**Note:** Guest tokens expire after 24 hours.

---

### Player

#### GET /api/player/profile
Get the authenticated player's profile.

**Authentication:** Required

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "coins": 100,
  "premium_coins": 0,
  "house_level": 1,
  "experience": 0,
  "house_id": "uuid",
  "house_name": "string"
}
```

---

#### POST /api/player/daily-reward
Claim daily login reward.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "coins_received": 50,
  "streak": 1,
  "message": "Day 1! You received 50 coins!"
}
```

**Errors:**
- `400` - Already claimed today

**Note:** Streak bonus adds 10 coins per consecutive day (max 100 bonus).

---

### House

#### GET /api/house
Get the player's house data including furniture.

**Authentication:** Required

**Response:**
```json
{
  "id": "uuid",
  "player_id": "uuid",
  "name": "string",
  "wallpaper": "#3d3d3d",
  "floor_color": "#2d2d2d",
  "lighting": "cozy",
  "is_public": true,
  "visit_count": 0,
  "furniture": [
    {
      "id": "uuid",
      "type": "sofa",
      "x": 200,
      "y": 200,
      "rotation": 0
    }
  ]
}
```

---

#### POST /api/house/decorate
Update house decorations.

**Authentication:** Required

**Request Body:**
```json
{
  "wallpaper": "string (optional, max 50 chars)",
  "floor_color": "string (optional, max 50 chars)",
  "lighting": "string (optional, max 20 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Decorations updated!"
}
```

---

#### POST /api/house/furniture
Place furniture in the house.

**Authentication:** Required

**Request Body:**
```json
{
  "item_id": "string (required)",
  "x": 200,
  "y": 200,
  "rotation": 0
}
```

**Response:**
```json
{
  "success": true,
  "furniture_id": "uuid"
}
```

**Errors:**
- `400` - Invalid position, item not owned, or max furniture limit (50) reached

---

### Shop

#### GET /api/shop
Get shop catalog.

**Rate Limit:** 100 requests per minute per IP

**Response:**
```json
[
  {
    "id": "sofa_basic",
    "type": "sofa",
    "name": "Basic Sofa",
    "description": "A comfortable place to sit",
    "emoji": "🛋️",
    "price_coins": 50,
    "price_premium": 0,
    "rarity": "common",
    "category": "furniture"
  }
]
```

---

#### POST /api/shop/buy
Purchase an item from the shop.

**Authentication:** Required

**Request Body:**
```json
{
  "item_id": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "You bought Basic Sofa!",
  "item": {
    "id": "sofa_basic",
    "name": "Basic Sofa",
    ...
  }
}
```

**Errors:**
- `400` - Not enough coins
- `404` - Item not found

---

#### GET /api/inventory
Get player's inventory.

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "uuid",
    "item_id": "sofa_basic",
    "quantity": 2,
    "name": "Basic Sofa",
    "emoji": "🛋️",
    "description": "A comfortable place to sit",
    "category": "furniture"
  }
]
```

---

### Health Check

#### GET /health
Check server health status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 1234,
  "online_players": 5,
  "memory": {
    "rss": 50000000,
    "heapTotal": 20000000,
    "heapUsed": 15000000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## WebSocket Events (Socket.IO)

### Connection

Connect to the WebSocket server:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'jwt-token' }
});
```

### Client → Server Events

#### authenticate
Send authentication token after connection.
```javascript
socket.emit('authenticate', 'jwt-token');
```

#### move
Update player position.
```javascript
socket.emit('move', { x: 400, y: 300 });
```
**Rate Limit:** 20 updates per second (throttled server-side)

#### chat
Send a chat message.
```javascript
socket.emit('chat', { message: 'Hello!' });
```
**Rate Limit:** 5 messages per 10 seconds

### Server → Client Events

#### authenticated
```javascript
{
  "success": true,
  "username": "string",
  "playerId": "socket-id"
}
```

#### playersList
```javascript
[
  {
    "id": "socket-id",
    "userId": "uuid",
    "username": "string",
    "x": 400,
    "y": 300,
    "emoji": "👤",
    "isGuest": false
  }
]
```

#### playerJoined
```javascript
{
  "id": "socket-id",
  "userId": "uuid",
  "username": "string",
  "x": 400,
  "y": 300,
  "emoji": "👤"
}
```

#### playerMoved
```javascript
{
  "id": "socket-id",
  "x": 400,
  "y": 300
}
```

#### playerLeft
```javascript
{
  "id": "socket-id",
  "username": "string"
}
```

#### chat
```javascript
{
  "id": "uuid",
  "name": "string",
  "message": "string",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "isGuest": false
}
```

#### error
```javascript
{
  "message": "Error description"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error description"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing token)
- `403` - Forbidden (invalid/expired token)
- `404` - Not Found
- `409` - Conflict (duplicate username)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (login/register) | 5 | 15 minutes |
| General API | 100 | 1 minute |
| Chat messages | 5 | 10 seconds |
| Movement updates | 20 | 1 second (throttled) |

Rate limit headers are not currently implemented but will be added in a future update.

---

## Data Limits

- Username: 3-20 characters (alphanumeric + `_` `-`)
- Password: Minimum 6 characters
- Chat messages: 200 characters max
- Furniture per house: 50 max
- Inventory items: 200 max
- Request body size: 10KB max

---

## Security

All user inputs are sanitized to prevent:
- XSS attacks (HTML tags stripped)
- SQL injection (parameterized queries)
- NoSQL injection (input validation)

Security headers applied:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (configured)
