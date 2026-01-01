# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-30

### Added
- Initial release of Aura Verifier SDK for Flutter
- Basic credential verification via QR codes
- Support for mainnet, testnet, and local networks
- Quick verification helpers (`isAge21Plus`, `isAge18Plus`, `isVerifiedHuman`)
- QR code parsing and validation
- Credential status checking
- Enhanced verifier with offline mode support
- Credential caching with configurable TTL
- Event streaming for verification monitoring
- Batch verification support with concurrency control
- Built-in QR scanner widget (`AuraQRScanner`)
- Full-screen QR scanner page (`AuraQRScannerPage`)
- iOS native implementation in Swift
- Android native implementation in Kotlin
- Comprehensive type definitions
- Error handling with specific error codes
- Unit tests for core functionality
- Example app demonstrating all features
- Complete API documentation

### Features
- **Verification Methods**
  - Online verification against blockchain
  - Offline verification using cached data
  - Cached result retrieval

- **QR Code Support**
  - Parse QR codes with or without URL prefix
  - Validate QR code format and expiration
  - Extract credential information

- **Caching**
  - DID document caching
  - VC status caching
  - Verification result caching
  - Persistent storage option
  - Configurable cache size and TTL

- **Security**
  - Nonce-based replay protection
  - Signature verification
  - Secure credential storage
  - HTTPS-only network requests

- **Platform Support**
  - iOS 12.0+
  - Android API 21+
  - Web (limited)
  - macOS
  - Linux
  - Windows

### Dependencies
- `flutter` - Flutter SDK
- `http` ^1.1.0 - HTTP client
- `shared_preferences` ^2.2.2 - Local storage
- `mobile_scanner` ^4.0.0 - QR code scanning
- `path_provider` ^2.1.0 - File system paths
- `crypto` ^3.0.3 - Cryptographic operations

### Documentation
- Comprehensive README with examples
- API reference documentation
- Example app with common use cases
- Migration guide from other SDKs
- Security best practices

## [Unreleased]

### Planned
- gRPC support for faster network calls
- WebAssembly compilation for web
- Biometric verification integration
- Advanced analytics and reporting
- Support for additional credential types
- Credential revocation list caching
- Background sync for offline mode
- Push notification support for credential updates

---

[1.0.0]: https://github.com/aura-blockchain/aura-verifier-sdk/releases/tag/flutter-v1.0.0
