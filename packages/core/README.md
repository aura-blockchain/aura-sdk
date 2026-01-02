# @aura-network/verifier-sdk

Core TypeScript SDK for building third-party verifiers on the Aura Network.

## Installation

```bash
npm install @aura-network/verifier-sdk
```

## Features

- Ed25519 and secp256k1 signature verification
- SHA-256, SHA-512, and Keccak-256 hashing
- QR code parsing and validation
- Blockchain integration via REST API
- Offline verification with credential caching
- Full TypeScript support with strict types

## Usage

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://testnet-rpc.aurablockchain.org', // Testnet
});

await verifier.initialize();

const result = await verifier.verify({
  qrCodeData: 'aura://verify?data=...',
});

if (result.isValid) {
  console.log('Credential verified');
}

await verifier.destroy();
```

## API

### VerifierSDK

Main SDK class for credential verification.

**Constructor Options:**
- `rpcEndpoint` - Aura Network RPC endpoint
- `restEndpoint` - REST API endpoint (optional)
- `timeout` - Request timeout in milliseconds (default: 30000)
- `network` - Network preset: 'mainnet' | 'testnet' | 'local'

**Methods:**
- `initialize()` - Connect to the network
- `verify(options)` - Verify a credential presentation
- `destroy()` - Clean up resources

### Cryptographic Utilities

```typescript
import { verifySignature, hash, deriveAddress } from '@aura-network/verifier-sdk';

// Verify Ed25519 signature
const isValid = await verifySignature({
  publicKey: 'hex-encoded-public-key',
  message: 'message-to-verify',
  signature: 'hex-encoded-signature',
  algorithm: 'ed25519',
});

// Hash data
const digest = hash({
  data: 'data-to-hash',
  algorithm: 'sha256',
  encoding: 'hex',
});

// Derive Bech32 address
const address = deriveAddress({
  publicKey: 'hex-encoded-public-key',
  prefix: 'aura',
  algorithm: 'secp256k1',
});
```

### QR Code Parsing

```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

const qrData = parseQRCode('aura://verify?data=...');

console.log(qrData.h);   // Holder DID
console.log(qrData.vcs); // Credential IDs
console.log(qrData.ctx); // Disclosure context
console.log(qrData.exp); // Expiration timestamp
```

## Network Endpoints

| Network | RPC | REST |
|---------|-----|------|
| Testnet (Current) | https://testnet-rpc.aurablockchain.org | https://testnet-api.aurablockchain.org |
| Local | http://localhost:26657 | http://localhost:1317 |
| Mainnet (TBD) | https://mainnet-rpc.aurablockchain.org | https://mainnet-api.aurablockchain.org |

## Requirements

- Node.js 18.0.0 or higher
- TypeScript 5.0 or higher (for development)

## License

MIT
