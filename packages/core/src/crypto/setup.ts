/**
 * Crypto Setup - Configure noble crypto libraries for sync operations
 *
 * This module must be imported before using any sync crypto operations.
 * It sets up the required hash functions for @noble/ed25519 and @noble/secp256k1.
 */

import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';

/**
 * Helper to concatenate Uint8Arrays
 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Setup Ed25519 with SHA-512 for sync operations
 * Required for ed25519.verify() to work synchronously
 */
if (ed25519.etc) {
  ed25519.etc.sha512Sync = (...m: Uint8Array[]): Uint8Array => {
    return sha512(concatBytes(...m));
  };
  ed25519.etc.sha512Async = async (...m: Uint8Array[]): Promise<Uint8Array> => {
    return sha512(concatBytes(...m));
  };
}

/**
 * Setup secp256k1 with HMAC-SHA256 for sync operations
 * Required for secp256k1.verify() to work synchronously
 */
if (secp256k1.etc) {
  secp256k1.etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]): Uint8Array => {
    return hmac(sha256, key, concatBytes(...messages));
  };
  secp256k1.etc.hmacSha256Async = async (key: Uint8Array, ...messages: Uint8Array[]): Promise<Uint8Array> => {
    return hmac(sha256, key, concatBytes(...messages));
  };
}

/**
 * Flag to indicate crypto setup is complete
 */
export const CRYPTO_SETUP_COMPLETE = true;

/**
 * Verify that crypto setup is correctly initialized
 */
export function verifyCryptoSetup(): boolean {
  try {
    // Test Ed25519 sync verification setup
    if (!ed25519.etc?.sha512Sync) {
      return false;
    }

    // Test secp256k1 sync verification setup
    if (!secp256k1.etc?.hmacSha256Sync) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * HMAC-SHA256 function for secp256k1 operations
 */
export function hmacSha256(key: Uint8Array, ...messages: Uint8Array[]): Uint8Array {
  return hmac(sha256, key, concatBytes(...messages));
}

/**
 * SHA-256 sync function
 */
export function sha256Sync(data: Uint8Array): Uint8Array {
  return sha256(data);
}
