# Benchmark Quick Reference Card

## Installation

```bash
cd /home/decri/blockchain-projects/third-party-verifier/aura-verifier-sdk/packages/core
npm install
npm run build
```

## Quick Commands

```bash
# Quick test (1 minute)
npm run benchmark:quick

# Full suite (5-10 minutes)
npm run benchmark

# Individual suites
npm run benchmark:qr        # QR parsing
npm run benchmark:crypto    # Signatures
npm run benchmark:cache     # Cache ops
npm run benchmark:e2e       # End-to-end
```

## Files

| File | Lines | Purpose |
|------|-------|---------|
| qr-benchmark.ts | 377 | QR code parsing performance |
| crypto-benchmark.ts | 514 | Signature verification speed |
| cache-benchmark.ts | 625 | Cache hit/miss rates |
| e2e-benchmark.ts | 600 | Full verification flow |
| index.ts | 183 | Main benchmark runner |
| quick-test.ts | 226 | Fast validation |

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| E2E P95 | < 200ms | < 500ms |
| QR Parse | > 15K/s | > 10K/s |
| Ed25519 Verify | > 8K/s | > 5K/s |
| Cache Read | > 40K/s | > 20K/s |

## Expected Results

```
QR Parsing:          ~30,000 ops/sec, P95 < 0.1ms
Ed25519 Verify:      ~12,000 ops/sec, P95 < 0.2ms
Secp256k1 Verify:    ~4,000 ops/sec, P95 < 0.3ms
Cache Read (hit):    ~60,000 ops/sec, P95 < 0.03ms
E2E Verification:    ~800 ops/sec, P95 ~1.8ms ✓
```

## What Gets Measured

- **Throughput**: Operations per second
- **Latency**: P50, P95, P99 percentiles
- **Memory**: Heap usage during operations
- **Concurrency**: Performance under parallel load

## Documentation

- **SETUP.md**: Installation and first-time setup
- **README.md**: Comprehensive guide (389 lines)
- **BENCHMARKS_OVERVIEW.md**: Project overview (295 lines)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm run build` |
| "tsx not found" | Run `npm install` |
| Poor performance | Close other apps, check CPU |
| High memory | Reduce iterations or run individually |
| Inconsistent results | Run multiple times, check system load |

## Key Benchmarks

### QR Parsing
- Small (1 VC): 50K ops/sec
- Medium (3 VCs): 30K ops/sec
- Large (10 VCs): 20K ops/sec
- Concurrent (10 parallel): Tests multi-core

### Signatures
- Ed25519: ~12K ops/sec (2-3x faster)
- Secp256k1: ~4K ops/sec
- Batch (10): ~1.5K batches/sec

### Cache
- Hit: 60K ops/sec, 0.016ms avg
- Miss: 70K ops/sec, 0.014ms avg
- Write: 55K ops/sec, 0.018ms avg

### End-to-End
- Parse + Validate + Verify: ~1.2ms avg
- P95 latency: ~1.8ms ✓ Well under target
- Sustained load: 30 seconds continuous
- Burst test: 10-500 concurrent

## Success Criteria

✓ All benchmarks complete without errors
✓ E2E P95 latency < 200ms
✓ No memory leaks detected
✓ Performance meets or exceeds targets
✓ Consistent results across multiple runs

## CI/CD

Add to `.github/workflows/benchmark.yml`:
```yaml
- run: npm run benchmark:quick  # Fast check
- run: npm run benchmark        # Full suite
```

## Need Help?

1. Read SETUP.md for detailed instructions
2. Check README.md for performance tips
3. Review BENCHMARKS_OVERVIEW.md for architecture
4. Open issue on GitHub for support
