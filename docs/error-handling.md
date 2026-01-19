# Error Handling

Comprehensive guide to handling errors in the Aura Verifier SDK.

## Table of Contents

- [Error Types](#error-types)
- [Error Codes](#error-codes)
- [Error Handling Patterns](#error-handling-patterns)
- [Common Errors](#common-errors)
- [Retry Strategies](#retry-strategies)
- [Production Error Handling](#production-error-handling)
- [Logging and Monitoring](#logging-and-monitoring)

## Error Types

All SDK errors extend the base `VerifierError` class, which provides consistent error handling.

### Base Error Class

```typescript
class VerifierError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  )
}
```

**Properties:**
- `message`: Human-readable error description
- `code`: Machine-readable error code for programmatic handling
- `details`: Additional context about the error
- `name`: Error class name (e.g., "SignatureVerificationError")

### Error Hierarchy

```
VerifierError (base class)
├── SignatureVerificationError
├── InvalidPublicKeyError
├── InvalidSignatureError
├── TransactionVerificationError
├── RpcConnectionError
├── InvalidConfigError
├── EncodingError
└── QRParseError
```

## Error Codes

### Configuration Errors

| Code | Error Class | Description |
|------|-------------|-------------|
| `INVALID_CONFIG` | InvalidConfigError | SDK configuration is invalid |

**Example:**
```typescript
{
  code: 'INVALID_CONFIG',
  message: 'RPC endpoint is required and must be a string',
  details: {
    providedConfig: { rpcEndpoint: undefined }
  }
}
```

### Connection Errors

| Code | Error Class | Description |
|------|-------------|-------------|
| `RPC_CONNECTION_FAILED` | RpcConnectionError | Failed to connect to RPC endpoint |

**Example:**
```typescript
{
  code: 'RPC_CONNECTION_FAILED',
  message: 'Failed to connect to RPC endpoint',
  details: {
    endpoint: 'https://rpc.aurablockchain.org',
    error: 'Network timeout after 30000ms'
  }
}
```

### Signature Verification Errors

| Code | Error Class | Description |
|------|-------------|-------------|
| `SIGNATURE_VERIFICATION_FAILED` | SignatureVerificationError | Signature verification failed |
| `INVALID_PUBLIC_KEY` | InvalidPublicKeyError | Public key format is invalid |
| `INVALID_SIGNATURE` | InvalidSignatureError | Signature format is invalid |

**Examples:**
```typescript
// Signature verification failed
{
  code: 'SIGNATURE_VERIFICATION_FAILED',
  message: 'Signature does not match message',
  details: {
    algorithm: 'ed25519',
    publicKey: 'a1b2c3...',
    messageHash: 'd4e5f6...'
  }
}

// Invalid public key
{
  code: 'INVALID_PUBLIC_KEY',
  message: 'Public key must be 64 hex characters for Ed25519',
  details: {
    providedLength: 32,
    expectedLength: 64,
    algorithm: 'ed25519'
  }
}
```

### Transaction Verification Errors

| Code | Error Class | Description |
|------|-------------|-------------|
| `TRANSACTION_VERIFICATION_FAILED` | TransactionVerificationError | Transaction verification failed |

**Example:**
```typescript
{
  code: 'TRANSACTION_VERIFICATION_FAILED',
  message: 'Transaction not found',
  details: {
    txHash: 'ABC123...',
    chainId: 'aura-mvp-1'
  }
}
```

### QR Code Parsing Errors

| Code | Error Class | Description |
|------|-------------|-------------|
| `QR_PARSE_INVALID_FORMAT` | QRParseError | QR code format is invalid |
| `QR_PARSE_INVALID_BASE64` | QRParseError | Base64 decoding failed |
| `QR_PARSE_INVALID_JSON` | QRParseError | JSON parsing failed |
| `QR_PARSE_MISSING_FIELDS` | QRParseError | Required fields are missing |

**Examples:**
```typescript
// Invalid format
{
  code: 'QR_PARSE_INVALID_FORMAT',
  message: 'QR string must be a non-empty string',
  details: {
    providedType: 'number'
  }
}

// Missing fields
{
  code: 'QR_PARSE_MISSING_FIELDS',
  message: 'Missing required fields: v, p, h',
  details: {
    missingFields: ['v', 'p', 'h'],
    providedFields: ['vcs', 'ctx', 'exp', 'n', 'sig']
  }
}
```

### Encoding Errors

| Code | Error Class | Description |
|------|-------------|-------------|
| `ENCODING_ERROR` | EncodingError | Encoding/decoding operation failed |

**Example:**
```typescript
{
  code: 'ENCODING_ERROR',
  message: 'Failed to decode base64 string',
  details: {
    operation: 'base64-decode',
    input: 'invalid-base64!!!'
  }
}
```

## Error Handling Patterns

### Try-Catch Pattern

Basic error handling with try-catch:

```typescript
import { VerifierSDK, VerifierError } from '@aura-network/verifier-sdk';

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org'
});

try {
  const result = await verifier.verifySignature({
    publicKey: publicKey,
    message: message,
    signature: signature,
    algorithm: 'ed25519'
  });

  if (result.valid) {
    console.log('Signature is valid');
  } else {
    console.log('Signature is invalid:', result.error);
  }
} catch (error) {
  if (error instanceof VerifierError) {
    console.error('SDK Error:', error.code, error.message);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Type-Safe Error Handling

Check specific error types:

```typescript
import {
  VerifierError,
  SignatureVerificationError,
  RpcConnectionError,
  InvalidConfigError
} from '@aura-network/verifier-sdk';

try {
  // ... verification code ...
} catch (error) {
  if (error instanceof SignatureVerificationError) {
    // Handle signature errors
    console.error('Signature verification failed');
    logSecurityEvent('invalid_signature', error.details);
    return { valid: false, reason: 'invalid_signature' };

  } else if (error instanceof RpcConnectionError) {
    // Handle connection errors
    console.error('Network error - retrying...');
    return await retryWithBackoff(() => verify());

  } else if (error instanceof InvalidConfigError) {
    // Handle config errors
    console.error('Configuration error:', error.message);
    alertAdministrator(error);
    throw error; // Re-throw config errors

  } else if (error instanceof VerifierError) {
    // Handle other SDK errors
    console.error('SDK error:', error.code, error.message);
    return { valid: false, reason: error.code };

  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

### Error Code Checking

Handle errors based on error codes:

```typescript
try {
  const result = await verifier.verifySignature(request);
} catch (error) {
  if (error instanceof VerifierError) {
    switch (error.code) {
      case 'SIGNATURE_VERIFICATION_FAILED':
        return handleInvalidSignature(error);

      case 'RPC_CONNECTION_FAILED':
        return handleNetworkError(error);

      case 'INVALID_PUBLIC_KEY':
        return handleInvalidKey(error);

      default:
        return handleUnknownError(error);
    }
  }
}
```

### Result Pattern (No Throws)

Use non-throwing variants for cleaner code:

```typescript
import { parseQRCodeSafe } from '@aura-network/verifier-sdk';

// Non-throwing version returns a result object
const result = parseQRCodeSafe(qrString);

if (result.success) {
  console.log('QR code parsed:', result.data);
  // Continue with verification
} else {
  console.error('Parse failed:', result.error);
  // Handle error gracefully
  return { valid: false, error: result.error };
}
```

## Common Errors

### 1. RPC Connection Failed

**Cause:** Cannot connect to blockchain RPC endpoint

**Solutions:**
```typescript
try {
  await verifier.verifyTransaction(request);
} catch (error) {
  if (error instanceof RpcConnectionError) {
    // Solution 1: Check network connectivity
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      // Fall back to offline mode
      return await verifyOffline(request);
    }

    // Solution 2: Try alternative endpoint
    const alternativeVerifier = new VerifierSDK({
      rpcEndpoint: 'https://rpc-backup.aurablockchain.org'
    });
    return await alternativeVerifier.verifyTransaction(request);

    // Solution 3: Retry with exponential backoff
    return await retryWithBackoff(
      () => verifier.verifyTransaction(request),
      { maxRetries: 3, initialDelay: 1000 }
    );
  }
}
```

### 2. Invalid Signature

**Cause:** Signature verification failed

**Common Reasons:**
- Message construction mismatch
- Wrong public key
- Corrupted signature data
- Wrong algorithm

**Debug:**
```typescript
try {
  const result = await verifier.verifySignature({
    publicKey: qrData.h,
    message: message,
    signature: qrData.sig,
    algorithm: 'ed25519'
  });
} catch (error) {
  if (error instanceof SignatureVerificationError) {
    console.error('Signature verification failed');

    // Debug: Check message construction
    console.log('Message:', message);
    console.log('Message length:', message.length);
    console.log('Message hash:', hash({ data: message, algorithm: 'sha256', encoding: 'hex' }));

    // Debug: Check public key
    console.log('Public key:', qrData.h);
    console.log('Public key length:', qrData.h.length);

    // Debug: Check signature
    console.log('Signature:', qrData.sig);
    console.log('Signature length:', qrData.sig.length);

    // Verify message matches what holder signed
    const canonicalMessage = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    });

    if (message !== canonicalMessage) {
      console.error('Message mismatch! Message should be:', canonicalMessage);
    }
  }
}
```

### 3. QR Code Parse Errors

**Cause:** Invalid QR code format

**Solutions:**
```typescript
import { parseQRCodeSafe, QRParseError } from '@aura-network/verifier-sdk';

const result = parseQRCodeSafe(qrString);

if (!result.success) {
  // Parse error details
  console.error('Parse error:', result.error);

  // Common fixes:

  // 1. Check QR string format
  if (!qrString.startsWith('aura://verify?data=')) {
    console.error('Invalid URL format. Expected: aura://verify?data=<base64>');
  }

  // 2. Validate base64
  try {
    const base64Part = qrString.split('data=')[1];
    atob(base64Part); // Test base64 decoding
  } catch (e) {
    console.error('Invalid base64 encoding');
  }

  // 3. Check for required fields
  try {
    const decoded = JSON.parse(atob(qrString.split('data=')[1]));
    const requiredFields = ['v', 'p', 'h', 'vcs', 'ctx', 'exp', 'n', 'sig'];
    const missing = requiredFields.filter(f => !(f in decoded));
    if (missing.length > 0) {
      console.error('Missing fields:', missing);
    }
  } catch (e) {
    console.error('Invalid JSON structure');
  }

  return { valid: false, error: 'QR_PARSE_ERROR' };
}
```

### 4. Expired Presentation

**Cause:** QR code presentation has expired

**Solution:**
```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

const qrData = parseQRCode(qrString);
const now = Math.floor(Date.now() / 1000);

if (qrData.exp < now) {
  const expiredAgo = now - qrData.exp;

  console.error('Presentation expired', expiredAgo, 'seconds ago');

  // User-friendly message
  if (expiredAgo < 60) {
    console.log('Please generate a new QR code');
  } else {
    console.log('QR code is too old. Please generate a fresh one.');
  }

  return {
    valid: false,
    error: 'PRESENTATION_EXPIRED',
    details: {
      expiredAt: new Date(qrData.exp * 1000),
      expiredAgo: expiredAgo
    }
  };
}
```

### 5. Transaction Not Found

**Cause:** Transaction doesn't exist on blockchain

**Solution:**
```typescript
try {
  const result = await verifier.verifyTransaction(request);

  if (!result.valid && result.error === 'Transaction not found') {
    console.error('Transaction not found on blockchain');

    // Possible reasons:
    // 1. Transaction hasn't been mined yet (wait and retry)
    await sleep(5000);
    return await verifier.verifyTransaction(request);

    // 2. Wrong chain ID
    const chainId = await verifier.getChainId();
    console.log('Current chain:', chainId);
    console.log('Expected chain:', request.chainId);

    // 3. Invalid transaction hash
    console.log('Transaction hash:', request.txHash);
    console.log('Hash length:', request.txHash.length);
  }
} catch (error) {
  // Handle error
}
```

## Retry Strategies

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break; // Don't retry after last attempt
      }

      // Only retry on network errors
      if (error instanceof RpcConnectionError) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      } else {
        // Don't retry non-network errors
        throw error;
      }
    }
  }

  throw lastError!;
}

// Usage
try {
  const result = await retryWithBackoff(
    () => verifier.verifyTransaction(request),
    { maxRetries: 3, initialDelay: 1000 }
  );
} catch (error) {
  console.error('All retries failed:', error);
}
```

### Conditional Retry

Only retry specific error types:

```typescript
async function retryOnNetworkError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Only retry on network errors
      if (error instanceof RpcConnectionError) {
        if (i < maxRetries - 1) {
          await sleep(1000 * Math.pow(2, i));
          continue;
        }
      }

      // Don't retry other errors
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Circuit Breaker

Prevent cascading failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private maxFailures: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      // Success - reset circuit breaker
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.maxFailures) {
        this.state = 'open';
        console.error('Circuit breaker opened due to repeated failures');
      }

      throw error;
    }
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000);

try {
  const result = await breaker.execute(() =>
    verifier.verifyTransaction(request)
  );
} catch (error) {
  if (error.message === 'Circuit breaker is open') {
    console.error('Too many failures - circuit breaker activated');
    // Fall back to offline mode or queue for later
  }
}
```

## Production Error Handling

### Complete Error Handler

```typescript
import {
  VerifierSDK,
  VerifierError,
  RpcConnectionError,
  SignatureVerificationError,
  QRParseError,
  parseQRCode
} from '@aura-network/verifier-sdk';

class ProductionVerifier {
  private verifier: VerifierSDK;
  private circuitBreaker: CircuitBreaker;
  private errorLogger: ErrorLogger;

  async verifyCredential(qrString: string): Promise<VerificationResponse> {
    try {
      // Step 1: Parse QR code
      const qrData = parseQRCode(qrString);

      // Step 2: Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (qrData.exp < now) {
        return {
          valid: false,
          error: 'PRESENTATION_EXPIRED',
          message: 'Please generate a new QR code',
          userMessage: 'QR code has expired. Please try again.'
        };
      }

      // Step 3: Verify signature with retry
      const sigResult = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          () => this.verifySignatureWithLogging(qrData),
          { maxRetries: 3 }
        );
      });

      if (!sigResult.valid) {
        return {
          valid: false,
          error: 'INVALID_SIGNATURE',
          message: 'Signature verification failed',
          userMessage: 'Unable to verify credential. Please try again.'
        };
      }

      // Step 4: Check disclosure
      if (!this.checkDisclosureRequirements(qrData.ctx)) {
        return {
          valid: false,
          error: 'INSUFFICIENT_DISCLOSURE',
          message: 'Required information not disclosed',
          userMessage: 'Please allow access to required information.'
        };
      }

      // Success
      return {
        valid: true,
        message: 'Verification successful',
        userMessage: 'Access granted',
        metadata: {
          holderDid: qrData.h,
          credentials: qrData.vcs,
          disclosure: qrData.ctx
        }
      };

    } catch (error) {
      return this.handleVerificationError(error);
    }
  }

  private async verifySignatureWithLogging(qrData: QRCodeData) {
    const message = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n
    });

    try {
      return await this.verifier.verifySignature({
        publicKey: qrData.h,
        message: message,
        signature: qrData.sig,
        algorithm: 'ed25519'
      });
    } catch (error) {
      this.errorLogger.log('signature_verification_failed', {
        error: error,
        holderDid: qrData.h,
        presentationId: qrData.p
      });
      throw error;
    }
  }

  private handleVerificationError(error: unknown): VerificationResponse {
    if (error instanceof QRParseError) {
      this.errorLogger.log('qr_parse_error', { error });
      return {
        valid: false,
        error: error.code,
        message: error.message,
        userMessage: 'Invalid QR code. Please scan again.'
      };

    } else if (error instanceof SignatureVerificationError) {
      this.errorLogger.log('signature_error', { error });
      return {
        valid: false,
        error: error.code,
        message: error.message,
        userMessage: 'Unable to verify credential. Please try again.'
      };

    } else if (error instanceof RpcConnectionError) {
      this.errorLogger.log('network_error', { error });
      return {
        valid: false,
        error: error.code,
        message: error.message,
        userMessage: 'Network error. Please check your connection.'
      };

    } else if (error instanceof VerifierError) {
      this.errorLogger.log('sdk_error', { error });
      return {
        valid: false,
        error: error.code,
        message: error.message,
        userMessage: 'Verification failed. Please try again.'
      };

    } else {
      // Unexpected error
      this.errorLogger.log('unexpected_error', { error });
      return {
        valid: false,
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        userMessage: 'Something went wrong. Please try again later.'
      };
    }
  }

  private checkDisclosureRequirements(ctx: DisclosureContext): boolean {
    // Example: Require age verification
    return ctx.show_age_over_21 === true;
  }
}

interface VerificationResponse {
  valid: boolean;
  error?: string;
  message: string;
  userMessage: string;
  metadata?: Record<string, unknown>;
}
```

## Logging and Monitoring

### Error Logging

```typescript
class ErrorLogger {
  log(eventType: string, data: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: eventType,
      data: this.sanitizeData(data),
      environment: process.env.NODE_ENV
    };

    // Log to console (development)
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
    }

    // Send to monitoring service (production)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(logEntry);
    }

    // Store in database for analytics
    this.storeInDatabase(logEntry);
  }

  private sanitizeData(data: any): any {
    // Remove sensitive information
    const sanitized = { ...data };

    // Remove PII
    delete sanitized.personalInfo;
    delete sanitized.fullName;
    delete sanitized.address;

    // Truncate long values
    if (sanitized.signature) {
      sanitized.signature = sanitized.signature.substring(0, 16) + '...';
    }

    return sanitized;
  }

  private sendToMonitoring(entry: any) {
    // Send to Sentry, DataDog, etc.
  }

  private storeInDatabase(entry: any) {
    // Store for analytics
  }
}
```

### Metrics Collection

```typescript
class MetricsCollector {
  private metrics: Map<string, number> = new Map();

  increment(metric: string, value: number = 1) {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

// Usage
const metrics = new MetricsCollector();

try {
  await verifier.verifySignature(request);
  metrics.increment('verifications.success');
} catch (error) {
  if (error instanceof RpcConnectionError) {
    metrics.increment('verifications.network_error');
  } else if (error instanceof SignatureVerificationError) {
    metrics.increment('verifications.invalid_signature');
  } else {
    metrics.increment('verifications.unknown_error');
  }
}

// Report metrics
setInterval(() => {
  console.log('Metrics:', metrics.getMetrics());
}, 60000); // Every minute
```

## Next Steps

- [Security Guide](./security.md) - Security best practices
- [Verification Flow](./verification-flow.md) - Understanding verification
- [Offline Mode](./offline-mode.md) - Offline error handling
- [API Reference](./api-reference.md) - Complete error reference
