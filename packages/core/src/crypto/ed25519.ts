/**
 * Ed25519 signature verification using @noble/ed25519
 * Compatible with Cosmos SDK Ed25519 signatures
 */

import * as ed25519 from '@noble/ed25519';
import { sha256Hash, hexToUint8Array, isValidHex } from './hash';

/**
 * Ed25519 public key length in bytes
 */
export const ED25519_PUBLIC_KEY_LENGTH = 32;

/**
 * Ed25519 signature length in bytes
 */
export const ED25519_SIGNATURE_LENGTH = 64;

/**
 * Verifies an Ed25519 signature
 * @param signature - Signature as hex string or Uint8Array (64 bytes)
 * @param message - Message that was signed (string, object, or Uint8Array)
 * @param publicKey - Public key as hex string or Uint8Array (32 bytes)
 * @returns true if signature is valid, false otherwise
 */
export async function verifyEd25519Signature(
  signature: string | Uint8Array,
  message: string | Record<string, unknown> | Uint8Array,
  publicKey: string | Uint8Array
): Promise<boolean> {
  try {
    // Convert signature to Uint8Array
    let signatureBytes: Uint8Array;
    if (typeof signature === 'string') {
      if (!isValidHex(signature, ED25519_SIGNATURE_LENGTH)) {
        throw new Error(
          `Invalid Ed25519 signature hex string. Expected ${ED25519_SIGNATURE_LENGTH * 2} hex characters`
        );
      }
      signatureBytes = hexToUint8Array(signature);
    } else {
      signatureBytes = signature;
    }

    // Validate signature length
    if (signatureBytes.length !== ED25519_SIGNATURE_LENGTH) {
      throw new Error(
        `Invalid Ed25519 signature length. Expected ${ED25519_SIGNATURE_LENGTH} bytes, got ${signatureBytes.length}`
      );
    }

    // Convert public key to Uint8Array
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      if (!isValidHex(publicKey, ED25519_PUBLIC_KEY_LENGTH)) {
        throw new Error(
          `Invalid Ed25519 public key hex string. Expected ${ED25519_PUBLIC_KEY_LENGTH * 2} hex characters`
        );
      }
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    // Validate public key length
    if (publicKeyBytes.length !== ED25519_PUBLIC_KEY_LENGTH) {
      throw new Error(
        `Invalid Ed25519 public key length. Expected ${ED25519_PUBLIC_KEY_LENGTH} bytes, got ${publicKeyBytes.length}`
      );
    }

    // Convert message to bytes
    let messageBytes: Uint8Array;
    if (typeof message === 'string') {
      messageBytes = new TextEncoder().encode(message);
    } else if (message instanceof Uint8Array) {
      messageBytes = message;
    } else {
      // Hash the object
      messageBytes = sha256Hash(JSON.stringify(message));
    }

    // Verify signature using @noble/ed25519
    const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    return isValid;
  } catch {
    // Return false for invalid signatures without logging (security: no info disclosure)
    return false;
  }
}

/**
 * Verifies an Ed25519 signature synchronously
 * Note: Uses synchronous verification which may be slower but doesn't require await
 * @param signature - Signature as hex string or Uint8Array (64 bytes)
 * @param message - Message that was signed (string, object, or Uint8Array)
 * @param publicKey - Public key as hex string or Uint8Array (32 bytes)
 * @returns true if signature is valid, false otherwise
 */
export function verifyEd25519SignatureSync(
  signature: string | Uint8Array,
  message: string | Record<string, unknown> | Uint8Array,
  publicKey: string | Uint8Array
): boolean {
  try {
    // Convert signature to Uint8Array
    let signatureBytes: Uint8Array;
    if (typeof signature === 'string') {
      if (!isValidHex(signature, ED25519_SIGNATURE_LENGTH)) {
        throw new Error(
          `Invalid Ed25519 signature hex string. Expected ${ED25519_SIGNATURE_LENGTH * 2} hex characters`
        );
      }
      signatureBytes = hexToUint8Array(signature);
    } else {
      signatureBytes = signature;
    }

    // Validate signature length
    if (signatureBytes.length !== ED25519_SIGNATURE_LENGTH) {
      throw new Error(
        `Invalid Ed25519 signature length. Expected ${ED25519_SIGNATURE_LENGTH} bytes, got ${signatureBytes.length}`
      );
    }

    // Convert public key to Uint8Array
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      if (!isValidHex(publicKey, ED25519_PUBLIC_KEY_LENGTH)) {
        throw new Error(
          `Invalid Ed25519 public key hex string. Expected ${ED25519_PUBLIC_KEY_LENGTH * 2} hex characters`
        );
      }
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    // Validate public key length
    if (publicKeyBytes.length !== ED25519_PUBLIC_KEY_LENGTH) {
      throw new Error(
        `Invalid Ed25519 public key length. Expected ${ED25519_PUBLIC_KEY_LENGTH} bytes, got ${publicKeyBytes.length}`
      );
    }

    // Convert message to bytes
    let messageBytes: Uint8Array;
    if (typeof message === 'string') {
      messageBytes = new TextEncoder().encode(message);
    } else if (message instanceof Uint8Array) {
      messageBytes = message;
    } else {
      // Hash the object
      messageBytes = sha256Hash(JSON.stringify(message));
    }

    // Verify signature using @noble/ed25519 sync method
    const isValid = ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    // Handle both sync and async returns
    // Note: In strict mode, we need to check if the result is a Promise before using it
    if (isValid !== null && typeof isValid === 'object' && 'then' in isValid) {
      throw new Error('Unexpected async verification. Use verifyEd25519Signature instead.');
    }
    return isValid as boolean;
  } catch {
    // Return false for invalid signatures without logging (security: no info disclosure)
    return false;
  }
}

/**
 * Validates an Ed25519 public key
 * @param publicKey - Public key as hex string or Uint8Array
 * @returns true if valid Ed25519 public key
 */
export function isValidEd25519PublicKey(publicKey: string | Uint8Array): boolean {
  try {
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      if (!isValidHex(publicKey, ED25519_PUBLIC_KEY_LENGTH)) {
        return false;
      }
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    return publicKeyBytes.length === ED25519_PUBLIC_KEY_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Validates an Ed25519 signature format
 * @param signature - Signature as hex string or Uint8Array
 * @returns true if valid Ed25519 signature format
 */
export function isValidEd25519Signature(signature: string | Uint8Array): boolean {
  try {
    let signatureBytes: Uint8Array;
    if (typeof signature === 'string') {
      if (!isValidHex(signature, ED25519_SIGNATURE_LENGTH)) {
        return false;
      }
      signatureBytes = hexToUint8Array(signature);
    } else {
      signatureBytes = signature;
    }

    return signatureBytes.length === ED25519_SIGNATURE_LENGTH;
  } catch {
    return false;
  }
}
