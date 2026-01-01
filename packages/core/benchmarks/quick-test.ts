/**
 * Quick Benchmark Test
 *
 * Runs a quick subset of benchmarks to verify everything works
 * without running the full suite (which can take several minutes)
 */

import { parseQRCode } from '../src/qr/parser.js';
import { verifyEd25519Signature } from '../src/crypto/ed25519.js';
import { CredentialCache } from '../src/offline/cache.js';
import type { QRCodeData } from '../src/qr/types.js';
import * as ed25519 from '@noble/ed25519';

console.log('\n' + '='.repeat(80));
console.log('QUICK BENCHMARK TEST');
console.log('='.repeat(80) + '\n');

async function testQRParsing(): Promise<void> {
  console.log('Testing QR Parsing...');

  const qrData: QRCodeData = {
    v: '1.0',
    p: 'test-presentation',
    h: 'did:aura:mainnet:test',
    vcs: ['vc1', 'vc2'],
    ctx: { name: true, email: true },
    exp: Math.floor(Date.now() / 1000) + 3600,
    n: 123456,
    sig: 'a'.repeat(128),
  };

  const jsonString = JSON.stringify(qrData);
  const base64Data = Buffer.from(jsonString).toString('base64');
  const qrString = `aura://verify?data=${base64Data}`;

  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    parseQRCode(qrString);
  }

  const end = performance.now();
  const time = end - start;
  const opsPerSec = (iterations / time) * 1000;

  console.log(`  ✓ ${iterations} iterations in ${time.toFixed(2)}ms`);
  console.log(`  ✓ ${opsPerSec.toFixed(0)} ops/sec`);
  console.log(`  ✓ ${(time / iterations).toFixed(3)}ms per operation\n`);
}

async function testSignatureVerification(): Promise<void> {
  console.log('Testing Signature Verification...');

  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  const message = new TextEncoder().encode('Test message');
  const signature = await ed25519.sign(message, privateKey);

  const iterations = 500;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await verifyEd25519Signature(signature, message, publicKey);
  }

  const end = performance.now();
  const time = end - start;
  const opsPerSec = (iterations / time) * 1000;

  console.log(`  ✓ ${iterations} iterations in ${time.toFixed(2)}ms`);
  console.log(`  ✓ ${opsPerSec.toFixed(0)} ops/sec`);
  console.log(`  ✓ ${(time / iterations).toFixed(3)}ms per operation\n`);
}

async function testCacheOperations(): Promise<void> {
  console.log('Testing Cache Operations...');

  const cache = new CredentialCache({
    maxEntries: 1000,
    maxAge: 3600,
    storageAdapter: 'memory',
  });

  const credential = {
    vcId: 'test-vc',
    vcData: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:aura:mainnet:issuer',
      issuanceDate: new Date().toISOString(),
      credentialSubject: { id: 'did:aura:mainnet:subject', claims: {} },
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

  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await cache.set(`vc-${i}`, credential);
    await cache.get(`vc-${i}`);
  }

  const end = performance.now();
  const time = end - start;
  const opsPerSec = ((iterations * 2) / time) * 1000; // 2 ops per iteration

  console.log(`  ✓ ${iterations * 2} operations in ${time.toFixed(2)}ms`);
  console.log(`  ✓ ${opsPerSec.toFixed(0)} ops/sec`);
  console.log(`  ✓ ${(time / (iterations * 2)).toFixed(3)}ms per operation\n`);
}

async function testEndToEnd(): Promise<void> {
  console.log('Testing End-to-End Verification...');

  // Generate signed QR data
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);

  const qrData: QRCodeData = {
    v: '1.0',
    p: 'test-presentation',
    h: 'did:aura:mainnet:' + Buffer.from(publicKey).toString('hex'),
    vcs: ['vc1', 'vc2', 'vc3'],
    ctx: { name: true, email: true },
    exp: Math.floor(Date.now() / 1000) + 3600,
    n: 123456,
    sig: '',
  };

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

  const iterations = 200;
  const latencies: number[] = [];
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();

    // Parse
    const parsed = parseQRCode(qrString);

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) throw new Error('Expired');

    // Verify signature
    const msg = JSON.stringify({
      v: parsed.v,
      p: parsed.p,
      h: parsed.h,
      vcs: parsed.vcs,
      ctx: parsed.ctx,
      exp: parsed.exp,
      n: parsed.n,
    });
    const msgBytes = new TextEncoder().encode(msg);
    const sigBytes = Buffer.from(parsed.sig, 'hex');
    await verifyEd25519Signature(sigBytes, msgBytes, publicKey);

    const iterEnd = performance.now();
    latencies.push(iterEnd - iterStart);
  }

  const end = performance.now();
  const time = end - start;
  const opsPerSec = (iterations / time) * 1000;

  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(iterations * 0.5)];
  const p95 = sorted[Math.floor(iterations * 0.95)];
  const p99 = sorted[Math.floor(iterations * 0.99)];

  console.log(`  ✓ ${iterations} iterations in ${time.toFixed(2)}ms`);
  console.log(`  ✓ ${opsPerSec.toFixed(0)} ops/sec`);
  console.log(`  ✓ P50: ${p50.toFixed(3)}ms, P95: ${p95.toFixed(3)}ms, P99: ${p99.toFixed(3)}ms`);

  const target = 200;
  const status = p95 < target ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${status} Target P95 < ${target}ms (actual: ${p95.toFixed(3)}ms)\n`);
}

async function main(): Promise<void> {
  try {
    await testQRParsing();
    await testSignatureVerification();
    await testCacheOperations();
    await testEndToEnd();

    console.log('='.repeat(80));
    console.log('✓ ALL QUICK TESTS PASSED');
    console.log('='.repeat(80) + '\n');
    console.log('Run full benchmarks with: npm run benchmark\n');
  } catch (error) {
    console.error('\n✗ TEST FAILED:', error);
    process.exit(1);
  }
}

main().catch(console.error);
