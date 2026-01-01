# QR Code Module - Usage Examples

Practical examples for using the Aura Verifier SDK QR code module.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Error Handling](#error-handling)
3. [Custom Validation](#custom-validation)
4. [Production Patterns](#production-patterns)
5. [Integration Examples](#integration-examples)

## Basic Usage

### Parse and Validate a QR Code

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

const qrString = "aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNlbnRhdGlvbi0xMjMiLCJoIjoiZGlkOmF1cmE6bWFpbm5ldDphYmMxMjMiLCJ2Y3MiOlsidmMtMSIsInZjLTIiXSwiY3R4Ijp7InNob3dfZnVsbF9uYW1lIjp0cnVlLCJzaG93X2FnZV9vdmVyXzE4Ijp0cnVlfSwiZXhwIjoxNzM1NTYwMDAwLCJuIjoxMjM0NTY3ODksInNpZyI6ImFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MCJ9";

try {
  const qrData = parseAndValidateQRCode(qrString);
  console.log('QR code is valid!');
  console.log('Presentation ID:', qrData.p);
  console.log('Holder DID:', qrData.h);
} catch (error) {
  console.error('Invalid QR code:', error.message);
}
```

### Safe Parsing (No Exceptions)

```typescript
import { parseAndValidateQRCodeSafe } from '@aura/verifier-sdk/qr';

const result = parseAndValidateQRCodeSafe(qrString);

if (result.success) {
  console.log('Valid QR code:', result.data);
  // Access data safely
  console.log('Presentation ID:', result.data.p);
} else {
  console.error('Error:', result.error);
}
```

## Error Handling

### Handle Different Error Types

```typescript
import {
  parseAndValidateQRCode,
  QRParseError,
  QRValidationError,
  QRExpiredError,
} from '@aura/verifier-sdk/qr';

try {
  const qrData = parseAndValidateQRCode(qrString);
  // Process valid QR code
  processVerification(qrData);
} catch (error) {
  if (error instanceof QRExpiredError) {
    // QR code has expired
    console.error('QR code expired at:', new Date(error.expirationTime * 1000));
    console.error('Expired', error.timeSinceExpiration, 'seconds ago');

    // Offer to scan a new QR code
    promptForNewQRCode();
  } else if (error instanceof QRValidationError) {
    // Validation failed (e.g., invalid DID, bad signature)
    console.error('Validation error in field:', error.field);
    console.error('Message:', error.message);

    // Log for security monitoring
    logSecurityEvent('qr_validation_failed', error);
  } else if (error instanceof QRParseError) {
    // Could not parse QR code (malformed, bad encoding)
    console.error('Parse error:', error.message);

    // Prompt user to scan again
    showError('Please scan a valid Aura QR code');
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
  }
}
```

### Detailed Validation Results

```typescript
import { parseQRCode, validateQRCodeData } from '@aura/verifier-sdk/qr';

// Parse first
const qrData = parseQRCode(qrString);

// Validate with detailed results
const result = validateQRCodeData(qrData);

if (result.valid) {
  console.log('✓ QR code is valid');
} else {
  console.error('✗ QR code validation failed:');

  // Show all errors
  result.errors.forEach(error => {
    console.error(`  [${error.field}] ${error.message}`);
  });
}

// Check warnings (non-blocking issues)
if (result.warnings.length > 0) {
  console.warn('Warnings:');
  result.warnings.forEach(warning => {
    console.warn(`  [${warning.field}] ${warning.message}`);
  });
}
```

## Custom Validation

### Allow Expired QR Codes with Tolerance

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

// Allow QR codes that expired within last 2 minutes
const qrData = parseAndValidateQRCode(qrString, {
  checkExpiration: true,
  expirationTolerance: 120, // 120 seconds = 2 minutes
});

console.log('QR code accepted (within tolerance)');
```

### Skip Specific Validations

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

// Skip DID and signature validation (for testing)
const qrData = parseAndValidateQRCode(qrString, {
  validateDID: false,
  validateSignature: false,
  checkExpiration: false,
});

console.log('QR code parsed (minimal validation)');
```

### Support Multiple Protocol Versions

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

const qrData = parseAndValidateQRCode(qrString, {
  supportedVersions: ['1.0', '1.1', '2.0'],
});

console.log('Protocol version:', qrData.v);
```

## Production Patterns

### Complete Verification Flow

```typescript
import {
  parseAndValidateQRCode,
  QRExpiredError,
  QRValidationError,
  type QRCodeData,
} from '@aura/verifier-sdk/qr';

async function verifyQRCode(qrString: string): Promise<VerificationResult> {
  try {
    // Step 1: Parse and validate QR code
    const qrData = parseAndValidateQRCode(qrString, {
      checkExpiration: true,
      expirationTolerance: 30, // 30-second tolerance for clock skew
      validateDID: true,
      validateSignature: true,
    });

    // Step 2: Check nonce hasn't been used (prevent replay attacks)
    const nonceUsed = await checkNonceInDatabase(qrData.n);
    if (nonceUsed) {
      throw new Error('Nonce reuse detected - possible replay attack');
    }

    // Step 3: Verify signature cryptographically
    const signatureValid = await verifySignature(
      qrData.sig,
      qrData.h, // Holder DID
      qrData
    );
    if (!signatureValid) {
      throw new Error('Invalid signature');
    }

    // Step 4: Fetch and verify credentials
    const credentials = await fetchCredentials(qrData.vcs);
    const credentialsValid = await verifyCredentials(credentials);
    if (!credentialsValid) {
      throw new Error('Invalid credentials');
    }

    // Step 5: Build presentation response
    const presentation = buildPresentation(qrData, credentials);

    // Step 6: Mark nonce as used
    await markNonceUsed(qrData.n);

    return {
      success: true,
      presentation,
      holder: qrData.h,
    };
  } catch (error) {
    if (error instanceof QRExpiredError) {
      return {
        success: false,
        error: 'QR code expired',
        code: 'EXPIRED',
        details: {
          expirationTime: error.expirationTime,
          timeSinceExpiration: error.timeSinceExpiration,
        },
      };
    } else if (error instanceof QRValidationError) {
      return {
        success: false,
        error: 'Invalid QR code',
        code: 'VALIDATION_FAILED',
        details: {
          field: error.field,
          message: error.message,
        },
      };
    } else {
      return {
        success: false,
        error: error.message,
        code: 'UNKNOWN_ERROR',
      };
    }
  }
}
```

### Nonce Tracking (Replay Attack Prevention)

```typescript
import { QRNonceError } from '@aura/verifier-sdk/qr';

// In-memory nonce store (use Redis/DB in production)
const usedNonces = new Set<number>();

function checkNonce(nonce: number): void {
  if (usedNonces.has(nonce)) {
    throw QRNonceError.reusedNonce(nonce);
  }
}

function markNonceUsed(nonce: number): void {
  usedNonces.add(nonce);
}

// Usage in verification flow
try {
  const qrData = parseAndValidateQRCode(qrString);

  // Check nonce before processing
  checkNonce(qrData.n);

  // Process verification...

  // Mark nonce as used after successful verification
  markNonceUsed(qrData.n);
} catch (error) {
  if (error instanceof QRNonceError) {
    console.error('Replay attack detected:', error.message);
    // Log security event
  }
}
```

### Rate Limiting

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

const verificationAttempts = new Map<string, number>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

async function verifyWithRateLimit(
  qrString: string,
  userIP: string
): Promise<any> {
  // Check rate limit
  const attempts = verificationAttempts.get(userIP) || 0;
  if (attempts >= MAX_ATTEMPTS) {
    throw new Error('Too many verification attempts. Please try again later.');
  }

  try {
    const qrData = parseAndValidateQRCode(qrString);

    // Process verification...

    // Reset attempts on success
    verificationAttempts.delete(userIP);

    return { success: true, data: qrData };
  } catch (error) {
    // Increment attempts on failure
    verificationAttempts.set(userIP, attempts + 1);

    // Clear after time window
    setTimeout(() => {
      verificationAttempts.delete(userIP);
    }, RATE_LIMIT_WINDOW);

    throw error;
  }
}
```

## Integration Examples

### Express.js API Endpoint

```typescript
import express from 'express';
import {
  parseAndValidateQRCode,
  QRExpiredError,
  QRValidationError,
} from '@aura/verifier-sdk/qr';

const app = express();
app.use(express.json());

app.post('/api/verify-qr', async (req, res) => {
  const { qrCode } = req.body;

  if (!qrCode) {
    return res.status(400).json({
      error: 'Missing qrCode parameter',
    });
  }

  try {
    // Parse and validate
    const qrData = parseAndValidateQRCode(qrCode);

    // Perform verification logic
    const result = await performVerification(qrData);

    res.json({
      success: true,
      presentationId: qrData.p,
      holder: qrData.h,
      disclosures: qrData.ctx,
      result,
    });
  } catch (error) {
    if (error instanceof QRExpiredError) {
      return res.status(400).json({
        error: 'QR code expired',
        code: 'QR_EXPIRED',
        expirationTime: error.expirationTime,
      });
    } else if (error instanceof QRValidationError) {
      return res.status(400).json({
        error: 'Invalid QR code',
        code: 'VALIDATION_ERROR',
        field: error.field,
        message: error.message,
      });
    } else {
      console.error('Verification error:', error);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

app.listen(3000, () => {
  console.log('Verifier API running on port 3000');
});
```

### React Component

```typescript
import React, { useState } from 'react';
import {
  parseAndValidateQRCodeSafe,
  type QRCodeData,
} from '@aura/verifier-sdk/qr';

function QRVerifier() {
  const [qrData, setQRData] = useState<QRCodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQRScan = async (qrString: string) => {
    setLoading(true);
    setError(null);

    // Parse and validate
    const result = parseAndValidateQRCodeSafe(qrString);

    if (result.success && result.data) {
      setQRData(result.data);

      // Continue with verification
      await performVerification(result.data);
    } else {
      setError(result.error || 'Unknown error');
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Scan Aura QR Code</h2>

      {loading && <p>Verifying...</p>}

      {error && (
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Try Again</button>
        </div>
      )}

      {qrData && (
        <div className="qr-data">
          <h3>Valid QR Code</h3>
          <p><strong>Presentation ID:</strong> {qrData.p}</p>
          <p><strong>Holder:</strong> {qrData.h}</p>
          <p><strong>Credentials:</strong> {qrData.vcs.length}</p>

          <h4>Requested Disclosures:</h4>
          <ul>
            {qrData.ctx.show_full_name && <li>Full Name</li>}
            {qrData.ctx.show_age_over_18 && <li>Age 18+ Verification</li>}
            {qrData.ctx.show_age_over_21 && <li>Age 21+ Verification</li>}
            {qrData.ctx.show_city_state && <li>City & State</li>}
            {qrData.ctx.show_full_address && <li>Full Address</li>}
          </ul>
        </div>
      )}

      <QRScanner onScan={handleQRScan} />
    </div>
  );
}

export default QRVerifier;
```

### Mobile App (React Native)

```typescript
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import {
  parseAndValidateQRCodeSafe,
  type QRCodeData,
} from '@aura/verifier-sdk/qr';

export function QRVerifierScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrData, setQRData] = useState<QRCodeData | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);

    // Parse and validate QR code
    const result = parseAndValidateQRCodeSafe(data);

    if (result.success && result.data) {
      setQRData(result.data);
      // Navigate to verification screen
      navigation.navigate('Verification', { qrData: result.data });
    } else {
      alert('Invalid QR code: ' + result.error);
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={{ flex: 1 }}
      />
      {scanned && (
        <Button title="Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}
```

### CLI Tool

```typescript
#!/usr/bin/env node
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

const qrString = process.argv[2];

if (!qrString) {
  console.error('Usage: verify-qr <qr-string>');
  process.exit(1);
}

try {
  const qrData = parseAndValidateQRCode(qrString);

  console.log('✓ QR code is valid');
  console.log('');
  console.log('Presentation ID:', qrData.p);
  console.log('Holder DID:', qrData.h);
  console.log('VC IDs:', qrData.vcs.join(', '));
  console.log('Expiration:', new Date(qrData.exp * 1000).toISOString());
  console.log('Nonce:', qrData.n);
  console.log('');
  console.log('Disclosures:');
  Object.entries(qrData.ctx)
    .filter(([_, value]) => value === true)
    .forEach(([key]) => {
      console.log('  -', key);
    });

  process.exit(0);
} catch (error) {
  console.error('✗ QR code validation failed');
  console.error('Error:', error.message);
  process.exit(1);
}
```

## Best Practices

1. **Always validate expiration** - Use reasonable tolerance for clock skew
2. **Track nonces** - Prevent replay attacks
3. **Rate limit** - Prevent abuse
4. **Log security events** - Monitor for attacks
5. **Verify signatures cryptographically** - Format check is not enough
6. **Handle errors gracefully** - Provide clear feedback to users
7. **Use safe parsing in user-facing code** - Avoid exposing stack traces
8. **Implement timeout** - Don't let verification hang indefinitely

## Security Checklist

- [ ] Validate QR code expiration
- [ ] Check nonce hasn't been used
- [ ] Verify signature cryptographically
- [ ] Validate holder DID matches expected format
- [ ] Rate limit verification attempts
- [ ] Log all verification attempts
- [ ] Sanitize error messages before showing to users
- [ ] Implement timeout for verification process
- [ ] Store used nonces securely
- [ ] Clear expired nonces from storage
