/**
 * Unified signature verification module
 * Auto-detects signature type and verifies using the appropriate algorithm
 */

import {
  verifyEd25519Signature,
  verifyEd25519SignatureSync,
  isValidEd25519PublicKey,
  isValidEd25519Signature,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
} from './ed25519';

import {
  verifySecp256k1Signature,
  verifySecp256k1SignatureSync,
  isValidSecp256k1PublicKey,
  isValidSecp256k1Signature,
  SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_SIGNATURE_LENGTH,
} from './secp256k1';

import { hexToUint8Array } from './hash';

/**
 * Supported signature algorithms
 */
export enum SignatureAlgorithm {
  ED25519 = 'ed25519',
  SECP256K1 = 'secp256k1',
}

/**
 * Signature verification options
 */
export interface SignatureVerificationOptions {
  /** Algorithm to use (auto-detected if not specified) */
  algorithm?: SignatureAlgorithm;
  /** For secp256k1: whether to hash the message before verification (default: true) */
  hashMessage?: boolean;
  /** For secp256k1: whether signature is in DER format (auto-detected if not specified) */
  isDER?: boolean;
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** The algorithm used for verification */
  algorithm: SignatureAlgorithm;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Auto-detects the signature algorithm based on public key length
 * @param publicKey - Public key as hex string or Uint8Array
 * @returns Detected algorithm or null if cannot be determined
 */
export function detectSignatureAlgorithm(publicKey: string | Uint8Array): SignatureAlgorithm | null {
  try {
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    const length = publicKeyBytes.length;

    // Ed25519 public key is always 32 bytes
    if (length === ED25519_PUBLIC_KEY_LENGTH) {
      return SignatureAlgorithm.ED25519;
    }

    // secp256k1 public key is 33 bytes (compressed) or 65 bytes (uncompressed)
    if (length === SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH || length === SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH) {
      return SignatureAlgorithm.SECP256K1;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verifies a signature with automatic algorithm detection
 * @param signature - Signature as hex string or Uint8Array
 * @param message - Message that was signed (string, object, or Uint8Array)
 * @param publicKey - Public key as hex string or Uint8Array
 * @param options - Optional verification parameters
 * @returns Promise resolving to verification result
 */
export async function verifySignature(
  signature: string | Uint8Array,
  message: string | Record<string, unknown> | Uint8Array,
  publicKey: string | Uint8Array,
  options?: SignatureVerificationOptions
): Promise<SignatureVerificationResult> {
  try {
    // Detect algorithm if not specified
    const algorithm = options?.algorithm ?? detectSignatureAlgorithm(publicKey);

    if (!algorithm) {
      return {
        valid: false,
        algorithm: SignatureAlgorithm.ED25519, // Default fallback
        error: 'Unable to detect signature algorithm from public key length',
      };
    }

    // Verify based on algorithm
    let valid: boolean;
    if (algorithm === SignatureAlgorithm.ED25519) {
      valid = await verifyEd25519Signature(signature, message, publicKey);
    } else if (algorithm === SignatureAlgorithm.SECP256K1) {
      valid = await verifySecp256k1Signature(signature, message, publicKey, {
        hashMessage: options?.hashMessage,
        isDER: options?.isDER,
      });
    } else {
      return {
        valid: false,
        algorithm,
        error: `Unsupported signature algorithm: ${algorithm}`,
      };
    }

    return {
      valid,
      algorithm,
    };
  } catch (error) {
    return {
      valid: false,
      algorithm: options?.algorithm ?? SignatureAlgorithm.ED25519,
      error: error instanceof Error ? error.message : 'Unknown error during signature verification',
    };
  }
}

/**
 * Verifies a signature synchronously with automatic algorithm detection
 * @param signature - Signature as hex string or Uint8Array
 * @param message - Message that was signed (string, object, or Uint8Array)
 * @param publicKey - Public key as hex string or Uint8Array
 * @param options - Optional verification parameters
 * @returns Verification result
 */
export function verifySignatureSync(
  signature: string | Uint8Array,
  message: string | Record<string, unknown> | Uint8Array,
  publicKey: string | Uint8Array,
  options?: SignatureVerificationOptions
): SignatureVerificationResult {
  try {
    // Detect algorithm if not specified
    const algorithm = options?.algorithm ?? detectSignatureAlgorithm(publicKey);

    if (!algorithm) {
      return {
        valid: false,
        algorithm: SignatureAlgorithm.ED25519,
        error: 'Unable to detect signature algorithm from public key length',
      };
    }

    // Verify based on algorithm
    let valid: boolean;
    if (algorithm === SignatureAlgorithm.ED25519) {
      valid = verifyEd25519SignatureSync(signature, message, publicKey);
    } else if (algorithm === SignatureAlgorithm.SECP256K1) {
      valid = verifySecp256k1SignatureSync(signature, message, publicKey, {
        hashMessage: options?.hashMessage,
        isDER: options?.isDER,
      });
    } else {
      return {
        valid: false,
        algorithm,
        error: `Unsupported signature algorithm: ${algorithm}`,
      };
    }

    return {
      valid,
      algorithm,
    };
  } catch (error) {
    return {
      valid: false,
      algorithm: options?.algorithm ?? SignatureAlgorithm.ED25519,
      error: error instanceof Error ? error.message : 'Unknown error during signature verification',
    };
  }
}

/**
 * Validates a public key for any supported algorithm
 * @param publicKey - Public key as hex string or Uint8Array
 * @param algorithm - Optional algorithm to validate against (auto-detected if not specified)
 * @returns true if public key is valid
 */
export function isValidPublicKey(publicKey: string | Uint8Array, algorithm?: SignatureAlgorithm): boolean {
  try {
    if (algorithm) {
      // Validate for specific algorithm
      if (algorithm === SignatureAlgorithm.ED25519) {
        return isValidEd25519PublicKey(publicKey);
      } else if (algorithm === SignatureAlgorithm.SECP256K1) {
        return isValidSecp256k1PublicKey(publicKey);
      }
      return false;
    }

    // Try to detect and validate
    const detectedAlgorithm = detectSignatureAlgorithm(publicKey);
    if (!detectedAlgorithm) {
      return false;
    }

    if (detectedAlgorithm === SignatureAlgorithm.ED25519) {
      return isValidEd25519PublicKey(publicKey);
    } else if (detectedAlgorithm === SignatureAlgorithm.SECP256K1) {
      return isValidSecp256k1PublicKey(publicKey);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates a signature format for any supported algorithm
 * @param signature - Signature as hex string or Uint8Array
 * @param algorithm - Optional algorithm to validate against
 * @returns true if signature format is valid
 */
export function isValidSignature(signature: string | Uint8Array, algorithm?: SignatureAlgorithm): boolean {
  try {
    if (algorithm) {
      // Validate for specific algorithm
      if (algorithm === SignatureAlgorithm.ED25519) {
        return isValidEd25519Signature(signature);
      } else if (algorithm === SignatureAlgorithm.SECP256K1) {
        return isValidSecp256k1Signature(signature);
      }
      return false;
    }

    // Try both algorithms
    return isValidEd25519Signature(signature) || isValidSecp256k1Signature(signature);
  } catch {
    return false;
  }
}

/**
 * Cosmos SDK specific signature verification
 * Verifies a signature in the format used by Cosmos SDK transactions
 * @param signature - Signature as hex string or Uint8Array
 * @param signDoc - Sign doc object (the message that was signed)
 * @param publicKey - Public key as hex string or Uint8Array
 * @param options - Optional verification parameters
 * @returns Promise resolving to verification result
 */
export async function verifyCosmosSignature(
  signature: string | Uint8Array,
  signDoc: Record<string, unknown>,
  publicKey: string | Uint8Array,
  options?: SignatureVerificationOptions
): Promise<SignatureVerificationResult> {
  try {
    // Cosmos SDK uses JSON canonical serialization
    const signDocJson = JSON.stringify(signDoc);

    // Verify the signature
    return await verifySignature(signature, signDocJson, publicKey, {
      ...options,
      // Cosmos SDK always hashes the message for secp256k1
      hashMessage: true,
    });
  } catch (error) {
    return {
      valid: false,
      algorithm: options?.algorithm ?? SignatureAlgorithm.ED25519,
      error: error instanceof Error ? error.message : 'Unknown error during Cosmos signature verification',
    };
  }
}

/**
 * Batch signature verification
 * Verifies multiple signatures in parallel
 * @param verifications - Array of verification requests
 * @returns Promise resolving to array of verification results
 */
export async function verifySignatureBatch(
  verifications: Array<{
    signature: string | Uint8Array;
    message: string | Record<string, unknown> | Uint8Array;
    publicKey: string | Uint8Array;
    options?: SignatureVerificationOptions;
  }>
): Promise<SignatureVerificationResult[]> {
  const promises = verifications.map(({ signature, message, publicKey, options }) =>
    verifySignature(signature, message, publicKey, options)
  );

  return Promise.all(promises);
}

/**
 * Gets information about supported signature algorithms
 */
export function getSupportedAlgorithms(): {
  algorithm: SignatureAlgorithm;
  publicKeyLengths: number[];
  signatureLengths: number[];
}[] {
  return [
    {
      algorithm: SignatureAlgorithm.ED25519,
      publicKeyLengths: [ED25519_PUBLIC_KEY_LENGTH],
      signatureLengths: [ED25519_SIGNATURE_LENGTH],
    },
    {
      algorithm: SignatureAlgorithm.SECP256K1,
      publicKeyLengths: [SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH, SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH],
      signatureLengths: [SECP256K1_SIGNATURE_LENGTH],
    },
  ];
}
