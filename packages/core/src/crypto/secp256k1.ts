/**
 * secp256k1 signature verification using @noble/secp256k1
 * Compatible with Cosmos SDK secp256k1 signatures (compressed and uncompressed keys)
 */

import * as secp256k1 from '@noble/secp256k1';
import { sha256Hash, hexToUint8Array, isValidHex } from './hash';

/**
 * Parse DER-encoded signature to extract r and s values
 * DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
 * @param der - DER-encoded signature bytes
 * @returns Object with r and s as bigints
 */
function parseDERSignature(der: Uint8Array): { r: bigint; s: bigint } {
  // Security: Minimum DER signature is 8 bytes (2 single-byte integers)
  if (!der || der.length < 8) {
    throw new Error('Invalid DER signature: too short');
  }

  // Security: Maximum reasonable DER signature length
  if (der.length > 72) {
    throw new Error('Invalid DER signature: too long');
  }

  // Bounds-checked byte reader
  let pos = 0;
  const readByte = (): number => {
    if (pos >= der.length) {
      throw new Error('Invalid DER signature: unexpected end of data');
    }
    return der[pos++]!;
  };

  // Check sequence tag (0x30)
  if (readByte() !== 0x30) {
    throw new Error('Invalid DER signature: missing sequence tag');
  }

  // Read sequence length
  const seqLength = readByte();
  if (seqLength + 2 !== der.length) {
    throw new Error('Invalid DER signature: incorrect sequence length');
  }

  // Read r value
  if (readByte() !== 0x02) {
    throw new Error('Invalid DER signature: missing r integer tag');
  }

  let rLength = readByte();
  if (rLength === 0 || rLength > 33) {
    throw new Error('Invalid DER signature: invalid r length');
  }

  // Bounds check before accessing r bytes
  if (pos + rLength > der.length) {
    throw new Error('Invalid DER signature: r extends beyond buffer');
  }

  // Remove leading zero byte if present (used for positive integers)
  let rStart = pos;
  if (der[pos] === 0x00 && rLength > 1) {
    rLength--;
    rStart++;
    pos++;
  }

  const rBytes = der.slice(rStart, rStart + rLength);
  pos = rStart + rLength;

  // Read s value
  if (readByte() !== 0x02) {
    throw new Error('Invalid DER signature: missing s integer tag');
  }

  let sLength = readByte();
  if (sLength === 0 || sLength > 33) {
    throw new Error('Invalid DER signature: invalid s length');
  }

  // Bounds check before accessing s bytes
  if (pos + sLength > der.length) {
    throw new Error('Invalid DER signature: s extends beyond buffer');
  }

  // Remove leading zero byte if present
  let sStart = pos;
  if (der[pos] === 0x00 && sLength > 1) {
    sLength--;
    sStart++;
  }

  const sBytes = der.slice(sStart, sStart + sLength);

  // Convert bytes to bigint
  const r = bytesToBigInt(rBytes);
  const s = bytesToBigInt(sBytes);

  return { r, s };
}

/**
 * Convert bytes to bigint (big-endian)
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert r and s to compact 64-byte signature
 */
function rsToCompact(r: bigint, s: bigint): Uint8Array {
  const rBytes = bigIntToBytes(r, 32);
  const sBytes = bigIntToBytes(s, 32);
  const compact = new Uint8Array(64);
  compact.set(rBytes, 0);
  compact.set(sBytes, 32);
  return compact;
}

/**
 * Convert bigint to bytes with padding (big-endian)
 */
function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let value = n;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xFFn);
    value = value >> 8n;
  }
  return bytes;
}

/**
 * secp256k1 compressed public key length in bytes (33 bytes with prefix)
 */
export const SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH = 33;

/**
 * secp256k1 uncompressed public key length in bytes (65 bytes with prefix)
 */
export const SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH = 65;

/**
 * secp256k1 signature length in bytes (compact format)
 */
export const SECP256K1_SIGNATURE_LENGTH = 64;

/**
 * secp256k1 DER signature max length in bytes
 */
export const SECP256K1_DER_SIGNATURE_MAX_LENGTH = 72;

/**
 * Verifies a secp256k1 signature
 * @param signature - Signature as hex string or Uint8Array (64 bytes compact or DER encoded)
 * @param message - Message that was signed (string, object, or Uint8Array)
 * @param publicKey - Public key as hex string or Uint8Array (33 or 65 bytes)
 * @param options - Optional parameters for signature verification
 * @returns true if signature is valid, false otherwise
 */
export async function verifySecp256k1Signature(
  signature: string | Uint8Array,
  message: string | Record<string, unknown> | Uint8Array,
  publicKey: string | Uint8Array,
  options?: {
    hashMessage?: boolean; // If true, hash the message with SHA-256 before verification (default: true)
    isDER?: boolean; // If true, signature is in DER format (default: auto-detect)
  }
): Promise<boolean> {
  try {
    const hashMessage = options?.hashMessage ?? true;

    // Convert signature to Uint8Array
    let signatureBytes: Uint8Array;
    if (typeof signature === 'string') {
      signatureBytes = hexToUint8Array(signature);
    } else {
      signatureBytes = signature;
    }

    // Auto-detect or validate signature format
    const isDER = options?.isDER ?? (signatureBytes.length !== SECP256K1_SIGNATURE_LENGTH);

    // Convert DER to compact format if needed
    if (isDER) {
      try {
        const { r, s } = parseDERSignature(signatureBytes);
        signatureBytes = rsToCompact(r, s);
      } catch (error) {
        throw new Error(`Invalid DER signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate signature length (after conversion if DER)
    if (signatureBytes.length !== SECP256K1_SIGNATURE_LENGTH) {
      throw new Error(`Invalid secp256k1 signature length. Expected ${SECP256K1_SIGNATURE_LENGTH} bytes, got ${signatureBytes.length}`);
    }

    // Convert public key to Uint8Array
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    // Validate public key length (compressed or uncompressed)
    if (
      publicKeyBytes.length !== SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH &&
      publicKeyBytes.length !== SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH
    ) {
      throw new Error(
        `Invalid secp256k1 public key length. Expected ${SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH} or ${SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH} bytes, got ${publicKeyBytes.length}`
      );
    }

    // Normalize public key to compressed format for verification
    let normalizedPublicKey: Uint8Array;
    try {
      const point = secp256k1.Point.fromHex(publicKeyBytes);
      normalizedPublicKey = point.toRawBytes(true); // true = compressed
    } catch (error) {
      throw new Error(`Invalid secp256k1 public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert message to bytes
    let messageBytes: Uint8Array;
    if (typeof message === 'string') {
      messageBytes = new TextEncoder().encode(message);
    } else if (message instanceof Uint8Array) {
      messageBytes = message;
    } else {
      // Serialize object to JSON
      messageBytes = new TextEncoder().encode(JSON.stringify(message));
    }

    // Hash the message if requested (default behavior for Cosmos SDK)
    let messageHash: Uint8Array;
    if (hashMessage) {
      messageHash = sha256Hash(messageBytes);
    } else {
      messageHash = messageBytes;
    }

    // Verify signature using @noble/secp256k1
    const isValid = secp256k1.verify(signatureBytes, messageHash, normalizedPublicKey);
    return isValid;
  } catch {
    // Return false for invalid signatures without logging (security: no info disclosure)
    return false;
  }
}

/**
 * Verifies a secp256k1 signature synchronously
 * @param signature - Signature as hex string or Uint8Array (64 bytes compact or DER encoded)
 * @param message - Message that was signed (string, object, or Uint8Array)
 * @param publicKey - Public key as hex string or Uint8Array (33 or 65 bytes)
 * @param options - Optional parameters for signature verification
 * @returns true if signature is valid, false otherwise
 */
export function verifySecp256k1SignatureSync(
  signature: string | Uint8Array,
  message: string | Record<string, unknown> | Uint8Array,
  publicKey: string | Uint8Array,
  options?: {
    hashMessage?: boolean;
    isDER?: boolean;
  }
): boolean {
  try {
    const hashMessage = options?.hashMessage ?? true;

    // Convert signature to Uint8Array
    let signatureBytes: Uint8Array;
    if (typeof signature === 'string') {
      signatureBytes = hexToUint8Array(signature);
    } else {
      signatureBytes = signature;
    }

    // Auto-detect or validate signature format
    const isDER = options?.isDER ?? (signatureBytes.length !== SECP256K1_SIGNATURE_LENGTH);

    // Convert DER to compact format if needed
    if (isDER) {
      try {
        const { r, s } = parseDERSignature(signatureBytes);
        signatureBytes = rsToCompact(r, s);
      } catch (error) {
        throw new Error(`Invalid DER signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate signature length
    if (signatureBytes.length !== SECP256K1_SIGNATURE_LENGTH) {
      throw new Error(`Invalid secp256k1 signature length. Expected ${SECP256K1_SIGNATURE_LENGTH} bytes, got ${signatureBytes.length}`);
    }

    // Convert public key to Uint8Array
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    // Validate public key length
    if (
      publicKeyBytes.length !== SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH &&
      publicKeyBytes.length !== SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH
    ) {
      throw new Error(
        `Invalid secp256k1 public key length. Expected ${SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH} or ${SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH} bytes, got ${publicKeyBytes.length}`
      );
    }

    // Normalize public key to compressed format
    let normalizedPublicKey: Uint8Array;
    try {
      const point = secp256k1.Point.fromHex(publicKeyBytes);
      normalizedPublicKey = point.toRawBytes(true);
    } catch (error) {
      throw new Error(`Invalid secp256k1 public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert message to bytes
    let messageBytes: Uint8Array;
    if (typeof message === 'string') {
      messageBytes = new TextEncoder().encode(message);
    } else if (message instanceof Uint8Array) {
      messageBytes = message;
    } else {
      messageBytes = new TextEncoder().encode(JSON.stringify(message));
    }

    // Hash the message if requested
    let messageHash: Uint8Array;
    if (hashMessage) {
      messageHash = sha256Hash(messageBytes);
    } else {
      messageHash = messageBytes;
    }

    // Verify signature
    const isValid = secp256k1.verify(signatureBytes, messageHash, normalizedPublicKey);
    return isValid;
  } catch {
    // Return false for invalid signatures without logging (security: no info disclosure)
    return false;
  }
}

/**
 * Compresses a secp256k1 public key
 * @param publicKey - Uncompressed public key (65 bytes)
 * @returns Compressed public key (33 bytes)
 */
export function compressPublicKey(publicKey: string | Uint8Array): Uint8Array {
  try {
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    const point = secp256k1.Point.fromHex(publicKeyBytes);
    return point.toRawBytes(true); // true = compressed
  } catch (error) {
    throw new Error(`Failed to compress public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decompresses a secp256k1 public key
 * @param publicKey - Compressed public key (33 bytes)
 * @returns Uncompressed public key (65 bytes)
 */
export function decompressPublicKey(publicKey: string | Uint8Array): Uint8Array {
  try {
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    const point = secp256k1.Point.fromHex(publicKeyBytes);
    return point.toRawBytes(false); // false = uncompressed
  } catch (error) {
    throw new Error(`Failed to decompress public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates a secp256k1 public key
 * @param publicKey - Public key as hex string or Uint8Array
 * @returns true if valid secp256k1 public key
 */
export function isValidSecp256k1PublicKey(publicKey: string | Uint8Array): boolean {
  try {
    let publicKeyBytes: Uint8Array;
    if (typeof publicKey === 'string') {
      publicKeyBytes = hexToUint8Array(publicKey);
    } else {
      publicKeyBytes = publicKey;
    }

    // Check length
    if (
      publicKeyBytes.length !== SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH &&
      publicKeyBytes.length !== SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH
    ) {
      return false;
    }

    // Try to parse as a point
    secp256k1.Point.fromHex(publicKeyBytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a secp256k1 signature format
 * @param signature - Signature as hex string or Uint8Array
 * @returns true if valid secp256k1 signature format
 */
export function isValidSecp256k1Signature(signature: string | Uint8Array): boolean {
  try {
    let signatureBytes: Uint8Array;
    if (typeof signature === 'string') {
      signatureBytes = hexToUint8Array(signature);
    } else {
      signatureBytes = signature;
    }

    // Check if it's compact format (64 bytes)
    if (signatureBytes.length === SECP256K1_SIGNATURE_LENGTH) {
      return true;
    }

    // Try to parse as DER
    if (signatureBytes.length <= SECP256K1_DER_SIGNATURE_MAX_LENGTH) {
      parseDERSignature(signatureBytes);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
