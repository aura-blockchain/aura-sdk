# Offline Mode Example - Aura Verifier SDK

This example demonstrates how to implement offline credential verification using the Aura Verifier SDK's caching capabilities. Perfect for scenarios where network connectivity is unreliable or unavailable.

## Features

- Credential caching for offline verification
- Automatic synchronization when online
- Revocation list caching
- Cache statistics and monitoring
- Graceful degradation when offline
- File-based persistent storage
- Optional cache encryption

## Use Cases

1. **Remote Locations**: Verify credentials in areas with poor connectivity
2. **High-Traffic Events**: Reduce network load by using cached data
3. **Cost Optimization**: Minimize blockchain queries to reduce costs
4. **Reliability**: Ensure verification works even during network outages
5. **Privacy**: Reduce data sent over network by using local cache

## Prerequisites

- Node.js >= 18.0.0
- pnpm (or npm/yarn)

## Installation

From the repository root:

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm build
```

## Running the Example

### 1. Online Mode with Caching

First, run in online mode to populate the cache:

```bash
cd examples/offline-mode
pnpm start
```

This will:
- Initialize the verifier with caching enabled
- Verify sample credentials
- Cache credentials and revocation data
- Display cache statistics
- Sync with the network

### 2. Offline Mode

Once the cache is populated, test offline verification:

```bash
pnpm run offline
```

This will:
- Initialize the verifier in offline mode
- Verify credentials using only cached data
- Show that verification works without network access

### 3. Sync Only

Update the cache without performing verifications:

```bash
pnpm run sync
```

This will:
- Connect to the network
- Sync cached credentials
- Update revocation lists
- Display sync statistics

### 4. Clean Cache

Remove all cached data:

```bash
pnpm run clean
```

## Configuration

### Cache Configuration

```typescript
const CACHE_CONFIG: CacheConfig = {
  // Maximum age of cached credentials (seconds)
  maxAge: 3600, // 1 hour

  // Maximum number of cached entries
  maxEntries: 1000,

  // Persist cache to disk
  persistToDisk: true,

  // Storage adapter (memory, browser, or file)
  storageAdapter: 'file',

  // Storage path (Node.js only)
  storagePath: './cache',

  // Optional: Encrypt cached data (32-byte hex key)
  encryptionKey: 'your-encryption-key-here',
};
```

### Initialize with Cache

```typescript
const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 10000,
  offlineMode: false, // Set to true for offline-only mode
  cache: CACHE_CONFIG,
});
```

## Cache Storage Adapters

### 1. File Storage (Node.js)

```typescript
import { FileStorage } from '@aura-network/verifier-sdk';

const storage = new FileStorage({
  storagePath: './cache',
});
```

### 2. Browser Storage (LocalStorage)

```typescript
import { BrowserStorage } from '@aura-network/verifier-sdk';

const storage = new BrowserStorage({
  prefix: 'aura-cache',
});
```

### 3. Memory Storage (In-Memory)

```typescript
import { MemoryStorage } from '@aura-network/verifier-sdk';

const storage = new MemoryStorage();
```

## Cache Operations

### Get Cache Statistics

```typescript
const stats = await verifier.getCacheStats();

console.log('Total Entries:', stats.totalEntries);
console.log('Expired Entries:', stats.expiredEntries);
console.log('Revoked Entries:', stats.revokedEntries);
console.log('Cache Size:', stats.sizeBytes);
console.log('Hit Rate:', stats.hitRate);
console.log('Last Sync:', stats.lastSyncTime);
```

### Sync Cache

```typescript
const syncResult = await verifier.syncCache();

console.log('Success:', syncResult.success);
console.log('Credentials Synced:', syncResult.credentialsSynced);
console.log('Revocation List Updated:', syncResult.revocationListUpdated);
console.log('Errors:', syncResult.errors);
```

### Clear Cache

```typescript
await verifier.clearCache();
```

### Prune Expired Entries

```typescript
await verifier.pruneCache();
```

## Offline Verification Flow

```typescript
// 1. Initialize verifier with cache
const verifier = new AuraVerifier({
  network: 'testnet',
  offlineMode: true,
  cache: {
    maxAge: 3600,
    maxEntries: 1000,
    persistToDisk: true,
    storageAdapter: 'file',
    storagePath: './cache',
  },
});

await verifier.initialize();

// 2. Verify credential (will use cache)
try {
  const result = await verifier.verify({
    qrCodeData: qrString,
  });

  if (result.isValid) {
    console.log('Valid credential (verified from cache)');
    console.log('Method:', result.verificationMethod); // 'offline'
  }
} catch (error) {
  console.error('Verification failed:', error);
  // Credential not in cache or cache expired
}

// 3. When online, sync cache
if (isOnline()) {
  verifier.setOfflineMode(false);
  await verifier.syncCache();
  verifier.setOfflineMode(true);
}
```

## Encryption

Protect cached credentials with encryption:

```typescript
import { generateEncryptionKey, keyToHex } from '@aura-network/verifier-sdk';

// Generate a secure encryption key
const key = generateEncryptionKey();
const hexKey = keyToHex(key);

const verifier = new AuraVerifier({
  network: 'testnet',
  cache: {
    maxAge: 3600,
    maxEntries: 1000,
    persistToDisk: true,
    encryptionKey: hexKey, // Encrypt cache with this key
  },
});
```

## Auto-Sync

Enable automatic cache synchronization:

```typescript
const verifier = new AuraVerifier({
  network: 'testnet',
  cache: {
    maxAge: 3600,
    maxEntries: 1000,
    persistToDisk: true,
  },
  autoSync: {
    enabled: true,
    intervalMs: 300000, // Sync every 5 minutes
    syncOnStartup: true,
    wifiOnly: true, // Only sync on WiFi (mobile optimization)
    maxRetries: 3,
    retryBackoff: 2,
  },
});
```

## Advanced: Direct Cache Access

For advanced use cases, access the cache directly:

```typescript
import { CredentialCache, FileStorage } from '@aura-network/verifier-sdk';

// Create storage adapter
const storage = new FileStorage({ storagePath: './cache' });

// Create cache
const cache = new CredentialCache({
  storage,
  config: {
    maxAge: 3600,
    maxEntries: 1000,
    persistToDisk: true,
  },
});

await cache.initialize();

// Cache a credential
await cache.set('vc_123', {
  vcId: 'vc_123',
  credential: { /* ... */ },
  holderDid: 'did:aura:mainnet:abc',
  issuerDid: 'did:aura:mainnet:xyz',
  revocationStatus: {
    isRevoked: false,
    checkedAt: new Date(),
  },
  metadata: {
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  },
});

// Get a cached credential
const cached = await cache.get('vc_123');

// Check if credential exists in cache
const exists = await cache.has('vc_123');

// Remove a credential from cache
await cache.delete('vc_123');

// Get cache statistics
const stats = await cache.getStats();
```

## Monitoring Cache Performance

```typescript
// Enable cache event monitoring
verifier.on('cache-hit', (data) => {
  console.log('Cache hit:', data.vcId);
});

verifier.on('cache-miss', (data) => {
  console.log('Cache miss:', data.vcId);
});

verifier.on('cache-update', (data) => {
  console.log('Cache updated:', data.stats);
});

verifier.on('sync-complete', (data) => {
  console.log('Sync completed:', data.result);
});
```

## Production Considerations

### 1. Cache Expiration Strategy

```typescript
// Short TTL for high-security scenarios
const highSecurityConfig = {
  maxAge: 300, // 5 minutes
  maxEntries: 500,
};

// Longer TTL for low-risk scenarios
const lowRiskConfig = {
  maxAge: 86400, // 24 hours
  maxEntries: 5000,
};
```

### 2. Storage Size Management

```typescript
// Monitor cache size
const stats = await verifier.getCacheStats();

if (stats.sizeBytes > 100 * 1024 * 1024) { // 100 MB
  // Cache is too large, prune it
  await verifier.pruneCache();
}
```

### 3. Sync Strategy

```typescript
// Sync during low-traffic periods
if (isLowTrafficPeriod()) {
  await verifier.syncCache();
}

// Or sync based on connectivity
if (isOnWiFi() && !isBatteryLow()) {
  await verifier.syncCache();
}
```

### 4. Error Handling

```typescript
try {
  const result = await verifier.verify({ qrCodeData });

  if (!result.isValid && verifier.isOfflineMode()) {
    // Credential might be revoked, but we can't check online
    console.warn('Offline verification - revocation status may be stale');
  }
} catch (error) {
  if (error.code === 'CREDENTIAL_NOT_IN_CACHE') {
    // Fall back to online verification if possible
    verifier.setOfflineMode(false);
    const result = await verifier.verify({ qrCodeData });
    verifier.setOfflineMode(true);
  }
}
```

## Performance Metrics

Expected performance with caching:

- **Cache Hit**: ~1-5ms (vs. 100-500ms online)
- **Cache Miss**: Same as online verification
- **Sync Operation**: Depends on number of credentials
- **Storage Size**: ~1-5KB per cached credential

## Next Steps

- Implement custom storage adapters
- Set up automated sync schedules
- Monitor cache performance in production
- Tune cache configuration for your use case
- Implement cache warming strategies

## Learn More

- [Basic Node.js Example](../basic-node/)
- [Express API Example](../express-api/)
- [CLI Tool Example](../cli-tool/)
- [Offline Mode Documentation](../../docs/offline-mode.md)
