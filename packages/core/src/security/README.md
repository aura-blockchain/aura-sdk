# Security Hardening Module

Enterprise-grade security features for the Aura Verifier SDK.

## Overview

This module provides comprehensive security protections for blockchain verification systems:

- **Nonce Management**: Prevent replay attacks with time-based nonce tracking
- **Rate Limiting**: Protect against abuse with configurable rate limits
- **Audit Logging**: Tamper-evident logging for compliance and monitoring
- **Input Sanitization**: Prevent injection attacks and validate external input
- **Threat Detection**: Behavioral analysis to identify suspicious patterns
- **Encryption Utilities**: AES-256-GCM encryption and secure key management

## Quick Start

```typescript
import { createSecureVerifier } from '@aura-network/verifier-sdk/security';

// Create a secure verifier with all protections enabled
const context = createSecureVerifier({
  enableNonceTracking: true,
  enableRateLimiting: true,
  enableAuditLogging: true,
  enableThreatDetection: true,
});

// Use security components
await context.nonceManager.validateNonce('12345', Date.now());
await context.rateLimiter.checkLimit('did:aura:user123');
await context.auditLogger.logVerificationAttempt({
  actor: 'did:aura:verifier',
  target: 'did:aura:credential',
  outcome: AuditOutcome.SUCCESS,
});

// Cleanup when done
context.cleanup();
```

## Components

### 1. Nonce Manager

Prevents replay attacks by tracking used nonces with time-based expiration.

```typescript
import { NonceManager } from '@aura-network/verifier-sdk/security';

const manager = new NonceManager({
  nonceWindow: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
});

// Validate nonce (throws if reused or expired)
await manager.validateNonce('12345', Date.now());

// Check if nonce has been used
const used = await manager.hasBeenUsed('12345');
```

**Features:**

- Time-based nonce expiration
- Clock skew tolerance
- Memory-efficient bloom filter option
- Distributed storage support (Redis, etc.)

**Storage Backends:**

- `InMemoryNonceStorage`: Fast, single-instance storage
- `BloomFilterNonceStorage`: Memory-efficient probabilistic storage
- Custom storage via `NonceStorage` interface

### 2. Rate Limiter

Protects against abuse with token bucket algorithm for smooth rate limiting.

```typescript
import { RateLimiter } from '@aura-network/verifier-sdk/security';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  burstCapacity: 20,
  exponentialBackoff: true,
});

// Check rate limit (throws RateLimitError if exceeded)
await limiter.checkLimit('did:aura:user123');

// Check remaining capacity
const remaining = await limiter.getRemainingCapacity('did:aura:user123');
```

**Multi-tier Rate Limiting:**

```typescript
import { MultiTierRateLimiter } from '@aura-network/verifier-sdk/security';

const limiter = new MultiTierRateLimiter({
  global: { maxRequests: 10000, windowMs: 60000 },
  perVerifier: { maxRequests: 1000, windowMs: 60000 },
  perDID: { maxRequests: 100, windowMs: 60000 },
});

await limiter.checkLimit({
  global: 'global',
  perVerifier: 'verifier123',
  perDID: 'did:aura:user456',
});
```

### 3. Audit Logger

Tamper-evident logging with cryptographic hash chains for compliance.

```typescript
import {
  AuditLogger,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
} from '@aura-network/verifier-sdk/security';

const logger = new AuditLogger({
  enableChaining: true,
  bufferSize: 100,
  flushInterval: 5000,
});

// Log verification attempt
await logger.logVerificationAttempt({
  actor: 'did:aura:verifier123',
  target: 'did:aura:credential456',
  outcome: AuditOutcome.SUCCESS,
  metadata: { vcType: 'IdentityCredential' },
});

// Log security event
await logger.logSecurityEvent({
  action: 'REPLAY_ATTACK_DETECTED',
  severity: AuditSeverity.CRITICAL,
  message: 'Nonce reuse detected',
  actor: 'did:aura:user123',
});

// Query logs
const logs = await logger.query({
  category: AuditCategory.VERIFICATION,
  startTime: new Date('2024-01-01'),
});

// Verify integrity
const isValid = await logger.verifyIntegrity(logs);
```

**Features:**

- Tamper-evident hash chains
- Automatic log rotation
- Structured logging (JSON)
- Compliance-ready formats (GDPR, SOC2, ISO 27001)
- Sensitive field redaction

### 4. Input Sanitizer

Validates and sanitizes all external input to prevent injection attacks.

```typescript
import { InputSanitizer } from '@aura-network/verifier-sdk/security';

const sanitizer = new InputSanitizer({
  maxStringLength: 10000,
  strictMode: true,
});

// Sanitize QR code input
const qrData = sanitizer.sanitizeQRInput(rawInput);

// Validate DID
sanitizer.validateDID('did:aura:user123', true); // requireAura = true

// Sanitize string with validation
const safe = sanitizer.sanitizeString(userInput, {
  maxLength: 1000,
  pattern: /^[a-zA-Z0-9_-]+$/,
});

// Validate hex string
const hex = sanitizer.validateHex('deadbeef', 4); // 4 bytes

// Validate URL
const url = sanitizer.validateURL('https://example.com', true); // requireHttps

// Validate email
const email = sanitizer.validateEmail('user@example.com');

// Validate number
const num = sanitizer.validateNumber(42, { min: 0, max: 100, integer: true });

// Validate timestamp
const timestamp = sanitizer.validateTimestamp(Date.now());

// Sanitize JSON
const data = sanitizer.sanitizeJSON('{"key":"value"}');
```

**Security Features:**

- XSS prevention (HTML/script tag detection)
- SQL injection detection
- Path traversal detection
- Maximum length enforcement
- Pattern validation
- Null byte detection

### 5. Threat Detector

Behavioral analysis to identify and respond to security threats.

```typescript
import { ThreatDetector, ThreatLevel } from '@aura-network/verifier-sdk/security';

const detector = new ThreatDetector({
  maxRequestsPerWindow: 50,
  rapidRequestWindow: 60000,
  maxFailedAttempts: 5,
  enableAutoBlock: true,
  onThreatDetected: async (event) => {
    console.error('Threat detected:', event);
    // Send alert, notify security team, etc.
  },
});

// Track verification attempt
await detector.trackVerification({
  identifier: 'did:aura:user123',
  success: true,
  sourceIp: '192.168.1.1',
  location: 'US',
  targetEntity: 'credential-456',
});

// Check if entity is blocked
if (detector.isBlocked('did:aura:user123')) {
  throw new Error('Entity is blocked');
}

// Get activity summary
const summary = detector.getActivitySummary('did:aura:user123');
console.log(summary);

// Get statistics
const stats = detector.getStatistics();
```

**Threat Types:**

- Rapid request patterns
- Brute force attacks
- Geographic anomalies
- Credential stuffing
- Replay attacks
- Unusual behavior patterns

### 6. Encryption Utilities

Secure encryption and key management utilities.

```typescript
import { EncryptionUtils, KeyRotationManager } from '@aura-network/verifier-sdk/security';

const utils = new EncryptionUtils();

// Generate secure random bytes
const key = utils.generateKey(32); // 32 bytes for AES-256

// Derive key from password
const { key: derivedKey, salt } = utils.deriveKey('password123', {
  iterations: 100000,
  algorithm: KDFAlgorithm.PBKDF2_SHA256,
});

// Encrypt data
const encrypted = await utils.encrypt('sensitive data', key);

// Decrypt data
const decrypted = await utils.decrypt(encrypted, key);

// Encrypt with password (combines key derivation + encryption)
const encryptedWithPassword = await utils.encryptWithPassword('sensitive data', 'password123');

const decryptedWithPassword = await utils.decryptWithPassword(encryptedWithPassword, 'password123');

// Constant-time comparison (prevents timing attacks)
const equal = utils.constantTimeEqual(secret1, secret2);

// Hash data
const hash = utils.hash('data to hash');
```

**Key Rotation:**

```typescript
const keyManager = new KeyRotationManager(
  undefined, // auto-generate initial key
  86400000 // rotate every 24 hours
);

// Get current key
const { keyId, key } = keyManager.getCurrentKey();

// Encrypt with current key
const encrypted = await utils.encrypt(data, key);

// Rotate to new key
const newKeyId = keyManager.rotateKey();

// Old keys remain available for decryption
const oldKey = keyManager.getKey(keyId);

// Cleanup expired keys
keyManager.cleanup();
```

## Complete Verification Workflow

```typescript
import {
  createSecureVerifier,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
} from '@aura-network/verifier-sdk/security';

// Create secure verifier
const context = createSecureVerifier({
  enableNonceTracking: true,
  enableRateLimiting: true,
  enableAuditLogging: true,
  enableThreatDetection: true,
  enableInputSanitization: true,
  threatConfig: {
    onThreatDetected: async (event) => {
      // Send alert to security team
      await sendSecurityAlert(event);
    },
  },
});

async function verifyCredential(qrData: string, verifierId: string) {
  try {
    // 1. Sanitize input
    const sanitized = context.inputSanitizer.sanitizeQRInput(qrData);
    const parsed = JSON.parse(sanitized);

    // 2. Validate nonce to prevent replay attacks
    await context.nonceManager.validateNonce(parsed.nonce, parsed.timestamp);

    // 3. Check rate limits
    await context.rateLimiter.checkLimit(parsed.did);

    // 4. Track verification attempt for threat detection
    await context.threatDetector.trackVerification({
      identifier: parsed.did,
      success: true,
      targetEntity: parsed.vcId,
    });

    // 5. Perform actual verification
    // ... verification logic ...

    // 6. Log successful verification
    await context.auditLogger.logVerificationAttempt({
      actor: verifierId,
      target: parsed.vcId,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        did: parsed.did,
        nonce: parsed.nonce,
      },
    });

    return { success: true };
  } catch (error) {
    // Log failed verification
    await context.auditLogger.logVerificationAttempt({
      actor: verifierId,
      target: 'unknown',
      outcome: AuditOutcome.FAILURE,
      metadata: {
        error: error.message,
      },
    });

    throw error;
  }
}

// Cleanup on shutdown
process.on('SIGTERM', () => {
  context.cleanup();
});
```

## Configuration Best Practices

### Production Configuration

```typescript
const productionConfig = {
  // Nonce tracking
  nonceConfig: {
    nonceWindow: 300000, // 5 minutes
    cleanupInterval: 60000, // 1 minute
    clockSkew: 30000, // 30 seconds
  },

  // Rate limiting
  rateLimitConfig: {
    maxRequests: 1000, // per window
    windowMs: 60000, // 1 minute
    burstCapacity: 100,
    exponentialBackoff: true,
  },

  // Audit logging
  auditConfig: {
    enableChaining: true,
    bufferSize: 100,
    flushInterval: 5000,
    includeStackTraces: true,
    redactFields: ['password', 'privateKey', 'secret'],
  },

  // Threat detection
  threatConfig: {
    maxRequestsPerWindow: 100,
    rapidRequestWindow: 60000,
    maxFailedAttempts: 5,
    enableAutoBlock: true,
    onThreatDetected: async (event) => {
      // Send to SIEM, trigger alerts, etc.
    },
  },

  // Input sanitization
  sanitizerConfig: {
    maxStringLength: 10000,
    strictMode: true,
    allowHTML: false,
  },
};
```

### Development Configuration

```typescript
const developmentConfig = {
  nonceConfig: {
    nonceWindow: 600000, // 10 minutes (more lenient)
  },
  rateLimitConfig: {
    maxRequests: 10000, // Higher limit
    windowMs: 60000,
  },
  auditConfig: {
    enableChaining: false, // Disable for performance
  },
  enableThreatDetection: false, // Disable in dev
};
```

## Security Considerations

1. **Nonce Management**:

   - Use distributed storage (Redis) in multi-instance deployments
   - Configure appropriate nonce window based on network latency
   - Consider clock skew in distributed systems

2. **Rate Limiting**:

   - Set limits based on legitimate usage patterns
   - Use multi-tier limiting (global, per-verifier, per-DID)
   - Monitor and adjust based on actual traffic

3. **Audit Logging**:

   - Implement log rotation to prevent disk overflow
   - Regularly backup audit logs to secure storage
   - Verify log integrity periodically
   - Configure appropriate retention periods for compliance

4. **Threat Detection**:

   - Tune thresholds to minimize false positives
   - Implement human review for auto-blocked entities
   - Integrate with SIEM systems for centralized monitoring

5. **Encryption**:
   - Use hardware security modules (HSM) for key storage in production
   - Implement regular key rotation
   - Never log or expose encryption keys
   - Use secure key derivation for password-based encryption

## Testing

Run the test suite:

```bash
npm test src/security
```

Run with coverage:

```bash
npm run test:coverage -- src/security
```

## License

MIT

## Contributing

See the main SDK contributing guidelines.
