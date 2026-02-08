# Companion House - Deployment Guide

A visual home for your personal AI agent.

## Deployment Modes

### Local Mode (Default)

**Best for:** Privacy-conscious users, developers, self-hosters

**Features:**
- All data stored locally in SQLite
- No subscription required
- Full control over your data
- Works offline after initial setup
- No external dependencies (except optional tool APIs)

**Requirements:**
- Node.js 18+
- ~100MB disk space

**Setup:**

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
open http://localhost:3000
```

**Data Location:**
- Database: `./memory/agent_memory.db`
- Config: Set via environment variables or defaults

**Environment Variables:**
```bash
PORT=3000                    # Server port
JWT_SECRET=your-secret       # Change in production!
DEPLOYMENT_MODE=local        # 'local' or 'hosted'
DB_PATH=./memory/agent_memory.db
```

---

### Hosted Mode

**Best for:** Users who want cloud access, multiple devices, managed infrastructure

**Features:**
- Access from any device
- Automatic backups
- No local setup required
- Professional support
- Scalable infrastructure

**Coming Soon:**
- Cloud database (PostgreSQL/MongoDB)
- Docker deployment
- Kubernetes manifests
- Terraform configurations

**Architecture:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server  │────▶│ Cloud DB    │
│  (Browser)  │◀────│   (Node.js)  │◀────│ (PostgreSQL)│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Redis Cache │
                    └──────────────┘
```

**Subscription Tiers (Planned):**

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Memory Limit | 1,000 entries | Unlimited | Unlimited |
| Tool Integrations | 2 active | Unlimited | Unlimited |
| Voice Input | ✅ | ✅ | ✅ |
| Cloud Sync | ❌ | ✅ | ✅ |
| Custom Tools | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Priority Support | ❌ | Email | 24/7 |
| Price | Free | $9/mo | Contact Us |

---

## Docker Deployment (Local)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

VOLUME ["/app/memory"]

CMD ["npm", "start"]
```

**Build & Run:**
```bash
docker build -t companion-house .
docker run -p 3000:3000 -v $(pwd)/memory:/app/memory companion-house
```

---

## Reverse Proxy (Production)

### Nginx
```nginx
server {
    listen 80;
    server_name companion.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy
```
companion.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## Security Considerations

### Local Mode
- Change default `JWT_SECRET`
- Use HTTPS if accessible from internet
- Regular database backups
- Keep Node.js updated

### Hosted Mode
- All data encrypted at rest
- TLS 1.3 for all connections
- SOC 2 compliance planned
- GDPR compliant data handling

---

## Backups

### Automated (Local)
```bash
# Add to crontab for daily backups
0 2 * * * cp /path/to/agent_memory.db /backups/agent_memory_$(date +%Y%m%d).db
```

### Export/Import
```bash
# Export memories to JSON
node scripts/export-memories.js > memories_backup.json

# Import memories
node scripts/import-memories.js memories_backup.json
```

---

## Troubleshooting

### Port already in use
```bash
PORT=3001 npm start
```

### Database locked
```bash
# Stop the server, then:
sqlite3 memory/agent_memory.db ".recover" | sqlite3 memory/agent_memory_fixed.db
mv memory/agent_memory_fixed.db memory/agent_memory.db
```

### Reset all data
```bash
rm memory/agent_memory.db
npm start  # Will recreate with fresh state
```

---

## Migration from Game Version

If you have data from the old "Shared House" game:

```bash
node scripts/migrate-from-game.js
```

This will:
1. Import user profile
2. Convert chat history to memories
3. Preserve room decorations
4. Reset game-specific data (coins, etc.)

---

## Development

```bash
# Install dev dependencies
npm install

# Run with auto-restart
npm run dev

# Run tests
npm test
```

---

## Support

- **Local Mode:** GitHub Issues, Community Discord
- **Hosted Mode:** Email support, Priority Discord channel

---

## License

MIT - See LICENSE file for details.
