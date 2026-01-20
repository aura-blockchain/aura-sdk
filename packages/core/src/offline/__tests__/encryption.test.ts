/**
 * Tests for Encryption Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  deriveKeyFromPassword,
  generateEncryptionKey,
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,
  isValidEncryptionKey,
  hexToKey,
  keyToHex,
} from '../encryption.js';

describe('Key Generation and Derivation', () => {
  it('should generate a valid encryption key', () => {
    const key = generateEncryptionKey();

    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
    expect(isValidEncryptionKey(key)).toBe(true);
  });

  it('should generate different keys each time', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();

    expect(key1).not.toEqual(key2);
  });

  it('should derive key from password', () => {
    const password = 'my-secure-password';
    const result = deriveKeyFromPassword(password);

    expect(result.key).toBeInstanceOf(Uint8Array);
    expect(result.key.length).toBe(32);
    expect(result.salt).toBeInstanceOf(Uint8Array);
    expect(result.salt.length).toBe(32);
  });

  it('should derive same key with same password and salt', () => {
    const password = 'my-secure-password';
    const result1 = deriveKeyFromPassword(password);
    const result2 = deriveKeyFromPassword(password, result1.salt);

    expect(result2.key).toEqual(result1.key);
  });

  it('should derive different keys with different passwords', () => {
    const password1 = 'password1';
    const password2 = 'password2';

    const result1 = deriveKeyFromPassword(password1);
    const result2 = deriveKeyFromPassword(password2);

    expect(result1.key).not.toEqual(result2.key);
  });

  it('should validate encryption keys', () => {
    const validKey = generateEncryptionKey();
    expect(isValidEncryptionKey(validKey)).toBe(true);

    const invalidKey1 = new Uint8Array(16); // Too short
    expect(isValidEncryptionKey(invalidKey1)).toBe(false);

    const invalidKey2 = new Uint8Array(64); // Too long
    expect(isValidEncryptionKey(invalidKey2)).toBe(false);
  });
});

describe('Hex Key Conversion', () => {
  it('should convert key to hex and back', () => {
    const key = generateEncryptionKey();
    const hex = keyToHex(key);

    expect(typeof hex).toBe('string');
    expect(hex.length).toBe(64); // 32 bytes = 64 hex chars
    expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);

    const converted = hexToKey(hex);
    expect(converted).toEqual(key);
  });

  it('should handle hex with 0x prefix', () => {
    const key = generateEncryptionKey();
    const hex = '0x' + keyToHex(key);

    const converted = hexToKey(hex);
    expect(converted).toEqual(key);
  });

  it('should reject invalid hex strings', () => {
    expect(() => hexToKey('invalid')).toThrow();
    expect(() => hexToKey('zz' + 'a'.repeat(62))).toThrow();
    expect(() => hexToKey('a'.repeat(32))).toThrow(); // Too short
  });

  it('should reject invalid keys in keyToHex', () => {
    const invalidKey = new Uint8Array(16);
    expect(() => keyToHex(invalidKey)).toThrow();
  });
});

describe('String Encryption/Decryption', () => {
  it('should encrypt and decrypt a string', async () => {
    const key = generateEncryptionKey();
    const plaintext = 'Hello, World!';

    const encrypted = await encryptString(plaintext, key);

    expect(encrypted.algorithm).toBe('aes-256-gcm');
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(encrypted.ciphertext).toBeTruthy();

    const decrypted = await decryptString(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt with additional authenticated data', async () => {
    const key = generateEncryptionKey();
    const plaintext = 'Sensitive data';
    const aad = 'metadata-context';

    const encrypted = await encryptString(plaintext, key, aad);
    expect(encrypted.aad).toBe(aad);

    const decrypted = await decryptString(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail decryption with wrong key', async () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    const plaintext = 'Secret message';

    const encrypted = await encryptString(plaintext, key1);

    await expect(decryptString(encrypted, key2)).rejects.toThrow();
  });

  it('should fail decryption with tampered ciphertext', async () => {
    const key = generateEncryptionKey();
    const plaintext = 'Original message';

    const encrypted = await encryptString(plaintext, key);

    // Tamper with ciphertext by replacing middle portion (more significant change)
    const ct = encrypted.ciphertext;
    const midPoint = Math.floor(ct.length / 2);
    // Flip multiple characters to guarantee authentication tag failure
    encrypted.ciphertext = ct.slice(0, midPoint - 8) + '00000000' + ct.slice(midPoint);

    await expect(decryptString(encrypted, key)).rejects.toThrow();
  });

  it('should handle empty strings', async () => {
    const key = generateEncryptionKey();
    const plaintext = '';

    const encrypted = await encryptString(plaintext, key);
    const decrypted = await decryptString(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it('should handle long strings', async () => {
    const key = generateEncryptionKey();
    const plaintext = 'A'.repeat(10000);

    const encrypted = await encryptString(plaintext, key);
    const decrypted = await decryptString(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it('should handle unicode strings', async () => {
    const key = generateEncryptionKey();
    const plaintext = '你好世界 🌍 مرحبا العالم';

    const encrypted = await encryptString(plaintext, key);
    const decrypted = await decryptString(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });
});

describe('Binary Data Encryption/Decryption', () => {
  it('should encrypt and decrypt binary data', async () => {
    const key = generateEncryptionKey();
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const encrypted = await encrypt(data, key);
    const decrypted = await decrypt(encrypted, key);

    expect(decrypted).toEqual(data);
  });

  it('should handle large binary data', async () => {
    const key = generateEncryptionKey();
    const data = new Uint8Array(100000);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }

    const encrypted = await encrypt(data, key);
    const decrypted = await decrypt(encrypted, key);

    expect(decrypted).toEqual(data);
  });
});

describe('Object Encryption/Decryption', () => {
  it('should encrypt and decrypt objects', async () => {
    const key = generateEncryptionKey();
    const obj = {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
      metadata: {
        role: 'admin',
        permissions: ['read', 'write'],
      },
    };

    const encrypted = await encryptObject(obj, key);
    const decrypted = await decryptObject(encrypted, key);

    expect(decrypted).toEqual(obj);
  });

  it('should handle nested objects', async () => {
    const key = generateEncryptionKey();
    const obj = {
      level1: {
        level2: {
          level3: {
            value: 'deep nesting',
          },
        },
      },
    };

    const encrypted = await encryptObject(obj, key);
    const decrypted = await decryptObject(encrypted, key);

    expect(decrypted).toEqual(obj);
  });

  it('should handle arrays', async () => {
    const key = generateEncryptionKey();
    const obj = {
      items: [1, 2, 3, 4, 5],
      strings: ['a', 'b', 'c'],
    };

    const encrypted = await encryptObject(obj, key);
    const decrypted = await decryptObject(encrypted, key);

    expect(decrypted).toEqual(obj);
  });

  it('should handle null and undefined', async () => {
    const key = generateEncryptionKey();
    const obj = {
      nullValue: null,
      undefinedValue: undefined,
      zeroValue: 0,
      emptyString: '',
    };

    const encrypted = await encryptObject(obj, key);
    const decrypted = await decryptObject(encrypted, key);

    // Note: undefined is not preserved in JSON
    expect(decrypted.nullValue).toBeNull();
    expect(decrypted.zeroValue).toBe(0);
    expect(decrypted.emptyString).toBe('');
  });
});

describe('Error Handling', () => {
  it('should reject encryption with invalid key length', async () => {
    const invalidKey = new Uint8Array(16); // Too short
    const data = 'test data';

    // Security: Generic error message to prevent info disclosure
    await expect(encryptString(data, invalidKey)).rejects.toThrow('Encryption failed');
  });

  it('should reject decryption with invalid key length', async () => {
    const key = generateEncryptionKey();
    const encrypted = await encryptString('test', key);

    const invalidKey = new Uint8Array(16);
    // Security: Generic error message to prevent info disclosure
    await expect(decryptString(encrypted, invalidKey)).rejects.toThrow('Decryption failed');
  });

  it('should reject decryption with unsupported algorithm', async () => {
    const key = generateEncryptionKey();
    const encrypted = await encryptString('test', key);

    // Modify algorithm
    (encrypted as any).algorithm = 'unsupported-algorithm';

    await expect(decryptString(encrypted, key)).rejects.toThrow();
  });
});

describe('Determinism and Randomness', () => {
  it('should produce different ciphertexts for same plaintext', async () => {
    const key = generateEncryptionKey();
    const plaintext = 'Same message';

    const encrypted1 = await encryptString(plaintext, key);
    const encrypted2 = await encryptString(plaintext, key);

    // IVs should be different
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    // Ciphertexts should be different
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

    // But both should decrypt to same plaintext
    const decrypted1 = await decryptString(encrypted1, key);
    const decrypted2 = await decryptString(encrypted2, key);

    expect(decrypted1).toBe(plaintext);
    expect(decrypted2).toBe(plaintext);
  });
});
