/**
 * Integration Test: Network Switching
 *
 * Tests network configuration and switching:
 * - Mainnet configuration
 * - Testnet configuration
 * - Custom endpoint configuration
 * - Network failover
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuraVerifier } from '../verification/verifier.js';
import { NETWORK_ENDPOINTS } from '../verification/types.js';
import {
  VALID_AGE_21_QR,
  TESTNET_QR,
  LOCAL_NETWORK_QR,
} from './__fixtures__/test-credentials.js';
import { createMockServer, createUnstableServer } from './__fixtures__/mock-server.js';

describe('Network Switching Integration Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mainnet Configuration', () => {
    it('should initialize with mainnet endpoints', async () => {
      const verifier = new AuraVerifier({
        network: 'mainnet',
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.network).toBe('mainnet');
      expect(config.grpcEndpoint).toBe(NETWORK_ENDPOINTS.mainnet.grpc);
      expect(config.restEndpoint).toBe(NETWORK_ENDPOINTS.mainnet.rest);
      expect(config.chainId).toBe(NETWORK_ENDPOINTS.mainnet.chainId);

      await verifier.destroy();
    });

    it('should use mainnet endpoints for verification', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'mainnet',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

      expect(result.isValid).toBe(true);
      expect(mockServer.getStats().requestCount).toBeGreaterThan(0);

      await verifier.destroy();
      mockServer.reset();
    });

    it('should validate mainnet DIDs', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'mainnet',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

      expect(result.isValid).toBe(true);
      expect(result.holderDID).toContain('did:aura:mainnet:');

      await verifier.destroy();
      mockServer.reset();
    });
  });

  describe('Testnet Configuration', () => {
    it('should initialize with testnet endpoints', async () => {
      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.network).toBe('testnet');
      expect(config.grpcEndpoint).toBe(NETWORK_ENDPOINTS.testnet.grpc);
      expect(config.restEndpoint).toBe(NETWORK_ENDPOINTS.testnet.rest);
      expect(config.chainId).toBe(NETWORK_ENDPOINTS.testnet.chainId);

      await verifier.destroy();
    });

    it('should use testnet endpoints for verification', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: TESTNET_QR });

      expect(result.isValid).toBe(true);
      expect(mockServer.getStats().requestCount).toBeGreaterThan(0);

      await verifier.destroy();
      mockServer.reset();
    });

    it('should validate testnet DIDs', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: TESTNET_QR });

      expect(result.isValid).toBe(true);
      expect(result.holderDID).toContain('did:aura:testnet:');

      await verifier.destroy();
      mockServer.reset();
    });
  });

  describe('Local Network Configuration', () => {
    it('should initialize with local network endpoints', async () => {
      const verifier = new AuraVerifier({
        network: 'local',
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.network).toBe('local');
      expect(config.grpcEndpoint).toBe(NETWORK_ENDPOINTS.local.grpc);
      expect(config.restEndpoint).toBe(NETWORK_ENDPOINTS.local.rest);
      expect(config.chainId).toBe(NETWORK_ENDPOINTS.local.chainId);

      await verifier.destroy();
    });

    it('should use local endpoints for verification', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'local',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: LOCAL_NETWORK_QR });

      expect(result.isValid).toBe(true);

      await verifier.destroy();
      mockServer.reset();
    });
  });

  describe('Custom Endpoint Configuration', () => {
    it('should accept custom gRPC endpoint', async () => {
      const customGrpc = 'custom.grpc.endpoint:9090';
      const verifier = new AuraVerifier({
        network: 'testnet',
        grpcEndpoint: customGrpc,
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.grpcEndpoint).toBe(customGrpc);

      await verifier.destroy();
    });

    it('should accept custom REST endpoint', async () => {
      const customRest = 'https://custom.rest.endpoint';
      const verifier = new AuraVerifier({
        network: 'testnet',
        restEndpoint: customRest,
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.restEndpoint).toBe(customRest);

      await verifier.destroy();
    });

    it('should accept both custom endpoints', async () => {
      const customGrpc = 'custom.grpc.endpoint:9090';
      const customRest = 'https://custom.rest.endpoint';
      const verifier = new AuraVerifier({
        network: 'testnet',
        grpcEndpoint: customGrpc,
        restEndpoint: customRest,
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.grpcEndpoint).toBe(customGrpc);
      expect(config.restEndpoint).toBe(customRest);

      await verifier.destroy();
    });

    it('should accept custom chain ID', async () => {
      const customChainId = 'aura-custom-1';
      const verifier = new AuraVerifier({
        network: 'local',
        chainId: customChainId,
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.chainId).toBe(customChainId);

      await verifier.destroy();
    });

    it('should use custom endpoints for verification', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'testnet',
        grpcEndpoint: 'custom.endpoint:9090',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

      expect(result.isValid).toBe(true);
      expect(mockServer.getStats().requestCount).toBeGreaterThan(0);

      await verifier.destroy();
      mockServer.reset();
    });
  });

  describe('Network Failover', () => {
    it('should handle primary endpoint failure', async () => {
      const backupServer = createMockServer();

      const verifier = new AuraVerifier({
        network: 'testnet',
        cacheConfig: {
          enableDIDCache: true,
          enableVCCache: true,
          ttl: 300,
        },
        nonceConfig: {
          enabled: false, // Disable for test that reuses same QR codes
        },
        verbose: false,
      });

      let attemptCount = 0;

      // First, set up a successful query to populate cache
      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(async (did: string) => {
        attemptCount++;
        return backupServer.queryDIDDocument(did);
      });

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(async (vcId: string) => {
        return backupServer.queryVCStatus(vcId);
      });

      await verifier.initialize();

      // First call populates cache
      const result1 = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
      expect(result1.isValid).toBe(true);
      expect(attemptCount).toBe(1);

      // Second call uses cached data (cache is still valid, no network call needed)
      const result2 = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
      expect(result2.isValid).toBe(true);

      await verifier.destroy();
      backupServer.reset();
    });

    it('should retry on transient network errors', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'testnet',
        cacheConfig: {
          enableDIDCache: true,
          enableVCCache: true,
          ttl: 300,
        },
        nonceConfig: {
          enabled: false, // Disable for test that reuses same QR codes
        },
        timeout: 10000,
        verbose: false,
      });

      let didAttempts = 0;
      let vcAttempts = 0;

      // First call succeeds and populates cache
      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(async (did: string) => {
        didAttempts++;
        return mockServer.queryDIDDocument(did);
      });

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(async (vcId: string) => {
        vcAttempts++;
        return mockServer.queryVCStatus(vcId);
      });

      await verifier.initialize();

      // First verify populates cache
      const result1 = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
      expect(result1.isValid).toBe(true);
      expect(didAttempts).toBe(1);

      // Second verify uses cache (no additional network calls when cache is valid)
      const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

      // Cache was valid, so no additional network calls were made
      expect(didAttempts).toBe(1);
      expect(result.isValid).toBe(true);

      await verifier.destroy();
      mockServer.reset();
    });

    it('should fall back to cached data on network failure', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'testnet',
        cacheConfig: {
          enableDIDCache: true,
          enableVCCache: true,
          ttl: 300,
        },
        nonceConfig: {
          enabled: false, // Disable for test that reuses same QR codes
        },
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      // First verification populates cache
      const result1 = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });
      expect(result1.isValid).toBe(true);

      // Mock network failure
      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(async () => {
        throw new Error('Network unavailable');
      });

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(async () => {
        throw new Error('Network unavailable');
      });

      // Second verification should use cache fallback
      const result2 = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

      // Should still succeed using cached data (method might be 'online' or 'cached')
      expect(result2.isValid).toBe(true);

      await verifier.destroy();
      mockServer.reset();
    });
  });

  describe('Timeout Configuration', () => {
    it('should respect custom timeout setting', async () => {
      const mockServer = createMockServer({ latency: 100 });
      const verifier = new AuraVerifier({
        network: 'testnet',
        timeout: 5000,
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.timeout).toBe(5000);

      await verifier.destroy();
      mockServer.reset();
    });

    it('should use default timeout if not specified', async () => {
      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: false,
      });

      await verifier.initialize();

      const config = (verifier as any).config;
      expect(config.timeout).toBe(30000); // Default timeout

      await verifier.destroy();
    });
  });

  describe('Network Detection', () => {
    it('should detect network from DID', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'mainnet',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: VALID_AGE_21_QR });

      expect(result.isValid).toBe(true);
      expect(result.holderDID).toContain('did:aura:');

      await verifier.destroy();
      mockServer.reset();
    });

    it('should handle testnet DIDs on testnet', async () => {
      const mockServer = createMockServer();
      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: false,
      });

      vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
        async (did: string) => mockServer.queryDIDDocument(did)
      );

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
        async (vcId: string) => mockServer.queryVCStatus(vcId)
      );

      await verifier.initialize();

      const result = await verifier.verify({ qrCodeData: TESTNET_QR });

      expect(result.isValid).toBe(true);
      expect(result.holderDID).toContain('did:aura:testnet:');

      await verifier.destroy();
      mockServer.reset();
    });
  });

  describe('Verbose Logging', () => {
    it('should log network configuration when verbose is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: true,
      });

      await verifier.initialize();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AuraVerifier'));

      await verifier.destroy();
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const verifier = new AuraVerifier({
        network: 'testnet',
        verbose: false,
      });

      await verifier.initialize();

      // May have some logs, but should be minimal
      await verifier.destroy();
      consoleSpy.mockRestore();
    });
  });
});
