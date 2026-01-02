# Getting Started with Aura Verifier SDK

This guide will walk you through setting up the Aura Verifier SDK and performing your first credential verification.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Your First Verification](#your-first-verification)
- [Network Selection](#network-selection)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher installed
- **npm**, **pnpm**, or **yarn** package manager
- Basic understanding of TypeScript/JavaScript
- (Optional) Understanding of blockchain and Cosmos SDK concepts

### Check Your Node.js Version

```bash
node --version
# Should output v18.0.0 or higher
```

If you need to upgrade Node.js, visit [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm).

## Installation

Install the Aura Verifier SDK using your preferred package manager:

### npm

```bash
npm install @aura-network/verifier-sdk
```

### pnpm

```bash
pnpm add @aura-network/verifier-sdk
```

### yarn

```bash
yarn add @aura-network/verifier-sdk
```

### Verify Installation

Create a test file to verify the installation:

```typescript
// test-install.ts
import { VerifierSDK } from '@aura-network/verifier-sdk';

console.log('Aura Verifier SDK installed successfully!');
console.log('SDK version:', VerifierSDK.prototype.constructor.name);
```

Run it:

```bash
npx tsx test-install.ts
# or with ts-node
npx ts-node test-install.ts
```

## Configuration

### Basic Configuration

The SDK requires minimal configuration to get started. At minimum, you need to provide an RPC endpoint:

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org'
});
```

### Full Configuration Options

```typescript
import { VerifierSDK, VerifierConfig } from '@aura-network/verifier-sdk';

const config: VerifierConfig = {
  // Required: RPC endpoint for blockchain queries
  rpcEndpoint: 'https://rpc.aurablockchain.org',

  // Optional: REST API endpoint (for additional queries)
  restEndpoint: 'https://api.aurablockchain.org',

  // Optional: Request timeout in milliseconds (default: 30000)
  timeout: 30000,

  // Optional: Enable debug logging (default: false)
  debug: false
};

const verifier = new VerifierSDK(config);
```

### Environment Variables

For production applications, it's recommended to use environment variables:

```typescript
// .env file
AURA_RPC_ENDPOINT=https://rpc.aurablockchain.org
AURA_REST_ENDPOINT=https://api.aurablockchain.org
AURA_SDK_TIMEOUT=30000
AURA_SDK_DEBUG=false
```

```typescript
// app.ts
import { VerifierSDK } from '@aura-network/verifier-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const verifier = new VerifierSDK({
  rpcEndpoint: process.env.AURA_RPC_ENDPOINT!,
  restEndpoint: process.env.AURA_REST_ENDPOINT,
  timeout: parseInt(process.env.AURA_SDK_TIMEOUT || '30000'),
  debug: process.env.AURA_SDK_DEBUG === 'true'
});
```

## Your First Verification

Let's perform a complete credential verification using a QR code.

### Step 1: Parse the QR Code

```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

// This would come from a QR code scanner in a real app
const qrString = 'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXMyMzQiLCJoIjoiZGlkOmF1cmE6bWFpbm5ldDphdXJhMXh5ejEyMyIsInZjcyI6WyJ2YzEyMyJdLCJjdHgiOnsic2hvd19hZ2Vfb3Zlcl8yMSI6dHJ1ZX0sImV4cCI6MTczNTU2MDAwMCwibiI6MTIzNDU2LCJzaWciOiJhYmNkZWYxMjM0NTYifQ==';

try {
  const qrData = parseQRCode(qrString);
  console.log('QR Code parsed successfully');
  console.log('Holder DID:', qrData.h);
  console.log('Credential IDs:', qrData.vcs);
  console.log('Disclosure Context:', qrData.ctx);
  console.log('Expires at:', new Date(qrData.exp * 1000));
} catch (error) {
  console.error('Failed to parse QR code:', error);
}
```

### Step 2: Verify the Signature

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org'
});

// Construct the message that was signed
const message = JSON.stringify({
  p: qrData.p,
  vcs: qrData.vcs,
  ctx: qrData.ctx,
  exp: qrData.exp,
  n: qrData.n
});

// Verify the signature
const result = await verifier.verifySignature({
  publicKey: qrData.h, // Holder's DID contains public key
  message: message,
  signature: qrData.sig,
  algorithm: 'ed25519' // Aura Network uses Ed25519
});

if (result.valid) {
  console.log('Signature is valid!');
} else {
  console.error('Signature verification failed:', result.error);
}
```

### Step 3: Check Expiration

```typescript
const now = Date.now() / 1000; // Current time in seconds

if (qrData.exp < now) {
  console.error('Credential presentation has expired');
} else {
  const timeRemaining = qrData.exp - now;
  console.log(`Credential valid for ${Math.floor(timeRemaining / 60)} more minutes`);
}
```

### Step 4: Complete Example

Here's a complete verification function:

```typescript
import { VerifierSDK, parseQRCode } from '@aura-network/verifier-sdk';

async function verifyCredential(qrString: string): Promise<boolean> {
  const verifier = new VerifierSDK({
    rpcEndpoint: 'https://rpc.aurablockchain.org',
    timeout: 30000
  });

  try {
    // Step 1: Parse QR code
    const qrData = parseQRCode(qrString);
    console.log('QR code parsed successfully');

    // Step 2: Check expiration
    const now = Date.now() / 1000;
    if (qrData.exp < now) {
      console.error('Credential presentation has expired');
      return false;
    }

    // Step 3: Verify signature
    const message = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    });

    const result = await verifier.verifySignature({
      publicKey: qrData.h,
      message: message,
      signature: qrData.sig,
      algorithm: 'ed25519'
    });

    if (!result.valid) {
      console.error('Signature verification failed:', result.error);
      return false;
    }

    // Step 4: Check disclosure context (business logic)
    if (qrData.ctx.show_age_over_21) {
      console.log('Age verification successful: User is over 21');
      return true;
    }

    console.log('Verification successful!');
    return true;

  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  } finally {
    // Clean up connection
    await verifier.disconnect();
  }
}

// Usage
const qrString = 'aura://verify?data=...';
const isValid = await verifyCredential(qrString);

if (isValid) {
  console.log('Access granted');
} else {
  console.log('Access denied');
}
```

## Network Selection

### Mainnet (Production)

Use mainnet for production applications:

```typescript
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
  restEndpoint: 'https://api.aurablockchain.org'
});
```

**Mainnet Characteristics:**
- Real credentials and blockchain data
- Production-level security and reliability
- Real transaction costs (if writing to blockchain)
- Used for live applications

### Testnet (Development)

Use testnet (testnet) for development and testing:

```typescript
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://testnet-rpc.aurablockchain.org',
  restEndpoint: 'https://testnet-api.aurablockchain.org',
  debug: true // Enable debug logging during development
});
```

**Testnet Characteristics:**
- Test credentials and data
- Free test tokens for transactions
- May be reset periodically
- Used for development and testing

### Local Node (Advanced)

For advanced development, you can run a local Aura node:

```typescript
const verifier = new VerifierSDK({
  rpcEndpoint: 'http://localhost:26657',
  restEndpoint: 'http://localhost:1317',
  debug: true
});
```

## Next Steps

Now that you've completed your first verification, explore these topics:

1. **[API Reference](./api-reference.md)** - Learn about all available methods and configuration options
2. **[Verification Flow](./verification-flow.md)** - Understand the complete verification process in depth
3. **[Offline Mode](./offline-mode.md)** - Enable offline verification with caching
4. **[Error Handling](./error-handling.md)** - Handle errors gracefully in production
5. **[Security Best Practices](./security.md)** - Secure your verifier application

### Example Use Cases

- **[Bar Age Verification](./examples/bar-age-verification.md)** - Complete implementation for bars and nightclubs
- **[Marketplace Trust](./examples/marketplace-trust.md)** - Verify users in P2P marketplaces

## Troubleshooting

### Common Issues

**Issue: "RPC connection failed"**
```
Solution: Check that the RPC endpoint is accessible and correct. Try pinging the endpoint:
curl https://rpc.aurablockchain.org/status
```

**Issue: "Invalid signature" errors**
```
Solution: Ensure the message construction matches exactly what was signed. The order of JSON fields matters.
```

**Issue: "Module not found" errors**
```
Solution: Ensure you're using Node.js 18+ and have installed the SDK correctly:
npm install @aura-network/verifier-sdk --save
```

**Issue: QR code parsing fails**
```
Solution: Verify the QR code format is correct. The SDK expects either:
- Full URL: aura://verify?data=<base64>
- Raw base64 data
```

## Support

If you encounter issues:

1. Check the [API Reference](./api-reference.md) for detailed documentation
2. Review the [Error Handling Guide](./error-handling.md)
3. Search existing [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
4. Join our [Discord community](https://discord.gg/aurablockchain)
5. Email dev@aurablockchain.org for support
