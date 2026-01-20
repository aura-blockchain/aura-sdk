# Integration Tests for Aura Verifier SDK

This directory contains comprehensive integration tests for the Aura Verifier SDK. These tests validate end-to-end workflows and verify that all components work together correctly.

## Test Suites

### 1. Verification Flow (`verification-flow.integration.test.ts`)

Tests the complete credential verification workflow from QR code parsing to result generation.

**Coverage:**

- QR code parsing and validation
- Valid credential verification (age 21+, 18+, human, government ID, KYC)
- Multiple credential verification
- Expired credential detection
- Revoked credential detection
- Invalid signature handling
- Network timeout handling
- Retry logic
- Verification metadata tracking
- Convenience methods (isAge21Plus, isAge18Plus, etc.)

**Key Scenarios:**

- ✅ Valid credentials are verified successfully
- ✅ Expired credentials are rejected
- ✅ Revoked credentials are rejected
- ✅ Invalid signatures are detected
- ✅ Network errors are handled gracefully
- ✅ Retries work on transient errors

### 2. Offline Mode (`offline-mode.integration.test.ts`)

Tests offline verification capabilities using cached data.

**Coverage:**

- Cache population during online verification
- Cache retrieval in offline mode
- Revocation list synchronization
- Cache expiration handling
- Offline verification accuracy
- Cache statistics and management
- Mode switching (online ↔ offline)

**Key Scenarios:**

- ✅ Cache is populated during online verification
- ✅ Cached data is used in offline mode
- ✅ Expired cache entries are cleaned up
- ✅ Revocation status is cached
- ✅ Cache statistics are tracked
- ✅ Switching between online and offline modes works

### 3. Network Switching (`network-switching.integration.test.ts`)

Tests network configuration and endpoint management.

**Coverage:**

- Mainnet configuration and endpoints
- Testnet configuration and endpoints
- Local network configuration
- Custom endpoint configuration
- Network failover
- Timeout configuration
- Network detection from DIDs

**Key Scenarios:**

- ✅ Correct endpoints are used for each network
- ✅ Custom endpoints can be configured
- ✅ Network failover works on primary endpoint failure
- ✅ Retries work on transient network errors
- ✅ Cached data is used when network is unavailable

### 4. Batch Verification (`batch-verification.integration.test.ts`)

Tests parallel verification of multiple credentials.

**Coverage:**

- Parallel verification of valid credentials
- Mixed result handling (valid/invalid)
- Partial failure scenarios
- Rate limiting and concurrency control
- Batch performance metrics
- Timeout handling
- Empty batch handling

**Key Scenarios:**

- ✅ Multiple credentials verified in parallel
- ✅ Batch processing is faster than sequential
- ✅ Mixed results (valid/invalid) are handled correctly
- ✅ Concurrency limits are respected
- ✅ Batch statistics are tracked accurately
- ✅ Timeouts apply to entire batch

### 5. Security (`security.integration.test.ts`)

Tests security features and attack prevention mechanisms.

**Coverage:**

- Replay attack prevention (nonce validation)
- Expired credential rejection
- Revoked credential handling
- Invalid signature detection
- Malformed input handling
- Input sanitization
- DID format validation
- Credential ID validation
- Timestamp validation
- Resource exhaustion prevention

**Key Scenarios:**

- ✅ Duplicate nonces are detected (replay attacks)
- ✅ Expired credentials are rejected
- ✅ Revoked credentials are rejected
- ✅ Invalid signatures are detected
- ✅ Malformed inputs are rejected safely
- ✅ SQL/script injection attempts are sanitized
- ✅ Resource limits are enforced

## Test Fixtures

### Test Credentials (`__fixtures__/test-credentials.ts`)

Provides comprehensive test data including:

- **Valid QR codes:** Age 21+, 18+, human, government ID, KYC
- **Expired QR codes:** Various expiration times
- **Revoked credentials:** Single and partial revocation
- **Invalid signatures:** Short, malformed, empty
- **Malformed QR codes:** Invalid base64, JSON, missing fields
- **Special cases:** Zero nonce, duplicate nonce, long-lived, etc.
- **Batch fixtures:** Generators for various batch scenarios

### Mock Server (`__fixtures__/mock-server.ts`)

Provides configurable mock blockchain server:

- **Latency simulation:** Configurable network delay
- **Error simulation:** Configurable error rate
- **Timeout simulation:** Simulate request timeouts
- **DID resolution:** Mock DID document queries
- **VC status queries:** Mock credential status checks
- **Server variants:** Fast, slow, unstable servers

## Running the Tests

### Run all integration tests:

```bash
npm test -- __integration__
```

### Run specific test suite:

```bash
npm test -- verification-flow.integration.test.ts
npm test -- offline-mode.integration.test.ts
npm test -- network-switching.integration.test.ts
npm test -- batch-verification.integration.test.ts
npm test -- security.integration.test.ts
```

### Run with coverage:

```bash
npm test -- --coverage __integration__
```

### Run in watch mode:

```bash
npm test -- --watch __integration__
```

## Test Configuration

Tests use the following configuration:

- **Test framework:** Vitest
- **Network:** Testnet (by default)
- **Timeout:** 10 seconds per test (extended for long-running tests)
- **Mock server latency:** 50ms (configurable per test)
- **Concurrency:** Tests run in parallel where safe

## Writing New Tests

When adding new integration tests:

1. **Use existing fixtures** from `__fixtures__/` where possible
2. **Mock blockchain calls** using `MockBlockchainServer`
3. **Clean up resources** in `afterEach` hooks
4. **Use descriptive test names** that explain the scenario
5. **Test both success and failure paths**
6. **Include timeout handling** for async operations
7. **Restore mocks** after each test

### Example:

```typescript
describe('My New Feature', () => {
  let verifier: AuraVerifier;
  let mockServer: MockBlockchainServer;

  beforeEach(async () => {
    mockServer = createMockServer();
    verifier = new AuraVerifier({
      network: 'testnet',
      verbose: false,
    });

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

  it('should do something', async () => {
    // Test implementation
  });
});
```

## Test Coverage Goals

Integration tests aim for:

- **95%+ coverage** of main verification flows
- **100% coverage** of security-critical paths
- **Edge case coverage** for error handling
- **Performance benchmarks** for batch operations

## Troubleshooting

### Tests timing out

- Increase timeout for specific tests using `{ timeout: 30000 }`
- Check mock server latency settings
- Ensure cleanup is happening in `afterEach`

### Flaky tests

- Check for race conditions in parallel tests
- Ensure proper cleanup between tests
- Use deterministic test data (avoid random values)

### Mock not working

- Verify mock is applied before `initialize()`
- Check that mock is restored in `afterEach`
- Ensure correct method name in spy

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Aura Verifier SDK Documentation](../../README.md)
- [QR Code Specification](../../qr/README.md)
- [Verification Flow Documentation](../../verification/README.md)
