/**
 * Tests for Encryption Utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EncryptionUtils,
  KeyRotationManager,
  encryptionUtils,
  EncryptionAlgorithm,
  KDFAlgorithm,
} from './encryption-utils.js';

describe('EncryptionUtils', () => {
  let utils: EncryptionUtils;

  beforeEach(() => {
    utils = new EncryptionUtils();
  });

  describe('generateRandomBytes', () => {
    it('should generate random bytes of specified length', () => {
      const bytes = utils.generateRandomBytes(32);
      expect(bytes).toHaveLength(32);
      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should generate different values each time', () => {
      const bytes1 = utils.generateRandomBytes(32);
      const bytes2 = utils.generateRandomBytes(32);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should reject invalid length', () => {
      expect(() => utils.generateRandomBytes(0)).toThrow();
      expect(() => utils.generateRandomBytes(-1)).toThrow();
      expect(() => utils.generateRandomBytes(3.14)).toThrow();
    });
  });

  describe('generateKey', () => {
    it('should generate 32-byte key by default', () => {
      const key = utils.generateKey();
      expect(key).toHaveLength(32);
    });

    it('should generate key of custom length', () => {
      const key = utils.generateKey(16);
      expect(key).toHaveLength(16);
    });
  });

  describe('generateRandomString', () => {
    it('should generate random string of specified length', () => {
      const str = utils.generateRandomString(20);
      expect(str).toHaveLength(20);
    });

    it('should use specified charset', () => {
      const str = utils.generateRandomString(100, '01');
      expect(str).toMatch(/^[01]+$/);
    });

    it('should generate different values each time', () => {
      const str1 = utils.generateRandomString(20);
      const str2 = utils.generateRandomString(20);
      expect(str1).not.toBe(str2);
    });
  });

  describe('deriveKey', () => {
    it('should derive key from password', () => {
      const { key, salt } = utils.deriveKey('password123');
      expect(key).toHaveLength(32);
      expect(salt).toHaveLength(32);
    });

    it('should derive same key with same password and salt', () => {
      const { key: key1, salt } = utils.deriveKey('password123');
      const { key: key2 } = utils.deriveKey('password123', { salt });
      expect(key1).toEqual(key2);
    });

    it('should derive different keys for different passwords', () => {
      const salt = utils.generateRandomBytes(32);
      const { key: key1 } = utils.deriveKey('password1', { salt });
      const { key: key2 } = utils.deriveKey('password2', { salt });
      expect(key1).not.toEqual(key2);
    });

    it('should derive different keys for different salts', () => {
      const { key: key1 } = utils.deriveKey('password123');
      const { key: key2 } = utils.deriveKey('password123');
      expect(key1).not.toEqual(key2);
    });

    it('should support custom iterations', () => {
      const { key } = utils.deriveKey('password123', { iterations: 50000 });
      expect(key).toHaveLength(32);
    });

    it('should support different algorithms', () => {
      const { key: key256 } = utils.deriveKey('password123', {
        algorithm: KDFAlgorithm.PBKDF2_SHA256,
      });
      const { key: key512 } = utils.deriveKey('password123', {
        algorithm: KDFAlgorithm.PBKDF2_SHA512,
      });

      expect(key256).toHaveLength(32);
      expect(key512).toHaveLength(32);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt string data', async () => {
      const key = utils.generateKey(32);
      const plaintext = 'sensitive data';

      const encrypted = await utils.encrypt(plaintext, key);
      expect(encrypted.algorithm).toBe(EncryptionAlgorithm.AES_256_GCM);
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.tag).toBeTruthy();

      const decrypted = await utils.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt binary data', async () => {
      const key = utils.generateKey(32);
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = await utils.encrypt(plaintext, key);
      const decrypted = await utils.decrypt(encrypted, key, { asBytes: true });

      expect(decrypted).toEqual(plaintext);
    });

    it('should fail decryption with wrong key', async () => {
      const key1 = utils.generateKey(32);
      const key2 = utils.generateKey(32);
      const plaintext = 'sensitive data';

      const encrypted = await utils.encrypt(plaintext, key1);

      await expect(utils.decrypt(encrypted, key2)).rejects.toThrow();
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const key = utils.generateKey(32);
      const plaintext = 'sensitive data';

      const encrypted = await utils.encrypt(plaintext, key);

      // Tamper with ciphertext - change multiple characters to ensure corruption
      // Convert to buffer, modify, and convert back to hex
      const bytes = Buffer.from(encrypted.ciphertext, 'hex');
      if (bytes.length > 4) {
        // XOR multiple bytes to ensure we actually corrupt the data
        bytes[0] ^= 0xff;
        bytes[1] ^= 0xff;
        bytes[2] ^= 0xff;
        bytes[3] ^= 0xff;
      }
      encrypted.ciphertext = bytes.toString('hex');

      await expect(utils.decrypt(encrypted, key)).rejects.toThrow();
    });

    it('should reject invalid key length', async () => {
      const shortKey = utils.generateKey(16);
      const plaintext = 'sensitive data';

      await expect(utils.encrypt(plaintext, shortKey)).rejects.toThrow();
    });

    it('should support custom IV', async () => {
      const key = utils.generateKey(32);
      const iv = utils.generateRandomBytes(12);
      const plaintext = 'sensitive data';

      const encrypted = await utils.encrypt(plaintext, key, { iv });
      expect(encrypted.iv).toBe(utils.bytesToHex(iv));
    });
  });

  describe('encryptWithPassword/decryptWithPassword', () => {
    it('should encrypt and decrypt with password', async () => {
      const password = 'secure-password-123';
      const plaintext = 'sensitive data';

      const encrypted = await utils.encryptWithPassword(plaintext, password);
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.kdf).toBeTruthy();

      const decrypted = await utils.decryptWithPassword(encrypted, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong password', async () => {
      const plaintext = 'sensitive data';

      const encrypted = await utils.encryptWithPassword(plaintext, 'password1');

      await expect(utils.decryptWithPassword(encrypted, 'password2')).rejects.toThrow();
    });

    it('should include KDF metadata', async () => {
      const plaintext = 'sensitive data';
      const encrypted = await utils.encryptWithPassword(plaintext, 'password', {
        iterations: 50000,
        algorithm: KDFAlgorithm.PBKDF2_SHA512,
      });

      expect(encrypted.kdf?.iterations).toBe(50000);
      expect(encrypted.kdf?.algorithm).toBe(KDFAlgorithm.PBKDF2_SHA512);
    });
  });

  describe('constantTimeEqual', () => {
    it('should return true for equal arrays', () => {
      const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
      const arr2 = new Uint8Array([1, 2, 3, 4, 5]);
      expect(utils.constantTimeEqual(arr1, arr2)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
      const arr2 = new Uint8Array([1, 2, 3, 4, 6]);
      expect(utils.constantTimeEqual(arr1, arr2)).toBe(false);
    });

    it('should return false for different lengths', () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([1, 2, 3, 4]);
      expect(utils.constantTimeEqual(arr1, arr2)).toBe(false);
    });
  });

  describe('hash', () => {
    it('should hash string data', () => {
      const hash = utils.hash('test data');
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash).toHaveLength(32); // SHA-256 produces 32 bytes
    });

    it('should hash binary data', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = utils.hash(data);
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash).toHaveLength(32);
    });

    it('should produce consistent hashes', () => {
      const hash1 = utils.hash('test data');
      const hash2 = utils.hash('test data');
      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = utils.hash('data1');
      const hash2 = utils.hash('data2');
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('hash512', () => {
    it('should hash with SHA-512', () => {
      const hash = utils.hash512('test data');
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash).toHaveLength(64); // SHA-512 produces 64 bytes
    });
  });

  describe('bytesToHex/hexToBytes', () => {
    it('should convert bytes to hex and back', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const hex = utils.bytesToHex(bytes);
      expect(hex).toBe('deadbeef');

      const converted = utils.hexToBytes(hex);
      expect(converted).toEqual(bytes);
    });

    it('should handle 0x prefix', () => {
      const bytes = utils.hexToBytes('0xdeadbeef');
      expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle empty array', () => {
      const bytes = new Uint8Array([]);
      const hex = utils.bytesToHex(bytes);
      expect(hex).toBe('');
      expect(utils.hexToBytes(hex)).toEqual(bytes);
    });
  });

  describe('bytesToBase64/base64ToBytes', () => {
    it('should convert bytes to base64 and back', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = utils.bytesToBase64(bytes);
      expect(typeof base64).toBe('string');

      const converted = utils.base64ToBytes(base64);
      expect(converted).toEqual(bytes);
    });
  });

  describe('secureWipe', () => {
    it('should wipe data from memory', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      utils.secureWipe(data);
      expect(data).toEqual(new Uint8Array([0, 0, 0, 0, 0]));
    });

    it('should handle empty array', () => {
      const data = new Uint8Array([]);
      expect(() => utils.secureWipe(data)).not.toThrow();
    });
  });
});

describe('KeyRotationManager', () => {
  it('should create with initial key', () => {
    const initialKey = new Uint8Array(32).fill(1);
    const manager = new KeyRotationManager(initialKey, 1000);

    const { key } = manager.getCurrentKey();
    expect(key).toEqual(initialKey);
  });

  it('should generate key if not provided', () => {
    const manager = new KeyRotationManager(undefined, 1000);
    const { key } = manager.getCurrentKey();
    expect(key).toHaveLength(32);
  });

  it('should rotate keys', () => {
    const manager = new KeyRotationManager(undefined, 1000);
    const { keyId: keyId1, key: key1 } = manager.getCurrentKey();

    const keyId2 = manager.rotateKey();
    const { keyId: currentKeyId, key: key2 } = manager.getCurrentKey();

    expect(keyId2).toBe(currentKeyId);
    expect(keyId1).not.toBe(keyId2);
    expect(key1).not.toEqual(key2);
  });

  it('should allow access to old keys', () => {
    const manager = new KeyRotationManager(undefined, 1000);
    const { keyId: keyId1, key: key1 } = manager.getCurrentKey();

    manager.rotateKey();

    const oldKey = manager.getKey(keyId1);
    expect(oldKey).toEqual(key1);
  });

  it('should cleanup expired keys', async () => {
    const manager = new KeyRotationManager(undefined, 100); // 100ms rotation
    const { keyId: keyId1 } = manager.getCurrentKey();

    manager.rotateKey();

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    manager.cleanup();

    expect(manager.getKey(keyId1)).toBeUndefined();
  });

  it('should track active key IDs', () => {
    const manager = new KeyRotationManager(undefined, 1000);
    const keyIds1 = manager.getActiveKeyIds();
    expect(keyIds1).toHaveLength(1);

    manager.rotateKey();
    const keyIds2 = manager.getActiveKeyIds();
    expect(keyIds2).toHaveLength(2);

    manager.rotateKey();
    const keyIds3 = manager.getActiveKeyIds();
    expect(keyIds3).toHaveLength(3);
  });

  it('should not cleanup current key', async () => {
    const manager = new KeyRotationManager(undefined, 100);
    const { keyId } = manager.getCurrentKey();

    await new Promise((resolve) => setTimeout(resolve, 150));

    manager.cleanup();

    expect(manager.getKey(keyId)).toBeDefined();
  });
});

describe('encryptionUtils', () => {
  it('should be a pre-configured instance', () => {
    expect(encryptionUtils).toBeInstanceOf(EncryptionUtils);
  });

  it('should work with default configuration', () => {
    const bytes = encryptionUtils.generateRandomBytes(16);
    expect(bytes).toHaveLength(16);
  });
});
