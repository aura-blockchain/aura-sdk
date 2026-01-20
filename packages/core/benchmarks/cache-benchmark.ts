/**
 * Cache Performance Benchmark
 *
 * Measures cache performance including:
 * - Cache hit/miss rates
 * - Memory usage with different cache sizes
 * - Lookup latency
 * - Eviction performance
 */

import { CredentialCache } from '../src/offline/cache.js';
import type { CachedCredential } from '../src/offline/types.js';
import { VCStatus } from '../src/verification/types.js';

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
  p95Latency?: number;
  p99Latency?: number;
  hitRate?: number;
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
    p95Latency: calculatePercentile(latencies, 95),
    p99Latency: calculatePercentile(latencies, 99),
  };
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('CACHE PERFORMANCE BENCHMARK RESULTS');
  console.log('='.repeat(80) + '\n');

  for (const result of results) {
    console.log(`${result.name}`);
    console.log('-'.repeat(80));
    console.log(`  Iterations:       ${formatNumber(result.iterations)}`);
    console.log(`  Total Time:       ${formatNumber(result.totalTime)} ms`);
    console.log(`  Average Time:     ${formatNumber(result.avgTime)} ms`);
    console.log(`  Ops/Second:       ${formatNumber(result.opsPerSecond)}`);
    if (result.p95Latency !== undefined) {
      console.log(`  P95 Latency:      ${formatNumber(result.p95Latency)} ms`);
    }
    if (result.p99Latency !== undefined) {
      console.log(`  P99 Latency:      ${formatNumber(result.p99Latency)} ms`);
    }
    if (result.hitRate !== undefined) {
      console.log(`  Hit Rate:         ${(result.hitRate * 100).toFixed(1)}%`);
    }
    if (result.memoryUsed !== undefined && result.memoryUsed > 0) {
      console.log(`  Memory Used:      ${formatBytes(result.memoryUsed)}`);
    }
    console.log('');
  }
}

function printComparison(results: BenchmarkResult[]): void {
  console.log('='.repeat(80));
  console.log('CACHE OPERATION COMPARISON');
  console.log('='.repeat(80) + '\n');

  console.log(`${'Operation'.padEnd(40)} ${'Ops/Sec'.padStart(15)} ${'Avg Time'.padStart(12)}`);
  console.log('-'.repeat(80));

  for (const result of results) {
    console.log(
      `${result.name.padEnd(40)} ${formatNumber(result.opsPerSecond).padStart(15)} ${formatNumber(result.avgTime).padStart(12)} ms`
    );
  }
  console.log('');
}

// ============================================================================
// Test Data Generation
// ============================================================================

function generateCredential(vcId: string): CachedCredential {
  return {
    vcId,
    vcData: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: `did:aura:mainnet:issuer${Math.random().toString(36).substring(7)}`,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:aura:mainnet:subject${Math.random().toString(36).substring(7)}`,
        claims: {
          name: 'Test User',
          email: 'test@example.com',
          age: 25,
        },
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
// Benchmark Tests
// ============================================================================

async function benchmarkCacheWrite(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 10000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  let counter = 0;

  return runBenchmark(
    'Cache Write (set)',
    async () => {
      const vcId = `vc-${counter++}`;
      const credential = generateCredential(vcId);
      await cache.set(vcId, credential);
    },
    2000
  );
}

async function benchmarkCacheRead(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 10000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Pre-populate cache
  const vcIds: string[] = [];
  for (let i = 0; i < 1000; i++) {
    const vcId = `vc-${i}`;
    vcIds.push(vcId);
    await cache.set(vcId, generateCredential(vcId));
  }

  let counter = 0;

  return runBenchmark(
    'Cache Read (get) - Hit',
    async () => {
      const vcId = vcIds[counter % vcIds.length];
      await cache.get(vcId);
      counter++;
    },
    5000
  );
}

async function benchmarkCacheMiss(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  let counter = 0;

  return runBenchmark(
    'Cache Read (get) - Miss',
    async () => {
      await cache.get(`nonexistent-${counter++}`);
    },
    5000
  );
}

async function benchmarkCacheDelete(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 10000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Pre-populate cache
  const vcIds: string[] = [];
  for (let i = 0; i < 2000; i++) {
    const vcId = `vc-${i}`;
    vcIds.push(vcId);
    await cache.set(vcId, generateCredential(vcId));
  }

  let counter = 0;

  return runBenchmark(
    'Cache Delete',
    async () => {
      const vcId = vcIds[counter % vcIds.length];
      await cache.delete(vcId);
      counter++;
    },
    2000
  );
}

async function benchmarkCacheHas(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Pre-populate cache
  const vcIds: string[] = [];
  for (let i = 0; i < 1000; i++) {
    const vcId = `vc-${i}`;
    vcIds.push(vcId);
    await cache.set(vcId, generateCredential(vcId));
  }

  let counter = 0;

  return runBenchmark(
    'Cache Existence Check (has)',
    async () => {
      const vcId = vcIds[counter % vcIds.length];
      await cache.has(vcId);
      counter++;
    },
    5000
  );
}

async function benchmarkCacheStats(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Pre-populate cache
  for (let i = 0; i < 500; i++) {
    await cache.set(`vc-${i}`, generateCredential(`vc-${i}`));
  }

  return runBenchmark(
    'Cache Statistics (getStats)',
    async () => {
      await cache.getStats();
    },
    1000
  );
}

async function benchmarkEviction(): Promise<BenchmarkResult> {
  const cache = new CredentialCache({
    maxEntries: 100,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Fill cache to capacity
  for (let i = 0; i < 100; i++) {
    await cache.set(`vc-${i}`, generateCredential(`vc-${i}`));
  }

  let counter = 100;

  return runBenchmark(
    'Cache Eviction (LRU)',
    async () => {
      const vcId = `vc-${counter++}`;
      await cache.set(vcId, generateCredential(vcId));
    },
    500
  );
}

// ============================================================================
// Hit Rate Test
// ============================================================================

async function hitRateTest(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('CACHE HIT RATE TEST');
  console.log('='.repeat(80) + '\n');

  const hitRatios = [0.9, 0.7, 0.5, 0.3, 0.1]; // 90%, 70%, 50%, 30%, 10% hit rate
  const totalOperations = 5000;

  console.log(
    `${'Hit Ratio'.padEnd(15)} ${'Hits'.padStart(10)} ${'Misses'.padStart(10)} ${'Avg Latency'.padStart(15)}`
  );
  console.log('-'.repeat(80));

  for (const hitRatio of hitRatios) {
    const cache = new CredentialCache({
      maxEntries: 1000,
      maxAge: 3600,
      storageAdapter: 'memory',
    });

    // Pre-populate cache
    const cacheSize = 1000;
    const vcIds: string[] = [];
    for (let i = 0; i < cacheSize; i++) {
      const vcId = `vc-${i}`;
      vcIds.push(vcId);
      await cache.set(vcId, generateCredential(vcId));
    }

    let hits = 0;
    let misses = 0;
    const latencies: number[] = [];

    const startTime = performance.now();

    for (let i = 0; i < totalOperations; i++) {
      const shouldHit = Math.random() < hitRatio;
      const vcId = shouldHit ? vcIds[Math.floor(Math.random() * vcIds.length)] : `nonexistent-${i}`;

      const iterStart = performance.now();
      const result = await cache.get(vcId);
      const iterEnd = performance.now();

      latencies.push(iterEnd - iterStart);

      if (result !== null) {
        hits++;
      } else {
        misses++;
      }
    }

    const endTime = performance.now();
    const avgLatency = (endTime - startTime) / totalOperations;
    const actualHitRate = hits / totalOperations;

    console.log(
      `${(actualHitRate * 100).toFixed(1).padStart(5)}%`.padEnd(15) +
        `${hits.toString().padStart(10)} ${misses.toString().padStart(10)} ${avgLatency.toFixed(3).padStart(15)} ms`
    );
  }

  console.log('');
}

// ============================================================================
// Memory Usage Test
// ============================================================================

async function memoryUsageTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('MEMORY USAGE TEST (Different Cache Sizes)');
  console.log('='.repeat(80) + '\n');

  const cacheSizes = [100, 500, 1000, 5000, 10000];

  console.log(
    `${'Cache Size'.padEnd(15)} ${'Memory Used'.padStart(20)} ${'Per Entry'.padStart(20)}`
  );
  console.log('-'.repeat(80));

  for (const size of cacheSizes) {
    const memBefore = measureMemory();

    const cache = new CredentialCache({
      maxEntries: size,
      maxAge: 3600,
      storageAdapter: 'memory',
    });

    // Fill cache
    for (let i = 0; i < size; i++) {
      await cache.set(`vc-${i}`, generateCredential(`vc-${i}`));
    }

    const memAfter = measureMemory();
    const memUsed = memAfter - memBefore;
    const perEntry = memUsed / size;

    console.log(
      `${size.toString().padEnd(15)} ${formatBytes(memUsed).padStart(20)} ${formatBytes(perEntry).padStart(20)}`
    );
  }

  console.log('');
}

// ============================================================================
// Concurrent Access Test
// ============================================================================

async function concurrentAccessTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('CONCURRENT ACCESS TEST');
  console.log('='.repeat(80) + '\n');

  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  // Pre-populate cache
  const vcIds: string[] = [];
  for (let i = 0; i < 1000; i++) {
    const vcId = `vc-${i}`;
    vcIds.push(vcId);
    await cache.set(vcId, generateCredential(vcId));
  }

  const concurrencyLevels = [1, 5, 10, 25, 50, 100];
  const operationsPerLevel = 1000;

  console.log(
    `${'Concurrency'.padEnd(15)} ${'Total Time'.padStart(15)} ${'Throughput'.padStart(20)}`
  );
  console.log('-'.repeat(80));

  for (const concurrency of concurrencyLevels) {
    const startTime = performance.now();

    // Process in chunks with specified concurrency
    for (let i = 0; i < operationsPerLevel; i += concurrency) {
      const promises: Promise<any>[] = [];

      for (let j = 0; j < concurrency && i + j < operationsPerLevel; j++) {
        const vcId = vcIds[Math.floor(Math.random() * vcIds.length)];
        promises.push(cache.get(vcId));
      }

      await Promise.all(promises);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const throughput = (operationsPerLevel / totalTime) * 1000;

    console.log(
      `${concurrency.toString().padEnd(15)} ${formatNumber(totalTime).padStart(15)} ms ${formatNumber(throughput).padStart(20)} ops/sec`
    );
  }

  console.log('');
}

// ============================================================================
// Cache Expiration Test
// ============================================================================

async function expirationTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('CACHE EXPIRATION TEST');
  console.log('='.repeat(80) + '\n');

  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 1, // 1 second
    storageAdapter: 'memory',
  });

  // Add entries
  console.log('Adding 100 entries to cache...');
  for (let i = 0; i < 100; i++) {
    await cache.set(`vc-${i}`, generateCredential(`vc-${i}`));
  }

  console.log('Waiting 2 seconds for entries to expire...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('Checking cache (should trigger expiration cleanup)...');
  const startTime = performance.now();

  let expired = 0;
  for (let i = 0; i < 100; i++) {
    const result = await cache.get(`vc-${i}`);
    if (result === null) {
      expired++;
    }
  }

  const endTime = performance.now();

  console.log(`  Expired entries: ${expired}/100`);
  console.log(`  Cleanup time:    ${formatNumber(endTime - startTime)} ms`);
  console.log(`  Per entry:       ${formatNumber((endTime - startTime) / 100)} ms\n`);
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

async function main(): Promise<void> {
  console.log('\nStarting Cache Performance Benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run all benchmarks
  results.push(await benchmarkCacheWrite());
  results.push(await benchmarkCacheRead());
  results.push(await benchmarkCacheMiss());
  results.push(await benchmarkCacheDelete());
  results.push(await benchmarkCacheHas());
  results.push(await benchmarkCacheStats());
  results.push(await benchmarkEviction());

  // Print results
  printResults(results);
  printComparison(results);

  // Hit rate test
  await hitRateTest();

  // Memory usage test
  await memoryUsageTest();

  // Concurrent access test
  await concurrentAccessTest();

  // Expiration test
  await expirationTest();

  // Performance Summary
  console.log('='.repeat(80));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(80) + '\n');

  const readResult = results.find((r) => r.name.includes('Read') && r.name.includes('Hit'));
  const writeResult = results.find((r) => r.name.includes('Write'));

  if (readResult) {
    console.log(`Cache Read Throughput:  ${formatNumber(readResult.opsPerSecond)} ops/sec`);
    console.log(`Cache Read P95:         ${formatNumber(readResult.p95Latency || 0)} ms`);
    console.log(`Cache Read P99:         ${formatNumber(readResult.p99Latency || 0)} ms\n`);
  }

  if (writeResult) {
    console.log(`Cache Write Throughput: ${formatNumber(writeResult.opsPerSecond)} ops/sec`);
    console.log(`Cache Write P95:        ${formatNumber(writeResult.p95Latency || 0)} ms`);
    console.log(`Cache Write P99:        ${formatNumber(writeResult.p99Latency || 0)} ms\n`);
  }

  const target = 200; // ms
  const avgP95 = results.reduce((sum, r) => sum + (r.p95Latency || 0), 0) / results.length;
  const p95Status = avgP95 < target ? 'PASS' : 'FAIL';
  console.log(`Target P95 < ${target}ms:      ${p95Status} (${formatNumber(avgP95)} ms)\n`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runCacheBenchmark };
