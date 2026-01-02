# Security Best Practices

Essential security guidelines for integrating the Aura Verifier SDK.

## Core Security Principles

### 1. Never Trust, Always Verify

Always verify credentials cryptographically - never accept claims without verification:

```typescript
// Good: Verify before trusting
const result = await verifier.verify({ qrCodeData });
if (result.isValid && result.signatureValid) {
  grantAccess(result.holderDID);
}

// Bad: Trust without verification
const qrData = JSON.parse(Buffer.from(qrBase64, 'base64').toString());
if (qrData.age_over_21) {
  grantAccess(); // NEVER DO THIS
}
```

### 2. Validate All Inputs

Sanitize and validate all inputs before processing:

```typescript
import { parseQRCodeSafe, isValidHex } from '@aura-network/verifier-sdk';

async function safeVerify(qrCodeData: string) {
  // 1. Validate input
  if (!qrCodeData || typeof qrCodeData !== 'string') {
    throw new Error('Invalid input');
  }

  if (qrCodeData.length > 10000) {
    throw new Error('QR code too large');
  }

  // 2. Safe parse
  const parseResult = parseQRCodeSafe(qrCodeData);
  if (!parseResult.success) {
    throw new Error('Parse failed');
  }

  // 3. Verify
  return await verifier.verify({ qrCodeData });
}
```

### 3. Minimize Data Exposure

Only request and store the minimum data needed:

```typescript
// Good: Only check age threshold
if (result.attributes.ageOver21) {
  // We know they're 21+, don't need exact age
  grantAccess();
}

// Bad: Storing unnecessary data
database.save({
  fullName: result.attributes.fullName, // Don't store if not needed
  fullAddress: result.attributes.fullAddress,
  age: result.attributes.age,
});

// Better: Only store audit trail
database.save({
  auditId: result.auditId,
  holderDID: result.holderDID, // Pseudonymous identifier
  timestamp: result.verifiedAt,
  verified: result.isValid,
});
```

## Cryptographic Security

### Signature Verification

Always verify cryptographic signatures:

```typescript
const result = await verifier.verify({ qrCodeData });

// Check signature validity
if (!result.signatureValid) {
  throw new Error('Invalid signature - possible tampering');
}

// Check credential status
for (const vc of result.vcDetails) {
  if (!vc.signatureValid) {
    throw new Error('Invalid credential signature');
  }
}
```

### Replay Attack Prevention

Implement nonce tracking to prevent QR code reuse:

```typescript
const usedNonces = new Set<string>();

async function verifyWithReplayProtection(qrCodeData: string) {
  const result = await verifier.verify({ qrCodeData });

  // Extract nonce from QR data
  const qrData = parseQRCode(qrCodeData);
  const nonce = `${qrData.n}-${qrData.h}`;

  // Check if nonce was used
  if (usedNonces.has(nonce)) {
    throw new Error('QR code already used - replay attack detected');
  }

  // Mark nonce as used
  usedNonces.add(nonce);

  // Clean up old nonces periodically
  setTimeout(() => usedNonces.delete(nonce), 600000); // 10 minutes

  return result;
}
```

### Expiration Enforcement

Strictly enforce QR code expiration:

```typescript
const result = await verifier.verify({ qrCodeData });

// Check expiration
const now = new Date();
if (result.expiresAt < now) {
  throw new Error('QR code expired');
}

// Check if expiring soon
const expiresIn = result.expiresAt.getTime() - now.getTime();
if (expiresIn < 60000) { // Less than 1 minute
  console.warn('QR code expiring soon');
}
```

## Network Security

### API Key Protection

Protect API keys and secrets:

```typescript
// Good: Environment variables
const verifier = new AuraVerifier({
  network: process.env.AURA_NETWORK as NetworkType,
  grpcEndpoint: process.env.AURA_GRPC_ENDPOINT,
});

// Bad: Hardcoded secrets
const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: 'my-secret-node.com:9090', // DON'T COMMIT THIS
});
```

### TLS/HTTPS Only

Always use encrypted connections:

```typescript
// Good: HTTPS endpoints
const verifier = new AuraVerifier({
  network: 'mainnet',
  restEndpoint: 'https://api.aurablockchain.org', // HTTPS
});

// Bad: HTTP in production
const verifier = new AuraVerifier({
  network: 'mainnet',
  restEndpoint: 'http://api.aurablockchain.org', // NEVER IN PRODUCTION
});
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many verification requests',
});

app.use('/api/verify', limiter);
```

## Data Protection

### Encryption at Rest

Encrypt cached credentials:

```typescript
import { generateEncryptionKey } from '@aura-network/verifier-sdk';

// Generate encryption key (store securely!)
const key = await generateEncryptionKey();

const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    encryptionKey: key.toString('hex'),
    storageLocation: './encrypted-cache',
  },
});
```

### Secure Logging

Never log sensitive information:

```typescript
// Good: Log audit IDs and status
console.log('Verification:', {
  auditId: result.auditId,
  isValid: result.isValid,
  method: result.verificationMethod,
});

// Bad: Log personal data
console.log('Verification:', {
  fullName: result.attributes.fullName, // DON'T LOG
  address: result.attributes.fullAddress, // DON'T LOG
  qrCode: qrCodeData, // DON'T LOG
});
```

### Sanitize Error Messages

Don't expose internal details in errors:

```typescript
try {
  const result = await verifier.verify({ qrCodeData });
} catch (error) {
  // Good: Generic message
  res.status(400).json({
    error: 'Verification failed',
    code: 'VERIFICATION_ERROR',
  });

  // Bad: Exposes internals
  res.status(400).json({
    error: error.message, // May expose sensitive info
    stack: error.stack, // NEVER expose stack traces
  });
}
```

## Access Control

### Authentication

Require authentication for verification endpoints:

```typescript
import jwt from 'jsonwebtoken';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.use('/api/verify', authMiddleware);
```

### Role-Based Access Control

Implement proper authorization:

```typescript
function requireRole(role: string) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Only admins can access admin endpoints
app.use('/api/admin', requireRole('admin'));
```

## Compliance

### GDPR Compliance

Implement data minimization and user rights:

```typescript
// Only collect necessary data
const auditLog = {
  auditId: result.auditId,
  holderDID: result.holderDID, // Pseudonymous
  timestamp: result.verifiedAt,
  verified: result.isValid,
  // NO personal information (name, address, etc.)
};

// Implement data deletion
app.delete('/api/user/:did/data', async (req, res) => {
  const { did } = req.params;

  // Delete all data associated with DID
  await database.deleteByDID(did);

  res.json({ success: true });
});
```

### Audit Logging

Maintain comprehensive audit trails:

```typescript
interface AuditLog {
  auditId: string;
  timestamp: Date;
  action: string;
  holderDID: string;
  verifierID: string;
  result: 'approved' | 'denied';
  reason?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

async function logAudit(log: AuditLog) {
  // Write to append-only log
  await auditLogger.append(log);

  // Send to SIEM system
  await sendToSIEM(log);

  // Archive old logs
  await archiveOldLogs();
}
```

## Operational Security

### Environment Separation

Use different configurations for each environment:

```typescript
const configs = {
  development: {
    network: 'testnet' as const,
    verbose: true,
    // Relaxed security for dev
  },
  production: {
    network: 'mainnet' as const,
    verbose: false,
    timeout: 10000,
    // Strict security for prod
  },
};

const env = process.env.NODE_ENV || 'development';
const verifier = new AuraVerifier(configs[env]);
```

### Secret Management

Use secret management systems:

```typescript
// Good: Secret manager
import { getSecret } from './secrets';

const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: await getSecret('AURA_GRPC_ENDPOINT'),
});

// Bad: Environment variables in code
const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: process.env.AURA_GRPC_ENDPOINT || 'default', // Unsafe
});
```

### Monitoring and Alerting

Implement security monitoring:

```typescript
// Monitor for suspicious patterns
verifier.on('verification', (data) => {
  // Alert on high failure rate
  const failureRate = getRecentFailureRate();
  if (failureRate > 0.5) {
    alertSecurity('High failure rate detected');
  }

  // Alert on unusual patterns
  if (isUnusualPattern(data)) {
    alertSecurity('Unusual verification pattern', data);
  }
});

// Alert on errors
verifier.on('error', (data) => {
  alertOps('Verifier error', {
    error: data.error.message,
    context: data.context,
  });
});
```

## Vulnerability Prevention

### Input Validation

Prevent injection attacks:

```typescript
function validateInput(input: string): boolean {
  // Check length
  if (input.length > 10000) return false;

  // Check for suspicious patterns
  if (/<script>|javascript:|data:/i.test(input)) return false;

  // Validate format
  if (!input.startsWith('aura://verify?data=')) return false;

  return true;
}

app.post('/verify', (req, res) => {
  if (!validateInput(req.body.qrCodeData)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Proceed with verification
});
```

### Dependency Security

Keep dependencies updated:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Use lock files
npm ci
```

### Error Handling

Handle errors securely:

```typescript
try {
  const result = await verifier.verify({ qrCodeData });
  // Process result
} catch (error) {
  // Log internally with full details
  logger.error('Verification failed', {
    error: error.message,
    stack: error.stack,
    context: { qrCodeData },
  });

  // Return generic error to client
  res.status(400).json({
    error: 'Verification failed',
    code: 'VERIFICATION_ERROR',
  });
}
```

## Checklist

Before deploying to production:

- [ ] All secrets in environment variables or secret manager
- [ ] HTTPS/TLS enabled on all endpoints
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error messages sanitized
- [ ] Logging doesn't include personal data
- [ ] Authentication and authorization implemented
- [ ] Nonce tracking for replay protection
- [ ] Signature verification enabled
- [ ] Cache encrypted if storing credentials
- [ ] Audit logging implemented
- [ ] Monitoring and alerting configured
- [ ] Dependencies updated and scanned
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Graceful error handling
- [ ] Regular security audits scheduled

## Security Contacts

Report security vulnerabilities to:
- Email: security@aurablockchain.org
- Bug Bounty: https://docs.aurablockchain.org/security

## Next Steps

- [Error Handling Guide](./error-handling.md)
- [Compliance Guide](./compliance.md)
- [Troubleshooting](../troubleshooting.md)
