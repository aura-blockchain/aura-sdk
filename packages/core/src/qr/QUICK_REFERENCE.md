# QR Code Module - Quick Reference

## Installation

```bash
npm install @aura/verifier-sdk
```

## Quick Start

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

const qrData = parseAndValidateQRCode(qrString);
console.log('Holder:', qrData.h);
```

## Main Functions

| Function | Description | Throws? |
|----------|-------------|---------|
| `parseQRCode()` | Parse QR string to data | Yes |
| `parseQRCodeSafe()` | Parse QR string (safe) | No |
| `validateQRCodeData()` | Validate QR data | No |
| `validateQRCodeDataStrict()` | Validate QR data | Yes |
| `parseAndValidateQRCode()` | Parse + validate | Yes |
| `parseAndValidateQRCodeSafe()` | Parse + validate (safe) | No |

## QR Data Structure

```typescript
interface QRCodeData {
  v: string;              // Version: "1.0"
  p: string;              // Presentation ID
  h: string;              // Holder DID: "did:aura:mainnet:..."
  vcs: string[];          // VC IDs
  ctx: {                  // Disclosures
    show_full_name?: boolean;
    show_age_over_18?: boolean;
    show_age_over_21?: boolean;
    show_city_state?: boolean;
    show_full_address?: boolean;
  };
  exp: number;            // Unix timestamp
  n: number;              // Nonce (uint64)
  sig: string;            // Hex signature
}
```

## Common Patterns

### Parse and Handle Errors

```typescript
try {
  const qrData = parseAndValidateQRCode(qrString);
  // Use qrData...
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('QR code expired');
  } else if (error instanceof QRValidationError) {
    console.error('Invalid:', error.field);
  } else if (error instanceof QRParseError) {
    console.error('Cannot parse QR code');
  }
}
```

### Safe Parsing

```typescript
const result = parseAndValidateQRCodeSafe(qrString);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Custom Options

```typescript
const qrData = parseAndValidateQRCode(qrString, {
  checkExpiration: true,
  expirationTolerance: 60,    // 60 seconds
  validateDID: true,
  validateSignature: true,
  supportedVersions: ['1.0'],
});
```

### Detailed Validation

```typescript
const qrData = parseQRCode(qrString);
const result = validateQRCodeData(qrData);

if (!result.valid) {
  result.errors.forEach(e => {
    console.error(`[${e.field}] ${e.message}`);
  });
}

result.warnings.forEach(w => {
  console.warn(`[${w.field}] ${w.message}`);
});
```

## Error Classes

| Error | When | Properties |
|-------|------|------------|
| `QRParseError` | Parse fails | `message`, `code`, `details` |
| `QRValidationError` | Validation fails | `message`, `code`, `field` |
| `QRExpiredError` | QR expired | `expirationTime`, `currentTime` |
| `QRNonceError` | Nonce issues | `nonce` |

## Validation Options

```typescript
interface QRValidatorOptions {
  checkExpiration?: boolean;        // Default: true
  expirationTolerance?: number;     // Default: 0 (seconds)
  validateDID?: boolean;            // Default: true
  validateSignature?: boolean;      // Default: true
  supportedVersions?: string[];     // Default: ["1.0"]
}
```

## Parser Options

```typescript
interface QRParserOptions {
  strict?: boolean;                 // Default: true
  expirationTolerance?: number;     // Default: 0 (seconds)
  supportedVersions?: string[];     // Default: ["1.0"]
}
```

## QR Format

**URL Format:**
```
aura://verify?data=<base64_encoded_json>
```

**Raw Format:**
```
<base64_encoded_json>
```

**Decoded JSON:**
```json
{
  "v": "1.0",
  "p": "presentation-123",
  "h": "did:aura:mainnet:abc123",
  "vcs": ["vc-1", "vc-2"],
  "ctx": {
    "show_full_name": true,
    "show_age_over_18": true
  },
  "exp": 1735560000,
  "n": 123456789,
  "sig": "abcdef..."
}
```

## Common Use Cases

### Web API Endpoint

```typescript
app.post('/verify-qr', async (req, res) => {
  const { qrCode } = req.body;

  try {
    const qrData = parseAndValidateQRCode(qrCode);
    const result = await verifyPresentation(qrData);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### React Component

```typescript
function QRVerifier() {
  const [qrData, setQRData] = useState(null);

  const handleScan = (qrString) => {
    const result = parseAndValidateQRCodeSafe(qrString);
    if (result.success) {
      setQRData(result.data);
    } else {
      alert(result.error);
    }
  };

  return <QRScanner onScan={handleScan} />;
}
```

### Check Disclosures

```typescript
const qrData = parseAndValidateQRCode(qrString);

if (qrData.ctx.show_full_name) {
  console.log('Will show full name');
}

if (qrData.ctx.show_age_over_21) {
  console.log('Will verify age 21+');
}
```

### Expiration Handling

```typescript
try {
  const qrData = parseAndValidateQRCode(qrString);
} catch (error) {
  if (error instanceof QRExpiredError) {
    const expiredDate = new Date(error.expirationTime * 1000);
    const secondsAgo = error.timeSinceExpiration;

    console.log(`Expired: ${expiredDate}`);
    console.log(`Time since: ${secondsAgo}s`);

    // Check tolerance
    if (error.isWithinTolerance(60)) {
      console.log('Within tolerance window');
    }
  }
}
```

## Security Best Practices

1. Always validate expiration
2. Track nonces to prevent replay attacks
3. Verify signature cryptographically
4. Rate limit verification attempts
5. Log security events
6. Use safe parsing for user input
7. Implement timeout for verification

## Testing

```bash
npm test
```

## Documentation

- `README.md` - Complete API documentation
- `EXAMPLES.md` - Detailed usage examples
- `QUICK_REFERENCE.md` - This file

## Support

For more information, see the complete documentation in README.md and EXAMPLES.md.
