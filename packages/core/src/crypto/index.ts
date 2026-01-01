/**
 * Cryptographic verification module for Aura Verifier SDK
 * Provides signature verification and hashing utilities
 *
 * @module crypto
 */

// Initialize crypto libraries with required hash functions
// This MUST be imported first before any crypto operations
import './setup.js';

// Export crypto setup utilities
export { CRYPTO_SETUP_COMPLETE, verifyCryptoSetup, hmacSha256, sha256Sync } from './setup.js';

// Hash utilities
export {
  sha256Hash,
  sha256HashHex,
  doubleSha256,
  doubleSha256Hex,
  hexToUint8Array,
  uint8ArrayToHex,
  hashObject,
  hashObjectHex,
  isValidHex,
} from './hash';

// Ed25519 signature verification
export {
  verifyEd25519Signature,
  verifyEd25519SignatureSync,
  isValidEd25519PublicKey,
  isValidEd25519Signature,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
} from './ed25519';

// secp256k1 signature verification
export {
  verifySecp256k1Signature,
  verifySecp256k1SignatureSync,
  compressPublicKey,
  decompressPublicKey,
  isValidSecp256k1PublicKey,
  isValidSecp256k1Signature,
  SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_SIGNATURE_LENGTH,
  SECP256K1_DER_SIGNATURE_MAX_LENGTH,
} from './secp256k1';

// Unified signature verification
export {
  SignatureAlgorithm,
  type SignatureVerificationOptions,
  type SignatureVerificationResult,
  verifySignature,
  verifySignatureSync,
  verifyCosmosSignature,
  verifySignatureBatch,
  detectSignatureAlgorithm,
  isValidPublicKey,
  isValidSignature,
  getSupportedAlgorithms,
} from './signature';
