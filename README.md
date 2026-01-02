# Aura Verifier SDK

[![npm version](https://img.shields.io/npm/v/@aura-network/verifier-sdk.svg)](https://www.npmjs.com/package/@aura-network/verifier-sdk)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aura-blockchain/aura-verifier-sdk/ci.yml?branch=main)](https://github.com/aura-blockchain/aura-verifier-sdk/actions)
[![Coverage](https://img.shields.io/codecov/c/github/aura-blockchain/aura-verifier-sdk)](https://codecov.io/gh/aura-blockchain/aura-verifier-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready TypeScript SDK for building third-party verifiers on the Aura Network. Enable secure, privacy-preserving verification of digital credentials for age verification, identity checks, marketplace trust, and more.

## Overview

The Aura Verifier SDK allows businesses and developers to verify Aura Network digital credentials without storing sensitive personal information. Users present QR codes containing cryptographically signed credential presentations, which verifiers can validate against the blockchain.

**Key Use Cases:**
- Age verification for bars, nightclubs, and age-restricted venues
- Identity verification for peer-to-peer marketplaces (Craigslist, Facebook Marketplace)
- Trust scores for online platforms
- KYC compliance for financial services
- Event access control

## Features

- **Full TypeScript Support** - Comprehensive type definitions and strict type checking
- **Cryptographic Verification** - Ed25519 and secp256k1 signature algorithms
- **Blockchain Integration** - Cosmos SDK integration via CosmJS
- **Offline Mode** - Cache credentials and revocation lists for offline verification
- **Privacy-First** - Zero-knowledge disclosure contexts (e.g., prove age > 21 without revealing exact age)
- **Production-Ready** - Robust error handling, retry logic, and comprehensive test coverage
- **Cross-Platform** - Works in Node.js, browsers, React Native, and Flutter
- **Flexible Architecture** - ESM and CommonJS module support

## Quick Start

### Installation

```bash
npm install @aura-network/verifier-sdk
# or
pnpm add @aura-network/verifier-sdk
# or
yarn add @aura-network/verifier-sdk
```

### Basic Usage

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

// Initialize the SDK
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network', // Mainnet
  timeout: 30000,
  debug: false
});

// Verify a signature from a QR code
const result = await verifier.verifySignature({
  publicKey: 'a1b2c3d4...', // hex-encoded public key
  message: 'credential-presentation-data',
  signature: 'signature-from-qr-code',
  algorithm: 'ed25519'
});

if (result.valid) {
  console.log('Credential verified successfully!');
  // Allow access, complete transaction, etc.
} else {
  console.error('Verification failed:', result.error);
  // Deny access
}

// Clean up
await verifier.disconnect();
```

### Age Verification Example

```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

// Scan QR code and parse
const qrData = parseQRCode(scannedQRString);

// Check disclosure context
if (qrData.ctx.show_age_over_21) {
  // Verify the presentation signature
  const verified = await verifier.verifySignature({
    publicKey: qrData.h, // holder's public key/DID
    message: JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    }),
    signature: qrData.sig,
    algorithm: 'ed25519'
  });

  if (verified.valid && Date.now() / 1000 < qrData.exp) {
    console.log('Customer is over 21 - allow entry');
  }
}
```

## Documentation

- [Quick Start](./QUICKSTART.md) - Get started in minutes
- [Getting Started Guide](./docs/getting-started.md) - Installation, configuration, and first verification
- [API Reference](./docs/api-reference.md) - Complete API documentation
- [Verification Flow](./docs/verification-flow.md) - How credential verification works
- [Offline Mode](./docs/offline-mode.md) - Enable offline verification with caching
- [Error Handling](./docs/error-handling.md) - Error types and handling strategies
- [Security Guide](./docs/security-guide.md) - Security best practices
- [Migration Guide](./docs/migration-guide.md) - Upgrading between versions
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions
- [Contributing](./CONTRIBUTING.md) - Development workflow and guidelines

## Network Endpoints

### Mainnet
```typescript
{
  rpcEndpoint: 'https://rpc.aura.network',
  restEndpoint: 'https://lcd.aura.network'
}
```

### Testnet
```typescript
{
  rpcEndpoint: 'https://rpc.euphoria.aura.network',
  restEndpoint: 'https://lcd.euphoria.aura.network'
}
```

## Requirements

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (for development only)

## Platform Support

- Node.js (18+)
- Modern browsers (Chrome, Firefox, Safari, Edge)
- React Native (via `@aura-network/verifier-sdk-react-native`)
- Flutter (via `aura_verifier_sdk` package)

## Development

### Setup

```bash
# Clone the repository
git clone git@github.com:aura-blockchain/aura-verifier-sdk.git
cd aura-verifier-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:check
```

### Project Structure

```
aura-verifier-sdk/
├── packages/
│   ├── core/              # Core TypeScript SDK
│   ├── react-native/      # React Native wrapper
│   ├── flutter/           # Flutter/Dart wrapper
│   └── integrations/      # Platform integrations
├── docs/                  # Documentation
├── examples/              # Example implementations
├── proto/                 # Protocol buffer definitions
├── package.json           # Root package configuration
├── pnpm-workspace.yaml    # pnpm workspace configuration
├── tsconfig.base.json     # Shared TypeScript configuration
├── vitest.config.ts       # Test configuration
├── .eslintrc.json         # ESLint configuration
└── .prettierrc            # Prettier configuration
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Testing requirements
- Pull request process

## Versioning

This project follows [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

Copyright (c) 2025 Aura Network

## Support

- **Documentation**: [https://docs.aura.network](https://docs.aura.network)
- **Discord**: [https://discord.gg/aura](https://discord.gg/aura)
- **Issues**: [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
- **Email**: dev@aura.network

## Acknowledgments

Built with:
- [CosmJS](https://github.com/cosmos/cosmjs) - Cosmos SDK JavaScript library
- [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) - Ed25519 signature verification
- [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1) - secp256k1 signature verification
- [Vitest](https://vitest.dev/) - Testing framework
