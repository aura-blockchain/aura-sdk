/**
 * Encryption Utilities - Secure Data Protection
 *
 * This module provides cryptographic utilities for secure data encryption,
 * key derivation, and key management in the Aura Verifier SDK.
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Secure key derivation with PBKDF2
 * - Cryptographically secure random generation
 * - Key rotation support
 * - Encrypted data storage helpers
 * - Constant-time comparison for secrets
 *
 * @module security/encryption-utils
 */

import { randomBytes } from '@noble/hashes/utils';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

/**
 * Encryption algorithm types
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES-256-GCM',
  CHACHA20_POLY1305 = 'CHACHA20-POLY1305',
}

/**
 * Key derivation algorithm
 */
export enum KDFAlgorithm {
  PBKDF2_SHA256 = 'PBKDF2-SHA256',
  PBKDF2_SHA512 = 'PBKDF2-SHA512',
}

/**
 * Encrypted data container
 */
export interface EncryptedData {
  /** Encryption algorithm used */
  algorithm: EncryptionAlgorithm;

  /** Initialization vector (IV) */
  iv: string;

  /** Encrypted ciphertext */
  ciphertext: string;

  /** Authentication tag */
  tag: string;

  /** Salt used for key derivation (if applicable) */
  salt?: string;

  /** Key derivation metadata */
  kdf?: {
    algorithm: KDFAlgorithm;
    iterations: number;
  };

  /** Version for backward compatibility */
  version: number;
}

/**
 * Key derivation options
 */
export interface KeyDerivationOptions {
  /** Salt for key derivation (generated if not provided) */
  salt?: Uint8Array;

  /** Number of iterations (default: 100000 for PBKDF2) */
  iterations?: number;

  /** Key derivation algorithm */
  algorithm?: KDFAlgorithm;

  /** Derived key length in bytes */
  keyLength?: number;
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
  /** Encryption algorithm */
  algorithm?: EncryptionAlgorithm;

  /** Additional authenticated data (AAD) */
  aad?: Uint8Array;

  /** Custom IV (generated if not provided) */
  iv?: Uint8Array;
}

/**
 * Encryption utilities class
 *
 * @example
 * ```typescript
 * const encryptionUtils = new EncryptionUtils();
 *
 * // Generate a secure key
 * const key = encryptionUtils.generateKey(32);
 *
 * // Encrypt sensitive data
 * const encrypted = await encryptionUtils.encrypt('sensitive data', key);
 *
 * // Decrypt data
 * const decrypted = await encryptionUtils.decrypt(encrypted, key);
 * ```
 */
export class EncryptionUtils {
  /**
   * Generate cryptographically secure random bytes
   *
   * @param length - Number of bytes to generate
   * @returns Random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    if (length <= 0 || !Number.isInteger(length)) {
      throw new Error('Length must be a positive integer');
    }

    return randomBytes(length);
  }

  /**
   * Generate a secure encryption key
   *
   * @param length - Key length in bytes (default: 32 for AES-256)
   * @returns Random key
   */
  generateKey(length: number = 32): Uint8Array {
    return this.generateRandomBytes(length);
  }

  /**
   * Generate a secure random string
   *
   * @param length - String length
   * @param charset - Character set to use
   * @returns Random string
   */
  generateRandomString(
    length: number,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    const bytes = this.generateRandomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }

    return result;
  }

  /**
   * Derive encryption key from password using PBKDF2
   *
   * @param password - Password or passphrase
   * @param options - Key derivation options
   * @returns Derived key and salt
   */
  deriveKey(
    password: string,
    options: KeyDerivationOptions = {}
  ): { key: Uint8Array; salt: Uint8Array } {
    const salt = options.salt || this.generateRandomBytes(32);
    const iterations = options.iterations ?? 100000;
    const keyLength = options.keyLength ?? 32;
    const algorithm = options.algorithm ?? KDFAlgorithm.PBKDF2_SHA256;

    // Select hash function
    const hashFn = algorithm === KDFAlgorithm.PBKDF2_SHA512 ? sha512 : sha256;

    // Derive key using PBKDF2
    const key = pbkdf2(hashFn, password, salt, {
      c: iterations,
      dkLen: keyLength,
    });

    return { key, salt };
  }

  /**
   * Encrypt data using AES-256-GCM (via WebCrypto API)
   *
   * @param plaintext - Data to encrypt (string or bytes)
   * @param key - Encryption key (32 bytes for AES-256)
   * @param options - Encryption options
   * @returns Encrypted data container
   */
  async encrypt(
    plaintext: string | Uint8Array,
    key: Uint8Array,
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    // Validate key length
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256');
    }

    // Convert plaintext to bytes
    const plaintextBytes =
      typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext;

    // Generate IV (12 bytes for GCM)
    const iv = options.iv || this.generateRandomBytes(12);

    // Import key for WebCrypto
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt
    const encryptParams: AesGcmParams = {
      name: 'AES-GCM',
      iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
    };

    if (options.aad) {
      encryptParams.additionalData = options.aad.buffer.slice(
        options.aad.byteOffset,
        options.aad.byteOffset + options.aad.byteLength
      ) as ArrayBuffer;
    }

    const ciphertext = await crypto.subtle.encrypt(
      encryptParams,
      cryptoKey,
      plaintextBytes.buffer.slice(
        plaintextBytes.byteOffset,
        plaintextBytes.byteOffset + plaintextBytes.byteLength
      ) as ArrayBuffer
    );

    // Split ciphertext and tag (last 16 bytes)
    const ciphertextBytes = new Uint8Array(ciphertext);
    const actualCiphertext = ciphertextBytes.slice(0, -16);
    const tag = ciphertextBytes.slice(-16);

    return {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      iv: this.bytesToHex(iv),
      ciphertext: this.bytesToHex(actualCiphertext),
      tag: this.bytesToHex(tag),
      version: 1,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   *
   * @param encrypted - Encrypted data container
   * @param key - Decryption key
   * @param options - Decryption options
   * @returns Decrypted plaintext
   */
  async decrypt(
    encrypted: EncryptedData,
    key: Uint8Array,
    options: { aad?: Uint8Array; asBytes?: boolean } = {}
  ): Promise<string | Uint8Array> {
    // Validate algorithm
    if (encrypted.algorithm !== EncryptionAlgorithm.AES_256_GCM) {
      throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
    }

    // Validate key length
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256');
    }

    // Parse encrypted data
    const iv = this.hexToBytes(encrypted.iv);
    const ciphertextBytes = this.hexToBytes(encrypted.ciphertext);
    const tag = this.hexToBytes(encrypted.tag);

    // Combine ciphertext and tag
    const combined = new Uint8Array(ciphertextBytes.length + tag.length);
    combined.set(ciphertextBytes);
    combined.set(tag, ciphertextBytes.length);

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decryptParams: AesGcmParams = {
      name: 'AES-GCM',
      iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
    };

    if (options.aad) {
      decryptParams.additionalData = options.aad.buffer.slice(
        options.aad.byteOffset,
        options.aad.byteOffset + options.aad.byteLength
      ) as ArrayBuffer;
    }

    try {
      const plaintext = await crypto.subtle.decrypt(
        decryptParams,
        cryptoKey,
        combined.buffer.slice(
          combined.byteOffset,
          combined.byteOffset + combined.byteLength
        ) as ArrayBuffer
      );

      const plaintextBytes = new Uint8Array(plaintext);

      if (options.asBytes) {
        return plaintextBytes;
      }

      return new TextDecoder().decode(plaintextBytes);
    } catch (error) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }
  }

  /**
   * Encrypt data with password (combines key derivation and encryption)
   *
   * @param plaintext - Data to encrypt
   * @param password - Password for encryption
   * @param options - Key derivation and encryption options
   * @returns Encrypted data with salt
   */
  async encryptWithPassword(
    plaintext: string | Uint8Array,
    password: string,
    options: KeyDerivationOptions & EncryptionOptions = {}
  ): Promise<EncryptedData> {
    // Derive key from password
    const { key, salt } = this.deriveKey(password, options);

    // Encrypt data
    const encrypted = await this.encrypt(plaintext, key, options);

    // Add salt and KDF metadata
    encrypted.salt = this.bytesToHex(salt);
    encrypted.kdf = {
      algorithm: options.algorithm ?? KDFAlgorithm.PBKDF2_SHA256,
      iterations: options.iterations ?? 100000,
    };

    return encrypted;
  }

  /**
   * Decrypt data with password
   *
   * @param encrypted - Encrypted data with salt
   * @param password - Password for decryption
   * @param options - Decryption options
   * @returns Decrypted plaintext
   */
  async decryptWithPassword(
    encrypted: EncryptedData,
    password: string,
    options: { asBytes?: boolean; aad?: Uint8Array } = {}
  ): Promise<string | Uint8Array> {
    if (!encrypted.salt || !encrypted.kdf) {
      throw new Error('Encrypted data missing salt or KDF metadata');
    }

    // Derive key from password using stored salt
    const salt = this.hexToBytes(encrypted.salt);
    const { key } = this.deriveKey(password, {
      salt,
      iterations: encrypted.kdf.iterations,
      algorithm: encrypted.kdf.algorithm,
    });

    // Decrypt data
    return this.decrypt(encrypted, key, options);
  }

  /**
   * Constant-time comparison of two byte arrays
   * Prevents timing attacks when comparing secrets
   *
   * @param a - First byte array
   * @param b - Second byte array
   * @returns True if arrays are equal
   */
  constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * Hash data with SHA-256
   *
   * @param data - Data to hash
   * @returns Hash bytes
   */
  hash(data: string | Uint8Array): Uint8Array {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return sha256(bytes);
  }

  /**
   * Hash data with SHA-512
   *
   * @param data - Data to hash
   * @returns Hash bytes
   */
  hash512(data: string | Uint8Array): Uint8Array {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return sha512(bytes);
  }

  /**
   * Convert bytes to hex string
   */
  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to bytes
   */
  hexToBytes(hex: string): Uint8Array {
    const cleaned = hex.replace(/^0x/, '');
    const bytes = new Uint8Array(cleaned.length / 2);

    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16);
    }

    return bytes;
  }

  /**
   * Convert bytes to base64 string
   */
  bytesToBase64(bytes: Uint8Array): string {
    // Use browser's btoa if available, otherwise implement manually
    if (typeof btoa !== 'undefined') {
      const binary = String.fromCharCode(...bytes);
      return btoa(binary);
    }

    // Manual base64 encoding for Node.js
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Convert base64 string to bytes
   */
  base64ToBytes(base64: string): Uint8Array {
    // Use browser's atob if available, otherwise implement manually
    if (typeof atob !== 'undefined') {
      const binary = atob(base64);
      return new Uint8Array(Array.from(binary).map((c) => c.charCodeAt(0)));
    }

    // Manual base64 decoding for Node.js
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  /**
   * Securely wipe sensitive data from memory
   * Note: This is best-effort and may not work in all JavaScript engines
   *
   * @param data - Data to wipe
   */
  secureWipe(data: Uint8Array): void {
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        data[i] = 0;
      }
    }
  }
}

/**
 * Global encryption utilities instance
 */
export const encryptionUtils = new EncryptionUtils();

/**
 * Key rotation manager
 */
export class KeyRotationManager {
  private keys: Map<string, { key: Uint8Array; createdAt: number; expiresAt?: number }> = new Map();
  private currentKeyId: string;

  constructor(
    initialKey?: Uint8Array,
    private rotationIntervalMs: number = 86400000 // 24 hours
  ) {
    const keyId = this.generateKeyId();
    this.currentKeyId = keyId;

    if (initialKey) {
      this.keys.set(keyId, {
        key: initialKey,
        createdAt: Date.now(),
      });
    } else {
      this.rotateKey();
    }
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return `key-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get current encryption key
   */
  getCurrentKey(): { keyId: string; key: Uint8Array } {
    const keyData = this.keys.get(this.currentKeyId);

    if (!keyData) {
      throw new Error('No current key available');
    }

    return {
      keyId: this.currentKeyId,
      key: keyData.key,
    };
  }

  /**
   * Get key by ID (for decryption of old data)
   */
  getKey(keyId: string): Uint8Array | undefined {
    return this.keys.get(keyId)?.key;
  }

  /**
   * Rotate to a new key
   */
  rotateKey(): string {
    const utils = new EncryptionUtils();
    const newKey = utils.generateKey(32);
    const newKeyId = this.generateKeyId();

    // Mark old key with expiration
    const oldKeyData = this.keys.get(this.currentKeyId);
    if (oldKeyData) {
      oldKeyData.expiresAt = Date.now() + this.rotationIntervalMs;
    }

    // Add new key
    this.keys.set(newKeyId, {
      key: newKey,
      createdAt: Date.now(),
    });

    this.currentKeyId = newKeyId;

    return newKeyId;
  }

  /**
   * Cleanup expired keys
   */
  cleanup(): void {
    const now = Date.now();

    for (const [keyId, keyData] of this.keys.entries()) {
      if (keyData.expiresAt && keyData.expiresAt < now && keyId !== this.currentKeyId) {
        // Securely wipe key before deletion
        const utils = new EncryptionUtils();
        utils.secureWipe(keyData.key);
        this.keys.delete(keyId);
      }
    }
  }

  /**
   * Get all active key IDs
   */
  getActiveKeyIds(): string[] {
    return Array.from(this.keys.keys());
  }
}
