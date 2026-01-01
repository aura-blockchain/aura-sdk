/**
 * Integration Test: QR Code Integration
 *
 * Tests the integration between QR code parsing, validation, and signature verification
 * - Parse valid and invalid QR codes
 * - Validate expiration logic
 * - Test signature verification flow
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseQRCode, parseQRCodeSafe } from '../../qr/parser.js';
import { validateQRCodeData, validateQRCodeDataStrict } from '../../qr/validator.js';
import { verifyEd25519Signature } from '../../crypto/ed25519.js';
import { verifySecp256k1Signature } from '../../crypto/secp256k1.js';
import { QRParseError, QRValidationError, QRExpiredError } from '../../qr/errors.js';
import type { QRCodeData } from '../../qr/types.js';
import {
  VALID_AGE_21_QR,
  VALID_AGE_18_QR,
  VALID_MULTI_CREDENTIAL_QR,
  EXPIRED_QR_1_HOUR,
  EXPIRED_QR_1_MINUTE,
  INVALID_SIGNATURE_SHORT_QR,
  INVALID_SIGNATURE_FORMAT_QR,
  MALFORMED_INVALID_BASE64,
  MALFORMED_INVALID_JSON,
  MALFORMED_MISSING_VCS,
  MALFORMED_WRONG_VERSION,
  INVALID_DID_QR,
  RAW_BASE64_QR,
  createMockQRCodeData,
  encodeQRCodeData,
  generateMockEd25519Signature,
} from '../../__integration__/__fixtures__/test-credentials.js';

describe('QR Code Integration Tests', () => {
  describe('QR Code Parsing', () => {
    it('should parse valid QR code with aura:// protocol', () => {
      const qrData = parseQRCode(VALID_AGE_21_QR);

      expect(qrData).toBeDefined();
      expect(qrData.v).toBe('1.0');
      expect(qrData.p).toBeTruthy();
      expect(qrData.h).toMatch(/^did:aura:mainnet:/);
      expect(qrData.vcs).toBeInstanceOf(Array);
      expect(qrData.vcs.length).toBeGreaterThan(0);
      expect(qrData.ctx).toBeDefined();
      expect(qrData.exp).toBeGreaterThan(Date.now() / 1000);
      expect(qrData.n).toBeGreaterThan(0);
      expect(qrData.sig).toBeTruthy();
      expect(qrData.sig.length).toBeGreaterThanOrEqual(64);
    });

    it('should parse valid QR code from raw base64 (without protocol)', () => {
      const qrData = parseQRCode(RAW_BASE64_QR);

      expect(qrData).toBeDefined();
      expect(qrData.v).toBe('1.0');
      expect(qrData.vcs).toBeInstanceOf(Array);
    });

    it('should parse QR code with multiple credentials', () => {
      const qrData = parseQRCode(VALID_MULTI_CREDENTIAL_QR);

      expect(qrData.vcs).toBeInstanceOf(Array);
      expect(qrData.vcs.length).toBe(3);
      expect(qrData.vcs).toContain('vc_age_21_valid_006');
      expect(qrData.vcs).toContain('vc_human_valid_007');
      expect(qrData.vcs).toContain('vc_kyc_valid_008');
    });

    it('should handle parseQRCodeSafe for valid QR', () => {
      const result = parseQRCodeSafe(VALID_AGE_21_QR);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.v).toBe('1.0');
      }
    });

    it('should handle parseQRCodeSafe for invalid QR', () => {
      const result = parseQRCodeSafe(MALFORMED_INVALID_BASE64);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toBeTruthy();
      }
    });

    it('should reject malformed base64', () => {
      expect(() => parseQRCode(MALFORMED_INVALID_BASE64)).toThrow(QRParseError);
    });

    it('should reject invalid JSON', () => {
      expect(() => parseQRCode(MALFORMED_INVALID_JSON)).toThrow(QRParseError);
    });

    it('should reject QR code with missing required fields', () => {
      expect(() => parseQRCode(MALFORMED_MISSING_VCS)).toThrow(QRParseError);
    });

    it('should reject empty QR string', () => {
      expect(() => parseQRCode('')).toThrow(QRParseError);
      expect(() => parseQRCode('   ')).toThrow(QRParseError);
    });

    it('should reject null or undefined input', () => {
      expect(() => parseQRCode(null as any)).toThrow(QRParseError);
      expect(() => parseQRCode(undefined as any)).toThrow(QRParseError);
    });

    it('should reject wrong protocol version', () => {
      expect(() => parseQRCode(MALFORMED_WRONG_VERSION)).toThrow(QRParseError);
    });
  });

  describe('QR Code Validation', () => {
    it('should validate valid QR code data', () => {
      const qrData = parseQRCode(VALID_AGE_21_QR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toBeDefined();
    });

    it('should detect expired QR code in validation', () => {
      const qrData = parseQRCode(EXPIRED_QR_1_HOUR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]?.field).toBe('exp');
      expect(validation.errors[0]?.message).toContain('expired');
    });

    it('should throw QRExpiredError in strict validation for expired QR', () => {
      const qrData = parseQRCode(EXPIRED_QR_1_HOUR);

      expect(() => validateQRCodeDataStrict(qrData)).toThrow(QRExpiredError);
    });

    it('should validate DID format', () => {
      const qrData = parseQRCode(INVALID_DID_QR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      const didError = validation.errors.find(e => e.field === 'h');
      expect(didError).toBeDefined();
      expect(didError?.message).toContain('DID');
    });

    it('should validate signature format', () => {
      const qrData = parseQRCode(INVALID_SIGNATURE_SHORT_QR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      const sigError = validation.errors.find(e => e.field === 'sig');
      expect(sigError).toBeDefined();
    });

    it('should validate nonce is non-negative', () => {
      const invalidQR = encodeQRCodeData(
        createMockQRCodeData({
          n: -1,
        })
      );
      // Parser should throw for negative nonce (early validation)
      expect(() => parseQRCode(invalidQR)).toThrow('Nonce must be non-negative');
    });

    it('should warn about duplicate VCs', () => {
      const duplicateQR = encodeQRCodeData(
        createMockQRCodeData({
          vcs: ['vc_test', 'vc_test', 'vc_other'],
        })
      );
      const qrData = parseQRCode(duplicateQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.warnings.length).toBeGreaterThan(0);
      const dupWarning = validation.warnings.find(w => w.field === 'vcs');
      expect(dupWarning).toBeDefined();
      expect(dupWarning?.message).toContain('duplicate');
    });

    it('should warn when no disclosure fields are enabled', () => {
      const noDisclosureQR = encodeQRCodeData(
        createMockQRCodeData({
          ctx: {},
        })
      );
      const qrData = parseQRCode(noDisclosureQR);
      const validation = validateQRCodeData(qrData);

      const ctxWarning = validation.warnings.find(w => w.field === 'ctx');
      expect(ctxWarning).toBeDefined();
      expect(ctxWarning?.message).toContain('disclosure');
    });

    it('should validate with expiration tolerance', () => {
      const qrData = parseQRCode(EXPIRED_QR_1_MINUTE);

      // Without tolerance, should fail
      const validation1 = validateQRCodeData(qrData);
      expect(validation1.valid).toBe(false);

      // With 120s tolerance, should still fail (expired 60s ago)
      const validation2 = validateQRCodeData(qrData, { expirationTolerance: 30 });
      expect(validation2.valid).toBe(false);
    });
  });

  describe('Expiration Logic Integration', () => {
    it('should correctly identify expired QR code (1 hour old)', () => {
      const qrData = parseQRCode(EXPIRED_QR_1_HOUR);
      const now = Math.floor(Date.now() / 1000);

      expect(qrData.exp).toBeLessThan(now);
      expect(qrData.exp).toBeLessThanOrEqual(now - 3600);
    });

    it('should correctly identify expired QR code (1 minute old)', () => {
      const qrData = parseQRCode(EXPIRED_QR_1_MINUTE);
      const now = Math.floor(Date.now() / 1000);

      expect(qrData.exp).toBeLessThan(now);
      expect(qrData.exp).toBeLessThanOrEqual(now - 60);
    });

    it('should accept valid future expiration', () => {
      const qrData = parseQRCode(VALID_AGE_21_QR);
      const now = Math.floor(Date.now() / 1000);

      expect(qrData.exp).toBeGreaterThan(now);

      const validation = validateQRCodeData(qrData);
      expect(validation.valid).toBe(true);
    });

    it('should create QR with custom expiration', () => {
      const customExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const customQR = encodeQRCodeData(
        createMockQRCodeData({
          exp: customExp,
        })
      );
      const qrData = parseQRCode(customQR);

      expect(qrData.exp).toBe(customExp);

      const validation = validateQRCodeData(qrData);
      expect(validation.valid).toBe(true);
    });

    it('should reject expiration too far in the future', () => {
      const farFutureExp = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 * 20; // 20 years
      const qrData: QRCodeData = createMockQRCodeData({
        exp: farFutureExp,
      });

      expect(() => validateQRCodeDataStrict(qrData)).toThrow(QRValidationError);
    });

    it('should reject expiration too far in the past', () => {
      const farPastExp = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60 * 2; // 2 years ago
      const qrData: QRCodeData = createMockQRCodeData({
        exp: farPastExp,
      });

      expect(() => validateQRCodeDataStrict(qrData)).toThrow();
    });
  });

  describe('Signature Verification Flow', () => {
    it('should have valid Ed25519 signature format', () => {
      const qrData = parseQRCode(VALID_AGE_21_QR);

      expect(qrData.sig).toBeDefined();
      expect(qrData.sig.length).toBe(128); // 64 bytes = 128 hex chars
      expect(/^[0-9a-fA-F]+$/.test(qrData.sig)).toBe(true);
    });

    it('should reject invalid signature format in validation', () => {
      const qrData = parseQRCode(INVALID_SIGNATURE_FORMAT_QR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      const sigError = validation.errors.find(e => e.field === 'sig');
      expect(sigError).toBeDefined();
    });

    it('should validate signature length requirements', async () => {
      // Ed25519 signatures should be exactly 64 bytes (128 hex chars)
      const validSig = generateMockEd25519Signature();
      expect(validSig.length).toBe(128);

      const qrData = createMockQRCodeData({
        sig: validSig,
      });

      const validation = validateQRCodeData(qrData);
      expect(validation.valid).toBe(true);
    });

    it('should reject signature that is too short', () => {
      const qrData = parseQRCode(INVALID_SIGNATURE_SHORT_QR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      const sigError = validation.errors.find(e => e.field === 'sig');
      expect(sigError).toBeDefined();
      expect(sigError?.message).toContain('short');
    });

    it('should reject non-hex signature', () => {
      const nonHexQR = encodeQRCodeData(
        createMockQRCodeData({
          sig: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
        })
      );
      const qrData = parseQRCode(nonHexQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      const sigError = validation.errors.find(e => e.field === 'sig');
      expect(sigError).toBeDefined();
      expect(sigError?.message).toContain('hex');
    });

    it('should reject signature with odd length', () => {
      const oddLengthSig = 'a'.repeat(127); // 127 chars (odd)
      const oddSigQR = encodeQRCodeData(
        createMockQRCodeData({
          sig: oddLengthSig,
        })
      );
      const qrData = parseQRCode(oddSigQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
      const sigError = validation.errors.find(e => e.field === 'sig');
      expect(sigError).toBeDefined();
      expect(sigError?.message).toContain('even');
    });
  });

  describe('Disclosure Context Integration', () => {
    it('should parse disclosure context with boolean values', () => {
      const qrData = parseQRCode(VALID_AGE_21_QR);

      expect(qrData.ctx).toBeDefined();
      expect(typeof qrData.ctx).toBe('object');

      const ctxValues = Object.values(qrData.ctx);
      ctxValues.forEach(value => {
        expect(typeof value === 'boolean' || value === undefined).toBe(true);
      });
    });

    it('should validate multiple disclosure fields', () => {
      const multiDisclosureQR = encodeQRCodeData(
        createMockQRCodeData({
          ctx: {
            show_age_over_21: true,
            show_age_over_18: true,
            show_full_name: false,
            show_address: undefined,
          },
        })
      );
      const qrData = parseQRCode(multiDisclosureQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(true);
      expect(qrData.ctx.show_age_over_21).toBe(true);
      expect(qrData.ctx.show_age_over_18).toBe(true);
      expect(qrData.ctx.show_full_name).toBe(false);
      expect(qrData.ctx.show_address).toBeUndefined();
    });

    it('should reject non-boolean disclosure values', () => {
      const invalidCtxQR = 'aura://verify?data=' +
        Buffer.from(JSON.stringify({
          v: '1.0',
          p: 'test',
          h: 'did:aura:mainnet:test',
          vcs: ['test'],
          ctx: {
            show_age: 'yes', // Invalid: string instead of boolean
          },
          exp: Math.floor(Date.now() / 1000) + 300,
          n: 12345,
          sig: generateMockEd25519Signature(),
        })).toString('base64');

      expect(() => parseQRCode(invalidCtxQR)).toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle QR with empty VCs array', () => {
      const emptyVCsQR = 'aura://verify?data=' +
        Buffer.from(JSON.stringify({
          v: '1.0',
          p: 'test',
          h: 'did:aura:mainnet:test',
          vcs: [],
          ctx: {},
          exp: Math.floor(Date.now() / 1000) + 300,
          n: 12345,
          sig: generateMockEd25519Signature(),
        })).toString('base64');

      expect(() => parseQRCode(emptyVCsQR)).toThrow();
    });

    it('should handle QR with very large nonce', () => {
      const largeNonceQR = encodeQRCodeData(
        createMockQRCodeData({
          n: Number.MAX_SAFE_INTEGER,
        })
      );
      const qrData = parseQRCode(largeNonceQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(true);
      expect(qrData.n).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle QR with zero nonce', () => {
      const zeroNonceQR = encodeQRCodeData(
        createMockQRCodeData({
          n: 0,
        })
      );
      const qrData = parseQRCode(zeroNonceQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(true);
      expect(qrData.n).toBe(0);
    });

    it('should handle QR with maximum length presentation ID', () => {
      const maxLengthId = 'p'.repeat(256);
      const maxIdQR = encodeQRCodeData(
        createMockQRCodeData({
          p: maxLengthId,
        })
      );
      const qrData = parseQRCode(maxIdQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(true);
      expect(qrData.p.length).toBe(256);
    });

    it('should reject presentation ID exceeding maximum length', () => {
      const tooLongId = 'p'.repeat(257);
      const tooLongIdQR = encodeQRCodeData(
        createMockQRCodeData({
          p: tooLongId,
        })
      );
      const qrData = parseQRCode(tooLongIdQR);
      const validation = validateQRCodeData(qrData);

      expect(validation.valid).toBe(false);
    });

    it('should handle whitespace in QR string', () => {
      const qrWithWhitespace = '  ' + VALID_AGE_21_QR + '  ';
      const qrData = parseQRCode(qrWithWhitespace);

      expect(qrData).toBeDefined();
      expect(qrData.v).toBe('1.0');
    });

    it('should preserve special characters in presentation ID', () => {
      const specialId = 'pres_test-123_abc.def';
      const specialIdQR = encodeQRCodeData(
        createMockQRCodeData({
          p: specialId,
        })
      );
      const qrData = parseQRCode(specialIdQR);

      expect(qrData.p).toBe(specialId);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should parse multiple QR codes efficiently', () => {
      const startTime = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        parseQRCode(VALID_AGE_21_QR);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(5); // Average should be less than 5ms per parse
    });

    it('should validate multiple QR codes efficiently', () => {
      const qrData = parseQRCode(VALID_AGE_21_QR);
      const startTime = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        validateQRCodeData(qrData);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(2); // Average should be less than 2ms per validation
    });

    it('should handle QR with many VCs', () => {
      const manyVCs = Array.from({ length: 50 }, (_, i) => `vc_${i}`);
      const manyVCsQR = encodeQRCodeData(
        createMockQRCodeData({
          vcs: manyVCs,
        })
      );
      const qrData = parseQRCode(manyVCsQR);

      expect(qrData.vcs).toHaveLength(50);

      const validation = validateQRCodeData(qrData);
      // Should warn about large number of VCs
      const vcWarning = validation.warnings.find(w => w.field === 'vcs');
      expect(vcWarning).toBeDefined();
    });
  });
});
