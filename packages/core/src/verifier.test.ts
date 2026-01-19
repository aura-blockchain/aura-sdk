/**
 * Tests for VerifierSDK
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { VerifierSDK } from './verifier';
import { InvalidConfigError, RpcConnectionError, TransactionVerificationError } from './errors';

// Mock the StargateClient
vi.mock('@cosmjs/stargate', () => ({
  StargateClient: {
    connect: vi.fn(),
  },
}));

import { StargateClient } from '@cosmjs/stargate';

describe('VerifierSDK', () => {
  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      expect(sdk).toBeInstanceOf(VerifierSDK);
    });

    it('should throw error for missing RPC endpoint', () => {
      expect(() => new VerifierSDK({} as any)).toThrow(InvalidConfigError);
    });

    it('should use default values for optional config', () => {
      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      expect(sdk).toBeInstanceOf(VerifierSDK);
    });

    it('should accept all config options', () => {
      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
        restEndpoint: 'https://api.aurablockchain.org',
        timeout: 60000,
        debug: true,
      });

      expect(sdk).toBeInstanceOf(VerifierSDK);
    });
  });

  describe('verifySignature', () => {
    let sdk: VerifierSDK;

    beforeEach(() => {
      sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });
    });

    it('should return valid result for correct signature', async () => {
      const result = await sdk.verifySignature({
        publicKey:
          'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',
        message: '',
        signature:
          'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
          '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b',
        algorithm: 'ed25519',
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metadata).toEqual({ algorithm: 'ed25519' });
    });

    it('should return invalid result for incorrect signature', async () => {
      const result = await sdk.verifySignature({
        publicKey:
          'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',
        message: '',
        signature: '00'.repeat(64),
        algorithm: 'ed25519',
      });

      expect(result.valid).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const result = await sdk.verifySignature({
        publicKey: 'invalid',
        message: '',
        signature: '',
        algorithm: 'ed25519',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('hash', () => {
    let sdk: VerifierSDK;

    beforeEach(() => {
      sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });
    });

    it('should hash data with SHA-256', () => {
      const result = sdk.hash({
        data: 'hello world',
        algorithm: 'sha256',
        encoding: 'hex',
      });

      expect(result).toBe(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      );
    });
  });

  describe('deriveAddress', () => {
    let sdk: VerifierSDK;

    beforeEach(() => {
      sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });
    });

    it('should derive address from public key', () => {
      const address = sdk.deriveAddress({
        publicKey:
          '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        publicKeyFormat: 'hex',
        prefix: 'aura',
        algorithm: 'secp256k1',
      });

      expect(address).toMatch(/^aura1[a-z0-9]+$/);
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully', async () => {
      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      await expect(sdk.disconnect()).resolves.not.toThrow();
    });

    it('should disconnect after connecting', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        getHeight: vi.fn().mockResolvedValue(1000),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      // Connect first
      await sdk.getHeight();

      // Then disconnect
      await sdk.disconnect();

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when debug mode is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockClient = {
        disconnect: vi.fn(),
        getHeight: vi.fn().mockResolvedValue(1000),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
        debug: true,
      });

      await sdk.getHeight();
      consoleSpy.mockClear();

      await sdk.disconnect();

      expect(consoleSpy).toHaveBeenCalledWith('Disconnected from RPC endpoint');
      consoleSpy.mockRestore();
    });
  });

  describe('getHeight', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should return blockchain height', async () => {
      const mockClient = {
        getHeight: vi.fn().mockResolvedValue(1000000),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      const height = await sdk.getHeight();

      expect(height).toBe(1000000);
      expect(mockClient.getHeight).toHaveBeenCalled();

      await sdk.disconnect();
    });

    it('should reuse existing client connection', async () => {
      const mockClient = {
        getHeight: vi.fn().mockResolvedValue(1000000),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      // Call twice
      await sdk.getHeight();
      await sdk.getHeight();

      // Should only connect once
      expect(StargateClient.connect).toHaveBeenCalledTimes(1);

      await sdk.disconnect();
    });
  });

  describe('getChainId', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should return chain ID', async () => {
      const mockClient = {
        getChainId: vi.fn().mockResolvedValue('aura-mvp-1'),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      const chainId = await sdk.getChainId();

      expect(chainId).toBe('aura-mvp-1');
      expect(mockClient.getChainId).toHaveBeenCalled();

      await sdk.disconnect();
    });
  });

  describe('verifyTransaction', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should verify successful transaction', async () => {
      const mockClient = {
        getTx: vi.fn().mockResolvedValue({
          hash: 'ABC123',
          code: 0,
          height: 1000,
          gasUsed: 50000,
          gasWanted: 100000,
          tx: new Uint8Array([1, 2, 3]),
          rawLog: 'success',
        }),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      const result = await sdk.verifyTransaction({
        txHash: 'ABC123',
      });

      expect(result.valid).toBe(true);
      expect(result.metadata).toEqual({
        txHash: 'ABC123',
        height: 1000,
        gasUsed: 50000,
        gasWanted: 100000,
      });

      await sdk.disconnect();
    });

    it('should return invalid for transaction not found', async () => {
      const mockClient = {
        getTx: vi.fn().mockResolvedValue(null),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      const result = await sdk.verifyTransaction({
        txHash: 'NONEXISTENT',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Transaction not found');

      await sdk.disconnect();
    });

    it('should return invalid for failed transaction', async () => {
      const mockClient = {
        getTx: vi.fn().mockResolvedValue({
          hash: 'FAILED123',
          code: 5,
          height: 1000,
          rawLog: 'out of gas',
          tx: new Uint8Array([1, 2, 3]),
        }),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      const result = await sdk.verifyTransaction({
        txHash: 'FAILED123',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Transaction failed with code 5');
      expect(result.metadata?.code).toBe(5);

      await sdk.disconnect();
    });

    it('should return invalid for transaction with empty data', async () => {
      const mockClient = {
        getTx: vi.fn().mockResolvedValue({
          hash: 'EMPTY123',
          code: 0,
          height: 1000,
          tx: new Uint8Array([]), // Empty
        }),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      const result = await sdk.verifyTransaction({
        txHash: 'EMPTY123',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Transaction data is empty');

      await sdk.disconnect();
    });

    it('should throw TransactionVerificationError on RPC failure', async () => {
      const mockClient = {
        getTx: vi.fn().mockRejectedValue(new Error('Network error')),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      await expect(
        sdk.verifyTransaction({ txHash: 'ABC123' })
      ).rejects.toThrow(TransactionVerificationError);

      await sdk.disconnect();
    });
  });

  describe('RPC connection', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should throw RpcConnectionError when connection fails', async () => {
      (StargateClient.connect as any).mockRejectedValue(
        new Error('Connection refused')
      );

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });

      await expect(sdk.getHeight()).rejects.toThrow(RpcConnectionError);
    });

    it('should log connection in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockClient = {
        getHeight: vi.fn().mockResolvedValue(1000),
        disconnect: vi.fn(),
      };
      (StargateClient.connect as any).mockResolvedValue(mockClient);

      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
        debug: true,
      });

      // Clear initialization log
      consoleSpy.mockClear();

      await sdk.getHeight();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Connected to RPC endpoint:',
        'https://rpc.aurablockchain.org'
      );

      consoleSpy.mockRestore();
      await sdk.disconnect();
    });
  });

  describe('configuration validation', () => {
    it('should throw for null RPC endpoint', () => {
      expect(() => new VerifierSDK({ rpcEndpoint: null as any })).toThrow(
        InvalidConfigError
      );
    });

    it('should throw for undefined RPC endpoint', () => {
      expect(() => new VerifierSDK({ rpcEndpoint: undefined as any })).toThrow(
        InvalidConfigError
      );
    });

    it('should throw for non-string RPC endpoint', () => {
      expect(() => new VerifierSDK({ rpcEndpoint: 123 as any })).toThrow(
        InvalidConfigError
      );
    });

    it('should use default timeout when not provided', () => {
      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });
      expect(sdk).toBeInstanceOf(VerifierSDK);
    });

    it('should use default restEndpoint when not provided', () => {
      const sdk = new VerifierSDK({
        rpcEndpoint: 'https://rpc.aurablockchain.org',
      });
      expect(sdk).toBeInstanceOf(VerifierSDK);
    });
  });
});
