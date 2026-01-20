/**
 * Tests for Input Sanitizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InputSanitizer, ValidationError, defaultSanitizer } from './input-sanitizer.js';

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer({
      maxStringLength: 1000,
      strictMode: true,
    });
  });

  describe('sanitizeQRInput', () => {
    it('should accept valid QR input', () => {
      const input = 'valid-qr-code-data-12345';
      expect(sanitizer.sanitizeQRInput(input)).toBe(input);
    });

    it('should trim whitespace', () => {
      const input = '  valid-qr-code  ';
      expect(sanitizer.sanitizeQRInput(input)).toBe('valid-qr-code');
    });

    it('should reject null or undefined', () => {
      expect(() => sanitizer.sanitizeQRInput(null as any)).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeQRInput(undefined as any)).toThrow(ValidationError);
    });

    it('should reject empty input', () => {
      expect(() => sanitizer.sanitizeQRInput('')).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeQRInput('   ')).toThrow(ValidationError);
    });

    it('should reject input exceeding max length', () => {
      const longInput = 'a'.repeat(2000);
      expect(() => sanitizer.sanitizeQRInput(longInput)).toThrow(ValidationError);
    });

    it('should reject input with null bytes', () => {
      const input = 'valid\0data';
      expect(() => sanitizer.sanitizeQRInput(input)).toThrow(ValidationError);
    });

    it('should reject script tags', () => {
      const input = '<script>alert("xss")</script>';
      expect(() => sanitizer.sanitizeQRInput(input)).toThrow(ValidationError);
    });

    it('should reject HTML in strict mode', () => {
      const input = '<div>content</div>';
      expect(() => sanitizer.sanitizeQRInput(input)).toThrow(ValidationError);
    });

    it('should allow HTML when configured', () => {
      const lenientSanitizer = new InputSanitizer({ allowHTML: true, strictMode: false });
      const input = '<div>content</div>';
      expect(lenientSanitizer.sanitizeQRInput(input)).toBe(input);
    });
  });

  describe('validateDID', () => {
    it('should accept valid DID', () => {
      expect(() => sanitizer.validateDID('did:aura:user123')).not.toThrow();
      expect(() => sanitizer.validateDID('did:example:123456789abcdefghi')).not.toThrow();
    });

    it('should accept Aura DID when required', () => {
      expect(() => sanitizer.validateDID('did:aura:user123', true)).not.toThrow();
    });

    it('should reject non-Aura DID when Aura required', () => {
      expect(() => sanitizer.validateDID('did:example:user123', true)).toThrow(ValidationError);
    });

    it('should reject invalid DID format', () => {
      expect(() => sanitizer.validateDID('invalid-did')).toThrow(ValidationError);
      expect(() => sanitizer.validateDID('did:only-method')).toThrow(ValidationError);
      expect(() => sanitizer.validateDID('did:')).toThrow(ValidationError);
    });

    it('should reject DID exceeding max length', () => {
      const longDID = 'did:aura:' + 'a'.repeat(300);
      expect(() => sanitizer.validateDID(longDID)).toThrow(ValidationError);
    });

    it('should reject empty or non-string DID', () => {
      expect(() => sanitizer.validateDID('')).toThrow(ValidationError);
      expect(() => sanitizer.validateDID(null as any)).toThrow(ValidationError);
      expect(() => sanitizer.validateDID(123 as any)).toThrow(ValidationError);
    });
  });

  describe('sanitizeString', () => {
    it('should accept valid string', () => {
      const input = 'valid string';
      expect(sanitizer.sanitizeString(input)).toBe(input);
    });

    it('should trim whitespace', () => {
      expect(sanitizer.sanitizeString('  test  ')).toBe('test');
    });

    it('should reject non-string input', () => {
      expect(() => sanitizer.sanitizeString(123)).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeString({})).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeString(null)).toThrow(ValidationError);
    });

    it('should reject empty string by default', () => {
      expect(() => sanitizer.sanitizeString('')).toThrow(ValidationError);
    });

    it('should allow empty string when configured', () => {
      expect(sanitizer.sanitizeString('', { allowEmpty: true })).toBe('');
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(2000);
      expect(() => sanitizer.sanitizeString(longString)).toThrow(ValidationError);
    });

    it('should enforce custom max length', () => {
      const input = 'test string';
      expect(() => sanitizer.sanitizeString(input, { maxLength: 5 })).toThrow(ValidationError);
    });

    it('should validate against pattern', () => {
      const pattern = /^[a-z]+$/;
      expect(sanitizer.sanitizeString('lowercase', { pattern })).toBe('lowercase');
      expect(() => sanitizer.sanitizeString('UPPERCASE', { pattern })).toThrow(ValidationError);
    });

    it('should reject HTML tags', () => {
      expect(() => sanitizer.sanitizeString('<div>test</div>')).toThrow(ValidationError);
    });

    it('should reject script tags', () => {
      expect(() => sanitizer.sanitizeString('<script>alert(1)</script>')).toThrow(ValidationError);
    });

    it('should reject SQL injection patterns in strict mode', () => {
      expect(() => sanitizer.sanitizeString('SELECT * FROM users')).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeString("'; DROP TABLE users--")).toThrow(ValidationError);
    });

    it('should reject path traversal patterns', () => {
      expect(() => sanitizer.sanitizeString('../../../etc/passwd')).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeString('..\\..\\windows\\system32')).toThrow(ValidationError);
    });
  });

  describe('validateHex', () => {
    it('should accept valid hex string', () => {
      expect(sanitizer.validateHex('deadbeef')).toBe('deadbeef');
      expect(sanitizer.validateHex('0xdeadbeef')).toBe('deadbeef');
    });

    it('should convert to lowercase', () => {
      expect(sanitizer.validateHex('DEADBEEF')).toBe('deadbeef');
    });

    it('should reject odd-length hex', () => {
      expect(() => sanitizer.validateHex('abc')).toThrow(ValidationError);
    });

    it('should reject non-hex characters', () => {
      expect(() => sanitizer.validateHex('xyz')).toThrow(ValidationError);
    });

    it('should validate exact length', () => {
      expect(sanitizer.validateHex('deadbeef', 4)).toBe('deadbeef');
      expect(() => sanitizer.validateHex('deadbeef', 8)).toThrow(ValidationError);
    });
  });

  describe('validateBase64', () => {
    it('should accept valid base64', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      expect(sanitizer.validateBase64(base64)).toBe(base64);
    });

    it('should reject invalid base64', () => {
      expect(() => sanitizer.validateBase64('not-base64!')).toThrow(ValidationError);
    });
  });

  describe('validateURL', () => {
    it('should accept valid HTTP URL', () => {
      const url = 'http://example.com';
      expect(sanitizer.validateURL(url)).toBe(url);
    });

    it('should accept valid HTTPS URL', () => {
      const url = 'https://example.com/path?query=value';
      expect(sanitizer.validateURL(url)).toBe(url);
    });

    it('should reject invalid URL', () => {
      expect(() => sanitizer.validateURL('not-a-url')).toThrow(ValidationError);
      expect(() => sanitizer.validateURL('ftp://example.com')).toThrow(ValidationError);
    });

    it('should require HTTPS when configured', () => {
      expect(() => sanitizer.validateURL('http://example.com', true)).toThrow(ValidationError);
      expect(sanitizer.validateURL('https://example.com', true)).toBe('https://example.com');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(sanitizer.validateEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizer.validateEmail('test.user+tag@sub.example.com')).toBe(
        'test.user+tag@sub.example.com'
      );
    });

    it('should convert to lowercase', () => {
      expect(sanitizer.validateEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      expect(() => sanitizer.validateEmail('not-an-email')).toThrow(ValidationError);
      expect(() => sanitizer.validateEmail('user@')).toThrow(ValidationError);
      expect(() => sanitizer.validateEmail('@example.com')).toThrow(ValidationError);
    });
  });

  describe('validateNumber', () => {
    it('should accept valid number', () => {
      expect(sanitizer.validateNumber(42)).toBe(42);
      expect(sanitizer.validateNumber('42')).toBe(42);
      expect(sanitizer.validateNumber(3.14)).toBe(3.14);
    });

    it('should reject NaN', () => {
      expect(() => sanitizer.validateNumber(NaN)).toThrow(ValidationError);
      expect(() => sanitizer.validateNumber('not-a-number')).toThrow(ValidationError);
    });

    it('should reject infinity', () => {
      expect(() => sanitizer.validateNumber(Infinity)).toThrow(ValidationError);
      expect(() => sanitizer.validateNumber(-Infinity)).toThrow(ValidationError);
    });

    it('should enforce integer constraint', () => {
      expect(sanitizer.validateNumber(42, { integer: true })).toBe(42);
      expect(() => sanitizer.validateNumber(3.14, { integer: true })).toThrow(ValidationError);
    });

    it('should enforce min/max constraints', () => {
      expect(sanitizer.validateNumber(50, { min: 0, max: 100 })).toBe(50);
      expect(() => sanitizer.validateNumber(-10, { min: 0 })).toThrow(ValidationError);
      expect(() => sanitizer.validateNumber(150, { max: 100 })).toThrow(ValidationError);
    });
  });

  describe('validateTimestamp', () => {
    it('should accept unix timestamp in seconds', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(sanitizer.validateTimestamp(now)).toBeGreaterThan(0);
    });

    it('should accept unix timestamp in milliseconds', () => {
      const now = Date.now();
      expect(sanitizer.validateTimestamp(now)).toBe(now);
    });

    it('should accept ISO 8601 string', () => {
      const iso = '2024-01-01T00:00:00Z';
      const timestamp = sanitizer.validateTimestamp(iso);
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should reject invalid timestamp', () => {
      expect(() => sanitizer.validateTimestamp('invalid')).toThrow(ValidationError);
    });

    it('should reject negative timestamp', () => {
      expect(() => sanitizer.validateTimestamp(-1000)).toThrow(ValidationError);
    });

    it('should reject unreasonable timestamp', () => {
      const year1900 = new Date('1900-01-01').getTime();
      const year2200 = new Date('2200-01-01').getTime();

      expect(() => sanitizer.validateTimestamp(year1900)).toThrow(ValidationError);
      expect(() => sanitizer.validateTimestamp(year2200)).toThrow(ValidationError);
    });
  });

  describe('sanitizeJSON', () => {
    it('should accept valid JSON string', () => {
      const json = '{"key":"value"}';
      const result = sanitizer.sanitizeJSON(json);
      expect(result).toEqual({ key: 'value' });
    });

    it('should accept object directly', () => {
      const obj = { key: 'value' };
      const result = sanitizer.sanitizeJSON(obj);
      expect(result).toEqual(obj);
    });

    it('should reject invalid JSON string', () => {
      expect(() => sanitizer.sanitizeJSON('invalid json')).toThrow(ValidationError);
    });

    it('should reject non-object JSON', () => {
      expect(() => sanitizer.sanitizeJSON('null')).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeJSON('123')).toThrow(ValidationError);
      expect(() => sanitizer.sanitizeJSON('"string"')).toThrow(ValidationError);
    });

    it('should reject oversized JSON', () => {
      const hugeJson = JSON.stringify({ data: 'x'.repeat(2000000) });
      expect(() => sanitizer.sanitizeJSON(hugeJson)).toThrow(ValidationError);
    });
  });

  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizer.escapeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );

      expect(sanitizer.escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
      expect(sanitizer.escapeHTML("It's working")).toBe('It&#x27;s working');
    });
  });

  describe('stripHTML', () => {
    it('should remove all HTML tags', () => {
      expect(sanitizer.stripHTML('<div>content</div>')).toBe('content');
      expect(sanitizer.stripHTML('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      expect(sanitizer.stripHTML('<div><span><b>text</b></span></div>')).toBe('text');
    });
  });
});

describe('defaultSanitizer', () => {
  it('should be a pre-configured instance', () => {
    expect(defaultSanitizer).toBeInstanceOf(InputSanitizer);
  });

  it('should work with default configuration', () => {
    const input = 'test input';
    expect(defaultSanitizer.sanitizeString(input)).toBe(input);
  });
});
