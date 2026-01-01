# Aura Webhook Server

Production-ready webhook server for receiving real-time verification notifications from the Aura Network.

## Features

- **Multiple Webhook Endpoints**: Separate endpoints for verification and revocation events
- **Security**: HMAC-SHA256 signature verification, rate limiting, IP allowlisting
- **Database Storage**: SQLite database for event persistence and analytics
- **Event Processing**: Asynchronous event handling with error recovery
- **Analytics**: Query event history and view real-time statistics
- **Docker Support**: Ready-to-deploy containerized application
- **Comprehensive Logging**: Winston-based logging with file rotation
- **Health Monitoring**: Built-in health check endpoint

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Webhook Events](#webhook-events)
- [Security](#security)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
cd examples/webhook-server

# Create .env file
cp .env.example .env

# Edit .env and set your WEBHOOK_SECRET
nano .env

# Start the server
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Or build and run
npm run build
npm start
```

The server will start on `http://localhost:3000`

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Docker (optional, for containerized deployment)

### Install Dependencies

```bash
npm install
```

### Build TypeScript

```bash
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `WEBHOOK_SECRET` | Secret key for signature verification | **Required** |
| `DATABASE_PATH` | Path to SQLite database | `./data/webhooks.db` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `ALLOWED_IPS` | Comma-separated allowed IPs | (all allowed) |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `LOG_FILE_PATH` | Path to log file | `./logs/webhook-server.log` |
| `ADMIN_API_KEY` | API key for admin operations | (optional) |

### Generate Webhook Secret

To generate a secure webhook secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Endpoints

### Health Check

```http
GET /health
```

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

### Webhook Endpoints

#### Verification Events

```http
POST /webhooks/verification
```

Receives verification success/failure and age verification events.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

**Response:**
```json
{
  "success": true,
  "message": "Webhook received",
  "eventId": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Revocation Events

```http
POST /webhooks/revocation
```

Receives credential revocation and expiration events.

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`

### Analytics Endpoints

#### Overview

```http
GET /analytics
GET /analytics?since=2024-01-01T00:00:00Z
```

Get overall webhook analytics.

**Response:**
```json
{
  "totalEvents": 1234,
  "eventsByType": {
    "VERIFICATION_SUCCESS": 800,
    "VERIFICATION_FAILED": 234,
    "CREDENTIAL_REVOKED": 100,
    "CREDENTIAL_EXPIRED": 50,
    "AGE_VERIFICATION_PASSED": 40,
    "AGE_VERIFICATION_FAILED": 10
  },
  "successRate": 95.5,
  "averageProcessingTime": 45.2,
  "recentEvents": [...]
}
```

#### Get Event by ID

```http
GET /analytics/events/:id
```

Retrieve a specific event by its ID.

#### Get Events by Type

```http
GET /analytics/events/type/:eventType?limit=100
```

Retrieve events of a specific type.

**Valid Event Types:**
- `VERIFICATION_SUCCESS`
- `VERIFICATION_FAILED`
- `CREDENTIAL_REVOKED`
- `CREDENTIAL_EXPIRED`
- `AGE_VERIFICATION_PASSED`
- `AGE_VERIFICATION_FAILED`

#### Get Recent Events

```http
GET /analytics/events/recent?limit=100
```

Retrieve most recent events.

#### Delete Old Events

```http
DELETE /analytics/events/old?days=30
```

Delete events older than specified days. Requires `X-API-Key` header.

## Webhook Events

### Event Structure

All webhook events follow this base structure:

```typescript
{
  id: string;           // UUID
  timestamp: string;    // ISO 8601 datetime
  eventType: string;    // Event type enum
  apiVersion: string;   // API version (default: "1.0")
  data: object;         // Event-specific data
}
```

### Event Types

#### 1. VERIFICATION_SUCCESS

Sent when a credential is successfully verified.

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "eventType": "VERIFICATION_SUCCESS",
  "apiVersion": "1.0",
  "data": {
    "credentialId": "cred_123456",
    "holderDid": "did:aura:holder123",
    "issuerDid": "did:aura:issuer456",
    "credentialType": "IdentityCredential",
    "verificationMethod": "Ed25519Signature2020",
    "metadata": {
      "customField": "value"
    }
  }
}
```

#### 2. VERIFICATION_FAILED

Sent when credential verification fails.

```json
{
  "id": "223e4567-e89b-12d3-a456-426614174001",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "eventType": "VERIFICATION_FAILED",
  "apiVersion": "1.0",
  "data": {
    "credentialId": "cred_123456",
    "holderDid": "did:aura:holder123",
    "reason": "Signature verification failed",
    "errorCode": "INVALID_SIGNATURE",
    "metadata": {}
  }
}
```

#### 3. CREDENTIAL_REVOKED

Sent when a credential is revoked.

```json
{
  "id": "323e4567-e89b-12d3-a456-426614174002",
  "timestamp": "2024-01-15T10:32:00.000Z",
  "eventType": "CREDENTIAL_REVOKED",
  "apiVersion": "1.0",
  "data": {
    "credentialId": "cred_123456",
    "holderDid": "did:aura:holder123",
    "issuerDid": "did:aura:issuer456",
    "revokedAt": "2024-01-15T10:32:00.000Z",
    "reason": "User requested revocation",
    "metadata": {}
  }
}
```

#### 4. CREDENTIAL_EXPIRED

Sent when a credential expires.

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174003",
  "timestamp": "2024-01-15T10:33:00.000Z",
  "eventType": "CREDENTIAL_EXPIRED",
  "apiVersion": "1.0",
  "data": {
    "credentialId": "cred_123456",
    "holderDid": "did:aura:holder123",
    "issuerDid": "did:aura:issuer456",
    "expiredAt": "2024-01-15T00:00:00.000Z",
    "metadata": {}
  }
}
```

#### 5. AGE_VERIFICATION_PASSED

Sent when age verification succeeds.

```json
{
  "id": "523e4567-e89b-12d3-a456-426614174004",
  "timestamp": "2024-01-15T10:34:00.000Z",
  "eventType": "AGE_VERIFICATION_PASSED",
  "apiVersion": "1.0",
  "data": {
    "credentialId": "cred_123456",
    "holderDid": "did:aura:holder123",
    "minimumAge": 18,
    "verifiedAge": 25,
    "metadata": {}
  }
}
```

#### 6. AGE_VERIFICATION_FAILED

Sent when age verification fails.

```json
{
  "id": "623e4567-e89b-12d3-a456-426614174005",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "eventType": "AGE_VERIFICATION_FAILED",
  "apiVersion": "1.0",
  "data": {
    "credentialId": "cred_123456",
    "holderDid": "did:aura:holder123",
    "minimumAge": 21,
    "reason": "Age below minimum required",
    "metadata": {}
  }
}
```

## Security

### Webhook Signature Verification

All webhook requests are signed using HMAC-SHA256. The signature is included in the `X-Webhook-Signature` header.

#### Signature Format

```
X-Webhook-Signature: sha256=<hex_signature>
```

#### Verification Process

The server verifies signatures using the following algorithm:

```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

#### Testing Webhooks

Generate test signatures:

```bash
# Using Node.js
node -e "
const crypto = require('crypto');
const payload = JSON.stringify({id: 'test', timestamp: new Date().toISOString()});
const secret = 'your-webhook-secret';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Signature:', 'sha256=' + signature);
"
```

Or use the included test script:

```bash
npm run test:webhook
```

### Rate Limiting

The server implements rate limiting to prevent abuse:

- Default: 100 requests per 15 minutes per IP
- Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`
- Returns HTTP 429 when limit exceeded

### IP Allowlisting

Restrict webhook requests to specific IP addresses:

```env
ALLOWED_IPS=192.168.1.100,10.0.0.50,172.16.0.1
```

Leave empty to allow all IPs (development only).

### Best Practices

1. **Always use HTTPS** in production
2. **Rotate webhook secrets** periodically
3. **Implement IP allowlisting** for production
4. **Monitor failed verification attempts**
5. **Use strong ADMIN_API_KEY** for destructive operations
6. **Enable firewall rules** to restrict access
7. **Regular security audits** of logs and analytics

## Deployment

### Docker Deployment

#### Basic Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f webhook-server

# Stop
docker-compose down
```

#### Production Deployment

1. **Configure environment variables:**

```bash
# Create production .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ALLOWED_IPS=<aura-network-ips>
LOG_LEVEL=info
EOF
```

2. **Deploy with Docker Compose:**

```bash
docker-compose up -d
```

3. **Configure reverse proxy (nginx/Caddy):**

```nginx
server {
    listen 443 ssl http2;
    server_name webhooks.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Cloud Deployment

#### AWS ECS

```bash
# Build and push to ECR
docker build -t webhook-server .
docker tag webhook-server:latest <account-id>.dkr.ecr.<region>.amazonaws.com/webhook-server:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/webhook-server:latest
```

#### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/<project-id>/webhook-server
gcloud run deploy webhook-server \
  --image gcr.io/<project-id>/webhook-server \
  --platform managed \
  --region us-central1 \
  --set-env-vars WEBHOOK_SECRET=<secret>
```

#### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webhook-server
  template:
    metadata:
      labels:
        app: webhook-server
    spec:
      containers:
      - name: webhook-server
        image: webhook-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: webhook-secrets
              key: webhook-secret
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: webhook-data-pvc
```

## Development

### Project Structure

```
webhook-server/
├── src/
│   ├── index.ts              # Main application entry
│   ├── routes/
│   │   ├── webhooks.ts       # Webhook endpoints
│   │   └── analytics.ts      # Analytics endpoints
│   ├── middleware/
│   │   ├── validateSignature.ts  # Signature verification
│   │   └── ipAllowlist.ts        # IP filtering
│   ├── services/
│   │   ├── database.ts       # Database operations
│   │   └── eventHandler.ts   # Event processing
│   ├── types/
│   │   └── webhook.ts        # TypeScript types
│   └── utils/
│       ├── crypto.ts         # Cryptographic utilities
│       └── logger.ts         # Logging utilities
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

### Database Migrations

```bash
npm run db:migrate
```

## Troubleshooting

### Common Issues

#### 1. Signature Verification Fails

**Problem:** All webhooks return 401 Unauthorized

**Solution:**
- Verify `WEBHOOK_SECRET` matches the secret used by Aura Network
- Check that raw body is being captured correctly
- Ensure no middleware modifies the request body before verification

#### 2. Database Locked

**Problem:** `SQLITE_BUSY` errors

**Solution:**
- Enable WAL mode (enabled by default)
- Increase timeout: `db.pragma('busy_timeout = 5000')`
- Reduce concurrent write operations

#### 3. Rate Limit Issues

**Problem:** Legitimate requests being blocked

**Solution:**
- Increase `RATE_LIMIT_MAX_REQUESTS`
- Extend `RATE_LIMIT_WINDOW_MS`
- Implement per-user rate limiting instead of per-IP

#### 4. Memory Issues

**Problem:** Server crashes with OOM errors

**Solution:**
- Implement event cleanup: `DELETE FROM webhook_events WHERE created_at < datetime('now', '-30 days')`
- Use pagination for analytics queries
- Increase container memory limits

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Viewing Logs

```bash
# Docker
docker-compose logs -f

# Local
tail -f logs/webhook-server.log
```

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [https://github.com/aura-network/aura-verifier-sdk/issues](https://github.com/aura-network/aura-verifier-sdk/issues)
- Documentation: [https://docs.aura.network](https://docs.aura.network)
