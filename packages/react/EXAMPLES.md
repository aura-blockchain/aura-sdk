# React SDK Examples

This document provides comprehensive examples for using the Aura Verifier SDK React integration.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Verification Examples](#verification-examples)
- [Component Examples](#component-examples)
- [Advanced Patterns](#advanced-patterns)
- [Real-world Use Cases](#real-world-use-cases)

## Basic Setup

### Simple App with Provider

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuraVerifierProvider } from '@aura-network/verifier-sdk-react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuraVerifierProvider
      config={{
        network: 'mainnet',
        timeout: 10000,
      }}
    >
      <App />
    </AuraVerifierProvider>
  </React.StrictMode>
);
```

### Without Provider (Standalone)

```tsx
import { useAuraVerifier } from '@aura-network/verifier-sdk-react';

function StandaloneComponent() {
  const { verifier, isInitialized, error } = useAuraVerifier({
    network: 'mainnet',
  });

  if (!isInitialized) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Verifier ready!</div>;
}
```

## Verification Examples

### Basic QR Verification

```tsx
import { useVerification, VerificationBadge } from '@aura-network/verifier-sdk-react';

function BasicVerification() {
  const { result, loading, error, verify } = useVerification();
  const [qrInput, setQrInput] = React.useState('');

  const handleVerify = async () => {
    await verify(qrInput);
  };

  return (
    <div>
      <input
        value={qrInput}
        onChange={(e) => setQrInput(e.target.value)}
        placeholder="Enter QR code data"
      />
      <button onClick={handleVerify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>
      {error && <div style={{ color: 'red' }}>{error.message}</div>}
      <VerificationBadge result={result} showDetails />
    </div>
  );
}
```

### QR Scanner Integration

```tsx
import { useVerification, QRScanner, VerificationBadge } from '@aura-network/verifier-sdk-react';

function ScanAndVerify() {
  const { result, loading, verify, reset } = useVerification();
  const [scanning, setScanning] = React.useState(false);

  const handleScan = async (data: string) => {
    setScanning(false);
    await verify(data);
  };

  return (
    <div>
      {scanning ? (
        <>
          <QRScanner onScan={handleScan} width={400} height={400} showFrame />
          <button onClick={() => setScanning(false)}>Cancel</button>
        </>
      ) : (
        <>
          <button onClick={() => setScanning(true)}>Scan QR Code</button>
          {loading && <div>Verifying...</div>}
          <VerificationBadge result={result} showDetails />
          {result && <button onClick={reset}>Scan Another</button>}
        </>
      )}
    </div>
  );
}
```

### Age Verification

```tsx
import { useVerification, AgeBadge } from '@aura-network/verifier-sdk-react';
import { VCType } from '@aura-network/verifier-sdk';

function AgeVerification() {
  const { result, loading, verify } = useVerification({
    requiredVCTypes: [VCType.AGE_VERIFICATION],
  });

  const isOver21 = result?.attributes?.ageOver21 ?? false;
  const isOver18 = result?.attributes?.ageOver18 ?? false;

  return (
    <div>
      <button onClick={() => verify(qrData)} disabled={loading}>
        Verify Age
      </button>
      {result && (
        <div>
          <AgeBadge age={21} verified={isOver21} />
          <AgeBadge age={18} verified={isOver18} />
        </div>
      )}
    </div>
  );
}
```

## Component Examples

### Custom Verification Card

```tsx
import styled from '@emotion/styled';
import { useVerification, defaultTheme } from '@aura-network/verifier-sdk-react';

const Card = styled.div`
  padding: ${defaultTheme.spacing.lg};
  background: ${defaultTheme.colors.background.card};
  border-radius: ${defaultTheme.borderRadius.lg};
  box-shadow: ${defaultTheme.shadows.md};
`;

function VerificationCard({ qrData }: { qrData: string }) {
  const { result, loading, error, verify } = useVerification();

  React.useEffect(() => {
    verify(qrData);
  }, [qrData]);

  if (loading) return <Card>Verifying...</Card>;
  if (error) return <Card>Error: {error.message}</Card>;
  if (!result) return null;

  return (
    <Card>
      <h3>{result.isValid ? 'Verified ✓' : 'Invalid ✗'}</h3>
      <p>Holder: {result.holderDID}</p>
      <p>Credentials: {result.vcDetails.length}</p>
      <p>Method: {result.verificationMethod}</p>
    </Card>
  );
}
```

### Verification Dashboard

```tsx
import {
  useVerification,
  VerificationBadge,
  AuraScoreBadge,
  VerificationHistory,
} from '@aura-network/verifier-sdk-react';
import type { VerificationHistoryItem } from '@aura-network/verifier-sdk-react';

function Dashboard() {
  const { result, verify } = useVerification();
  const [history, setHistory] = React.useState<VerificationHistoryItem[]>([]);

  React.useEffect(() => {
    if (result) {
      const item: VerificationHistoryItem = {
        id: result.auditId,
        result,
        timestamp: new Date(),
        holderDID: result.holderDID,
        verificationMethod: result.verificationMethod,
      };
      setHistory((prev) => [item, ...prev]);
    }
  }, [result]);

  return (
    <div>
      <h1>Verification Dashboard</h1>
      <VerificationBadge result={result} size="lg" />
      {result && <AuraScoreBadge score={85} showLabel />}
      <VerificationHistory items={history} maxItems={5} />
    </div>
  );
}
```

### Credential Status Monitor

```tsx
import { useCredentialStatus } from '@aura-network/verifier-sdk-react';
import styled from '@emotion/styled';

const StatusIndicator = styled.div<{ status: string }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => {
    switch (props.status) {
      case 'active':
        return '#10B981';
      case 'revoked':
        return '#EF4444';
      case 'suspended':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  }};
  animation: pulse 2s infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

function StatusMonitor({ vcId }: { vcId: string }) {
  const { status, loading, lastUpdated, refresh } = useCredentialStatus(vcId, {
    refreshInterval: 30000,
    autoRefresh: true,
  });

  return (
    <div>
      <div>
        <StatusIndicator status={status || 'unknown'} />
        <span>Status: {status || 'Unknown'}</span>
      </div>
      <div>Last updated: {lastUpdated?.toLocaleString() || 'Never'}</div>
      <button onClick={refresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
```

## Advanced Patterns

### Multi-step Verification Flow

```tsx
import { useVerification } from '@aura-network/verifier-sdk-react';
import { VCType } from '@aura-network/verifier-sdk';

function MultiStepVerification() {
  const [step, setStep] = React.useState<'scan' | 'verify' | 'result'>('scan');
  const [qrData, setQrData] = React.useState('');
  const { result, loading, verify } = useVerification({
    requiredVCTypes: [VCType.PROOF_OF_HUMANITY, VCType.KYC],
  });

  const handleScan = (data: string) => {
    setQrData(data);
    setStep('verify');
  };

  const handleVerify = async () => {
    await verify(qrData);
    setStep('result');
  };

  return (
    <div>
      {step === 'scan' && (
        <QRScanner onScan={handleScan} />
      )}
      {step === 'verify' && (
        <div>
          <p>QR Code scanned. Ready to verify?</p>
          <button onClick={handleVerify} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Now'}
          </button>
        </div>
      )}
      {step === 'result' && (
        <div>
          <VerificationBadge result={result} showDetails />
          <button onClick={() => setStep('scan')}>Verify Another</button>
        </div>
      )}
    </div>
  );
}
```

### Offline Mode Toggle

```tsx
import { useOfflineMode } from '@aura-network/verifier-sdk-react';
import styled from '@emotion/styled';

const OfflineBanner = styled.div<{ isOffline: boolean }>`
  padding: 1rem;
  background: ${(props) => (props.isOffline ? '#FEF3C7' : '#D1FAE5')};
  color: ${(props) => (props.isOffline ? '#92400E' : '#065F46')};
  text-align: center;
`;

function OfflineModeControl() {
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
      <OfflineBanner isOffline={isOffline}>
        {isOffline ? '📴 Offline Mode' : '🌐 Online Mode'}
      </OfflineBanner>
      <div>
        <button onClick={toggleOffline}>
          Switch to {isOffline ? 'Online' : 'Offline'} Mode
        </button>
        {hasCachedData && <span>✓ Cached data available</span>}
        {lastSync && <div>Last sync: {lastSync.toLocaleString()}</div>}
        <button onClick={sync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}
```

## Real-world Use Cases

### Event Check-in System

```tsx
import {
  useVerification,
  QRScanner,
  VerificationBadge,
  VerificationHistory,
} from '@aura-network/verifier-sdk-react';
import type { VerificationHistoryItem } from '@aura-network/verifier-sdk-react';

function EventCheckIn() {
  const { result, verify, reset } = useVerification();
  const [attendees, setAttendees] = React.useState<VerificationHistoryItem[]>([]);
  const [scanning, setScanning] = React.useState(true);

  const handleCheckIn = async (qrData: string) => {
    await verify(qrData);
    setScanning(false);
  };

  React.useEffect(() => {
    if (result?.isValid) {
      const attendee: VerificationHistoryItem = {
        id: result.auditId,
        result,
        timestamp: new Date(),
        holderDID: result.holderDID,
        verificationMethod: result.verificationMethod,
      };
      setAttendees((prev) => [attendee, ...prev]);

      // Reset after 2 seconds
      setTimeout(() => {
        reset();
        setScanning(true);
      }, 2000);
    }
  }, [result]);

  return (
    <div>
      <h1>Event Check-in</h1>
      <div>Total Attendees: {attendees.length}</div>
      {scanning ? (
        <QRScanner onScan={handleCheckIn} showFrame />
      ) : (
        <VerificationBadge result={result} size="lg" showDetails />
      )}
      <VerificationHistory items={attendees} maxItems={10} />
    </div>
  );
}
```

### Age-Gated Content Access

```tsx
import { useVerification, AgeBadge } from '@aura-network/verifier-sdk-react';
import { VCType } from '@aura-network/verifier-sdk';

function AgeGatedContent({ requiredAge }: { requiredAge: 18 | 21 }) {
  const { result, loading, verify } = useVerification({
    requiredVCTypes: [VCType.AGE_VERIFICATION],
  });

  const ageKey = requiredAge === 21 ? 'ageOver21' : 'ageOver18';
  const isVerified = result?.isValid && result.attributes?.[ageKey];

  if (!result) {
    return (
      <div>
        <h2>Age Verification Required</h2>
        <p>You must be {requiredAge}+ to access this content.</p>
        <button onClick={() => verify(qrData)} disabled={loading}>
          Verify Age
        </button>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div>
        <AgeBadge age={requiredAge} verified={false} />
        <p>You do not meet the age requirement.</p>
      </div>
    );
  }

  return (
    <div>
      <AgeBadge age={requiredAge} verified={true} />
      <div>
        <h2>Welcome!</h2>
        <p>Your age has been verified. Enjoy the content!</p>
        {/* Protected content here */}
      </div>
    </div>
  );
}
```

### KYC Verification Portal

```tsx
import {
  useVerification,
  VerificationBadge,
  AuraScoreBadge,
} from '@aura-network/verifier-sdk-react';
import { VCType } from '@aura-network/verifier-sdk';

function KYCPortal() {
  const { result, loading, error, verify } = useVerification({
    requiredVCTypes: [VCType.KYC, VCType.GOVERNMENT_ID],
  });

  const calculateTrustScore = () => {
    if (!result?.isValid) return 0;
    let score = 50;
    if (result.signatureValid) score += 20;
    if (result.verificationMethod === 'online') score += 10;
    score += result.vcDetails.length * 5;
    return Math.min(100, score);
  };

  return (
    <div>
      <h1>KYC Verification Portal</h1>
      <button onClick={() => verify(qrData)} disabled={loading}>
        {loading ? 'Verifying...' : 'Start KYC Verification'}
      </button>

      {error && <div style={{ color: 'red' }}>{error.message}</div>}

      {result && (
        <>
          <VerificationBadge result={result} size="lg" showDetails />
          <AuraScoreBadge score={calculateTrustScore()} showLabel />

          {result.isValid && (
            <div>
              <h3>Verified Information</h3>
              <ul>
                <li>DID: {result.holderDID}</li>
                <li>Credentials: {result.vcDetails.length}</li>
                {result.attributes.fullName && (
                  <li>Name: {result.attributes.fullName}</li>
                )}
                {result.attributes.cityState && (
                  <li>Location: {result.attributes.cityState}</li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## TypeScript Examples

### Type-safe Custom Hook

```tsx
import { useVerification } from '@aura-network/verifier-sdk-react';
import type {
  VerificationResult,
  VCType,
} from '@aura-network/verifier-sdk';

interface UseTypedVerificationOptions {
  requiredTypes: VCType[];
  onSuccess?: (result: VerificationResult) => void;
  onError?: (error: Error) => void;
}

function useTypedVerification(options: UseTypedVerificationOptions) {
  const { result, loading, error, verify } = useVerification({
    requiredVCTypes: options.requiredTypes,
  });

  React.useEffect(() => {
    if (result?.isValid && options.onSuccess) {
      options.onSuccess(result);
    }
  }, [result]);

  React.useEffect(() => {
    if (error && options.onError) {
      options.onError(error);
    }
  }, [error]);

  return { result, loading, error, verify };
}
```

## Error Handling Examples

### Comprehensive Error Handling

```tsx
import { useVerification } from '@aura-network/verifier-sdk-react';

function ErrorHandlingExample() {
  const { result, loading, error, verify } = useVerification();
  const [userMessage, setUserMessage] = React.useState('');

  const handleVerify = async (qrData: string) => {
    try {
      await verify(qrData);
      setUserMessage('Verification successful!');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('expired')) {
          setUserMessage('QR code has expired. Please generate a new one.');
        } else if (err.message.includes('network')) {
          setUserMessage('Network error. Please check your connection.');
        } else {
          setUserMessage('Verification failed. Please try again.');
        }
      }
    }
  };

  return (
    <div>
      <button onClick={() => handleVerify(qrData)} disabled={loading}>
        Verify
      </button>
      {userMessage && <div>{userMessage}</div>}
      {error && <div style={{ color: 'red' }}>{error.message}</div>}
    </div>
  );
}
```
