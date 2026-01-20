/**
 * Encryption utilities for cache data protection
 *
 * Provides AES-256-GCM encryption for sensitive cached credential data
 * and key derivation from passwords using PBKDF2.
 *
 * Security: Key management follows OWASP recommendations:
 * - PBKDF2 with 310,000+ iterations (OWASP 2023)
 * - Secure key wiping after use
 * - No keys logged or exposed in errors
 */

import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { randomBytes } from '@noble/hashes/utils';
import { EncryptedData, EncryptionConfig } from './types.js';
import { safeJSONReviver } from '../utils/index.js';

/**
 * Minimum PBKDF2 iterations (OWASP 2023 recommendation for SHA-256)
 */
export const MIN_PBKDF2_ITERATIONS = 310000;

/**
 * Securely wipes a key from memory
 * Note: JavaScript doesn't guarantee memory wiping, but this is best effort
 * @param key - Key to wipe
 */
export function wipeKey(key: Uint8Array): void {
  if (!key || !(key instanceof Uint8Array)) return;

  // Overwrite with random data first, then zeros
  const random = randomBytes(key.length);
  key.set(random);
  key.fill(0);
}

/**
 * Creates a key that auto-wipes after a timeout
 * @param key - Original key
 * @param timeoutMs - Time before auto-wipe (default: 5 minutes)
 * @returns Wrapped key with auto-wipe
 */
export function createAutoWipeKey(
  key: Uint8Array,
  timeoutMs: number = 5 * 60 * 1000
): { key: Uint8Array; cancel: () => void } {
  const keyCopy = new Uint8Array(key);

  const timer = setTimeout(() => {
    wipeKey(keyCopy);
  }, timeoutMs);

  return {
    key: keyCopy,
    cancel: () => {
      clearTimeout(timer);
      wipeKey(keyCopy);
    },
  };
}

/**
 * Secure key storage interface for platform-specific implementations
 */
export interface SecureKeyStorage {
  /** Store a key securely */
  storeKey(keyId: string, key: Uint8Array): Promise<void>;
  /** Retrieve a stored key */
  retrieveKey(keyId: string): Promise<Uint8Array | null>;
  /** Delete a stored key */
  deleteKey(keyId: string): Promise<boolean>;
  /** Check if a key exists */
  hasKey(keyId: string): Promise<boolean>;
}

/**
 * Derives encryption key from password using PBKDF2
 * @param password - User password
 * @param salt - Salt for key derivation (optional, will be generated if not provided)
 * @param iterations - Number of PBKDF2 iterations (default: 100000)
 * @returns Object containing derived key and salt
 */
export function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array,
  iterations: number = MIN_PBKDF2_ITERATIONS
): { key: Uint8Array; salt: Uint8Array } {
  // Security: Enforce minimum iterations
  const actualIterations = Math.max(iterations, MIN_PBKDF2_ITERATIONS);

  try {
    // Generate salt if not provided (32 bytes for strong randomness)
    const actualSalt = salt ?? randomBytes(32);

    // Derive 32-byte key for AES-256
    const key = pbkdf2(sha256, password, actualSalt, {
      c: actualIterations,
      dkLen: 32,
    });

    return { key, salt: actualSalt };
  } catch {
    // Security: Don't expose error details
    throw new Error('Key derivation failed');
  }
}

/**
 * Generates a random encryption key
 * @returns 32-byte random key for AES-256
 */
export function generateEncryptionKey(): Uint8Array {
  return randomBytes(32);
}

/**
 * Encrypts data using AES-256-GCM
 * Note: This implementation uses Web Crypto API in browsers and requires polyfill in Node.js
 * @param data - Data to encrypt (string or Uint8Array)
 * @param key - 32-byte encryption key
 * @param aad - Optional additional authenticated data
 * @returns Encrypted data structure
 */
export async function encrypt(
  data: string | Uint8Array,
  key: Uint8Array,
  aad?: string
): Promise<EncryptedData> {
  try {
    // Validate key length
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes for AES-256');
    }

    // Convert data to Uint8Array if needed
    const plaintext = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // Generate random IV (12 bytes for GCM)
    const iv = randomBytes(12);

    // Import key for Web Crypto API
    const cryptoKey = await getCrypto().subtle.importKey(
      'raw',
      key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Prepare encryption parameters
    const encryptParams: any = {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    };

    // Add AAD if provided
    if (aad) {
      encryptParams.additionalData = new TextEncoder().encode(aad);
    }

    // Encrypt data
    const ciphertext = await getCrypto().subtle.encrypt(
      encryptParams as AesGcmParams,
      cryptoKey,
      plaintext.buffer.slice(
        plaintext.byteOffset,
        plaintext.byteOffset + plaintext.byteLength
      ) as ArrayBuffer
    );

    // Split ciphertext and auth tag
    // In GCM, the auth tag is appended to the ciphertext
    const ciphertextArray = new Uint8Array(ciphertext);
    const actualCiphertext = ciphertextArray.slice(0, -16);
    const authTag = ciphertextArray.slice(-16);

    return {
      algorithm: 'aes-256-gcm',
      iv: arrayBufferToBase64(iv),
      authTag: arrayBufferToBase64(authTag),
      ciphertext: arrayBufferToBase64(actualCiphertext),
      aad: aad,
    };
  } catch {
    // Security: Don't expose error details
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedData - Encrypted data structure
 * @param key - 32-byte decryption key
 * @returns Decrypted data as Uint8Array
 */
export async function decrypt(encryptedData: EncryptedData, key: Uint8Array): Promise<Uint8Array> {
  try {
    // Validate key length
    if (key.length !== 32) {
      throw new Error('Decryption key must be 32 bytes for AES-256');
    }

    // Validate algorithm
    if (encryptedData.algorithm !== 'aes-256-gcm') {
      throw new Error(`Unsupported encryption algorithm: ${encryptedData.algorithm}`);
    }

    // Decode base64 data
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
    const authTag = new Uint8Array(base64ToArrayBuffer(encryptedData.authTag));
    const ciphertext = new Uint8Array(base64ToArrayBuffer(encryptedData.ciphertext));

    // Combine ciphertext and auth tag
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);

    // Import key for Web Crypto API
    const cryptoKey = await getCrypto().subtle.importKey(
      'raw',
      key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Prepare decryption parameters
    const decryptParams: any = {
      name: 'AES-GCM',
      iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
      tagLength: 128,
    };

    // Add AAD if it was used during encryption
    if (encryptedData.aad) {
      decryptParams.additionalData = new TextEncoder().encode(encryptedData.aad);
    }

    // Decrypt data
    const plaintext = await getCrypto().subtle.decrypt(
      decryptParams as AesGcmParams,
      cryptoKey,
      combined.buffer.slice(
        combined.byteOffset,
        combined.byteOffset + combined.byteLength
      ) as ArrayBuffer
    );

    return new Uint8Array(plaintext);
  } catch {
    // Security: Don't expose error details
    throw new Error('Decryption failed');
  }
}

/**
 * Encrypts a string and returns decrypted string
 * @param data - String to encrypt
 * @param key - 32-byte encryption key
 * @param aad - Optional additional authenticated data
 * @returns Encrypted data structure
 */
export async function encryptString(
  data: string,
  key: Uint8Array,
  aad?: string
): Promise<EncryptedData> {
  return encrypt(data, key, aad);
}

/**
 * Decrypts data and returns as string
 * @param encryptedData - Encrypted data structure
 * @param key - 32-byte decryption key
 * @returns Decrypted string
 */
export async function decryptString(
  encryptedData: EncryptedData,
  key: Uint8Array
): Promise<string> {
  const decrypted = await decrypt(encryptedData, key);
  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts a JSON object
 * @param obj - Object to encrypt
 * @param key - 32-byte encryption key
 * @param aad - Optional additional authenticated data
 * @returns Encrypted data structure
 */
export async function encryptObject<T = unknown>(
  obj: T,
  key: Uint8Array,
  aad?: string
): Promise<EncryptedData> {
  const jsonString = JSON.stringify(obj);
  return encryptString(jsonString, key, aad);
}

/**
 * Decrypts data and parses as JSON
 * @param encryptedData - Encrypted data structure
 * @param key - 32-byte decryption key
 * @returns Decrypted and parsed object
 */
export async function decryptObject<T = unknown>(
  encryptedData: EncryptedData,
  key: Uint8Array
): Promise<T> {
  const jsonString = await decryptString(encryptedData, key);
  return JSON.parse(jsonString, safeJSONReviver) as T;
}

/**
 * Validates if an encryption key is valid
 * @param key - Key to validate
 * @returns true if key is valid
 */
export function isValidEncryptionKey(key: Uint8Array): boolean {
  return key instanceof Uint8Array && key.length === 32;
}

/**
 * Converts hex string to Uint8Array (for key input)
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array
 */
export function hexToKey(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (!/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    throw new Error('Invalid hex key. Expected 64 hex characters (32 bytes)');
  }

  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }

  return key;
}

/**
 * Converts Uint8Array key to hex string
 * @param key - Key as Uint8Array
 * @returns Hex string (without 0x prefix)
 */
export function keyToHex(key: Uint8Array): string {
  if (!isValidEncryptionKey(key)) {
    throw new Error('Invalid encryption key. Expected 32-byte Uint8Array');
  }

  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility functions

function getCrypto(): Crypto {
  if (typeof crypto !== 'undefined') {
    return crypto;
  }

  // Try to use Node.js crypto
  try {
    const nodeCrypto = require('crypto');
    if (nodeCrypto.webcrypto) {
      return nodeCrypto.webcrypto as Crypto;
    }
  } catch {
    // Ignore
  }

  throw new Error('Web Crypto API not available. Please use a modern browser or Node.js 15+');
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // Use Buffer in Node.js if available
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  // Browser fallback
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Use Buffer in Node.js if available
  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  // Browser fallback
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
