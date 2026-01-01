# Offline Verification Module

The offline verification module enables credential verification when the device is offline or has poor connectivity. It provides intelligent caching, automatic synchronization, and revocation checking capabilities.

## Features

- **Credential Caching**: Store verified credentials locally with automatic expiration
- **Revocation Lists**: Efficient bitmap-based revocation checking with Merkle proof support
- **Encryption**: Optional AES-256-GCM encryption for sensitive cached data
- **Storage Adapters**: Platform-agnostic storage (memory, browser localStorage, Node.js file system)
- **Auto-Sync**: Configurable background synchronization with the blockchain
- **Offline-First**: Graceful degradation when network is unavailable

## Quick Start

```typescript
import { createOfflineVerifier } from '@aura-network/verifier-sdk/offline';

// Create offline verifier with auto-sync
const offlineVerifier = createOfflineVerifier({
  client: auraClient, // Your AuraClient instance
  cacheConfig: {
    maxAge: 3600,           // Cache for 1 hour
    maxEntries: 1000,       // Maximum 1000 credentials
    persistToDisk: true,    // Persist to localStorage/file
    encryptionKey: 'your-hex-key' // Optional encryption
  },
  autoSync: {
    enabled: true,
    intervalMs: 300000,     // Sync every 5 minutes
    syncOnStartup: true,
    wifiOnly: true          // Only sync on WiFi
  }
});

// Verify credential (uses cache when available)
const result = await offlineVerifier.verify('credential-id');

if (result.verified) {
  console.log('Credential is valid');
  console.log('From cache:', result.fromCache);
  console.log('Revoked:', result.revocationStatus.isRevoked);
} else {
  console.error('Verification failed:', result.errors);
}
```

## Architecture

### Core Components

1. **CredentialCache** (`cache.ts`)
   - Manages credential storage and retrieval
   - Automatic expiration and eviction
   - Optional encryption
   - Import/export capabilities

2. **CacheSync** (`sync.ts`)
   - Synchronizes cache with blockchain
   - Updates revocation status
   - Configurable auto-sync
   - Error handling and retry logic

3. **Storage Adapters** (`storage.ts`)
   - `MemoryStorage`: In-memory cache (testing/fallback)
   - `BrowserStorage`: localStorage for browsers
   - `FileStorage`: File system for Node.js

4. **Encryption** (`encryption.ts`)
   - AES-256-GCM encryption
   - PBKDF2 key derivation
   - String and object encryption

5. **Revocation** (`revocation.ts`)
   - Bitmap-based revocation checking
   - Merkle proof generation and verification
   - Efficient compression

## Usage Examples

### Basic Caching

```typescript
import { CredentialCache } from '@aura-network/verifier-sdk/offline';

const cache = new CredentialCache({
  maxAge: 3600,
  maxEntries: 1000,
  persistToDisk: true
});

// Store credential
await cache.set(vcId, cachedCredential);

// Retrieve credential
const credential = await cache.get(vcId);

// Check if exists
const exists = await cache.has(vcId);

// Get statistics
const stats = await cache.getStats();
console.log(`Cached: ${stats.totalEntries}, Hit rate: ${stats.hitRate}`);
```

### Manual Synchronization

```typescript
import { CacheSync } from '@aura-network/verifier-sdk/offline';

const sync = new CacheSync(auraClient, cache);

// Sync all cached credentials
const result = await sync.sync();
console.log(`Synced ${result.credentialsSynced} credentials`);

// Sync specific credentials
await sync.syncCredentialStatus(['vc-001', 'vc-002']);

// Sync revocation list only
await sync.syncRevocationList();
```

### Encrypted Cache

```typescript
import {
  CredentialCache,
  generateEncryptionKey,
  keyToHex
} from '@aura-network/verifier-sdk/offline';

// Generate encryption key
const key = generateEncryptionKey();
const hexKey = keyToHex(key);

// Create encrypted cache
const cache = new CredentialCache({
  maxAge: 3600,
  maxEntries: 1000,
  persistToDisk: true,
  encryptionKey: hexKey
});

// All cache operations are automatically encrypted
await cache.set(vcId, credential);
const retrieved = await cache.get(vcId); // Automatically decrypted
```

### Auto-Sync

```typescript
import { CacheSync } from '@aura-network/verifier-sdk/offline';

const sync = new CacheSync(auraClient, cache);

// Start auto-sync every 5 minutes
sync.startAutoSync(300000, {
  syncOnStartup: true,
  wifiOnly: true,      // Mobile-friendly
  maxRetries: 3,
  retryBackoff: 2
});

// Check auto-sync status
const status = sync.getAutoSyncStatus();
console.log('Auto-sync enabled:', status.enabled);

// Stop auto-sync
sync.stopAutoSync();
```

### Revocation Checking

```typescript
import {
  createRevocationList,
  isRevoked,
  validateRevocationList
} from '@aura-network/verifier-sdk/offline';

// Create revocation list
const credentialIds = ['vc-001', 'vc-002', 'vc-003', 'vc-004'];
const revokedIndices = [1, 3]; // vc-002 and vc-004 are revoked

const revocationList = createRevocationList(credentialIds, revokedIndices);

// Check if credential is revoked
const isRevokedStatus = isRevoked('vc-002', 1, revocationList);
console.log('Is revoked:', isRevokedStatus); // true

// Validate revocation list integrity
const isValid = validateRevocationList(revocationList);
console.log('Valid revocation list:', isValid);
```

### Merkle Proofs

```typescript
import {
  hashCredentialId,
  generateMerkleProof,
  verifyMerkleProof,
  calculateMerkleRoot
} from '@aura-network/verifier-sdk/offline';

// Hash credential IDs
const vcIds = ['vc-001', 'vc-002', 'vc-003', 'vc-004'];
const hashes = vcIds.map(id => hashCredentialId(id));

// Calculate Merkle root
const root = calculateMerkleRoot(hashes);

// Generate proof for specific credential
const proof = generateMerkleProof(vcIds[1], hashes, 1);

// Verify proof
const isValid = verifyMerkleProof(proof, hashes[1]);
console.log('Proof valid:', isValid);
```

### Custom Storage Adapter

```typescript
import {
  CredentialCache,
  createStorageAdapter
} from '@aura-network/verifier-sdk/offline';

// Auto-detect storage based on environment
const storage = createStorageAdapter();

// Or specify explicitly
const browserStorage = createStorageAdapter('browser', {
  prefix: 'my_app_'
});

const fileStorage = createStorageAdapter('file', {
  basePath: './cache-data'
});

const cache = new CredentialCache({
  maxAge: 3600,
  maxEntries: 1000,
  persistToDisk: true,
  storageAdapter: 'browser' // or 'file' or 'memory'
});
```

### Import/Export Cache

```typescript
// Export cache data (for backup)
const exportedData = await cache.export();
localStorage.setItem('cache-backup', exportedData);

// Import cache data (for restore)
const backupData = localStorage.getItem('cache-backup');
if (backupData) {
  await cache.import(backupData);
}
```

### Maintenance Operations

```typescript
// Clean expired entries
const removed = await cache.cleanExpired();
console.log(`Removed ${removed} expired entries`);

// Remove stale credentials (older than 24 hours)
const staleRemoved = await sync.removeStaleCredentials(24 * 60 * 60 * 1000);
console.log(`Removed ${staleRemoved} stale credentials`);

// Validate all cached credentials
const invalid = await sync.validateCachedCredentials();
console.log(`Found ${invalid.length} invalid credentials:`, invalid);

// Clear entire cache
await cache.clear();
```

## Configuration

### CacheConfig

```typescript
interface CacheConfig {
  maxAge: number;           // Max cache age in seconds (default: 3600)
  maxEntries: number;       // Max cached credentials (default: 1000)
  persistToDisk: boolean;   // Save to localStorage/file (default: true)
  encryptionKey?: string;   // Optional encryption key (hex string)
  storageAdapter?: 'memory' | 'browser' | 'file';
  storagePath?: string;     // Custom path for file storage
}
```

### AutoSyncConfig

```typescript
interface AutoSyncConfig {
  enabled: boolean;         // Enable auto-sync
  intervalMs: number;       // Sync interval in milliseconds
  wifiOnly?: boolean;       // Only sync on WiFi (mobile optimization)
  syncOnStartup?: boolean;  // Sync on app startup
  maxRetries?: number;      // Maximum retry attempts (default: 3)
  retryBackoff?: number;    // Backoff multiplier (default: 2)
}
```

## Security Considerations

1. **Encryption**: Always use encryption for sensitive credentials
2. **Key Management**: Store encryption keys securely (not in code)
3. **Cache Duration**: Set appropriate `maxAge` based on your security requirements
4. **Revocation Checking**: Regularly sync revocation lists
5. **Storage Limits**: Set `maxEntries` to prevent excessive storage usage

## Performance Tips

1. **WiFi-Only Sync**: Enable `wifiOnly` for mobile apps to save data
2. **Compression**: Revocation bitmaps are automatically compressed
3. **Batch Operations**: Sync multiple credentials at once
4. **Async Operations**: All operations are async for non-blocking performance
5. **Memory Management**: Use `cleanExpired()` periodically to free memory

## Error Handling

```typescript
try {
  const result = await offlineVerifier.verify(vcId);

  if (!result.verified) {
    // Check errors
    for (const error of result.errors) {
      console.error('Verification error:', error);
    }

    // Check warnings
    for (const warning of result.warnings) {
      console.warn('Verification warning:', warning);
    }
  }
} catch (error) {
  console.error('Fatal error:', error);
}
```

## Testing

Run tests with:

```bash
npm test
```

Test files:
- `cache.test.ts`: Cache functionality tests
- `storage.test.ts`: Storage adapter tests
- `encryption.test.ts`: Encryption utility tests
- `revocation.test.ts`: Revocation checking tests
- `sync.test.ts`: Synchronization tests

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please visit:
https://github.com/aura-blockchain/aura-verifier-sdk/issues
