# Migration Guide

Guide for upgrading between versions of the Aura Verifier SDK.

## Table of Contents

- [Version 1.0.0 (Current)](#version-100-current)
- [Migrating from Beta to 1.0.0](#migrating-from-beta-to-100)
- [Future Migrations](#future-migrations)
- [Breaking Changes](#breaking-changes)
- [Deprecation Notices](#deprecation-notices)

---

## Version 1.0.0 (Current)

Current stable release with full feature set.

### What's New in 1.0.0

- Complete TypeScript SDK for Aura credential verification
- High-level `AuraVerifier` class with convenience methods
- Low-level `VerifierSDK` for direct blockchain operations
- QR code parsing and validation
- Offline mode with caching and synchronization
- Security module with rate limiting, nonce tracking, and audit logging
- Comprehensive error handling
- Event system for monitoring
- Batch verification support
- Full TypeScript type definitions

### Installation

```bash
npm install @aura-network/verifier-sdk@^1.0.0
```

---

## Migrating from Beta to 1.0.0

If you were using a beta or pre-release version, follow this guide to upgrade.

### Breaking Changes

#### 1. Package Import Structure

**Before (Beta):**

```typescript
import { Verifier } from '@aura-network/verifier-sdk';
```

**After (1.0.0):**

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';
```

**Migration:**

```typescript
// Replace all instances
// Old: const verifier = new Verifier(config);
// New:
const verifier = new AuraVerifier(config);
```

---

#### 2. Configuration Object Changes

**Before (Beta):**

```typescript
const verifier = new Verifier({
  rpcUrl: 'https://rpc.aurablockchain.org',
  network: 'mainnet',
});
```

**After (1.0.0):**

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',  // Required, determines default endpoints
  grpcEndpoint?: string,  // Optional custom endpoint
  restEndpoint?: string,
  timeout?: number,
  verbose?: boolean,
  offlineMode?: boolean,
  cacheConfig?: CacheConfig
});
```

**Migration:**

```typescript
// Old configuration
const oldConfig = {
  rpcUrl: 'https://rpc.aurablockchain.org',
  network: 'mainnet',
  timeout: 30000,
};

// New configuration
const newConfig = {
  network: 'mainnet',
  timeout: 30000,
  // grpcEndpoint and restEndpoint are auto-configured based on network
};
```

---

#### 3. Verification Method Signature

**Before (Beta):**

```typescript
const result = await verifier.verify(qrString);
```

**After (1.0.0):**

```typescript
const result = await verifier.verify({
  qrCodeData: qrString,
  verifierAddress?: string,
  requiredVCTypes?: VCType[],
  maxCredentialAge?: number,
  requiredDisclosures?: Partial<DisclosureContext>,
  offlineOnly?: boolean
});
```

**Migration:**

```typescript
// Simple case (no additional requirements)
// Old: const result = await verifier.verify(qrString);
// New:
const result = await verifier.verify({ qrCodeData: qrString });

// With requirements
const result = await verifier.verify({
  qrCodeData: qrString,
  requiredVCTypes: [VCType.PROOF_OF_HUMANITY],
  verifierAddress: 'your-verifier-id',
});
```

---

#### 4. Result Object Structure

**Before (Beta):**

```typescript
interface VerificationResult {
  success: boolean;
  did?: string;
  credentials?: any[];
  error?: string;
}
```

**After (1.0.0):**

```typescript
interface VerificationResult {
  isValid: boolean;
  holderDID: string;
  verifiedAt: Date;
  vcDetails: VCVerificationDetail[];
  attributes: DiscloseableAttributes;
  verificationError?: string;
  auditId: string;
  networkLatency: number;
  verificationMethod: VerificationStrategy;
  presentationId: string;
  expiresAt: Date;
  signatureValid: boolean;
  metadata?: Record<string, unknown>;
}
```

**Migration:**

```typescript
// Old code
if (result.success) {
  console.log('Verified DID:', result.did);
}

// New code
if (result.isValid) {
  console.log('Verified DID:', result.holderDID);
  console.log('Credentials:', result.vcDetails);
  console.log('Attributes:', result.attributes);
}
```

---

#### 5. Error Handling

**Before (Beta):**

```typescript
try {
  const result = await verifier.verify(qr);
} catch (error) {
  console.error('Error:', error.message);
}
```

**After (1.0.0):**

```typescript
import {
  VerificationError,
  QRExpiredError,
  CredentialRevokedError,
  NetworkError,
} from '@aura-network/verifier-sdk';

try {
  const result = await verifier.verify({ qrCodeData: qr });

  if (!result.isValid) {
    // Handle verification failure
    console.error('Verification failed:', result.verificationError);
  }
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('QR code expired');
  } else if (error instanceof CredentialRevokedError) {
    console.error('Credential revoked');
  } else if (error instanceof NetworkError) {
    console.error('Network error');
  } else if (error instanceof VerificationError) {
    console.error('Verification error:', error.code);
  }
}
```

---

#### 6. Initialization Pattern

**Before (Beta):**

```typescript
const verifier = new Verifier(config);
// Ready to use immediately
```

**After (1.0.0):**

```typescript
const verifier = new AuraVerifier(config);
await verifier.initialize(); // Required
// Now ready to use
```

**Migration:**

```typescript
// Old pattern
async function verify(qr: string) {
  const verifier = new Verifier(config);
  return await verifier.verify(qr);
}

// New pattern
async function verify(qr: string) {
  const verifier = new AuraVerifier(config);
  await verifier.initialize(); // Add this line
  const result = await verifier.verify({ qrCodeData: qr });
  await verifier.destroy(); // Cleanup
  return result;
}
```

---

### New Features to Adopt

#### 1. Offline Mode

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: false,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,
  },
});

await verifier.initialize();

// Sync cache
await verifier.syncCache();

// Enable offline mode when needed
await verifier.enableOfflineMode();
```

#### 2. Batch Verification

```typescript
const results = await verifier.verifyBatch([
  { qrCodeData: qr1 },
  { qrCodeData: qr2 },
  { qrCodeData: qr3 },
]);
```

#### 3. Convenience Methods

```typescript
// Simple age checks
const isOver21 = await verifier.isAge21Plus(qrString);
const isOver18 = await verifier.isAge18Plus(qrString);

// Humanity check
const isHuman = await verifier.isVerifiedHuman(qrString);

// Trust score
const score = await verifier.getAuraScore(qrString);
```

#### 4. Event System

```typescript
verifier.on('verification', (data) => {
  console.log('Verification completed:', data.result.isValid);
});

verifier.on('error', (data) => {
  console.error('Error occurred:', data.error.message);
});

verifier.on('sync', (data) => {
  console.log('Cache synced:', data.result.didsSynced, 'DIDs');
});
```

#### 5. Security Features

```typescript
import { createSecureVerifier } from '@aura-network/verifier-sdk';

const secureContext = createSecureVerifier({
  enableNonceTracking: true,
  enableRateLimiting: true,
  enableAuditLogging: true,
  enableThreatDetection: true,
});

// Use security components
await secureContext.nonceManager?.validateNonce(nonce, timestamp);
await secureContext.rateLimiter?.checkLimit(identifier);

// Cleanup
secureContext.cleanup();
```

---

### Step-by-Step Migration

#### Step 1: Update Package

```bash
npm install @aura-network/verifier-sdk@^1.0.0
```

#### Step 2: Update Imports

```typescript
// Before
import { Verifier } from '@aura-network/verifier-sdk';

// After
import { AuraVerifier } from '@aura-network/verifier-sdk';

// Add new imports as needed
import type { VerificationRequest, VerificationResult } from '@aura-network/verifier-sdk';

import { VCType, VCStatus, VerificationError } from '@aura-network/verifier-sdk';
```

#### Step 3: Update Configuration

```typescript
// Before
const config = {
  rpcUrl: 'https://rpc.aurablockchain.org',
  network: 'mainnet',
};

// After
const config = {
  network: 'mainnet',
  timeout: 10000,
  verbose: false,
};
```

#### Step 4: Update Initialization

```typescript
// Before
const verifier = new Verifier(config);

// After
const verifier = new AuraVerifier(config);
await verifier.initialize();
```

#### Step 5: Update Verification Calls

```typescript
// Before
const result = await verifier.verify(qrString);
if (result.success) {
  console.log('DID:', result.did);
}

// After
const result = await verifier.verify({ qrCodeData: qrString });
if (result.isValid) {
  console.log('DID:', result.holderDID);
  console.log('Credentials:', result.vcDetails);
}
```

#### Step 6: Update Error Handling

```typescript
// Before
try {
  const result = await verifier.verify(qr);
} catch (error) {
  console.error(error.message);
}

// After
try {
  const result = await verifier.verify({ qrCodeData: qr });
  if (!result.isValid) {
    console.error(result.verificationError);
  }
} catch (error) {
  if (error instanceof VerificationError) {
    console.error('Code:', error.code, 'Message:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### Step 7: Add Cleanup

```typescript
// After
await verifier.destroy();
```

---

### Example: Complete Migration

**Before (Beta):**

```typescript
import { Verifier } from '@aura-network/verifier-sdk';

async function verifyAge(qrCode: string): Promise<boolean> {
  try {
    const verifier = new Verifier({
      rpcUrl: 'https://rpc.aurablockchain.org',
      network: 'mainnet',
    });

    const result = await verifier.verify(qrCode);
    return result.success && result.credentials?.some((c) => c.type === 'AgeVerification');
  } catch (error) {
    console.error('Verification failed:', error.message);
    return false;
  }
}
```

**After (1.0.0):**

```typescript
import { AuraVerifier, VCType } from '@aura-network/verifier-sdk';

async function verifyAge(qrCode: string): Promise<boolean> {
  const verifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 10000,
  });

  try {
    await verifier.initialize();

    // Use convenience method
    const isOver21 = await verifier.isAge21Plus(qrCode);
    return isOver21;

    // Or use full verification
    const result = await verifier.verify({
      qrCodeData: qrCode,
      requiredVCTypes: [VCType.AGE_VERIFICATION],
    });

    return result.isValid && result.attributes.ageOver21 === true;
  } catch (error) {
    if (error instanceof VerificationError) {
      console.error('Verification failed:', error.code, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    return false;
  } finally {
    await verifier.destroy();
  }
}
```

---

## Future Migrations

### Planned for 2.0.0 (Future)

These are potential breaking changes planned for future major versions:

1. **Enhanced DID Support**

   - Support for multiple DID methods
   - DID rotation handling

2. **Advanced Credential Types**

   - Support for selective disclosure credentials
   - Zero-knowledge proof integration

3. **Performance Improvements**
   - Optimized caching strategies
   - Parallel verification optimization

### Deprecation Warnings

None in 1.0.0. This is the initial stable release.

---

## Breaking Changes

### 1.0.0

- Initial stable release, no breaking changes from beta
- See "Migrating from Beta to 1.0.0" section above

---

## Deprecation Notices

### Current (1.0.0)

No deprecations in current version.

### Planned Deprecations

None announced at this time.

---

## Compatibility Matrix

| SDK Version  | Node.js   | TypeScript | Aura Chain           |
| ------------ | --------- | ---------- | -------------------- |
| 1.0.0        | >= 18.0.0 | >= 5.0.0   | mainnet-1, testnet-2 |
| 0.9.x (beta) | >= 16.0.0 | >= 4.5.0   | testnet-2            |

---

## Support

If you encounter issues during migration:

1. **Check the documentation**: Review the [API Reference](./api-reference.md) and [Quick Start Guide](./quick-start.md)
2. **Review examples**: Check the [examples directory](../examples/)
3. **Search issues**: Look for similar issues on [GitHub](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
4. **Ask for help**:
   - Discord: [https://discord.gg/aurablockchain](https://discord.gg/aurablockchain)
   - Email: dev@aurablockchain.org
   - GitHub Issues: Create a new issue with the `migration` label

---

## Migration Checklist

### Pre-Migration

- [ ] Review changelog
- [ ] Read migration guide
- [ ] Test in development environment
- [ ] Update dependencies
- [ ] Review breaking changes

### Migration

- [ ] Update package version
- [ ] Update imports
- [ ] Update configuration
- [ ] Update initialization pattern
- [ ] Update verification calls
- [ ] Update result handling
- [ ] Update error handling
- [ ] Add cleanup calls

### Post-Migration

- [ ] Run tests
- [ ] Test in staging environment
- [ ] Update documentation
- [ ] Monitor for errors
- [ ] Deploy to production
- [ ] Monitor production
