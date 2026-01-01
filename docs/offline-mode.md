# Offline Mode

Enable credential verification without an internet connection by caching credentials and revocation lists locally.

## Table of Contents

- [Overview](#overview)
- [When to Use Offline Mode](#when-to-use-offline-mode)
- [Enabling Offline Mode](#enabling-offline-mode)
- [Cache Configuration](#cache-configuration)
- [Syncing Revocation Lists](#syncing-revocation-lists)
- [Offline Verification Flow](#offline-verification-flow)
- [Limitations](#limitations)
- [Best Practices](#best-practices)

## Overview

Offline mode allows verifiers to continue operating when internet connectivity is unavailable or unreliable. The SDK caches:

- **Credential Data**: Verified credentials and their attributes
- **Revocation Lists**: Merkle trees of revoked credential IDs
- **Issuer Public Keys**: Public keys for signature verification
- **Schema Definitions**: Credential schemas for validation

**Benefits:**
- Faster verification (no network latency)
- Reliability in low-connectivity environments
- Reduced bandwidth costs
- Better user experience

**Trade-offs:**
- Slightly stale revocation data
- Storage requirements
- Sync complexity

## When to Use Offline Mode

### Recommended Use Cases

1. **Physical Venues with Poor Connectivity**
   - Nightclubs with crowded WiFi
   - Remote event venues
   - Underground locations (basements, subways)

2. **Mobile Verifiers**
   - Door staff with mobile scanners
   - Delivery drivers
   - Field service workers

3. **High-Volume Scenarios**
   - Concert entry gates
   - Stadium access control
   - Festival check-ins

4. **Cost Optimization**
   - Reduce API calls
   - Lower bandwidth usage
   - Minimize cloud service costs

### Not Recommended For

1. **High-Security Applications**
   - Financial transactions
   - Government services
   - Medical record access

2. **Real-Time Revocation Critical**
   - Law enforcement verification
   - High-value transactions
   - Time-sensitive credentials

3. **Long-Term Offline Operation**
   - Deployments without sync capability
   - Air-gapped systems

## Enabling Offline Mode

### Basic Setup

```typescript
import { VerifierSDK, CacheManager } from '@aura-network/verifier-sdk';

// Initialize cache manager
const cache = new CacheManager({
  maxAge: 3600,              // Cache credentials for 1 hour
  maxEntries: 1000,          // Store up to 1000 credentials
  persistToDisk: true,       // Persist cache across restarts
  storageAdapter: 'browser'  // Use localStorage (browser)
});

// Initialize SDK with cache
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache,
  offlineMode: true  // Enable offline verification
});
```

### Node.js Setup

```typescript
import { VerifierSDK, CacheManager } from '@aura-network/verifier-sdk';

const cache = new CacheManager({
  maxAge: 3600,
  maxEntries: 5000,
  persistToDisk: true,
  storageAdapter: 'file',
  storagePath: '/var/cache/aura-verifier'
});

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache,
  offlineMode: true
});
```

### React Native Setup

```typescript
import { VerifierSDK, CacheManager } from '@aura-network/verifier-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cache = new CacheManager({
  maxAge: 7200,
  maxEntries: 500,
  persistToDisk: true,
  storageAdapter: 'react-native',
  asyncStorage: AsyncStorage
});

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache,
  offlineMode: true
});
```

## Cache Configuration

### CacheConfig Interface

```typescript
interface CacheConfig {
  /** Maximum age of cached credentials in seconds (default: 3600) */
  maxAge: number;

  /** Maximum number of cached credentials (default: 1000) */
  maxEntries: number;

  /** Whether to persist cache to disk/localStorage (default: true) */
  persistToDisk: boolean;

  /** Optional encryption key for cache data (hex string) */
  encryptionKey?: string;

  /** Storage adapter to use (default: auto-detect) */
  storageAdapter?: 'memory' | 'browser' | 'file' | 'react-native';

  /** Custom storage path for file storage (Node.js only) */
  storagePath?: string;
}
```

### Cache Size Management

```typescript
const cache = new CacheManager({
  maxAge: 1800,        // 30 minutes
  maxEntries: 500,     // Limit cache size

  // Auto-eviction strategy
  evictionPolicy: 'lru' // Least recently used
});

// Monitor cache size
const stats = await cache.getStats();
console.log('Cache entries:', stats.totalEntries);
console.log('Cache size:', stats.sizeBytes / 1024, 'KB');
console.log('Hit rate:', stats.hitRate);
```

### Cache Encryption

Encrypt cached data for security:

```typescript
import { generateEncryptionKey } from '@aura-network/verifier-sdk';

// Generate a secure encryption key
const encryptionKey = generateEncryptionKey();

const cache = new CacheManager({
  maxAge: 3600,
  maxEntries: 1000,
  persistToDisk: true,
  encryptionKey: encryptionKey, // Hex-encoded AES-256 key
  storageAdapter: 'file',
  storagePath: '/secure/cache'
});

// Store the key securely (e.g., environment variable, key vault)
process.env.CACHE_ENCRYPTION_KEY = encryptionKey;
```

## Syncing Revocation Lists

### Manual Sync

```typescript
import { RevocationListSync } from '@aura-network/verifier-sdk';

const syncManager = new RevocationListSync({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache
});

// Sync all revocation lists
const result = await syncManager.syncAll();

console.log('Credentials synced:', result.credentialsSynced);
console.log('Revocation list updated:', result.revocationListUpdated);
console.log('Last sync:', result.lastSyncTime);
```

### Automatic Sync

```typescript
const syncManager = new RevocationListSync({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache,
  autoSync: {
    enabled: true,
    intervalMs: 300000,      // Sync every 5 minutes
    wifiOnly: true,          // Only sync on WiFi (mobile)
    syncOnStartup: true,     // Sync when app starts
    maxRetries: 3,
    retryBackoff: 2
  }
});

// Start auto-sync
await syncManager.start();

// Monitor sync events
syncManager.on('syncComplete', (result) => {
  console.log('Sync completed:', result);
});

syncManager.on('syncError', (error) => {
  console.error('Sync failed:', error);
});

// Stop auto-sync when done
await syncManager.stop();
```

### Selective Sync

Sync only specific issuers or credential types:

```typescript
// Sync only credentials from specific issuers
await syncManager.syncIssuers([
  'did:aura:mainnet:issuer1',
  'did:aura:mainnet:issuer2'
]);

// Sync only specific credential types
await syncManager.syncCredentialTypes([
  'GovernmentID',
  'DriversLicense'
]);
```

### Sync Status

```typescript
const status = await syncManager.getStatus();

console.log('Last successful sync:', status.lastSuccessfulSync);
console.log('Next scheduled sync:', status.nextScheduledSync);
console.log('Sync in progress:', status.syncInProgress);
console.log('Credentials cached:', status.credentialsCached);
console.log('Revocation entries:', status.revocationEntriesCached);
```

## Offline Verification Flow

### Hybrid Mode (Recommended)

Try online verification first, fall back to cache:

```typescript
async function verifyCredential(qrString: string): Promise<boolean> {
  const verifier = new VerifierSDK({
    rpcEndpoint: 'https://rpc.aura.network',
    cache: cache,
    offlineMode: false // Prefer online
  });

  try {
    // Parse QR code
    const qrData = parseQRCode(qrString);

    // Try online verification first
    const result = await verifier.verifyCredential(qrData, {
      preferOnline: true,
      fallbackToCache: true,
      maxCacheAge: 3600 // Accept cache up to 1 hour old
    });

    if (result.fromCache) {
      console.warn('⚠ Verified from cache (offline)');
      console.log('Last checked:', result.revocationStatus.lastChecked);
    } else {
      console.log('✓ Verified online');
    }

    return result.verified;

  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}
```

### Pure Offline Mode

Verify entirely from cache:

```typescript
async function verifyOffline(qrString: string): Promise<boolean> {
  const verifier = new VerifierSDK({
    rpcEndpoint: 'https://rpc.aura.network',
    cache: cache,
    offlineMode: true // Force offline
  });

  const qrData = parseQRCode(qrString);

  const result = await verifier.verifyCredential(qrData, {
    requireOnline: false // Don't fail if network unavailable
  });

  if (!result.verified) {
    console.error('Offline verification failed');

    if (result.errors.includes('CREDENTIAL_NOT_CACHED')) {
      console.log('Credential not in cache - sync required');
    }

    if (result.errors.includes('CACHE_EXPIRED')) {
      console.log('Cached data expired - sync recommended');
    }

    return false;
  }

  return true;
}
```

### Network Detection

Automatically switch between online and offline:

```typescript
import { NetworkMonitor } from '@aura-network/verifier-sdk';

const networkMonitor = new NetworkMonitor();

networkMonitor.on('online', () => {
  console.log('Network available - switching to online mode');
  verifier.setOfflineMode(false);

  // Trigger sync
  syncManager.syncAll();
});

networkMonitor.on('offline', () => {
  console.log('Network unavailable - switching to offline mode');
  verifier.setOfflineMode(true);
});

// Start monitoring
await networkMonitor.start();
```

## Limitations

### Revocation Staleness

Cached revocation data may be outdated.

**Risk:** Accepting a credential that was revoked since last sync.

**Mitigation:**
- Sync frequently (every 5-15 minutes)
- Display cache age to users
- Set maximum acceptable cache age
- Use hybrid mode for critical verifications

```typescript
const result = await verifier.verifyCredential(qrData, {
  maxCacheAge: 300 // Reject cache older than 5 minutes
});

if (result.fromCache) {
  const cacheAge = Date.now() - result.revocationStatus.lastChecked.getTime();
  if (cacheAge > 600000) { // 10 minutes
    console.warn('Cache is stale - recommend online verification');
  }
}
```

### Storage Requirements

Large caches consume storage space.

**Typical Sizes:**
- 1 credential: ~5-10 KB
- 1000 credentials: ~5-10 MB
- Revocation list: ~1-5 MB (depending on total credentials)

**Management:**
```typescript
// Monitor storage
const stats = await cache.getStats();
if (stats.sizeBytes > 50 * 1024 * 1024) { // 50 MB
  console.warn('Cache size exceeds 50 MB');

  // Clear old entries
  await cache.evictExpired();

  // Or clear least recently used
  await cache.evictLRU(500); // Keep only 500 most recent
}
```

### First-Time Usage

Offline mode requires initial sync when online.

```typescript
// Pre-populate cache before going offline
async function prepareOfflineMode() {
  console.log('Preparing offline mode...');

  // Sync all revocation lists
  await syncManager.syncAll();

  // Pre-cache common credentials (if known)
  await precacheCommonCredentials();

  console.log('Offline mode ready');
}

// Call before going to remote location
await prepareOfflineMode();
```

### Issuer Public Key Changes

Cached issuer keys may become invalid if rotated.

**Solution:**
- Include key version in cache
- Sync issuer data regularly
- Fall back to online for key mismatches

### Time Synchronization

Offline devices may have clock drift.

```typescript
// Validate local clock on sync
await syncManager.syncAll({
  validateClock: true,
  maxClockDrift: 300 // 5 minutes
});
```

## Best Practices

### 1. Regular Syncing

```typescript
// Sync frequently in background
const syncManager = new RevocationListSync({
  rpcEndpoint: 'https://rpc.aura.network',
  cache: cache,
  autoSync: {
    enabled: true,
    intervalMs: 300000,     // Every 5 minutes
    syncOnStartup: true
  }
});
```

### 2. Cache Age Indicators

Show users when data was last synced:

```typescript
const stats = await cache.getStats();

if (stats.lastSyncTime) {
  const minutesAgo = (Date.now() - stats.lastSyncTime.getTime()) / 60000;
  console.log(`Cache last synced ${Math.floor(minutesAgo)} minutes ago`);

  if (minutesAgo > 60) {
    console.warn('⚠ Cache is over 1 hour old - sync recommended');
  }
}
```

### 3. Graceful Degradation

```typescript
async function verifyWithDegradation(qrString: string) {
  try {
    // Try online first
    return await verifyOnline(qrString);
  } catch (onlineError) {
    console.warn('Online verification failed, trying cache');

    try {
      // Fall back to cache
      return await verifyOffline(qrString);
    } catch (offlineError) {
      console.error('Both online and offline verification failed');
      throw new Error('Verification unavailable');
    }
  }
}
```

### 4. User Notifications

```typescript
if (result.fromCache) {
  const cacheAge = Date.now() - result.revocationStatus.lastChecked.getTime();
  const minutesOld = Math.floor(cacheAge / 60000);

  if (minutesOld < 10) {
    console.log(`✓ Verified (cached ${minutesOld}m ago)`);
  } else {
    console.warn(`⚠ Verified from cache (${minutesOld}m old) - recommend online check`);
  }
}
```

### 5. Cache Cleanup

```typescript
// Periodic cleanup
setInterval(async () => {
  await cache.evictExpired();
  await cache.compact();
}, 3600000); // Every hour

// On app shutdown
process.on('exit', async () => {
  await cache.evictExpired();
  await cache.close();
});
```

### 6. Encryption

```typescript
// Always encrypt cached data containing PII
const cache = new CacheManager({
  maxAge: 3600,
  maxEntries: 1000,
  persistToDisk: true,
  encryptionKey: process.env.CACHE_ENCRYPTION_KEY,
  storageAdapter: 'file'
});
```

### 7. Monitoring

```typescript
// Monitor cache performance
const stats = await cache.getStats();

console.log('Cache Performance:');
console.log('- Hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
console.log('- Entries:', stats.totalEntries);
console.log('- Size:', (stats.sizeBytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('- Expired:', stats.expiredEntries);

// Alert on low hit rate
if (stats.hitRate < 0.5) {
  console.warn('Cache hit rate below 50% - consider increasing maxEntries');
}
```

## Example: Complete Offline-First Application

```typescript
import {
  VerifierSDK,
  CacheManager,
  RevocationListSync,
  NetworkMonitor,
  parseQRCode
} from '@aura-network/verifier-sdk';

class OfflineFirstVerifier {
  private verifier: VerifierSDK;
  private cache: CacheManager;
  private syncManager: RevocationListSync;
  private networkMonitor: NetworkMonitor;

  async initialize() {
    // Setup cache
    this.cache = new CacheManager({
      maxAge: 3600,
      maxEntries: 2000,
      persistToDisk: true,
      encryptionKey: process.env.CACHE_ENCRYPTION_KEY,
      storageAdapter: 'file',
      storagePath: './cache'
    });

    // Setup SDK
    this.verifier = new VerifierSDK({
      rpcEndpoint: 'https://rpc.aura.network',
      cache: this.cache,
      offlineMode: false
    });

    // Setup sync
    this.syncManager = new RevocationListSync({
      rpcEndpoint: 'https://rpc.aura.network',
      cache: this.cache,
      autoSync: {
        enabled: true,
        intervalMs: 300000, // 5 minutes
        syncOnStartup: true
      }
    });

    // Monitor network
    this.networkMonitor = new NetworkMonitor();

    this.networkMonitor.on('online', () => {
      console.log('Network online');
      this.verifier.setOfflineMode(false);
      this.syncManager.syncAll();
    });

    this.networkMonitor.on('offline', () => {
      console.log('Network offline - using cache');
      this.verifier.setOfflineMode(true);
    });

    await this.syncManager.start();
    await this.networkMonitor.start();

    console.log('Offline-first verifier initialized');
  }

  async verify(qrString: string): Promise<boolean> {
    try {
      const qrData = parseQRCode(qrString);

      const result = await this.verifier.verifyCredential(qrData, {
        preferOnline: true,
        fallbackToCache: true,
        maxCacheAge: 3600
      });

      if (result.fromCache) {
        const cacheAge = Date.now() - result.revocationStatus.lastChecked.getTime();
        console.log(`Verified from cache (${Math.floor(cacheAge / 60000)}m old)`);
      }

      return result.verified;
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  async getStatus() {
    const cacheStats = await this.cache.getStats();
    const syncStatus = await this.syncManager.getStatus();
    const networkStatus = this.networkMonitor.getStatus();

    return {
      network: networkStatus.isOnline ? 'online' : 'offline',
      cache: cacheStats,
      sync: syncStatus
    };
  }

  async shutdown() {
    await this.syncManager.stop();
    await this.networkMonitor.stop();
    await this.cache.close();
    await this.verifier.disconnect();
  }
}

// Usage
const verifier = new OfflineFirstVerifier();
await verifier.initialize();

const isValid = await verifier.verify(qrString);
console.log('Valid:', isValid);

const status = await verifier.getStatus();
console.log('Status:', status);
```

## Next Steps

- [Error Handling](./error-handling.md) - Handle offline-specific errors
- [Security Guide](./security.md) - Secure offline cache data
- [API Reference](./api-reference.md) - Cache and sync API details
