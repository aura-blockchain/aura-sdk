# Security Best Practices

Comprehensive security guide for building secure verifier applications with the Aura Verifier SDK.

## Table of Contents

- [Overview](#overview)
- [Cryptographic Security](#cryptographic-security)
- [Signature Verification](#signature-verification)
- [Replay Attack Prevention](#replay-attack-prevention)
- [Data Privacy](#data-privacy)
- [Network Security](#network-security)
- [Storage Security](#storage-security)
- [Access Control](#access-control)
- [Compliance](#compliance)
- [Security Checklist](#security-checklist)

## Overview

Security is paramount when verifying digital credentials. This guide covers best practices for building secure, privacy-preserving verifier applications.

**Security Principles:**
1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal data access and storage
3. **Privacy by Design**: Default to privacy-preserving options
4. **Fail Secure**: Default to denial in case of errors
5. **Audit Everything**: Comprehensive logging for security events

## Cryptographic Security

### Signature Algorithm Selection

Always use strong, well-tested cryptographic algorithms:

```typescript
// ✓ GOOD: Use Ed25519 (recommended)
const result = await verifier.verifySignature({
  publicKey: publicKey,
  message: message,
  signature: signature,
  algorithm: 'ed25519'  // Fast, secure, deterministic
});

// ✓ ACCEPTABLE: Use secp256k1 if required
const result = await verifier.verifySignature({
  algorithm: 'secp256k1'  // Compatible with Bitcoin/Ethereum
});

// ✗ BAD: Don't implement custom signature schemes
// Never roll your own crypto!
```

**Why Ed25519?**
- Resistant to side-channel attacks
- Fast verification (~70k sigs/sec)
- Small signatures (64 bytes)
- No timing vulnerabilities
- Widely audited and tested

### Proper Message Construction

Ensure messages are constructed identically by both parties:

```typescript
// ✓ GOOD: Canonical message format
const message = JSON.stringify({
  p: qrData.p,
  vcs: qrData.vcs,
  ctx: qrData.ctx,
  exp: qrData.exp,
  n: qrData.n
});

// ✗ BAD: Inconsistent message construction
const message = `${qrData.p}${qrData.vcs}${qrData.exp}`; // Don't do this!

// ✗ BAD: Message with variable whitespace
const message = JSON.stringify(data, null, 2); // Pretty-printing breaks signatures!
```

### Key Management

**Public Keys:**
```typescript
// ✓ GOOD: Validate public key format
function validatePublicKey(publicKey: string, algorithm: 'ed25519' | 'secp256k1'): boolean {
  // Ed25519 public keys are 32 bytes (64 hex chars)
  if (algorithm === 'ed25519') {
    if (publicKey.length !== 64) return false;
    if (!/^[0-9a-f]+$/i.test(publicKey)) return false;
  }

  // secp256k1 public keys are 33 or 65 bytes (66 or 130 hex chars)
  if (algorithm === 'secp256k1') {
    if (publicKey.length !== 66 && publicKey.length !== 130) return false;
    if (!/^[0-9a-f]+$/i.test(publicKey)) return false;
  }

  return true;
}

// ✗ BAD: Accept any string as public key
const publicKey = userInput; // No validation!
```

**Never Store Private Keys:**
```typescript
// ✗ NEVER do this in a verifier application!
const privateKey = '...';  // Verifiers don't need private keys!

// ✓ Verifiers only need:
// - Public keys (to verify signatures)
// - Messages (to verify signatures)
// - Signatures (to verify)
```

### Random Number Generation

Use cryptographically secure random number generators:

```typescript
// ✓ GOOD: Use crypto.getRandomValues or crypto.randomBytes
import { randomBytes } from 'crypto';

const nonce = randomBytes(32).toString('hex');

// ✗ BAD: Math.random() is NOT cryptographically secure
const nonce = Math.random().toString(); // Predictable!
```

## Signature Verification

### Always Verify Signatures

```typescript
// ✓ GOOD: Always verify before trusting data
const result = await verifier.verifySignature(request);

if (result.valid) {
  // Signature is valid - safe to trust data
  processCredential(qrData);
} else {
  // Signature is invalid - reject
  throw new Error('Invalid signature');
}

// ✗ BAD: Skip verification in "trusted" environments
if (process.env.NODE_ENV === 'production') {
  // ✗ NEVER skip signature verification!
  processCredential(qrData);
}
```

### Verify Before Processing

```typescript
// ✓ GOOD: Verify first, process second
async function handleCredential(qrString: string) {
  const qrData = parseQRCode(qrString);

  // Verify signature FIRST
  const sigResult = await verifier.verifySignature({
    publicKey: qrData.h,
    message: constructMessage(qrData),
    signature: qrData.sig,
    algorithm: 'ed25519'
  });

  if (!sigResult.valid) {
    throw new Error('Invalid signature');
  }

  // NOW safe to process
  return processCredential(qrData);
}

// ✗ BAD: Process before verifying
async function handleCredentialBad(qrString: string) {
  const qrData = parseQRCode(qrString);

  // ✗ Processing unverified data!
  const result = processCredential(qrData);

  // ✗ Too late - already processed untrusted data
  await verifier.verifySignature(...);

  return result;
}
```

### Time-Constant Comparison

Avoid timing attacks when comparing secrets:

```typescript
import { timingSafeEqual } from 'crypto';

// ✓ GOOD: Use timing-safe comparison
function verifyNonce(expected: Buffer, actual: Buffer): boolean {
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

// ✗ BAD: String comparison leaks timing information
function verifyNonceBad(expected: string, actual: string): boolean {
  return expected === actual; // Timing attack vulnerable!
}
```

## Replay Attack Prevention

### Nonce Tracking

Track used nonces to prevent replay attacks:

```typescript
class NonceTracker {
  private usedNonces = new Map<number, number>(); // nonce -> expiration time

  check(nonce: number, expirationTime: number): boolean {
    // Check if nonce was already used
    if (this.usedNonces.has(nonce)) {
      console.error('Replay attack detected! Nonce already used:', nonce);
      return false;
    }

    // Record nonce
    this.usedNonces.set(nonce, expirationTime);

    // Schedule cleanup after expiration
    setTimeout(() => {
      this.usedNonces.delete(nonce);
    }, (expirationTime - Date.now() / 1000 + 60) * 1000);

    // Periodic cleanup of expired nonces
    this.cleanupExpired();

    return true;
  }

  private cleanupExpired() {
    const now = Date.now() / 1000;
    for (const [nonce, exp] of this.usedNonces.entries()) {
      if (exp < now) {
        this.usedNonces.delete(nonce);
      }
    }
  }
}

const nonceTracker = new NonceTracker();

// Usage
if (!nonceTracker.check(qrData.n, qrData.exp)) {
  throw new Error('Replay attack detected');
}
```

### Short Expiration Times

Use short expiration times for presentations:

```typescript
// ✓ GOOD: Short expiration (30 seconds to 5 minutes)
const EXPIRATION_TIME = 300; // 5 minutes

// Check expiration
const now = Math.floor(Date.now() / 1000);
if (qrData.exp < now) {
  throw new Error('Presentation expired');
}

// ✗ BAD: Long expiration (hours or days)
const EXPIRATION_TIME = 86400; // 24 hours - too long!
```

### Challenge-Response Protocol

For high-security applications, use challenge-response:

```typescript
// Generate a unique challenge for each verification
function generateChallenge(): string {
  return randomBytes(32).toString('hex');
}

// Verifier generates challenge
const challenge = generateChallenge();

// User signs challenge + credential data
const messageToSign = JSON.stringify({
  challenge: challenge,
  credential: credentialData,
  timestamp: Date.now()
});

// Verify includes challenge
const isValid = await verifier.verifySignature({
  publicKey: userPublicKey,
  message: messageToSign,
  signature: userSignature,
  algorithm: 'ed25519'
});
```

## Data Privacy

### Minimal Data Collection

Only request and store necessary information:

```typescript
// ✓ GOOD: Request only what you need
const disclosureContext = {
  show_age_over_21: true  // Only need age verification
  // NOT requesting: full name, address, SSN, etc.
};

// ✗ BAD: Request everything
const disclosureContext = {
  show_full_name: true,
  show_age: true,
  show_full_address: true,  // Too much information!
  show_ssn: true,
  show_phone: true
};
```

### Don't Log Sensitive Data

```typescript
// ✓ GOOD: Log events without PII
console.log('Verification succeeded', {
  holderDid: qrData.h,  // Public identifier - OK
  timestamp: Date.now(),
  verificationType: 'age_over_21'
});

// ✗ BAD: Log personal information
console.log('Verification succeeded', {
  fullName: 'John Doe',      // PII - don't log!
  age: 25,                   // PII - don't log!
  address: '123 Main St',    // PII - don't log!
  qrData: qrData             // Contains PII - don't log!
});
```

### Automatic Data Deletion

```typescript
// ✓ GOOD: Auto-delete verification records
class VerificationRecords {
  private records: Map<string, any> = new Map();

  store(recordId: string, data: any, ttlSeconds: number = 3600) {
    this.records.set(recordId, data);

    // Auto-delete after TTL
    setTimeout(() => {
      this.records.delete(recordId);
    }, ttlSeconds * 1000);
  }

  // Periodic cleanup
  startCleanup() {
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      for (const [id, data] of this.records.entries()) {
        if (data.timestamp < cutoff) {
          this.records.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Run hourly
  }
}
```

### Privacy-Preserving Audit Logs

```typescript
// ✓ GOOD: Hash PII in audit logs
import { createHash } from 'crypto';

function hashPII(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

const auditLog = {
  timestamp: Date.now(),
  userIdHash: hashPII(userId),  // Hashed, not plaintext
  verificationType: 'age_over_21',
  result: 'success'
  // No actual name, address, or PII stored
};
```

## Network Security

### HTTPS Only

```typescript
// ✓ GOOD: Enforce HTTPS
const config = {
  rpcEndpoint: 'https://rpc.aura.network',  // HTTPS
  restEndpoint: 'https://lcd.aura.network'  // HTTPS
};

// ✗ BAD: HTTP is insecure
const config = {
  rpcEndpoint: 'http://rpc.aura.network',  // Vulnerable to MITM
};

// ✓ GOOD: Validate HTTPS in production
if (process.env.NODE_ENV === 'production') {
  if (!config.rpcEndpoint.startsWith('https://')) {
    throw new Error('HTTPS required in production');
  }
}
```

### Certificate Validation

```typescript
// ✓ GOOD: Validate SSL certificates
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: true  // Enforce certificate validation
});

// ✗ BAD: Disable certificate validation
const agent = new https.Agent({
  rejectUnauthorized: false  // NEVER do this in production!
});
```

### Rate Limiting

```typescript
// ✓ GOOD: Implement rate limiting
class RateLimiter {
  private requests = new Map<string, number[]>();

  checkLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Get recent requests
    const recentRequests = (this.requests.get(ip) || [])
      .filter(time => time > cutoff);

    if (recentRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Record request
    recentRequests.push(now);
    this.requests.set(ip, recentRequests);

    return true;
  }
}

// Usage in Express
const rateLimiter = new RateLimiter();

app.post('/api/verify', (req, res) => {
  const ip = req.ip;

  if (!rateLimiter.checkLimit(ip, 10, 60000)) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  // Process verification
});
```

### Input Validation

```typescript
// ✓ GOOD: Validate all inputs
function validateQRString(qrString: unknown): string {
  if (typeof qrString !== 'string') {
    throw new Error('QR string must be a string');
  }

  if (qrString.length > 10000) {
    throw new Error('QR string too long');
  }

  if (qrString.length < 10) {
    throw new Error('QR string too short');
  }

  // Sanitize
  const sanitized = qrString.trim();

  return sanitized;
}

// ✗ BAD: No validation
function validateQRStringBad(qrString: any): any {
  return qrString;  // Accepts anything!
}
```

## Storage Security

### Encrypt Cached Data

```typescript
// ✓ GOOD: Encrypt cache with AES-256-GCM
import { generateEncryptionKey } from '@aura-network/verifier-sdk';

const cache = new CacheManager({
  maxAge: 3600,
  maxEntries: 1000,
  persistToDisk: true,
  encryptionKey: process.env.CACHE_ENCRYPTION_KEY || generateEncryptionKey(),
  storageAdapter: 'file'
});

// ✗ BAD: Store sensitive data unencrypted
const cache = new CacheManager({
  persistToDisk: true,
  // No encryption!
});
```

### Secure Key Storage

```typescript
// ✓ GOOD: Store keys in environment variables or key vaults
const encryptionKey = process.env.CACHE_ENCRYPTION_KEY;

// ✗ BAD: Hardcode keys in source code
const encryptionKey = 'abc123...';  // Committed to git - very bad!

// ✓ BETTER: Use key management service (AWS KMS, Azure Key Vault, etc.)
import { getSecret } from './key-vault';
const encryptionKey = await getSecret('cache-encryption-key');
```

### Secure File Permissions

```bash
# ✓ GOOD: Restrict cache file permissions
chmod 600 /var/cache/aura-verifier/*

# ✗ BAD: World-readable cache files
chmod 644 /var/cache/aura-verifier/*  # Everyone can read!
```

## Access Control

### Principle of Least Privilege

```typescript
// ✓ GOOD: Different access levels
enum Role {
  OPERATOR = 'operator',      // Can verify credentials
  ADMIN = 'admin',             // Can view logs
  SUPERADMIN = 'superadmin'    // Can configure system
}

function checkPermission(user: User, action: string): boolean {
  const permissions = {
    [Role.OPERATOR]: ['verify'],
    [Role.ADMIN]: ['verify', 'view_logs'],
    [Role.SUPERADMIN]: ['verify', 'view_logs', 'configure']
  };

  return permissions[user.role]?.includes(action) ?? false;
}
```

### Authentication

```typescript
// ✓ GOOD: Require authentication for verification API
import jwt from 'jsonwebtoken';

app.post('/api/verify', authenticateToken, async (req, res) => {
  // Only authenticated users can verify
});

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}
```

## Compliance

### GDPR Compliance

```typescript
// ✓ GOOD: GDPR-compliant data handling
class GDPRCompliantVerifier {
  async verify(qrString: string, userConsent: boolean) {
    if (!userConsent) {
      throw new Error('User consent required');
    }

    // Minimal data collection
    const result = await this.verifyMinimal(qrString);

    // Auto-delete after 30 days
    this.scheduleDataDeletion(result.verificationId, 30);

    return result;
  }

  async handleDataDeletionRequest(userId: string) {
    // Allow users to request data deletion
    await this.deleteUserData(userId);
    await this.deleteAuditLogs(userId);
    await this.deleteCachedCredentials(userId);
  }

  async handleDataExportRequest(userId: string) {
    // Allow users to export their data
    return {
      verifications: await this.getUserVerifications(userId),
      auditLogs: await this.getUserAuditLogs(userId)
    };
  }
}
```

### Data Retention Policies

```typescript
// ✓ GOOD: Enforce data retention limits
const RETENTION_POLICIES = {
  verificationRecords: 30 * 24 * 60 * 60 * 1000,    // 30 days
  auditLogs: 90 * 24 * 60 * 60 * 1000,              // 90 days
  cachedCredentials: 7 * 24 * 60 * 60 * 1000        // 7 days
};

async function enforceRetention() {
  const now = Date.now();

  // Delete old verification records
  await db.verifications.deleteMany({
    timestamp: { $lt: now - RETENTION_POLICIES.verificationRecords }
  });

  // Delete old audit logs
  await db.auditLogs.deleteMany({
    timestamp: { $lt: now - RETENTION_POLICIES.auditLogs }
  });

  // Clear old cached credentials
  await cache.evictOlderThan(RETENTION_POLICIES.cachedCredentials);
}

// Run daily
setInterval(enforceRetention, 24 * 60 * 60 * 1000);
```

## Security Checklist

Use this checklist for security audits:

### Cryptography
- [ ] Using strong algorithms (Ed25519 or secp256k1)
- [ ] Always verifying signatures before processing data
- [ ] Using cryptographically secure random numbers
- [ ] Proper key validation
- [ ] No custom cryptographic implementations

### Replay Protection
- [ ] Tracking used nonces
- [ ] Short expiration times (< 5 minutes)
- [ ] Time-constant comparisons for secrets
- [ ] Challenge-response for high-security apps

### Data Privacy
- [ ] Minimal data collection
- [ ] No PII in logs
- [ ] Automatic data deletion
- [ ] Privacy-preserving audit logs
- [ ] GDPR compliance

### Network Security
- [ ] HTTPS only in production
- [ ] Certificate validation enabled
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention

### Storage Security
- [ ] Encrypted cache storage
- [ ] Secure key management
- [ ] Proper file permissions
- [ ] No hardcoded secrets
- [ ] Regular security audits

### Access Control
- [ ] Authentication required
- [ ] Least privilege principle
- [ ] Role-based access control
- [ ] Session management
- [ ] Audit logging

### Compliance
- [ ] GDPR compliance
- [ ] Data retention policies
- [ ] User consent collection
- [ ] Data deletion requests handled
- [ ] Privacy policy published

## Security Audit Example

```typescript
// security-audit.ts
import { VerifierSDK } from '@aura-network/verifier-sdk';

class SecurityAuditor {
  async auditConfiguration(config: any) {
    const issues: string[] = [];

    // Check HTTPS
    if (!config.rpcEndpoint.startsWith('https://')) {
      issues.push('RPC endpoint must use HTTPS in production');
    }

    // Check encryption
    if (config.cache?.persistToDisk && !config.cache?.encryptionKey) {
      issues.push('Cache encryption required when persisting to disk');
    }

    // Check timeouts
    if (config.timeout > 30000) {
      issues.push('Timeout should not exceed 30 seconds');
    }

    return {
      passed: issues.length === 0,
      issues: issues
    };
  }

  async auditVerification(verificationCode: Function) {
    const issues: string[] = [];

    // Check if signature verification is present
    const code = verificationCode.toString();

    if (!code.includes('verifySignature')) {
      issues.push('Missing signature verification');
    }

    if (!code.includes('exp')) {
      issues.push('Missing expiration check');
    }

    return {
      passed: issues.length === 0,
      issues: issues
    };
  }
}
```

## Next Steps

- [Error Handling](./error-handling.md) - Secure error handling
- [Offline Mode](./offline-mode.md) - Secure offline caching
- [API Reference](./api-reference.md) - Security-related APIs
- [Verification Flow](./verification-flow.md) - Security in verification
