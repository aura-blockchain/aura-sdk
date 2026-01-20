/**
 * Utility functions for the Aura Verifier SDK
 */

import { fromHex, toHex, fromBase64, toBase64 } from '@cosmjs/encoding';

import { EncodingError } from './errors';

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  try {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return fromHex(cleanHex);
  } catch (error) {
    throw new EncodingError('Failed to decode hex string', {
      hex,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array, prefix = false): string {
  try {
    const hex = toHex(bytes);
    return prefix ? `0x${hex}` : hex;
  } catch (error) {
    throw new EncodingError('Failed to encode bytes to hex', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  try {
    return fromBase64(base64);
  } catch (error) {
    throw new EncodingError('Failed to decode base64 string', {
      base64,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convert Uint8Array to base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  try {
    return toBase64(bytes);
  } catch (error) {
    throw new EncodingError('Failed to encode bytes to base64', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Normalize input to Uint8Array
 */
export function normalizeInput(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }

  // Try hex first (with or without 0x prefix)
  if (/^(0x)?[0-9a-fA-F]+$/.test(input)) {
    return hexToBytes(input);
  }

  // Try base64
  try {
    return base64ToBytes(input);
  } catch {
    // If not base64, treat as UTF-8 string
    return new TextEncoder().encode(input);
  }
}

/**
 * Validate hex string format
 */
export function isValidHex(hex: string): boolean {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]*$/.test(cleanHex) && cleanHex.length % 2 === 0;
}

/**
 * Validate base64 string format
 */
export function isValidBase64(base64: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(base64);
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffFactor = 2 } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        await sleep(Math.min(delay, maxDelay));
        delay *= backoffFactor;
      }
    }
  }

  throw lastError;
}
