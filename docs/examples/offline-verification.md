# Offline Verification Example

Example of using offline mode with caching for environments with limited connectivity.

## Overview

This example demonstrates how to use the Aura Verifier SDK in offline mode, which allows verification using cached data when network connectivity is unavailable.

## Use Cases

- Mobile apps with intermittent connectivity
- Remote locations with poor network
- High-performance scenarios requiring low latency
- Cost optimization (reduce network requests)

## Complete Example

```typescript
import {
  createOfflineVerifier,
  createAuraClient,
  CacheSync,
  CredentialCache
} from '@aura-network/verifier-sdk';

async function main() {
  // 1. Create Aura client
  const client = createAuraClient({
    grpcEndpoint: 'https://rpc.aurablockchain.org:9090',
    restEndpoint: 'https://api.aurablockchain.org',
    timeout: 10000
  });

  // 2. Setup offline verifier with auto-sync
  const offlineVerifier = createOfflineVerifier({
    client,
    cacheConfig: {
      maxAge: 3600,         // Cache entries for 1 hour
      maxEntries: 1000,     // Maximum 1000 cached credentials
      persistToDisk: true,  // Persist cache to disk
      encryptionKey: process.env.ENCRYPTION_KEY  // Encrypt cached data
    },
    autoSync: {
      enabled: true,
      intervalMs: 300000,   // Sync every 5 minutes
      syncOnStartup: true,  // Sync immediately on startup
      wifiOnly: false       // Sync on any connection
    }
  });

  console.log('Offline verifier initialized');

  // 3. Wait for initial sync
  console.log('Performing initial sync...');
  const syncResult = await offlineVerifier.syncNow();
  console.log('Synced:', syncResult.didsSynced, 'DIDs,', syncResult.vcsSynced, 'VCs');

  // 4. Verify credential (will use cache when available)
  try {
    const result = await offlineVerifier.verify('vc-123');

    if (result.verified) {
      console.log('Credential verified!');
      console.log('From cache:', result.fromCache);
      console.log('Revoked:', result.revocationStatus.isRevoked);
    } else {
      console.error('Verification failed:', result.errors);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // 5. Get cache statistics
  const stats = await offlineVerifier.getStats();
  console.log('\nCache Statistics:');
  console.log('- Total entries:', stats.totalEntries);
  console.log('- Total size:', stats.totalSize, 'bytes');
  console.log('- Hit rate:', (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2), '%');

  // 6. Cleanup
  await offlineVerifier.destroy();
  console.log('Cleanup complete');
}

main().catch(console.error);
```

## Manual Cache Management

For more control over caching:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function manualCacheExample() {
  // Initialize with caching enabled
  const verifier = new AuraVerifier({
    network: 'mainnet',
    offlineMode: false,  // Start in online mode
    cacheConfig: {
      enableDIDCache: true,
      enableVCCache: true,
      ttl: 3600,  // 1 hour TTL
      maxSize: 100  // 100 MB max cache size
    }
  });

  await verifier.initialize();

  // Perform verifications (automatically cached)
  const result1 = await verifier.verify({ qrCodeData: qr1 });
  const result2 = await verifier.verify({ qrCodeData: qr2 });

  // Manually sync cache
  console.log('Syncing cache...');
  const syncResult = await verifier.syncCache();
  console.log('Synced:', syncResult.didsSynced, 'DIDs');

  // Enable offline mode
  await verifier.enableOfflineMode();
  console.log('Offline mode enabled');

  // Verification now uses cached data only
  const result3 = await verifier.verify({ qrCodeData: qr3 });
  console.log('Verification method:', result3.verificationMethod);  // 'cached' or 'offline'

  // Re-enable online mode
  await verifier.disableOfflineMode();
  console.log('Online mode enabled');

  await verifier.destroy();
}
```

## Monitoring Network Status

Automatically switch between online and offline modes based on connectivity:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function networkAwareVerifier() {
  const verifier = new AuraVerifier({
    network: 'mainnet',
    offlineMode: false,
    cacheConfig: {
      enableDIDCache: true,
      enableVCCache: true,
      ttl: 3600
    }
  });

  await verifier.initialize();

  // Listen for online/offline events
  window.addEventListener('online', async () => {
    console.log('Network available - switching to online mode');
    await verifier.disableOfflineMode();
    await verifier.syncCache();
  });

  window.addEventListener('offline', async () => {
    console.log('Network unavailable - switching to offline mode');
    await verifier.enableOfflineMode();
  });

  // Periodic cache sync when online
  setInterval(async () => {
    if (navigator.onLine) {
      const result = await verifier.syncCache();
      console.log('Cache synced:', result.didsSynced, 'DIDs');
    }
  }, 300000);  // Every 5 minutes

  return verifier;
}
```

## Pre-warming Cache

Pre-load commonly used credentials:

```typescript
import { CredentialCache } from '@aura-network/verifier-sdk';

async function prewarmCache(client: AuraClient) {
  const cache = new CredentialCache({
    maxAge: 3600,
    maxEntries: 1000
  });

  // Pre-load frequently accessed credentials
  const commonCredentials = [
    'vc-gov-id-template',
    'vc-poh-template',
    'vc-age-template'
  ];

  console.log('Pre-warming cache...');
  for (const vcId of commonCredentials) {
    try {
      const credential = await client.getCredential(vcId);
      await cache.set(vcId, {
        vcId,
        credential,
        holderDid: credential.credentialSubject.id,
        issuerDid: credential.issuer,
        revocationStatus: {
          isRevoked: false,
          checkedAt: new Date()
        },
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000)
        }
      });
    } catch (error) {
      console.error(`Failed to cache ${vcId}:`, error);
    }
  }

  console.log('Cache pre-warming complete');
  return cache;
}
```

## Storage Options

### In-Memory Storage (Default)

```typescript
import { MemoryStorage } from '@aura-network/verifier-sdk';

const cache = new CredentialCache({
  maxAge: 3600,
  storage: new MemoryStorage()
});
```

### Browser LocalStorage

```typescript
import { BrowserStorage } from '@aura-network/verifier-sdk';

const cache = new CredentialCache({
  maxAge: 3600,
  storage: new BrowserStorage({ prefix: 'aura-cache-' })
});
```

### File System Storage (Node.js)

```typescript
import { FileStorage } from '@aura-network/verifier-sdk';

const cache = new CredentialCache({
  maxAge: 3600,
  storage: new FileStorage({
    directory: './cache',
    encryptionKey: process.env.ENCRYPTION_KEY
  })
});
```

## Cache Encryption

Always encrypt cached data in production:

```typescript
import {
  generateEncryptionKey,
  keyToHex,
  CredentialCache
} from '@aura-network/verifier-sdk';

// Generate encryption key once
const key = generateEncryptionKey();
const hexKey = keyToHex(key);
console.log('Save this key securely:', hexKey);

// Use encrypted cache
const cache = new CredentialCache({
  maxAge: 3600,
  encryptionKey: hexKey
});
```

## Best Practices

### 1. Cache TTL Strategy

```typescript
const cache = new CredentialCache({
  maxAge: 3600,  // 1 hour for most credentials
  // Customize TTL per credential type
  getTTL: (credential) => {
    if (credential.vcType === 'GovernmentID') {
      return 86400;  // 24 hours for government IDs
    } else if (credential.vcType === 'ProofOfHumanity') {
      return 3600;   // 1 hour for POH
    }
    return 7200;  // Default 2 hours
  }
});
```

### 2. Cache Size Management

```typescript
const cache = new CredentialCache({
  maxSize: 100,  // 100 MB max
  evictionPolicy: 'lru',  // Least Recently Used
  onEviction: (entry) => {
    console.log('Evicted from cache:', entry.vcId);
  }
});
```

### 3. Graceful Degradation

```typescript
async function verifyWithFallback(qrCode: string) {
  const verifier = new AuraVerifier({
    network: 'mainnet',
    offlineMode: false,
    cacheConfig: { enableVCCache: true }
  });

  await verifier.initialize();

  try {
    // Try online verification
    const result = await verifier.verify({ qrCodeData: qrCode });
    return result;
  } catch (error) {
    if (error instanceof NetworkError) {
      // Fall back to offline mode
      console.log('Network error, trying offline...');
      await verifier.enableOfflineMode();

      try {
        const result = await verifier.verify({ qrCodeData: qrCode });
        return result;
      } catch (offlineError) {
        console.error('Offline verification also failed');
        throw offlineError;
      }
    }
    throw error;
  } finally {
    await verifier.destroy();
  }
}
```

### 4. Monitoring Cache Health

```typescript
async function monitorCache(cache: CredentialCache) {
  setInterval(async () => {
    const stats = await cache.getStats();

    const hitRate = stats.hits / (stats.hits + stats.misses) * 100;
    const sizePercentage = stats.totalSize / (100 * 1024 * 1024) * 100;

    console.log('Cache Health:');
    console.log('- Hit rate:', hitRate.toFixed(2), '%');
    console.log('- Size:', sizePercentage.toFixed(2), '% of max');
    console.log('- Entries:', stats.totalEntries);

    if (hitRate < 50) {
      console.warn('Low cache hit rate - consider adjusting TTL');
    }

    if (sizePercentage > 90) {
      console.warn('Cache nearly full - consider clearing old entries');
      await cache.clear();
    }
  }, 60000);  // Check every minute
}
```

## Next Steps

- [Batch Verification Example](./batch-verification.md)
- [Custom Configuration Example](./custom-configuration.md)
- [Offline Mode Documentation](../offline-mode.md)
- [API Reference](../api-reference.md)
