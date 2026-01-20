/**
 * End-to-End Verification Performance Benchmark
 *
 * Measures full verification flow performance including:
 * - Full verification flow timing
 * - P95/P99 latency measurements
 * - Throughput under load
 * - Real-world scenario testing
 */

import { parseQRCode } from '../src/qr/parser.js';
import { verifyEd25519Signature } from '../src/crypto/ed25519.js';
import { CredentialCache } from '../src/offline/cache.js';
import type { QRCodeData } from '../src/qr/types.js';
import type { CachedCredential } from '../src/offline/types.js';
import * as ed25519 from '@noble/ed25519';

// ============================================================================
// Benchmark Utilities
// ============================================================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSecond: number;
  memoryUsed?: number;
  p50Latency?: number;
  p95Latency?: number;
  p99Latency?: number;
  minLatency?: number;
  maxLatency?: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function measureMemory(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  const memBefore = measureMemory();

  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    await fn();
  }

  // Actual benchmark
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    await fn();
    const iterEnd = performance.now();
    latencies.push(iterEnd - iterStart);
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (iterations / totalTime) * 1000;

  const memAfter = measureMemory();
  const memoryUsed = memAfter - memBefore;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    opsPerSecond,
    memoryUsed,
    minLatency: Math.min(...latencies),
    maxLatency: Math.max(...latencies),
    p50Latency: calculatePercentile(latencies, 50),
    p95Latency: calculatePercentile(latencies, 95),
    p99Latency: calculatePercentile(latencies, 99),
  };
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('END-TO-END VERIFICATION BENCHMARK RESULTS');
  console.log('='.repeat(80) + '\n');

  for (const result of results) {
    console.log(`${result.name}`);
    console.log('-'.repeat(80));
    console.log(`  Iterations:       ${formatNumber(result.iterations)}`);
    console.log(`  Total Time:       ${formatNumber(result.totalTime)} ms`);
    console.log(`  Average Time:     ${formatNumber(result.avgTime)} ms`);
    console.log(`  Ops/Second:       ${formatNumber(result.opsPerSecond)}`);
    if (result.minLatency !== undefined) {
      console.log(`  Min Latency:      ${formatNumber(result.minLatency)} ms`);
    }
    if (result.p50Latency !== undefined) {
      console.log(`  P50 Latency:      ${formatNumber(result.p50Latency)} ms`);
    }
    if (result.p95Latency !== undefined) {
      console.log(`  P95 Latency:      ${formatNumber(result.p95Latency)} ms`);
    }
    if (result.p99Latency !== undefined) {
      console.log(`  P99 Latency:      ${formatNumber(result.p99Latency)} ms`);
    }
    if (result.maxLatency !== undefined) {
      console.log(`  Max Latency:      ${formatNumber(result.maxLatency)} ms`);
    }
    if (result.memoryUsed !== undefined && result.memoryUsed > 0) {
      console.log(`  Memory Used:      ${formatBytes(result.memoryUsed)}`);
    }
    console.log('');
  }
}

function printLatencyDistribution(result: BenchmarkResult): void {
  console.log('='.repeat(80));
  console.log(`LATENCY DISTRIBUTION: ${result.name}`);
  console.log('='.repeat(80) + '\n');

  console.log(`${'Percentile'.padEnd(15)} ${'Latency'.padStart(15)}`);
  console.log('-'.repeat(80));

  if (result.minLatency !== undefined) {
    console.log(`${'Min'.padEnd(15)} ${formatNumber(result.minLatency).padStart(15)} ms`);
  }
  if (result.p50Latency !== undefined) {
    console.log(`${'P50'.padEnd(15)} ${formatNumber(result.p50Latency).padStart(15)} ms`);
  }
  if (result.p95Latency !== undefined) {
    console.log(`${'P95'.padEnd(15)} ${formatNumber(result.p95Latency).padStart(15)} ms`);
  }
  if (result.p99Latency !== undefined) {
    console.log(`${'P99'.padEnd(15)} ${formatNumber(result.p99Latency).padStart(15)} ms`);
  }
  if (result.maxLatency !== undefined) {
    console.log(`${'Max'.padEnd(15)} ${formatNumber(result.maxLatency).padStart(15)} ms`);
  }

  console.log('');
}

// ============================================================================
// Test Data Generation
// ============================================================================

async function generateSignedQRData(vcCount: number = 3): Promise<{
  qrString: string;
  qrData: QRCodeData;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);

  const qrData: QRCodeData = {
    v: '1.0',
    p: 'presentation-' + Math.random().toString(36).substring(7),
    h: 'did:aura:mainnet:' + Buffer.from(publicKey).toString('hex'),
    vcs: Array.from({ length: vcCount }, (_, i) => `vc-${i}`),
    ctx: {
      name: true,
      email: true,
      dateOfBirth: true,
      address: false,
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
    n: Math.floor(Math.random() * 1000000),
    sig: '', // Will be filled
  };

  // Sign the data
  const message = JSON.stringify({
    v: qrData.v,
    p: qrData.p,
    h: qrData.h,
    vcs: qrData.vcs,
    ctx: qrData.ctx,
    exp: qrData.exp,
    n: qrData.n,
  });

  const messageBytes = new TextEncoder().encode(message);
  const signature = await ed25519.sign(messageBytes, privateKey);
  qrData.sig = Buffer.from(signature).toString('hex');

  const jsonString = JSON.stringify(qrData);
  const base64Data = Buffer.from(jsonString).toString('base64');
  const qrString = `aura://verify?data=${base64Data}`;

  return { qrString, qrData, privateKey, publicKey };
}

function generateCachedCredential(vcId: string): CachedCredential {
  return {
    vcId,
    vcData: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: `did:aura:mainnet:issuer`,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:aura:mainnet:subject`,
        claims: {},
      },
    },
    metadata: {
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      issuerDID: 'did:aura:mainnet:issuer',
      issuedAt: new Date(),
    },
    revocationStatus: {
      isRevoked: false,
      checkedAt: new Date(),
    },
  };
}

// ============================================================================
// Verification Flow
// ============================================================================

async function fullVerificationFlow(
  qrString: string,
  publicKey: Uint8Array,
  cache?: CredentialCache
): Promise<boolean> {
  // Step 1: Parse QR code
  const qrData = parseQRCode(qrString);

  // Step 2: Validate expiration
  const now = Math.floor(Date.now() / 1000);
  if (qrData.exp < now) {
    return false;
  }

  // Step 3: Verify signature
  const message = JSON.stringify({
    v: qrData.v,
    p: qrData.p,
    h: qrData.h,
    vcs: qrData.vcs,
    ctx: qrData.ctx,
    exp: qrData.exp,
    n: qrData.n,
  });

  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = Buffer.from(qrData.sig, 'hex');

  const signatureValid = await verifyEd25519Signature(signatureBytes, messageBytes, publicKey);

  if (!signatureValid) {
    return false;
  }

  // Step 4: Check credentials in cache (if provided)
  if (cache) {
    for (const vcId of qrData.vcs) {
      const cached = await cache.get(vcId);
      if (!cached) {
        // In real scenario, would fetch from blockchain
        await cache.set(vcId, generateCachedCredential(vcId));
      }
    }
  }

  return true;
}

// ============================================================================
// Benchmark Tests
// ============================================================================

async function benchmarkFullVerification(): Promise<BenchmarkResult> {
  const testData = await generateSignedQRData(3);

  return runBenchmark(
    'Full Verification (Parse + Validate + Verify Signature)',
    async () => {
      await fullVerificationFlow(testData.qrString, testData.publicKey);
    },
    1000
  );
}

async function benchmarkWithCacheHit(): Promise<BenchmarkResult> {
  const testData = await generateSignedQRData(3);
  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Pre-populate cache
  for (const vcId of testData.qrData.vcs) {
    await cache.set(vcId, generateCachedCredential(vcId));
  }

  return runBenchmark(
    'Full Verification with Cache Hit',
    async () => {
      await fullVerificationFlow(testData.qrString, testData.publicKey, cache);
    },
    1000
  );
}

async function benchmarkWithCacheMiss(): Promise<BenchmarkResult> {
  const testData = await generateSignedQRData(3);
  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  return runBenchmark(
    'Full Verification with Cache Miss',
    async () => {
      await fullVerificationFlow(testData.qrString, testData.publicKey, cache);
    },
    1000
  );
}

async function benchmarkLargePayload(): Promise<BenchmarkResult> {
  const testData = await generateSignedQRData(10); // 10 VCs

  return runBenchmark(
    'Full Verification (Large Payload - 10 VCs)',
    async () => {
      await fullVerificationFlow(testData.qrString, testData.publicKey);
    },
    1000
  );
}

async function benchmarkSmallPayload(): Promise<BenchmarkResult> {
  const testData = await generateSignedQRData(1); // 1 VC

  return runBenchmark(
    'Full Verification (Small Payload - 1 VC)',
    async () => {
      await fullVerificationFlow(testData.qrString, testData.publicKey);
    },
    1000
  );
}

// ============================================================================
// Load Testing
// ============================================================================

async function sustainedLoadTest(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('SUSTAINED LOAD TEST (30 seconds)');
  console.log('='.repeat(80) + '\n');

  const testData = await generateSignedQRData(3);
  const duration = 30000; // 30 seconds
  const latencies: number[] = [];

  console.log('Running sustained load for 30 seconds...');

  const startTime = performance.now();
  let count = 0;

  while (performance.now() - startTime < duration) {
    const iterStart = performance.now();
    await fullVerificationFlow(testData.qrString, testData.publicKey);
    const iterEnd = performance.now();

    latencies.push(iterEnd - iterStart);
    count++;

    // Progress update every 5 seconds
    const elapsed = performance.now() - startTime;
    if (count % 100 === 0) {
      const progress = (elapsed / duration) * 100;
      const currentThroughput = (count / elapsed) * 1000;
      process.stdout.write(
        `\r  Progress: ${progress.toFixed(1)}% | Count: ${count} | Throughput: ${formatNumber(currentThroughput)} ops/sec`
      );
    }
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const throughput = (count / totalTime) * 1000;

  console.log('\n');
  console.log(`  Total Verifications: ${formatNumber(count)}`);
  console.log(`  Total Time:          ${formatNumber(totalTime)} ms`);
  console.log(`  Throughput:          ${formatNumber(throughput)} ops/sec`);
  console.log(`  Average Latency:     ${formatNumber(totalTime / count)} ms`);
  console.log(`  P50 Latency:         ${formatNumber(calculatePercentile(latencies, 50))} ms`);
  console.log(`  P95 Latency:         ${formatNumber(calculatePercentile(latencies, 95))} ms`);
  console.log(`  P99 Latency:         ${formatNumber(calculatePercentile(latencies, 99))} ms`);
  console.log(`  Min Latency:         ${formatNumber(Math.min(...latencies))} ms`);
  console.log(`  Max Latency:         ${formatNumber(Math.max(...latencies))} ms\n`);
}

// ============================================================================
// Concurrent Verification Test
// ============================================================================

async function concurrentVerificationTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('CONCURRENT VERIFICATION TEST');
  console.log('='.repeat(80) + '\n');

  const testData = await generateSignedQRData(3);
  const concurrencyLevels = [1, 5, 10, 25, 50, 100];
  const verificationsPerLevel = 500;

  console.log(
    `${'Concurrency'.padEnd(15)} ${'Total Time'.padStart(15)} ${'Throughput'.padStart(20)} ${'Avg Latency'.padStart(15)}`
  );
  console.log('-'.repeat(80));

  for (const concurrency of concurrencyLevels) {
    const latencies: number[] = [];
    const startTime = performance.now();

    // Process in chunks with specified concurrency
    for (let i = 0; i < verificationsPerLevel; i += concurrency) {
      const promises: Promise<any>[] = [];

      for (let j = 0; j < concurrency && i + j < verificationsPerLevel; j++) {
        const iterStart = performance.now();
        promises.push(
          fullVerificationFlow(testData.qrString, testData.publicKey).then(() => {
            const iterEnd = performance.now();
            latencies.push(iterEnd - iterStart);
          })
        );
      }

      await Promise.all(promises);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const throughput = (verificationsPerLevel / totalTime) * 1000;
    const avgLatency = totalTime / verificationsPerLevel;

    console.log(
      `${concurrency.toString().padEnd(15)} ${formatNumber(totalTime).padStart(15)} ms ${formatNumber(throughput).padStart(20)} ops/sec ${formatNumber(avgLatency).padStart(15)} ms`
    );
  }

  console.log('');
}

// ============================================================================
// Burst Load Test
// ============================================================================

async function burstLoadTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('BURST LOAD TEST');
  console.log('='.repeat(80) + '\n');

  const testData = await generateSignedQRData(3);
  const burstSizes = [10, 50, 100, 250, 500];

  console.log(
    `${'Burst Size'.padEnd(15)} ${'Total Time'.padStart(15)} ${'Throughput'.padStart(20)} ${'P95 Latency'.padStart(15)}`
  );
  console.log('-'.repeat(80));

  for (const burstSize of burstSizes) {
    const latencies: number[] = [];
    const startTime = performance.now();

    const promises = Array.from({ length: burstSize }, async () => {
      const iterStart = performance.now();
      await fullVerificationFlow(testData.qrString, testData.publicKey);
      const iterEnd = performance.now();
      latencies.push(iterEnd - iterStart);
    });

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const throughput = (burstSize / totalTime) * 1000;
    const p95Latency = calculatePercentile(latencies, 95);

    console.log(
      `${burstSize.toString().padEnd(15)} ${formatNumber(totalTime).padStart(15)} ms ${formatNumber(throughput).padStart(20)} ops/sec ${formatNumber(p95Latency).padStart(15)} ms`
    );
  }

  console.log('');
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

async function main(): Promise<void> {
  console.log('\nStarting End-to-End Verification Benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run all benchmarks
  console.log('Running basic verification benchmarks...');
  results.push(await benchmarkSmallPayload());
  results.push(await benchmarkFullVerification());
  results.push(await benchmarkLargePayload());
  results.push(await benchmarkWithCacheHit());
  results.push(await benchmarkWithCacheMiss());

  // Print results
  printResults(results);

  // Print detailed latency distribution for main benchmark
  const mainBenchmark = results.find((r) => r.name.includes('Full Verification (Parse'));
  if (mainBenchmark) {
    printLatencyDistribution(mainBenchmark);
  }

  // Load tests
  await concurrentVerificationTest();
  await burstLoadTest();
  await sustainedLoadTest();

  // Performance Summary
  console.log('='.repeat(80));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(80) + '\n');

  const fullVerification = results.find(
    (r) =>
      r.name.includes('Full Verification (Parse') &&
      !r.name.includes('Large') &&
      !r.name.includes('Small')
  );

  if (fullVerification) {
    console.log('Full Verification Flow Performance:');
    console.log(`  Average Latency:    ${formatNumber(fullVerification.avgTime)} ms`);
    console.log(`  P50 Latency:        ${formatNumber(fullVerification.p50Latency || 0)} ms`);
    console.log(`  P95 Latency:        ${formatNumber(fullVerification.p95Latency || 0)} ms`);
    console.log(`  P99 Latency:        ${formatNumber(fullVerification.p99Latency || 0)} ms`);
    console.log(`  Throughput:         ${formatNumber(fullVerification.opsPerSecond)} ops/sec\n`);
  }

  // Target validation
  const target = 200; // ms
  const p95Latencies = results.map((r) => r.p95Latency || 0);
  const avgP95 = p95Latencies.reduce((sum, val) => sum + val, 0) / p95Latencies.length;
  const maxP95 = Math.max(...p95Latencies);

  console.log('Target Performance:');
  console.log(`  Target P95:         < ${target} ms`);
  console.log(
    `  Average P95:        ${formatNumber(avgP95)} ms ${avgP95 < target ? '✓ PASS' : '✗ FAIL'}`
  );
  console.log(
    `  Max P95:            ${formatNumber(maxP95)} ms ${maxP95 < target ? '✓ PASS' : '✗ FAIL'}\n`
  );

  if (fullVerification && fullVerification.p95Latency) {
    const status = fullVerification.p95Latency < target ? '✓ PASS' : '✗ FAIL';
    console.log(`Overall Status:       ${status}\n`);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runE2EBenchmark };
