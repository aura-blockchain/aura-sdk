# Quick Start Guide

Get up and running with the Aura Verifier SDK in minutes.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [First Verification](#first-verification)
- [Common Verification Patterns](#common-verification-patterns)
- [Error Handling](#error-handling)
- [Next Steps](#next-steps)

---

## Installation

### Using npm

```bash
npm install @aura-network/verifier-sdk
```

### Using pnpm

```bash
pnpm add @aura-network/verifier-sdk
```

### Using yarn

```bash
yarn add @aura-network/verifier-sdk
```

### Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for TypeScript projects)

---

## Basic Setup

### Option 1: High-Level API (Recommended)

For most use cases, use the `AuraVerifier` class which provides a complete verification solution:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

// Initialize the verifier
const verifier = new AuraVerifier({
  network: 'mainnet',  // or 'testnet', 'local'
  timeout: 10000,
  verbose: true  // Enable logging during development
});

// Initialize connection
await verifier.initialize();
```

### Option 2: Low-Level API

For direct blockchain operations and custom workflows:

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const sdk = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  timeout: 30000,
  debug: false
});
```

---

## First Verification

### Step 1: Scan QR Code

Users present QR codes containing their credential presentations. Use a QR code scanner library to capture the QR string.

```typescript
// Example QR code string (scanned from user's device)
const qrString = "aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXMyMzQiLCJoIjoiZGlkOmF1cmE6bWFpbm5ldDphdXJhMXh5ejEyMyIsInZjcyI6WyJ2YzEyMyJdLCJjdHgiOnsic2hvd19hZ2Vfb3Zlcl8yMSI6dHJ1ZX0sImV4cCI6MTczNTU2MDAwMCwibiI6MTIzNDU2LCJzaWciOiJhYmNkZWYxMjM0NTYifQ==";
```

### Step 2: Verify the Presentation

```typescript
const result = await verifier.verify({
  qrCodeData: qrString,
  verifierAddress: 'your-verifier-id',  // Optional: for audit trail
});

// Check the result
if (result.isValid) {
  console.log('Verification successful!');
  console.log('Holder DID:', result.holderDID);
  console.log('Trust Score:', await verifier.getAuraScore(qrString));
} else {
  console.error('Verification failed:', result.verificationError);
}
```

### Step 3: Access Disclosed Attributes

```typescript
if (result.isValid) {
  // Access disclosed attributes
  const { attributes } = result;

  if (attributes.ageOver21) {
    console.log('Customer is 21+');
  }

  if (attributes.fullName) {
    console.log('Name:', attributes.fullName);
  }

  if (attributes.cityState) {
    console.log('Location:', attributes.cityState);
  }
}
```

---

## Common Verification Patterns

### Age Verification (Bar/Nightclub)

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function checkAge21(qrCode: string): Promise<boolean> {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  // Simple convenience method
  const isOver21 = await verifier.isAge21Plus(qrCode);

  await verifier.destroy();
  return isOver21;
}

// Usage
const canEnter = await checkAge21(scannedQR);
if (canEnter) {
  console.log('Access granted');
} else {
  console.log('Access denied - Must be 21+');
}
```

### Identity Verification (Marketplace)

```typescript
import { AuraVerifier, VCType } from '@aura-network/verifier-sdk';

async function verifyMarketplaceSeller(qrCode: string) {
  const verifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 15000
  });
  await verifier.initialize();

  const result = await verifier.verify({
    qrCodeData: qrCode,
    requiredVCTypes: [
      VCType.PROOF_OF_HUMANITY,
      VCType.GOVERNMENT_ID
    ],
    maxCredentialAge: 86400 * 30  // 30 days
  });

  if (result.isValid) {
    const score = await verifier.getAuraScore(qrCode);

    return {
      verified: true,
      trustScore: score,
      holderDID: result.holderDID,
      credentials: result.vcDetails
    };
  }

  return {
    verified: false,
    reason: result.verificationError
  };
}
```

### Proof of Humanity

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function checkHumanity(qrCode: string): Promise<boolean> {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  const isHuman = await verifier.isVerifiedHuman(qrCode);

  await verifier.destroy();
  return isHuman;
}
```

### Batch Verification

Verify multiple credentials at once:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function verifyBatch(qrCodes: string[]) {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  const requests = qrCodes.map(qr => ({ qrCodeData: qr }));
  const results = await verifier.verifyBatch(requests);

  results.forEach((result, index) => {
    console.log(`QR ${index + 1}:`, result.isValid ? 'Valid' : 'Invalid');
  });

  await verifier.destroy();
  return results;
}
```

### Offline Verification

For environments with limited connectivity:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

// Setup with offline support
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: false,  // Start online
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 3600,  // Cache for 1 hour
    maxSize: 100
  }
});

await verifier.initialize();

// Sync cache periodically
setInterval(async () => {
  const syncResult = await verifier.syncCache();
  console.log('Cache synced:', syncResult.didsSynced, 'DIDs');
}, 300000);  // Every 5 minutes

// Enable offline mode when disconnected
await verifier.enableOfflineMode();

// Verification will use cached data
const result = await verifier.verify({ qrCodeData: qrCode });

// Re-enable online mode when connected
await verifier.disableOfflineMode();
```

---

## Error Handling

### Basic Error Handling

```typescript
import { AuraVerifier, VerificationError } from '@aura-network/verifier-sdk';

try {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  const result = await verifier.verify({ qrCodeData: qrCode });

  if (!result.isValid) {
    console.error('Verification failed:', result.verificationError);
  }
} catch (error) {
  if (error instanceof VerificationError) {
    console.error('Verification error:', error.code, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Handling Specific Errors

```typescript
import {
  AuraVerifier,
  QRExpiredError,
  CredentialRevokedError,
  NetworkError,
  VerificationError
} from '@aura-network/verifier-sdk';

try {
  const result = await verifier.verify({ qrCodeData: qrCode });

  if (!result.isValid) {
    // Handle verification failure
    console.error('Verification failed:', result.verificationError);
  }
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('QR code has expired. Please generate a new one.');
  } else if (error instanceof CredentialRevokedError) {
    console.error('Credential has been revoked.');
  } else if (error instanceof NetworkError) {
    console.error('Network error. Please check your connection.');
  } else if (error instanceof VerificationError) {
    console.error('Verification error:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Event-Based Error Handling

```typescript
const verifier = new AuraVerifier({ network: 'mainnet' });
await verifier.initialize();

// Listen for errors
verifier.on('error', (data) => {
  console.error('Error occurred:', data.error.message);
  console.error('Context:', data.context);
});

// Listen for successful verifications
verifier.on('verification', (data) => {
  console.log('Verification completed:', data.result.isValid);
});
```

---

## Next Steps

### Development Best Practices

1. **Use TypeScript**: Take advantage of type safety and autocomplete
2. **Enable Verbose Mode**: During development, enable `verbose: true` for detailed logging
3. **Handle Errors Gracefully**: Always catch and handle errors appropriately
4. **Cleanup Resources**: Call `verifier.destroy()` when done
5. **Cache Wisely**: Use caching for better performance and offline support

### Production Checklist

Before deploying to production:

- [ ] Disable verbose logging (`verbose: false`)
- [ ] Configure appropriate timeouts
- [ ] Implement error monitoring
- [ ] Set up audit logging
- [ ] Configure rate limiting
- [ ] Test offline mode (if needed)
- [ ] Verify network endpoints
- [ ] Review security configurations

### Advanced Features

Explore these features for production deployments:

- **[Security Module](./security-guide.md)** - Rate limiting, nonce tracking, audit logging
- **[Offline Mode](./offline-mode.md)** - Cache management and synchronization
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Error Handling](./error-handling.md)** - Comprehensive error handling guide

### Example Applications

Check out these complete examples:

- [Bar/Nightclub Age Verification](../examples/nodejs-server/) - Node.js server with age verification
- [React Web App](../examples/react-app/) - Browser-based verification
- [Marketplace Integration](../examples/demo-showcase/) - Full marketplace demo

### Community and Support

- **Documentation**: [https://docs.aura.network](https://docs.aura.network)
- **Discord**: [https://discord.gg/aura](https://discord.gg/aura)
- **GitHub Issues**: [github.com/aura-blockchain/aura-verifier-sdk](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
- **Email**: dev@aura.network

---

## Quick Reference

### Network Endpoints

**Mainnet:**
```typescript
{
  grpc: 'grpc.aura.network:9090',
  rest: 'https://lcd.aura.network',
  chainId: 'aura-mainnet-1'
}
```

**Testnet:**
```typescript
{
  grpc: 'grpc.testnet.aura.network:9090',
  rest: 'https://lcd.testnet.aura.network',
  chainId: 'aura-testnet-2'
}
```

### Common Imports

```typescript
// Main classes
import { AuraVerifier, VerifierSDK } from '@aura-network/verifier-sdk';

// Types
import type {
  VerificationRequest,
  VerificationResult,
  AuraVerifierConfig
} from '@aura-network/verifier-sdk';

// Enums
import { VCType, VCStatus } from '@aura-network/verifier-sdk';

// Errors
import {
  VerificationError,
  QRExpiredError,
  CredentialRevokedError,
  NetworkError
} from '@aura-network/verifier-sdk';

// QR Code utilities
import {
  parseQRCode,
  parseQRCodeSafe,
  validateQRCodeData
} from '@aura-network/verifier-sdk';

// Security
import {
  NonceManager,
  RateLimiter,
  AuditLogger,
  createSecureVerifier
} from '@aura-network/verifier-sdk';

// Offline support
import {
  createOfflineVerifier,
  CredentialCache,
  CacheSync
} from '@aura-network/verifier-sdk';
```

### Minimal Working Example

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function verify(qrCode: string): Promise<boolean> {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  const result = await verifier.verify({ qrCodeData: qrCode });

  await verifier.destroy();
  return result.isValid;
}

// Usage
const isValid = await verify(scannedQRCode);
console.log('Valid:', isValid);
```

---

Ready to integrate? Start with the examples above and refer to the [API Reference](./api-reference.md) for detailed documentation.
