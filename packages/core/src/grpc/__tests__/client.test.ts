/**
 * Tests for Aura Client
 *
 * Comprehensive test suite for AuraClient with mocked fetch responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuraClient,
  createAuraClient,
  connectAuraClient,
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  ConfigurationError,
} from '../index.js';
import type { VerificationResult, VCStatusResponse, VCRecord, DIDDocument } from '../types.js';

// Mock fetch globally
const originalFetch = global.fetch;

describe('AuraClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with mainnet configuration', () => {
      const client = new AuraClient({ network: 'mainnet' });
      const info = client.getNetworkInfo();

      expect(info.network).toBe('mainnet');
      expect(info.chain_id).toBe('aura-mvp-1');
      expect(info.rest_endpoint).toBe('https://mainnet-api.aurablockchain.org');
      expect(info.connected).toBe(false);
    });

    it('should create client with testnet configuration', () => {
      const client = new AuraClient({ network: 'testnet' });
      const info = client.getNetworkInfo();

      expect(info.network).toBe('testnet');
      expect(info.chain_id).toBe('aura-mvp-1');
      expect(info.rest_endpoint).toBe('https://testnet-api.aurablockchain.org');
    });

    it('should create client with local configuration', () => {
      // Local network requires allowInsecureLocal: true for HTTP endpoints
      const client = new AuraClient({ network: 'local', allowInsecureLocal: true });
      const info = client.getNetworkInfo();

      expect(info.network).toBe('local');
      expect(info.chain_id).toBe('aura-local-test');
      expect(info.rest_endpoint).toBe('http://localhost:1317');
    });

    it('should reject local configuration without allowInsecureLocal flag', () => {
      // Security: Local network defaults to requiring TLS unless explicitly allowed
      expect(() => {
        new AuraClient({ network: 'local' });
      }).toThrow(ConfigurationError);
    });

    it('should allow custom REST endpoint', () => {
      const client = new AuraClient({
        network: 'testnet',
        restEndpoint: 'https://custom.api.aurablockchain.org',
      });
      const info = client.getNetworkInfo();

      expect(info.rest_endpoint).toBe('https://custom.api.aurablockchain.org');
    });

    it('should throw error for invalid network', () => {
      expect(() => {
        new AuraClient({ network: 'invalid' as any });
      }).toThrow(ConfigurationError);
    });

    it('should throw error for invalid timeout', () => {
      expect(() => {
        new AuraClient({ network: 'mainnet', timeout: -1 });
      }).toThrow(ConfigurationError);
    });

    it('should set custom timeout', () => {
      const client = new AuraClient({ network: 'mainnet', timeout: 5000 });
      expect(client).toBeDefined();
    });
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      // Mock health check response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      expect(client.isConnected()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail to connect when node is unavailable', async () => {
      // Mock failed health check
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const client = new AuraClient({ network: 'testnet' });

      await expect(client.connect()).rejects.toThrow(NodeUnavailableError);
      expect(client.isConnected()).toBe(false);
    });

    it('should not connect twice', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();
      await client.connect(); // Second call should return immediately

      // Health check should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should disconnect successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();
      await client.disconnect();

      expect(client.isConnected()).toBe(false);
    });

    it('should get connection status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const status = client.getConnectionStatus();
      expect(status.connected).toBe(true);
      expect(status.network).toBe('testnet');
      expect(status.endpoint).toBe('https://testnet-api.aurablockchain.org');
      expect(status.last_connected).toBeDefined();
    });
  });

  describe('verifyPresentation', () => {
    it('should verify presentation successfully', async () => {
      const mockResult: VerificationResult = {
        verified: true,
        presentation_id: 'pres_123',
        holder_did: 'did:aura:holder123',
        credentials: [
          {
            vc_id: 'vc_123',
            valid: true,
            issuer_did: 'did:aura:issuer123',
            issued_at: 1234567890,
            expires_at: 0,
            revoked: false,
            errors: [],
          },
        ],
        disclosed_attributes: {
          full_name: 'John Doe',
          age: 30,
        },
        verified_at: Date.now(),
        errors: [],
        warnings: [],
      };

      // Mock health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      // Mock verify presentation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockResult, status: 200 }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const result = await client.verifyPresentation('qr_data_base64');

      expect(result.verified).toBe(true);
      expect(result.holder_did).toBe('did:aura:holder123');
      expect(result.credentials).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when not connected', async () => {
      const client = new AuraClient({ network: 'testnet' });

      await expect(client.verifyPresentation('qr_data')).rejects.toThrow(NetworkError);
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Invalid presentation data',
            code: 400,
          },
          status: 400,
        }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      await expect(client.verifyPresentation('invalid_data')).rejects.toThrow(APIError);
    });
  });

  describe('checkVCStatus', () => {
    it('should check VC status successfully', async () => {
      const mockStatus: VCStatusResponse = {
        vc_id: 'vc_123',
        exists: true,
        revoked: false,
        expired: false,
        vc_record: {
          vc_id: 'vc_123',
          holder_did: 'did:aura:holder123',
          issuer_did: 'did:aura:issuer123',
          data_hash: 'hash123',
          issued_at: 1234567890,
          expires_at: 0,
          revoked: false,
          revoked_at: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockStatus, status: 200 }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const status = await client.checkVCStatus('vc_123');

      expect(status.exists).toBe(true);
      expect(status.revoked).toBe(false);
      expect(status.vc_id).toBe('vc_123');
    });

    it('should handle non-existent VC', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: { message: 'VC not found' },
          status: 404,
        }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const status = await client.checkVCStatus('vc_nonexistent');

      expect(status.exists).toBe(false);
      expect(status.vc_id).toBe('vc_nonexistent');
    });
  });

  describe('batchCheckVCStatus', () => {
    it('should batch check multiple VCs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      // Mock three VC status responses
      for (let i = 1; i <= 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              vc_id: `vc_${i}`,
              exists: true,
              revoked: false,
              expired: false,
            },
            status: 200,
          }),
        });
      }

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const results = await client.batchCheckVCStatus(['vc_1', 'vc_2', 'vc_3']);

      expect(results.size).toBe(3);
      expect(results.get('vc_1')?.exists).toBe(true);
      expect(results.get('vc_2')?.exists).toBe(true);
      expect(results.get('vc_3')?.exists).toBe(true);
    });

    it('should return empty map for empty input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const results = await client.batchCheckVCStatus([]);

      expect(results.size).toBe(0);
    });
  });

  describe('resolveDID', () => {
    it('should resolve DID document successfully', async () => {
      const mockDIDDoc: DIDDocument = {
        id: 'did:aura:test123',
        verificationMethod: [
          {
            id: 'did:aura:test123#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:aura:test123',
            publicKeyMultibase: 'z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
          },
        ],
        authentication: ['did:aura:test123#key-1'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            did_document: mockDIDDoc,
            metadata: {},
          },
          status: 200,
        }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const didDoc = await client.resolveDID('did:aura:test123');

      expect(didDoc.id).toBe('did:aura:test123');
      expect(didDoc.verificationMethod).toHaveLength(1);
    });
  });

  describe('getVC', () => {
    it('should get VC record successfully', async () => {
      const mockVC: VCRecord = {
        vc_id: 'vc_123',
        holder_did: 'did:aura:holder123',
        issuer_did: 'did:aura:issuer123',
        data_hash: 'hash123',
        issued_at: 1234567890,
        expires_at: 0,
        revoked: false,
        revoked_at: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: { vc: mockVC },
          status: 200,
        }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const vc = await client.getVC('vc_123');

      expect(vc).not.toBeNull();
      expect(vc?.vc_id).toBe('vc_123');
    });

    it('should return null for non-existent VC', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: { message: 'VC not found' },
          status: 404,
        }),
      });

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      const vc = await client.getVC('vc_nonexistent');

      expect(vc).toBeNull();
    });
  });

  describe('Helper functions', () => {
    it('should create client with createAuraClient', () => {
      const client = createAuraClient('testnet');
      expect(client).toBeInstanceOf(AuraClient);
      expect(client.getNetworkInfo().network).toBe('testnet');
    });

    it('should connect client with connectAuraClient', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      const client = await connectAuraClient('testnet');
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      // Simulate timeout by listening to the AbortSignal
      mockFetch.mockImplementationOnce(
        (_url: string, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            // Listen for abort signal
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const client = new AuraClient({ network: 'testnet', timeout: 100 });
      await client.connect();

      // This should timeout
      await expect(client.checkVCStatus('vc_123')).rejects.toThrow();
    });

    it('should handle network connection errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const client = new AuraClient({ network: 'testnet' });
      await client.connect();

      await expect(client.checkVCStatus('vc_123')).rejects.toThrow(NetworkError);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ syncing: false }),
      });

      // First attempt: 503 (retryable)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({
          error: { message: 'Service temporarily unavailable' },
          status: 503,
        }),
      });

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            vc_id: 'vc_123',
            exists: true,
            revoked: false,
            expired: false,
          },
          status: 200,
        }),
      });

      const client = new AuraClient({
        network: 'testnet',
        retryConfig: {
          maxAttempts: 2,
          initialDelay: 10, // Short delay for testing
        },
      });
      await client.connect();

      const status = await client.checkVCStatus('vc_123');

      expect(status.exists).toBe(true);
      // Should have called fetch 3 times: health check + first attempt + retry
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
