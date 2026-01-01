# Integration Test Suite

Comprehensive integration tests for the Aura Verifier SDK that test the interaction between multiple modules and components.

## Test Files

### 1. QR Code Integration Tests (`qr-integration.test.ts`)

Tests the integration between QR code parsing, validation, and signature verification.

**Test Coverage:**
- QR code parsing from various formats (aura:// protocol, raw base64)
- QR code validation with strict and lenient modes
- Expiration logic and time-based validation
- Signature format verification
- Disclosure context validation
- Edge cases and error handling
- Performance benchmarks

**Key Scenarios:**
- Valid QR codes with different credential types
- Expired QR codes at various time intervals
- Malformed QR codes (invalid base64, JSON, missing fields)
- Signature validation (length, format, hex encoding)
- Multiple credentials in single QR
- Stress tests with 1000+ QR codes

### 2. Verification Flow Tests (`verification-flow.test.ts`)

Tests the complete end-to-end verification workflow.

**Test Coverage:**
- Complete verification pipeline (parse → validate → verify → result)
- Mock network responses for blockchain queries
- Offline mode fallback behavior
- Batch verification processing
- Retry logic and error recovery
- Cache integration
- Event emission

**Key Scenarios:**
- Valid credential verification flow
- Required VC types validation
- Credential age validation
- Network latency tracking
- Convenience methods (isAge21Plus, isVerifiedHuman, getAuraScore)
- Batch verification with mixed valid/invalid QRs
- Network error handling and timeout
- Verifier lifecycle (initialize, destroy)

### 3. Security Integration Tests (`security-integration.test.ts`)

Tests the integration between security components.

**Test Coverage:**
- Nonce manager with rate limiter coordination
- Audit logging during verification
- Threat detection patterns
- Input sanitization
- Complete security workflow

**Key Scenarios:**
- Replay attack prevention with nonce tracking
- Rate limiting enforcement
- Audit log chain integrity (tamper-evident)
- Sensitive data redaction in logs
- Rapid request detection
- Brute force pattern detection
- Credential stuffing detection
- Auto-blocking on critical threats
- Security violation workflow

### 4. Crypto Integration Tests (`crypto-integration.test.ts`)

Tests the integration of cryptographic operations.

**Test Coverage:**
- Ed25519 signature generation and verification
- Secp256k1 signature verification
- Hash operations (SHA-256, double SHA-256)
- Hex conversion utilities
- Cross-algorithm compatibility

**Key Scenarios:**
- Ed25519 async and sync verification
- Secp256k1 compressed and uncompressed keys
- Public key compression/decompression
- Hash determinism and collision resistance
- JSON object hashing
- QR code signature verification workflow
- Cross-algorithm hash sharing
- Performance benchmarks (100+ signatures)
- Error handling for malformed inputs

## Running Tests

### Run All Integration Tests
```bash
npm test -- __tests__/integration
```

### Run Specific Test File
```bash
npm test -- __tests__/integration/qr-integration.test.ts
npm test -- __tests__/integration/verification-flow.test.ts
npm test -- __tests__/integration/security-integration.test.ts
npm test -- __tests__/integration/crypto-integration.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch -- __tests__/integration
```

### Generate Coverage Report
```bash
npm run test:coverage -- __tests__/integration
```

## Test Architecture

### Fixtures and Mocks

The tests use fixtures from `../../__integration__/__fixtures__/`:
- `test-credentials.ts`: Mock QR codes and credential data
- `mock-server.ts`: Mock blockchain server responses

### Test Isolation

Each test file:
- Uses `beforeEach` to set up fresh instances
- Uses `afterEach` to clean up and restore mocks
- Maintains test isolation with separate state

### Mocking Strategy

Tests mock:
- Blockchain queries (DID resolution, VC status)
- Network latency and errors
- Time-based operations (for expiration testing)

Real implementations used:
- Cryptographic operations (Ed25519, secp256k1)
- Hash functions (SHA-256)
- Parsing and validation logic

## Test Quality Standards

All tests follow these standards:

1. **Clear Descriptions**: Each test has a descriptive `it()` statement
2. **Proper Setup/Teardown**: Use `beforeEach`/`afterEach` consistently
3. **Comprehensive Assertions**: Multiple expect statements per test
4. **Edge Case Coverage**: Test boundary conditions and error paths
5. **Performance Awareness**: Include performance benchmarks
6. **Mock Cleanup**: Always restore mocks in `afterEach`

## Coverage Goals

Integration tests aim for:
- **Module Integration**: 100% coverage of module interactions
- **Critical Paths**: 100% coverage of main verification flows
- **Security Features**: 100% coverage of security components
- **Error Scenarios**: Extensive coverage of failure modes

## Adding New Tests

When adding new integration tests:

1. Choose the appropriate test file based on the feature area
2. Follow existing test structure and naming conventions
3. Use fixtures from `__fixtures__/` when possible
4. Add both success and failure scenarios
5. Include performance considerations for heavy operations
6. Document any new test patterns in this README

## Common Test Patterns

### Testing Async Operations
```typescript
it('should handle async operation', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Mocking Blockchain Queries
```typescript
vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
  async (did: string) => ({
    id: did,
    verificationMethod: [],
    authentication: [],
  })
);
```

### Testing Error Scenarios
```typescript
it('should handle errors gracefully', async () => {
  await expect(
    functionThatShouldFail()
  ).rejects.toThrow('Expected error message');
});
```

### Performance Testing
```typescript
it('should complete operation efficiently', () => {
  const startTime = Date.now();

  // Perform operation
  for (let i = 0; i < 1000; i++) {
    operation();
  }

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(expectedThreshold);
});
```

## Debugging Tests

### Run Tests with Verbose Output
```bash
npm test -- __tests__/integration --reporter=verbose
```

### Debug Single Test
Add `.only` to focus on a specific test:
```typescript
it.only('should test specific scenario', () => {
  // This test will run in isolation
});
```

### Debug with Console Logs
Use `console.log` in tests, but remove before committing:
```typescript
it('should debug', () => {
  const result = someFunction();
  console.log('DEBUG:', result); // Remove after debugging
  expect(result).toBe(expected);
});
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (< 30 seconds total)
- No external dependencies
- Deterministic results
- Clear failure messages

## Maintenance

### Regular Updates
- Update fixtures when QR format changes
- Add tests for new features
- Update mocks when blockchain queries change
- Maintain performance benchmarks

### Deprecation
- Mark deprecated tests with comments
- Remove tests for removed features
- Update documentation when test coverage changes

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [SDK Documentation](../../../../README.md)
