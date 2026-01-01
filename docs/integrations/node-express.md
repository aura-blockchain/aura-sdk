# Node.js Express Integration

Complete guide for integrating the Aura Verifier SDK into Node.js/Express applications.

## Quick Start

### Installation

```bash
npm install @aura-network/verifier-sdk express
npm install -D @types/express typescript
```

### Basic Setup

```typescript
import express from 'express';
import { AuraVerifier } from '@aura-network/verifier-sdk';

const app = express();
app.use(express.json());

const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
});

await verifier.initialize();

app.post('/verify', async (req, res) => {
  const { qrCodeData } = req.body;

  const result = await verifier.verify({ qrCodeData });

  res.json({ success: result.isValid, result });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Complete Implementation

### Project Structure

```
my-verifier-api/
├── src/
│   ├── config/
│   │   └── verifier.config.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/
│   │   ├── verification.routes.ts
│   │   └── admin.routes.ts
│   ├── services/
│   │   └── verifier.service.ts
│   └── server.ts
├── package.json
└── tsconfig.json
```

### Configuration

```typescript
// src/config/verifier.config.ts
import { AuraVerifierConfig } from '@aura-network/verifier-sdk';

export const verifierConfig: AuraVerifierConfig = {
  network: (process.env.AURA_NETWORK as any) || 'mainnet',
  timeout: parseInt(process.env.AURA_TIMEOUT || '10000'),
  verbose: process.env.NODE_ENV === 'development',
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,
    maxSize: 100,
  },
};
```

### Verifier Service

```typescript
// src/services/verifier.service.ts
import { AuraVerifier, VerificationResult } from '@aura-network/verifier-sdk';
import { verifierConfig } from '../config/verifier.config';

export class VerifierService {
  private static instance: VerifierService;
  private verifier: AuraVerifier;
  private initialized: boolean = false;

  private constructor() {
    this.verifier = new AuraVerifier(verifierConfig);
  }

  static getInstance(): VerifierService {
    if (!VerifierService.instance) {
      VerifierService.instance = new VerifierService();
    }
    return VerifierService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.verifier.initialize();
    this.setupEventHandlers();
    this.initialized = true;

    console.log('✓ Verifier service initialized');
  }

  private setupEventHandlers(): void {
    this.verifier.on('verification', (data) => {
      console.log('[VERIFICATION]', data.result.auditId, data.result.isValid);
    });

    this.verifier.on('error', (data) => {
      console.error('[ERROR]', data.error.message);
    });
  }

  async verify(qrCodeData: string): Promise<VerificationResult> {
    if (!this.initialized) {
      throw new Error('Verifier not initialized');
    }

    return await this.verifier.verify({ qrCodeData });
  }

  async verifyAge21(qrCodeData: string): Promise<boolean> {
    return await this.verifier.isAge21Plus(qrCodeData);
  }

  async destroy(): Promise<void> {
    await this.verifier.destroy();
    this.initialized = false;
  }
}
```

### Routes

```typescript
// src/routes/verification.routes.ts
import { Router } from 'express';
import { VerifierService } from '../services/verifier.service';
import { VCType } from '@aura-network/verifier-sdk';

const router = Router();
const verifierService = VerifierService.getInstance();

/**
 * POST /api/verify
 * General credential verification
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { qrCodeData, verifierAddress } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        error: 'Missing qrCodeData in request body',
      });
    }

    const result = await verifierService.verify(qrCodeData);

    res.json({
      success: result.isValid,
      data: {
        holderDID: result.holderDID,
        verifiedAt: result.verifiedAt,
        attributes: result.attributes,
        auditId: result.auditId,
        isValid: result.isValid,
        error: result.verificationError,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/verify/age/21
 * Quick age verification (21+)
 */
router.post('/verify/age/21', async (req, res, next) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({ error: 'Missing qrCodeData' });
    }

    const isOver21 = await verifierService.verifyAge21(qrCodeData);

    res.json({
      success: true,
      isOver21,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/verify/batch
 * Batch verification
 */
router.post('/verify/batch', async (req, res, next) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'requests must be an array' });
    }

    const results = await Promise.all(
      requests.map((qrCodeData) => verifierService.verify(qrCodeData))
    );

    res.json({
      success: true,
      results: results.map((r) => ({
        isValid: r.isValid,
        holderDID: r.holderDID,
        auditId: r.auditId,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Middleware

```typescript
// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import {
  QRExpiredError,
  QRParseError,
  VerificationError,
  NetworkError,
} from '@aura-network/verifier-sdk';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[ERROR]', error);

  if (error instanceof QRExpiredError) {
    return res.status(400).json({
      error: 'QR code has expired',
      code: 'QR_EXPIRED',
      details: {
        expirationTime: error.expirationTime,
      },
    });
  }

  if (error instanceof QRParseError) {
    return res.status(400).json({
      error: 'Invalid QR code format',
      code: 'QR_PARSE_ERROR',
    });
  }

  if (error instanceof VerificationError) {
    return res.status(400).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  if (error instanceof NetworkError) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      code: 'NETWORK_ERROR',
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_API_KEY',
    });
  }

  next();
}

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Implement rate limiting logic
  next();
}
```

### Main Server

```typescript
// src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import verificationRoutes from './routes/verification.routes';
import { errorHandler } from './middleware/error.middleware';
import { apiKeyAuth } from './middleware/auth.middleware';
import { VerifierService } from './services/verifier.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiKeyAuth, verificationRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Initialize verifier
    const verifierService = VerifierService.getInstance();
    await verifierService.initialize();

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const verifierService = VerifierService.getInstance();
  await verifierService.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const verifierService = VerifierService.getInstance();
  await verifierService.destroy();
  process.exit(0);
});

start();
```

## Testing

```typescript
// test/verification.test.ts
import request from 'supertest';
import app from '../src/server';

describe('Verification API', () => {
  it('POST /api/verify - should verify valid QR code', async () => {
    const response = await request(app)
      .post('/api/verify')
      .set('x-api-key', process.env.API_KEY!)
      .send({ qrCodeData: validQRCode });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isValid).toBe(true);
  });

  it('POST /api/verify - should reject invalid QR code', async () => {
    const response = await request(app)
      .post('/api/verify')
      .set('x-api-key', process.env.API_KEY!)
      .send({ qrCodeData: 'invalid' });

    expect(response.status).toBe(400);
  });

  it('POST /api/verify/age/21 - should verify age', async () => {
    const response = await request(app)
      .post('/api/verify/age/21')
      .set('x-api-key', process.env.API_KEY!)
      .send({ qrCodeData: validQRCode });

    expect(response.status).toBe(200);
    expect(response.body.isOver21).toBeDefined();
  });
});
```

## Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name aura-verifier

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

```bash
# Build and run
docker build -t aura-verifier-api .
docker run -p 3000:3000 aura-verifier-api
```

## Environment Variables

```bash
# .env
NODE_ENV=production
PORT=3000
API_KEY=your-secret-api-key

# Aura Configuration
AURA_NETWORK=mainnet
AURA_TIMEOUT=10000

# Logging
LOG_LEVEL=info
```

## Best Practices

1. **Use singleton pattern** for verifier service
2. **Implement proper error handling** with middleware
3. **Add API key authentication** for production
4. **Enable rate limiting** to prevent abuse
5. **Log all verifications** for audit trail
6. **Use environment variables** for configuration
7. **Implement graceful shutdown** to save cache
8. **Add health checks** for monitoring

## Next Steps

- [React Integration](./react.md)
- [Security Best Practices](../guides/security-best-practices.md)
- [Error Handling](../guides/error-handling.md)
