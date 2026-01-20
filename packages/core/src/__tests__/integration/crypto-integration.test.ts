/**
 * Integration Test: Crypto Integration
 *
 * Tests the integration of cryptographic operations:
 * - Ed25519 signature generation and verification
 * - Secp256k1 signature verification
 * - Address derivation and validation
 * - Hash verification
 * - Cross-algorithm compatibility
 */

import { describe, it, expect } from 'vitest';
import {
  verifyEd25519Signature,
  verifyEd25519SignatureSync,
  isValidEd25519PublicKey,
  isValidEd25519Signature,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
} from '../../crypto/ed25519.js';
import {
  verifySecp256k1Signature,
  verifySecp256k1SignatureSync,
  isValidSecp256k1PublicKey,
  isValidSecp256k1Signature,
  compressPublicKey,
  decompressPublicKey,
  SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_SIGNATURE_LENGTH,
} from '../../crypto/secp256k1.js';
import {
  sha256Hash,
  sha256HashHex,
  doubleSha256,
  doubleSha256Hex,
  hexToUint8Array,
  uint8ArrayToHex,
  hashObject,
  hashObjectHex,
  isValidHex,
} from '../../crypto/hash.js';
import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';

describe('Crypto Integration Tests', () => {
  describe('Ed25519 Signature Operations', () => {
    it('should generate and verify Ed25519 signature', async () => {
      // Generate keypair
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      // Sign message
      const message = 'Hello, Aura!';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);

      // Verify signature
      const isValid = await verifyEd25519Signature(signature, message, publicKey);
      expect(isValid).toBe(true);
    });

    it('should verify Ed25519 signature with hex strings', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      const message = 'Test message';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);

      // Convert to hex
      const signatureHex = uint8ArrayToHex(signature);
      const publicKeyHex = uint8ArrayToHex(publicKey);

      // Verify with hex strings
      const isValid = await verifyEd25519Signature(signatureHex, message, publicKeyHex);
      expect(isValid).toBe(true);
    });

    it('should verify Ed25519 signature synchronously', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      const message = 'Sync test';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);

      const isValid = verifyEd25519SignatureSync(signature, message, publicKey);
      expect(isValid).toBe(true);
    });

    it('should verify Ed25519 signature of JSON object', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      const data = {
        v: '1.0',
        p: 'presentation_123',
        h: 'did:aura:holder',
        exp: 1234567890,
      };

      // Hash and sign object
      const dataHash = sha256Hash(JSON.stringify(data));
      const signature = await ed25519.sign(dataHash, privateKey);

      // Verify
      const isValid = await verifyEd25519Signature(signature, data, publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject invalid Ed25519 signature', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      const message = 'Original message';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);

      // Verify with different message
      const isValid = await verifyEd25519Signature(signature, 'Different message', publicKey);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', async () => {
      const privateKey1 = ed25519.utils.randomPrivateKey();
      const privateKey2 = ed25519.utils.randomPrivateKey();
      const publicKey2 = await ed25519.getPublicKey(privateKey2);

      const message = 'Test';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey1);

      // Verify with different public key
      const isValid = await verifyEd25519Signature(signature, message, publicKey2);
      expect(isValid).toBe(false);
    });

    it('should validate Ed25519 public key format', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      expect(isValidEd25519PublicKey(publicKey)).toBe(true);
      expect(isValidEd25519PublicKey(uint8ArrayToHex(publicKey))).toBe(true);

      // Invalid keys
      expect(isValidEd25519PublicKey(new Uint8Array(31))).toBe(false); // Too short
      expect(isValidEd25519PublicKey(new Uint8Array(33))).toBe(false); // Too long
      expect(isValidEd25519PublicKey('invalid')).toBe(false);
    });

    it('should validate Ed25519 signature format', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const message = 'Test';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);

      expect(isValidEd25519Signature(signature)).toBe(true);
      expect(isValidEd25519Signature(uint8ArrayToHex(signature))).toBe(true);

      // Invalid signatures
      expect(isValidEd25519Signature(new Uint8Array(63))).toBe(false); // Too short
      expect(isValidEd25519Signature(new Uint8Array(65))).toBe(false); // Too long
      expect(isValidEd25519Signature('deadbeef')).toBe(false);
    });

    it('should handle edge cases in Ed25519 verification', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      // Empty message
      const emptySignature = await ed25519.sign(new Uint8Array(0), privateKey);
      const isValid1 = await verifyEd25519Signature(emptySignature, new Uint8Array(0), publicKey);
      expect(isValid1).toBe(true);

      // Very long message
      const longMessage = 'A'.repeat(10000);
      const longSignature = await ed25519.sign(new TextEncoder().encode(longMessage), privateKey);
      const isValid2 = await verifyEd25519Signature(longSignature, longMessage, publicKey);
      expect(isValid2).toBe(true);
    });
  });

  describe('Secp256k1 Signature Operations', () => {
    it('should verify secp256k1 signature', async () => {
      // Generate keypair
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed

      // Sign message
      const message = 'Hello, secp256k1!';
      const messageHash = sha256Hash(message);
      const signature = await secp256k1.sign(messageHash, privateKey);

      // Verify signature (with auto-hashing)
      const isValid = await verifySecp256k1Signature(
        signature.toCompactRawBytes(),
        message,
        publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should verify secp256k1 signature without hashing', async () => {
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKey = secp256k1.getPublicKey(privateKey, true);

      const messageHash = sha256Hash('Test message');
      const signature = await secp256k1.sign(messageHash, privateKey);

      // Verify with pre-hashed message
      const isValid = await verifySecp256k1Signature(
        signature.toCompactRawBytes(),
        messageHash,
        publicKey,
        { hashMessage: false }
      );
      expect(isValid).toBe(true);
    });

    it('should handle compressed and uncompressed public keys', async () => {
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKeyCompressed = secp256k1.getPublicKey(privateKey, true);
      const publicKeyUncompressed = secp256k1.getPublicKey(privateKey, false);

      const message = 'Test';
      const messageHash = sha256Hash(message);
      const signature = await secp256k1.sign(messageHash, privateKey);

      // Should work with both formats
      const isValid1 = await verifySecp256k1Signature(
        signature.toCompactRawBytes(),
        message,
        publicKeyCompressed
      );
      expect(isValid1).toBe(true);

      const isValid2 = await verifySecp256k1Signature(
        signature.toCompactRawBytes(),
        message,
        publicKeyUncompressed
      );
      expect(isValid2).toBe(true);
    });

    it('should compress and decompress public keys', () => {
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKeyUncompressed = secp256k1.getPublicKey(privateKey, false);

      // Compress
      const compressed = compressPublicKey(publicKeyUncompressed);
      expect(compressed.length).toBe(SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH);

      // Decompress
      const decompressed = decompressPublicKey(compressed);
      expect(decompressed.length).toBe(SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH);

      // Should match original
      expect(uint8ArrayToHex(decompressed)).toBe(uint8ArrayToHex(publicKeyUncompressed));
    });

    it('should validate secp256k1 public key format', () => {
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKeyCompressed = secp256k1.getPublicKey(privateKey, true);
      const publicKeyUncompressed = secp256k1.getPublicKey(privateKey, false);

      expect(isValidSecp256k1PublicKey(publicKeyCompressed)).toBe(true);
      expect(isValidSecp256k1PublicKey(publicKeyUncompressed)).toBe(true);

      // Invalid keys
      expect(isValidSecp256k1PublicKey(new Uint8Array(32))).toBe(false); // Wrong length
      expect(isValidSecp256k1PublicKey('invalid')).toBe(false);
    });

    it('should validate secp256k1 signature format', () => {
      const validSignature = new Uint8Array(SECP256K1_SIGNATURE_LENGTH);
      expect(isValidSecp256k1Signature(validSignature)).toBe(true);

      // DER signature (variable length)
      const derSignature = new Uint8Array([
        0x30,
        0x44, // Sequence tag and length
        0x02,
        0x20,
        ...new Uint8Array(32), // r value
        0x02,
        0x20,
        ...new Uint8Array(32), // s value
      ]);
      expect(isValidSecp256k1Signature(derSignature)).toBe(true);

      // Invalid
      expect(isValidSecp256k1Signature(new Uint8Array(32))).toBe(false);
    });

    it('should verify secp256k1 signature synchronously', async () => {
      const privateKey = secp256k1.utils.randomPrivateKey();
      const publicKey = secp256k1.getPublicKey(privateKey, true);

      const message = 'Sync test';
      const messageHash = sha256Hash(message);
      const signature = await secp256k1.sign(messageHash, privateKey);

      const isValid = verifySecp256k1SignatureSync(
        signature.toCompactRawBytes(),
        message,
        publicKey
      );
      expect(isValid).toBe(true);
    });
  });

  describe('Hash Operations', () => {
    it('should compute SHA-256 hash from string', () => {
      const input = 'Hello, World!';
      const hash = sha256Hash(input);

      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32); // SHA-256 produces 32 bytes

      // Hash should be deterministic
      const hash2 = sha256Hash(input);
      expect(uint8ArrayToHex(hash)).toBe(uint8ArrayToHex(hash2));
    });

    it('should compute SHA-256 hash as hex string', () => {
      const input = 'Test';
      const hashHex = sha256HashHex(input);

      expect(typeof hashHex).toBe('string');
      expect(hashHex.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]+$/.test(hashHex)).toBe(true);
    });

    it('should compute double SHA-256 hash', () => {
      const input = 'Bitcoin uses double SHA-256';
      const doubleHash = doubleSha256(input);

      // Should be different from single hash
      const singleHash = sha256Hash(input);
      expect(uint8ArrayToHex(doubleHash)).not.toBe(uint8ArrayToHex(singleHash));

      // Should be same as hashing twice
      const manualDouble = sha256Hash(singleHash);
      expect(uint8ArrayToHex(doubleHash)).toBe(uint8ArrayToHex(manualDouble));
    });

    it('should compute double SHA-256 hash as hex', () => {
      const input = 'Test';
      const hashHex = doubleSha256Hex(input);

      expect(typeof hashHex).toBe('string');
      expect(hashHex.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hashHex)).toBe(true);
    });

    it('should hash JSON objects', () => {
      const obj = {
        version: '1.0',
        data: {
          name: 'Alice',
          age: 30,
        },
      };

      const hash1 = hashObject(obj);
      const hash2 = hashObject(obj);

      // Should be deterministic
      expect(uint8ArrayToHex(hash1)).toBe(uint8ArrayToHex(hash2));

      // Different objects should produce different hashes
      const obj2 = { ...obj, version: '2.0' };
      const hash3 = hashObject(obj2);
      expect(uint8ArrayToHex(hash1)).not.toBe(uint8ArrayToHex(hash3));
    });

    it('should hash objects as hex', () => {
      const obj = { test: 'value' };
      const hashHex = hashObjectHex(obj);

      expect(typeof hashHex).toBe('string');
      expect(hashHex.length).toBe(64);
      expect(isValidHex(hashHex)).toBe(true);
    });

    it('should handle different input types for hashing', () => {
      const text = 'Test data';
      const bytes = new TextEncoder().encode(text);
      const buffer = Buffer.from(text);

      const hash1 = sha256Hash(text);
      const hash2 = sha256Hash(bytes);
      const hash3 = sha256Hash(buffer);

      // All should produce same hash
      expect(uint8ArrayToHex(hash1)).toBe(uint8ArrayToHex(hash2));
      expect(uint8ArrayToHex(hash2)).toBe(uint8ArrayToHex(hash3));
    });
  });

  describe('Hex Conversion Utilities', () => {
    it('should convert hex to Uint8Array', () => {
      const hex = 'deadbeef';
      const bytes = hexToUint8Array(hex);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(4);
      expect(bytes[0]).toBe(0xde);
      expect(bytes[1]).toBe(0xad);
      expect(bytes[2]).toBe(0xbe);
      expect(bytes[3]).toBe(0xef);
    });

    it('should convert Uint8Array to hex', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const hex = uint8ArrayToHex(bytes);

      expect(hex).toBe('deadbeef');
    });

    it('should handle hex with 0x prefix', () => {
      const hex = '0xdeadbeef';
      const bytes = hexToUint8Array(hex);

      expect(bytes.length).toBe(4);
      expect(uint8ArrayToHex(bytes)).toBe('deadbeef');
    });

    it('should handle odd-length hex strings', () => {
      const hex = 'abc'; // Odd length
      const bytes = hexToUint8Array(hex);

      // Should pad with leading zero
      expect(bytes.length).toBe(2);
      expect(uint8ArrayToHex(bytes)).toBe('0abc');
    });

    it('should validate hex strings', () => {
      expect(isValidHex('deadbeef')).toBe(true);
      expect(isValidHex('0xdeadbeef')).toBe(true);
      expect(isValidHex('DEADBEEF')).toBe(true);
      expect(isValidHex('0123456789abcdef')).toBe(true);

      // Invalid
      expect(isValidHex('xyz')).toBe(false);
      expect(isValidHex('dead beef')).toBe(false); // Space
      expect(isValidHex('g00d')).toBe(false); // Invalid char
    });

    it('should validate hex with expected length', () => {
      const hex32 = 'a'.repeat(64); // 32 bytes
      expect(isValidHex(hex32, 32)).toBe(true);
      expect(isValidHex(hex32, 16)).toBe(false);

      const hex64 = 'b'.repeat(128); // 64 bytes
      expect(isValidHex(hex64, 64)).toBe(true);
      expect(isValidHex(hex64, 32)).toBe(false);
    });

    it('should roundtrip hex conversion', () => {
      const original = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        original[i] = Math.floor(Math.random() * 256);
      }

      const hex = uint8ArrayToHex(original);
      const bytes = hexToUint8Array(hex);

      expect(bytes).toEqual(original);
    });
  });

  describe('Cross-Algorithm Integration', () => {
    it('should use same hash for both Ed25519 and secp256k1', async () => {
      const message = 'Common message';
      const messageHash = sha256Hash(message);

      // Ed25519
      const ed25519PrivateKey = ed25519.utils.randomPrivateKey();
      const ed25519PublicKey = await ed25519.getPublicKey(ed25519PrivateKey);
      const ed25519Signature = await ed25519.sign(messageHash, ed25519PrivateKey);

      // Secp256k1
      const secp256k1PrivateKey = secp256k1.utils.randomPrivateKey();
      const secp256k1PublicKey = secp256k1.getPublicKey(secp256k1PrivateKey, true);
      const secp256k1Signature = await secp256k1.sign(messageHash, secp256k1PrivateKey);

      // Both should verify with same message hash
      const ed25519Valid = await verifyEd25519Signature(
        ed25519Signature,
        messageHash,
        ed25519PublicKey
      );
      const secp256k1Valid = await verifySecp256k1Signature(
        secp256k1Signature.toCompactRawBytes(),
        messageHash,
        secp256k1PublicKey,
        { hashMessage: false }
      );

      expect(ed25519Valid).toBe(true);
      expect(secp256k1Valid).toBe(true);
    });

    it('should handle QR code signature verification workflow', async () => {
      // Simulate QR code data
      const qrData = {
        v: '1.0',
        p: 'presentation_123',
        h: 'did:aura:mainnet:holder',
        vcs: ['vc_1', 'vc_2'],
        ctx: { show_age: true },
        exp: Math.floor(Date.now() / 1000) + 300,
        n: 123456,
      };

      // Hash the QR data
      const dataHash = hashObject(qrData);

      // Sign with Ed25519 (typical for Aura)
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);
      const signature = await ed25519.sign(dataHash, privateKey);

      // Verify signature
      const isValid = await verifyEd25519Signature(signature, qrData, publicKey);
      expect(isValid).toBe(true);

      // Convert to hex for storage/transmission
      const signatureHex = uint8ArrayToHex(signature);
      const publicKeyHex = uint8ArrayToHex(publicKey);

      // Verify from hex
      const isValidFromHex = await verifyEd25519Signature(signatureHex, qrData, publicKeyHex);
      expect(isValidFromHex).toBe(true);
    });

    it('should validate signature lengths across algorithms', () => {
      expect(ED25519_SIGNATURE_LENGTH).toBe(64);
      expect(SECP256K1_SIGNATURE_LENGTH).toBe(64);

      expect(ED25519_PUBLIC_KEY_LENGTH).toBe(32);
      expect(SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH).toBe(33);
      expect(SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH).toBe(65);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should verify many Ed25519 signatures efficiently', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      const iterations = 100;
      const messages = Array.from({ length: iterations }, (_, i) => `Message ${i}`);
      const signatures = await Promise.all(
        messages.map((msg) => ed25519.sign(new TextEncoder().encode(msg), privateKey))
      );

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const isValid = await verifyEd25519Signature(signatures[i]!, messages[i]!, publicKey);
        expect(isValid).toBe(true);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(10); // Should be fast
    });

    it('should hash many objects efficiently', () => {
      const iterations = 1000;
      const objects = Array.from({ length: iterations }, (_, i) => ({
        id: i,
        data: `Data ${i}`,
        timestamp: Date.now(),
      }));

      const startTime = Date.now();

      for (const obj of objects) {
        hashObject(obj);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(1); // Should be very fast
    });

    it('should handle large message hashing', () => {
      const largeMessage = 'A'.repeat(1024 * 1024); // 1MB
      const startTime = Date.now();

      const hash = sha256Hash(largeMessage);

      const duration = Date.now() - startTime;

      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
      expect(duration).toBeLessThan(500); // Should handle 1MB quickly (relaxed for CI/WSL)
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid signature gracefully', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      const invalidSignature = new Uint8Array(64); // All zeros

      const isValid = await verifyEd25519Signature(invalidSignature, 'Test', publicKey);
      expect(isValid).toBe(false);
    });

    it('should handle malformed public key', async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const message = 'Test';
      const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);

      const malformedKey = new Uint8Array(32); // All zeros

      const isValid = await verifyEd25519Signature(signature, message, malformedKey);
      expect(isValid).toBe(false);
    });

    it('should handle hex conversion errors', () => {
      expect(() => hexToUint8Array('invalid hex')).toThrow();
      expect(() => hexToUint8Array('gg')).toThrow();
    });

    it('should handle signature length mismatch', async () => {
      const publicKey = new Uint8Array(32);
      const shortSignature = new Uint8Array(32); // Too short

      const isValid = await verifyEd25519Signature(shortSignature, 'Test', publicKey);
      expect(isValid).toBe(false);
    });
  });
});
