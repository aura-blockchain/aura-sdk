# Aura Verifier SDK - React Package Summary

## Overview

Complete React integration package for the Aura Network Verifier SDK, providing hooks, components, and utilities for seamless credential verification in React applications.

## Package Information

- **Name:** `@aura-network/verifier-sdk-react`
- **Version:** 1.0.0
- **License:** MIT
- **Dependencies:**
  - `@aura-network/verifier-sdk` (workspace:*)
  - `@emotion/react` ^11.11.3
  - `@emotion/styled` ^11.11.0
- **Peer Dependencies:**
  - `react` ^18.0.0 || ^19.0.0
  - `react-dom` ^18.0.0 || ^19.0.0

## Project Structure

```
packages/react/
├── src/
│   ├── components/           # React components
│   │   ├── AgeBadge.tsx
│   │   ├── AuraScoreBadge.tsx
│   │   ├── QRScanner.tsx
│   │   ├── VerificationBadge.tsx
│   │   ├── VerificationHistory.tsx
│   │   └── index.ts
│   ├── context/              # React context
│   │   └── AuraVerifierContext.tsx
│   ├── hooks/                # Custom hooks
│   │   ├── __tests__/
│   │   │   └── useVerification.test.tsx
│   │   ├── useAuraVerifier.ts
│   │   ├── useCredentialStatus.ts
│   │   ├── useOfflineMode.ts
│   │   ├── useVerification.ts
│   │   └── index.ts
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   ├── utils/                # Utility functions
│   │   └── theme.ts
│   ├── __tests__/            # Test setup
│   │   └── setup.ts
│   └── index.ts              # Main entry point
├── .eslintrc.json
├── .gitignore
├── CHANGELOG.md
├── EXAMPLES.md
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

## Features

### React Hooks (4)

1. **useAuraVerifier** - Initialize and manage verifier instance
   - Returns: verifier, isInitialized, error, reinitialize
   - Use case: Direct verifier instance management

2. **useVerification** - Verify QR codes with loading/error states
   - Returns: result, loading, error, verify, reset
   - Use case: QR code verification with automatic state management

3. **useCredentialStatus** - Real-time credential status monitoring
   - Returns: status, loading, error, refresh, lastUpdated
   - Features: Auto-refresh, configurable intervals

4. **useOfflineMode** - Manage offline verification mode
   - Returns: isOffline, toggleOffline, setOffline, hasCachedData, lastSync, sync, syncing
   - Use case: Offline/online mode switching and cache management

### React Components (6)

1. **AuraVerifierProvider** - Context provider for SDK configuration
   - Props: config, children, onError
   - Purpose: Wrap app to provide verifier instance to all child components

2. **VerificationBadge** - Display verification results
   - Props: result, size, variant, showDetails
   - Variants: solid, outline, subtle
   - Sizes: sm, md, lg

3. **AgeBadge** - Age verification badge
   - Props: age (18|21), verified, size, variant
   - Visual: Shows checkmark/cross with age requirement

4. **AuraScoreBadge** - Trust score display
   - Props: score (0-100), size, variant, showLabel
   - Features: Color-coded by score, progress bar

5. **QRScanner** - Camera-based QR code scanner
   - Props: onScan, onError, facingMode, width, height, showFrame
   - Features: Camera access, scan frame overlay, error handling
   - Note: Requires additional QR decoding library for production

6. **VerificationHistory** - Verification history list
   - Props: items, onItemClick, maxItems, emptyMessage
   - Features: Clickable items, truncated DIDs, relative timestamps

### Styling & Theming

- **Engine:** Emotion CSS-in-JS
- **Theme:** Aura brand colors
  - Primary: #6B46C1 (Purple)
  - Secondary: #14B8A6 (Teal)
  - Success: #10B981 (Green)
  - Error: #EF4444 (Red)
  - Warning: #F59E0B (Amber)

### TypeScript Support

- Full type definitions for all exports
- Type-safe props and return values
- Exported types for custom implementations
- Generic types for flexibility

### Testing

- Vitest for unit testing
- React Testing Library integration
- JSDOM environment
- Mock setup for MediaDevices
- Example test for useVerification hook

## Usage Examples

### Basic Setup

```tsx
import { AuraVerifierProvider } from '@aura-network/verifier-sdk-react';

<AuraVerifierProvider config={{ network: 'mainnet' }}>
  <App />
</AuraVerifierProvider>
```

### QR Verification

```tsx
import { useVerification, VerificationBadge } from '@aura-network/verifier-sdk-react';

function MyComponent() {
  const { result, loading, verify } = useVerification();

  return (
    <>
      <button onClick={() => verify(qrData)}>Verify</button>
      <VerificationBadge result={result} showDetails />
    </>
  );
}
```

### Status Monitoring

```tsx
import { useCredentialStatus } from '@aura-network/verifier-sdk-react';

function StatusMonitor({ vcId }) {
  const { status, refresh } = useCredentialStatus(vcId, {
    refreshInterval: 60000,
    autoRefresh: true,
  });

  return <div>Status: {status}</div>;
}
```

## Build System

- **TypeScript:** Strict mode enabled
- **Output:** ESM (index.js) and CJS (index.cjs)
- **Type Declarations:** .d.ts files generated
- **Source Maps:** Enabled for debugging

## Scripts

```bash
npm run build          # Build for production
npm run dev            # Watch mode for development
npm run test           # Run tests
npm run test:watch     # Watch mode for tests
npm run test:coverage  # Generate coverage report
npm run typecheck      # TypeScript type checking
npm run lint           # Lint code
npm run lint:fix       # Auto-fix lint issues
npm run clean          # Remove build artifacts
```

## Documentation

1. **README.md** - Installation, API reference, examples
2. **EXAMPLES.md** - Comprehensive real-world examples
3. **CHANGELOG.md** - Version history and changes
4. **Inline JSDoc** - API documentation in code

## Real-world Use Cases Covered

1. Event check-in systems
2. Age-gated content access
3. KYC verification portals
4. Multi-step verification flows
5. Offline mode scenarios
6. Batch verification
7. Verification history tracking
8. Real-time status monitoring

## Integration Points

- Works with Next.js, Vite, Create React App
- Server-side rendering compatible (with proper checks)
- Mobile responsive components
- Accessible components with ARIA attributes
- Error boundary compatible

## Next Steps

1. Install dependencies: `npm install`
2. Build package: `npm run build`
3. Run tests: `npm run test`
4. Update workspace to include react package
5. Create example app using the components

## Notes

- **QRScanner** component is a reference implementation and requires a QR decoding library (jsqr, html5-qrcode) for production use
- All hooks that access the verifier must be used within an AuraVerifierProvider or will throw an error
- Components are styled with Emotion but can be customized via className and style props
- Offline mode features depend on core SDK implementation of cache methods
- Real-time status monitoring uses polling (not WebSockets)

## Dependencies Version Notes

- React 18+ required for hooks and concurrent features
- Emotion for CSS-in-JS (alternative to styled-components)
- Core SDK version must match (workspace:*)
- TypeScript 5.3+ for type safety

## Browser Support

- Modern browsers with ES2022+ support
- Camera API required for QRScanner
- LocalStorage for offline caching (via core SDK)
- No IE11 support
