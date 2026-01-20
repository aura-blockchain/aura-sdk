# Basic Verification Example

Simple credential verification example for beginners.

## Overview

This example demonstrates the most basic usage of the Aura Verifier SDK to verify a credential presentation from a QR code.

## Prerequisites

- Node.js >= 18.0.0
- npm or pnpm installed
- Basic knowledge of TypeScript/JavaScript

## Installation

```bash
npm install @aura-network/verifier-sdk
```

## Complete Example

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function main() {
  // 1. Initialize the verifier
  const verifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 10000,
    verbose: true, // Enable logging for development
  });

  // 2. Connect to the network
  await verifier.initialize();
  console.log('Verifier initialized successfully');

  // 3. QR code data (typically scanned from user's device)
  const qrCodeString =
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXMyMzQiLCJoIjoiZGlkOmF1cmE6bWFpbm5ldDphdXJhMXh5ejEyMyIsInZjcyI6WyJ2YzEyMyJdLCJjdHgiOnsic2hvd19hZ2Vfb3Zlcl8yMSI6dHJ1ZX0sImV4cCI6MTczNTU2MDAwMCwibiI6MTIzNDU2LCJzaWciOiJhYmNkZWYxMjM0NTYifQ==';

  try {
    // 4. Verify the credential
    const result = await verifier.verify({
      qrCodeData: qrCodeString,
    });

    // 5. Check result
    if (result.isValid) {
      console.log('Verification successful!');
      console.log('Holder DID:', result.holderDID);
      console.log('Verified at:', result.verifiedAt);
      console.log('Credentials:', result.vcDetails.length);

      // Display disclosed attributes
      console.log('\nDisclosed Attributes:');
      if (result.attributes.ageOver21) {
        console.log('- Age over 21: Yes');
      }
      if (result.attributes.fullName) {
        console.log('- Name:', result.attributes.fullName);
      }
      if (result.attributes.cityState) {
        console.log('- Location:', result.attributes.cityState);
      }
    } else {
      console.error('Verification failed:', result.verificationError);
    }
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    // 6. Cleanup
    await verifier.destroy();
    console.log('Verifier destroyed');
  }
}

// Run the example
main().catch(console.error);
```

## Expected Output

```
Verifier initialized successfully
Verification successful!
Holder DID: did:aura:mainnet:aura1xyz123
Verified at: 2025-12-30T10:30:00.000Z
Credentials: 1

Disclosed Attributes:
- Age over 21: Yes
Verifier destroyed
```

## Step-by-Step Breakdown

### Step 1: Import and Initialize

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({
  network: 'mainnet', // or 'testnet' for testing
  timeout: 10000, // 10 second timeout
  verbose: true, // Show debug logs
});

await verifier.initialize();
```

### Step 2: Scan QR Code

In a real application, you would use a QR code scanner library:

```typescript
// Example with html5-qrcode
import { Html5Qrcode } from 'html5-qrcode';

const scanner = new Html5Qrcode('reader');
scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, (decodedText) => {
  // Use decodedText as qrCodeString
  verifyCredential(decodedText);
});
```

### Step 3: Verify Credential

```typescript
const result = await verifier.verify({
  qrCodeData: qrCodeString,
});
```

### Step 4: Check Results

```typescript
if (result.isValid) {
  // Credential is valid
  console.log('Access granted');
} else {
  // Credential is invalid
  console.log('Access denied:', result.verificationError);
}
```

### Step 5: Access Attributes

```typescript
const { holderDID, vcDetails, attributes, verifiedAt } = result;

// Check disclosed attributes
if (attributes.ageOver21) {
  console.log('Customer is 21+');
}
```

### Step 6: Cleanup

```typescript
await verifier.destroy();
```

## Error Handling

Add proper error handling:

```typescript
import { VerificationError, QRExpiredError } from '@aura-network/verifier-sdk';

try {
  const result = await verifier.verify({ qrCodeData });

  if (!result.isValid) {
    console.error('Verification failed:', result.verificationError);
  }
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('QR code has expired');
  } else if (error instanceof VerificationError) {
    console.error('Verification error:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Common Pitfalls

1. **Forgetting to initialize**

   ```typescript
   // Wrong
   const verifier = new AuraVerifier(config);
   await verifier.verify({ qrCodeData }); // Error!

   // Correct
   const verifier = new AuraVerifier(config);
   await verifier.initialize();
   await verifier.verify({ qrCodeData });
   ```

2. **Not handling errors**

   ```typescript
   // Wrong - errors crash the app
   const result = await verifier.verify({ qrCodeData });

   // Correct - errors are handled
   try {
     const result = await verifier.verify({ qrCodeData });
   } catch (error) {
     console.error('Error:', error);
   }
   ```

3. **Not cleaning up**

   ```typescript
   // Wrong - resources leak
   const verifier = new AuraVerifier(config);
   await verifier.verify({ qrCodeData });

   // Correct - cleanup resources
   const verifier = new AuraVerifier(config);
   try {
     await verifier.verify({ qrCodeData });
   } finally {
     await verifier.destroy();
   }
   ```

## Next Steps

- [Offline Mode Example](./offline-verification.md)
- [Batch Verification Example](./batch-verification.md)
- [Custom Configuration Example](./custom-configuration.md)
- [API Reference](../api-reference.md)
