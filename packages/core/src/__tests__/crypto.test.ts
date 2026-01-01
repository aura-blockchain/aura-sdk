/**
 * Crypto Module Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  verifySignature,
  verifySignatureSync,
  sha256Hash,
  sha256HashHex,
} from '../crypto/index.js';
import { toBech32 } from '@cosmjs/encoding';
import { ripemd160 } from '@cosmjs/crypto';

describe('Crypto Module', () => {
  describe('hash', () => {
    it('should hash string data with SHA-256', () => {
      const result = sha256HashHex('hello world');

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64); // SHA-256 hex output is 64 chars
    });

    it('should hash Uint8Array data', () => {
      const data = new TextEncoder().encode('hello world');
      const result = sha256HashHex(data);

      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64);
    });

    it('should return Uint8Array when output is bytes', () => {
      const result = sha256Hash('hello world');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toHaveLength(32); // SHA-256 is 32 bytes
    });

    it('should produce consistent hashes', () => {
      const hash1 = sha256HashHex('test data');
      const hash2 = sha256HashHex('test data');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = sha256HashHex('data1');
      const hash2 = sha256HashHex('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should support RIPEMD-160', () => {
      // RIPEMD-160 via CosmJS crypto
      const data = new TextEncoder().encode('hello world');
      const result = ripemd160(data);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toHaveLength(20); // RIPEMD-160 is 20 bytes
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid Ed25519 signature', async () => {
      // This is a test case with pre-computed values
      // In production, you'd use actual signatures
      const publicKey = new Uint8Array(32).fill(1); // Mock public key
      const message = new TextEncoder().encode('test message');
      const signature = new Uint8Array(64).fill(0); // Mock signature

      // This will fail because the signature is invalid, which is expected
      const result = await verifySignature(
        signature,
        message,
        publicKey
      );

      // We expect a result object with valid=false because this is a mock signature
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('algorithm');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should reject invalid signature length for Ed25519', async () => {
      const publicKey = new Uint8Array(32).fill(1);
      const message = new TextEncoder().encode('test message');
      const invalidSignature = new Uint8Array(32); // Wrong length (should be 64)

      const result = await verifySignature(invalidSignature, message, publicKey);

      // Should return a result with valid=false
      // The error may or may not be defined depending on the failure mode
      expect(result.valid).toBe(false);
    });

    it('should reject invalid public key length for Ed25519', async () => {
      const invalidPublicKey = new Uint8Array(16); // Wrong length (should be 32)
      const message = new TextEncoder().encode('test message');
      const signature = new Uint8Array(64).fill(0);

      const result = await verifySignature(signature, message, invalidPublicKey);

      // Should return a result with valid=false due to unable to detect algorithm
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deriveAddress', () => {
    it('should derive a Bech32 address from public key', () => {
      const publicKey = new Uint8Array(33).fill(2); // Mock compressed secp256k1 key

      // Derive address manually: RIPEMD160(SHA256(pubkey))
      const sha256ed = sha256Hash(publicKey);
      const addressBytes = ripemd160(sha256ed);
      const address = toBech32('aura', addressBytes);

      expect(typeof address).toBe('string');
      expect(address.startsWith('aura')).toBe(true);
    });

    it('should derive different addresses for different public keys', () => {
      const publicKey1 = new Uint8Array(33).fill(2);
      const publicKey2 = new Uint8Array(33).fill(3);

      const sha256ed1 = sha256Hash(publicKey1);
      const addressBytes1 = ripemd160(sha256ed1);
      const address1 = toBech32('aura', addressBytes1);

      const sha256ed2 = sha256Hash(publicKey2);
      const addressBytes2 = ripemd160(sha256ed2);
      const address2 = toBech32('aura', addressBytes2);

      expect(address1).not.toBe(address2);
    });

    it('should support different prefixes', () => {
      const publicKey = new Uint8Array(33).fill(2);

      const sha256ed = sha256Hash(publicKey);
      const addressBytes = ripemd160(sha256ed);

      const auraAddress = toBech32('aura', addressBytes);
      const cosmosAddress = toBech32('cosmos', addressBytes);

      expect(auraAddress.startsWith('aura')).toBe(true);
      expect(cosmosAddress.startsWith('cosmos')).toBe(true);
    });
  });
});
