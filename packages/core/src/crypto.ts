/**
 * Cryptographic utilities for the Aura Verifier SDK
 */

import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { keccak_256 } from '@noble/hashes/sha3';
import { toBech32, fromBech32, toBase64 } from '@cosmjs/encoding';
import { ripemd160 } from '@cosmjs/crypto';

import { PublicKeyError, SignatureError } from './errors';
import type {
  SignatureAlgorithm,
  HashAlgorithm,
  HashRequest,
  AddressDerivationRequest,
  PublicKeyFormat,
} from './types';
import { hexToBytes, bytesToHex, normalizeInput, base64ToBytes } from './utils';

/**
 * Verify Ed25519 signature
 */
export async function verifyEd25519Signature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  try {
    if (publicKey.length !== 32) {
      throw new PublicKeyError('Ed25519 public key must be 32 bytes');
    }

    if (signature.length !== 64) {
      throw new SignatureError('Ed25519 signature must be 64 bytes');
    }

    const result = await ed25519.verify(signature, message, publicKey);
    return result;
  } catch (error) {
    if (error instanceof PublicKeyError || error instanceof SignatureError) {
      throw error;
    }
    // For invalid signatures, return false instead of throwing
    return false;
  }
}

/**
 * Verify secp256k1 signature
 */
export function verifySecp256k1Signature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): boolean {
  try {
    if (publicKey.length !== 33 && publicKey.length !== 65) {
      throw new PublicKeyError(
        'secp256k1 public key must be 33 (compressed) or 65 (uncompressed) bytes'
      );
    }

    if (signature.length !== 64) {
      throw new SignatureError('secp256k1 signature must be 64 bytes');
    }

    // Hash the message with SHA-256
    const messageHash = sha256(message);

    const result = secp256k1.verify(signature, messageHash, publicKey);
    return result;
  } catch (error) {
    if (error instanceof PublicKeyError || error instanceof SignatureError) {
      throw error;
    }
    // For invalid signatures, return false instead of throwing
    return false;
  }
}

/**
 * Verify signature using specified algorithm
 */
export async function verifySignature(
  publicKey: string | Uint8Array,
  message: string | Uint8Array,
  signature: string | Uint8Array,
  algorithm: SignatureAlgorithm
): Promise<boolean> {
  const pubKeyBytes = normalizeInput(publicKey);
  const messageBytes = normalizeInput(message);
  const signatureBytes = normalizeInput(signature);

  switch (algorithm) {
    case 'ed25519':
      return await verifyEd25519Signature(pubKeyBytes, messageBytes, signatureBytes);
    case 'secp256k1':
      return verifySecp256k1Signature(pubKeyBytes, messageBytes, signatureBytes);
    default: {
      const _exhaustive: never = algorithm;
      throw new Error(`Unsupported algorithm: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Hash data using specified algorithm
 */
export function hash(request: HashRequest): string | Uint8Array {
  const dataBytes = normalizeInput(request.data);

  let hashBytes: Uint8Array;

  switch (request.algorithm) {
    case 'sha256':
      hashBytes = sha256(dataBytes);
      break;
    case 'sha512':
      hashBytes = sha512(dataBytes);
      break;
    case 'keccak256':
      hashBytes = keccak_256(dataBytes);
      break;
    default: {
      const _exhaustive: never = request.algorithm;
      throw new Error(`Unsupported hash algorithm: ${String(_exhaustive)}`);
    }
  }

  const encoding = request.encoding ?? 'hex';

  switch (encoding) {
    case 'hex':
      return bytesToHex(hashBytes);
    case 'base64':
      return toBase64(hashBytes);
    case 'bytes':
      return hashBytes;
    default: {
      const _exhaustive: never = encoding;
      throw new Error(`Unsupported encoding: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Derive Cosmos SDK address from public key
 */
export function deriveAddress(request: AddressDerivationRequest): string {
  let pubKeyBytes: Uint8Array;

  // Parse public key based on format
  switch (request.publicKeyFormat) {
    case 'hex':
      pubKeyBytes = hexToBytes(request.publicKey);
      break;
    case 'base64':
      pubKeyBytes = base64ToBytes(request.publicKey);
      break;
    case 'bech32': {
      const decoded = fromBech32(request.publicKey);
      pubKeyBytes = decoded.data;
      break;
    }
    default: {
      const _exhaustive: never = request.publicKeyFormat;
      throw new Error(`Unsupported public key format: ${String(_exhaustive)}`);
    }
  }

  // Validate public key length based on algorithm
  if (request.algorithm === 'ed25519' && pubKeyBytes.length !== 32) {
    throw new PublicKeyError('Ed25519 public key must be 32 bytes');
  }

  if (request.algorithm === 'secp256k1' && pubKeyBytes.length !== 33 && pubKeyBytes.length !== 65) {
    throw new PublicKeyError(
      'secp256k1 public key must be 33 (compressed) or 65 (uncompressed) bytes'
    );
  }

  // Compute address: RIPEMD160(SHA256(pubkey))
  const sha256Hash = sha256(pubKeyBytes);
  const ripemd160Hash = ripemd160(sha256Hash);

  // Encode as bech32
  return toBech32(request.prefix, ripemd160Hash);
}

/**
 * Compress secp256k1 public key
 */
export function compressSecp256k1PublicKey(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length === 33) {
    return publicKey; // Already compressed
  }

  if (publicKey.length !== 65) {
    throw new PublicKeyError(
      'secp256k1 public key must be 33 (compressed) or 65 (uncompressed) bytes'
    );
  }

  // Get the y coordinate (last byte)
  const y = publicKey[64];
  if (y === undefined) {
    throw new PublicKeyError('Invalid secp256k1 public key');
  }

  // Compressed format: 0x02 or 0x03 prefix + x coordinate (32 bytes)
  const prefix = y % 2 === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(publicKey.slice(1, 33), 1);

  return compressed;
}
