# @aura-network/verifier-sdk

Core SDK for Aura Network third-party verifiers.

## Features

- Ed25519 signature verification using `@noble/ed25519`
- secp256k1 signature verification using `@noble/secp256k1`
- SHA-256 hashing using `@noble/hashes`
- Cosmos SDK transaction verification
- Protobuf message handling
- Full TypeScript support with strict types

## Installation

```bash
npm install @aura-network/verifier-sdk
```

## Usage

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

// Example usage (API will be defined in implementation)
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
});

// Verify a signature
const isValid = await verifier.verifySignature({
  publicKey: '0x...',
  message: 'Hello, Aura!',
  signature: '0x...',
  algorithm: 'ed25519',
});
```

## API Documentation

Coming soon...

## License

MIT
