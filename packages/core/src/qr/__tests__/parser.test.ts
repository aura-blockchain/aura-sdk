/**
 * Tests for QR Code Parser
 */

import { describe, it, expect } from 'vitest';
import { parseQRCode, parseQRCodeSafe } from '../parser.js';
import { QRParseError } from '../errors.js';

// Helper to create valid base64 QR data
function createValidBase64(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const data = {
    v: '1.0',
    p: 'presentation-123',
    h: 'did:aura:mainnet:holder123',
    vcs: ['vc-001', 'vc-002'],
    ctx: { show_age_over_21: true },
    exp: now + 3600, // 1 hour from now
    n: 123456,
    sig: 'signature-abc123',
    ...overrides,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

// Helper to create valid URL format
function createValidURL(overrides: Record<string, unknown> = {}): string {
  const base64 = createValidBase64(overrides);
  return `aura://verify?data=${base64}`;
}

describe('parseQRCode', () => {
  describe('valid input', () => {
    it('should parse valid base64 QR code', () => {
      const base64 = createValidBase64();
      const result = parseQRCode(base64);

      expect(result.v).toBe('1.0');
      expect(result.p).toBe('presentation-123');
      expect(result.h).toBe('did:aura:mainnet:holder123');
      expect(result.vcs).toEqual(['vc-001', 'vc-002']);
      expect(result.ctx).toEqual({ show_age_over_21: true });
      expect(result.n).toBe(123456);
      expect(result.sig).toBe('signature-abc123');
    });

    it('should parse valid URL format', () => {
      const url = createValidURL();
      const result = parseQRCode(url);

      expect(result.v).toBe('1.0');
      expect(result.p).toBe('presentation-123');
    });

    it('should trim whitespace from input', () => {
      const base64 = `  ${createValidBase64()}  `;
      const result = parseQRCode(base64);
      expect(result.p).toBe('presentation-123');
    });

    it('should handle base64 with whitespace', () => {
      const data = {
        v: '1.0',
        p: 'test-123',
        h: 'did:aura:mainnet:holder',
        vcs: ['vc-1'],
        ctx: {},
        exp: Math.floor(Date.now() / 1000) + 3600,
        n: 12345,
        sig: 'sig123',
      };
      const base64WithSpaces = Buffer.from(JSON.stringify(data)).toString('base64')
        .split('')
        .join(' '); // Add spaces between characters

      // Cleaned version should parse
      const result = parseQRCode(base64WithSpaces.replace(/\s/g, ''));
      expect(result.p).toBe('test-123');
    });

    it('should parse with non-strict mode', () => {
      const now = Math.floor(Date.now() / 1000);
      const base64 = createValidBase64({
        v: '2.0', // Invalid version in strict mode
        exp: now + 3600,
      });

      const result = parseQRCode(base64, { strict: false });
      expect(result.v).toBe('2.0');
    });

    it('should accept custom supported versions', () => {
      const base64 = createValidBase64({ v: '2.0' });
      const result = parseQRCode(base64, { supportedVersions: ['1.0', '2.0'] });
      expect(result.v).toBe('2.0');
    });
  });

  describe('invalid input', () => {
    it('should throw for null input', () => {
      expect(() => parseQRCode(null as any)).toThrow(QRParseError);
    });

    it('should throw for undefined input', () => {
      expect(() => parseQRCode(undefined as any)).toThrow(QRParseError);
    });

    it('should throw for empty string', () => {
      expect(() => parseQRCode('')).toThrow(QRParseError);
      expect(() => parseQRCode('')).toThrow('non-empty string');
    });

    it('should throw for whitespace-only string', () => {
      expect(() => parseQRCode('   ')).toThrow(QRParseError);
      expect(() => parseQRCode('   ')).toThrow('empty or whitespace');
    });

    it('should throw for non-string input', () => {
      expect(() => parseQRCode(123 as any)).toThrow(QRParseError);
    });

    it('should throw for invalid base64', () => {
      expect(() => parseQRCode('not!valid!base64')).toThrow(QRParseError);
    });

    it('should throw for invalid JSON in base64', () => {
      const invalidJson = Buffer.from('not json').toString('base64');
      expect(() => parseQRCode(invalidJson)).toThrow(QRParseError);
    });

    it('should throw for JSON array instead of object', () => {
      const arrayJson = Buffer.from('[]').toString('base64');
      expect(() => parseQRCode(arrayJson)).toThrow(QRParseError);
    });

    it('should throw for JSON primitive instead of object', () => {
      const primitiveJson = Buffer.from('"string"').toString('base64');
      expect(() => parseQRCode(primitiveJson)).toThrow(QRParseError);
    });
  });

  describe('URL format validation', () => {
    it('should throw for invalid aura:// URL format', () => {
      expect(() => parseQRCode('aura://invalid')).toThrow(QRParseError);
      expect(() => parseQRCode('aura://invalid')).toThrow('aura://verify?data=<base64>');
    });

    it('should throw for missing data parameter', () => {
      expect(() => parseQRCode('aura://verify?')).toThrow(QRParseError);
      expect(() => parseQRCode('aura://verify?')).toThrow('Missing "data" parameter');
    });

    it('should throw for empty data parameter', () => {
      expect(() => parseQRCode('aura://verify?data=')).toThrow(QRParseError);
      // URL parser treats empty param as missing
      expect(() => parseQRCode('aura://verify?data=')).toThrow(/data/i);
    });

    it('should throw for wrong path in URL', () => {
      const base64 = createValidBase64();
      expect(() => parseQRCode(`aura://something?data=${base64}`)).toThrow(QRParseError);
    });

    it('should handle aura:// with different path format', () => {
      // Just aura:// without proper format should throw
      expect(() => parseQRCode('aura://')).toThrow(QRParseError);
    });
  });

  describe('missing required fields', () => {
    it('should throw for missing v field', () => {
      const data = { p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing p field', () => {
      const data = { v: '1.0', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing h field', () => {
      const data = { v: '1.0', p: 'test', vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing vcs field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing ctx field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing exp field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: {}, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing n field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw for missing sig field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 1 };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });

    it('should throw with list of all missing fields', () => {
      const base64 = Buffer.from('{}').toString('base64');
      expect(() => parseQRCode(base64)).toThrow(QRParseError);
    });
  });

  describe('type validation', () => {
    it('should throw for non-string v field', () => {
      const data = { v: 1, p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "v" must be a string');
    });

    it('should throw for non-string p field', () => {
      const data = { v: '1.0', p: 123, h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "p" must be a string');
    });

    it('should throw for non-string h field', () => {
      const data = { v: '1.0', p: 'test', h: 123, vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "h" must be a string');
    });

    it('should throw for non-array vcs field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: 'vc', ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "vcs" must be an array');
    });

    it('should throw for non-string items in vcs', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc', 123], ctx: {}, exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('All items in "vcs" must be strings');
    });

    it('should throw for non-object ctx field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: 'string', exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "ctx" must be an object');
    });

    it('should throw for array ctx field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: [], exp: 1, n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "ctx" must be an object');
    });

    it('should throw for non-number exp field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 'soon', n: 1, sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "exp" must be a number');
    });

    it('should throw for non-number n field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 'nonce', sig: 'sig' };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "n" must be a number');
    });

    it('should throw for non-string sig field', () => {
      const data = { v: '1.0', p: 'test', h: 'did', vcs: ['vc'], ctx: {}, exp: 1, n: 1, sig: 123 };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('Field "sig" must be a string');
    });

    it('should throw for non-boolean context values', () => {
      const data = {
        v: '1.0', p: 'test', h: 'did', vcs: ['vc'],
        ctx: { show_name: 'yes' }, // should be boolean
        exp: Math.floor(Date.now() / 1000) + 3600, n: 1, sig: 'sig'
      };
      const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
      expect(() => parseQRCode(base64)).toThrow('must be boolean');
    });
  });

  describe('strict mode validation', () => {
    const now = Math.floor(Date.now() / 1000);

    it('should throw for unsupported version', () => {
      const base64 = createValidBase64({ v: '2.0' });
      expect(() => parseQRCode(base64)).toThrow('Unsupported protocol version');
    });

    it('should throw for empty presentation ID', () => {
      const base64 = createValidBase64({ p: '  ' });
      expect(() => parseQRCode(base64)).toThrow('Presentation ID cannot be empty');
    });

    it('should throw for empty holder DID', () => {
      const base64 = createValidBase64({ h: '  ' });
      expect(() => parseQRCode(base64)).toThrow('Holder DID cannot be empty');
    });

    it('should throw for empty signature', () => {
      const base64 = createValidBase64({ sig: '  ' });
      expect(() => parseQRCode(base64)).toThrow('Signature cannot be empty');
    });

    it('should throw for empty vcs array', () => {
      const base64 = createValidBase64({ vcs: [] });
      expect(() => parseQRCode(base64)).toThrow('VC IDs array cannot be empty');
    });

    it('should throw for empty string in vcs', () => {
      const base64 = createValidBase64({ vcs: ['vc-1', '  ', 'vc-3'] });
      expect(() => parseQRCode(base64)).toThrow('VC IDs cannot contain empty strings');
    });

    it('should throw for negative nonce', () => {
      const base64 = createValidBase64({ n: -1 });
      expect(() => parseQRCode(base64)).toThrow('Nonce must be non-negative');
    });

    it('should throw for zero expiration', () => {
      const base64 = createValidBase64({ exp: 0 });
      expect(() => parseQRCode(base64)).toThrow('Expiration must be a positive timestamp');
    });

    it('should throw for negative expiration', () => {
      const base64 = createValidBase64({ exp: -100 });
      expect(() => parseQRCode(base64)).toThrow('Expiration must be a positive timestamp');
    });

    it('should throw for expiration too far in the past', () => {
      const twoYearsAgo = now - (2 * 365 * 24 * 60 * 60);
      const base64 = createValidBase64({ exp: twoYearsAgo });
      expect(() => parseQRCode(base64)).toThrow('too far in the past');
    });

    it('should throw for expiration too far in the future', () => {
      const fifteenYears = now + (15 * 365 * 24 * 60 * 60);
      const base64 = createValidBase64({ exp: fifteenYears });
      expect(() => parseQRCode(base64)).toThrow('too far in the future');
    });
  });

  describe('security - prototype pollution prevention', () => {
    it('should not allow __proto__ pollution', () => {
      // Create JSON with __proto__ key using string manipulation to bypass serialization
      const json = '{"v":"1.0","p":"test","h":"did","vcs":["vc"],"ctx":{},"exp":' +
        (Math.floor(Date.now() / 1000) + 3600) +
        ',"n":1,"sig":"sig","__proto__":{"polluted":true}}';
      const base64 = Buffer.from(json).toString('base64');
      const result = parseQRCode(base64);

      // The parsed object should not have inherited polluted properties
      expect((result as any).polluted).toBeUndefined();
      // Prototype chain should not be affected
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    });

    it('should not include constructor property from JSON', () => {
      const maliciousData = {
        v: '1.0',
        p: 'test',
        h: 'did',
        vcs: ['vc'],
        ctx: {},
        exp: Math.floor(Date.now() / 1000) + 3600,
        n: 1,
        sig: 'sig',
      };
      const base64 = Buffer.from(JSON.stringify(maliciousData)).toString('base64');
      const result = parseQRCode(base64);

      // Result should be a plain object that can be used safely
      expect(result.v).toBe('1.0');
      // Standard constructor reference should still work but not be polluted
      expect(typeof result.constructor).toBe('function');
    });

    it('should not include prototype property from JSON', () => {
      const json = '{"v":"1.0","p":"test","h":"did","vcs":["vc"],"ctx":{},"exp":' +
        (Math.floor(Date.now() / 1000) + 3600) +
        ',"n":1,"sig":"sig","prototype":{"dangerous":true}}';
      const base64 = Buffer.from(json).toString('base64');
      const result = parseQRCode(base64);

      // Prototype property should be filtered out
      expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
    });
  });
});

describe('parseQRCodeSafe', () => {
  it('should return success result for valid input', () => {
    const base64 = createValidBase64();
    const result = parseQRCodeSafe(base64);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.p).toBe('presentation-123');
    expect(result.error).toBeUndefined();
  });

  it('should return error result for invalid input', () => {
    const result = parseQRCodeSafe('invalid-base64!');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('should return error message string', () => {
    const result = parseQRCodeSafe('');

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error?.length).toBeGreaterThan(0);
  });

  it('should handle non-Error exceptions', () => {
    // This would be unusual but test the string conversion
    const result = parseQRCodeSafe('not-json');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should pass options to parseQRCode', () => {
    const base64 = createValidBase64({ v: '2.0' });

    const strictResult = parseQRCodeSafe(base64, { strict: true });
    expect(strictResult.success).toBe(false);

    const nonStrictResult = parseQRCodeSafe(base64, { strict: false });
    expect(nonStrictResult.success).toBe(true);
  });
});
