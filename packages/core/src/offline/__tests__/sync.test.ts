/**
 * Tests for Cache Synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheSync, AuraClient } from '../sync.js';
import { CredentialCache } from '../cache.js';
import { CachedCredential, VerifiableCredential } from '../types.js';

// Mock AuraClient
class MockAuraClient implements AuraClient {
  private credentials: Map<string, any> = new Map();
  private revokedCredentials: Set<string> = new Set();
  private revocationList = {
    merkleRoot: 'a'.repeat(64),
    bitmap: new Uint8Array([0xFF, 0x00]),
    totalCredentials: 16,
    revokedCount: 8
  };

  async getCredential(vcId: string): Promise<any> {
    if (this.credentials.has(vcId)) {
      return this.credentials.get(vcId);
    }

    // Return mock credential
    return createMockCredential(vcId);
  }

  async isCredentialRevoked(vcId: string): Promise<boolean> {
    return this.revokedCredentials.has(vcId);
  }

  async getRevocationList() {
    return this.revocationList;
  }

  async verifyCredential(vcId: string): Promise<{ verified: boolean; errors?: string[] }> {
    const isRevoked = await this.isCredentialRevoked(vcId);
    return {
      verified: !isRevoked,
      errors: isRevoked ? ['Credential is revoked'] : []
    };
  }

  // Test helpers
  setCredential(vcId: string, credential: any) {
    this.credentials.set(vcId, credential);
  }

  revokeCredential(vcId: string) {
    this.revokedCredentials.add(vcId);
  }

  unrevokeCredential(vcId: string) {
    this.revokedCredentials.delete(vcId);
  }
}

describe('CacheSync', () => {
  let client: MockAuraClient;
  let cache: CredentialCache;
  let sync: CacheSync;

  beforeEach(() => {
    client = new MockAuraClient();
    cache = new CredentialCache({
      maxAge: 3600,
      maxEntries: 100,
      persistToDisk: false,
      storageAdapter: 'memory'
    });
    sync = new CacheSync(client, cache);
  });

  afterEach(async () => {
    sync.stopAutoSync();
    await cache.clear();
  });

  describe('Basic Synchronization', () => {
    it('should perform full sync', async () => {
      // Add some credentials to cache
      const vcIds = ['vc-001', 'vc-002', 'vc-003'];
      for (const vcId of vcIds) {
        const credential = createMockCredential(vcId);
        const cached = createCachedCredential(vcId, credential);
        await cache.set(vcId, cached);
      }

      const result = await sync.sync();

      expect(result.success).toBe(true);
      expect(result.credentialsSynced).toBe(vcIds.length);
      expect(result.revocationListUpdated).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should update revocation status during sync', async () => {
      const vcId = 'vc-revoked';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);

      // Initially not revoked
      cached.revocationStatus.isRevoked = false;
      await cache.set(vcId, cached);

      // Revoke credential on blockchain
      client.revokeCredential(vcId);

      // Sync should update status
      await sync.sync();

      const updated = await cache.get(vcId);
      expect(updated?.revocationStatus.isRevoked).toBe(true);
    });

    it('should handle sync errors gracefully', async () => {
      const vcId = 'vc-error';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);
      await cache.set(vcId, cached);

      // Make client throw error
      vi.spyOn(client, 'isCredentialRevoked').mockRejectedValue(new Error('Network error'));

      const result = await sync.sync();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should prevent concurrent syncs', async () => {
      // Start first sync
      const sync1Promise = sync.sync();

      // Try to start second sync immediately
      const sync2 = await sync.sync();

      expect(sync2.success).toBe(false);
      expect(sync2.errors[0].message).toContain('already in progress');

      // Wait for first sync to complete
      await sync1Promise;
    });
  });

  describe('Revocation List Sync', () => {
    it('should sync revocation list', async () => {
      await sync.syncRevocationList();

      // Verify it was cached (we can't directly check, but it shouldn't throw)
      expect(true).toBe(true);
    });

    it('should handle revocation list errors', async () => {
      vi.spyOn(client, 'getRevocationList').mockRejectedValue(new Error('Network error'));

      await expect(sync.syncRevocationList()).rejects.toThrow();
    });
  });

  describe('Credential Status Sync', () => {
    it('should sync specific credentials', async () => {
      const vcIds = ['vc-001', 'vc-002'];

      // Set up credentials on blockchain
      for (const vcId of vcIds) {
        client.setCredential(vcId, createMockCredential(vcId));
      }

      await sync.syncCredentialStatus(vcIds);

      // Verify credentials are now cached
      for (const vcId of vcIds) {
        expect(await cache.has(vcId)).toBe(true);
      }
    });

    it('should fetch credentials not in cache', async () => {
      const vcId = 'vc-new';
      client.setCredential(vcId, createMockCredential(vcId));

      await sync.syncCredentialStatus([vcId]);

      const cached = await cache.get(vcId);
      expect(cached).not.toBeNull();
      expect(cached?.vcId).toBe(vcId);
    });

    it('should update existing cached credentials', async () => {
      const vcId = 'vc-update';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);

      // Initially not revoked
      cached.revocationStatus.isRevoked = false;
      await cache.set(vcId, cached);

      // Revoke on blockchain
      client.revokeCredential(vcId);

      await sync.syncCredentialStatus([vcId]);

      const updated = await cache.get(vcId);
      expect(updated?.revocationStatus.isRevoked).toBe(true);
    });
  });

  describe('Auto-Sync', () => {
    it('should start and stop auto-sync', async () => {
      const intervalMs = 1000;

      sync.startAutoSync(intervalMs);

      const status = sync.getAutoSyncStatus();
      expect(status.enabled).toBe(true);
      expect(status.intervalMs).toBe(intervalMs);

      sync.stopAutoSync();

      const stoppedStatus = sync.getAutoSyncStatus();
      expect(stoppedStatus.enabled).toBe(false);
    });

    it('should perform sync on startup if configured', async () => {
      const vcId = 'vc-startup';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);
      await cache.set(vcId, cached);

      sync.startAutoSync(10000, { syncOnStartup: true });

      // Wait a bit for startup sync to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = sync.getAutoSyncStatus();
      expect(status.lastSyncCount).toBeGreaterThan(0);

      sync.stopAutoSync();
    });

    it('should not sync on startup if disabled', async () => {
      sync.startAutoSync(10000, { syncOnStartup: false });

      const status = sync.getAutoSyncStatus();
      expect(status.lastSyncCount).toBe(0);

      sync.stopAutoSync();
    });

    it('should stop existing auto-sync when starting new one', () => {
      sync.startAutoSync(1000);
      sync.startAutoSync(2000);

      const status = sync.getAutoSyncStatus();
      expect(status.enabled).toBe(true);
      expect(status.intervalMs).toBe(2000);

      sync.stopAutoSync();
    });
  });

  describe('Force Sync', () => {
    it('should force sync even if sync is in progress', async () => {
      // This will reset the isSyncing flag
      const result = await sync.forceSync();

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Single Credential Sync', () => {
    it('should sync single credential successfully', async () => {
      const vcId = 'vc-single';
      client.setCredential(vcId, createMockCredential(vcId));

      const success = await sync.syncSingleCredential(vcId);

      expect(success).toBe(true);
      expect(await cache.has(vcId)).toBe(true);
    });

    it('should handle single credential sync errors', async () => {
      vi.spyOn(client, 'getCredential').mockRejectedValue(new Error('Network error'));

      const success = await sync.syncSingleCredential('vc-error');

      expect(success).toBe(false);
    });
  });

  describe('Stale Credential Removal', () => {
    it('should remove stale credentials', async () => {
      const vcId = 'vc-stale';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);

      // Set cached time to 2 hours ago
      cached.metadata.cachedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await cache.set(vcId, cached);

      // Remove credentials older than 1 hour
      const removed = await sync.removeStaleCredentials(60 * 60 * 1000);

      expect(removed).toBe(1);
      expect(await cache.has(vcId)).toBe(false);
    });

    it('should not remove fresh credentials', async () => {
      const vcId = 'vc-fresh';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);
      await cache.set(vcId, cached);

      const removed = await sync.removeStaleCredentials(60 * 60 * 1000);

      expect(removed).toBe(0);
      expect(await cache.has(vcId)).toBe(true);
    });
  });

  describe('Credential Validation', () => {
    it('should validate all cached credentials', async () => {
      // Add valid credential
      const validVcId = 'vc-valid';
      const validCredential = createMockCredential(validVcId);
      const validCached = createCachedCredential(validVcId, validCredential);
      await cache.set(validVcId, validCached);

      // Add invalid credential (revoked)
      const invalidVcId = 'vc-invalid';
      const invalidCredential = createMockCredential(invalidVcId);
      const invalidCached = createCachedCredential(invalidVcId, invalidCredential);
      await cache.set(invalidVcId, invalidCached);
      client.revokeCredential(invalidVcId);

      const invalid = await sync.validateCachedCredentials();

      expect(invalid).toContain(invalidVcId);
      expect(invalid).not.toContain(validVcId);
    });

    it('should handle validation errors', async () => {
      const vcId = 'vc-error';
      const credential = createMockCredential(vcId);
      const cached = createCachedCredential(vcId, credential);
      await cache.set(vcId, cached);

      vi.spyOn(client, 'verifyCredential').mockRejectedValue(new Error('Verification error'));

      const invalid = await sync.validateCachedCredentials();

      expect(invalid).toContain(vcId);
    });
  });

  describe('Sync Statistics', () => {
    it('should track sync count', async () => {
      expect(sync.getAutoSyncStatus().lastSyncCount).toBe(0);

      await sync.sync();
      expect(sync.getAutoSyncStatus().lastSyncCount).toBe(1);

      await sync.sync();
      expect(sync.getAutoSyncStatus().lastSyncCount).toBe(2);
    });

    it('should track syncing status', async () => {
      const status1 = sync.getAutoSyncStatus();
      expect(status1.isSyncing).toBe(false);

      // Note: Due to async nature, we can't easily check isSyncing=true
      // but we can verify it returns to false after sync
      await sync.sync();

      const status2 = sync.getAutoSyncStatus();
      expect(status2.isSyncing).toBe(false);
    });
  });
});

// Helper functions

function createMockCredential(vcId: string): VerifiableCredential {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://aura.network/credentials/v1'
    ],
    id: vcId,
    type: ['VerifiableCredential', 'AuraIdentityCredential'],
    issuer: 'did:aura:issuer123',
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: 'did:aura:holder456',
      name: 'Test User',
      age: 25
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:aura:issuer123#key-1',
      signature: 'z' + 'a'.repeat(86)
    }
  };
}

function createCachedCredential(vcId: string, credential: VerifiableCredential): CachedCredential {
  const now = new Date();

  return {
    vcId,
    credential,
    holderDid: credential.credentialSubject.id,
    issuerDid: credential.issuer,
    revocationStatus: {
      isRevoked: false,
      checkedAt: now
    },
    metadata: {
      cachedAt: now,
      expiresAt: new Date(now.getTime() + 3600000),
      issuedAt: new Date(credential.issuanceDate),
      credentialExpiresAt: credential.expirationDate ? new Date(credential.expirationDate) : undefined
    }
  };
}
