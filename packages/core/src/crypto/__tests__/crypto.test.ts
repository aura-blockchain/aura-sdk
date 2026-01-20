/**
 * Comprehensive test suite for cryptographic verification module
 * Tests Ed25519, secp256k1, and unified signature verification
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';

/**
 * Helper to convert compact signature to DER format
 * DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
 */
function compactToDER(compact: Uint8Array): Uint8Array {
  const r = compact.slice(0, 32);
  const s = compact.slice(32, 64);

  // Add leading zero if high bit is set (to ensure positive integer)
  const rNeedsZero = r[0] >= 0x80;
  const sNeedsZero = s[0] >= 0x80;

  const rLen = 32 + (rNeedsZero ? 1 : 0);
  const sLen = 32 + (sNeedsZero ? 1 : 0);
  const totalLen = 2 + rLen + 2 + sLen;

  const der = new Uint8Array(2 + totalLen);
  let pos = 0;

  // Sequence tag and length
  der[pos++] = 0x30;
  der[pos++] = totalLen;

  // R integer
  der[pos++] = 0x02;
  der[pos++] = rLen;
  if (rNeedsZero) der[pos++] = 0x00;
  der.set(r, pos);
  pos += 32;

  // S integer
  der[pos++] = 0x02;
  der[pos++] = sLen;
  if (sNeedsZero) der[pos++] = 0x00;
  der.set(s, pos);

  return der;
}

import {
  // Hash functions
  sha256Hash,
  sha256HashHex,
  doubleSha256,
  doubleSha256Hex,
  hexToUint8Array,
  uint8ArrayToHex,
  hashObject,
  hashObjectHex,
  isValidHex,
  // Ed25519
  verifyEd25519Signature,
  verifyEd25519SignatureSync,
  isValidEd25519PublicKey,
  isValidEd25519Signature,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
  // secp256k1
  verifySecp256k1Signature,
  verifySecp256k1SignatureSync,
  compressPublicKey,
  decompressPublicKey,
  isValidSecp256k1PublicKey,
  isValidSecp256k1Signature,
  SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH,
  // Unified verification
  SignatureAlgorithm,
  verifySignature,
  verifySignatureSync,
  verifyCosmosSignature,
  verifySignatureBatch,
  detectSignatureAlgorithm,
  isValidPublicKey,
  isValidSignature,
  getSupportedAlgorithms,
} from '../index';

describe('Hash Utilities', () => {
  const testMessage = 'Hello, Aura!';
  const testMessageBytes = new TextEncoder().encode(testMessage);

  it('should compute SHA-256 hash from string', () => {
    const hash = sha256Hash(testMessage);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should compute SHA-256 hash from Uint8Array', () => {
    const hash = sha256Hash(testMessageBytes);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should compute SHA-256 hash as hex string', () => {
    const hashHex = sha256HashHex(testMessage);
    expect(typeof hashHex).toBe('string');
    expect(hashHex.length).toBe(64); // 32 bytes = 64 hex chars
    expect(isValidHex(hashHex, 32)).toBe(true);
  });

  it('should compute double SHA-256 hash', () => {
    const hash = doubleSha256(testMessage);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);

    // Verify it's actually double hashing
    const firstHash = sha256Hash(testMessage);
    const expectedDoubleHash = sha256Hash(firstHash);
    expect(uint8ArrayToHex(hash)).toBe(uint8ArrayToHex(expectedDoubleHash));
  });

  it('should compute double SHA-256 hash as hex', () => {
    const hashHex = doubleSha256Hex(testMessage);
    expect(typeof hashHex).toBe('string');
    expect(hashHex.length).toBe(64);
  });

  it('should convert hex to Uint8Array', () => {
    const hex = 'deadbeef';
    const bytes = hexToUint8Array(hex);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(4);
    expect(bytes[0]).toBe(0xde);
    expect(bytes[1]).toBe(0xad);
    expect(bytes[2]).toBe(0xbe);
    expect(bytes[3]).toBe(0xef);
  });

  it('should handle hex with 0x prefix', () => {
    const hex = '0xdeadbeef';
    const bytes = hexToUint8Array(hex);
    expect(bytes.length).toBe(4);
    expect(bytes[0]).toBe(0xde);
  });

  it('should convert Uint8Array to hex', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = uint8ArrayToHex(bytes);
    expect(hex).toBe('deadbeef');
  });

  it('should hash JSON objects', () => {
    const obj = { chain_id: 'aura-1', account_number: '123', sequence: '0' };
    const hash = hashObject(obj);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should hash JSON objects to hex', () => {
    const obj = { chain_id: 'aura-1', account_number: '123', sequence: '0' };
    const hashHex = hashObjectHex(obj);
    expect(typeof hashHex).toBe('string');
    expect(hashHex.length).toBe(64);
  });

  it('should validate hex strings', () => {
    expect(isValidHex('deadbeef')).toBe(true);
    expect(isValidHex('0xdeadbeef')).toBe(true);
    expect(isValidHex('DEADBEEF')).toBe(true);
    expect(isValidHex('xyz')).toBe(false);
    expect(isValidHex('dead')).toBe(true);
    expect(isValidHex('dea')).toBe(false); // Odd length
  });

  it('should validate hex string with expected length', () => {
    expect(isValidHex('deadbeef', 4)).toBe(true);
    expect(isValidHex('deadbeef', 5)).toBe(false);
    expect(isValidHex('0xdeadbeef', 4)).toBe(true);
  });

  it('should handle empty input gracefully', () => {
    const hash = sha256Hash('');
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should throw error for invalid hex string', () => {
    expect(() => hexToUint8Array('xyz')).toThrow();
  });
});

describe('Ed25519 Signature Verification', () => {
  let privateKey: Uint8Array;
  let publicKey: Uint8Array;
  let publicKeyHex: string;
  const testMessage = 'Test message for Ed25519';
  const testMessageBytes = new TextEncoder().encode(testMessage);

  beforeAll(async () => {
    // Generate a test key pair
    privateKey = ed25519.utils.randomPrivateKey();
    publicKey = await ed25519.getPublicKey(privateKey);
    publicKeyHex = uint8ArrayToHex(publicKey);
  });

  it('should verify valid Ed25519 signature', async () => {
    const signature = await ed25519.sign(testMessageBytes, privateKey);
    const isValid = await verifyEd25519Signature(signature, testMessage, publicKey);
    expect(isValid).toBe(true);
  });

  it('should verify valid Ed25519 signature with hex inputs', async () => {
    const signature = await ed25519.sign(testMessageBytes, privateKey);
    const signatureHex = uint8ArrayToHex(signature);
    const isValid = await verifyEd25519Signature(signatureHex, testMessage, publicKeyHex);
    expect(isValid).toBe(true);
  });

  it('should verify Ed25519 signature synchronously', async () => {
    const signature = await ed25519.sign(testMessageBytes, privateKey);
    const isValid = verifyEd25519SignatureSync(signature, testMessage, publicKey);
    expect(isValid).toBe(true);
  });

  it('should reject invalid Ed25519 signature', async () => {
    const signature = await ed25519.sign(testMessageBytes, privateKey);
    const wrongMessage = 'Wrong message';
    const isValid = await verifyEd25519Signature(signature, wrongMessage, publicKey);
    expect(isValid).toBe(false);
  });

  it('should reject signature with wrong public key', async () => {
    const signature = await ed25519.sign(testMessageBytes, privateKey);
    const wrongPrivateKey = ed25519.utils.randomPrivateKey();
    const wrongPublicKey = await ed25519.getPublicKey(wrongPrivateKey);
    const isValid = await verifyEd25519Signature(signature, testMessage, wrongPublicKey);
    expect(isValid).toBe(false);
  });

  it('should verify signature for JSON object', async () => {
    const obj = { chain_id: 'aura-1', data: 'test' };
    const objHash = sha256Hash(JSON.stringify(obj));
    const signature = await ed25519.sign(objHash, privateKey);
    const isValid = await verifyEd25519Signature(signature, obj, publicKey);
    expect(isValid).toBe(true);
  });

  it('should validate Ed25519 public key format', () => {
    expect(isValidEd25519PublicKey(publicKey)).toBe(true);
    expect(isValidEd25519PublicKey(publicKeyHex)).toBe(true);
    expect(isValidEd25519PublicKey('invalid')).toBe(false);
    expect(isValidEd25519PublicKey(new Uint8Array(16))).toBe(false); // Wrong length
  });

  it('should validate Ed25519 signature format', async () => {
    const signature = await ed25519.sign(testMessageBytes, privateKey);
    expect(isValidEd25519Signature(signature)).toBe(true);
    expect(isValidEd25519Signature(uint8ArrayToHex(signature))).toBe(true);
    expect(isValidEd25519Signature('invalid')).toBe(false);
    expect(isValidEd25519Signature(new Uint8Array(32))).toBe(false); // Wrong length
  });

  it('should handle malformed signature gracefully', async () => {
    const malformedSignature = new Uint8Array(64); // All zeros
    const isValid = await verifyEd25519Signature(malformedSignature, testMessage, publicKey);
    expect(isValid).toBe(false);
  });

  it('should handle empty message', async () => {
    const emptyBytes = new TextEncoder().encode('');
    const signature = await ed25519.sign(emptyBytes, privateKey);
    const isValid = await verifyEd25519Signature(signature, '', publicKey);
    expect(isValid).toBe(true);
  });

  it('should reject signature with invalid length', async () => {
    const invalidSignature = new Uint8Array(32); // Wrong length
    const isValid = await verifyEd25519Signature(invalidSignature, testMessage, publicKey);
    expect(isValid).toBe(false);
  });
});

describe('secp256k1 Signature Verification', () => {
  let privateKey: Uint8Array;
  let publicKeyCompressed: Uint8Array;
  let publicKeyUncompressed: Uint8Array;
  let publicKeyCompressedHex: string;
  const testMessage = 'Test message for secp256k1';
  const testMessageBytes = new TextEncoder().encode(testMessage);
  const messageHash = sha256Hash(testMessageBytes);

  beforeAll(() => {
    // Generate a test key pair
    privateKey = secp256k1.utils.randomPrivateKey();
    publicKeyUncompressed = secp256k1.getPublicKey(privateKey, false); // Uncompressed
    publicKeyCompressed = secp256k1.getPublicKey(privateKey, true); // Compressed
    publicKeyCompressedHex = uint8ArrayToHex(publicKeyCompressed);
  });

  it('should verify valid secp256k1 signature with compressed key', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const isValid = await verifySecp256k1Signature(
      signatureBytes,
      testMessage,
      publicKeyCompressed
    );
    expect(isValid).toBe(true);
  });

  it('should verify valid secp256k1 signature with uncompressed key', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const isValid = await verifySecp256k1Signature(
      signatureBytes,
      testMessage,
      publicKeyUncompressed
    );
    expect(isValid).toBe(true);
  });

  it('should verify secp256k1 signature with hex inputs', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const signatureHex = uint8ArrayToHex(signatureBytes);
    const isValid = await verifySecp256k1Signature(
      signatureHex,
      testMessage,
      publicKeyCompressedHex
    );
    expect(isValid).toBe(true);
  });

  it('should verify secp256k1 signature synchronously', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const isValid = verifySecp256k1SignatureSync(signatureBytes, testMessage, publicKeyCompressed);
    expect(isValid).toBe(true);
  });

  it('should verify DER encoded signature', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const compactSig = signature.toCompactRawBytes();
    const derSignature = compactToDER(compactSig);
    const isValid = await verifySecp256k1Signature(derSignature, testMessage, publicKeyCompressed, {
      isDER: true,
    });
    expect(isValid).toBe(true);
  });

  it('should auto-detect DER signature', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const compactSig = signature.toCompactRawBytes();
    const derSignature = compactToDER(compactSig);
    const isValid = await verifySecp256k1Signature(derSignature, testMessage, publicKeyCompressed);
    expect(isValid).toBe(true);
  });

  it('should reject invalid secp256k1 signature', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const wrongMessage = 'Wrong message';
    const isValid = await verifySecp256k1Signature(
      signatureBytes,
      wrongMessage,
      publicKeyCompressed
    );
    expect(isValid).toBe(false);
  });

  it('should reject signature with wrong public key', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const wrongPrivateKey = secp256k1.utils.randomPrivateKey();
    const wrongPublicKey = secp256k1.getPublicKey(wrongPrivateKey, true);
    const isValid = await verifySecp256k1Signature(signatureBytes, testMessage, wrongPublicKey);
    expect(isValid).toBe(false);
  });

  it('should compress public key', () => {
    const compressed = compressPublicKey(publicKeyUncompressed);
    expect(compressed.length).toBe(SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH);
    expect(uint8ArrayToHex(compressed)).toBe(uint8ArrayToHex(publicKeyCompressed));
  });

  it('should decompress public key', () => {
    const decompressed = decompressPublicKey(publicKeyCompressed);
    expect(decompressed.length).toBe(SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH);
    expect(uint8ArrayToHex(decompressed)).toBe(uint8ArrayToHex(publicKeyUncompressed));
  });

  it('should validate secp256k1 public key format', () => {
    expect(isValidSecp256k1PublicKey(publicKeyCompressed)).toBe(true);
    expect(isValidSecp256k1PublicKey(publicKeyUncompressed)).toBe(true);
    expect(isValidSecp256k1PublicKey(publicKeyCompressedHex)).toBe(true);
    expect(isValidSecp256k1PublicKey('invalid')).toBe(false);
    expect(isValidSecp256k1PublicKey(new Uint8Array(32))).toBe(false); // Wrong length
  });

  it('should validate secp256k1 signature format', async () => {
    const signature = await secp256k1.sign(messageHash, privateKey);
    const compactSig = signature.toCompactRawBytes();
    const derSig = compactToDER(compactSig);

    expect(isValidSecp256k1Signature(compactSig)).toBe(true);
    expect(isValidSecp256k1Signature(derSig)).toBe(true);
    expect(isValidSecp256k1Signature('invalid')).toBe(false);
    expect(isValidSecp256k1Signature(new Uint8Array(32))).toBe(false); // Wrong length
  });

  it('should handle malformed signature gracefully', async () => {
    const malformedSignature = new Uint8Array(64); // All zeros
    const isValid = await verifySecp256k1Signature(
      malformedSignature,
      testMessage,
      publicKeyCompressed
    );
    expect(isValid).toBe(false);
  });

  it('should verify without hashing when hashMessage is false', async () => {
    // Sign the already-hashed message
    const signature = await secp256k1.sign(messageHash, privateKey);
    const signatureBytes = signature.toCompactRawBytes();

    // Verify with hashMessage: false
    const isValid = await verifySecp256k1Signature(
      signatureBytes,
      messageHash,
      publicKeyCompressed,
      {
        hashMessage: false,
      }
    );
    expect(isValid).toBe(true);
  });
});

describe('Unified Signature Verification', () => {
  let ed25519PrivateKey: Uint8Array;
  let ed25519PublicKey: Uint8Array;
  let secp256k1PrivateKey: Uint8Array;
  let secp256k1PublicKey: Uint8Array;
  const testMessage = 'Unified signature test';
  const testMessageBytes = new TextEncoder().encode(testMessage);

  beforeAll(async () => {
    // Generate Ed25519 key pair
    ed25519PrivateKey = ed25519.utils.randomPrivateKey();
    ed25519PublicKey = await ed25519.getPublicKey(ed25519PrivateKey);

    // Generate secp256k1 key pair
    secp256k1PrivateKey = secp256k1.utils.randomPrivateKey();
    secp256k1PublicKey = secp256k1.getPublicKey(secp256k1PrivateKey, true);
  });

  it('should detect Ed25519 algorithm from public key', () => {
    const algorithm = detectSignatureAlgorithm(ed25519PublicKey);
    expect(algorithm).toBe(SignatureAlgorithm.ED25519);
  });

  it('should detect secp256k1 algorithm from compressed public key', () => {
    const algorithm = detectSignatureAlgorithm(secp256k1PublicKey);
    expect(algorithm).toBe(SignatureAlgorithm.SECP256K1);
  });

  it('should detect secp256k1 algorithm from uncompressed public key', () => {
    const uncompressedKey = secp256k1.getPublicKey(secp256k1PrivateKey, false);
    const algorithm = detectSignatureAlgorithm(uncompressedKey);
    expect(algorithm).toBe(SignatureAlgorithm.SECP256K1);
  });

  it('should return null for invalid public key length', () => {
    const invalidKey = new Uint8Array(16);
    const algorithm = detectSignatureAlgorithm(invalidKey);
    expect(algorithm).toBe(null);
  });

  it('should verify Ed25519 signature with auto-detection', async () => {
    const signature = await ed25519.sign(testMessageBytes, ed25519PrivateKey);
    const result = await verifySignature(signature, testMessage, ed25519PublicKey);
    expect(result.valid).toBe(true);
    expect(result.algorithm).toBe(SignatureAlgorithm.ED25519);
    expect(result.error).toBeUndefined();
  });

  it('should verify secp256k1 signature with auto-detection', async () => {
    const messageHash = sha256Hash(testMessageBytes);
    const signature = await secp256k1.sign(messageHash, secp256k1PrivateKey);
    const signatureBytes = signature.toCompactRawBytes();
    const result = await verifySignature(signatureBytes, testMessage, secp256k1PublicKey);
    expect(result.valid).toBe(true);
    expect(result.algorithm).toBe(SignatureAlgorithm.SECP256K1);
    expect(result.error).toBeUndefined();
  });

  it('should verify signature synchronously', async () => {
    const signature = await ed25519.sign(testMessageBytes, ed25519PrivateKey);
    const result = verifySignatureSync(signature, testMessage, ed25519PublicKey);
    expect(result.valid).toBe(true);
    expect(result.algorithm).toBe(SignatureAlgorithm.ED25519);
  });

  it('should verify with explicit algorithm', async () => {
    const signature = await ed25519.sign(testMessageBytes, ed25519PrivateKey);
    const result = await verifySignature(signature, testMessage, ed25519PublicKey, {
      algorithm: SignatureAlgorithm.ED25519,
    });
    expect(result.valid).toBe(true);
    expect(result.algorithm).toBe(SignatureAlgorithm.ED25519);
  });

  it('should validate public key for any algorithm', () => {
    expect(isValidPublicKey(ed25519PublicKey)).toBe(true);
    expect(isValidPublicKey(secp256k1PublicKey)).toBe(true);
    expect(isValidPublicKey(new Uint8Array(16))).toBe(false);
  });

  it('should validate public key for specific algorithm', () => {
    expect(isValidPublicKey(ed25519PublicKey, SignatureAlgorithm.ED25519)).toBe(true);
    expect(isValidPublicKey(ed25519PublicKey, SignatureAlgorithm.SECP256K1)).toBe(false);
    expect(isValidPublicKey(secp256k1PublicKey, SignatureAlgorithm.SECP256K1)).toBe(true);
    expect(isValidPublicKey(secp256k1PublicKey, SignatureAlgorithm.ED25519)).toBe(false);
  });

  it('should validate signature format', async () => {
    const ed25519Sig = await ed25519.sign(testMessageBytes, ed25519PrivateKey);
    const messageHash = sha256Hash(testMessageBytes);
    const secp256k1Sig = await secp256k1.sign(messageHash, secp256k1PrivateKey);

    expect(isValidSignature(ed25519Sig)).toBe(true);
    expect(isValidSignature(secp256k1Sig.toCompactRawBytes())).toBe(true);
    expect(isValidSignature(new Uint8Array(16))).toBe(false);
  });

  it('should verify Cosmos signature', async () => {
    const signDoc = {
      chain_id: 'aura-1',
      account_number: '123',
      sequence: '0',
      fee: { amount: [], gas: '200000' },
      msgs: [{ type: 'test', value: 'data' }],
    };

    const signDocJson = JSON.stringify(signDoc);
    const signDocBytes = new TextEncoder().encode(signDocJson);
    const signature = await ed25519.sign(signDocBytes, ed25519PrivateKey);

    const result = await verifyCosmosSignature(signature, signDoc, ed25519PublicKey);
    expect(result.valid).toBe(true);
  });

  it('should verify batch signatures', async () => {
    const sig1 = await ed25519.sign(testMessageBytes, ed25519PrivateKey);

    const messageHash = sha256Hash(testMessageBytes);
    const sig2 = await secp256k1.sign(messageHash, secp256k1PrivateKey);
    const sig2Bytes = sig2.toCompactRawBytes();

    const results = await verifySignatureBatch([
      { signature: sig1, message: testMessage, publicKey: ed25519PublicKey },
      { signature: sig2Bytes, message: testMessage, publicKey: secp256k1PublicKey },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].valid).toBe(true);
    expect(results[0].algorithm).toBe(SignatureAlgorithm.ED25519);
    expect(results[1].valid).toBe(true);
    expect(results[1].algorithm).toBe(SignatureAlgorithm.SECP256K1);
  });

  it('should get supported algorithms info', () => {
    const algorithms = getSupportedAlgorithms();
    expect(algorithms).toHaveLength(2);

    const ed25519Info = algorithms.find((a) => a.algorithm === SignatureAlgorithm.ED25519);
    expect(ed25519Info).toBeDefined();
    expect(ed25519Info?.publicKeyLengths).toEqual([ED25519_PUBLIC_KEY_LENGTH]);
    expect(ed25519Info?.signatureLengths).toEqual([ED25519_SIGNATURE_LENGTH]);

    const secp256k1Info = algorithms.find((a) => a.algorithm === SignatureAlgorithm.SECP256K1);
    expect(secp256k1Info).toBeDefined();
    expect(secp256k1Info?.publicKeyLengths).toContain(SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH);
    expect(secp256k1Info?.publicKeyLengths).toContain(SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH);
  });

  it('should handle verification errors gracefully', async () => {
    const invalidPublicKey = new Uint8Array(16);
    const signature = await ed25519.sign(testMessageBytes, ed25519PrivateKey);

    const result = await verifySignature(signature, testMessage, invalidPublicKey);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle invalid public key length gracefully', async () => {
    // 31-byte public key is invalid (Ed25519 needs 32 bytes)
    const result = await verifySignature(
      new Uint8Array(64),
      'test',
      new Uint8Array(31) // Invalid length
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle empty strings', () => {
    const hash = sha256Hash('');
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should handle empty objects', () => {
    const hash = hashObject({});
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should handle very long messages', async () => {
    const longMessage = 'a'.repeat(10000);
    const hash = sha256Hash(longMessage);
    expect(hash.length).toBe(32);
  });

  it('should handle malformed hex strings', () => {
    expect(() => hexToUint8Array('not-hex')).toThrow();
    expect(() => hexToUint8Array('gg')).toThrow();
  });

  it('should handle complex nested objects', () => {
    const complexObj = {
      level1: {
        level2: {
          level3: {
            array: [1, 2, 3],
            string: 'test',
            number: 42,
            boolean: true,
            null: null,
          },
        },
      },
    };

    const hash = hashObject(complexObj);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should handle Unicode characters', () => {
    const unicodeMessage = '🔐 Secure message with emoji 中文 العربية';
    const hash = sha256Hash(unicodeMessage);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should handle Buffer input', () => {
    const buffer = Buffer.from('test message');
    const hash = sha256Hash(buffer);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('should consistently hash same content', () => {
    const message = 'consistent message';
    const hash1 = sha256HashHex(message);
    const hash2 = sha256HashHex(message);
    const hash3 = sha256HashHex(message);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should produce different hashes for different content', () => {
    const hash1 = sha256HashHex('message1');
    const hash2 = sha256HashHex('message2');

    expect(hash1).not.toBe(hash2);
  });
});
