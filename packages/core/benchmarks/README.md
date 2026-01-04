# Aura Verifier SDK - Performance Benchmarks

Comprehensive performance benchmarking suite for the Aura Verifier SDK, measuring throughput, latency, and resource usage across all critical components.

## Overview

This benchmark suite provides detailed performance metrics for:

1. **QR Parsing** - QR code parsing performance across different payload sizes
2. **Cryptographic Signatures** - Ed25519 and Secp256k1 verification throughput
3. **Cache Operations** - Cache hit/miss rates, memory usage, and lookup latency
4. **End-to-End Verification** - Full verification flow performance under various loads

## Performance Targets

- **P95 Latency**: < 200ms for end-to-end verification
- **Throughput**: > 100 verifications/second
- **Memory**: Efficient memory usage with bounded cache growth

## Running Benchmarks

### Install Dependencies

```bash
# From repo root
cd packages/core
npm install
```

### Build the Project

```bash
npm run build
```

### Quick Test (Recommended for First Run)

```bash
npm run benchmark:quick
```

This runs a quick validation of all benchmark components in under 1 minute.

### Run All Benchmarks

```bash
npm run benchmark
```

Or using Node directly:

```bash
node --loader ts-node/esm benchmarks/index.ts
```

Note: Full benchmark suite takes 5-10 minutes to complete.

### Run Specific Benchmark Suites

```bash
# QR parsing only
npm run benchmark -- --qr

# Cryptographic signatures only
npm run benchmark -- --crypto

# Cache performance only
npm run benchmark -- --cache

# End-to-end verification only
npm run benchmark -- --e2e

# Multiple suites
npm run benchmark -- --crypto --e2e

# All benchmarks (explicit)
npm run benchmark -- --all
```

### Run Individual Benchmarks

```bash
# QR Parsing
node --loader ts-node/esm benchmarks/qr-benchmark.ts

# Cryptographic Signatures
node --loader ts-node/esm benchmarks/crypto-benchmark.ts

# Cache Performance
node --loader ts-node/esm benchmarks/cache-benchmark.ts

# End-to-End Verification
node --loader ts-node/esm benchmarks/e2e-benchmark.ts
```

## Benchmark Descriptions

### 1. QR Parsing Benchmark (`qr-benchmark.ts`)

Tests QR code parsing performance across various scenarios:

**Tests:**
- Small QR parsing (1 VC, minimal context)
- Medium QR parsing (3 VCs, moderate context)
- Large QR parsing (10 VCs, full context)
- Raw Base64 parsing (no URL wrapper)
- Safe parsing (non-throwing version)
- Invalid QR error handling
- Concurrent parsing (10 parallel)
- Memory stress test (10,000 iterations)

**Metrics:**
- Operations per second
- Average/P95/P99 latency
- Memory usage
- Throughput

**Example Output:**
```
Small QR Parsing (1 VC, minimal context)
--------------------------------------------------------------------------------
  Iterations:       5,000
  Total Time:       245.32 ms
  Average Time:     0.05 ms
  Ops/Second:       20,384
  P95 Latency:      0.08 ms
  P99 Latency:      0.12 ms
```

### 2. Cryptographic Signature Benchmark (`crypto-benchmark.ts`)

Measures signature verification performance for both algorithms:

**Tests:**
- Ed25519 verification (async & sync)
- Secp256k1 verification (async & sync)
- Unified signature verification (auto-detect)
- String message verification
- Object message verification (JSON + hash)
- Batch verification (10 signatures)
- Throughput stress test (5 seconds)
- Concurrent verification test (various concurrency levels)

**Metrics:**
- Operations per second
- Average/P95/P99 latency
- Algorithm comparison
- Concurrent performance

**Example Output:**
```
Ed25519 Verification (Async)
--------------------------------------------------------------------------------
  Iterations:       2,000
  Total Time:       156.78 ms
  Average Time:     0.08 ms
  Ops/Second:       12,756
  P95 Latency:      0.11 ms
  P99 Latency:      0.15 ms
```

### 3. Cache Performance Benchmark (`cache-benchmark.ts`)

Tests cache operations and memory efficiency:

**Tests:**
- Cache write (set)
- Cache read - hit
- Cache read - miss
- Cache delete
- Cache existence check (has)
- Cache statistics (getStats)
- Cache eviction (LRU)
- Hit rate test (various ratios)
- Memory usage test (different cache sizes)
- Concurrent access test
- Cache expiration test

**Metrics:**
- Operations per second
- Average/P95/P99 latency
- Hit/miss rates
- Memory usage per entry
- Eviction performance

**Example Output:**
```
Cache Read (get) - Hit
--------------------------------------------------------------------------------
  Iterations:       5,000
  Total Time:       89.45 ms
  Average Time:     0.02 ms
  Ops/Second:       55,910
  P95 Latency:      0.03 ms
  P99 Latency:      0.05 ms
  Memory Used:      2.45 MB
```

### 4. End-to-End Verification Benchmark (`e2e-benchmark.ts`)

Measures full verification flow performance:

**Tests:**
- Full verification (parse + validate + verify signature)
- Full verification with cache hit
- Full verification with cache miss
- Large payload (10 VCs)
- Small payload (1 VC)
- Sustained load test (30 seconds)
- Concurrent verification test (various levels)
- Burst load test (10-500 concurrent)

**Metrics:**
- Operations per second
- Min/P50/P95/P99/Max latency
- Throughput under load
- Memory usage
- Latency distribution

**Example Output:**
```
Full Verification (Parse + Validate + Verify Signature)
--------------------------------------------------------------------------------
  Iterations:       1,000
  Total Time:       1,234.56 ms
  Average Time:     1.23 ms
  Ops/Second:       810
  Min Latency:      0.89 ms
  P50 Latency:      1.15 ms
  P95 Latency:      1.87 ms
  P99 Latency:      2.34 ms
  Max Latency:      5.67 ms
```

## Understanding Results

### Latency Percentiles

- **P50 (Median)**: Half of operations complete faster than this
- **P95**: 95% of operations complete faster than this (key SLA metric)
- **P99**: 99% of operations complete faster than this (tail latency)

### Throughput

- **Ops/Second**: Number of operations completed per second
- Higher is better for performance-critical operations

### Memory Usage

- **Memory Used**: Total heap memory consumed during benchmark
- **Per Entry**: Average memory per cached item

### Status Indicators

- **✓ PASS**: Performance meets target (P95 < 200ms)
- **✗ FAIL**: Performance below target threshold

## Performance Optimization Tips

### For QR Parsing

- Use raw Base64 format when possible (slightly faster)
- Batch QR parsing for multiple codes
- Consider caching parsed QR data for repeated scans

### For Signature Verification

- Use sync methods when you don't need async behavior
- Batch verify multiple signatures in parallel
- Ed25519 is ~2-3x faster than Secp256k1
- Pre-validate signature format before verification

### For Cache Operations

- Tune cache size based on expected working set
- Monitor hit rates and adjust TTL accordingly
- Use concurrent access for high-throughput scenarios
- Enable persistence only when needed

### For End-to-End Verification

- Enable caching to reduce blockchain queries
- Use offline mode when network is unavailable
- Process verifications in batches for better throughput
- Monitor P95/P99 latency for SLA compliance

## Benchmark Configuration

You can modify benchmark parameters in each file:

```typescript
// In qr-benchmark.ts
const iterations = 5000; // Adjust iteration count

// In crypto-benchmark.ts
const duration = 5000; // 5 second stress test

// In cache-benchmark.ts
const cacheSize = 10000; // Cache capacity

// In e2e-benchmark.ts
const concurrencyLevels = [1, 5, 10, 25, 50, 100];
```

## CI/CD Integration

Add benchmark to your CI pipeline:

```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmarks

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run benchmark
```

## Regression Testing

Compare benchmark results between commits:

```bash
# Run baseline
npm run benchmark > baseline.txt

# Make changes...

# Run comparison
npm run benchmark > comparison.txt

# Compare results
diff baseline.txt comparison.txt
```

## System Requirements

- **Node.js**: >= 18.0.0
- **Memory**: >= 4GB RAM recommended
- **CPU**: Multi-core processor for concurrent tests

## Troubleshooting

### High Memory Usage

- Reduce cache size in tests
- Lower iteration count
- Run benchmarks individually

### Slow Performance

- Close other applications
- Run on dedicated hardware
- Check for background processes
- Ensure SSD for file-based caching

### Inconsistent Results

- Run multiple times and average
- Ensure stable system load
- Disable CPU throttling
- Use dedicated benchmarking environment

## Contributing

When adding new benchmarks:

1. Follow existing patterns for consistency
2. Include warmup phase (10% of iterations)
3. Measure P50/P95/P99 latencies
4. Add memory usage tracking
5. Document expected results
6. Update this README

## License

MIT License - see LICENSE file for details
