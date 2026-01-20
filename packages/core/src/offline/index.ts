/**
 * Offline Verification and Caching Module
 *
 * Provides offline credential verification capabilities with automatic caching,
 * synchronization, and revocation checking for the Aura Verifier SDK.
 *
 * @packageDocumentation
 */

// Core cache functionality
import { CredentialCache } from './cache.js';
import { CacheSync } from './sync.js';
export { CredentialCache } from './cache.js';
export { CacheSync } from './sync.js';
export type { AuraClient } from './sync.js';

// Storage adapters
export { MemoryStorage, BrowserStorage, FileStorage, createStorageAdapter } from './storage.js';

// Encryption utilities
export {
  deriveKeyFromPassword,
  generateEncryptionKey,
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,
  isValidEncryptionKey,
  hexToKey,
  keyToHex,
} from './encryption.js';

// Revocation handling
export {
  createRevocationBitmap,
  isRevokedInBitmap,
  compressBitmap,
  decompressBitmap,
  calculateMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  hashCredentialId,
  createRevocationList,
  isRevoked,
  getRevocationStats,
  validateRevocationList,
} from './revocation.js';

// Types
export type {
  CacheConfig,
  CachedCredential,
  CacheStats,
  VerifiableCredential,
  SyncResult,
  SyncError,
  RevocationList,
  RevocationBitmap,
  MerkleProof,
  OfflineVerificationResult,
  ConnectivityStatus,
  CacheEntryMetadata,
  StorageAdapter,
  EncryptionConfig,
  EncryptedData,
  AutoSyncConfig,
} from './types.js';

/**
 * Creates a complete offline verification setup with cache and sync
 *
 * @example
 * ```typescript
 * import { createOfflineVerifier } from '@aura-network/verifier-sdk';
 *
 * const offlineVerifier = createOfflineVerifier({
 *   client: auraClient,
 *   cacheConfig: {
 *     maxAge: 3600,
 *     maxEntries: 1000,
 *     persistToDisk: true,
 *     encryptionKey: 'your-hex-encryption-key'
 *   },
 *   autoSync: {
 *     enabled: true,
 *     intervalMs: 300000, // 5 minutes
 *     syncOnStartup: true
 *   }
 * });
 *
 * // Verify credential offline
 * const result = await offlineVerifier.verify('vc-id');
 * ```
 */
export function createOfflineVerifier(options: {
  client: any; // AuraClient
  cacheConfig?: Partial<import('./types.js').CacheConfig>;
  autoSync?: {
    enabled: boolean;
    intervalMs: number;
    syncOnStartup?: boolean;
    wifiOnly?: boolean;
  };
}) {
  const cache = new CredentialCache(options.cacheConfig);
  const sync = new CacheSync(options.client, cache);

  // Start auto-sync if configured
  if (options.autoSync?.enabled) {
    sync.startAutoSync(options.autoSync.intervalMs, {
      syncOnStartup: options.autoSync.syncOnStartup,
      wifiOnly: options.autoSync.wifiOnly,
    });
  }

  return {
    cache,
    sync,

    /**
     * Verifies a credential using cache when available
     */
    async verify(vcId: string): Promise<import('./types.js').OfflineVerificationResult> {
      const timestamp = new Date();
      const errors: string[] = [];
      const warnings: string[] = [];

      try {
        // Try to get from cache first
        const cached = await cache.get(vcId);

        if (cached) {
          // Verify from cache
          const isExpired = cached.metadata.credentialExpiresAt
            ? cached.metadata.credentialExpiresAt < timestamp
            : false;

          if (isExpired) {
            errors.push('Credential has expired');
          }

          if (cached.revocationStatus.isRevoked) {
            errors.push('Credential has been revoked');
          }

          return {
            verified: errors.length === 0,
            fromCache: true,
            credential: cached,
            revocationStatus: {
              checked: true,
              isRevoked: cached.revocationStatus.isRevoked,
              lastChecked: cached.revocationStatus.checkedAt,
              source: 'cache',
            },
            errors,
            warnings,
            timestamp,
          };
        }

        // Not in cache, try online verification
        try {
          const credential = await options.client.getCredential(vcId);
          const isRevoked = await options.client.isCredentialRevoked(vcId);

          // Cache the credential
          const cachedCredential: import('./types.js').CachedCredential = {
            vcId,
            credential,
            holderDid: credential.credentialSubject.id,
            issuerDid: credential.issuer,
            revocationStatus: {
              isRevoked,
              checkedAt: timestamp,
            },
            metadata: {
              cachedAt: timestamp,
              expiresAt: new Date(
                timestamp.getTime() + (options.cacheConfig?.maxAge ?? 3600) * 1000
              ),
              issuedAt: credential.issuanceDate ? new Date(credential.issuanceDate) : undefined,
              credentialExpiresAt: credential.expirationDate
                ? new Date(credential.expirationDate)
                : undefined,
            },
          };

          await cache.set(vcId, cachedCredential);

          if (isRevoked) {
            errors.push('Credential has been revoked');
          }

          return {
            verified: errors.length === 0,
            fromCache: false,
            credential: cachedCredential,
            revocationStatus: {
              checked: true,
              isRevoked,
              lastChecked: timestamp,
              source: 'online',
            },
            errors,
            warnings,
            timestamp,
          };
        } catch (error) {
          errors.push(
            `Failed to verify credential: ${error instanceof Error ? error.message : 'Unknown error'}`
          );

          return {
            verified: false,
            fromCache: false,
            revocationStatus: {
              checked: false,
              isRevoked: false,
              source: 'not-checked',
            },
            errors,
            warnings,
            timestamp,
          };
        }
      } catch (error) {
        errors.push(
          `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        return {
          verified: false,
          fromCache: false,
          revocationStatus: {
            checked: false,
            isRevoked: false,
            source: 'not-checked',
          },
          errors,
          warnings,
          timestamp,
        };
      }
    },

    /**
     * Manually triggers synchronization
     */
    async syncNow() {
      return sync.sync();
    },

    /**
     * Gets cache statistics
     */
    async getStats() {
      return cache.getStats();
    },

    /**
     * Clears all cached data
     */
    async clearCache() {
      return cache.clear();
    },

    /**
     * Stops auto-sync and cleans up resources
     */
    async destroy() {
      sync.stopAutoSync();
    },
  };
}

// No default export to avoid import issues with ES modules
