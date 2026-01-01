/**
 * Tests for QR Code Validator
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateQRCodeData,
  validateQRCode,
  validateQRCodeDataAsync,
  validateQRCodeAsync,
  validateQRCodeDataStrict,
  validateQRCodeDataStrictAsync,
} from '../validator.js';
import { QRValidationError, QRExpiredError, QRNonceError } from '../errors.js';
import type { QRCodeData, NonceValidator } from '../types.js';

// Helper to create valid QR data
function createValidQRData(overrides?: Partial<QRCodeData>): QRCodeData {
  const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  return {
    v: '1.0',
    p: 'presentation-123',
    h: 'did:aura:mainnet:holder123',
    vcs: ['vc-1', 'vc-2'],
    ctx: { fullName: true, age: true },
    exp: futureExp,
    n: 12345678,
    sig: 'a'.repeat(128), // 64 bytes = 128 hex chars
    ...overrides,
  };
}

describe('validateQRCodeData', () => {
  describe('valid data', () => {
    it('should accept valid QR code data', () => {
      const data = createValidQRData();
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept minimal valid QR code', () => {
      const data = createValidQRData({
        vcs: ['vc-1'],
        ctx: { fullName: true },
      });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(true);
    });
  });

  describe('version validation', () => {
    it('should reject missing version', () => {
      const data = createValidQRData({ v: '' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'v')).toBe(true);
    });

    it('should reject unsupported version', () => {
      const data = createValidQRData({ v: '2.0' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unsupported'))).toBe(true);
    });

    it('should accept custom supported versions', () => {
      const data = createValidQRData({ v: '2.0' });
      const result = validateQRCodeData(data, { supportedVersions: ['1.0', '2.0'] });

      expect(result.valid).toBe(true);
    });

    it('should reject non-string version', () => {
      const data = createValidQRData({ v: 123 as any });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });
  });

  describe('presentation ID validation', () => {
    it('should reject missing presentation ID', () => {
      const data = createValidQRData({ p: '' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'p')).toBe(true);
    });

    it('should reject whitespace-only presentation ID', () => {
      const data = createValidQRData({ p: '   ' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject overly long presentation ID', () => {
      const data = createValidQRData({ p: 'a'.repeat(257) });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('maximum length'))).toBe(true);
    });

    it('should accept 256 character presentation ID', () => {
      const data = createValidQRData({ p: 'a'.repeat(256) });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(true);
    });
  });

  describe('holder DID validation', () => {
    it('should reject missing holder DID', () => {
      const data = createValidQRData({ h: '' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject non-aura DID', () => {
      const data = createValidQRData({ h: 'did:other:mainnet:holder' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('aura'))).toBe(true);
    });

    it('should reject DID without network', () => {
      const data = createValidQRData({ h: 'did:aura:' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject DID without identifier', () => {
      const data = createValidQRData({ h: 'did:aura:mainnet:' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject DID with invalid characters in identifier', () => {
      const data = createValidQRData({ h: 'did:aura:mainnet:holder@invalid' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should accept DID with dots, hyphens, underscores', () => {
      const data = createValidQRData({ h: 'did:aura:mainnet:holder-test_1.0' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(true);
    });

    it('should skip DID validation when disabled', () => {
      const data = createValidQRData({ h: 'invalid-did' });
      const result = validateQRCodeData(data, { validateDID: false });

      // Should not have DID validation error (may have other validation issues)
      const didErrors = result.errors.filter(e => e.field === 'h');
      expect(didErrors.length).toBe(0);
    });
  });

  describe('VC IDs validation', () => {
    it('should reject non-array VCs', () => {
      const data = createValidQRData({ vcs: 'not-array' as any });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('array'))).toBe(true);
    });

    it('should reject empty VCs array', () => {
      const data = createValidQRData({ vcs: [] });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject non-string VC IDs', () => {
      const data = createValidQRData({ vcs: ['vc-1', 123 as any, 'vc-3'] });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('vcs[1]'))).toBe(true);
    });

    it('should reject empty string VC IDs', () => {
      const data = createValidQRData({ vcs: ['vc-1', '', 'vc-3'] });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should warn about duplicate VCs', () => {
      const data = createValidQRData({ vcs: ['vc-1', 'vc-1', 'vc-2'] });
      const result = validateQRCodeData(data);

      expect(result.warnings.some(w => w.message.includes('duplicate'))).toBe(true);
    });

    it('should warn about large number of VCs', () => {
      const vcs = Array.from({ length: 15 }, (_, i) => `vc-${i}`);
      const data = createValidQRData({ vcs });
      const result = validateQRCodeData(data);

      expect(result.warnings.some(w => w.message.includes('performance'))).toBe(true);
    });
  });

  describe('disclosure context validation', () => {
    it('should reject non-object context', () => {
      const data = createValidQRData({ ctx: 'not-object' as any });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject array context', () => {
      const data = createValidQRData({ ctx: [] as any });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('not an array'))).toBe(true);
    });

    it('should reject non-boolean values in context', () => {
      const data = createValidQRData({ ctx: { fullName: 'yes' as any } });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should warn when no disclosures enabled', () => {
      const data = createValidQRData({ ctx: {} });
      const result = validateQRCodeData(data);

      expect(result.warnings.some(w => w.message.includes('No disclosure'))).toBe(true);
    });

    it('should warn when all disclosures are false', () => {
      const data = createValidQRData({ ctx: { fullName: false, age: false } });
      const result = validateQRCodeData(data);

      expect(result.warnings.some(w => w.message.includes('No disclosure'))).toBe(true);
    });
  });

  describe('expiration validation', () => {
    it('should reject expired QR code', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const data = createValidQRData({ exp: pastExp });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'exp')).toBe(true);
    });

    it('should accept QR code with expiration tolerance', () => {
      const slightlyPastExp = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
      const data = createValidQRData({ exp: slightlyPastExp });
      const result = validateQRCodeData(data, { expirationTolerance: 60 });

      expect(result.valid).toBe(true);
    });

    it('should reject non-number expiration', () => {
      const data = createValidQRData({ exp: '2025-01-01' as any });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject negative expiration', () => {
      const data = createValidQRData({ exp: -1 });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject Infinity expiration', () => {
      const data = createValidQRData({ exp: Infinity });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject expiration too far in the future', () => {
      const farFuture = Math.floor(Date.now() / 1000) + (15 * 365 * 24 * 60 * 60); // 15 years
      const data = createValidQRData({ exp: farFuture });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('too far'))).toBe(true);
    });

    it('should skip expiration check when disabled', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const data = createValidQRData({ exp: pastExp });
      const result = validateQRCodeData(data, { checkExpiration: false });

      const expErrors = result.errors.filter(e => e.field === 'exp' && e.message.includes('expired'));
      expect(expErrors.length).toBe(0);
    });
  });

  describe('nonce validation', () => {
    it('should reject non-number nonce', () => {
      const data = createValidQRData({ n: 'abc' as any });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject non-finite nonce', () => {
      const data = createValidQRData({ n: NaN });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject non-integer nonce', () => {
      const data = createValidQRData({ n: 123.45 });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject negative nonce', () => {
      const data = createValidQRData({ n: -1 });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should accept zero nonce', () => {
      const data = createValidQRData({ n: 0 });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(true);
    });
  });

  describe('signature validation', () => {
    it('should reject missing signature', () => {
      const data = createValidQRData({ sig: '' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject non-hex signature', () => {
      const data = createValidQRData({ sig: 'not-hex-signature!' });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
    });

    it('should reject signature that is too short', () => {
      const data = createValidQRData({ sig: 'abcd' }); // 4 chars = 2 bytes
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true);
    });

    it('should reject signature that is too long', () => {
      const data = createValidQRData({ sig: 'a'.repeat(300) });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('too long'))).toBe(true);
    });

    it('should reject odd-length signature', () => {
      const data = createValidQRData({ sig: 'a'.repeat(65) }); // odd length
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('even number'))).toBe(true);
    });

    it('should accept 128 character hex signature (64 bytes)', () => {
      const data = createValidQRData({ sig: 'a'.repeat(128) });
      const result = validateQRCodeData(data);

      expect(result.valid).toBe(true);
    });

    it('should skip signature validation when disabled', () => {
      const data = createValidQRData({ sig: 'invalid!' });
      const result = validateQRCodeData(data, { validateSignature: false });

      const sigErrors = result.errors.filter(e => e.field === 'sig');
      expect(sigErrors.length).toBe(0);
    });
  });
});

describe('validateQRCode alias', () => {
  it('should work the same as validateQRCodeData', () => {
    const data = createValidQRData();
    const result1 = validateQRCodeData(data);
    const result2 = validateQRCode(data);

    expect(result1.valid).toBe(result2.valid);
    expect(result1.errors.length).toBe(result2.errors.length);
  });
});

describe('validateQRCodeDataAsync', () => {
  it('should return sync result when no nonce validator', async () => {
    const data = createValidQRData();
    const result = await validateQRCodeDataAsync(data);

    expect(result.valid).toBe(true);
  });

  it('should call nonce validator when provided', async () => {
    const mockValidator: NonceValidator = {
      validateAndMark: vi.fn().mockResolvedValue(true),
    };

    const data = createValidQRData();
    const result = await validateQRCodeDataAsync(data, { nonceValidator: mockValidator });

    expect(mockValidator.validateAndMark).toHaveBeenCalledWith(data.n, data.p, data.exp);
    expect(result.valid).toBe(true);
  });

  it('should fail when nonce validator returns false', async () => {
    const mockValidator: NonceValidator = {
      validateAndMark: vi.fn().mockResolvedValue(false),
    };

    const data = createValidQRData();
    const result = await validateQRCodeDataAsync(data, { nonceValidator: mockValidator });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'n')).toBe(true);
  });

  it('should fail when nonce validator throws', async () => {
    const mockValidator: NonceValidator = {
      validateAndMark: vi.fn().mockRejectedValue(new Error('Nonce error')),
    };

    const data = createValidQRData();
    const result = await validateQRCodeDataAsync(data, { nonceValidator: mockValidator });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'n')).toBe(true);
  });

  it('should return early if sync validation fails', async () => {
    const mockValidator: NonceValidator = {
      validateAndMark: vi.fn().mockResolvedValue(true),
    };

    const data = createValidQRData({ p: '' }); // Invalid presentation ID
    const result = await validateQRCodeDataAsync(data, { nonceValidator: mockValidator });

    expect(result.valid).toBe(false);
    // Nonce validator should not be called because sync validation failed
    expect(mockValidator.validateAndMark).not.toHaveBeenCalled();
  });
});

describe('validateQRCodeAsync alias', () => {
  it('should work the same as validateQRCodeDataAsync', async () => {
    const data = createValidQRData();
    const result1 = await validateQRCodeDataAsync(data);
    const result2 = await validateQRCodeAsync(data);

    expect(result1.valid).toBe(result2.valid);
  });
});

describe('validateQRCodeDataStrict', () => {
  it('should not throw for valid data', () => {
    const data = createValidQRData();
    expect(() => validateQRCodeDataStrict(data)).not.toThrow();
  });

  it('should throw QRValidationError for invalid data', () => {
    const data = createValidQRData({ p: '' });
    expect(() => validateQRCodeDataStrict(data)).toThrow(QRValidationError);
  });

  it('should throw QRExpiredError for expired data', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const data = createValidQRData({ exp: pastExp });
    expect(() => validateQRCodeDataStrict(data)).toThrow(QRExpiredError);
  });
});

describe('validateQRCodeDataStrictAsync', () => {
  it('should not throw for valid data', async () => {
    const data = createValidQRData();
    await expect(validateQRCodeDataStrictAsync(data)).resolves.toBeUndefined();
  });

  it('should throw QRValidationError for invalid data', async () => {
    const data = createValidQRData({ p: '' });
    await expect(validateQRCodeDataStrictAsync(data)).rejects.toThrow(QRValidationError);
  });

  it('should throw QRExpiredError for expired data', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const data = createValidQRData({ exp: pastExp });
    await expect(validateQRCodeDataStrictAsync(data)).rejects.toThrow(QRExpiredError);
  });

  it('should throw QRNonceError when nonce validation fails', async () => {
    const mockValidator: NonceValidator = {
      validateAndMark: vi.fn().mockResolvedValue(false),
    };

    const data = createValidQRData();
    await expect(
      validateQRCodeDataStrictAsync(data, { nonceValidator: mockValidator })
    ).rejects.toThrow(QRNonceError);
  });
});
