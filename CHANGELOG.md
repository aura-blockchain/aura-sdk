# Changelog

All notable changes to the Aura Verifier SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Enhanced offline mode with background sync
- WebAssembly support for browser optimization
- GraphQL API support
- React hooks library
- CLI tool for testing verifications

## [1.0.0] - 2025-01-15

### Added

#### Core SDK Features
- **VerifierSDK Class**: Main SDK class for credential verification
- **Signature Verification**: Support for Ed25519 and secp256k1 signature algorithms
- **Transaction Verification**: Verify Cosmos SDK transactions on Aura Network
- **QR Code Parsing**: Parse and validate Aura verification QR codes
- **Offline Mode**: Cache credentials and revocation lists for offline verification
- **Hash Utilities**: Support for SHA256, SHA512, and Keccak256 hashing
- **Address Derivation**: Derive blockchain addresses from public keys

#### Cryptography
- Ed25519 signature verification using @noble/ed25519
- secp256k1 signature verification using @noble/secp256k1
- Multiple hash algorithm support (SHA256, SHA512, Keccak256)
- Secure random number generation
- Time-constant comparison utilities

#### Network Integration
- Cosmos SDK integration via CosmJS
- Connection to Aura Network mainnet and testnet
- Automatic retry logic with exponential backoff
- Configurable timeouts and error handling
- RPC and REST endpoint support

#### Offline Capabilities
- Local credential caching with configurable TTL
- Revocation list synchronization
- Automatic and manual sync modes
- Multiple storage adapters (memory, browser, file, React Native)
- AES-256-GCM encryption for cached data
- Cache statistics and monitoring

#### QR Code Support
- Parse QR codes in URL format (`aura://verify?data=...`)
- Parse raw base64-encoded QR data
- Strict and lenient parsing modes
- Comprehensive validation
- Custom parser options
- Disclosure context validation

#### Error Handling
- Custom error hierarchy with specific error types
- Structured error codes for programmatic handling
- Detailed error messages and context
- Non-throwing variants for critical functions
- Error recovery utilities

#### Type Safety
- Full TypeScript support with strict type checking
- Comprehensive type definitions
- Type guards and validators
- Generic type parameters
- Well-documented interfaces

#### Documentation
- Complete getting started guide
- Detailed API reference
- Security best practices
- Offline mode documentation
- Error handling guide
- Real-world examples (bar age verification, marketplace trust)
- Verification flow explanation
- Contributing guidelines

#### Testing
- Comprehensive unit test suite using Vitest
- Integration tests for network operations
- Mock implementations for testing
- Code coverage reporting
- Continuous integration setup

#### Developer Experience
- ESM and CommonJS module support
- Tree-shaking support for smaller bundles
- Source maps for debugging
- TypeScript declaration files
- EditorConfig and Prettier configuration
- ESLint rules for code quality

### Security
- Implemented secure signature verification
- Added replay attack prevention with nonce tracking
- Enforced short expiration times for presentations
- Encrypted cache storage with AES-256-GCM
- HTTPS-only network communication
- Input validation and sanitization
- Rate limiting support
- Secure key management practices

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Compatibility

### Node.js
- **Minimum**: Node.js 18.0.0
- **Recommended**: Node.js 20.x LTS or 22.x

### Browsers
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

### Platforms
- Node.js (18+)
- Modern browsers
- React Native (via companion package)
- Flutter (via companion package)

## Dependencies

### Production Dependencies
- `@noble/ed25519`: ^2.0.0 - Ed25519 signature verification
- `@noble/secp256k1`: ^2.0.0 - secp256k1 signature verification
- `@noble/hashes`: ^1.3.3 - Cryptographic hash functions
- `@cosmjs/stargate`: ^0.32.2 - Cosmos SDK client
- `@cosmjs/proto-signing`: ^0.32.2 - Protocol buffer signing
- `@cosmjs/encoding`: ^0.32.2 - Encoding utilities
- `@cosmjs/crypto`: ^0.32.2 - Cryptographic utilities
- `protobufjs`: ^7.2.5 - Protocol buffer support

## Support

- **Issues**: [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
- **Discord**: [Aura Network Discord](https://discord.gg/aura)
- **Email**: dev@aura.network

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

[Unreleased]: https://github.com/aura-blockchain/aura-verifier-sdk/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/aura-blockchain/aura-verifier-sdk/releases/tag/v1.0.0
