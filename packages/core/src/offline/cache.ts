/**
 * Credential cache manager for offline verification
 *
 * Provides efficient caching of verified credentials and revocation lists
 * with automatic expiration, encryption, and persistence.
 */

import {
  CacheConfig,
  CachedCredential,
  CacheStats,
  RevocationList,
  StorageAdapter,
  EncryptionConfig,
} from './types.js';
import { createStorageAdapter } from './storage.js';
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hexToKey,
  isValidEncryptionKey,
} from './encryption.js';
import { isRevokedInBitmap } from './revocation.js';
import type { RevocationBitmap } from './types.js';
import { safeJSONReviver } from '../utils/index.js';

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 3600, // 1 hour
  maxEntries: 1000,
  persistToDisk: true,
  storageAdapter: 'memory',
};

/**
 * Credential cache manager
 */
export class CredentialCache {
  private config: CacheConfig;
  private storage: StorageAdapter;
  private encryptionKey?: Uint8Array;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  } = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * Creates a new CredentialCache instance
   * @param config - Cache configuration
   */
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize storage adapter
    this.storage = createStorageAdapter(this.config.storageAdapter, {
      prefix: 'aura_vc_',
      basePath: this.config.storagePath,
    });

    // Initialize encryption key if provided
    if (this.config.encryptionKey) {
      try {
        this.encryptionKey = hexToKey(this.config.encryptionKey);
      } catch (error) {
        throw new Error(
          `Invalid encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Stores a credential in cache
   * @param vcId - Verifiable Credential ID
   * @param data - Credential data to cache
   */
  async set(vcId: string, data: CachedCredential): Promise<void> {
    try {
      // Check max entries limit
      const keys = await this.storage.keys();
      const credentialKeys = keys.filter((k) => k.startsWith('credential:'));

      if (credentialKeys.length >= this.config.maxEntries) {
        // Remove oldest entry
        await this.evictOldest();
      }

      // Set cache time and expiration if not already set
      const now = new Date();

      // Only set cachedAt if not already set (allows pre-setting for testing)
      if (!data.metadata.cachedAt) {
        data.metadata.cachedAt = now;
      }

      // Only set expiresAt if not already set (allows pre-setting for testing)
      if (!data.metadata.expiresAt) {
        data.metadata.expiresAt = new Date(now.getTime() + this.config.maxAge * 1000);
      }

      // Serialize data
      let serialized = JSON.stringify(data);

      // Encrypt if key is provided
      if (this.encryptionKey) {
        const encrypted = await encryptObject(data, this.encryptionKey);
        serialized = JSON.stringify(encrypted);
      }

      // Store in storage
      const key = `credential:${vcId}`;
      await this.storage.set(key, serialized);

      this.stats.sets++;
    } catch (error) {
      throw new Error(
        `Failed to cache credential: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves a credential from cache
   * @param vcId - Verifiable Credential ID
   * @returns Cached credential or null if not found/expired
   */
  async get(vcId: string): Promise<CachedCredential | null> {
    try {
      const key = `credential:${vcId}`;
      const serialized = await this.storage.get(key);

      if (!serialized) {
        this.stats.misses++;
        return null;
      }

      // Decrypt if needed
      let data: CachedCredential;

      if (this.encryptionKey) {
        const encrypted = JSON.parse(serialized, safeJSONReviver);
        data = await decryptObject(encrypted, this.encryptionKey);
      } else {
        data = JSON.parse(serialized, safeJSONReviver);
      }

      // Convert date strings back to Date objects
      data.metadata.cachedAt = new Date(data.metadata.cachedAt);
      data.metadata.expiresAt = new Date(data.metadata.expiresAt);
      data.revocationStatus.checkedAt = new Date(data.revocationStatus.checkedAt);

      if (data.metadata.issuedAt) {
        data.metadata.issuedAt = new Date(data.metadata.issuedAt);
      }
      if (data.metadata.credentialExpiresAt) {
        data.metadata.credentialExpiresAt = new Date(data.metadata.credentialExpiresAt);
      }
      if (data.lastVerification) {
        data.lastVerification.timestamp = new Date(data.lastVerification.timestamp);
      }

      // Check if expired
      if (data.metadata.expiresAt < new Date()) {
        await this.delete(vcId);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return data;
    } catch (error) {
      throw new Error(
        `Failed to retrieve credential from cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if a credential exists in cache
   * @param vcId - Verifiable Credential ID
   * @returns true if credential is cached and not expired
   */
  async has(vcId: string): Promise<boolean> {
    const data = await this.get(vcId);
    return data !== null;
  }

  /**
   * Removes a credential from cache
   * @param vcId - Verifiable Credential ID
   */
  async delete(vcId: string): Promise<void> {
    try {
      const key = `credential:${vcId}`;
      await this.storage.delete(key);
      this.stats.deletes++;
    } catch (error) {
      throw new Error(
        `Failed to delete credential from cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clears all cached credentials
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.storage.keys();
      const credentialKeys = keys.filter((k) => k.startsWith('credential:'));

      for (const key of credentialKeys) {
        await this.storage.delete(key);
      }

      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const keys = await this.storage.keys();
      const credentialKeys = keys.filter((k) => k.startsWith('credential:'));

      let expiredCount = 0;
      let revokedCount = 0;
      const now = new Date();

      // Count expired and revoked entries
      for (const key of credentialKeys) {
        try {
          const vcId = key.replace('credential:', '');
          const data = await this.get(vcId);

          if (!data) {
            expiredCount++;
          } else if (data.revocationStatus.isRevoked) {
            revokedCount++;
          }
        } catch {
          // Ignore errors for individual entries
        }
      }

      // Get last sync time
      let lastSyncTime: Date | undefined;
      const syncTimeStr = await this.storage.get('meta:lastSyncTime');
      if (syncTimeStr) {
        lastSyncTime = new Date(JSON.parse(syncTimeStr, safeJSONReviver));
      }

      // Calculate hit rate
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

      // Get storage size
      const sizeBytes = await this.storage.size();

      // Get storage backend type
      const storageBackend = this.storage.constructor.name;

      return {
        totalEntries: credentialKeys.length,
        expiredEntries: expiredCount,
        revokedEntries: revokedCount,
        sizeBytes,
        hitRate,
        lastSyncTime,
        storageBackend,
      };
    } catch (error) {
      throw new Error(
        `Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stores a revocation list in cache
   * @param merkleRoot - Merkle root of the revocation tree
   * @param bitmap - Revocation bitmap data
   */
  async setRevocationList(merkleRoot: string, bitmap: Uint8Array): Promise<void> {
    try {
      const key = `revocation:${merkleRoot}`;
      const data = {
        bitmap: Array.from(bitmap), // Convert to array for JSON serialization
        updatedAt: new Date(),
      };

      let serialized = JSON.stringify(data);

      // Encrypt if key is provided
      if (this.encryptionKey) {
        const encrypted = await encryptObject(data, this.encryptionKey);
        serialized = JSON.stringify(encrypted);
      }

      await this.storage.set(key, serialized);
    } catch (error) {
      throw new Error(
        `Failed to cache revocation list: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if a credential is revoked using cached revocation list
   * @param vcId - Verifiable Credential ID
   * @returns true if revoked, false if not revoked, null if not in cache
   */
  async isRevoked(vcId: string): Promise<boolean | null> {
    try {
      // Get credential from cache
      const credential = await this.get(vcId);
      if (!credential) {
        return null;
      }

      // Use cached revocation status if available
      if (credential.revocationStatus.merkleRoot) {
        const key = `revocation:${credential.revocationStatus.merkleRoot}`;
        const serialized = await this.storage.get(key);

        if (!serialized) {
          // Revocation list not cached, return cached status
          return credential.revocationStatus.isRevoked;
        }

        // Decrypt if needed
        let data: { bitmap: number[]; updatedAt: Date };

        if (this.encryptionKey) {
          const encrypted = JSON.parse(serialized, safeJSONReviver);
          data = await decryptObject(encrypted, this.encryptionKey);
        } else {
          data = JSON.parse(serialized, safeJSONReviver);
        }

        // Convert bitmap array back to Uint8Array
        const bitmap = new Uint8Array(data.bitmap);

        // TODO: We need the credential index to check the bitmap
        // For now, return the cached status
        return credential.revocationStatus.isRevoked;
      }

      return credential.revocationStatus.isRevoked;
    } catch (error) {
      throw new Error(
        `Failed to check revocation status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates last sync time
   */
  async updateSyncTime(): Promise<void> {
    try {
      await this.storage.set('meta:lastSyncTime', JSON.stringify(new Date()));
    } catch (error) {
      throw new Error(
        `Failed to update sync time: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Removes expired entries from cache
   * @returns Number of entries removed
   */
  async cleanExpired(): Promise<number> {
    try {
      const keys = await this.storage.keys();
      const credentialKeys = keys.filter((k) => k.startsWith('credential:'));
      let removed = 0;

      for (const key of credentialKeys) {
        const vcId = key.replace('credential:', '');
        const data = await this.get(vcId);

        // get() already deletes expired entries
        if (!data) {
          removed++;
        }
      }

      return removed;
    } catch (error) {
      throw new Error(
        `Failed to clean expired entries: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Evicts the oldest entry from cache
   */
  private async evictOldest(): Promise<void> {
    try {
      const keys = await this.storage.keys();
      const credentialKeys = keys.filter((k) => k.startsWith('credential:'));

      if (credentialKeys.length === 0) {
        return;
      }

      let oldestKey: string | null = null;
      let oldestTime: Date | null = null;

      // Find oldest entry
      for (const key of credentialKeys) {
        try {
          const serialized = await this.storage.get(key);
          if (!serialized) continue;

          let data: CachedCredential;

          if (this.encryptionKey) {
            const encrypted = JSON.parse(serialized, safeJSONReviver);
            data = await decryptObject(encrypted, this.encryptionKey);
          } else {
            data = JSON.parse(serialized, safeJSONReviver);
          }

          const cachedAt = new Date(data.metadata.cachedAt);

          if (!oldestTime || cachedAt < oldestTime) {
            oldestTime = cachedAt;
            oldestKey = key;
          }
        } catch {
          // Skip invalid entries
        }
      }

      // Delete oldest entry
      if (oldestKey) {
        await this.storage.delete(oldestKey);
      }
    } catch (error) {
      throw new Error(
        `Failed to evict oldest entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets all cached credential IDs
   * @returns Array of credential IDs
   */
  async getAllCredentialIds(): Promise<string[]> {
    try {
      const keys = await this.storage.keys();
      const credentialKeys = keys.filter((k) => k.startsWith('credential:'));
      return credentialKeys.map((k) => k.replace('credential:', ''));
    } catch (error) {
      throw new Error(
        `Failed to get credential IDs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Exports cache data (for backup/migration)
   * @returns Serialized cache data
   */
  async export(): Promise<string> {
    try {
      const keys = await this.storage.keys();
      const data: Record<string, string> = {};

      for (const key of keys) {
        const value = await this.storage.get(key);
        if (value) {
          data[key] = value;
        }
      }

      return JSON.stringify(data);
    } catch (error) {
      throw new Error(
        `Failed to export cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Imports cache data (from backup/migration)
   * @param serialized - Serialized cache data
   */
  async import(serialized: string): Promise<void> {
    try {
      const data = JSON.parse(serialized, safeJSONReviver);

      for (const [key, value] of Object.entries(data)) {
        await this.storage.set(key, value as string);
      }
    } catch (error) {
      throw new Error(
        `Failed to import cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets internal statistics (for debugging)
   */
  getInternalStats() {
    return { ...this.stats };
  }
}
