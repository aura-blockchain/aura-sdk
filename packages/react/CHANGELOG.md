# Changelog

All notable changes to the React SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-30

### Added

#### Hooks

- `useAuraVerifier` - Initialize and manage verifier instance
- `useVerification` - Verify QR codes with loading/error states
- `useCredentialStatus` - Real-time credential status monitoring
- `useOfflineMode` - Manage offline verification mode

#### Components

- `AuraVerifierProvider` - Context provider for SDK configuration
- `VerificationBadge` - Display verification results with customizable styling
- `AgeBadge` - Age verification badge (18+ or 21+)
- `AuraScoreBadge` - Trust score display with progress bar
- `QRScanner` - QR code scanner using device camera
- `VerificationHistory` - List component for verification history

#### Features

- Full TypeScript support with comprehensive type definitions
- Styled with Emotion CSS-in-JS
- Aura brand theme with customizable colors
- Support for React 18+ and 19
- Auto-refresh for credential status monitoring
- Offline mode with cache synchronization
- Error handling and loading states
- Multiple badge variants (solid, outline, subtle)
- Multiple size options (sm, md, lg)

#### Documentation

- Comprehensive README with installation and usage guide
- EXAMPLES.md with real-world use cases
- TypeScript type definitions
- Inline JSDoc comments for all exports

### Dependencies

- `@aura-network/verifier-sdk` - Core SDK dependency
- `@emotion/react` - CSS-in-JS styling
- `@emotion/styled` - Styled components
- React 18+ as peer dependency

### Development

- Vitest for testing
- ESLint configuration for React
- TypeScript strict mode
- Build configuration for ESM and CJS

[1.0.0]: https://github.com/aura-blockchain/aura-verifier-sdk/releases/tag/react-v1.0.0
