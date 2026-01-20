# Quick Start Guide

Get up and running with the Aura Verifier SDK in 5 minutes. This guide walks you through verifying your first credential.

## Prerequisites

- Node.js 18.0.0 or higher
- Basic understanding of async/await in JavaScript/TypeScript
- Aura Verifier SDK installed ([Installation Guide](./installation.md))

## Step 1: Import the SDK

### TypeScript/ES Modules

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';
```

### CommonJS (Node.js)

```javascript
const { AuraVerifier } = require('@aura-network/verifier-sdk');
```

## Step 2: Initialize the Verifier

Create an instance of `AuraVerifier` with your desired network:

```typescript
const verifier = new AuraVerifier({
  network: 'testnet', // Use 'mainnet' for production
  timeout: 10000, // 10 second timeout
  verbose: true, // Enable logging for development
});
```

### Initialize Connection

Before verifying, initialize the verifier to establish blockchain connectivity:

```typescript
await verifier.initialize();
console.log('Verifier initialized and ready!');
```

## Step 3: Verify a QR Code

When a user presents a QR code, scan it and pass the data to the verifier:

```typescript
// Example QR code data (this would come from a QR scanner)
const qrCodeData =
  'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNlbnRhdGlvbi0xMjMiLCJoIjoiZGlkOmF1cmE6dGVzdG5ldDphYmMxMjMiLCJ2Y3MiOlsidmMtMSIsInZjLTIiXSwiY3R4Ijp7InNob3dfYWdlX292ZXJfMjEiOnRydWV9LCJleHAiOjE3MzU1NjAwMDAsIm4iOjEyMzQ1Niwic2lnIjoiYWJjZGVmMTIzNDU2In0=';

try {
  const result = await verifier.verify({
    qrCodeData,
    verifierAddress: 'aura1your-verifier-address', // Optional
  });

  if (result.isValid) {
    console.log('Verification successful!');
    console.log('Holder DID:', result.holderDID);
    console.log('Verified at:', result.verifiedAt);
    console.log('Attributes:', result.attributes);

    // Check specific attributes
    if (result.attributes.ageOver21) {
      console.log('Customer is 21+ - allow entry');
    }
  } else {
    console.log('Verification failed:', result.verificationError);
  }
} catch (error) {
  console.error('Error during verification:', error.message);
}
```

## Step 4: Handle the Result

The verification result contains all the information you need:

```typescript
interface VerificationResult {
  isValid: boolean; // Overall verification status
  holderDID: string; // User's decentralized identifier
  verifiedAt: Date; // Timestamp of verification
  vcDetails: VCVerificationDetail[]; // Details of each credential
  attributes: DiscloseableAttributes; // Disclosed information
  verificationError?: string; // Error message if failed
  auditId: string; // Unique ID for audit trail
  networkLatency: number; // Response time in ms
  signatureValid: boolean; // Cryptographic signature status
  presentationId: string; // Presentation identifier
  expiresAt: Date; // When QR code expires
}
```

### Access Disclosed Attributes

```typescript
const { attributes } = result;

// Check age-related attributes
if (attributes.ageOver21) {
  console.log('Customer is over 21');
}

if (attributes.ageOver18) {
  console.log('Customer is over 18');
}

// Check name if disclosed
if (attributes.fullName) {
  console.log('Name:', attributes.fullName);
}

// Check location if disclosed
if (attributes.cityState) {
  console.log('Location:', attributes.cityState);
}
```

### Check Credential Details

```typescript
for (const vc of result.vcDetails) {
  console.log('Credential ID:', vc.vcId);
  console.log('Type:', vc.vcType);
  console.log('Issuer:', vc.issuerDID);
  console.log('Status:', vc.status);
  console.log('Issued:', vc.issuedAt);

  if (vc.status === 'revoked') {
    console.warn('This credential has been revoked!');
  }
}
```

## Complete Example

Here's a complete working example:

```typescript
import { AuraVerifier, VCType } from '@aura-network/verifier-sdk';

async function main() {
  // 1. Create verifier instance
  const verifier = new AuraVerifier({
    network: 'testnet',
    timeout: 10000,
    verbose: true,
  });

  try {
    // 2. Initialize
    await verifier.initialize();
    console.log('Verifier initialized');

    // 3. Simulate scanning a QR code
    const qrCodeData = getQRCodeFromScanner(); // Your QR scanner function

    // 4. Verify the credential
    const result = await verifier.verify({
      qrCodeData,
      requiredVCTypes: [VCType.AGE_VERIFICATION], // Require age credential
    });

    // 5. Process result
    if (result.isValid) {
      console.log('✓ Verification successful');

      // Check age requirement
      if (result.attributes.ageOver21) {
        console.log('✓ Customer is 21+');
        grantAccess(); // Your access control function
      } else {
        console.log('✗ Customer is not 21+');
        denyAccess();
      }
    } else {
      console.log('✗ Verification failed:', result.verificationError);
      denyAccess();
    }

    // 6. Log for audit
    await logVerification({
      auditId: result.auditId,
      holderDID: result.holderDID,
      timestamp: result.verifiedAt,
      isValid: result.isValid,
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // 7. Cleanup when done
    await verifier.destroy();
  }
}

// Helper functions (implement these based on your setup)
function getQRCodeFromScanner(): string {
  // Integrate with your QR code scanner
  return scannedData;
}

function grantAccess() {
  console.log('Access granted!');
}

function denyAccess() {
  console.log('Access denied!');
}

async function logVerification(data: any) {
  // Log to your database/audit system
  console.log('Logged:', data);
}

main();
```

## Common Use Cases

### Age Verification (21+)

Quick check if someone is over 21:

```typescript
const isOver21 = await verifier.isAge21Plus(qrCodeData);

if (isOver21) {
  console.log('Allow alcohol purchase');
} else {
  console.log('Deny - under 21');
}
```

### Age Verification (18+)

Quick check if someone is over 18:

```typescript
const isOver18 = await verifier.isAge18Plus(qrCodeData);

if (isOver18) {
  console.log('Allow adult content');
} else {
  console.log('Deny - under 18');
}
```

### Proof of Humanity

Verify someone has passed biometric verification:

```typescript
const isVerifiedHuman = await verifier.isVerifiedHuman(qrCodeData);

if (isVerifiedHuman) {
  console.log('Verified human - no bot');
} else {
  console.log('Could not verify humanity');
}
```

### Trust Score

Get an overall trust score (0-100):

```typescript
const trustScore = await verifier.getAuraScore(qrCodeData);

if (trustScore !== null) {
  console.log('Trust Score:', trustScore);

  if (trustScore >= 80) {
    console.log('High trust - grant full access');
  } else if (trustScore >= 50) {
    console.log('Medium trust - grant limited access');
  } else {
    console.log('Low trust - require additional verification');
  }
}
```

## Error Handling

Always wrap verification in try-catch blocks:

```typescript
import { QRExpiredError, QRParseError, VerificationError } from '@aura-network/verifier-sdk';

try {
  const result = await verifier.verify({ qrCodeData });

  if (!result.isValid) {
    // Handle invalid verification
    console.log('Invalid:', result.verificationError);
  }
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('QR code has expired');
  } else if (error instanceof QRParseError) {
    console.error('Invalid QR code format');
  } else if (error instanceof VerificationError) {
    console.error('Verification failed:', error.message);
    console.error('Error code:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

### 1. Initialize Once, Reuse Many Times

Don't create a new verifier for each verification:

```typescript
// Good: Single instance
const verifier = new AuraVerifier({ network: 'mainnet' });
await verifier.initialize();

app.post('/verify', async (req, res) => {
  const result = await verifier.verify({ qrCodeData: req.body.qr });
  res.json(result);
});

// Bad: New instance per request
app.post('/verify', async (req, res) => {
  const verifier = new AuraVerifier({ network: 'mainnet' }); // Don't do this
  await verifier.initialize();
  const result = await verifier.verify({ qrCodeData: req.body.qr });
  res.json(result);
});
```

### 2. Always Call `destroy()` on Shutdown

Clean up resources when your application exits:

```typescript
process.on('SIGTERM', async () => {
  await verifier.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await verifier.destroy();
  process.exit(0);
});
```

### 3. Use Audit IDs for Logging

Every verification has a unique audit ID:

```typescript
const result = await verifier.verify({ qrCodeData });

// Store in your database
await db.verifications.insert({
  auditId: result.auditId,
  holderDID: result.holderDID,
  isValid: result.isValid,
  timestamp: result.verifiedAt,
  verifier: 'my-business-id',
});
```

### 4. Set Appropriate Timeouts

Adjust timeout based on your network conditions:

```typescript
// Fast local network
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 5000, // 5 seconds
});

// Slow/unreliable network
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 30000, // 30 seconds
});
```

### 5. Validate QR Codes Before Verifying

Check QR code format first to fail fast:

```typescript
import { parseQRCodeSafe } from '@aura-network/verifier-sdk';

const parseResult = parseQRCodeSafe(qrCodeData);

if (!parseResult.success) {
  console.error('Invalid QR code:', parseResult.error);
  return;
}

// Now verify
const result = await verifier.verify({ qrCodeData });
```

## Testing Your Integration

Use the testnet for development:

```typescript
const verifier = new AuraVerifier({
  network: 'testnet', // Safe for testing
  verbose: true, // See detailed logs
});
```

Generate test QR codes:

- Visit the [Aura Testnet Wallet](https://testnet-wallet.aurablockchain.org)
- Create credentials
- Generate verification QR codes

## Next Steps

- **Configuration**: Learn about all [configuration options](./configuration.md)
- **Environments**: Understand [mainnet vs testnet](./environments.md)
- **Offline Mode**: Enable [offline verification](../guides/offline-mode.md)
- **Error Handling**: Deep dive into [error handling](../guides/error-handling.md)
- **Security**: Review [security best practices](../guides/security-best-practices.md)

## Common Questions

### How long does verification take?

- **Online mode**: 200-500ms depending on network
- **Offline mode**: 10-50ms (using cached data)

### Can I verify multiple QR codes at once?

Yes, use batch verification:

```typescript
const requests = [{ qrCodeData: qr1 }, { qrCodeData: qr2 }, { qrCodeData: qr3 }];

const results = await verifier.verifyBatch(requests);
```

See [Batch Verification Guide](../guides/batch-verification.md).

### What happens if the blockchain is down?

Enable offline mode with cached credentials:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true, // Use cached data only
});
```

See [Offline Mode Guide](../guides/offline-mode.md).

### How do I handle revoked credentials?

Revoked credentials are automatically detected:

```typescript
const result = await verifier.verify({ qrCodeData });

if (!result.isValid && result.verificationError?.includes('revoked')) {
  console.log('This credential has been revoked by the issuer');
}
```

## Getting Help

If you're stuck:

1. Check the [Troubleshooting Guide](../troubleshooting.md)
2. Search [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
3. Ask on [Discord](https://discord.gg/aurablockchain)
4. Email support: dev@aurablockchain.org
