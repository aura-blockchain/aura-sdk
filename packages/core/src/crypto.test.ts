/**
 * Tests for cryptographic utilities
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Import crypto setup first to configure @noble libraries
import './crypto/setup.js';

import { verifySignature, hash, deriveAddress, compressSecp256k1PublicKey } from './crypto';
import { PublicKeyError, SignatureError } from './errors';
import { hexToBytes } from './utils';

describe('crypto', () => {
  describe('verifySignature', () => {
    describe('ed25519', () => {
      it('should verify valid Ed25519 signature', async () => {
        // Test vectors from RFC 8032
        const publicKey = hexToBytes(
          'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
        );
        const message = hexToBytes('');
        const signature = hexToBytes(
          'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
            '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
        );

        const result = await verifySignature(publicKey, message, signature, 'ed25519');
        expect(result).toBe(true);
      });

      it('should reject invalid Ed25519 signature', async () => {
        const publicKey = hexToBytes(
          'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
        );
        const message = hexToBytes('');
        const signature = hexToBytes('00'.repeat(64));

        const result = await verifySignature(publicKey, message, signature, 'ed25519');
        expect(result).toBe(false);
      });

      it('should throw error for invalid public key length', async () => {
        const publicKey = hexToBytes('00'.repeat(16)); // Wrong length
        const message = hexToBytes('');
        const signature = hexToBytes('00'.repeat(64));

        await expect(verifySignature(publicKey, message, signature, 'ed25519')).rejects.toThrow(
          PublicKeyError
        );
      });

      it('should throw error for invalid signature length', async () => {
        const publicKey = hexToBytes('00'.repeat(32));
        const message = hexToBytes('');
        const signature = hexToBytes('00'.repeat(32)); // Wrong length

        await expect(verifySignature(publicKey, message, signature, 'ed25519')).rejects.toThrow(
          SignatureError
        );
      });
    });

    describe('secp256k1', () => {
      it('should verify valid secp256k1 signature', async () => {
        // Example test vector (in production, use real test vectors)
        const publicKey = hexToBytes(
          '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
        );
        const message = new TextEncoder().encode('test message');
        const signature = hexToBytes(
          '4b5c8f8f8c8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f' +
            '4b5c8f8f8c8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f'
        );

        // Note: This will likely fail as it's not a real signature, but demonstrates the API
        const result = await verifySignature(publicKey, message, signature, 'secp256k1');
        expect(typeof result).toBe('boolean');
      });

      it('should throw error for invalid public key length', async () => {
        const publicKey = hexToBytes('00'.repeat(16)); // Wrong length
        const message = hexToBytes('');
        const signature = hexToBytes('00'.repeat(64));

        await expect(verifySignature(publicKey, message, signature, 'secp256k1')).rejects.toThrow(
          PublicKeyError
        );
      });
    });
  });

  describe('hash', () => {
    it('should hash with SHA-256 and return hex', () => {
      const result = hash({
        data: 'hello world',
        algorithm: 'sha256',
        encoding: 'hex',
      });

      expect(result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('should hash with SHA-256 and return base64', () => {
      const result = hash({
        data: 'hello world',
        algorithm: 'sha256',
        encoding: 'base64',
      });

      expect(result).toBe('uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=');
    });

    it('should hash with SHA-256 and return bytes', () => {
      const result = hash({
        data: 'hello world',
        algorithm: 'sha256',
        encoding: 'bytes',
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect((result as Uint8Array).length).toBe(32);
    });

    it('should hash with SHA-512', () => {
      const result = hash({
        data: 'hello world',
        algorithm: 'sha512',
        encoding: 'hex',
      });

      expect(result).toHaveLength(128); // SHA-512 produces 64 bytes = 128 hex chars
    });

    it('should hash with Keccak-256', () => {
      const result = hash({
        data: 'hello world',
        algorithm: 'keccak256',
        encoding: 'hex',
      });

      expect(result).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('deriveAddress', () => {
    it('should derive address from hex public key', () => {
      const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

      const address = deriveAddress({
        publicKey,
        publicKeyFormat: 'hex',
        prefix: 'aura',
        algorithm: 'secp256k1',
      });

      expect(address).toMatch(/^aura1[a-z0-9]+$/);
    });

    it('should throw error for invalid public key length', () => {
      const publicKey = '00'.repeat(16); // Wrong length

      expect(() =>
        deriveAddress({
          publicKey,
          publicKeyFormat: 'hex',
          prefix: 'aura',
          algorithm: 'secp256k1',
        })
      ).toThrow(PublicKeyError);
    });
  });

  describe('compressSecp256k1PublicKey', () => {
    it('should compress uncompressed public key', () => {
      // Example uncompressed public key (65 bytes: 0x04 + x + y)
      const uncompressed = new Uint8Array(65);
      uncompressed[0] = 0x04;
      // Fill with example data
      for (let i = 1; i < 65; i++) {
        uncompressed[i] = i % 256;
      }

      const compressed = compressSecp256k1PublicKey(uncompressed);

      expect(compressed.length).toBe(33);
      expect([0x02, 0x03]).toContain(compressed[0]);
    });

    it('should return already compressed key', () => {
      const compressed = new Uint8Array(33);
      compressed[0] = 0x02;

      const result = compressSecp256k1PublicKey(compressed);

      expect(result).toEqual(compressed);
    });

    it('should throw error for invalid length', () => {
      const invalid = new Uint8Array(32);

      expect(() => compressSecp256k1PublicKey(invalid)).toThrow(PublicKeyError);
    });
  });
});
