# Quick Start Guide

Get your webhook server up and running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- OR Node.js >= 18.0.0

## Option 1: Docker (Recommended)

### 1. Navigate to the directory

```bash
cd examples/webhook-server
```

### 2. Generate secrets

```bash
# Generate webhook secret and API key
docker run --rm node:20-alpine node -e "console.log('WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
docker run --rm node:20-alpine node -e "console.log('ADMIN_API_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create .env file

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
WEBHOOK_SECRET=<paste-generated-secret>
ADMIN_API_KEY=<paste-generated-api-key>
DATABASE_PATH=/app/data/webhooks.db
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_IPS=
EOF
```

### 4. Start the server

```bash
docker-compose up -d
```

### 5. Verify it's running

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 10.5,
  "environment": "production"
}
```

### 6. Test webhooks

```bash
# View logs
docker-compose logs -f

# In another terminal, send a test webhook
# (Install curl if not available)
curl -X POST http://localhost:3000/webhooks/verification \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=test" \
  -d '{
    "id": "test-123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "eventType": "VERIFICATION_SUCCESS",
    "apiVersion": "1.0",
    "data": {
      "credentialId": "cred_123",
      "holderDid": "did:aura:holder",
      "issuerDid": "did:aura:issuer",
      "credentialType": "IdentityCredential",
      "verificationMethod": "Ed25519Signature2020"
    }
  }'
```

### 7. View analytics

```bash
curl http://localhost:3000/analytics | jq
```

## Option 2: Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Generate secrets

```bash
npm run generate:secret
```

### 3. Create .env file

```bash
cp .env.example .env
# Edit .env and paste the generated secrets
```

### 4. Start development server

```bash
npm run dev
```

### 5. Test webhooks

```bash
# In another terminal
npm run test:webhook
```

### 6. View analytics

```bash
curl http://localhost:3000/analytics | jq
```

## Next Steps

1. **Configure Aura Network**: Register your webhook endpoints with Aura Network
2. **Set up monitoring**: Configure alerts for failed webhooks
3. **Implement business logic**: Edit `src/services/eventHandler.ts` to add your custom logic
4. **Deploy to production**: See [README.md](README.md#deployment) for deployment guides
5. **Enable HTTPS**: Configure SSL/TLS certificates for production

## Troubleshooting

### Server won't start

```bash
# Check if port is already in use
lsof -i :3000

# Or use a different port
PORT=3001 npm run dev
```

### Webhooks return 401

This means signature verification failed. Make sure:

- The `WEBHOOK_SECRET` in your `.env` matches what Aura Network uses
- The signature is calculated correctly (see README.md for details)

### Database errors

```bash
# Reset database
rm -rf data/
# Restart server
docker-compose restart
```

## Useful Commands

```bash
# View logs
docker-compose logs -f webhook-server

# Restart server
docker-compose restart

# Stop server
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View analytics
curl http://localhost:3000/analytics | jq

# Get specific event
curl http://localhost:3000/analytics/events/<event-id> | jq

# Delete old events (requires ADMIN_API_KEY)
curl -X DELETE http://localhost:3000/analytics/events/old?days=30 \
  -H "X-API-Key: <your-admin-api-key>"
```

## Configuration Tips

### Production Settings

```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=1000
ALLOWED_IPS=<aura-network-ip-addresses>
```

### Development Settings

```env
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=10000
ALLOWED_IPS=
```

## Support

For issues and questions, see the full [README.md](README.md) or contact support.
