# QR Code Module

Complete QR code parsing and validation module for the Aura Verifier SDK.

## Features

- **Parse QR codes** from URL format (`aura://verify?data=<base64>`) or raw base64
- **Validate QR data** with comprehensive security checks
- **Type-safe** TypeScript interfaces
- **Production-ready** error handling with specific error classes
- **Flexible configuration** with customizable validation options

## QR Code Format

```
aura://verify?data=<base64_encoded_json>
```

The base64-decoded JSON structure:

```typescript
{
  v: "1.0",                    // Protocol version
  p: "presentation-123",       // Presentation ID
  h: "did:aura:mainnet:...",  // Holder DID
  vcs: ["vc-id-1", "vc-id-2"], // VC IDs array
  ctx: {                       // Disclosure context
    show_full_name: true,
    show_age_over_18: true,
    show_city_state: false
  },
  exp: 1735560000,            // Expiration Unix timestamp
  n: 123456789,               // Nonce (uint64)
  sig: "abcdef..."            // Hex-encoded signature
}
```

## Installation

```bash
npm install @aura/verifier-sdk
```

## Quick Start

### Parse and Validate QR Code

```typescript
import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';

try {
  const qrString =
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6IjEyMyIsImgiOiJkaWQ6YXVyYTptYWlubmV0OmFiYzEyMyIsInZjcyI6WyJ2YzEiXSwiY3R4Ijp7fSwiZXhwIjoxNzM1NTYwMDAwLCJuIjoxMjM0NTYsInNpZyI6ImFiY2RlZiJ9';

  const qrData = parseAndValidateQRCode(qrString);

  console.log('Valid QR code!');
  console.log('Presentation ID:', qrData.p);
  console.log('Holder DID:', qrData.h);
  console.log('VCs to present:', qrData.vcs);
  console.log('Disclosures:', qrData.ctx);
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('QR code expired:', error.message);
  } else if (error instanceof QRValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof QRParseError) {
    console.error('Parse error:', error.message);
  }
}
```

### Safe Parsing (Non-Throwing)

```typescript
import { parseAndValidateQRCodeSafe } from '@aura/verifier-sdk/qr';

const result = parseAndValidateQRCodeSafe(qrString);

if (result.success) {
  console.log('Valid QR code:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## API Reference

### Parsing Functions

#### `parseQRCode(qrString, options?)`

Parse QR code string into structured data.

**Parameters:**

- `qrString` (string): QR code URL or raw base64
- `options` (QRParserOptions, optional):
  - `strict` (boolean, default: true): Enable strict validation
  - `expirationTolerance` (number, default: 0): Tolerance in seconds
  - `supportedVersions` (string[], default: ["1.0"]): Supported protocol versions

**Returns:** `QRCodeData`

**Throws:** `QRParseError`

#### `parseQRCodeSafe(qrString, options?)`

Non-throwing version that returns a result object.

**Returns:** `ParseResult` with `success`, `data?`, and `error?`

### Validation Functions

#### `validateQRCodeData(data, options?)`

Validate parsed QR code data.

**Parameters:**

- `data` (QRCodeData): Parsed QR code data
- `options` (QRValidatorOptions, optional):
  - `checkExpiration` (boolean, default: true): Check if expired
  - `expirationTolerance` (number, default: 0): Tolerance in seconds
  - `validateDID` (boolean, default: true): Validate DID format
  - `validateSignature` (boolean, default: true): Validate signature format
  - `supportedVersions` (string[], default: ["1.0"]): Supported versions

**Returns:** `ValidationResult` with:

- `valid` (boolean): Whether validation passed
- `errors` (ValidationError[]): List of errors
- `warnings` (ValidationError[]): List of warnings

#### `validateQRCodeDataStrict(data, options?)`

Throwing version that raises errors on validation failure.

**Throws:** `QRValidationError` or `QRExpiredError`

### Combined Functions

#### `parseAndValidateQRCode(qrString, options?)`

Parse and validate in one step (throwing).

**Parameters:** Combined parser and validator options

**Returns:** `QRCodeData`

**Throws:** `QRParseError`, `QRValidationError`, or `QRExpiredError`

#### `parseAndValidateQRCodeSafe(qrString, options?)`

Parse and validate in one step (non-throwing).

**Returns:** `ParseResult`

## Error Classes

### `QRParseError`

Thrown when QR code parsing fails.

**Static Methods:**

- `invalidFormat(reason)`: Invalid QR code format
- `invalidBase64(details?)`: Invalid base64 encoding
- `invalidJSON(details?)`: Invalid JSON structure
- `missingFields(fields)`: Missing required fields

### `QRValidationError`

Thrown when QR code validation fails.

**Properties:**

- `field` (string?): Field that failed validation
- `message` (string): Error description

**Static Methods:**

- `invalidField(field, reason)`: Invalid field value
- `unsupportedVersion(version, supported)`: Unsupported protocol version
- `invalidDID(did, reason?)`: Invalid DID format
- `invalidSignature(reason)`: Invalid signature format
- `invalidArray(field, reason)`: Invalid array field

### `QRExpiredError`

Thrown when QR code has expired.

**Properties:**

- `expirationTime` (number): Expiration timestamp
- `currentTime` (number): Current timestamp
- `timeSinceExpiration` (number): Seconds since expiration

**Methods:**

- `isWithinTolerance(toleranceSeconds)`: Check if within tolerance

### `QRNonceError`

Thrown for nonce-related errors.

**Static Methods:**

- `invalidNonce(nonce)`: Invalid nonce value
- `reusedNonce(nonce)`: Nonce reuse detected

## Examples

### Basic Parsing

```typescript
import { parseQRCode } from '@aura/verifier-sdk/qr';

// From URL format
const qrData = parseQRCode('aura://verify?data=...');

// From raw base64
const qrData2 = parseQRCode(
  'eyJ2IjoiMS4wIiwicCI6IjEyMyIsImgiOiJkaWQ6YXVyYTptYWlubmV0OmFiYzEyMyIsInZjcyI6WyJ2YzEiXSwiY3R4Ijp7fSwiZXhwIjoxNzM1NTYwMDAwLCJuIjoxMjM0NTYsInNpZyI6ImFiY2RlZiJ9' // pragma: allowlist secret
);
```

### Custom Validation Options

```typescript
import { validateQRCodeData } from '@aura/verifier-sdk/qr';

const result = validateQRCodeData(qrData, {
  checkExpiration: true,
  expirationTolerance: 60, // 60 second tolerance
  validateDID: true,
  validateSignature: true,
  supportedVersions: ['1.0', '1.1'],
});

if (result.valid) {
  console.log('Valid!');
} else {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

### Handling Expired QR Codes

```typescript
import { parseAndValidateQRCode, QRExpiredError } from '@aura/verifier-sdk/qr';

try {
  const qrData = parseAndValidateQRCode(qrString);
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.error('Expired at:', new Date(error.expirationTime * 1000));
    console.error('Time since expiration:', error.timeSinceExpiration, 'seconds');

    // Check if within tolerance
    if (error.isWithinTolerance(60)) {
      console.log('Within 60-second tolerance, might accept anyway');
    }
  }
}
```

### Checking Disclosure Context

```typescript
const qrData = parseAndValidateQRCode(qrString);

if (qrData.ctx.show_full_name) {
  console.log('Full name will be disclosed');
}

if (qrData.ctx.show_age_over_21) {
  console.log('Age verification (21+) will be disclosed');
}

if (qrData.ctx.show_full_address) {
  console.log('Full address will be disclosed');
}
```

### Detailed Validation Results

```typescript
import { validateQRCodeData } from '@aura/verifier-sdk/qr';

const result = validateQRCodeData(qrData);

// Check for specific errors
const didErrors = result.errors.filter((e) => e.field === 'h');
const expirationErrors = result.errors.filter((e) => e.field === 'exp');

// Check warnings
result.warnings.forEach((warning) => {
  console.warn(`[${warning.field}] ${warning.message}`);
});
```

## Types

### `QRCodeData`

Main QR code data structure.

```typescript
interface QRCodeData {
  v: string; // Protocol version
  p: string; // Presentation ID
  h: string; // Holder DID
  vcs: string[]; // VC IDs
  ctx: DisclosureContext; // Disclosure context
  exp: number; // Expiration timestamp
  n: number; // Nonce
  sig: string; // Signature (hex)
}
```

### `DisclosureContext`

Specifies which credential attributes to reveal.

```typescript
interface DisclosureContext {
  show_full_name?: boolean;
  show_age?: boolean;
  show_age_over_18?: boolean;
  show_age_over_21?: boolean;
  show_city_state?: boolean;
  show_full_address?: boolean;
  [key: string]: boolean | undefined;
}
```

### `ValidationResult`

Result of validation operation.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
```

### `ValidationError`

Individual validation error or warning.

```typescript
interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

## Testing

Run tests with vitest:

```bash
npm test
```

The test suite includes:

- Valid QR code parsing
- Expired QR code handling
- Malformed QR code detection
- Missing field detection
- Invalid data type detection
- DID format validation
- Signature format validation
- Edge cases and security tests

## Security Considerations

1. **Expiration Checking**: Always validate expiration timestamps
2. **DID Validation**: Verify DID format matches expected pattern
3. **Signature Verification**: Check signature format (actual crypto verification done separately)
4. **Nonce Tracking**: Implement nonce reuse detection to prevent replay attacks
5. **Input Sanitization**: All inputs are validated and sanitized
6. **Length Limits**: Maximum lengths enforced to prevent DoS attacks

## License

See main SDK license.
