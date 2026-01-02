# Offline Mode Guide

Complete guide to enabling and using offline verification mode in the Aura Verifier SDK.

## Overview

Offline mode allows the Aura Verifier SDK to verify credentials without an active internet connection by using cached credential data and revocation lists.

### Benefits
- **Reliability** - Works during network outages
- **Performance** - 10-50ms verification (vs 200-500ms online)
- **Cost** - Reduced blockchain queries
- **Availability** - 99.9%+ uptime even with network issues

### Use Cases
- Remote locations with poor connectivity
- High-volume verification (festivals, stadiums)
- Critical infrastructure requiring 100% uptime
- Mobile kiosks and tablets
- Cost-sensitive deployments

## Quick Start

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true, // Enable offline mode
  cacheConfig: {
    storageLocation: './cache',
    ttl: 86400, // 24 hours
    maxSize: 200, // 200 MB
  },
});

await verifier.initialize();

// Verification works offline
const result = await verifier.verify({ qrCodeData });
```

## Offline Mode Strategies

### 1. Pure Offline Mode

Never connects to network, uses only cached data:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  cacheConfig: {
    storageLocation: './offline-cache',
    ttl: 86400, // 24 hours
    maxSize: 500, // Large cache
  },
});
```

**Pros:**
- Fastest verification
- No network dependency
- Predictable performance

**Cons:**
- Must pre-populate cache
- Stale data if not synced
- Can't detect new revocations immediately

### 2. Hybrid Mode (Recommended)

Tries online first, falls back to offline:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: false, // Start online
  timeout: 5000, // Fast timeout for failover
  cacheConfig: {
    enableVCCache: true,
    enableDIDCache: true,
    ttl: 600, // 10 minutes
    maxSize: 200,
  },
});

// Automatic fallback
async function verifyWithFallback(qrCodeData: string) {
  try {
    return await verifier.verify({ qrCodeData });
  } catch (error) {
    if (error instanceof NetworkError) {
      // Switch to offline mode
      await verifier.enableOfflineMode();
      return await verifier.verify({ qrCodeData, offlineOnly: true });
    }
    throw error;
  }
}
```

### 3. Scheduled Sync Mode

Offline during peak hours, sync during off-peak:

```typescript
import cron from 'node-cron';

const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  cacheConfig: {
    storageLocation: './sync-cache',
    ttl: 86400,
    maxSize: 300,
  },
});

// Sync at 4 AM daily
cron.schedule('0 4 * * *', async () => {
  console.log('Starting cache sync...');

  await verifier.disableOfflineMode();
  const result = await verifier.syncCache();

  console.log('Sync complete:', {
    vcsSynced: result.vcsSynced,
    duration: result.duration,
  });

  await verifier.enableOfflineMode();
});

// Manual sync endpoint for emergencies
app.post('/admin/sync', async (req, res) => {
  await verifier.disableOfflineMode();
  const result = await verifier.syncCache();
  await verifier.enableOfflineMode();

  res.json({ success: true, result });
});
```

## Cache Management

### Pre-populating Cache

Before going offline, populate cache with expected credentials:

```typescript
// 1. Start in online mode
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: false,
});

await verifier.initialize();

// 2. Verify credentials to cache them
const commonQRCodes = loadCommonQRCodes(); // Your data source

for (const qr of commonQRCodes) {
  try {
    await verifier.verify({ qrCodeData: qr });
    console.log('Cached credential');
  } catch (error) {
    console.error('Failed to cache:', error);
  }
}

// 3. Sync cache
await verifier.syncCache();

// 4. Enable offline mode
await verifier.enableOfflineMode();

console.log('Cache populated, ready for offline operation');
```

### Cache Synchronization

```typescript
async function syncCacheWithRetry(maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await verifier.disableOfflineMode();
      const result = await verifier.syncCache();

      console.log('Sync successful:', {
        vcsSynced: result.vcsSynced,
        didsSynced: result.didsSynced,
        duration: result.duration,
      });

      await verifier.enableOfflineMode();
      return result;
    } catch (error) {
      attempts++;
      console.error(`Sync attempt ${attempts} failed:`, error);

      if (attempts >= maxRetries) {
        console.error('Sync failed after max retries');
        await verifier.enableOfflineMode(); // Stay offline
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempts));
    }
  }
}
```

### Cache Statistics

```typescript
// Get cache statistics (hypothetical API)
const stats = {
  totalEntries: verifier.cacheSize,
  hitRate: verifier.cacheHitRate,
  lastSync: verifier.lastSyncTime,
};

console.log('Cache stats:', stats);
```

## Storage Options

### 1. Memory Storage (Default)

Fast but lost on restart:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    storageAdapter: 'memory',
  },
});
```

### 2. File Storage (Node.js)

Persistent across restarts:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    storageAdapter: 'file',
    storagePath: '/var/cache/aura-verifier',
  },
});
```

### 3. Browser Storage

Uses localStorage or IndexedDB:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    storageAdapter: 'browser',
  },
});
```

## Encryption

Encrypt cached credentials for security:

```typescript
import { generateEncryptionKey } from '@aura-network/verifier-sdk';

// Generate key (store securely!)
const encryptionKey = await generateEncryptionKey();

const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  cacheConfig: {
    encryptionKey: encryptionKey.toString('hex'),
    storageLocation: './encrypted-cache',
  },
});
```

## Revocation Handling

### Revocation Lists

Download and cache revocation lists:

```typescript
// Sync includes revocation lists
const result = await verifier.syncCache();

console.log('Revocations synced:', result.revocationsSynced);

// Check revocation offline
const status = await verifier.checkCredentialStatus(vcId);

if (status === VCStatus.REVOKED) {
  console.log('Credential revoked (from cache)');
}
```

### Stale Revocation Data

Handle stale revocation data appropriately:

```typescript
const MAX_REVOCATION_AGE = 86400; // 24 hours

async function verifyWithRevocationCheck(qrCodeData: string) {
  const result = await verifier.verify({ qrCodeData });

  if (result.verificationMethod === 'offline') {
    // Check cache age
    const cacheAge = Date.now() - verifier.lastSyncTime.getTime();

    if (cacheAge > MAX_REVOCATION_AGE * 1000) {
      console.warn('Revocation data may be stale');

      // Optionally require online check
      if (REQUIRE_FRESH_REVOCATION) {
        throw new Error('Cannot verify - revocation data too old');
      }
    }
  }

  return result;
}
```

## Monitoring Offline Mode

### Connection Status

Monitor network connectivity:

```typescript
class OfflineMonitor {
  private checkInterval: NodeJS.Timer;

  start(verifier: AuraVerifier) {
    this.checkInterval = setInterval(async () => {
      const isOnline = await this.checkConnectivity();

      if (isOnline && verifier.config.offlineMode) {
        console.log('Network available - consider syncing');
        await this.attemptSync(verifier);
      } else if (!isOnline && !verifier.config.offlineMode) {
        console.log('Network lost - switching to offline mode');
        await verifier.enableOfflineMode();
      }
    }, 60000); // Check every minute
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      await fetch('https://api.aurablockchain.org/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private async attemptSync(verifier: AuraVerifier) {
    try {
      await verifier.disableOfflineMode();
      await verifier.syncCache();
      await verifier.enableOfflineMode();
      console.log('Background sync completed');
    } catch (error) {
      console.error('Background sync failed:', error);
      await verifier.enableOfflineMode();
    }
  }

  stop() {
    clearInterval(this.checkInterval);
  }
}

const monitor = new OfflineMonitor();
monitor.start(verifier);
```

### Event Monitoring

```typescript
verifier.on('verification', (data) => {
  console.log('Verification:', {
    method: data.result.verificationMethod,
    latency: data.result.networkLatency,
  });

  // Track offline verifications
  if (data.result.verificationMethod === 'offline') {
    offlineVerificationCount++;
  }
});

verifier.on('sync', (data) => {
  console.log('Cache synced:', {
    vcsSynced: data.result.vcsSynced,
    duration: data.result.duration,
  });
});
```

## Best Practices

### 1. Regular Syncing

```typescript
// Sync frequency based on criticality
const syncSchedules = {
  critical: '0 */4 * * *', // Every 4 hours
  standard: '0 4 * * *', // Daily at 4 AM
  minimal: '0 4 * * 0', // Weekly on Sunday
};

cron.schedule(syncSchedules.standard, syncCache);
```

### 2. Cache Size Management

```typescript
const cacheConfig = {
  low: { maxSize: 50, ttl: 3600 },
  medium: { maxSize: 200, ttl: 86400 },
  high: { maxSize: 500, ttl: 604800 },
};

// Choose based on your needs
const config = cacheConfig.medium;
```

### 3. Graceful Degradation

```typescript
async function verify(qrCodeData: string) {
  try {
    // Try online first
    return await verifier.verify({ qrCodeData });
  } catch (error) {
    if (error instanceof NetworkError) {
      // Fall back to offline
      return await verifier.verify({ qrCodeData, offlineOnly: true });
    }
    throw error;
  }
}
```

### 4. User Communication

```typescript
function displayVerificationMethod(result: VerificationResult) {
  if (result.verificationMethod === 'offline') {
    showWarning('Verified using cached data (offline mode)');
  } else {
    showSuccess('Verified online with latest data');
  }
}
```

## Troubleshooting

### Cache Not Persisting

Ensure storage location is writable:

```bash
# Check permissions
ls -la /var/cache/aura-verifier

# Fix permissions
sudo chown -R $USER /var/cache/aura-verifier
```

### Slow Offline Verification

Optimize cache:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  cacheConfig: {
    storageAdapter: 'memory', // Faster than file
    maxSize: 100, // Smaller cache
  },
});
```

### Stale Data Concerns

Implement expiration checks:

```typescript
const MAX_CACHE_AGE = 86400000; // 24 hours

if (Date.now() - verifier.lastSyncTime.getTime() > MAX_CACHE_AGE) {
  throw new Error('Cache too old, sync required');
}
```

## Next Steps

- [Batch Verification](./batch-verification.md)
- [Error Handling](./error-handling.md)
- [Security Best Practices](./security-best-practices.md)
