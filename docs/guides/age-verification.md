# Age Verification Guide

Complete guide to implementing age verification for bars, nightclubs, dispensaries, and other age-restricted venues using the Aura Verifier SDK.

## Overview

Age verification with Aura provides:
- **Instant verification** - Results in < 1 second
- **Privacy-preserving** - No birthdate revealed, only age threshold (18+ or 21+)
- **Offline capability** - Works without internet after initial sync
- **Tamper-proof** - Cryptographically signed credentials
- **Audit trail** - Every verification is logged with unique ID

## Quick Start

Verify someone is 21+ in 3 lines:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({ network: 'mainnet' });
await verifier.initialize();

const isOver21 = await verifier.isAge21Plus(qrCodeData);
```

## Use Cases

### Bars and Nightclubs
Verify customers are 21+ before entry or alcohol service.

### Cannabis Dispensaries
Verify customers meet age requirements (18+ or 21+ depending on jurisdiction).

### Tobacco/Vape Shops
Verify customers are 18+ for tobacco product purchases.

### Adult Entertainment
Verify customers meet age requirements for adult content or venues.

### Online Age Gates
Verify age for age-restricted websites and digital services.

## Implementation Guide

### 1. Basic Age Verification (21+)

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

// Initialize verifier once at app startup
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 5000, // Fast verification needed
  cacheConfig: {
    enableVCCache: true,
    ttl: 300, // Cache for 5 minutes
  },
});

await verifier.initialize();

// Verification function
async function verifyAge21(qrCodeData: string): Promise<boolean> {
  try {
    const isOver21 = await verifier.isAge21Plus(qrCodeData);

    if (isOver21) {
      console.log('Customer verified 21+');
      return true;
    } else {
      console.log('Customer is not 21+');
      return false;
    }
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

// Usage at entry
const qr = await scanQRCode(); // Your QR scanner
const allowed = await verifyAge21(qr);

if (allowed) {
  grantEntry();
} else {
  denyEntry();
}
```

### 2. Age Verification with Full Details

Get complete verification details including audit ID:

```typescript
async function verifyAgeDetailed(qrCodeData: string) {
  try {
    const result = await verifier.verify({
      qrCodeData,
      requiredVCTypes: [VCType.AGE_VERIFICATION],
    });

    if (result.isValid) {
      // Check age attribute
      if (result.attributes.ageOver21) {
        console.log('Age verified: 21+');
        console.log('Audit ID:', result.auditId);
        console.log('Holder DID:', result.holderDID);
        console.log('Verified at:', result.verifiedAt);

        // Log for compliance
        await logVerification({
          auditId: result.auditId,
          holderDID: result.holderDID,
          timestamp: result.verifiedAt,
          ageVerified: '21+',
          verifierLocation: 'main-entrance',
        });

        return { allowed: true, auditId: result.auditId };
      } else {
        return { allowed: false, reason: 'Under 21' };
      }
    } else {
      return { allowed: false, reason: result.verificationError };
    }
  } catch (error) {
    return { allowed: false, reason: error.message };
  }
}
```

### 3. Multiple Age Thresholds

Support different age requirements:

```typescript
async function verifyMinimumAge(
  qrCodeData: string,
  minimumAge: 18 | 21
): Promise<{ verified: boolean; reason?: string }> {
  const result = await verifier.verify({ qrCodeData });

  if (!result.isValid) {
    return {
      verified: false,
      reason: result.verificationError || 'Invalid credential',
    };
  }

  // Check specific age threshold
  if (minimumAge === 21) {
    if (result.attributes.ageOver21) {
      return { verified: true };
    } else {
      return { verified: false, reason: 'Must be 21 or older' };
    }
  } else if (minimumAge === 18) {
    if (result.attributes.ageOver18) {
      return { verified: true };
    } else {
      return { verified: false, reason: 'Must be 18 or older' };
    }
  }

  return { verified: false, reason: 'Age verification not available' };
}

// Usage
const result = await verifyMinimumAge(qr, 21); // For alcohol
const result = await verifyMinimumAge(qr, 18); // For tobacco
```

## Point-of-Sale Integration

### POS Terminal Integration

```typescript
class AgeVerificationPOS {
  private verifier: AuraVerifier;

  constructor() {
    this.verifier = new AuraVerifier({
      network: 'mainnet',
      timeout: 5000,
      offlineMode: false,
      cacheConfig: {
        enableVCCache: true,
        ttl: 300,
      },
    });
  }

  async initialize() {
    await this.verifier.initialize();
    console.log('POS Age Verification ready');
  }

  /**
   * Verify age before alcohol purchase
   */
  async verifyAlcoholPurchase(qrCodeData: string): Promise<{
    approved: boolean;
    message: string;
    transactionId?: string;
  }> {
    try {
      const result = await this.verifier.verify({
        qrCodeData,
        requiredVCTypes: [VCType.AGE_VERIFICATION],
      });

      if (result.isValid && result.attributes.ageOver21) {
        // Log transaction
        const txId = await this.logTransaction({
          type: 'alcohol-verification',
          auditId: result.auditId,
          holderDID: result.holderDID,
          timestamp: result.verifiedAt,
          terminal: process.env.TERMINAL_ID,
        });

        return {
          approved: true,
          message: 'Age verified - Customer is 21+',
          transactionId: txId,
        };
      } else {
        return {
          approved: false,
          message: result.verificationError || 'Age verification failed',
        };
      }
    } catch (error) {
      return {
        approved: false,
        message: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify age before tobacco purchase
   */
  async verifyTobaccoPurchase(qrCodeData: string) {
    const result = await this.verifier.verify({ qrCodeData });

    if (result.isValid && result.attributes.ageOver18) {
      await this.logTransaction({
        type: 'tobacco-verification',
        auditId: result.auditId,
        holderDID: result.holderDID,
      });

      return { approved: true, message: 'Age verified - Customer is 18+' };
    }

    return { approved: false, message: 'Customer is under 18' };
  }

  private async logTransaction(data: any): Promise<string> {
    // Log to your POS system or database
    const txId = generateTransactionId();
    await db.transactions.insert({ ...data, id: txId });
    return txId;
  }
}

// Initialize at POS startup
const posVerifier = new AgeVerificationPOS();
await posVerifier.initialize();

// Use during checkout
app.post('/pos/verify-alcohol', async (req, res) => {
  const { qrCode } = req.body;
  const result = await posVerifier.verifyAlcoholPurchase(qrCode);
  res.json(result);
});
```

## Door Entry System

### Nightclub Entry Verification

```typescript
class VenueEntrySystem {
  private verifier: AuraVerifier;
  private entranceLog: any[] = [];

  constructor(venueName: string) {
    this.verifier = new AuraVerifier({
      network: 'mainnet',
      timeout: 5000,
      cacheConfig: {
        enableVCCache: true,
        enableDIDCache: true,
        ttl: 600, // 10 minutes
      },
    });
  }

  async initialize() {
    await this.verifier.initialize();
  }

  /**
   * Verify customer at entrance
   */
  async verifyEntry(qrCodeData: string): Promise<{
    granted: boolean;
    message: string;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Verify age
      const result = await verifier.verify({
        qrCodeData,
        requiredVCTypes: [VCType.AGE_VERIFICATION],
      });

      const verificationTime = Date.now() - startTime;

      if (result.isValid && result.attributes.ageOver21) {
        // Grant entry
        const entry = {
          auditId: result.auditId,
          holderDID: result.holderDID,
          timestamp: result.verifiedAt,
          verificationTime,
          entrance: 'main',
        };

        this.entranceLog.push(entry);

        // Display on screen
        this.displayWelcome();

        return {
          granted: true,
          message: 'Welcome! Entry granted',
          details: {
            verifiedAt: result.verifiedAt,
            auditId: result.auditId,
          },
        };
      } else {
        this.displayDenied();

        return {
          granted: false,
          message: result.verificationError || 'Age verification failed',
        };
      }
    } catch (error) {
      this.displayError();

      return {
        granted: false,
        message: `System error: ${error.message}`,
      };
    }
  }

  /**
   * Get entry statistics
   */
  getStatistics() {
    return {
      totalEntries: this.entranceLog.length,
      averageVerificationTime:
        this.entranceLog.reduce((sum, e) => sum + e.verificationTime, 0) /
        this.entranceLog.length,
      entriesLastHour: this.entranceLog.filter(
        (e) => Date.now() - e.timestamp.getTime() < 3600000
      ).length,
    };
  }

  private displayWelcome() {
    // Display on entrance screen/kiosk
    console.log('✓ WELCOME - ENTRY GRANTED');
  }

  private displayDenied() {
    console.log('✗ ENTRY DENIED - AGE REQUIREMENT NOT MET');
  }

  private displayError() {
    console.log('⚠ SYSTEM ERROR - SEE STAFF');
  }
}
```

## Offline Mode for Venues

Enable offline verification for reliable operation:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true, // Enable offline mode
  cacheConfig: {
    storageLocation: './venue-cache',
    ttl: 86400, // 24 hours
    maxSize: 200, // 200 MB
  },
});

// Sync cache during off-peak hours
async function dailySync() {
  console.log('Starting daily cache sync...');

  await verifier.disableOfflineMode();
  const syncResult = await verifier.syncCache();

  console.log('Sync complete:', {
    vcsSynced: syncResult.vcsSynced,
    duration: syncResult.duration,
  });

  await verifier.enableOfflineMode();
}

// Run sync at 4 AM daily
cron.schedule('0 4 * * *', dailySync);
```

## Error Handling

Handle common verification errors:

```typescript
import {
  QRExpiredError,
  QRParseError,
  VerificationError,
  CredentialRevokedError,
} from '@aura-network/verifier-sdk';

async function verifyWithErrorHandling(qrCodeData: string) {
  try {
    const result = await verifier.verify({ qrCodeData });

    if (result.isValid && result.attributes.ageOver21) {
      return { success: true, message: 'Age verified' };
    } else {
      return { success: false, message: 'Age not verified' };
    }
  } catch (error) {
    if (error instanceof QRExpiredError) {
      return {
        success: false,
        message: 'QR code expired - please generate a new one',
        userFriendly: true,
      };
    } else if (error instanceof QRParseError) {
      return {
        success: false,
        message: 'Invalid QR code - please try again',
        userFriendly: true,
      };
    } else if (error instanceof CredentialRevokedError) {
      return {
        success: false,
        message: 'Credential has been revoked',
        alertSecurity: true,
      };
    } else if (error instanceof VerificationError) {
      return {
        success: false,
        message: error.message,
        code: error.code,
      };
    } else {
      return {
        success: false,
        message: 'System error - please see staff',
        alertStaff: true,
      };
    }
  }
}
```

## Compliance and Logging

### Audit Trail

Maintain detailed logs for compliance:

```typescript
interface AgeVerificationLog {
  auditId: string;
  timestamp: Date;
  holderDID: string;
  ageThreshold: '18+' | '21+';
  verified: boolean;
  verifierLocation: string;
  verifierOperator?: string;
  failureReason?: string;
}

class AgeVerificationLogger {
  private logs: AgeVerificationLog[] = [];

  async logVerification(result: VerificationResult, threshold: '18+' | '21+') {
    const log: AgeVerificationLog = {
      auditId: result.auditId,
      timestamp: result.verifiedAt,
      holderDID: result.holderDID,
      ageThreshold: threshold,
      verified: result.isValid,
      verifierLocation: process.env.LOCATION_ID || 'unknown',
      verifierOperator: process.env.OPERATOR_ID,
      failureReason: result.verificationError,
    };

    this.logs.push(log);

    // Persist to database
    await db.verificationLogs.insert(log);

    // Alert if suspicious pattern
    this.checkForSuspiciousActivity(log);
  }

  async checkForSuspiciousActivity(log: AgeVerificationLog) {
    // Check for multiple failed attempts
    const recentFailures = this.logs.filter(
      (l) =>
        l.holderDID === log.holderDID &&
        !l.verified &&
        Date.now() - l.timestamp.getTime() < 300000 // 5 minutes
    );

    if (recentFailures.length > 3) {
      await this.alertSecurity({
        type: 'multiple-failed-attempts',
        holderDID: log.holderDID,
        attempts: recentFailures.length,
      });
    }
  }

  async alertSecurity(alert: any) {
    console.warn('SECURITY ALERT:', alert);
    // Send to security monitoring system
  }

  async generateComplianceReport(startDate: Date, endDate: Date) {
    const logs = this.logs.filter(
      (l) => l.timestamp >= startDate && l.timestamp <= endDate
    );

    return {
      totalVerifications: logs.length,
      successfulVerifications: logs.filter((l) => l.verified).length,
      failedVerifications: logs.filter((l) => !l.verified).length,
      uniqueCustomers: new Set(logs.map((l) => l.holderDID)).size,
      byThreshold: {
        '18+': logs.filter((l) => l.ageThreshold === '18+').length,
        '21+': logs.filter((l) => l.ageThreshold === '21+').length,
      },
    };
  }
}
```

## Best Practices

### 1. Fast Verification

Optimize for speed in high-traffic venues:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 5000, // Fast timeout
  cacheConfig: {
    enableVCCache: true,
    enableDIDCache: true,
    ttl: 600, // 10 minutes
    maxSize: 200,
  },
});

// Use convenience methods for fastest verification
const isOver21 = await verifier.isAge21Plus(qrCodeData); // Fastest
```

### 2. Privacy Protection

Only request age threshold, not exact age:

```typescript
// Good: Only check threshold
if (result.attributes.ageOver21) {
  // Customer is 21+, exact age unknown
}

// Bad: Don't request exact age unless necessary
// result.attributes.age // Avoid if possible
```

### 3. Graceful Degradation

Handle network issues gracefully:

```typescript
async function verifyWithFallback(qrCodeData: string) {
  try {
    // Try online verification first
    return await verifier.verify({ qrCodeData });
  } catch (error) {
    if (error instanceof NetworkError) {
      // Fall back to offline mode
      await verifier.enableOfflineMode();
      return await verifier.verify({ qrCodeData, offlineOnly: true });
    }
    throw error;
  }
}
```

### 4. User Experience

Provide clear feedback:

```typescript
async function verifyWithFeedback(qrCodeData: string) {
  displayMessage('Verifying...');

  const result = await verifier.verify({ qrCodeData });

  if (result.isValid && result.attributes.ageOver21) {
    displaySuccess('✓ Age Verified - Welcome!');
    playSound('success');
  } else {
    displayError('✗ Age Not Verified');
    playSound('error');
  }

  return result;
}
```

## Next Steps

- Review [Error Handling](./error-handling.md)
- Set up [Offline Mode](./offline-mode.md)
- Explore [POS Integration](../integrations/pos-systems.md)
- See [Bar/Nightclub Example](../examples/bar-nightclub.md)
