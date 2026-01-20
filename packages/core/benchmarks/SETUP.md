# Benchmark Setup Guide

Quick setup instructions for running the Aura Verifier SDK benchmarks.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- At least 4GB RAM
- Multi-core processor recommended

## Installation

```bash
# Navigate to the package directory (from repo root)
cd packages/core

# Install dependencies (includes tsx for running TypeScript)
npm install

# Build the project (required for imports to work)
npm run build
```

## Running Benchmarks

### Quick Test (Recommended First)

```bash
npm run benchmark:quick
```

Expected output:

```
================================================================================
QUICK BENCHMARK TEST
================================================================================

Testing QR Parsing...
  ✓ 1000 iterations in 45.23ms
  ✓ 22107 ops/sec
  ✓ 0.045ms per operation

Testing Signature Verification...
  ✓ 500 iterations in 38.56ms
  ✓ 12967 ops/sec
  ✓ 0.077ms per operation

Testing Cache Operations...
  ✓ 2000 operations in 34.12ms
  ✓ 58616 ops/sec
  ✓ 0.017ms per operation

Testing End-to-End Verification...
  ✓ 200 iterations in 245.67ms
  ✓ 814 ops/sec
  ✓ P50: 1.180ms, P95: 1.850ms, P99: 2.230ms
  ✓ PASS Target P95 < 200ms (actual: 1.850ms)

================================================================================
✓ ALL QUICK TESTS PASSED
================================================================================

Run full benchmarks with: npm run benchmark
```

### Full Benchmark Suite

```bash
# Run all benchmarks (takes 5-10 minutes)
npm run benchmark

# Run with specific suites
npm run benchmark -- --qr
npm run benchmark -- --crypto
npm run benchmark -- --cache
npm run benchmark -- --e2e

# Run multiple suites
npm run benchmark -- --qr --crypto

# Show help
npm run benchmark -- --help
```

### Individual Benchmarks

```bash
# QR parsing benchmarks
npm run benchmark:qr

# Cryptographic signature benchmarks
npm run benchmark:crypto

# Cache performance benchmarks
npm run benchmark:cache

# End-to-end verification benchmarks
npm run benchmark:e2e
```

## What Gets Tested

### 1. QR Parsing (`benchmark:qr`)

- Parse speed for different QR sizes (small, medium, large)
- Memory usage during parsing
- Concurrent parsing (10 parallel operations)
- Error handling performance
- Memory stress test (10,000 iterations)

**Duration:** ~30 seconds

### 2. Signature Verification (`benchmark:crypto`)

- Ed25519 verification (async and sync)
- Secp256k1 verification (async and sync)
- Batch verification (10 signatures at once)
- Algorithm comparison
- Throughput stress test (5 seconds each)
- Concurrent verification (various levels)

**Duration:** ~60 seconds

### 3. Cache Performance (`benchmark:cache`)

- Write operations
- Read operations (hit and miss)
- Delete operations
- Existence checks
- Statistics retrieval
- LRU eviction
- Hit rate analysis (90%, 70%, 50%, 30%, 10%)
- Memory usage analysis (100 to 10,000 entries)
- Concurrent access patterns
- Expiration cleanup

**Duration:** ~45 seconds

### 4. End-to-End Verification (`benchmark:e2e`)

- Full verification flow (parse + validate + verify)
- With cache hit
- With cache miss
- Large payload (10 VCs)
- Small payload (1 VC)
- Sustained load test (30 seconds)
- Concurrent verification (1 to 100 concurrent)
- Burst load test (10 to 500 concurrent)

**Duration:** ~120 seconds

## Expected Performance

On a modern development machine (4+ cores, SSD):

| Operation              | Throughput     | P95 Latency | Status |
| ---------------------- | -------------- | ----------- | ------ |
| QR Parsing (medium)    | 30,000 ops/sec | < 0.1ms     | ✓      |
| Ed25519 Verification   | 12,000 ops/sec | < 0.2ms     | ✓      |
| Secp256k1 Verification | 4,000 ops/sec  | < 0.3ms     | ✓      |
| Cache Read (hit)       | 60,000 ops/sec | < 0.03ms    | ✓      |
| E2E Verification       | 800 ops/sec    | ~1.8ms      | ✓      |

**Key Target:** End-to-end verification P95 latency < 200ms

## Interpreting Results

### Latency Metrics

- **P50 (Median)**: Half of operations complete faster
- **P95**: 95% of operations complete faster (SLA target)
- **P99**: 99% of operations complete faster (tail latency)

### Good Performance Indicators

- ✓ P95 latency < 200ms for E2E verification
- ✓ QR parsing > 15,000 ops/sec
- ✓ Signature verification > 8,000 ops/sec (Ed25519)
- ✓ Cache operations > 40,000 ops/sec

### Performance Issues

- ✗ P95 latency > 500ms
- ✗ Significant variance between runs
- ✗ Memory usage growing unbounded
- ✗ Throughput decreasing over time

## Troubleshooting

### "Cannot find module" errors

Make sure you've built the project:

```bash
npm run build
```

### "tsx: command not found"

Install dependencies:

```bash
npm install
```

### Poor Performance

1. Close other applications
2. Ensure CPU is not being throttled
3. Check system load: `top` or Task Manager
4. Run on AC power (laptops)
5. Try running multiple times and average

### High Memory Usage

1. Close other applications
2. Increase Node.js heap:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run benchmark
   ```
3. Run individual suites instead of full suite

### Inconsistent Results

1. Run benchmarks multiple times
2. Calculate average across runs
3. Check for background processes
4. Ensure stable network (for future network tests)
5. Use dedicated benchmark environment

## Files Structure

```
benchmarks/
├── README.md                    # Comprehensive documentation
├── BENCHMARKS_OVERVIEW.md       # Project overview
├── SETUP.md                     # This file
├── index.ts                     # Main benchmark runner
├── quick-test.ts                # Quick validation test
├── qr-benchmark.ts              # QR parsing benchmarks
├── crypto-benchmark.ts          # Signature verification benchmarks
├── cache-benchmark.ts           # Cache performance benchmarks
└── e2e-benchmark.ts             # End-to-end verification benchmarks
```

## Next Steps

After running benchmarks:

1. **Review Results**: Check if P95 < 200ms target is met
2. **Identify Bottlenecks**: Look for operations with high latency
3. **Optimize**: Focus on slowest components first
4. **Monitor**: Track performance over time
5. **Integrate CI**: Add benchmarks to your CI pipeline

## CI/CD Integration

Add to `.github/workflows/benchmark.yml`:

```yaml
name: Benchmarks

on:
  pull_request:
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
      - run: npm run benchmark:quick
```

## Getting Help

- **Documentation**: See `README.md` for detailed information
- **Issues**: Check existing performance issues
- **Performance Tips**: See README.md "Performance Optimization Tips"
- **Contact**: Open an issue on GitHub

## Performance Targets Summary

| Metric                | Target       | Critical Threshold |
| --------------------- | ------------ | ------------------ |
| E2E P95 Latency       | < 200ms      | < 500ms            |
| E2E P99 Latency       | < 300ms      | < 1000ms           |
| QR Parse Throughput   | > 15,000/sec | > 10,000/sec       |
| Sig Verify (Ed25519)  | > 8,000/sec  | > 5,000/sec        |
| Cache Read Throughput | > 40,000/sec | > 20,000/sec       |

**Success Criteria:** All targets met, no critical thresholds crossed.
