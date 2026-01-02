/**
 * Offline Mode Example - Aura Verifier SDK
 *
 * This example demonstrates offline verification capabilities:
 * - Credential caching for offline use
 * - Synchronization when online
 * - Revocation list caching
 * - Graceful degradation when network is unavailable
 */

import {
  AuraVerifier,
  CredentialCache,
  CacheSync,
  FileStorage,
  parseQRCode,
  type CacheConfig,
  type SyncResult,
  type CacheStats,
} from '@aura-network/verifier-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache configuration
const CACHE_DIR = join(__dirname, '.cache');
const CACHE_CONFIG: CacheConfig = {
  maxAge: 3600, // 1 hour
  maxEntries: 1000,
  persistToDisk: true,
  storageAdapter: 'file',
  storagePath: CACHE_DIR,
  // Optional: Encrypt cache data
  // encryptionKey: 'your-32-byte-hex-key-here',
};

// Sample QR codes for testing
const SAMPLE_QR_CODES = [
  createSampleQRCode('vc_age_21_test1'),
  createSampleQRCode('vc_age_21_test2'),
  createSampleQRCode('vc_human_test1'),
];

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--offline') ? 'offline' : 'online';
  const syncOnly = args.includes('--sync');

  console.log('='.repeat(70));
  console.log('Aura Verifier SDK - Offline Mode Example');
  console.log('='.repeat(70));
  console.log();

  if (syncOnly) {
    await runSyncOnly();
  } else if (mode === 'offline') {
    await runOfflineMode();
  } else {
    await runOnlineWithCaching();
  }
}

/**
 * Run in online mode with caching enabled
 */
async function runOnlineWithCaching() {
  console.log('Mode: Online with Caching');
  console.log();

  // Step 1: Initialize verifier with caching
  console.log('Step 1: Initializing verifier with cache...');
  const verifier = new AuraVerifier({
    network: 'testnet',
    timeout: 10000,
    offlineMode: false,
    cache: CACHE_CONFIG,
  });

  try {
    await verifier.initialize();
    console.log('✓ Verifier initialized');
    console.log();

    // Step 2: Display cache stats
    const initialStats = await verifier.getCacheStats();
    displayCacheStats('Initial Cache Stats', initialStats);

    // Step 3: Verify credentials (will cache them)
    console.log('Step 3: Verifying credentials (online + caching)...');
    console.log();

    for (const qrCode of SAMPLE_QR_CODES) {
      const qrData = parseQRCode(qrCode);
      console.log(`Verifying: ${qrData.vcs[0]}`);

      try {
        const result = await verifier.verify({ qrCodeData: qrCode });
        console.log(`  Status: ${result.isValid ? '✓ Valid' : '✗ Invalid'}`);
        console.log(`  Method: ${result.verificationMethod || 'online'}`);
        console.log(`  Latency: ${result.networkLatency || 0}ms`);
        console.log();
      } catch (error) {
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log();
      }
    }

    // Step 4: Display updated cache stats
    const updatedStats = await verifier.getCacheStats();
    displayCacheStats('Updated Cache Stats', updatedStats);

    // Step 5: Sync cache with latest data
    console.log('Step 5: Synchronizing cache...');
    const syncResult = await verifier.syncCache();
    displaySyncResult(syncResult);

    console.log('='.repeat(70));
    console.log('Online mode complete!');
    console.log('Cache is now populated for offline use.');
    console.log(`Run with --offline flag to test offline verification.`);
    console.log('='.repeat(70));
    console.log();

    await verifier.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Run in offline mode using cached credentials
 */
async function runOfflineMode() {
  console.log('Mode: Offline (Using Cache Only)');
  console.log();

  // Step 1: Initialize verifier in offline mode
  console.log('Step 1: Initializing verifier in offline mode...');
  const verifier = new AuraVerifier({
    network: 'testnet',
    timeout: 10000,
    offlineMode: true,
    cache: CACHE_CONFIG,
  });

  try {
    await verifier.initialize();
    console.log('✓ Verifier initialized (offline mode)');
    console.log();

    // Step 2: Display cache stats
    const stats = await verifier.getCacheStats();
    displayCacheStats('Cache Stats', stats);

    if (stats.totalEntries === 0) {
      console.log('Warning: Cache is empty!');
      console.log('Run without --offline flag first to populate the cache.');
      console.log();
      await verifier.destroy();
      return;
    }

    // Step 3: Verify credentials using only cache
    console.log('Step 3: Verifying credentials (offline from cache)...');
    console.log();

    for (const qrCode of SAMPLE_QR_CODES) {
      const qrData = parseQRCode(qrCode);
      console.log(`Verifying: ${qrData.vcs[0]}`);

      try {
        const result = await verifier.verify({ qrCodeData: qrCode });
        console.log(`  Status: ${result.isValid ? '✓ Valid' : '✗ Invalid'}`);
        console.log(`  Method: ${result.verificationMethod || 'offline'}`);
        console.log(`  From Cache: Yes`);
        console.log();
      } catch (error) {
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`  Note: Credential may not be in cache`);
        console.log();
      }
    }

    console.log('='.repeat(70));
    console.log('Offline verification complete!');
    console.log('All verifications were performed using cached data.');
    console.log('='.repeat(70));
    console.log();

    await verifier.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Run sync only (update cache without verification)
 */
async function runSyncOnly() {
  console.log('Mode: Sync Only');
  console.log();

  console.log('Step 1: Initializing cache sync...');
  const storage = new FileStorage({ storagePath: CACHE_DIR });
  const cache = new CredentialCache({
    storage,
    config: CACHE_CONFIG,
  });

  const sync = new CacheSync({
    cache,
    networkEndpoint: 'https://testnet-rpc.aurablockchain.org',
  });

  try {
    await cache.initialize();
    console.log('✓ Cache initialized');
    console.log();

    // Display initial stats
    const initialStats = await cache.getStats();
    displayCacheStats('Before Sync', initialStats);

    // Perform sync
    console.log('Step 2: Synchronizing with network...');
    console.log('This may take a moment...');
    console.log();

    const syncResult = await sync.syncAll();
    displaySyncResult(syncResult);

    // Display updated stats
    const updatedStats = await cache.getStats();
    displayCacheStats('After Sync', updatedStats);

    console.log('='.repeat(70));
    console.log('Sync complete!');
    console.log('='.repeat(70));
    console.log();

    await cache.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Display cache statistics
 */
function displayCacheStats(title: string, stats: CacheStats) {
  console.log(`${title}:`);
  console.log('-'.repeat(50));
  console.log(`Total Entries: ${stats.totalEntries}`);
  console.log(`Expired Entries: ${stats.expiredEntries}`);
  console.log(`Revoked Entries: ${stats.revokedEntries}`);
  console.log(`Cache Size: ${formatBytes(stats.sizeBytes)}`);
  console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`Storage Backend: ${stats.storageBackend}`);

  if (stats.lastSyncTime) {
    console.log(`Last Sync: ${stats.lastSyncTime.toISOString()}`);
  }
  console.log();
}

/**
 * Display sync result
 */
function displaySyncResult(result: SyncResult) {
  console.log('Sync Result:');
  console.log('-'.repeat(50));
  console.log(`Success: ${result.success ? 'Yes' : 'No'}`);
  console.log(`Credentials Synced: ${result.credentialsSynced}`);
  console.log(`Revocation List Updated: ${result.revocationListUpdated ? 'Yes' : 'No'}`);
  console.log(`Timestamp: ${result.lastSyncTime.toISOString()}`);

  if (result.stats) {
    console.log(`  Added: ${result.stats.credentialsAdded}`);
    console.log(`  Updated: ${result.stats.credentialsUpdated}`);
    console.log(`  Removed: ${result.stats.credentialsRemoved}`);
    console.log(`  Revocation Checks: ${result.stats.revocationChecks}`);
  }

  if (result.errors.length > 0) {
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`  - [${error.type}] ${error.message}`);
    }
  }
  console.log();
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a sample QR code for testing
 */
function createSampleQRCode(vcId: string): string {
  const now = Math.floor(Date.now() / 1000);

  const qrData = {
    v: '1.0',
    p: `pres_${randomId()}`,
    h: 'did:aura:testnet:abc123def456',
    vcs: [vcId],
    ctx: {
      show_age_over_21: vcId.includes('age_21'),
    },
    exp: now + 300, // Expires in 5 minutes
    n: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    sig: generateMockSignature(),
  };

  const json = JSON.stringify(qrData);
  const base64 = Buffer.from(json).toString('base64');
  return `aura://verify?data=${base64}`;
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateMockSignature(): string {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Run the example
main().catch(console.error);
