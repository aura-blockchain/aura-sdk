# Bar/Nightclub Age Verification Example

Complete implementation guide for using the Aura Verifier SDK in bars, nightclubs, and age-restricted venues.

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [UI Recommendations](#ui-recommendations)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This example demonstrates how to implement age verification for a bar or nightclub using the Aura Verifier SDK. The system allows:

- **Fast Entry**: Scan QR code in under 2 seconds
- **Privacy-Preserving**: Only verify age > 21, don't store personal data
- **Offline Capable**: Works even with poor internet connectivity
- **Audit Trail**: Log verification events for compliance

**User Flow:**
1. Customer approaches door
2. Bouncer requests ID
3. Customer opens Aura app and generates age-verification QR code
4. Bouncer scans QR code with tablet/phone
5. System verifies signature and checks age
6. Entry granted or denied

## Requirements

### Hardware
- **Scanner Device**: Tablet or smartphone with camera
- **Network**: WiFi or cellular (optional with offline mode)
- **Optional**: Dedicated QR code scanner hardware

### Software
- Node.js 18+ or modern web browser
- Aura Verifier SDK
- QR code scanner library
- (Optional) React/Vue/Angular for UI

### Legal
- Compliance with local age verification laws
- GDPR/privacy law compliance for data handling
- Proper consent and disclosure

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│   Customer   │────1───>│   Scanner    │────3───>│  Aura SDK   │
│  (QR Code)   │<───2────│   (Tablet)   │<───4────│  (Verify)   │
└──────────────┘         └──────────────┘         └─────────────┘
                                │                         │
                                │                         │
                                5                         6
                                │                         │
                                v                         v
                         ┌──────────────┐         ┌─────────────┐
                         │  Local DB    │         │ Blockchain  │
                         │  (Audit Log) │         │  (Revoke)   │
                         └──────────────┘         └─────────────┘

1. Customer shows QR code
2. Display result (allow/deny)
3. Parse and verify QR code
4. Return verification result
5. Log verification event
6. Check revocation status
```

## Implementation

### Step 1: Install Dependencies

```bash
npm install @aura-network/verifier-sdk
npm install html5-qrcode  # QR scanner for web
npm install express        # Optional: backend server
```

### Step 2: Initialize SDK

```typescript
// verifier.ts
import { VerifierSDK, CacheManager } from '@aura-network/verifier-sdk';

// Setup cache for offline mode
const cache = new CacheManager({
  maxAge: 3600,              // 1 hour
  maxEntries: 2000,          // 2000 credentials
  persistToDisk: true,
  storageAdapter: 'browser'  // Use localStorage
});

// Initialize SDK
export const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
  cache: cache,
  offlineMode: false,        // Try online first
  timeout: 10000             // 10 second timeout
});
```

### Step 3: Implement Age Verification

```typescript
// age-verifier.ts
import { verifier } from './verifier';
import { parseQRCode } from '@aura-network/verifier-sdk';

interface AgeVerificationResult {
  allowed: boolean;
  reason: string;
  userMessage: string;
  metadata?: {
    holderDid: string;
    verificationType: string;
    timestamp: Date;
  };
}

export async function verifyAge21Plus(
  qrString: string
): Promise<AgeVerificationResult> {
  try {
    // Step 1: Parse QR code
    const qrData = parseQRCode(qrString);

    // Step 2: Check expiration (presentations should be very recent)
    const now = Math.floor(Date.now() / 1000);
    if (qrData.exp < now) {
      return {
        allowed: false,
        reason: 'EXPIRED',
        userMessage: 'QR code expired. Please generate a new one.'
      };
    }

    // Don't accept QR codes valid for more than 5 minutes
    if (qrData.exp > now + 300) {
      return {
        allowed: false,
        reason: 'INVALID_EXPIRATION',
        userMessage: 'Invalid QR code expiration time.'
      };
    }

    // Step 3: Verify age disclosure
    if (!qrData.ctx.show_age_over_21) {
      return {
        allowed: false,
        reason: 'MISSING_AGE_VERIFICATION',
        userMessage: 'Please share age verification to enter.'
      };
    }

    // Step 4: Verify signature
    const message = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    });

    const sigResult = await verifier.verifySignature({
      publicKey: qrData.h,
      message: message,
      signature: qrData.sig,
      algorithm: 'ed25519'
    });

    if (!sigResult.valid) {
      return {
        allowed: false,
        reason: 'INVALID_SIGNATURE',
        userMessage: 'Could not verify credential. Please try again.'
      };
    }

    // Step 5: Success - allow entry
    return {
      allowed: true,
      reason: 'VERIFIED',
      userMessage: 'Age verified. Welcome!',
      metadata: {
        holderDid: qrData.h,
        verificationType: 'age_over_21',
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('Age verification error:', error);

    return {
      allowed: false,
      reason: 'VERIFICATION_ERROR',
      userMessage: 'Verification failed. Please try again or see staff.'
    };
  }
}
```

### Step 4: Add Audit Logging

```typescript
// audit-logger.ts
import { AgeVerificationResult } from './age-verifier';

interface AuditLogEntry {
  timestamp: Date;
  verificationType: string;
  result: 'allowed' | 'denied';
  reason: string;
  holderDid?: string;
  deviceId: string;
  location: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];

  log(result: AgeVerificationResult, deviceId: string, location: string) {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      verificationType: 'age_21_plus',
      result: result.allowed ? 'allowed' : 'denied',
      reason: result.reason,
      holderDid: result.metadata?.holderDid,
      deviceId: deviceId,
      location: location
    };

    // Store in memory
    this.logs.push(entry);

    // Store in local storage
    this.saveToLocalStorage(entry);

    // Send to backend (async)
    this.sendToBackend(entry).catch(console.error);

    // Log to console (development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', entry);
    }
  }

  private saveToLocalStorage(entry: AuditLogEntry) {
    const key = `audit_${entry.timestamp.getTime()}`;
    localStorage.setItem(key, JSON.stringify(entry));

    // Clean old entries (keep last 1000)
    this.cleanOldEntries();
  }

  private async sendToBackend(entry: AuditLogEntry) {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send audit log to backend:', error);
    }
  }

  private cleanOldEntries() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('audit_'))
      .sort();

    if (keys.length > 1000) {
      const toDelete = keys.slice(0, keys.length - 1000);
      toDelete.forEach(k => localStorage.removeItem(k));
    }
  }

  getLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  getStats() {
    const total = this.logs.length;
    const allowed = this.logs.filter(l => l.result === 'allowed').length;
    const denied = this.logs.filter(l => l.result === 'denied').length;

    return {
      total,
      allowed,
      denied,
      allowedPercent: total > 0 ? (allowed / total * 100).toFixed(1) : '0'
    };
  }
}

export const auditLogger = new AuditLogger();
```

### Step 5: Create Scanner UI Component

```typescript
// scanner-component.tsx
import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { verifyAge21Plus } from './age-verifier';
import { auditLogger } from './audit-logger';

export function AgeVerificationScanner() {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner.clear();
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    setScanning(false);
    setLoading(true);

    try {
      const verificationResult = await verifyAge21Plus(decodedText);

      // Log the verification
      auditLogger.log(
        verificationResult,
        'tablet-001',
        'main-entrance'
      );

      // Show result
      setResult(verificationResult);

      // Auto-reset after 3 seconds
      setTimeout(() => {
        setResult(null);
        setScanning(true);
      }, 3000);

    } catch (error) {
      console.error('Verification failed:', error);
      setResult({
        allowed: false,
        userMessage: 'Verification error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const onScanError = (error: any) => {
    // Ignore scan errors (usually just "no QR code found")
  };

  return (
    <div className="scanner-container">
      <h1>Age Verification Scanner</h1>

      {scanning && !result && (
        <div>
          <div id="qr-reader"></div>
          <p>Point camera at customer's QR code</p>
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Verifying...</p>
        </div>
      )}

      {result && (
        <div className={`result ${result.allowed ? 'allowed' : 'denied'}`}>
          <div className="result-icon">
            {result.allowed ? '✓' : '✗'}
          </div>
          <h2>{result.allowed ? 'ENTRY ALLOWED' : 'ENTRY DENIED'}</h2>
          <p>{result.userMessage}</p>
        </div>
      )}

      <div className="stats">
        <button onClick={() => {
          const stats = auditLogger.getStats();
          alert(`Today: ${stats.total} scans (${stats.allowedPercent}% allowed)`);
        }}>
          View Stats
        </button>
      </div>
    </div>
  );
}
```

## UI Recommendations

### Visual Feedback

**Large, Clear Results:**
```css
.result {
  font-size: 48px;
  padding: 60px;
  text-align: center;
  border-radius: 20px;
  animation: slideIn 0.3s ease-out;
}

.result.allowed {
  background-color: #4CAF50;
  color: white;
}

.result.denied {
  background-color: #f44336;
  color: white;
}

.result-icon {
  font-size: 120px;
  margin-bottom: 20px;
}
```

**Loading State:**
```css
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner {
  border: 8px solid #f3f3f3;
  border-top: 8px solid #3498db;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Sound Effects (Optional)

```typescript
// sounds.ts
const allowedSound = new Audio('/sounds/success.mp3');
const deniedSound = new Audio('/sounds/error.mp3');

export function playResultSound(allowed: boolean) {
  const sound = allowed ? allowedSound : deniedSound;
  sound.play().catch(console.error);
}

// Usage in component
if (result.allowed) {
  playResultSound(true);
} else {
  playResultSound(false);
}
```

### Tablet Optimization

```css
/* Full-screen, high-contrast design for tablets */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.scanner-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Large tap targets for bouncers wearing gloves */
button {
  min-width: 200px;
  min-height: 60px;
  font-size: 24px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
}

/* High contrast QR scanning area */
#qr-reader {
  border: 4px solid white;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}
```

## Code Examples

### Complete Working Example

```typescript
// index.ts - Complete age verification system
import express from 'express';
import { VerifierSDK, CacheManager, parseQRCode } from '@aura-network/verifier-sdk';

const app = express();
app.use(express.json());

// Initialize SDK
const cache = new CacheManager({
  maxAge: 3600,
  maxEntries: 2000,
  persistToDisk: true,
  storageAdapter: 'file',
  storagePath: './cache'
});

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
  cache: cache,
  timeout: 10000
});

// In-memory audit log
const auditLog: any[] = [];

// API endpoint for age verification
app.post('/api/verify-age', async (req, res) => {
  const { qrString, deviceId, location } = req.body;

  try {
    // Parse QR code
    const qrData = parseQRCode(qrString);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (qrData.exp < now) {
      return res.json({
        allowed: false,
        reason: 'EXPIRED',
        userMessage: 'QR code expired'
      });
    }

    // Check age disclosure
    if (!qrData.ctx.show_age_over_21) {
      return res.json({
        allowed: false,
        reason: 'MISSING_AGE_VERIFICATION',
        userMessage: 'Age verification not provided'
      });
    }

    // Verify signature
    const message = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    });

    const sigResult = await verifier.verifySignature({
      publicKey: qrData.h,
      message: message,
      signature: qrData.sig,
      algorithm: 'ed25519'
    });

    const allowed = sigResult.valid;
    const result = {
      allowed,
      reason: allowed ? 'VERIFIED' : 'INVALID_SIGNATURE',
      userMessage: allowed ? 'Age verified!' : 'Verification failed'
    };

    // Audit log
    auditLog.push({
      timestamp: new Date(),
      deviceId,
      location,
      result: allowed ? 'allowed' : 'denied',
      holderDid: qrData.h
    });

    res.json(result);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      allowed: false,
      reason: 'ERROR',
      userMessage: 'Verification error'
    });
  }
});

// API endpoint for stats
app.get('/api/stats', (req, res) => {
  const total = auditLog.length;
  const allowed = auditLog.filter(l => l.result === 'allowed').length;
  const denied = auditLog.filter(l => l.result === 'denied').length;

  res.json({
    total,
    allowed,
    denied,
    allowedPercent: total > 0 ? (allowed / total * 100).toFixed(1) : '0'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Age verification server running on port ${PORT}`);
});
```

## Best Practices

### 1. Fast Scanning

```typescript
// Use short timeout for quick response
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
  timeout: 5000  // 5 seconds max
});

// Cache aggressively for speed
const cache = new CacheManager({
  maxAge: 7200,      // 2 hours
  maxEntries: 5000   // More entries = more hits
});
```

### 2. Offline Mode for Busy Hours

```typescript
// Pre-sync before peak hours
async function prepareForPeakHours() {
  console.log('Pre-syncing for peak hours...');
  await syncManager.syncAll();
  console.log('Ready for offline operation');
}

// Run at 8 PM before Friday night rush
schedule('0 20 * * 5', prepareForPeakHours);
```

### 3. Privacy Protection

```typescript
// Never log full credential data
auditLogger.log({
  allowed: true,
  holderDid: 'did:aura:mainnet:xyz123', // OK - public identifier
  // DON'T LOG:
  // - Full name
  // - Exact age
  // - Address
  // - Any PII
});

// Auto-delete old logs
setInterval(() => {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
  auditLog = auditLog.filter(log => log.timestamp > cutoff);
}, 24 * 60 * 60 * 1000); // Daily cleanup
```

### 4. Security

```typescript
// Detect replay attacks
const usedNonces = new Set<number>();

function checkReplayAttack(qrData: QRCodeData): boolean {
  if (usedNonces.has(qrData.n)) {
    console.error('Replay attack detected!');
    return true;
  }

  usedNonces.add(qrData.n);

  // Clean up after expiration
  setTimeout(() => usedNonces.delete(qrData.n),
    (qrData.exp - Date.now() / 1000 + 60) * 1000
  );

  return false;
}
```

### 5. Error Recovery

```typescript
// Graceful degradation
async function verifyWithFallback(qrString: string) {
  try {
    // Try online verification
    return await verifyAge21Plus(qrString);
  } catch (error) {
    if (error instanceof RpcConnectionError) {
      // Fall back to offline mode
      console.warn('Network error - using offline mode');
      verifier.setOfflineMode(true);
      return await verifyAge21Plus(qrString);
    }
    throw error;
  }
}
```

## Troubleshooting

### Issue: Slow Verification

**Symptoms:** Takes > 5 seconds to verify

**Solutions:**
1. Enable offline mode and sync regularly
2. Use faster RPC endpoint (check latency)
3. Increase cache size and duration
4. Check network connectivity

### Issue: High False Negatives

**Symptoms:** Valid credentials being rejected

**Solutions:**
1. Check message construction matches holder's app
2. Verify algorithm is 'ed25519'
3. Ensure clock is synchronized
4. Check for QR code scanning errors

### Issue: QR Code Won't Scan

**Symptoms:** Scanner can't read QR code

**Solutions:**
1. Adjust camera focus and lighting
2. Increase QR code size on customer's phone
3. Clean camera lens
4. Try manual entry fallback

### Issue: Privacy Concerns

**Symptoms:** Questions about data storage

**Solutions:**
1. Implement auto-delete for audit logs
2. Don't log PII
3. Use encryption for cached data
4. Provide clear privacy policy

## Next Steps

- [Marketplace Trust Example](./marketplace-trust.md) - Another use case
- [Security Guide](../security.md) - Security best practices
- [Offline Mode](../offline-mode.md) - Optimize for speed
- [Error Handling](../error-handling.md) - Handle edge cases
