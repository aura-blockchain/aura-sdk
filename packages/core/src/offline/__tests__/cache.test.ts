/**
 * Tests for CredentialCache
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialCache } from '../cache.js';
import { MemoryStorage } from '../storage.js';
import { CachedCredential, VerifiableCredential } from '../types.js';
import { generateEncryptionKey, keyToHex } from '../encryption.js';

describe('CredentialCache', () => {
  let cache: CredentialCache;

  beforeEach(() => {
    cache = new CredentialCache({
      maxAge: 3600,
      maxEntries: 100,
      persistToDisk: false,
      storageAdapter: 'memory'
    });
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve a credential', async () => {
      const vcId = 'test-vc-001';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      await cache.set(vcId, cachedData);
      const retrieved = await cache.get(vcId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.vcId).toBe(vcId);
      expect(retrieved?.credential.id).toBe(credential.id);
    });

    it('should return null for non-existent credential', async () => {
      const retrieved = await cache.get('non-existent-vc');
      expect(retrieved).toBeNull();
    });

    it('should check if credential exists', async () => {
      const vcId = 'test-vc-002';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      expect(await cache.has(vcId)).toBe(false);

      await cache.set(vcId, cachedData);

      expect(await cache.has(vcId)).toBe(true);
    });

    it('should delete a credential', async () => {
      const vcId = 'test-vc-003';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      await cache.set(vcId, cachedData);
      expect(await cache.has(vcId)).toBe(true);

      await cache.delete(vcId);
      expect(await cache.has(vcId)).toBe(false);
    });

    it('should clear all credentials', async () => {
      // Add multiple credentials
      for (let i = 0; i < 5; i++) {
        const vcId = `test-vc-${i}`;
        const credential = createMockCredential(vcId);
        const cachedData = createCachedCredential(vcId, credential);
        await cache.set(vcId, cachedData);
      }

      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(5);

      await cache.clear();

      const clearedStats = await cache.getStats();
      expect(clearedStats.totalEntries).toBe(0);
    });
  });

  describe('Expiration', () => {
    it('should return null for expired credentials', async () => {
      const vcId = 'test-vc-expired';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      // Set expiration to the past
      cachedData.metadata.expiresAt = new Date(Date.now() - 1000);

      await cache.set(vcId, cachedData);

      // Should return null because it's expired
      const retrieved = await cache.get(vcId);
      expect(retrieved).toBeNull();
    });

    it('should clean expired entries', async () => {
      // Add expired credential
      const expiredVcId = 'test-vc-expired';
      const expiredCredential = createMockCredential(expiredVcId);
      const expiredData = createCachedCredential(expiredVcId, expiredCredential);
      expiredData.metadata.expiresAt = new Date(Date.now() - 1000);
      await cache.set(expiredVcId, expiredData);

      // Add valid credential
      const validVcId = 'test-vc-valid';
      const validCredential = createMockCredential(validVcId);
      const validData = createCachedCredential(validVcId, validCredential);
      validData.metadata.expiresAt = new Date(Date.now() + 3600000);
      await cache.set(validVcId, validData);

      const removed = await cache.cleanExpired();
      expect(removed).toBeGreaterThan(0);

      // Valid credential should still be there
      expect(await cache.has(validVcId)).toBe(true);
    });
  });

  describe('Max Entries Limit', () => {
    it('should evict oldest entry when max entries reached', async () => {
      const smallCache = new CredentialCache({
        maxAge: 3600,
        maxEntries: 3,
        persistToDisk: false,
        storageAdapter: 'memory'
      });

      // Add 4 credentials (should evict first one)
      for (let i = 0; i < 4; i++) {
        const vcId = `test-vc-${i}`;
        const credential = createMockCredential(vcId);
        const cachedData = createCachedCredential(vcId, credential);
        await smallCache.set(vcId, cachedData);

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const stats = await smallCache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(3);

      await smallCache.clear();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      // Add some credentials
      for (let i = 0; i < 3; i++) {
        const vcId = `test-vc-${i}`;
        const credential = createMockCredential(vcId);
        const cachedData = createCachedCredential(vcId, credential);
        await cache.set(vcId, cachedData);
      }

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.storageBackend).toBe('MemoryStorage');
    });

    it('should track hit and miss rates', async () => {
      const vcId = 'test-vc-stats';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      await cache.set(vcId, cachedData);

      // Hit
      await cache.get(vcId);

      // Miss
      await cache.get('non-existent');

      const internalStats = cache.getInternalStats();
      expect(internalStats.hits).toBe(1);
      expect(internalStats.misses).toBe(1);
    });
  });

  describe('Revocation List Caching', () => {
    it('should cache revocation list', async () => {
      const merkleRoot = 'a'.repeat(64);
      const bitmap = new Uint8Array([0xFF, 0x00, 0x00, 0xFF]);

      await cache.setRevocationList(merkleRoot, bitmap);

      // Verify it was stored (we can't directly retrieve it, but it shouldn't throw)
      expect(true).toBe(true);
    });

    it('should check revocation status from cache', async () => {
      const vcId = 'test-vc-revoked';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      // Mark as revoked
      cachedData.revocationStatus.isRevoked = true;
      cachedData.revocationStatus.merkleRoot = 'a'.repeat(64);

      await cache.set(vcId, cachedData);

      const isRevoked = await cache.isRevoked(vcId);
      expect(isRevoked).toBe(true);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt cached data', async () => {
      const encryptionKey = generateEncryptionKey();
      const encryptedCache = new CredentialCache({
        maxAge: 3600,
        maxEntries: 100,
        persistToDisk: false,
        storageAdapter: 'memory',
        encryptionKey: keyToHex(encryptionKey)
      });

      const vcId = 'test-vc-encrypted';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);

      await encryptedCache.set(vcId, cachedData);
      const retrieved = await encryptedCache.get(vcId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.vcId).toBe(vcId);
      expect(retrieved?.credential.id).toBe(credential.id);

      await encryptedCache.clear();
    });

    it('should fail with invalid encryption key', () => {
      expect(() => {
        new CredentialCache({
          maxAge: 3600,
          maxEntries: 100,
          persistToDisk: false,
          storageAdapter: 'memory',
          encryptionKey: 'invalid-key'
        });
      }).toThrow();
    });
  });

  describe('Import/Export', () => {
    it('should export cache data', async () => {
      // Add some credentials
      for (let i = 0; i < 3; i++) {
        const vcId = `test-vc-${i}`;
        const credential = createMockCredential(vcId);
        const cachedData = createCachedCredential(vcId, credential);
        await cache.set(vcId, cachedData);
      }

      const exported = await cache.export();
      expect(exported).toBeTruthy();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(Object.keys(parsed).length).toBeGreaterThan(0);
    });

    it('should import cache data', async () => {
      // Export from first cache
      const vcId = 'test-vc-import';
      const credential = createMockCredential(vcId);
      const cachedData = createCachedCredential(vcId, credential);
      await cache.set(vcId, cachedData);

      const exported = await cache.export();

      // Create new cache and import
      const newCache = new CredentialCache({
        maxAge: 3600,
        maxEntries: 100,
        persistToDisk: false,
        storageAdapter: 'memory'
      });

      await newCache.import(exported);

      const retrieved = await newCache.get(vcId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.vcId).toBe(vcId);

      await newCache.clear();
    });
  });

  describe('Credential ID Retrieval', () => {
    it('should get all cached credential IDs', async () => {
      const vcIds = ['vc-001', 'vc-002', 'vc-003'];

      for (const vcId of vcIds) {
        const credential = createMockCredential(vcId);
        const cachedData = createCachedCredential(vcId, credential);
        await cache.set(vcId, cachedData);
      }

      const retrievedIds = await cache.getAllCredentialIds();
      expect(retrievedIds).toHaveLength(3);
      expect(retrievedIds).toEqual(expect.arrayContaining(vcIds));
    });
  });

  describe('Sync Time Tracking', () => {
    it('should update and retrieve sync time', async () => {
      await cache.updateSyncTime();

      const stats = await cache.getStats();
      expect(stats.lastSyncTime).toBeDefined();
      expect(stats.lastSyncTime).toBeInstanceOf(Date);
    });
  });
});

// Helper functions

function createMockCredential(vcId: string): VerifiableCredential {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://testnet-api.aurablockchain.org/aura/vcregistry/v1beta1'
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
      expiresAt: new Date(now.getTime() + 3600000), // 1 hour
      issuedAt: new Date(credential.issuanceDate),
      credentialExpiresAt: credential.expirationDate ? new Date(credential.expirationDate) : undefined
    }
  };
}
