# @aura-network/verifier-sdk-react

React integration for Aura Network Verifier SDK. Provides hooks and components for easy integration of credential verification into React applications.

## Features

- **React Hooks** for verifier instance management, verification, and status checking
- **Pre-built Components** with Aura-themed styling
- **TypeScript Support** with full type definitions
- **Styled with Emotion** for flexible theming
- **Offline Mode Support** for offline verification
- **Real-time Status Updates** for credential monitoring

## Installation

```bash
npm install @aura-network/verifier-sdk-react
# or
yarn add @aura-network/verifier-sdk-react
# or
pnpm add @aura-network/verifier-sdk-react
```

## Quick Start

### 1. Wrap your app with AuraVerifierProvider

```tsx
import { AuraVerifierProvider } from '@aura-network/verifier-sdk-react';

function App() {
  return (
    <AuraVerifierProvider
      config={{
        network: 'mainnet',
        timeout: 10000,
      }}
    >
      <YourApp />
    </AuraVerifierProvider>
  );
}
```

### 2. Use hooks and components

```tsx
import {
  useVerification,
  VerificationBadge,
  QRScanner,
} from '@aura-network/verifier-sdk-react';

function VerifyComponent() {
  const { result, loading, error, verify } = useVerification();

  const handleScan = async (qrData: string) => {
    await verify(qrData);
  };

  if (loading) return <div>Verifying...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <QRScanner onScan={handleScan} />
      <VerificationBadge result={result} showDetails />
    </div>
  );
}
```

## React Hooks

### useAuraVerifier

Initialize and manage the verifier instance directly (alternative to Provider).

```tsx
import { useAuraVerifier } from '@aura-network/verifier-sdk-react';

function MyComponent() {
  const { verifier, isInitialized, error } = useAuraVerifier({
    network: 'mainnet',
    timeout: 10000,
  });

  if (!isInitialized) return <div>Initializing...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // Use verifier instance directly
  return <div>Ready to verify!</div>;
}
```

### useVerification

Verify QR codes with loading and error states.

```tsx
import { useVerification } from '@aura-network/verifier-sdk-react';
import { VCType } from '@aura-network/verifier-sdk';

function VerifyButton() {
  const { result, loading, error, verify, reset } = useVerification({
    requiredVCTypes: [VCType.PROOF_OF_HUMANITY],
    verifierAddress: 'aura1...',
  });

  const handleVerify = async () => {
    await verify(qrCodeData);
  };

  return (
    <div>
      <button onClick={handleVerify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>
      {error && <div>Error: {error.message}</div>}
      {result?.isValid && <div>Verified!</div>}
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### useCredentialStatus

Monitor credential status with real-time updates.

```tsx
import { useCredentialStatus } from '@aura-network/verifier-sdk-react';

function StatusMonitor({ vcId }: { vcId: string }) {
  const { status, loading, error, refresh, lastUpdated } = useCredentialStatus(
    vcId,
    {
      refreshInterval: 60000, // Check every minute
      autoRefresh: true,
    }
  );

  return (
    <div>
      <div>Status: {status}</div>
      <div>Last updated: {lastUpdated?.toLocaleString()}</div>
      <button onClick={refresh} disabled={loading}>
        Refresh
      </button>
    </div>
  );
}
```

### useOfflineMode

Manage offline verification mode.

```tsx
import { useOfflineMode } from '@aura-network/verifier-sdk-react';

function OfflineControls() {
  const {
    isOffline,
    toggleOffline,
    hasCachedData,
    lastSync,
    sync,
    syncing,
  } = useOfflineMode();

  return (
    <div>
      <button onClick={toggleOffline}>
        {isOffline ? 'Go Online' : 'Go Offline'}
      </button>
      {hasCachedData && <span>✓ Cached data available</span>}
      {lastSync && <div>Last sync: {lastSync.toLocaleString()}</div>}
      <button onClick={sync} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
```

## Components

### VerificationBadge

Display verification results with customizable styling.

```tsx
import { VerificationBadge } from '@aura-network/verifier-sdk-react';

<VerificationBadge
  result={verificationResult}
  size="md" // 'sm' | 'md' | 'lg'
  variant="solid" // 'solid' | 'outline' | 'subtle'
  showDetails
/>
```

### AgeBadge

Display age verification status.

```tsx
import { AgeBadge } from '@aura-network/verifier-sdk-react';

<AgeBadge
  age={21} // 18 or 21
  verified={true}
  size="md"
  variant="solid"
/>
```

### AuraScoreBadge

Display Aura trust score.

```tsx
import { AuraScoreBadge } from '@aura-network/verifier-sdk-react';

<AuraScoreBadge
  score={85} // 0-100
  size="md"
  variant="solid"
  showLabel
/>
```

### QRScanner

Scan QR codes using the device camera.

```tsx
import { QRScanner } from '@aura-network/verifier-sdk-react';

<QRScanner
  onScan={(data) => console.log('Scanned:', data)}
  onError={(error) => console.error('Error:', error)}
  facingMode="environment" // 'user' | 'environment'
  width={400}
  height={400}
  showFrame
/>
```

**Note:** QRScanner requires additional QR decoding library like `jsqr` or `html5-qrcode` for production use.

### VerificationHistory

Display a list of past verifications.

```tsx
import { VerificationHistory } from '@aura-network/verifier-sdk-react';

<VerificationHistory
  items={historyItems}
  onItemClick={(item) => console.log('Clicked:', item)}
  maxItems={10}
  emptyMessage="No verifications yet"
/>
```

## Theming

The package uses Emotion for styling with a default Aura theme. You can customize colors and styles:

```tsx
import { defaultTheme } from '@aura-network/verifier-sdk-react';

console.log(defaultTheme.colors.primary); // '#6B46C1'
console.log(defaultTheme.colors.secondary); // '#14B8A6'
console.log(defaultTheme.colors.success); // '#10B981'
console.log(defaultTheme.colors.error); // '#EF4444'
```

### Default Theme Colors

- **Primary:** `#6B46C1` (Purple)
- **Secondary:** `#14B8A6` (Teal)
- **Success:** `#10B981` (Green)
- **Error:** `#EF4444` (Red)
- **Warning:** `#F59E0B` (Amber)

## Advanced Usage

### Error Handling

```tsx
import { AuraVerifierProvider } from '@aura-network/verifier-sdk-react';

function App() {
  const handleError = (error: Error) => {
    console.error('Verifier error:', error);
    // Send to error tracking service
  };

  return (
    <AuraVerifierProvider
      config={{ network: 'mainnet' }}
      onError={handleError}
    >
      <YourApp />
    </AuraVerifierProvider>
  );
}
```

### Batch Verification

```tsx
import { useAuraVerifierContext } from '@aura-network/verifier-sdk-react';

function BatchVerify() {
  const { verifier } = useAuraVerifierContext();
  const [results, setResults] = useState([]);

  const verifyBatch = async (qrCodes: string[]) => {
    const results = await Promise.all(
      qrCodes.map((qrData) =>
        verifier?.verify({ qrCodeData: qrData })
      )
    );
    setResults(results);
  };

  return (
    <div>
      <button onClick={() => verifyBatch(qrCodeList)}>
        Verify All
      </button>
      {results.map((result, i) => (
        <VerificationBadge key={i} result={result} />
      ))}
    </div>
  );
}
```

### Custom Verification Options

```tsx
import { useVerification } from '@aura-network/verifier-sdk-react';
import { VCType } from '@aura-network/verifier-sdk';

function CustomVerify() {
  const { verify } = useVerification({
    requiredVCTypes: [VCType.KYC, VCType.AGE_VERIFICATION],
    maxCredentialAge: 86400, // 24 hours
    verifierAddress: 'aura1...',
    offlineOnly: false,
  });

  return <button onClick={() => verify(qrData)}>Verify</button>;
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import type {
  VerificationResult,
  VerificationState,
  AuraVerifierConfig,
  VerificationHistoryItem,
} from '@aura-network/verifier-sdk-react';

const config: AuraVerifierConfig = {
  network: 'mainnet',
  timeout: 10000,
  offlineMode: false,
};

const handleResult = (result: VerificationResult) => {
  if (result.isValid) {
    console.log('Holder DID:', result.holderDID);
    console.log('Credentials:', result.vcDetails);
  }
};
```

## Browser Compatibility

- Modern browsers with ES2022 support
- React 18.0.0 or higher
- Camera access required for QRScanner component

## License

MIT

## Links

- [GitHub Repository](https://github.com/aura-blockchain/aura-verifier-sdk)
- [Documentation](https://github.com/aura-blockchain/aura-verifier-sdk#readme)
- [Core SDK](https://www.npmjs.com/package/@aura-network/verifier-sdk)
- [Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## Support

For questions and support, please open an issue on [GitHub](https://github.com/aura-blockchain/aura-verifier-sdk/issues).
