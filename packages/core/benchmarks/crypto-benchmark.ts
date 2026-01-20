/**
 * Cryptographic Signature Verification Performance Benchmark
 *
 * Measures signature verification performance including:
 * - Ed25519 verification throughput
 * - Secp256k1 verification throughput
 * - Batch verification performance
 * - Algorithm comparison
 */

import { verifyEd25519Signature, verifyEd25519SignatureSync } from '../src/crypto/ed25519.js';
import { verifySecp256k1Signature, verifySecp256k1SignatureSync } from '../src/crypto/secp256k1.js';
import {
  verifySignature,
  verifySignatureSync,
  verifySignatureBatch,
  SignatureAlgorithm,
} from '../src/crypto/signature.js';
import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';
import { sha256Hash } from '../src/crypto/hash.js';

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
  console.log('CRYPTOGRAPHIC SIGNATURE VERIFICATION BENCHMARK RESULTS');
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
  console.log('ALGORITHM COMPARISON');
  console.log('='.repeat(80) + '\n');

  console.log(`${'Algorithm'.padEnd(50)} ${'Ops/Sec'.padStart(12)} ${'Avg Time'.padStart(12)}`);
  console.log('-'.repeat(80));

  for (const result of results) {
    console.log(
      `${result.name.padEnd(50)} ${formatNumber(result.opsPerSecond).padStart(12)} ${formatNumber(result.avgTime).padStart(12)} ms`
    );
  }
  console.log('');
}

// ============================================================================
// Test Data Generation
// ============================================================================

interface TestSignature {
  signature: Uint8Array;
  message: Uint8Array;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

async function generateEd25519Signature(): Promise<TestSignature> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  const message = new TextEncoder().encode('Test message for benchmarking');
  const signature = await ed25519.sign(message, privateKey);

  return { signature, message, publicKey, privateKey };
}

function generateSecp256k1Signature(): TestSignature {
  const privateKey = secp256k1.utils.randomPrivateKey();
  const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed
  const message = new TextEncoder().encode('Test message for benchmarking');
  const messageHash = sha256Hash(message);
  const signature = secp256k1.sign(messageHash, privateKey).toCompactRawBytes();

  return { signature, message: messageHash, publicKey, privateKey };
}

// ============================================================================
// Benchmark Tests
// ============================================================================

async function benchmarkEd25519Async(): Promise<BenchmarkResult> {
  const testData = await generateEd25519Signature();

  return runBenchmark(
    'Ed25519 Verification (Async)',
    async () => {
      await verifyEd25519Signature(testData.signature, testData.message, testData.publicKey);
    },
    2000
  );
}

async function benchmarkEd25519Sync(): Promise<BenchmarkResult> {
  const testData = await generateEd25519Signature();

  return runBenchmark(
    'Ed25519 Verification (Sync)',
    () => {
      verifyEd25519SignatureSync(testData.signature, testData.message, testData.publicKey);
    },
    2000
  );
}

async function benchmarkSecp256k1Async(): Promise<BenchmarkResult> {
  const testData = generateSecp256k1Signature();

  return runBenchmark(
    'Secp256k1 Verification (Async)',
    async () => {
      await verifySecp256k1Signature(
        testData.signature,
        testData.message,
        testData.publicKey,
        { hashMessage: false } // Already hashed
      );
    },
    2000
  );
}

async function benchmarkSecp256k1Sync(): Promise<BenchmarkResult> {
  const testData = generateSecp256k1Signature();

  return runBenchmark(
    'Secp256k1 Verification (Sync)',
    () => {
      verifySecp256k1SignatureSync(testData.signature, testData.message, testData.publicKey, {
        hashMessage: false,
      });
    },
    2000
  );
}

async function benchmarkUnifiedSignatureAsync(): Promise<BenchmarkResult> {
  const testData = await generateEd25519Signature();

  return runBenchmark(
    'Unified Signature Verification (Auto-detect, Async)',
    async () => {
      await verifySignature(testData.signature, testData.message, testData.publicKey);
    },
    2000
  );
}

async function benchmarkUnifiedSignatureSync(): Promise<BenchmarkResult> {
  const testData = await generateEd25519Signature();

  return runBenchmark(
    'Unified Signature Verification (Auto-detect, Sync)',
    () => {
      verifySignatureSync(testData.signature, testData.message, testData.publicKey);
    },
    2000
  );
}

async function benchmarkBatchVerification(): Promise<BenchmarkResult> {
  // Generate test data for batch
  const batchSize = 10;
  const testData = await Promise.all(
    Array.from({ length: batchSize }, () => generateEd25519Signature())
  );

  const verifications = testData.map((data) => ({
    signature: data.signature,
    message: data.message,
    publicKey: data.publicKey,
  }));

  return runBenchmark(
    `Batch Verification (${batchSize} signatures)`,
    async () => {
      await verifySignatureBatch(verifications);
    },
    200
  );
}

async function benchmarkStringMessageVerification(): Promise<BenchmarkResult> {
  const testData = await generateEd25519Signature();
  const message = 'Test message for benchmarking';

  return runBenchmark(
    'String Message Verification (with encoding)',
    async () => {
      await verifyEd25519Signature(
        testData.signature,
        new TextEncoder().encode(message),
        testData.publicKey
      );
    },
    2000
  );
}

async function benchmarkObjectMessageVerification(): Promise<BenchmarkResult> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  const messageObj = { type: 'test', data: 'benchmarking', timestamp: Date.now() };
  const messageStr = JSON.stringify(messageObj);
  const messageBytes = sha256Hash(messageStr);
  const signature = await ed25519.sign(messageBytes, privateKey);

  return runBenchmark(
    'Object Message Verification (with JSON + hash)',
    async () => {
      await verifyEd25519Signature(signature, messageBytes, publicKey);
    },
    2000
  );
}

// ============================================================================
// Throughput Test
// ============================================================================

async function throughputTest(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('THROUGHPUT STRESS TEST');
  console.log('='.repeat(80) + '\n');

  const duration = 5000; // 5 seconds
  const ed25519Data = await generateEd25519Signature();
  const secp256k1Data = generateSecp256k1Signature();

  // Ed25519 throughput
  console.log('Testing Ed25519 throughput for 5 seconds...');
  let ed25519Count = 0;
  const ed25519Start = performance.now();

  while (performance.now() - ed25519Start < duration) {
    await verifyEd25519Signature(ed25519Data.signature, ed25519Data.message, ed25519Data.publicKey);
    ed25519Count++;
  }

  const ed25519End = performance.now();
  const ed25519Throughput = (ed25519Count / (ed25519End - ed25519Start)) * 1000;

  console.log(`  Ed25519:   ${formatNumber(ed25519Count)} verifications`);
  console.log(`  Throughput: ${formatNumber(ed25519Throughput)} ops/sec\n`);

  // Secp256k1 throughput
  console.log('Testing Secp256k1 throughput for 5 seconds...');
  let secp256k1Count = 0;
  const secp256k1Start = performance.now();

  while (performance.now() - secp256k1Start < duration) {
    await verifySecp256k1Signature(
      secp256k1Data.signature,
      secp256k1Data.message,
      secp256k1Data.publicKey,
      { hashMessage: false }
    );
    secp256k1Count++;
  }

  const secp256k1End = performance.now();
  const secp256k1Throughput = (secp256k1Count / (secp256k1End - secp256k1Start)) * 1000;

  console.log(`  Secp256k1: ${formatNumber(secp256k1Count)} verifications`);
  console.log(`  Throughput: ${formatNumber(secp256k1Throughput)} ops/sec\n`);

  // Comparison
  const ratio = ed25519Throughput / secp256k1Throughput;
  console.log(`Ed25519 is ${ratio.toFixed(2)}x faster than Secp256k1\n`);
}

// ============================================================================
// Concurrent Verification Test
// ============================================================================

async function concurrentVerificationTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('CONCURRENT VERIFICATION TEST');
  console.log('='.repeat(80) + '\n');

  const concurrencyLevels = [1, 5, 10, 25, 50, 100];
  const verificationsPerLevel = 100;

  console.log(
    `${'Concurrency'.padEnd(15)} ${'Total Time'.padStart(15)} ${'Throughput'.padStart(15)}`
  );
  console.log('-'.repeat(80));

  for (const concurrency of concurrencyLevels) {
    const testData = await Promise.all(
      Array.from({ length: verificationsPerLevel }, () => generateEd25519Signature())
    );

    const startTime = performance.now();

    // Process in chunks with specified concurrency
    for (let i = 0; i < verificationsPerLevel; i += concurrency) {
      const chunk = testData.slice(i, i + concurrency);
      await Promise.all(
        chunk.map((data) => verifyEd25519Signature(data.signature, data.message, data.publicKey))
      );
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const throughput = (verificationsPerLevel / totalTime) * 1000;

    console.log(
      `${concurrency.toString().padEnd(15)} ${formatNumber(totalTime).padStart(15)} ms ${formatNumber(throughput).padStart(15)} ops/sec`
    );
  }

  console.log('');
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

async function main(): Promise<void> {
  console.log('\nStarting Cryptographic Signature Verification Benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Run all benchmarks
  results.push(await benchmarkEd25519Async());
  results.push(await benchmarkEd25519Sync());
  results.push(await benchmarkSecp256k1Async());
  results.push(await benchmarkSecp256k1Sync());
  results.push(await benchmarkUnifiedSignatureAsync());
  results.push(await benchmarkUnifiedSignatureSync());
  results.push(await benchmarkStringMessageVerification());
  results.push(await benchmarkObjectMessageVerification());
  results.push(await benchmarkBatchVerification());

  // Print results
  printResults(results);
  printComparison(results);

  // Throughput test
  await throughputTest();

  // Concurrent verification test
  await concurrentVerificationTest();

  // Performance Summary
  console.log('='.repeat(80));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(80) + '\n');

  const ed25519Result = results.find((r) => r.name.includes('Ed25519') && r.name.includes('Async'));
  const secp256k1Result = results.find(
    (r) => r.name.includes('Secp256k1') && r.name.includes('Async')
  );

  if (ed25519Result) {
    console.log(`Ed25519 Throughput:     ${formatNumber(ed25519Result.opsPerSecond)} ops/sec`);
    console.log(`Ed25519 P95 Latency:    ${formatNumber(ed25519Result.p95Latency || 0)} ms`);
    console.log(`Ed25519 P99 Latency:    ${formatNumber(ed25519Result.p99Latency || 0)} ms\n`);
  }

  if (secp256k1Result) {
    console.log(`Secp256k1 Throughput:   ${formatNumber(secp256k1Result.opsPerSecond)} ops/sec`);
    console.log(`Secp256k1 P95 Latency:  ${formatNumber(secp256k1Result.p95Latency || 0)} ms`);
    console.log(`Secp256k1 P99 Latency:  ${formatNumber(secp256k1Result.p99Latency || 0)} ms\n`);
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

export { main as runCryptoBenchmark };
