/**
 * Revocation list handling for offline verification
 *
 * Provides efficient bitmap-based revocation checking and Merkle proof verification
 * for trustless offline credential revocation status validation.
 */

import { sha256Hash, sha256HashHex } from '../crypto/hash.js';
import { RevocationList, MerkleProof } from './types.js';
import type { RevocationBitmap } from './types.js';

/**
 * Creates a revocation bitmap from a list of revoked indices
 * @param revokedIndices - Array of revoked credential indices
 * @param totalSize - Total number of credentials in the list
 * @returns RevocationBitmap
 */
export function createRevocationBitmap(
  revokedIndices: number[],
  totalSize: number
): RevocationBitmap {
  try {
    // Calculate bitmap size in bytes (round up to nearest byte)
    const byteSize = Math.ceil(totalSize / 8);
    const data = new Uint8Array(byteSize);

    // Set bits for revoked indices
    for (const index of revokedIndices) {
      if (index < 0 || index >= totalSize) {
        throw new Error(`Invalid index ${index}. Must be between 0 and ${totalSize - 1}`);
      }

      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      data[byteIndex] |= 1 << bitIndex;
    }

    return {
      data,
      length: totalSize,
      setBits: revokedIndices.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to create revocation bitmap: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks if an index is revoked in the bitmap
 * @param bitmap - RevocationBitmap to check
 * @param index - Credential index to check
 * @returns true if revoked, false otherwise
 */
export function isRevokedInBitmap(bitmap: RevocationBitmap, index: number): boolean {
  try {
    if (index < 0 || index >= bitmap.length) {
      throw new Error(`Invalid index ${index}. Must be between 0 and ${bitmap.length - 1}`);
    }

    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    if (byteIndex >= bitmap.data.length) {
      return false;
    }

    return (bitmap.data[byteIndex] & (1 << bitIndex)) !== 0;
  } catch (error) {
    throw new Error(
      `Failed to check revocation status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Compresses bitmap using run-length encoding (simple compression)
 * @param bitmap - Bitmap to compress
 * @returns Compressed data
 */
export function compressBitmap(bitmap: Uint8Array): Uint8Array {
  // Simple run-length encoding
  const runs: number[] = [];
  let currentByte = bitmap[0];
  let count = 1;

  for (let i = 1; i < bitmap.length; i++) {
    if (bitmap[i] === currentByte && count < 255) {
      count++;
    } else {
      runs.push(currentByte, count);
      currentByte = bitmap[i];
      count = 1;
    }
  }

  // Add last run
  runs.push(currentByte, count);

  return new Uint8Array(runs);
}

/**
 * Decompresses run-length encoded bitmap
 * @param compressed - Compressed bitmap data
 * @returns Decompressed bitmap
 */
export function decompressBitmap(compressed: Uint8Array): Uint8Array {
  const result: number[] = [];

  for (let i = 0; i < compressed.length; i += 2) {
    const byte = compressed[i];
    const count = compressed[i + 1];

    for (let j = 0; j < count; j++) {
      result.push(byte);
    }
  }

  return new Uint8Array(result);
}

/**
 * Calculates Merkle root from credential hashes
 * @param hashes - Array of credential hashes
 * @returns Merkle root hash (hex string)
 */
export function calculateMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    throw new Error('Cannot calculate Merkle root of empty array');
  }

  // Convert hex hashes to Uint8Array
  let currentLevel = hashes.map((h) => hexToBytes(h));

  while (currentLevel.length > 1) {
    const nextLevel: Uint8Array[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left; // Duplicate last node if odd

      // Concatenate and hash
      const combined = new Uint8Array(left.length + right.length);
      combined.set(left, 0);
      combined.set(right, left.length);

      const hash = sha256Hash(combined);
      nextLevel.push(hash);
    }

    currentLevel = nextLevel;
  }

  return bytesToHex(currentLevel[0]);
}

/**
 * Generates Merkle proof for a credential
 * @param vcId - Verifiable Credential ID
 * @param allHashes - Array of all credential hashes in the tree
 * @param index - Index of the credential in the array
 * @returns MerkleProof
 */
export function generateMerkleProof(vcId: string, allHashes: string[], index: number): MerkleProof {
  try {
    if (index < 0 || index >= allHashes.length) {
      throw new Error(`Invalid index ${index}. Must be between 0 and ${allHashes.length - 1}`);
    }

    const siblings: string[] = [];
    let currentLevel = allHashes.map((h) => hexToBytes(h));
    let currentIndex = index;

    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        // Store sibling if this is our node
        if (i === currentIndex || i + 1 === currentIndex) {
          const siblingIndex = i === currentIndex ? i + 1 : i;
          if (siblingIndex < currentLevel.length) {
            siblings.push(bytesToHex(currentLevel[siblingIndex]));
          }
        }

        // Combine and hash
        const combined = new Uint8Array(left.length + right.length);
        combined.set(left, 0);
        combined.set(right, left.length);

        const hash = sha256Hash(combined);
        nextLevel.push(hash);
      }

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    const root = bytesToHex(currentLevel[0]);

    return {
      vcId,
      index,
      siblings,
      root,
      isRevoked: false, // Set by caller based on bitmap
    };
  } catch (error) {
    throw new Error(
      `Failed to generate Merkle proof: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verifies a Merkle proof
 * @param proof - MerkleProof to verify
 * @param vcHash - Hash of the credential being verified
 * @returns true if proof is valid
 */
export function verifyMerkleProof(proof: MerkleProof, vcHash: string): boolean {
  try {
    let currentHash = hexToBytes(vcHash);
    let currentIndex = proof.index;

    // Traverse up the tree using siblings
    for (const sibling of proof.siblings) {
      const siblingBytes = hexToBytes(sibling);

      // Determine order based on index parity
      const combined = new Uint8Array(currentHash.length + siblingBytes.length);

      if (currentIndex % 2 === 0) {
        // Current node is left child
        combined.set(currentHash, 0);
        combined.set(siblingBytes, currentHash.length);
      } else {
        // Current node is right child
        combined.set(siblingBytes, 0);
        combined.set(currentHash, siblingBytes.length);
      }

      currentHash = sha256Hash(combined);
      currentIndex = Math.floor(currentIndex / 2);
    }

    const calculatedRoot = bytesToHex(currentHash);
    return calculatedRoot === proof.root;
  } catch (error) {
    throw new Error(
      `Failed to verify Merkle proof: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Hashes a credential ID for Merkle tree inclusion
 * @param vcId - Verifiable Credential ID
 * @returns Hash as hex string
 */
export function hashCredentialId(vcId: string): string {
  return sha256HashHex(vcId);
}

/**
 * Creates a revocation list from credential IDs and revoked indices
 * @param credentialIds - All credential IDs in order
 * @param revokedIndices - Indices of revoked credentials
 * @returns RevocationList
 */
export function createRevocationList(
  credentialIds: string[],
  revokedIndices: number[]
): RevocationList {
  try {
    // Hash all credential IDs
    const hashes = credentialIds.map((id) => hashCredentialId(id));

    // Calculate Merkle root
    const merkleRoot = calculateMerkleRoot(hashes);

    // Create bitmap
    const bitmap = createRevocationBitmap(revokedIndices, credentialIds.length);

    return {
      merkleRoot,
      bitmap: bitmap.data,
      totalCredentials: credentialIds.length,
      revokedCount: revokedIndices.length,
      updatedAt: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to create revocation list: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks if a credential is revoked in a revocation list
 * @param vcId - Verifiable Credential ID
 * @param index - Index in the revocation list
 * @param revocationList - RevocationList to check
 * @returns true if revoked
 */
export function isRevoked(vcId: string, index: number, revocationList: RevocationList): boolean {
  try {
    const bitmap: RevocationBitmap = {
      data: revocationList.bitmap,
      length: revocationList.totalCredentials,
      setBits: revocationList.revokedCount,
    };

    return isRevokedInBitmap(bitmap, index);
  } catch (error) {
    throw new Error(
      `Failed to check revocation status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets revocation statistics from a bitmap
 * @param bitmap - RevocationBitmap
 * @returns Statistics object
 */
export function getRevocationStats(bitmap: RevocationBitmap): {
  totalCredentials: number;
  revokedCount: number;
  revokedPercentage: number;
  bitmapSizeBytes: number;
} {
  return {
    totalCredentials: bitmap.length,
    revokedCount: bitmap.setBits,
    revokedPercentage: (bitmap.setBits / bitmap.length) * 100,
    bitmapSizeBytes: bitmap.data.length,
  };
}

// Utility functions

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates revocation list integrity
 * @param revocationList - RevocationList to validate
 * @returns true if valid
 */
export function validateRevocationList(revocationList: RevocationList): boolean {
  try {
    // Check bitmap size matches total credentials
    const expectedBytes = Math.ceil(revocationList.totalCredentials / 8);
    if (revocationList.bitmap.length !== expectedBytes) {
      return false;
    }

    // Check revoked count is within bounds
    if (revocationList.revokedCount > revocationList.totalCredentials) {
      return false;
    }

    // Check Merkle root format
    if (!/^[0-9a-fA-F]{64}$/.test(revocationList.merkleRoot)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
