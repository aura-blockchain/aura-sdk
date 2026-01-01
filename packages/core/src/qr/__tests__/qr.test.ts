/**
 * Comprehensive tests for QR Code Module
 *
 * Tests parsing, validation, and error handling for Aura QR codes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseQRCode,
  parseQRCodeSafe,
  validateQRCodeData,
  validateQRCodeDataStrict,
  parseAndValidateQRCode,
  parseAndValidateQRCodeSafe,
  QRParseError,
  QRValidationError,
  QRExpiredError,
  type QRCodeData,
} from '../index.js';

/**
 * Test Fixtures
 */

// Valid QR code data
const validQRData: QRCodeData = {
  v: '1.0',
  p: 'presentation-123',
  h: 'did:aura:mainnet:abc123def456',
  vcs: ['vc-id-1', 'vc-id-2'],
  ctx: {
    show_full_name: true,
    show_age_over_18: true,
    show_city_state: false,
  },
  exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
  n: 123456789,
  sig: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
};

// Expired QR code data
const expiredQRData: QRCodeData = {
  ...validQRData,
  exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
};

// Helper function to encode QR data to base64
function encodeQRData(data: QRCodeData): string {
  const jsonString = JSON.stringify(data);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(jsonString, 'utf-8').toString('base64');
  } else {
    return btoa(jsonString);
  }
}

// Helper function to create full QR URL
function createQRURL(data: QRCodeData): string {
  const base64 = encodeQRData(data);
  // URL-encode the base64 to handle +/= characters properly
  return `aura://verify?data=${encodeURIComponent(base64)}`;
}

describe('QR Code Parser', () => {
  describe('parseQRCode', () => {
    it('should parse valid QR code URL format', () => {
      const qrURL = createQRURL(validQRData);
      const parsed = parseQRCode(qrURL);

      expect(parsed).toEqual(validQRData);
      expect(parsed.v).toBe('1.0');
      expect(parsed.p).toBe('presentation-123');
      expect(parsed.h).toBe('did:aura:mainnet:abc123def456');
      expect(parsed.vcs).toEqual(['vc-id-1', 'vc-id-2']);
      expect(parsed.ctx.show_full_name).toBe(true);
      expect(parsed.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(parsed.n).toBe(123456789);
      expect(parsed.sig).toBeTruthy();
    });

    it('should parse valid QR code from raw base64', () => {
      const base64 = encodeQRData(validQRData);
      const parsed = parseQRCode(base64);

      expect(parsed).toEqual(validQRData);
    });

    it('should handle base64 with whitespace', () => {
      const base64 = encodeQRData(validQRData);
      const withWhitespace = `  ${base64}  \n`;
      const parsed = parseQRCode(withWhitespace);

      expect(parsed).toEqual(validQRData);
    });

    it('should throw error for empty string', () => {
      expect(() => parseQRCode('')).toThrow(QRParseError);
      expect(() => parseQRCode('   ')).toThrow(QRParseError);
    });

    it('should throw error for invalid URL format', () => {
      expect(() => parseQRCode('aura://invalid')).toThrow(QRParseError);
      expect(() => parseQRCode('aura://verify')).toThrow(QRParseError);
      expect(() => parseQRCode('aura://verify?')).toThrow(QRParseError);
      expect(() => parseQRCode('aura://verify?data=')).toThrow(QRParseError);
    });

    it('should throw error for invalid base64', () => {
      expect(() => parseQRCode('invalid-base64!!!')).toThrow(QRParseError);
      expect(() => parseQRCode('aura://verify?data=invalid!!!')).toThrow(QRParseError);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJSON = Buffer.from('not valid json', 'utf-8').toString('base64');
      expect(() => parseQRCode(invalidJSON)).toThrow(QRParseError);
    });

    it('should throw error for missing required fields', () => {
      const incompleteData = {
        v: '1.0',
        p: 'presentation-123',
        // Missing other required fields
      };
      const base64 = encodeQRData(incompleteData as any);
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw error for wrong field types', () => {
      const wrongTypes = {
        ...validQRData,
        vcs: 'not-an-array', // Should be array
      };
      const base64 = encodeQRData(wrongTypes as any);
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw error for invalid disclosure context', () => {
      const invalidCtx = {
        ...validQRData,
        ctx: {
          show_full_name: 'yes', // Should be boolean
        },
      };
      const base64 = encodeQRData(invalidCtx as any);
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw error for unsupported version in strict mode', () => {
      const unsupportedVersion = {
        ...validQRData,
        v: '2.0',
      };
      const base64 = encodeQRData(unsupportedVersion);
      expect(() => parseQRCode(base64, { strict: true })).toThrow(QRParseError);
    });

    it('should throw error for empty arrays in strict mode', () => {
      const emptyVCs = {
        ...validQRData,
        vcs: [],
      };
      const base64 = encodeQRData(emptyVCs);
      expect(() => parseQRCode(base64, { strict: true })).toThrow(QRParseError);
    });

    it('should throw error for negative nonce in strict mode', () => {
      const negativeNonce = {
        ...validQRData,
        n: -1,
      };
      const base64 = encodeQRData(negativeNonce);
      expect(() => parseQRCode(base64, { strict: true })).toThrow(QRParseError);
    });

    it('should throw error for invalid expiration in strict mode', () => {
      const invalidExp = {
        ...validQRData,
        exp: -1,
      };
      const base64 = encodeQRData(invalidExp);
      expect(() => parseQRCode(base64, { strict: true })).toThrow(QRParseError);
    });

    it('should allow custom supported versions', () => {
      const customVersion = {
        ...validQRData,
        v: '2.0',
      };
      const base64 = encodeQRData(customVersion);
      const parsed = parseQRCode(base64, {
        strict: true,
        supportedVersions: ['1.0', '2.0'],
      });
      expect(parsed.v).toBe('2.0');
    });
  });

  describe('parseQRCodeSafe', () => {
    it('should return success for valid QR code', () => {
      const qrURL = createQRURL(validQRData);
      const result = parseQRCodeSafe(qrURL);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validQRData);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid QR code', () => {
      const result = parseQRCodeSafe('invalid-qr-code');

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeTruthy();
      expect(typeof result.error).toBe('string');
    });
  });
});

describe('QR Code Validator', () => {
  describe('validateQRCodeData', () => {
    it('should validate correct QR data', () => {
      const result = validateQRCodeData(validQRData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect expired QR code', () => {
      const result = validateQRCodeData(expiredQRData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('exp');
      expect(result.errors[0].severity).toBe('error');
    });

    it('should skip expiration check when disabled', () => {
      const result = validateQRCodeData(expiredQRData, {
        checkExpiration: false,
      });

      expect(result.valid).toBe(true);
    });

    it('should allow expiration tolerance', () => {
      const recentlyExpired = {
        ...validQRData,
        exp: Math.floor(Date.now() / 1000) - 30, // Expired 30 seconds ago
      };

      const strictResult = validateQRCodeData(recentlyExpired);
      expect(strictResult.valid).toBe(false);

      const tolerantResult = validateQRCodeData(recentlyExpired, {
        expirationTolerance: 60, // 60 seconds tolerance
      });
      expect(tolerantResult.valid).toBe(true);
    });

    it('should detect invalid protocol version', () => {
      const invalidVersion = {
        ...validQRData,
        v: '99.0',
      };

      const result = validateQRCodeData(invalidVersion);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'v')).toBe(true);
    });

    it('should detect invalid DID format', () => {
      const invalidDID = {
        ...validQRData,
        h: 'not-a-valid-did',
      };

      const result = validateQRCodeData(invalidDID);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'h')).toBe(true);
    });

    it('should accept valid DID formats', () => {
      const validDIDs = [
        'did:aura:mainnet:abc123',
        'did:aura:testnet:xyz789',
        'did:aura:devnet:test-id_123',
        'did:aura:mainnet:a1b2c3d4e5f6',
      ];

      for (const did of validDIDs) {
        const data = { ...validQRData, h: did };
        const result = validateQRCodeData(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should detect invalid DID components', () => {
      const invalidDIDs = [
        'did:invalid:mainnet:abc123', // Wrong method
        'did:aura::abc123', // Missing network
        'did:aura:mainnet:', // Missing identifier
        'aura:mainnet:abc123', // Missing 'did:' prefix
      ];

      for (const did of invalidDIDs) {
        const data = { ...validQRData, h: did };
        const result = validateQRCodeData(data);
        expect(result.valid).toBe(false);
      }
    });

    it('should skip DID validation when disabled', () => {
      const invalidDID = {
        ...validQRData,
        h: 'not-a-valid-did',
      };

      const result = validateQRCodeData(invalidDID, {
        validateDID: false,
      });

      expect(result.valid).toBe(true);
    });

    it('should detect empty VC array', () => {
      const emptyVCs = {
        ...validQRData,
        vcs: [],
      };

      const result = validateQRCodeData(emptyVCs);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'vcs')).toBe(true);
    });

    it('should detect empty VC IDs', () => {
      const emptyVCId = {
        ...validQRData,
        vcs: ['vc-1', '', 'vc-3'],
      };

      const result = validateQRCodeData(emptyVCId);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'vcs[1]')).toBe(true);
    });

    it('should warn about duplicate VCs', () => {
      const duplicateVCs = {
        ...validQRData,
        vcs: ['vc-1', 'vc-2', 'vc-1'],
      };

      const result = validateQRCodeData(duplicateVCs);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.field === 'vcs')).toBe(true);
    });

    it('should warn about too many VCs', () => {
      const manyVCs = {
        ...validQRData,
        vcs: Array.from({ length: 15 }, (_, i) => `vc-${i}`),
      };

      const result = validateQRCodeData(manyVCs);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should detect invalid disclosure context types', () => {
      const invalidCtx = {
        ...validQRData,
        ctx: {
          show_full_name: 'yes' as any, // Should be boolean
        },
      };

      const result = validateQRCodeData(invalidCtx);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'ctx.show_full_name')).toBe(true);
    });

    it('should warn when no disclosure fields are enabled', () => {
      const noDisclosure = {
        ...validQRData,
        ctx: {
          show_full_name: false,
          show_age_over_18: false,
        },
      };

      const result = validateQRCodeData(noDisclosure);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.field === 'ctx')).toBe(true);
    });

    it('should detect invalid nonce', () => {
      const invalidNonces = [
        { ...validQRData, n: -1 },
        { ...validQRData, n: 1.5 },
        { ...validQRData, n: NaN },
        { ...validQRData, n: Infinity },
      ];

      for (const data of invalidNonces) {
        const result = validateQRCodeData(data);
        expect(result.valid).toBe(false);
      }
    });

    it('should detect invalid signature format', () => {
      const invalidSignatures = [
        '', // Empty
        'not-hex', // Not hexadecimal
        'abcd', // Too short
        'ab', // Too short
        'abc', // Odd length
      ];

      for (const sig of invalidSignatures) {
        const data = { ...validQRData, sig };
        const result = validateQRCodeData(data);
        expect(result.valid).toBe(false);
      }
    });

    it('should accept valid signature formats', () => {
      const validSignatures = [
        'a'.repeat(128), // Ed25519 signature (64 bytes)
        'b'.repeat(140), // ECDSA signature (70 bytes)
        'c'.repeat(144), // ECDSA signature (72 bytes)
        'ABCDEF1234567890'.repeat(8), // Mixed case hex
      ];

      for (const sig of validSignatures) {
        const data = { ...validQRData, sig };
        const result = validateQRCodeData(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should skip signature validation when disabled', () => {
      const invalidSig = {
        ...validQRData,
        sig: 'not-hex',
      };

      const result = validateQRCodeData(invalidSig, {
        validateSignature: false,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validateQRCodeDataStrict', () => {
    it('should pass for valid QR data', () => {
      expect(() => validateQRCodeDataStrict(validQRData)).not.toThrow();
    });

    it('should throw QRExpiredError for expired QR code', () => {
      expect(() => validateQRCodeDataStrict(expiredQRData)).toThrow(QRExpiredError);
    });

    it('should throw QRValidationError for invalid data', () => {
      const invalidData = {
        ...validQRData,
        h: 'invalid-did',
      };

      expect(() => validateQRCodeDataStrict(invalidData)).toThrow(QRValidationError);
    });

    it('should provide specific error details', () => {
      const invalidData = {
        ...validQRData,
        vcs: [],
      };

      try {
        validateQRCodeDataStrict(invalidData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(QRValidationError);
        expect((error as QRValidationError).field).toBe('vcs');
      }
    });
  });
});

describe('Combined Parse and Validate', () => {
  describe('parseAndValidateQRCode', () => {
    it('should parse and validate valid QR code', () => {
      const qrURL = createQRURL(validQRData);
      const result = parseAndValidateQRCode(qrURL);

      expect(result).toEqual(validQRData);
    });

    it('should throw on parse error', () => {
      expect(() => parseAndValidateQRCode('invalid-qr')).toThrow(QRParseError);
    });

    it('should throw on validation error', () => {
      const qrURL = createQRURL(expiredQRData);
      expect(() => parseAndValidateQRCode(qrURL)).toThrow(QRExpiredError);
    });

    it('should respect combined options', () => {
      const qrURL = createQRURL(expiredQRData);
      expect(() =>
        parseAndValidateQRCode(qrURL, {
          checkExpiration: false,
        })
      ).not.toThrow();
    });
  });

  describe('parseAndValidateQRCodeSafe', () => {
    it('should return success for valid QR code', () => {
      const qrURL = createQRURL(validQRData);
      const result = parseAndValidateQRCodeSafe(qrURL);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validQRData);
    });

    it('should return error for parse failure', () => {
      const result = parseAndValidateQRCodeSafe('invalid-qr');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for validation failure', () => {
      const qrURL = createQRURL(expiredQRData);
      const result = parseAndValidateQRCodeSafe(qrURL);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});

describe('Error Classes', () => {
  describe('QRParseError', () => {
    it('should create error with correct properties', () => {
      const error = new QRParseError('Test error', { detail: 'test' });

      expect(error).toBeInstanceOf(QRParseError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('QRParseError');
      expect(error.code).toBe('QR_PARSE_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('should create specific error types', () => {
      const invalidFormat = QRParseError.invalidFormat('test reason');
      expect(invalidFormat.message).toContain('Invalid QR code format');
      expect(invalidFormat.message).toContain('test reason');

      const invalidBase64 = QRParseError.invalidBase64();
      expect(invalidBase64.message).toContain('base64');

      const invalidJSON = QRParseError.invalidJSON();
      expect(invalidJSON.message).toContain('JSON');

      const missingFields = QRParseError.missingFields(['field1', 'field2']);
      expect(missingFields.message).toContain('field1');
      expect(missingFields.message).toContain('field2');
    });
  });

  describe('QRValidationError', () => {
    it('should create error with field information', () => {
      const error = new QRValidationError('Test error', 'testField');

      expect(error).toBeInstanceOf(QRValidationError);
      expect(error.name).toBe('QRValidationError');
      expect(error.code).toBe('QR_VALIDATION_ERROR');
      expect(error.field).toBe('testField');
    });

    it('should create specific validation errors', () => {
      const invalidField = QRValidationError.invalidField('exp', 'must be positive');
      expect(invalidField.message).toContain('exp');
      expect(invalidField.message).toContain('must be positive');
      expect(invalidField.field).toBe('exp');

      const unsupportedVersion = QRValidationError.unsupportedVersion('2.0', ['1.0']);
      expect(unsupportedVersion.message).toContain('2.0');
      expect(unsupportedVersion.message).toContain('1.0');

      const invalidDID = QRValidationError.invalidDID('bad-did', 'wrong format');
      expect(invalidDID.message).toContain('wrong format');

      const invalidSig = QRValidationError.invalidSignature('not hex');
      expect(invalidSig.message).toContain('not hex');
    });
  });

  describe('QRExpiredError', () => {
    it('should create error with timestamp information', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600;
      const now = Math.floor(Date.now() / 1000);
      const error = new QRExpiredError(exp, now);

      expect(error).toBeInstanceOf(QRExpiredError);
      expect(error.name).toBe('QRExpiredError');
      expect(error.code).toBe('QR_EXPIRED');
      expect(error.expirationTime).toBe(exp);
      expect(error.currentTime).toBe(now);
      expect(error.timeSinceExpiration).toBeGreaterThan(0);
    });

    it('should calculate time since expiration', () => {
      const exp = 1000;
      const now = 2000;
      const error = new QRExpiredError(exp, now);

      expect(error.timeSinceExpiration).toBe(1000);
    });

    it('should check tolerance window', () => {
      const exp = 1000;
      const now = 1050;
      const error = new QRExpiredError(exp, now);

      expect(error.isWithinTolerance(100)).toBe(true);
      expect(error.isWithinTolerance(30)).toBe(false);
    });
  });
});

describe('Edge Cases and Security', () => {
  it('should handle very long strings safely', () => {
    const longData = {
      ...validQRData,
      p: 'a'.repeat(300),
    };
    const qrURL = createQRURL(longData);

    // Should fail validation due to excessive length
    expect(() => parseAndValidateQRCode(qrURL)).toThrow();
  });

  it('should handle special characters in strings', () => {
    const specialChars = {
      ...validQRData,
      p: 'test-id_123.456',
    };
    const qrURL = createQRURL(specialChars);
    const result = parseAndValidateQRCode(qrURL, { checkExpiration: false });

    expect(result.p).toBe('test-id_123.456');
  });

  it('should handle Unicode characters', () => {
    const unicode = {
      ...validQRData,
      p: 'présentation-识别',
    };
    const qrURL = createQRURL(unicode);
    const result = parseAndValidateQRCode(qrURL, { checkExpiration: false });

    expect(result.p).toBe('présentation-识别');
  });

  it('should handle maximum uint64 nonce', () => {
    const maxNonce = Math.pow(2, 53) - 1; // JavaScript safe integer max
    const data = {
      ...validQRData,
      n: maxNonce,
    };
    const result = validateQRCodeData(data);

    expect(result.valid).toBe(true);
  });

  it('should reject null and undefined values', () => {
    const nullValues = {
      ...validQRData,
      p: null as any,
    };
    const base64 = encodeQRData(nullValues);
    expect(() => parseQRCode(base64)).toThrow(QRParseError);
  });

  it('should handle empty disclosure context', () => {
    const emptyCtx = {
      ...validQRData,
      ctx: {},
    };
    const qrURL = createQRURL(emptyCtx);
    const result = parseAndValidateQRCodeSafe(qrURL);

    expect(result.success).toBe(true);
    // Should have warning about no disclosures
  });

  it('should handle very large VC arrays', () => {
    const largeVCArray = {
      ...validQRData,
      vcs: Array.from({ length: 100 }, (_, i) => `vc-${i}`),
    };
    const qrURL = createQRURL(largeVCArray);
    const result = parseQRCodeSafe(qrURL);

    expect(result.success).toBe(true);
  });
});
