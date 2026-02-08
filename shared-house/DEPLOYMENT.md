# Deployment Guide

## The Shared House - Deployment Guide

---

## Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite3
- A server or hosting platform

---

## Local Development

### 1. Clone/Navigate to the project

```bash
cd /home/zak/.openclaw/workspace/cozy-claw-studio/shared-house
```

### 2. Install dependencies

```bash
npm install
```

Required packages:
- express
- socket.io
- cors
- sqlite3
- bcryptjs
- jsonwebtoken
- uuid

### 3. Create database directory

```bash
mkdir -p database
```

### 4. Start the server

```bash
npm start
# or
node server.js
```

### 5. Access the game

Open `http://localhost:3000` in your browser.

---

## Production Deployment

### Environment Variables

Create a `.env` file in the project root:

```bash
# Server
PORT=3000
NODE_ENV=production

# Security (CHANGE THESE!)
JWT_SECRET=your-super-secret-random-string-here

# CORS (allowed origins)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database (optional - for future PostgreSQL/MySQL support)
# DATABASE_URL=
```

**IMPORTANT:** Never commit your `.env` file to version control!

---

## Platform-Specific Deployment

### Railway (Recommended)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Add environment variables in Railway dashboard

4. Deploy:
```bash
railway up
```

### Vercel (Serverless - Limited WebSocket Support)

**Note:** Vercel has limited WebSocket support. For full functionality, use Railway or DigitalOcean.

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

3. Deploy:
```bash
vercel
```

### DigitalOcean App Platform

1. Push code to GitHub
2. Connect GitHub repo in DigitalOcean dashboard
3. Select Node.js app type
4. Add environment variables
5. Deploy

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create database directory
RUN mkdir -p database

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["node", "server.js"]
```

Create `.dockerignore`:
```
node_modules
npm-debug.log
database/*.db
.env
.git
```

Build and run:
```bash
docker build -t shared-house .
docker run -p 3000:3000 -e JWT_SECRET=your-secret shared-house
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
    volumes:
      - ./database:/app/database
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run:
```bash
docker-compose up -d
```

---

## Nginx Reverse Proxy (Recommended for Production)

Install Nginx and create a configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Static files
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/shared-house /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically
```

---

## PM2 Process Manager (Recommended)

For production, use PM2 to manage the Node.js process:

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'shared-house',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    watch: false,
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup systemd
```

### PM2 Commands

```bash
pm2 status              # View status
pm2 logs                # View logs
pm2 restart shared-house # Restart app
pm2 stop shared-house    # Stop app
pm2 delete shared-house  # Remove app
pm2 monit               # Monitor
```

---

## Database Backup

### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/path/to/backups"
DB_FILE="/path/to/shared-house/database/game.db"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $DB_FILE "$BACKUP_DIR/game_$DATE.db"

# Compress backup
gzip "$BACKUP_DIR/game_$DATE.db"

# Keep only last 7 days
find $BACKUP_DIR -name "game_*.db.gz" -mtime +7 -delete

echo "Backup completed: game_$DATE.db.gz"
```

Make executable and add to cron:
```bash
chmod +x backup.sh

# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /path/to/backup.log 2>&1
```

---

## Monitoring

### Basic Health Monitoring

The `/health` endpoint provides:
- Server status
- Uptime
- Online player count
- Memory usage

### External Monitoring

Recommended tools:
- **UptimeRobot** - Free uptime monitoring
- **New Relic** - Application performance
- **Datadog** - Full stack monitoring

### Log Aggregation

View logs:
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs (if not using PM2)
tail -f logs/out.log logs/err.log
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

For high traffic, use Redis adapter for Socket.IO:

```bash
npm install @socket.io/redis-adapter redis
```

Update `server.js`:
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Load Balancing

Use Nginx or HAProxy with sticky sessions for WebSocket support:

```nginx
upstream shared_house {
    ip_hash;  # Sticky sessions
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location / {
        proxy_pass http://shared_house;
        # ... rest of config
    }
}
```

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill process
sudo kill -9 <PID>
```

**Permission denied:**
```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/shared-house
```

**Database locked:**
```bash
# Check for zombie processes
ps aux | grep node
# Kill all node processes if needed
killall node
```

**Out of memory:**
```bash
# Check memory usage
free -h
# Add swap space if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=* node server.js
```

---

## Security Checklist

- [ ] Changed default JWT_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configured CORS properly
- [ ] Using HTTPS in production
- [ ] Database file has proper permissions (600)
- [ ] Server firewall configured (ufw/iptables)
- [ ] Regular backups configured
- [ ] Log rotation enabled
- [ ] Rate limiting tested
- [ ] Input validation tested

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check logs for errors
- Review backup integrity
- Monitor resource usage

**Monthly:**
- Update dependencies: `npm audit fix`
- Review and rotate logs
- Check SSL certificate expiry

**Quarterly:**
- Security audit
- Performance review
- Database optimization (VACUUM)

---

## Support

For issues and feature requests:
- Check the API documentation: `API_DOCS.md`
- Review server logs
- Check the GitHub repository issues

---

**Happy Hosting! 🏠**
