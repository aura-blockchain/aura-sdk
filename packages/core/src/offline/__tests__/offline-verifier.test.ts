/**
 * Tests for Offline Verifier Factory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOfflineVerifier } from '../index.js';
import { CachedCredential } from '../types.js';

// Mock client for testing
function createMockClient(overrides: Record<string, unknown> = {}) {
  return {
    getCredential: vi.fn().mockResolvedValue({
      id: 'vc-123',
      type: ['VerifiableCredential'],
      issuer: 'did:aura:mainnet:issuer',
      issuanceDate: '2024-01-01T00:00:00Z',
      expirationDate: '2025-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:aura:mainnet:holder',
        name: 'John Doe'
      }
    }),
    isCredentialRevoked: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

// Helper to create mock cached credential
function createMockCachedCredential(overrides: Partial<CachedCredential> = {}): CachedCredential {
  const now = new Date();
  return {
    vcId: 'vc-123',
    credential: {
      id: 'vc-123',
      type: ['VerifiableCredential'],
      issuer: 'did:aura:mainnet:issuer',
      issuanceDate: '2024-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:aura:mainnet:holder',
        name: 'John Doe'
      }
    },
    holderDid: 'did:aura:mainnet:holder',
    issuerDid: 'did:aura:mainnet:issuer',
    revocationStatus: {
      isRevoked: false,
      checkedAt: now,
    },
    metadata: {
      cachedAt: now,
      expiresAt: new Date(now.getTime() + 3600000),
      issuedAt: new Date('2024-01-01'),
      credentialExpiresAt: new Date('2025-01-01'),
    },
    ...overrides,
  };
}

describe('createOfflineVerifier', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should create verifier with cache and sync', () => {
      const verifier = createOfflineVerifier({ client: mockClient });

      expect(verifier).toBeDefined();
      expect(verifier.cache).toBeDefined();
      expect(verifier.sync).toBeDefined();
      expect(typeof verifier.verify).toBe('function');
      expect(typeof verifier.syncNow).toBe('function');
      expect(typeof verifier.getStats).toBe('function');
      expect(typeof verifier.clearCache).toBe('function');
      expect(typeof verifier.destroy).toBe('function');

      verifier.destroy();
    });

    it('should accept custom cache config', () => {
      const verifier = createOfflineVerifier({
        client: mockClient,
        cacheConfig: {
          maxAge: 7200,
          maxEntries: 500,
        },
      });

      expect(verifier.cache).toBeDefined();
      verifier.destroy();
    });

    it('should not start auto-sync when not configured', () => {
      const verifier = createOfflineVerifier({ client: mockClient });
      // Should not throw or start any timers
      expect(verifier.sync).toBeDefined();
      verifier.destroy();
    });

    it('should start auto-sync when enabled', () => {
      const verifier = createOfflineVerifier({
        client: mockClient,
        autoSync: {
          enabled: true,
          intervalMs: 60000,
        },
      });

      expect(verifier.sync).toBeDefined();
      verifier.destroy();
    });

    it('should start auto-sync with startup sync option', () => {
      const verifier = createOfflineVerifier({
        client: mockClient,
        autoSync: {
          enabled: true,
          intervalMs: 60000,
          syncOnStartup: true,
        },
      });

      expect(verifier.sync).toBeDefined();
      verifier.destroy();
    });

    it('should start auto-sync with wifi-only option', () => {
      const verifier = createOfflineVerifier({
        client: mockClient,
        autoSync: {
          enabled: true,
          intervalMs: 60000,
          wifiOnly: true,
        },
      });

      expect(verifier.sync).toBeDefined();
      verifier.destroy();
    });
  });

  describe('verify', () => {
    it('should verify credential not in cache (online)', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      const result = await verifier.verify('vc-123');

      expect(result.verified).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(result.revocationStatus.source).toBe('online');
      expect(result.revocationStatus.checked).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.getCredential).toHaveBeenCalledWith('vc-123');
      expect(mockClient.isCredentialRevoked).toHaveBeenCalledWith('vc-123');

      await verifier.destroy();
    });

    it('should cache credential after online verification', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      await verifier.verify('vc-123');

      // Second call should come from cache
      mockClient.getCredential.mockClear();
      mockClient.isCredentialRevoked.mockClear();

      const result = await verifier.verify('vc-123');

      expect(result.fromCache).toBe(true);
      expect(mockClient.getCredential).not.toHaveBeenCalled();
      expect(mockClient.isCredentialRevoked).not.toHaveBeenCalled();

      await verifier.destroy();
    });

    it('should return error for revoked credential (online)', async () => {
      vi.useRealTimers();
      mockClient.isCredentialRevoked.mockResolvedValue(true);
      const verifier = createOfflineVerifier({ client: mockClient });

      const result = await verifier.verify('vc-123');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential has been revoked');
      expect(result.revocationStatus.isRevoked).toBe(true);

      await verifier.destroy();
    });

    it('should verify credential from cache with future expiration', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      // Pre-populate cache with credential that has future expiration
      const futureExp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      const cachedCred = createMockCachedCredential({
        vcId: 'vc-456',
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          issuedAt: new Date('2024-01-01'),
          credentialExpiresAt: futureExp,
        },
      });
      await verifier.cache.set('vc-456', cachedCred);

      const result = await verifier.verify('vc-456');

      expect(result.verified).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.revocationStatus.source).toBe('cache');
      expect(mockClient.getCredential).not.toHaveBeenCalled();

      await verifier.destroy();
    });

    it('should detect expired credential in cache', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      // Pre-populate cache with expired credential
      const expiredCredential = createMockCachedCredential({
        vcId: 'vc-expired',
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          issuedAt: new Date('2024-01-01'),
          credentialExpiresAt: new Date('2020-01-01'), // Expired
        },
      });
      await verifier.cache.set('vc-expired', expiredCredential);

      const result = await verifier.verify('vc-expired');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential has expired');

      await verifier.destroy();
    });

    it('should detect revoked credential in cache', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      // Pre-populate cache with revoked credential
      const revokedCredential = createMockCachedCredential({
        vcId: 'vc-revoked',
        revocationStatus: {
          isRevoked: true,
          checkedAt: new Date(),
        },
      });
      await verifier.cache.set('vc-revoked', revokedCredential);

      const result = await verifier.verify('vc-revoked');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential has been revoked');

      await verifier.destroy();
    });

    it('should handle client error gracefully', async () => {
      vi.useRealTimers();
      mockClient.getCredential.mockRejectedValue(new Error('Network error'));
      const verifier = createOfflineVerifier({ client: mockClient });

      const result = await verifier.verify('vc-123');

      expect(result.verified).toBe(false);
      expect(result.fromCache).toBe(false);
      expect(result.errors[0]).toContain('Failed to verify credential');
      expect(result.errors[0]).toContain('Network error');
      expect(result.revocationStatus.checked).toBe(false);

      await verifier.destroy();
    });

    it('should handle non-Error exception gracefully', async () => {
      vi.useRealTimers();
      mockClient.getCredential.mockRejectedValue('String error');
      const verifier = createOfflineVerifier({ client: mockClient });

      const result = await verifier.verify('vc-123');

      expect(result.verified).toBe(false);
      expect(result.errors[0]).toContain('Unknown error');

      await verifier.destroy();
    });

    it('should use default maxAge for cache expiration', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      await verifier.verify('vc-123');
      const cached = await verifier.cache.get('vc-123');

      expect(cached).toBeDefined();
      // Default maxAge is 3600 seconds
      const expectedExpiry = cached!.metadata.cachedAt.getTime() + 3600 * 1000;
      expect(cached!.metadata.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -2);

      await verifier.destroy();
    });

    it('should use custom maxAge for cache expiration', async () => {
      vi.useRealTimers();
      const customMaxAge = 7200;
      const verifier = createOfflineVerifier({
        client: mockClient,
        cacheConfig: { maxAge: customMaxAge },
      });

      await verifier.verify('vc-123');
      const cached = await verifier.cache.get('vc-123');

      const expectedExpiry = cached!.metadata.cachedAt.getTime() + customMaxAge * 1000;
      expect(cached!.metadata.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -2);

      await verifier.destroy();
    });

    it('should handle credential without expiration date', async () => {
      vi.useRealTimers();
      mockClient.getCredential.mockResolvedValue({
        id: 'vc-no-expiry',
        type: ['VerifiableCredential'],
        issuer: 'did:aura:mainnet:issuer',
        credentialSubject: { id: 'did:aura:mainnet:holder' },
        // No expirationDate
      });

      const verifier = createOfflineVerifier({ client: mockClient });
      const result = await verifier.verify('vc-no-expiry');

      expect(result.verified).toBe(true);
      await verifier.destroy();
    });

    it('should handle credential without issuance date', async () => {
      vi.useRealTimers();
      mockClient.getCredential.mockResolvedValue({
        id: 'vc-no-issued',
        type: ['VerifiableCredential'],
        issuer: 'did:aura:mainnet:issuer',
        credentialSubject: { id: 'did:aura:mainnet:holder' },
        // No issuanceDate
      });

      const verifier = createOfflineVerifier({ client: mockClient });
      const result = await verifier.verify('vc-no-issued');

      expect(result.verified).toBe(true);
      await verifier.destroy();
    });
  });

  describe('syncNow', () => {
    it('should trigger manual sync', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      const result = await verifier.syncNow();

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      await verifier.destroy();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      const stats = await verifier.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.hitRate).toBe('number');

      await verifier.destroy();
    });

    it('should track cache entries', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      // First call - cache miss, should cache the credential
      await verifier.verify('vc-123');

      const stats = await verifier.getStats();
      expect(stats.totalEntries).toBe(1);

      await verifier.destroy();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      // Populate cache
      await verifier.verify('vc-123');
      let stats = await verifier.getStats();
      expect(stats.totalEntries).toBe(1);

      // Clear cache
      await verifier.clearCache();

      stats = await verifier.getStats();
      expect(stats.totalEntries).toBe(0);

      await verifier.destroy();
    });
  });

  describe('destroy', () => {
    it('should stop auto-sync on destroy', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({
        client: mockClient,
        autoSync: {
          enabled: true,
          intervalMs: 1000,
        },
      });

      await verifier.destroy();
      // Should not throw or cause any issues
      expect(true).toBe(true);
    });

    it('should handle destroy called multiple times', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      await verifier.destroy();
      await verifier.destroy(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle credential with both expired and revoked status', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      const credential = createMockCachedCredential({
        vcId: 'vc-both',
        revocationStatus: {
          isRevoked: true,
          checkedAt: new Date(),
        },
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          issuedAt: new Date('2024-01-01'),
          credentialExpiresAt: new Date('2020-01-01'), // Expired
        },
      });
      await verifier.cache.set('vc-both', credential);

      const result = await verifier.verify('vc-both');

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential has expired');
      expect(result.errors).toContain('Credential has been revoked');

      await verifier.destroy();
    });

    it('should handle credential without expiration in metadata', async () => {
      vi.useRealTimers();
      const verifier = createOfflineVerifier({ client: mockClient });

      const credential = createMockCachedCredential({
        vcId: 'vc-no-meta-exp',
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          issuedAt: new Date('2024-01-01'),
          // No credentialExpiresAt
        },
      });
      delete (credential.metadata as any).credentialExpiresAt;
      await verifier.cache.set('vc-no-meta-exp', credential);

      const result = await verifier.verify('vc-no-meta-exp');

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);

      await verifier.destroy();
    });
  });
});
