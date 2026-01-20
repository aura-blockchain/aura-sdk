# Basic Node.js Example - Aura Verifier SDK

This example demonstrates the fundamental usage of the Aura Verifier SDK in a Node.js environment.

## What This Example Covers

1. **Initializing the verifier** - Setting up the SDK with network configuration
2. **Parsing QR codes** - Extracting and validating credential presentation data
3. **Verifying credentials** - Complete credential verification workflow
4. **Checking attributes** - Accessing disclosed credential attributes
5. **Age verification** - Using convenience methods for common use cases
6. **Error handling** - Proper cleanup and error management

## Prerequisites

- Node.js >= 18.0.0
- pnpm (or npm/yarn)

## Installation

From the repository root:

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm build
```

## Running the Example

```bash
cd examples/basic-node
pnpm start
```

Or use the development mode with auto-reload:

```bash
pnpm dev
```

## Expected Output

The example will:

1. Initialize the Aura Verifier SDK
2. Parse a sample QR code
3. Verify the credential presentation
4. Display verification results
5. Show credential details
6. Demonstrate age verification shortcuts

## Understanding the Code

### 1. Initialize the Verifier

```typescript
const verifier = new AuraVerifier({
  network: 'testnet', // or 'mainnet' for production
  timeout: 10000,
  offlineMode: false,
});

await verifier.initialize();
```

### 2. Parse QR Code

```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

const qrData = parseQRCode(qrCodeString);
console.log(qrData.h); // Holder DID
console.log(qrData.vcs); // Credential IDs
console.log(qrData.ctx); // Disclosure context
```

### 3. Verify Credential

```typescript
const result = await verifier.verify({
  qrCodeData: qrCodeString,
  verifierAddress: 'aura1...', // Optional
});

if (result.isValid) {
  console.log('Valid credential!');
  console.log(result.attributes);
  console.log(result.vcDetails);
}
```

### 4. Age Verification Shortcuts

```typescript
// Check if user is 21+
const isOver21 = await verifier.isAge21Plus(qrCodeString);

// Check if user is 18+
const isOver18 = await verifier.isAge18Plus(qrCodeString);

// Check if verified human
const isHuman = await verifier.isVerifiedHuman(qrCodeString);
```

### 5. Cleanup

```typescript
await verifier.destroy();
```

## Sample QR Code Format

The example generates a sample QR code in this format:

```
aura://verify?data=<base64_encoded_json>
```

The base64 data decodes to:

```json
{
  "v": "1.0",
  "p": "pres_abc123",
  "h": "did:aura:testnet:abc123def456",
  "vcs": ["vc_age_21_test123"],
  "ctx": {
    "show_age_over_21": true
  },
  "exp": 1735560000,
  "n": 123456789,
  "sig": "abcdef..."
}
```

## Error Handling

The SDK provides specific error types:

```typescript
import {
  AuraVerifierError,
  QRParseError,
  VerificationError,
  NetworkError,
} from '@aura-network/verifier-sdk';

try {
  const result = await verifier.verify({ qrCodeData });
} catch (error) {
  if (error instanceof QRParseError) {
    console.error('Invalid QR code format');
  } else if (error instanceof VerificationError) {
    console.error('Verification failed');
  } else if (error instanceof NetworkError) {
    console.error('Network connection issue');
  }
}
```

## Next Steps

- Check out the [Express API Example](../express-api/) for building a REST API
- See the [CLI Tool Example](../cli-tool/) for command-line verification
- Explore the [Offline Mode Example](../offline-mode/) for offline verification

## Learn More

- [SDK Documentation](../../README.md)
- [API Reference](../../docs/api-reference.md)
- [Verification Flow](../../docs/verification-flow.md)
