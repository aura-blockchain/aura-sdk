/**
 * Test setup file for vitest
 * Configures sync hash functions for @noble/ed25519 and @noble/secp256k1
 */

import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';
import { sha512 } from '@noble/hashes/sha2';
import { sha256 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { webcrypto } from 'node:crypto';

// Ensure Web Crypto API is available for @noble/* random key generation
if (!(globalThis as unknown as { crypto?: Crypto }).crypto) {
  // @ts-expect-error Node webcrypto is compatible enough for tests
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

// Configure sync hash function for Ed25519
// @noble/ed25519 requires sha512Sync to be set for synchronous operations
ed25519.etc.sha512Sync = (...messages: Uint8Array[]): Uint8Array => {
  const h = sha512.create();
  for (const msg of messages) {
    h.update(msg);
  }
  return h.digest();
};

// Configure sync hash function for secp256k1
// @noble/secp256k1 requires hmacSha256Sync for synchronous ECDSA operations
secp256k1.etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]): Uint8Array => {
  return hmac(sha256, key, secp256k1.etc.concatBytes(...messages));
};

// Export for explicit imports if needed
export const cryptoSetupComplete = true;
