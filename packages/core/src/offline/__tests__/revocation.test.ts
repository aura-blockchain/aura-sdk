/**
 * Tests for Revocation List Handling
 */

import { describe, it, expect } from 'vitest';
import {
  createRevocationBitmap,
  isRevokedInBitmap,
  compressBitmap,
  decompressBitmap,
  calculateMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  hashCredentialId,
  createRevocationList,
  isRevoked,
  getRevocationStats,
  validateRevocationList
} from '../revocation.js';

describe('Revocation Bitmap', () => {
  it('should create a revocation bitmap', () => {
    const revokedIndices = [0, 5, 10, 15];
    const totalSize = 20;

    const bitmap = createRevocationBitmap(revokedIndices, totalSize);

    expect(bitmap.length).toBe(totalSize);
    expect(bitmap.setBits).toBe(revokedIndices.length);
    expect(bitmap.data.length).toBe(Math.ceil(totalSize / 8));
  });

  it('should check if index is revoked', () => {
    const revokedIndices = [0, 5, 10, 15];
    const totalSize = 20;
    const bitmap = createRevocationBitmap(revokedIndices, totalSize);

    // Check revoked indices
    expect(isRevokedInBitmap(bitmap, 0)).toBe(true);
    expect(isRevokedInBitmap(bitmap, 5)).toBe(true);
    expect(isRevokedInBitmap(bitmap, 10)).toBe(true);
    expect(isRevokedInBitmap(bitmap, 15)).toBe(true);

    // Check non-revoked indices
    expect(isRevokedInBitmap(bitmap, 1)).toBe(false);
    expect(isRevokedInBitmap(bitmap, 7)).toBe(false);
    expect(isRevokedInBitmap(bitmap, 19)).toBe(false);
  });

  it('should handle edge cases in bitmap creation', () => {
    // Empty revocation list
    const emptyBitmap = createRevocationBitmap([], 10);
    expect(emptyBitmap.setBits).toBe(0);
    expect(isRevokedInBitmap(emptyBitmap, 0)).toBe(false);

    // All revoked
    const allRevoked = Array.from({ length: 10 }, (_, i) => i);
    const fullBitmap = createRevocationBitmap(allRevoked, 10);
    expect(fullBitmap.setBits).toBe(10);
    expect(isRevokedInBitmap(fullBitmap, 0)).toBe(true);
    expect(isRevokedInBitmap(fullBitmap, 9)).toBe(true);
  });

  it('should throw error for invalid indices', () => {
    expect(() => {
      createRevocationBitmap([100], 10);
    }).toThrow();

    expect(() => {
      createRevocationBitmap([-1], 10);
    }).toThrow();
  });

  it('should get revocation statistics', () => {
    const revokedIndices = [0, 5, 10];
    const totalSize = 100;
    const bitmap = createRevocationBitmap(revokedIndices, totalSize);

    const stats = getRevocationStats(bitmap);

    expect(stats.totalCredentials).toBe(100);
    expect(stats.revokedCount).toBe(3);
    expect(stats.revokedPercentage).toBe(3);
    expect(stats.bitmapSizeBytes).toBe(Math.ceil(100 / 8));
  });
});

describe('Bitmap Compression', () => {
  it('should compress and decompress bitmap', () => {
    const original = new Uint8Array([0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00]);
    const compressed = compressBitmap(original);
    const decompressed = decompressBitmap(compressed);

    expect(decompressed).toEqual(original);
  });

  it('should handle single-byte bitmap', () => {
    const original = new Uint8Array([0xAB]);
    const compressed = compressBitmap(original);
    const decompressed = decompressBitmap(compressed);

    expect(decompressed).toEqual(original);
  });

  it('should handle alternating pattern', () => {
    const original = new Uint8Array([0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00]);
    const compressed = compressBitmap(original);
    const decompressed = decompressBitmap(compressed);

    expect(decompressed).toEqual(original);
  });
});

describe('Merkle Tree', () => {
  it('should calculate Merkle root', () => {
    const hashes = [
      'a'.repeat(64),
      'b'.repeat(64),
      'c'.repeat(64),
      'd'.repeat(64)
    ];

    const root = calculateMerkleRoot(hashes);

    expect(root).toBeTruthy();
    expect(root.length).toBe(64); // SHA-256 hex
    expect(/^[0-9a-f]{64}$/.test(root)).toBe(true);
  });

  it('should handle single hash', () => {
    const hashes = ['a'.repeat(64)];
    const root = calculateMerkleRoot(hashes);

    expect(root).toBe('a'.repeat(64));
  });

  it('should handle odd number of hashes', () => {
    const hashes = [
      'a'.repeat(64),
      'b'.repeat(64),
      'c'.repeat(64)
    ];

    const root = calculateMerkleRoot(hashes);
    expect(root).toBeTruthy();
    expect(root.length).toBe(64);
  });

  it('should throw error for empty array', () => {
    expect(() => {
      calculateMerkleRoot([]);
    }).toThrow();
  });
});

describe('Merkle Proofs', () => {
  it('should generate and verify Merkle proof', () => {
    const vcIds = ['vc-001', 'vc-002', 'vc-003', 'vc-004'];
    const hashes = vcIds.map(id => hashCredentialId(id));

    const index = 1;
    const vcId = vcIds[index];
    const vcHash = hashes[index];

    const proof = generateMerkleProof(vcId, hashes, index);

    expect(proof.vcId).toBe(vcId);
    expect(proof.index).toBe(index);
    expect(proof.siblings.length).toBeGreaterThan(0);

    // Verify the proof
    const isValid = verifyMerkleProof(proof, vcHash);
    expect(isValid).toBe(true);
  });

  it('should reject invalid Merkle proof', () => {
    const vcIds = ['vc-001', 'vc-002', 'vc-003', 'vc-004'];
    const hashes = vcIds.map(id => hashCredentialId(id));

    const proof = generateMerkleProof(vcIds[0], hashes, 0);

    // Verify with wrong hash
    const wrongHash = hashCredentialId('vc-wrong');
    const isValid = verifyMerkleProof(proof, wrongHash);
    expect(isValid).toBe(false);
  });

  it('should handle single-element proof', () => {
    const vcId = 'vc-001';
    const hashes = [hashCredentialId(vcId)];

    const proof = generateMerkleProof(vcId, hashes, 0);
    expect(proof.siblings.length).toBe(0);

    const isValid = verifyMerkleProof(proof, hashes[0]);
    expect(isValid).toBe(true);
  });
});

describe('Credential Hashing', () => {
  it('should hash credential ID', () => {
    const vcId = 'test-credential-001';
    const hash = hashCredentialId(vcId);

    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64); // SHA-256 hex
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('should produce consistent hashes', () => {
    const vcId = 'test-credential-001';
    const hash1 = hashCredentialId(vcId);
    const hash2 = hashCredentialId(vcId);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different IDs', () => {
    const hash1 = hashCredentialId('vc-001');
    const hash2 = hashCredentialId('vc-002');

    expect(hash1).not.toBe(hash2);
  });
});

describe('Revocation List', () => {
  it('should create complete revocation list', () => {
    const credentialIds = ['vc-001', 'vc-002', 'vc-003', 'vc-004', 'vc-005'];
    const revokedIndices = [1, 3];

    const revocationList = createRevocationList(credentialIds, revokedIndices);

    expect(revocationList.merkleRoot).toBeTruthy();
    expect(revocationList.merkleRoot.length).toBe(64);
    expect(revocationList.totalCredentials).toBe(5);
    expect(revocationList.revokedCount).toBe(2);
    expect(revocationList.bitmap).toBeInstanceOf(Uint8Array);
    expect(revocationList.updatedAt).toBeInstanceOf(Date);
  });

  it('should check revocation status in list', () => {
    const credentialIds = ['vc-001', 'vc-002', 'vc-003', 'vc-004'];
    const revokedIndices = [0, 2];

    const revocationList = createRevocationList(credentialIds, revokedIndices);

    // Check revoked credentials
    expect(isRevoked('vc-001', 0, revocationList)).toBe(true);
    expect(isRevoked('vc-003', 2, revocationList)).toBe(true);

    // Check non-revoked credentials
    expect(isRevoked('vc-002', 1, revocationList)).toBe(false);
    expect(isRevoked('vc-004', 3, revocationList)).toBe(false);
  });

  it('should validate revocation list', () => {
    const credentialIds = ['vc-001', 'vc-002', 'vc-003'];
    const revokedIndices = [1];

    const revocationList = createRevocationList(credentialIds, revokedIndices);

    expect(validateRevocationList(revocationList)).toBe(true);
  });

  it('should reject invalid revocation list', () => {
    const credentialIds = ['vc-001', 'vc-002', 'vc-003'];
    const revokedIndices = [1];

    const revocationList = createRevocationList(credentialIds, revokedIndices);

    // Corrupt the merkle root
    revocationList.merkleRoot = 'invalid';
    expect(validateRevocationList(revocationList)).toBe(false);

    // Corrupt the revoked count
    const validList = createRevocationList(credentialIds, revokedIndices);
    validList.revokedCount = 999;
    expect(validateRevocationList(validList)).toBe(false);
  });

  it('should handle empty revocation list', () => {
    const credentialIds = ['vc-001', 'vc-002', 'vc-003'];
    const revokedIndices: number[] = [];

    const revocationList = createRevocationList(credentialIds, revokedIndices);

    expect(revocationList.revokedCount).toBe(0);
    expect(isRevoked('vc-001', 0, revocationList)).toBe(false);
    expect(validateRevocationList(revocationList)).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle large bitmap', () => {
    const totalSize = 10000;
    const revokedIndices = [0, 100, 1000, 5000, 9999];
    const bitmap = createRevocationBitmap(revokedIndices, totalSize);

    expect(bitmap.length).toBe(totalSize);
    expect(bitmap.setBits).toBe(revokedIndices.length);

    for (const index of revokedIndices) {
      expect(isRevokedInBitmap(bitmap, index)).toBe(true);
    }
  });

  it('should handle large Merkle tree', () => {
    const credentialIds = Array.from({ length: 1000 }, (_, i) => `vc-${i.toString().padStart(4, '0')}`);
    const hashes = credentialIds.map(id => hashCredentialId(id));

    const root = calculateMerkleRoot(hashes);
    expect(root).toBeTruthy();
    expect(root.length).toBe(64);
  });

  it('should handle boundary indices in bitmap', () => {
    const totalSize = 16; // Exactly 2 bytes
    const bitmap = createRevocationBitmap([0, 7, 8, 15], totalSize);

    expect(isRevokedInBitmap(bitmap, 0)).toBe(true);
    expect(isRevokedInBitmap(bitmap, 7)).toBe(true);
    expect(isRevokedInBitmap(bitmap, 8)).toBe(true);
    expect(isRevokedInBitmap(bitmap, 15)).toBe(true);
  });
});
