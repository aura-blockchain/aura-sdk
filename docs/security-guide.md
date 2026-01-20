# Security Guide

Comprehensive security guide for deploying the Aura Verifier SDK in production environments.

## Table of Contents

- [Security Overview](#security-overview)
- [Threat Model](#threat-model)
- [Security Features](#security-features)
- [Rate Limiting](#rate-limiting)
- [Nonce Management](#nonce-management)
- [Audit Logging](#audit-logging)
- [Threat Detection](#threat-detection)
- [Input Sanitization](#input-sanitization)
- [Encryption](#encryption)
- [Best Practices](#best-practices)
- [Compliance](#compliance)

---

## Security Overview

The Aura Verifier SDK provides enterprise-grade security features to protect your verification infrastructure from common attacks and ensure compliance with security standards.

### Key Security Principles

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimal permissions and access
3. **Fail Secure** - Secure defaults and safe failure modes
4. **Auditability** - Comprehensive logging and monitoring
5. **Privacy by Design** - Minimize data collection and storage

---

## Threat Model

### Threats Addressed

| Threat             | Mitigation                               |
| ------------------ | ---------------------------------------- |
| Replay Attacks     | Nonce tracking with time windows         |
| Brute Force        | Rate limiting and threat detection       |
| QR Code Injection  | Input sanitization and validation        |
| Man-in-the-Middle  | Cryptographic signature verification     |
| Credential Forgery | On-chain verification and DID resolution |
| Denial of Service  | Rate limiting and burst protection       |
| Data Tampering     | Audit log chaining and integrity checks  |

### Out of Scope

- Network-level DDoS (use CDN/WAF)
- Database security (use encrypted databases)
- Infrastructure security (use secure hosting)
- Key management (use HSM/KMS for production keys)

---

## Security Features

### Complete Security Setup

Use `createSecureVerifier()` to enable all security features:

```typescript
import { createSecureVerifier } from '@aura-network/verifier-sdk';

const secureContext = createSecureVerifier({
  enableNonceTracking: true,
  enableRateLimiting: true,
  enableAuditLogging: true,
  enableThreatDetection: true,
  enableInputSanitization: true,

  nonceConfig: {
    nonceWindow: 300000, // 5 minutes
    cleanupInterval: 60000,
  },

  rateLimitConfig: {
    maxRequests: 100,
    windowMs: 60000,
    burstCapacity: 120,
  },

  auditConfig: {
    enableChaining: true,
    bufferSize: 1000,
    flushInterval: 5000,
  },

  threatConfig: {
    maxRequestsPerWindow: 50,
    rapidRequestWindow: 10000,
    maxFailedAttempts: 5,
    onThreatDetected: async (event) => {
      // Alert security team
      console.error('Security threat detected:', event);
      // Block IP, send alert, etc.
    },
  },

  sanitizerConfig: {
    maxStringLength: 10000,
    strictMode: true,
  },
});
```

---

## Rate Limiting

Protect against abuse and brute force attacks.

### Basic Rate Limiting

```typescript
import { RateLimiter } from '@aura-network/verifier-sdk';

const limiter = new RateLimiter({
  maxRequests: 100, // Max requests per window
  windowMs: 60000, // 1 minute window
  burstCapacity: 120, // Allow bursts up to 120
});

// Before processing request
const identifier = req.ip || req.headers['x-forwarded-for'] || 'default';
const allowed = await limiter.checkLimit(identifier);

if (!allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded. Please try again later.',
  });
}

// Process request...
```

### Multi-Tier Rate Limiting

Different limits for different user tiers:

```typescript
import { MultiTierRateLimiter } from '@aura-network/verifier-sdk';

const limiter = new MultiTierRateLimiter({
  tiers: {
    free: { maxRequests: 50, windowMs: 60000 },
    premium: { maxRequests: 500, windowMs: 60000 },
    enterprise: { maxRequests: 5000, windowMs: 60000 },
  },
});

// Check limit based on user tier
const userTier = getUserTier(userId);
const allowed = await limiter.checkLimit(userId, userTier);
```

### Rate Limiting Best Practices

1. **Identifier Strategy**

   - Use IP address for anonymous users
   - Use user ID for authenticated users
   - Consider using both for defense in depth

2. **Response Headers**

   ```typescript
   const remaining = await limiter.getRemainingRequests(identifier);
   res.setHeader('X-RateLimit-Limit', '100');
   res.setHeader('X-RateLimit-Remaining', remaining.toString());
   res.setHeader('X-RateLimit-Reset', Date.now() + 60000);
   ```

3. **Graceful Degradation**
   - Return 429 status code
   - Include Retry-After header
   - Provide clear error messages

---

## Nonce Management

Prevent replay attacks with time-based nonce tracking.

### Basic Nonce Validation

```typescript
import { NonceManager } from '@aura-network/verifier-sdk';

const nonceManager = new NonceManager({
  nonceWindow: 300000, // 5 minute window
  cleanupInterval: 60000, // Cleanup every minute
});

// Validate nonce from QR code
const qrData = parseQRCode(qrString);
const isValid = await nonceManager.validateNonce(qrData.n.toString(), qrData.exp * 1000);

if (!isValid) {
  throw new Error('Invalid or replayed nonce');
}

// Process verification...
```

### Nonce Strategies

#### Time-Window Based (Recommended)

```typescript
const nonceManager = new NonceManager({
  nonceWindow: 300000, // 5 minutes
});

// Nonces are valid within the time window
// Automatically cleaned up after expiration
```

#### Bloom Filter Storage

For high-volume scenarios:

```typescript
import { BloomFilterNonceStorage } from '@aura-network/verifier-sdk';

const storage = new BloomFilterNonceStorage({
  expectedElements: 1000000,
  falsePositiveRate: 0.001,
});

const nonceManager = new NonceManager({
  nonceWindow: 300000,
  storage,
});
```

### Nonce Best Practices

1. **Appropriate Window Size**

   - Too short: UX issues (QR expires too fast)
   - Too long: Security risk (larger replay window)
   - Recommended: 5-10 minutes

2. **Cleanup Strategy**

   - Regular cleanup to prevent memory growth
   - Balance cleanup frequency vs. performance

3. **Expiration Handling**
   - Validate QR expiration (`exp` field)
   - Reject expired QR codes immediately

---

## Audit Logging

Maintain tamper-evident audit trails for compliance and security monitoring.

### Basic Audit Logging

```typescript
import { AuditLogger, AuditOutcome } from '@aura-network/verifier-sdk';

const logger = new AuditLogger({
  enableChaining: true, // Tamper-evident log chain
  bufferSize: 1000,
  flushInterval: 5000,
});

// Log verification attempt
await logger.logVerificationAttempt({
  actor: verifierDID,
  target: holderDID,
  outcome: result.isValid ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
  details: {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    vcTypes: result.vcDetails.map((vc) => vc.vcType),
    timestamp: new Date(),
  },
});

// Log access
await logger.logAccess({
  actor: userId,
  resource: 'verification-api',
  action: 'verify_credential',
});
```

### Querying Audit Logs

```typescript
// Get logs for specific time period
const logs = await logger.getLogs({
  startTime: new Date('2025-01-01'),
  endTime: new Date('2025-01-31'),
  actor: 'did:aura:verifier123',
});

// Analyze logs
logs.forEach((log) => {
  console.log(`[${log.timestamp}] ${log.actor} -> ${log.target}: ${log.outcome}`);
});

// Export for compliance
const exportData = logs.map((log) => ({
  timestamp: log.timestamp.toISOString(),
  actor: log.actor,
  action: log.action,
  outcome: log.outcome,
  details: log.details,
}));
```

### Audit Log Storage

#### In-Memory (Development)

```typescript
import { InMemoryAuditLogStorage } from '@aura-network/verifier-sdk';

const storage = new InMemoryAuditLogStorage();
const logger = new AuditLogger({ storage });
```

#### Database Storage (Production)

```typescript
class DatabaseAuditStorage implements AuditLogStorage {
  async append(entry: AuditLogEntry): Promise<void> {
    await db.auditLogs.create({
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      outcome: entry.outcome,
      category: entry.category,
      details: JSON.stringify(entry.details),
      hash: entry.hash,
      previousHash: entry.previousHash,
    });
  }

  async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    const logs = await db.auditLogs.findMany({
      where: {
        timestamp: {
          gte: filter.startTime,
          lte: filter.endTime,
        },
        actor: filter.actor,
        category: filter.category,
      },
    });

    return logs.map((log) => ({
      timestamp: log.timestamp,
      actor: log.actor,
      action: log.action,
      outcome: log.outcome,
      category: log.category,
      details: JSON.parse(log.details),
      hash: log.hash,
      previousHash: log.previousHash,
    }));
  }
}

const logger = new AuditLogger({
  storage: new DatabaseAuditStorage(),
  enableChaining: true,
});
```

---

## Threat Detection

Behavioral analysis to identify and respond to suspicious activity.

### Basic Threat Detection

```typescript
import { ThreatDetector, ThreatLevel } from '@aura-network/verifier-sdk';

const detector = new ThreatDetector({
  maxRequestsPerWindow: 50,
  rapidRequestWindow: 10000,
  maxFailedAttempts: 5,
  onThreatDetected: async (event) => {
    console.error('Threat detected:', {
      identifier: event.identifier,
      level: event.level,
      reason: event.reason,
      metadata: event.metadata,
    });

    // Take action based on threat level
    if (event.level === ThreatLevel.CRITICAL) {
      await blockIdentifier(event.identifier);
      await alertSecurityTeam(event);
    }
  },
});

// Record requests
await detector.recordRequest(identifier, {
  ip: req.ip,
  endpoint: req.path,
});

// Record failures
if (!result.isValid) {
  await detector.recordFailure(identifier, 'verification_failed');
}

// Check threat level
const level = await detector.getThreatLevel(identifier);
if (level === ThreatLevel.HIGH || level === ThreatLevel.CRITICAL) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Threat Levels

| Level    | Criteria            | Action                  |
| -------- | ------------------- | ----------------------- |
| LOW      | Normal activity     | Monitor                 |
| MEDIUM   | Elevated activity   | Log warning             |
| HIGH     | Suspicious patterns | Rate limit aggressively |
| CRITICAL | Confirmed attack    | Block immediately       |

### Custom Threat Detection Rules

```typescript
const detector = new ThreatDetector({
  customRules: [
    {
      name: 'rapid_failures',
      check: (history) => {
        const recentFailures = history.filter(
          (e) => e.type === 'failure' && Date.now() - e.timestamp < 60000
        );
        return recentFailures.length > 10;
      },
      level: ThreatLevel.HIGH,
    },
    {
      name: 'geographic_anomaly',
      check: (history, metadata) => {
        // Check for suspicious geographic patterns
        const countries = history.map((e) => e.metadata?.country);
        const uniqueCountries = new Set(countries);
        return uniqueCountries.size > 5; // 5+ countries in short time
      },
      level: ThreatLevel.MEDIUM,
    },
  ],
});
```

---

## Input Sanitization

Prevent injection attacks and validate all external input.

### Basic Input Sanitization

```typescript
import { InputSanitizer, defaultSanitizer } from '@aura-network/verifier-sdk';

const sanitizer = new InputSanitizer({
  maxStringLength: 10000,
  strictMode: true,
});

// Sanitize QR code input
const sanitizedQR = sanitizer.sanitizeQRInput(qrString);

// Sanitize DID
const sanitizedDID = sanitizer.sanitizeDID(didString);

// Sanitize arbitrary user input
const sanitizedInput = sanitizer.sanitizeString(userInput);
```

### Built-in Sanitizers

```typescript
import { defaultSanitizer } from '@aura-network/verifier-sdk';

// QR code validation
const qr = defaultSanitizer.sanitizeQRInput(input);

// DID validation
const did = defaultSanitizer.sanitizeDID(input);

// Hex string validation
const hex = defaultSanitizer.sanitizeHex(input);

// Base64 validation
const b64 = defaultSanitizer.sanitizeBase64(input);

// URL validation
const url = defaultSanitizer.sanitizeURL(input);
```

### Custom Validation Rules

```typescript
const sanitizer = new InputSanitizer({
  customValidators: {
    vcId: (value: string): boolean => {
      // Custom VC ID validation
      return /^vc-[a-f0-9]{64}$/i.test(value);
    },
    presentationId: (value: string): boolean => {
      // Custom presentation ID validation
      return /^pres-[a-f0-9]{32}$/i.test(value);
    },
  },
});
```

---

## Encryption

Protect sensitive data at rest and in transit.

### Encrypt Cached Credentials

```typescript
import {
  generateEncryptionKey,
  encryptObject,
  decryptObject
} from '@aura-network/verifier-sdk';

// Generate encryption key
const key = generateEncryptionKey();

// Encrypt credential before caching
const credential = { vcId: 'vc123', data: {...} };
const encrypted = await encryptObject(credential, key);

// Store encrypted data
await cache.set('vc123', encrypted);

// Decrypt when retrieving
const retrieved = await cache.get('vc123');
const decrypted = await decryptObject(retrieved, key);
```

### Key Derivation from Password

```typescript
import { deriveKeyFromPassword, encryptString, decryptString } from '@aura-network/verifier-sdk';

// Derive key from password
const password = 'user-password';
const salt = crypto.randomBytes(32);
const key = await deriveKeyFromPassword(password, salt, 100000);

// Encrypt sensitive data
const encrypted = await encryptString('sensitive-data', key);

// Store encrypted data...

// Decrypt later
const decrypted = await decryptString(encrypted, key);
```

### Key Rotation

```typescript
import { KeyRotationManager } from '@aura-network/verifier-sdk';

const keyManager = new KeyRotationManager({
  rotationInterval: 86400000, // 24 hours
  keyDerivationIterations: 100000,
});

// Get current key
const currentKey = await keyManager.getCurrentKey();

// Encrypt with current key
const encrypted = await encryptObject(data, currentKey);

// Rotate keys (automatically re-encrypts data)
await keyManager.rotateKeys();
```

---

## Best Practices

### 1. Secure Configuration

```typescript
// Production configuration
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
  verbose: false, // Disable verbose logging
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,
    storageLocation: process.env.CACHE_DIR,
    encryptionKey: process.env.ENCRYPTION_KEY, // Use env variables
  },
});
```

### 2. Secrets Management

```bash
# Use environment variables
export ENCRYPTION_KEY="your-hex-key"
export VERIFIER_DID="did:aura:verifier123"
export RPC_ENDPOINT="https://rpc.aurablockchain.org"

# Or use a secrets manager
export ENCRYPTION_KEY=$(aws secretsmanager get-secret-value --secret-id aura-encryption-key --query SecretString --output text)
```

### 3. Network Security

```typescript
// Use HTTPS endpoints only
const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: 'grpcs://rpc.aurablockchain.org:9090', // TLS
  restEndpoint: 'https://api.aurablockchain.org', // HTTPS
});
```

### 4. Error Handling

```typescript
// Don't leak sensitive information in errors
try {
  const result = await verifier.verify({ qrCodeData });
} catch (error) {
  // Log detailed error internally
  logger.error('Verification failed', { error, qrCodeData });

  // Return generic error to client
  res.status(400).json({
    error: 'Verification failed. Please try again.',
  });
}
```

### 5. Monitoring and Alerting

```typescript
// Monitor security events
verifier.on('error', async (data) => {
  if (data.error.code === 'RATE_LIMIT_EXCEEDED') {
    await alertSecurityTeam('Rate limit exceeded', data);
  }
});

// Monitor suspicious patterns
setInterval(async () => {
  const logs = await auditLogger.getLogs({
    startTime: new Date(Date.now() - 3600000), // Last hour
    outcome: AuditOutcome.FAILURE,
  });

  const failureRate = logs.length / totalRequests;
  if (failureRate > 0.5) {
    // >50% failure rate
    await alertSecurityTeam('High failure rate detected');
  }
}, 300000); // Every 5 minutes
```

### 6. Regular Security Updates

```bash
# Keep dependencies updated
npm audit
npm update @aura-network/verifier-sdk

# Review security advisories
npm audit fix
```

---

## Compliance

### GDPR Compliance

1. **Data Minimization**

   ```typescript
   // Only request necessary attributes
   const result = await verifier.verify({
     qrCodeData,
     requiredDisclosures: {
       show_age_over_21: true, // Only age, not full DOB
     },
   });
   ```

2. **Data Retention**

   ```typescript
   // Clear cache after retention period
   setInterval(async () => {
     await cache.clear();
   }, 86400000); // 24 hours
   ```

3. **Audit Trail**
   ```typescript
   // Maintain audit logs
   await auditLogger.logVerificationAttempt({
     actor: verifierDID,
     target: holderDID,
     outcome: AuditOutcome.SUCCESS,
     details: { purpose: 'age_verification' },
   });
   ```

### SOC 2 Compliance

1. **Access Controls**: Rate limiting and authentication
2. **Audit Logging**: Comprehensive tamper-evident logs
3. **Encryption**: Data encryption at rest and in transit
4. **Monitoring**: Real-time threat detection and alerting

### HIPAA Compliance (if applicable)

1. **Encryption**: All PHI encrypted at rest and in transit
2. **Audit Trails**: Complete audit logs with integrity checks
3. **Access Controls**: Role-based access and authentication
4. **Data Retention**: Automated data purging

---

## Security Checklist

### Development

- [ ] Enable verbose logging
- [ ] Use testnet for testing
- [ ] Never commit secrets to version control
- [ ] Use environment variables for configuration
- [ ] Implement comprehensive error handling

### Staging

- [ ] Test rate limiting
- [ ] Test nonce validation
- [ ] Verify audit logging
- [ ] Test threat detection
- [ ] Perform security scan

### Production

- [ ] Disable verbose logging
- [ ] Enable all security features
- [ ] Configure rate limiting
- [ ] Set up audit logging
- [ ] Enable threat detection
- [ ] Configure monitoring and alerting
- [ ] Use HTTPS/TLS everywhere
- [ ] Implement secrets management
- [ ] Set up automated backups
- [ ] Configure log rotation

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [API Security Best Practices](https://apisecurity.io/)
- [Aura Security Documentation](https://docs.aurablockchain.org/security)
