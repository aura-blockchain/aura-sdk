# Express API Server Example - Aura Verifier SDK

A production-ready REST API server for verifying Aura credentials. This example demonstrates how to build a verification service that can be integrated with existing applications.

## Features

- RESTful API endpoints for credential verification
- Batch verification support
- Age verification shortcuts (18+, 21+)
- Verified human status checks
- Comprehensive error handling
- Request logging with Morgan
- Security headers with Helmet
- CORS support
- Health check endpoint
- Graceful shutdown

## Prerequisites

- Node.js >= 18.0.0
- pnpm (or npm/yarn)

## Installation

From the repository root:

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm build
```

## Running the Server

```bash
cd examples/express-api
pnpm start
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### Development Mode

For auto-reload during development:

```bash
pnpm dev
```

### Environment Variables

```bash
PORT=3000                    # Server port (default: 3000)
AURA_NETWORK=testnet        # Network: 'mainnet' or 'testnet' (default: testnet)
TIMEOUT=10000               # Request timeout in ms (default: 10000)
NODE_ENV=development        # Environment (development/production)
```

## API Endpoints

### 1. Health Check

```bash
GET /health
```

Check if the server is running.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "network": "testnet",
  "uptime": 123.45
}
```

### 2. Main Verification

```bash
POST /verify
Content-Type: application/json

{
  "qrCodeData": "aura://verify?data=eyJ2IjoiMS4wIiwi...",
  "verifierAddress": "aura1..." (optional)
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "isValid": true,
    "holderDID": "did:aura:mainnet:abc123",
    "verifiedAt": "2025-01-15T10:30:00.000Z",
    "attributes": {
      "is_over_21": true
    },
    "vcDetails": [
      {
        "vcId": "vc_age_21_test123",
        "vcType": 3,
        "isValid": true,
        "isExpired": false,
        "isRevoked": false,
        "issuedAt": "2025-01-01T00:00:00.000Z",
        "expiresAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "auditId": "audit_xyz789",
    "verificationError": null,
    "networkLatency": 150
  }
}
```

### 3. Age 21+ Verification

```bash
POST /verify/age-21
Content-Type: application/json

{
  "qrCodeData": "aura://verify?data=..."
}
```

**Response:**

```json
{
  "success": true,
  "isOver21": true,
  "verifiedAt": "2025-01-15T10:30:00.000Z"
}
```

### 4. Age 18+ Verification

```bash
POST /verify/age-18
Content-Type: application/json

{
  "qrCodeData": "aura://verify?data=..."
}
```

**Response:**

```json
{
  "success": true,
  "isOver18": true,
  "verifiedAt": "2025-01-15T10:30:00.000Z"
}
```

### 5. Verified Human Check

```bash
POST /verify/human
Content-Type: application/json

{
  "qrCodeData": "aura://verify?data=..."
}
```

**Response:**

```json
{
  "success": true,
  "isVerifiedHuman": true,
  "verifiedAt": "2025-01-15T10:30:00.000Z"
}
```

### 6. Batch Verification

```bash
POST /verify/batch
Content-Type: application/json

{
  "verifications": [
    { "qrCodeData": "aura://verify?data=..." },
    { "qrCodeData": "aura://verify?data=..." }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "index": 0,
      "result": {
        "isValid": true,
        "holderDID": "did:aura:mainnet:abc123",
        "verifiedAt": "2025-01-15T10:30:00.000Z",
        "auditId": "audit_xyz789"
      }
    },
    {
      "success": true,
      "index": 1,
      "result": {
        "isValid": true,
        "holderDID": "did:aura:mainnet:def456",
        "verifiedAt": "2025-01-15T10:30:00.000Z",
        "auditId": "audit_abc123"
      }
    }
  ]
}
```

**Note:** Maximum 100 verifications per batch.

### 7. Credential Status

```bash
GET /credential/:vcId/status
```

**Response:**

```json
{
  "success": true,
  "vcId": "vc_age_21_test123",
  "status": {
    "isActive": true,
    "isRevoked": false,
    "isExpired": false
  },
  "checkedAt": "2025-01-15T10:30:00.000Z"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid QR code format",
  "message": "QR string must be a non-empty string",
  "code": "QR_PARSE_ERROR"
}
```

### 503 Service Unavailable

```json
{
  "success": false,
  "error": "Network error",
  "message": "Failed to connect to Aura network",
  "code": "NETWORK_ERROR"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Verify credential
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeData": "aura://verify?data=eyJ2IjoiMS4wIiwi..."
  }'

# Check age 21+
curl -X POST http://localhost:3000/verify/age-21 \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeData": "aura://verify?data=..."
  }'
```

### Using HTTPie

```bash
# Health check
http GET :3000/health

# Verify credential
http POST :3000/verify \
  qrCodeData="aura://verify?data=..."

# Check age 21+
http POST :3000/verify/age-21 \
  qrCodeData="aura://verify?data=..."
```

## Production Deployment

### Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Rate Limiting**: Add rate limiting middleware (e.g., `express-rate-limit`)
3. **Authentication**: Add API key authentication for production use
4. **Input Validation**: Already includes basic validation, consider adding more strict rules
5. **Logging**: Configure proper log rotation and monitoring

### Example with Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/verify', limiter);
```

### Example with API Key Authentication

```typescript
function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'INVALID_API_KEY',
    });
  }

  next();
}

app.use('/verify', authenticateApiKey);
```

## Integration Examples

### JavaScript/TypeScript Client

```typescript
async function verifyCredential(qrCodeData: string) {
  const response = await fetch('http://localhost:3000/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ qrCodeData }),
  });

  const data = await response.json();
  return data;
}
```

### Python Client

```python
import requests

def verify_credential(qr_code_data):
    response = requests.post(
        'http://localhost:3000/verify',
        json={'qrCodeData': qr_code_data}
    )
    return response.json()
```

## Next Steps

- Add rate limiting for production use
- Implement API key authentication
- Set up monitoring and alerting
- Configure log rotation
- Add request validation middleware
- Implement caching for frequently accessed data

## Learn More

- [Basic Node.js Example](../basic-node/)
- [CLI Tool Example](../cli-tool/)
- [Offline Mode Example](../offline-mode/)
- [SDK Documentation](../../README.md)
