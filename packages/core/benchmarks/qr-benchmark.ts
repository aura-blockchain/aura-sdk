/**
 * QR Parsing Performance Benchmark
 *
 * Measures QR code parsing performance including:
 * - Parse speed for different QR sizes
 * - Memory usage during parsing
 * - Concurrent parsing performance
 */

import { parseQRCode, parseQRCodeSafe } from '../src/qr/parser.js';
import type { QRCodeData } from '../src/qr/types.js';

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
  console.log('QR PARSING PERFORMANCE BENCHMARK RESULTS');
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
    if (result.memoryUsed !== undefined && result.memoryUsed > 0) {
      console.log(`  Memory Used:      ${formatBytes(result.memoryUsed)}`);
    }
    console.log('');
  }
}

function printComparison(results: BenchmarkResult[]): void {
  console.log('='.repeat(80));
  console.log('PERFORMANCE COMPARISON');
  console.log('='.repeat(80) + '\n');

  const baseline = results[0];

  console.log(`${'Benchmark'.padEnd(40)} ${'Ops/Sec'.padStart(12)} ${'vs Baseline'.padStart(15)}`);
  console.log('-'.repeat(80));

  for (const result of results) {
    const relative = result === baseline
      ? '(baseline)'
      : `${((result.opsPerSecond / baseline.opsPerSecond) * 100).toFixed(1)}%`;

    console.log(
      `${result.name.padEnd(40)} ${formatNumber(result.opsPerSecond).padStart(12)} ${relative.padStart(15)}`
    );
  }
  console.log('');
}

// ============================================================================
// Test Data Generation
// ============================================================================

function generateQRData(size: 'small' | 'medium' | 'large'): string {
  const baseData: QRCodeData = {
    v: '1.0',
    p: 'presentation-' + Math.random().toString(36).substring(7),
    h: 'did:aura:mainnet:' + 'a'.repeat(40),
    vcs: [],
    ctx: {},
    exp: Math.floor(Date.now() / 1000) + 3600,
    n: Math.floor(Math.random() * 1000000),
    sig: 'a'.repeat(128),
  };

  // Vary size based on parameter
  switch (size) {
    case 'small':
      baseData.vcs = ['vc1'];
      baseData.ctx = { name: true };
      break;
    case 'medium':
      baseData.vcs = ['vc1', 'vc2', 'vc3'];
      baseData.ctx = {
        name: true,
        email: true,
        phone: false,
        address: false,
        dateOfBirth: true,
      };
      break;
    case 'large':
      baseData.vcs = Array.from({ length: 10 }, (_, i) => `vc${i + 1}`);
      baseData.ctx = {
        name: true,
        email: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        nationalId: true,
        passport: true,
        driversLicense: true,
        socialSecurity: false,
        taxId: false,
        medicalRecord: false,
        educationRecord: true,
        employmentRecord: true,
        creditScore: false,
        bankAccount: false,
      };
      break;
  }

  const jsonString = JSON.stringify(baseData);
  const base64Data = Buffer.from(jsonString).toString('base64');
  return `aura://verify?data=${base64Data}`;
}

// ============================================================================
// Benchmark Tests
// ============================================================================

async function benchmarkSmallQRParsing(): Promise<BenchmarkResult> {
  const qrData = generateQRData('small');
  return runBenchmark(
    'Small QR Parsing (1 VC, minimal context)',
    () => parseQRCode(qrData),
    5000
  );
}

async function benchmarkMediumQRParsing(): Promise<BenchmarkResult> {
  const qrData = generateQRData('medium');
  return runBenchmark(
    'Medium QR Parsing (3 VCs, moderate context)',
    () => parseQRCode(qrData),
    5000
  );
}

async function benchmarkLargeQRParsing(): Promise<BenchmarkResult> {
  const qrData = generateQRData('large');
  return runBenchmark(
    'Large QR Parsing (10 VCs, full context)',
    () => parseQRCode(qrData),
    5000
  );
}

async function benchmarkSafeParsing(): Promise<BenchmarkResult> {
  const qrData = generateQRData('medium');
  return runBenchmark(
    'Safe Parsing (non-throwing version)',
    () => parseQRCodeSafe(qrData),
    5000
  );
}

async function benchmarkConcurrentParsing(): Promise<BenchmarkResult> {
  const qrDataSamples = Array.from({ length: 10 }, () => generateQRData('medium'));

  return runBenchmark(
    'Concurrent Parsing (10 parallel)',
    async () => {
      await Promise.all(qrDataSamples.map(qr => Promise.resolve(parseQRCode(qr))));
    },
    500
  );
}

async function benchmarkInvalidQRHandling(): Promise<BenchmarkResult> {
  const invalidQR = 'invalid-qr-data-that-will-fail';

  return runBenchmark(
    'Invalid QR Error Handling',
    () => parseQRCodeSafe(invalidQR),
    5000
  );
}

async function benchmarkRawBase64Parsing(): Promise<BenchmarkResult> {
  const baseData: QRCodeData = {
    v: '1.0',
    p: 'presentation-123',
    h: 'did:aura:mainnet:abc123',
    vcs: ['vc1', 'vc2'],
    ctx: { name: true, email: true },
    exp: Math.floor(Date.now() / 1000) + 3600,
    n: 123456,
    sig: 'a'.repeat(128),
  };

  const jsonString = JSON.stringify(baseData);
  const base64Data = Buffer.from(jsonString).toString('base64');

  return runBenchmark(
    'Raw Base64 Parsing (no URL wrapper)',
    () => parseQRCode(base64Data),
    5000
  );
}

// ============================================================================
// Memory Stress Test
// ============================================================================

async function memoryStressTest(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('MEMORY STRESS TEST');
  console.log('='.repeat(80) + '\n');

  const qrData = generateQRData('large');
  const iterations = 10000;

  const memBefore = measureMemory();
  console.log(`Memory before: ${formatBytes(memBefore)}`);

  const startTime = performance.now();
  for (let i = 0; i < iterations; i++) {
    parseQRCode(qrData);

    // Sample memory every 1000 iterations
    if (i > 0 && i % 1000 === 0) {
      const memCurrent = measureMemory();
      const memUsed = memCurrent - memBefore;
      console.log(`  After ${i} iterations: ${formatBytes(memCurrent)} (+${formatBytes(memUsed)})`);
    }
  }
  const endTime = performance.now();

  const memAfter = measureMemory();
  const memUsed = memAfter - memBefore;

  console.log(`\nMemory after:  ${formatBytes(memAfter)}`);
  console.log(`Memory used:   ${formatBytes(memUsed)}`);
  console.log(`Per operation: ${formatBytes(memUsed / iterations)}`);
  console.log(`Total time:    ${formatNumber(endTime - startTime)} ms`);
  console.log(`Throughput:    ${formatNumber((iterations / (endTime - startTime)) * 1000)} ops/sec\n`);
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

async function main(): Promise<void> {
  console.log('\nStarting QR Parsing Benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run all benchmarks
  results.push(await benchmarkSmallQRParsing());
  results.push(await benchmarkMediumQRParsing());
  results.push(await benchmarkLargeQRParsing());
  results.push(await benchmarkRawBase64Parsing());
  results.push(await benchmarkSafeParsing());
  results.push(await benchmarkInvalidQRHandling());
  results.push(await benchmarkConcurrentParsing());

  // Print results
  printResults(results);
  printComparison(results);

  // Memory stress test
  await memoryStressTest();

  // Performance Summary
  console.log('='.repeat(80));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(80) + '\n');

  const avgOpsPerSec = results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length;
  const avgP95 = results.reduce((sum, r) => sum + (r.p95Latency || 0), 0) / results.length;
  const avgP99 = results.reduce((sum, r) => sum + (r.p99Latency || 0), 0) / results.length;

  console.log(`Average Throughput:     ${formatNumber(avgOpsPerSec)} ops/sec`);
  console.log(`Average P95 Latency:    ${formatNumber(avgP95)} ms`);
  console.log(`Average P99 Latency:    ${formatNumber(avgP99)} ms`);

  const target = 200; // ms
  const p95Status = avgP95 < target ? 'PASS' : 'FAIL';
  console.log(`\nTarget P95 < ${target}ms:      ${p95Status} (${formatNumber(avgP95)} ms)\n`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runQRBenchmark };
