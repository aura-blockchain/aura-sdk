/**
 * Online/offline synchronization for credential cache
 *
 * Manages synchronization of cached credentials with the Aura blockchain,
 * including revocation list updates and credential status checks.
 */

import { CredentialCache } from './cache.js';
import { SyncResult, SyncError, AutoSyncConfig, CachedCredential } from './types.js';

/**
 * Minimal AuraClient interface for synchronization
 * This should match the actual AuraClient interface from the main SDK
 */
export interface AuraClient {
  /** Gets a credential by ID from the blockchain */
  getCredential(vcId: string): Promise<any>;
  /** Checks if a credential is revoked */
  isCredentialRevoked(vcId: string): Promise<boolean>;
  /** Gets the current revocation list */
  getRevocationList(): Promise<{
    merkleRoot: string;
    bitmap: Uint8Array;
    totalCredentials: number;
    revokedCount: number;
  }>;
  /** Verifies a credential */
  verifyCredential(vcId: string): Promise<{
    verified: boolean;
    errors?: string[];
  }>;
}

/**
 * Cache synchronization manager
 */
export class CacheSync {
  private client: AuraClient;
  private cache: CredentialCache;
  private autoSyncInterval?: NodeJS.Timeout;
  private autoSyncConfig?: AutoSyncConfig;
  private isSyncing = false;
  private syncCount = 0;

  /**
   * Creates a new CacheSync instance
   * @param client - Aura blockchain client
   * @param cache - Credential cache instance
   */
  constructor(client: AuraClient, cache: CredentialCache) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * Performs full synchronization of cache with blockchain
   * @returns Synchronization result
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        credentialsSynced: 0,
        revocationListUpdated: false,
        lastSyncTime: new Date(),
        errors: [
          {
            type: 'unknown',
            message: 'Sync already in progress',
            timestamp: new Date(),
            recoverable: true,
          },
        ],
      };
    }

    this.isSyncing = true;
    const startTime = new Date();
    const errors: SyncError[] = [];
    let credentialsSynced = 0;
    let revocationListUpdated = false;
    let credentialsAdded = 0;
    let credentialsUpdated = 0;
    let credentialsRemoved = 0;
    let revocationChecks = 0;

    try {
      // Step 1: Sync revocation list
      try {
        await this.syncRevocationList();
        revocationListUpdated = true;
      } catch (error) {
        errors.push({
          type: 'revocation',
          message: `Failed to sync revocation list: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          recoverable: true,
        });
      }

      // Step 2: Get all cached credential IDs
      const cachedIds = await this.cache.getAllCredentialIds();

      // Step 3: Update cached credentials
      for (const vcId of cachedIds) {
        try {
          // Get cached credential
          const cached = await this.cache.get(vcId);
          if (!cached) {
            continue;
          }

          // Check revocation status
          const isRevoked = await this.client.isCredentialRevoked(vcId);
          revocationChecks++;

          // Update if revocation status changed
          if (isRevoked !== cached.revocationStatus.isRevoked) {
            cached.revocationStatus.isRevoked = isRevoked;
            cached.revocationStatus.checkedAt = new Date();
            await this.cache.set(vcId, cached);
            credentialsUpdated++;
          }

          credentialsSynced++;
        } catch (error) {
          errors.push({
            type: 'network',
            message: `Failed to sync credential ${vcId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            vcId,
            timestamp: new Date(),
            recoverable: true,
          });
        }
      }

      // Step 4: Update sync time
      await this.cache.updateSyncTime();

      this.syncCount++;

      return {
        success: errors.length === 0,
        credentialsSynced,
        revocationListUpdated,
        lastSyncTime: new Date(),
        errors,
        stats: {
          credentialsAdded,
          credentialsUpdated,
          credentialsRemoved,
          revocationChecks,
        },
      };
    } catch (error) {
      errors.push({
        type: 'unknown',
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        recoverable: false,
      });

      return {
        success: false,
        credentialsSynced,
        revocationListUpdated,
        lastSyncTime: new Date(),
        errors,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Syncs the revocation list from blockchain
   */
  async syncRevocationList(): Promise<void> {
    try {
      const revocationList = await this.client.getRevocationList();

      await this.cache.setRevocationList(revocationList.merkleRoot, revocationList.bitmap);
    } catch (error) {
      throw new Error(
        `Failed to sync revocation list: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Syncs specific credentials' status
   * @param vcIds - Array of credential IDs to sync
   */
  async syncCredentialStatus(vcIds: string[]): Promise<void> {
    try {
      for (const vcId of vcIds) {
        // Get cached credential
        const cached = await this.cache.get(vcId);
        if (!cached) {
          // Credential not in cache, fetch from blockchain
          try {
            const credential = await this.client.getCredential(vcId);
            const isRevoked = await this.client.isCredentialRevoked(vcId);

            // Create cached credential
            const cachedCredential: CachedCredential = {
              vcId,
              credential,
              holderDid: credential.credentialSubject.id,
              issuerDid: credential.issuer,
              revocationStatus: {
                isRevoked,
                checkedAt: new Date(),
              },
              metadata: {
                cachedAt: new Date(),
                expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour default
                issuedAt: credential.issuanceDate ? new Date(credential.issuanceDate) : undefined,
                credentialExpiresAt: credential.expirationDate
                  ? new Date(credential.expirationDate)
                  : undefined,
              },
            };

            await this.cache.set(vcId, cachedCredential);
          } catch (error) {
            throw new Error(
              `Failed to fetch credential ${vcId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        } else {
          // Update revocation status
          const isRevoked = await this.client.isCredentialRevoked(vcId);

          if (isRevoked !== cached.revocationStatus.isRevoked) {
            cached.revocationStatus.isRevoked = isRevoked;
            cached.revocationStatus.checkedAt = new Date();
            await this.cache.set(vcId, cached);
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to sync credential status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Starts automatic synchronization
   * @param intervalMs - Sync interval in milliseconds
   * @param config - Auto-sync configuration
   */
  startAutoSync(intervalMs: number, config?: Partial<AutoSyncConfig>): void {
    // Stop existing auto-sync if running
    this.stopAutoSync();

    this.autoSyncConfig = {
      enabled: true,
      intervalMs,
      wifiOnly: config?.wifiOnly ?? false,
      syncOnStartup: config?.syncOnStartup ?? true,
      maxRetries: config?.maxRetries ?? 3,
      retryBackoff: config?.retryBackoff ?? 2,
    };

    // Sync on startup if configured
    if (this.autoSyncConfig.syncOnStartup) {
      this.performAutoSync();
    }

    // Schedule periodic syncs
    this.autoSyncInterval = setInterval(() => {
      this.performAutoSync();
    }, intervalMs);
  }

  /**
   * Stops automatic synchronization
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = undefined;
    }

    if (this.autoSyncConfig) {
      this.autoSyncConfig.enabled = false;
    }
  }

  /**
   * Performs auto-sync with retry logic
   */
  private async performAutoSync(): Promise<void> {
    if (!this.autoSyncConfig?.enabled) {
      return;
    }

    const maxRetries = this.autoSyncConfig.maxRetries ?? 3;
    const retryBackoff = this.autoSyncConfig.retryBackoff ?? 2;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        // Check network connectivity if WiFi-only is enabled
        if (this.autoSyncConfig.wifiOnly && !this.isOnWiFi()) {
          return;
        }

        await this.sync();
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempt++;

        if (attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          const delay = Math.pow(retryBackoff, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Silent failure after all retries (security: no info disclosure)
    void lastError;
  }

  /**
   * Checks if device is on WiFi (browser-specific)
   */
  private isOnWiFi(): boolean {
    // Check if running in browser
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return true; // Assume WiFi in non-browser environments
    }

    const connection = (navigator as any).connection;
    if (!connection) {
      return true; // Can't determine, assume WiFi
    }

    // Check connection type
    const type = connection.effectiveType || connection.type;
    return type === 'wifi' || type === '4g' || type === 'ethernet';
  }

  /**
   * Gets auto-sync status
   */
  getAutoSyncStatus(): {
    enabled: boolean;
    intervalMs?: number;
    lastSyncCount: number;
    isSyncing: boolean;
  } {
    return {
      enabled: this.autoSyncConfig?.enabled ?? false,
      intervalMs: this.autoSyncConfig?.intervalMs,
      lastSyncCount: this.syncCount,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Forces an immediate sync (ignores isSyncing flag)
   */
  async forceSync(): Promise<SyncResult> {
    this.isSyncing = false;
    return this.sync();
  }

  /**
   * Syncs and caches a single credential
   * @param vcId - Credential ID to sync
   * @returns true if successful
   */
  async syncSingleCredential(vcId: string): Promise<boolean> {
    try {
      await this.syncCredentialStatus([vcId]);
      return true;
    } catch {
      // Silent failure (security: no info disclosure)
      return false;
    }
  }

  /**
   * Removes stale credentials from cache
   * @param maxAgeMs - Maximum age in milliseconds
   * @returns Number of credentials removed
   */
  async removeStaleCredentials(maxAgeMs: number): Promise<number> {
    try {
      const cachedIds = await this.cache.getAllCredentialIds();
      let removed = 0;

      for (const vcId of cachedIds) {
        const cached = await this.cache.get(vcId);
        if (!cached) {
          continue;
        }

        const age = Date.now() - cached.metadata.cachedAt.getTime();
        if (age > maxAgeMs) {
          await this.cache.delete(vcId);
          removed++;
        }
      }

      return removed;
    } catch (error) {
      throw new Error(
        `Failed to remove stale credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates all cached credentials
   * @returns Array of invalid credential IDs
   */
  async validateCachedCredentials(): Promise<string[]> {
    try {
      const cachedIds = await this.cache.getAllCredentialIds();
      const invalid: string[] = [];

      for (const vcId of cachedIds) {
        try {
          const result = await this.client.verifyCredential(vcId);
          if (!result.verified) {
            invalid.push(vcId);
          }
        } catch (error) {
          invalid.push(vcId);
        }
      }

      return invalid;
    } catch (error) {
      throw new Error(
        `Failed to validate cached credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
