/**
 * Hash utilities for cryptographic operations
 * Provides SHA-256 hashing using @noble/hashes
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Computes SHA-256 hash of input data
 * @param data - Input data as string, Uint8Array, or Buffer
 * @returns SHA-256 hash as Uint8Array
 */
export function sha256Hash(data: string | Uint8Array | Buffer): Uint8Array {
  try {
    let bytes: Uint8Array;

    if (typeof data === 'string') {
      // Convert string to UTF-8 bytes
      bytes = new TextEncoder().encode(data);
    } else if (data instanceof Buffer) {
      // Convert Buffer to Uint8Array
      bytes = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      throw new Error('Invalid input type. Expected string, Uint8Array, or Buffer');
    }

    return sha256(bytes);
  } catch (error) {
    throw new Error(
      `Failed to compute SHA-256 hash: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Computes SHA-256 hash and returns as hex string
 * @param data - Input data as string, Uint8Array, or Buffer
 * @returns SHA-256 hash as hex string
 */
export function sha256HashHex(data: string | Uint8Array | Buffer): string {
  const hash = sha256Hash(data);
  return bytesToHex(hash);
}

/**
 * Computes double SHA-256 hash (SHA-256 of SHA-256)
 * Used in Bitcoin and some blockchain protocols
 * @param data - Input data as string, Uint8Array, or Buffer
 * @returns Double SHA-256 hash as Uint8Array
 */
export function doubleSha256(data: string | Uint8Array | Buffer): Uint8Array {
  const firstHash = sha256Hash(data);
  return sha256(firstHash);
}

/**
 * Computes double SHA-256 hash and returns as hex string
 * @param data - Input data as string, Uint8Array, or Buffer
 * @returns Double SHA-256 hash as hex string
 */
export function doubleSha256Hex(data: string | Uint8Array | Buffer): string {
  const hash = doubleSha256(data);
  return bytesToHex(hash);
}

/**
 * Converts hex string to Uint8Array
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array representation
 */
export function hexToUint8Array(hex: string): Uint8Array {
  try {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      throw new Error('Invalid hex string');
    }

    // Ensure even length
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;

    return hexToBytes(paddedHex);
  } catch (error) {
    throw new Error(
      `Failed to convert hex to Uint8Array: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Converts Uint8Array to hex string
 * @param bytes - Uint8Array to convert
 * @returns Hex string (without 0x prefix)
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  try {
    return bytesToHex(bytes);
  } catch (error) {
    throw new Error(
      `Failed to convert Uint8Array to hex: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Hashes a JSON object to SHA-256
 * Serializes the object to canonical JSON string before hashing
 * @param obj - JavaScript object to hash
 * @returns SHA-256 hash as Uint8Array
 */
export function hashObject(obj: unknown): Uint8Array {
  try {
    // Convert object to canonical JSON string
    const jsonString = JSON.stringify(obj);
    return sha256Hash(jsonString);
  } catch (error) {
    throw new Error(
      `Failed to hash object: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Hashes a JSON object to SHA-256 and returns hex string
 * @param obj - JavaScript object to hash
 * @returns SHA-256 hash as hex string
 */
export function hashObjectHex(obj: unknown): string {
  const hash = hashObject(obj);
  return bytesToHex(hash);
}

/**
 * Validates if a string is a valid hex string
 * @param hex - String to validate
 * @param expectedLength - Optional expected byte length (not hex string length)
 * @returns true if valid hex string
 */
export function isValidHex(hex: string, expectedLength?: number): boolean {
  try {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      return false;
    }

    if (cleanHex.length % 2 !== 0) {
      return false;
    }

    if (expectedLength !== undefined) {
      const byteLength = cleanHex.length / 2;
      if (byteLength !== expectedLength) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
