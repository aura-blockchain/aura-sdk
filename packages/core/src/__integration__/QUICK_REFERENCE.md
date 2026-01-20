# Integration Tests - Quick Reference

## Running Tests

```bash
# All integration tests
npm test -- __integration__

# Specific test file
npm test -- verification-flow.integration.test.ts
npm test -- offline-mode.integration.test.ts
npm test -- network-switching.integration.test.ts
npm test -- batch-verification.integration.test.ts
npm test -- security.integration.test.ts

# With coverage
npm test -- __integration__ --coverage

# Watch mode
npm test -- __integration__ --watch

# Using test runner script
./src/__integration__/run-tests.sh [verification|offline|network|batch|security] [--coverage] [--watch]
```

## Common Test Patterns

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuraVerifier } from '../verification/verifier.js';
import { createMockServer } from './__fixtures__/mock-server.js';
import { VALID_AGE_21_QR } from './__fixtures__/test-credentials.js';

describe('My Test Suite', () => {
  let verifier: AuraVerifier;
  let mockServer: MockBlockchainServer;

  beforeEach(async () => {
    mockServer = createMockServer();
    verifier = new AuraVerifier({ network: 'testnet', verbose: false });

    vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(async (did: string) =>
      mockServer.queryDIDDocument(did)
    );

    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
    mockServer.reset();
    vi.restoreAllMocks();
  });

  it('should verify valid credential', async () => {
    const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
    expect(result.isValid).toBe(true);
  });
});
```

### Testing with Mock Server

```typescript
// Standard server (50ms latency)
const mockServer = createMockServer();

// Fast server (no latency)
const fastServer = createFastServer();

// Slow server (2s latency)
const slowServer = createSlowServer();

// Unstable server (random errors/timeouts)
const unstableServer = createUnstableServer();

// Custom configuration
const customServer = createMockServer({
  latency: 100,
  errorRate: 0.1,
  simulateTimeouts: true,
});
```

### Testing Batch Operations

```typescript
import { generateValidQRBatch } from './__fixtures__/test-credentials.js';

const qrCodes = generateValidQRBatch(10);
const requests = qrCodes.map((qr) => ({ qrCodeData: qr }));
const results = await verifier.verifyBatch(requests);

expect(results).toHaveLength(10);
expect(results.every((r) => r.isValid)).toBe(true);
```

### Testing Offline Mode

```typescript
// Verify online to populate cache
await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

// Switch to offline
await verifier.enableOfflineMode();

// Verify offline
const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
expect(result.verificationMethod).toBe('cached');
```

## Available Fixtures

### Valid Credentials

- `VALID_AGE_21_QR` - Age 21+ credential
- `VALID_AGE_18_QR` - Age 18+ credential
- `VALID_HUMAN_QR` - Verified human
- `VALID_GOVERNMENT_ID_QR` - Government ID
- `VALID_KYC_QR` - KYC credential
- `VALID_MULTI_CREDENTIAL_QR` - Multiple credentials

### Invalid/Error Cases

- `EXPIRED_QR_1_HOUR` - Expired credential
- `REVOKED_CREDENTIAL_QR` - Revoked credential
- `INVALID_SIGNATURE_SHORT_QR` - Invalid signature
- `MALFORMED_INVALID_BASE64` - Malformed QR
- `ZERO_NONCE_QR` - Zero nonce
- `EMPTY_VCS_QR` - Empty credential array

### Generators

```typescript
generateValidQRBatch(count: number) // Valid QR codes
generateMixedQRBatch(valid: number, invalid: number) // Mixed
generateExpiredQRBatch(count: number) // All expired
createMockQRCodeData(overrides?: Partial<QRCodeData>) // Custom QR
encodeQRCodeData(data: QRCodeData) // Encode to aura:// URL
```

## Common Assertions

```typescript
// Verification result
expect(result.isValid).toBe(true);
expect(result.holderDID).toContain('did:aura:');
expect(result.vcDetails).toHaveLength(1);
expect(result.signatureValid).toBe(true);
expect(result.verificationMethod).toBe('online');

// Errors
expect(result.isValid).toBe(false);
expect(result.verificationError).toContain('expired');
expect(result.verificationError).toBeDefined();

// Metadata
expect(result.auditId).toBeTruthy();
expect(result.networkLatency).toBeGreaterThan(0);
expect(result.verifiedAt).toBeInstanceOf(Date);

// Credentials
expect(result.vcDetails[0]?.vcId).toBe('vc_age_21_valid_001');
expect(result.vcDetails[0]?.status).toBe('active');

// Batch results
expect(batchResult.successCount).toBe(10);
expect(batchResult.failureCount).toBe(0);
expect(batchResult.totalTime).toBeGreaterThan(0);
```

## Test Timeouts

```typescript
// Default timeout: 5000ms
it('normal test', async () => { ... });

// Extended timeout
it('long running test', async () => { ... }, 30000);

// Timeout for specific operation
const result = await Promise.race([
  verifier.verify({ qrCodeData: QR }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);
```

## Mocking Strategies

### Mock Blockchain Queries

```typescript
vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(async (did: string) => ({
  id: did,
  verificationMethod: [],
  authentication: [],
}));

vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
  async (vcId: string) => 'active' as VCStatus
);
```

### Track Mock Calls

```typescript
let callCount = 0;
vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(async (vcId: string) => {
  callCount++;
  return mockServer.queryVCStatus(vcId);
});

await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
expect(callCount).toBeGreaterThan(0);
```

### Simulate Errors

```typescript
vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(async () => {
  throw new Error('Network unavailable');
});
```

## Debugging Tips

### Enable Verbose Logging

```typescript
const verifier = new AuraVerifier({
  network: 'testnet',
  verbose: true, // Enable detailed logging
});
```

### Check Mock Server Stats

```typescript
const stats = mockServer.getStats();
console.log('Request count:', stats.requestCount);
console.log('Active requests:', stats.activeRequests);
```

### Inspect Test State

```typescript
console.log('Verifier config:', (verifier as any).config);
console.log('Cache size:', verifier['vcStatusCache'].size);
console.log('DID cache:', verifier['didCache']);
```

### Async Debugging

```typescript
// Use explicit promises for better stack traces
const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR }).catch((error) => {
  console.error('Verification failed:', error);
  throw error;
});
```

## Performance Testing

```typescript
// Measure duration
const startTime = Date.now();
await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
const duration = Date.now() - startTime;

expect(duration).toBeLessThan(1000); // Should complete in < 1s

// Compare sequential vs parallel
const sequential = await measureSequential();
const parallel = await measureParallel();
expect(parallel).toBeLessThan(sequential);
```

## Coverage

```bash
# Run with coverage
npm test -- __integration__ --coverage

# Coverage output
# - Terminal summary
# - HTML report in ./coverage/
# - LCOV report in ./coverage/lcov.info
```

## Common Issues

### Tests Hanging

- Check for missing `await` in async operations
- Ensure cleanup in `afterEach` hooks
- Verify mock server timeouts

### Flaky Tests

- Use deterministic test data
- Avoid race conditions
- Ensure proper cleanup between tests
- Check for shared state

### Mock Not Working

- Apply mock before `initialize()`
- Restore mocks in `afterEach`
- Verify correct method name

### TypeScript Errors

- Some pre-existing errors in encryption modules
- Integration tests should compile without errors
- Check import paths (use .js extension)

## Best Practices

1. **Always clean up resources**

   ```typescript
   afterEach(async () => {
     await verifier.destroy();
     mockServer.reset();
     vi.restoreAllMocks();
   });
   ```

2. **Use descriptive test names**

   ```typescript
   it('should reject expired credential from 1 hour ago', async () => {
     // Test implementation
   });
   ```

3. **Test both success and failure paths**

   ```typescript
   describe('Credential Verification', () => {
     it('should verify valid credential', async () => { ... });
     it('should reject expired credential', async () => { ... });
     it('should reject revoked credential', async () => { ... });
   });
   ```

4. **Use fixtures consistently**

   ```typescript
   import { VALID_AGE_21_QR } from './__fixtures__/test-credentials.js';
   // Don't create inline test data
   ```

5. **Handle timeouts appropriately**
   ```typescript
   it('long test', async () => { ... }, 30000);
   ```

## Quick Links

- [README.md](./README.md) - Detailed documentation
- [TEST_SUMMARY.md](./TEST_SUMMARY.md) - Complete test statistics
- [**fixtures**/](./fixtures/) - Test fixtures
- [run-tests.sh](./run-tests.sh) - Test runner script
