# Changelog

All notable changes to the Aura Verifier SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added
- Initial stable release of Aura Verifier SDK
- Full TypeScript support with comprehensive type definitions
- `AuraVerifier` main class for credential verification
- QR code parsing and validation module
- Ed25519 and secp256k1 signature verification
- gRPC and REST blockchain integration
- Offline verification mode with intelligent caching
- DID resolution and document management
- Credential status checking (active, revoked, expired)
- Event system for verification, errors, and sync events
- Batch verification support
- Convenience methods: `isAge21Plus()`, `isAge18Plus()`, `isVerifiedHuman()`
- Aura trust score calculation: `getAuraScore()`
- Cache synchronization and management
- Comprehensive error handling with specific error classes
- Network endpoint configuration for mainnet, testnet, and local
- Configurable timeouts and retry logic
- Audit trail with unique verification IDs
- Browser, Node.js, and React Native support
- Extensive documentation and examples
- Unit and integration tests with > 90% coverage

### Security
- Cryptographic signature verification using @noble/ed25519 and @noble/secp256k1
- Nonce validation to prevent replay attacks
- QR code expiration enforcement
- Revocation list checking
- Encrypted cache storage support
- Input sanitization and validation

### Performance
- < 500ms verification latency (online mode)
- < 50ms verification latency (offline mode)
- Intelligent DID and VC caching
- Concurrent batch verification
- Optimized network requests

## [0.9.0-beta] - 2025-01-01

### Added
- Beta release for testing
- Core verification functionality
- Basic QR code parsing
- Testnet support
- Initial documentation

### Fixed
- Signature verification edge cases
- Cache invalidation issues
- Network timeout handling

## [0.8.0-alpha] - 2024-12-15

### Added
- Alpha release for early adopters
- Proof of concept implementation
- Basic offline mode
- Example applications

### Known Issues
- Performance optimization needed
- Documentation incomplete
- Limited error handling

## Migration Guides

### Migrating to 1.0.0 from 0.9.0-beta

#### Breaking Changes

1. **Import Path Changes**

**Before:**
```typescript
import { Verifier } from '@aura-network/verifier-sdk';
```

**After:**
```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';
```

2. **Configuration Structure**

**Before:**
```typescript
const verifier = new Verifier({
  rpcEndpoint: 'https://rpc.aura.network',
  network: 'mainnet',
});
```

**After:**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  // grpcEndpoint optional, defaults handled automatically
});
```

3. **Verification Method Signature**

**Before:**
```typescript
const result = await verifier.verifyPresentation(qrData);
```

**After:**
```typescript
const result = await verifier.verify({ qrCodeData: qrData });
```

4. **Error Handling**

**Before:**
```typescript
catch (error) {
  if (error.code === 'QR_EXPIRED') {
    // handle
  }
}
```

**After:**
```typescript
import { QRExpiredError } from '@aura-network/verifier-sdk';

catch (error) {
  if (error instanceof QRExpiredError) {
    // handle
  }
}
```

#### New Features to Adopt

1. **Convenience Methods**

```typescript
// New in 1.0.0
const isOver21 = await verifier.isAge21Plus(qrCodeData);
const trustScore = await verifier.getAuraScore(qrCodeData);
```

2. **Event System**

```typescript
// New in 1.0.0
verifier.on('verification', (data) => {
  console.log('Verification:', data.result.auditId);
});
```

3. **Offline Mode**

```typescript
// New in 1.0.0
await verifier.enableOfflineMode();
await verifier.syncCache();
```

### Migrating to 1.0.0 from 0.8.0-alpha

Due to significant changes, we recommend starting fresh with the 1.0.0 API. Key differences:

1. Complete rewrite of core verification logic
2. New TypeScript-first architecture
3. Enhanced error handling
4. Improved performance
5. Comprehensive documentation

## Upgrade Instructions

### npm

```bash
npm install @aura-network/verifier-sdk@latest
```

### pnpm

```bash
pnpm update @aura-network/verifier-sdk
```

### yarn

```bash
yarn upgrade @aura-network/verifier-sdk
```

## Deprecation Notices

None in current version.

## Future Roadmap

### Version 1.1.0 (Planned Q1 2025)

- WebAssembly optimization for faster crypto operations
- GraphQL endpoint support
- Advanced caching strategies
- Webhook notifications
- Multi-signature support

### Version 1.2.0 (Planned Q2 2025)

- Zero-knowledge proof verification
- Selective disclosure enhancements
- Compliance framework integrations
- Enhanced analytics and reporting

### Version 2.0.0 (Planned Q3 2025)

- DID method plugins
- Custom credential type validators
- Enterprise features (SSO, RBAC)
- Advanced offline capabilities

## Support Policy

- **1.x.x**: Active development, regular updates, full support
- **0.9.x**: Security fixes only (until 2025-06-01)
- **0.8.x and earlier**: No longer supported

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details on:
- How to contribute
- Development setup
- Testing requirements
- Pull request process

## License

MIT License - see [LICENSE](../LICENSE) file for details.

Copyright (c) 2025 Aura Network
