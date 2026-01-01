/**
 * Tests for Utility Functions
 *
 * Comprehensive test suite for utility functions including ID generation,
 * DID validation, timestamp handling, and string manipulation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateAuditId,
  generatePresentationId,
  generateNonce,
  formatDID,
  isValidDID,
  extractDIDNetwork,
  extractDIDIdentifier,
  isValidVCId,
  timestampToDate,
  dateToTimestamp,
  getCurrentTimestamp,
  isExpired,
  getTimeRemaining,
  formatTimestamp,
  sanitizeForLog,
  isValidHex,
  hexToBytes,
  bytesToHex,
  deepClone,
  sleep,
  retry,
  truncate,
  isBrowser,
  isNode,
} from '../index.js';

describe('ID Generation', () => {
  describe('generateAuditId', () => {
    it('should generate a 32-character hex string', () => {
      const id = generateAuditId();
      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateAuditId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generatePresentationId', () => {
    it('should generate a 32-character hex string', () => {
      const id = generatePresentationId();
      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePresentationId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateNonce', () => {
    it('should generate a number between 0 and 2^32-1', () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe('number');
      expect(nonce).toBeGreaterThanOrEqual(0);
      expect(nonce).toBeLessThanOrEqual(0xFFFFFFFF);
    });

    it('should generate different nonces', () => {
      const nonces = new Set<number>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      // With cryptographically secure random, we should have nearly all unique
      expect(nonces.size).toBeGreaterThan(90);
    });
  });
});

describe('DID Functions', () => {
  describe('formatDID', () => {
    it('should return short DIDs unchanged', () => {
      const shortDid = 'did:aura:net:id';
      expect(formatDID(shortDid)).toBe(shortDid);
    });

    it('should truncate long DIDs', () => {
      const longDid = 'did:aura:mainnet:aura1234567890abcdefghijklmnopqrstuvwxyz';
      const formatted = formatDID(longDid, 40);
      expect(formatted.length).toBeLessThanOrEqual(40);
      expect(formatted).toContain('...');
    });

    it('should preserve prefix in formatted output', () => {
      const longDid = 'did:aura:mainnet:aura1234567890abcdefghijklmnopqrstuvwxyz';
      const formatted = formatDID(longDid, 50);
      expect(formatted.startsWith('did:aura:mainnet:')).toBe(true);
    });

    it('should handle empty string', () => {
      expect(formatDID('')).toBe('');
    });

    it('should handle null-like values', () => {
      expect(formatDID(null as any)).toBe(null);
      expect(formatDID(undefined as any)).toBe(undefined);
    });

    it('should truncate invalid DIDs with simple ellipsis', () => {
      const invalidDid = 'notadid:'.repeat(10);
      const formatted = formatDID(invalidDid, 20);
      expect(formatted.length).toBeLessThanOrEqual(20);
      expect(formatted).toContain('...');
    });

    it('should handle DIDs with very short maxLength', () => {
      const longDid = 'did:aura:mainnet:aura1234567890abcdefghijklmnopqrstuvwxyz';
      const formatted = formatDID(longDid, 15);
      expect(formatted.length).toBeLessThanOrEqual(15);
      expect(formatted).toContain('...');
    });
  });

  describe('isValidDID', () => {
    it('should return true for valid Aura DIDs', () => {
      expect(isValidDID('did:aura:mainnet:aura1abc123')).toBe(true);
      expect(isValidDID('did:aura:testnet:aura1xyz789')).toBe(true);
      expect(isValidDID('did:aura:local:aura1test')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidDID('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidDID(null as any)).toBe(false);
      expect(isValidDID(undefined as any)).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isValidDID(123 as any)).toBe(false);
      expect(isValidDID({} as any)).toBe(false);
    });

    it('should return false for wrong method', () => {
      expect(isValidDID('notdid:aura:mainnet:id')).toBe(false);
    });

    it('should return false for wrong DID method', () => {
      expect(isValidDID('did:other:mainnet:id')).toBe(false);
    });

    it('should return false for empty network', () => {
      expect(isValidDID('did:aura::id')).toBe(false);
    });

    it('should return false for empty identifier', () => {
      expect(isValidDID('did:aura:mainnet:')).toBe(false);
    });

    it('should return false for invalid characters in identifier', () => {
      expect(isValidDID('did:aura:mainnet:id with spaces')).toBe(false);
      expect(isValidDID('did:aura:mainnet:id@special')).toBe(false);
    });

    it('should accept identifiers with dots, hyphens, underscores', () => {
      expect(isValidDID('did:aura:mainnet:id-with-hyphens')).toBe(true);
      expect(isValidDID('did:aura:mainnet:id_with_underscores')).toBe(true);
      expect(isValidDID('did:aura:mainnet:id.with.dots')).toBe(true);
    });
  });

  describe('extractDIDNetwork', () => {
    it('should extract network from valid DID', () => {
      expect(extractDIDNetwork('did:aura:mainnet:aura1abc')).toBe('mainnet');
      expect(extractDIDNetwork('did:aura:testnet:aura1abc')).toBe('testnet');
      expect(extractDIDNetwork('did:aura:local:aura1abc')).toBe('local');
    });

    it('should return null for invalid DID', () => {
      expect(extractDIDNetwork('invalid')).toBe(null);
      expect(extractDIDNetwork('')).toBe(null);
    });
  });

  describe('extractDIDIdentifier', () => {
    it('should extract identifier from valid DID', () => {
      expect(extractDIDIdentifier('did:aura:mainnet:aura1abc123')).toBe('aura1abc123');
    });

    it('should return null for identifiers with invalid characters like colons', () => {
      // Colons in identifier are not valid according to isValidDID
      expect(extractDIDIdentifier('did:aura:mainnet:part1:part2')).toBe(null);
    });

    it('should return null for invalid DID', () => {
      expect(extractDIDIdentifier('invalid')).toBe(null);
      expect(extractDIDIdentifier('')).toBe(null);
    });
  });
});

describe('VC ID Validation', () => {
  describe('isValidVCId', () => {
    it('should return true for valid VC IDs', () => {
      expect(isValidVCId('vc-123-abc')).toBe(true);
      expect(isValidVCId('vc_123_abc')).toBe(true);
      expect(isValidVCId('vc.123.abc')).toBe(true);
      expect(isValidVCId('vcABC123')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidVCId('')).toBe(false);
      expect(isValidVCId('   ')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidVCId(null as any)).toBe(false);
      expect(isValidVCId(undefined as any)).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isValidVCId(123 as any)).toBe(false);
    });

    it('should return false for IDs exceeding 256 characters', () => {
      const longId = 'a'.repeat(257);
      expect(isValidVCId(longId)).toBe(false);
    });

    it('should return false for IDs with invalid characters', () => {
      expect(isValidVCId('vc with spaces')).toBe(false);
      expect(isValidVCId('vc@special')).toBe(false);
      expect(isValidVCId('vc#hash')).toBe(false);
    });

    it('should accept 256 character IDs', () => {
      const maxId = 'a'.repeat(256);
      expect(isValidVCId(maxId)).toBe(true);
    });
  });
});

describe('Timestamp Functions', () => {
  describe('timestampToDate', () => {
    it('should convert Unix timestamp to Date', () => {
      const timestamp = 1735560000; // Some Unix timestamp
      const date = timestampToDate(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(timestamp * 1000);
    });

    it('should handle zero timestamp', () => {
      const date = timestampToDate(0);
      expect(date.getTime()).toBe(0);
    });
  });

  describe('dateToTimestamp', () => {
    it('should convert Date to Unix timestamp', () => {
      const date = new Date('2025-01-01T00:00:00.000Z');
      const timestamp = dateToTimestamp(date);
      expect(timestamp).toBe(Math.floor(date.getTime() / 1000));
    });

    it('should floor milliseconds', () => {
      const date = new Date(1735689600500); // .5 seconds
      const timestamp = dateToTimestamp(date);
      expect(timestamp).toBe(1735689600);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return current Unix timestamp in seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const timestamp = getCurrentTimestamp();
      const after = Math.floor(Date.now() / 1000);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('isExpired', () => {
    it('should return true for past timestamps', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(isExpired(pastTimestamp)).toBe(true);
    });

    it('should return false for future timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(isExpired(futureTimestamp)).toBe(false);
    });

    it('should respect tolerance window', () => {
      const recentPast = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago
      expect(isExpired(recentPast, 0)).toBe(true);
      expect(isExpired(recentPast, 30)).toBe(false); // Within tolerance
    });
  });

  describe('getTimeRemaining', () => {
    it('should return positive for future timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const remaining = getTimeRemaining(futureTimestamp);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it('should return negative for past timestamps', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
      const remaining = getTimeRemaining(pastTimestamp);
      expect(remaining).toBeLessThan(0);
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp as locale string', () => {
      const timestamp = 1735560000;
      const formatted = formatTimestamp(timestamp);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should accept custom locale', () => {
      const timestamp = 1735560000;
      const usFormat = formatTimestamp(timestamp, 'en-US');
      const gbFormat = formatTimestamp(timestamp, 'en-GB');
      // Formats may differ between locales
      expect(typeof usFormat).toBe('string');
      expect(typeof gbFormat).toBe('string');
    });
  });
});

describe('String Functions', () => {
  describe('sanitizeForLog', () => {
    it('should redact middle of long strings', () => {
      const value = 'aura1234567890abcdef';
      const sanitized = sanitizeForLog(value, 4);
      expect(sanitized).toBe('aura...cdef');
    });

    it('should return short strings unchanged', () => {
      const short = 'abc';
      expect(sanitizeForLog(short, 4)).toBe('abc');
    });

    it('should handle empty string', () => {
      expect(sanitizeForLog('')).toBe('');
    });

    it('should handle null-like values', () => {
      expect(sanitizeForLog(null as any)).toBe(null);
      expect(sanitizeForLog(undefined as any)).toBe(undefined);
    });

    it('should use default showChars of 4', () => {
      const value = '1234567890abcdef';
      const sanitized = sanitizeForLog(value);
      expect(sanitized).toBe('1234...cdef');
    });

    it('should handle custom showChars', () => {
      const value = '1234567890abcdef';
      const sanitized = sanitizeForLog(value, 2);
      expect(sanitized).toBe('12...ef');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'Hello World, this is a long string';
      const truncated = truncate(long, 15);
      expect(truncated).toBe('Hello World,...');
      expect(truncated.length).toBe(15);
    });

    it('should return short strings unchanged', () => {
      const short = 'Hello';
      expect(truncate(short, 10)).toBe('Hello');
    });

    it('should handle custom suffix', () => {
      const long = 'Hello World';
      const truncated = truncate(long, 8, '…');
      expect(truncated).toBe('Hello W…');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle null-like values', () => {
      expect(truncate(null as any, 10)).toBe(null);
      expect(truncate(undefined as any, 10)).toBe(undefined);
    });
  });
});

describe('Hex Functions', () => {
  describe('isValidHex', () => {
    it('should return true for valid hex strings', () => {
      expect(isValidHex('abc123')).toBe(true);
      expect(isValidHex('ABCDEF')).toBe(true);
      expect(isValidHex('0123456789abcdef')).toBe(true);
    });

    it('should return false for invalid hex characters', () => {
      expect(isValidHex('xyz')).toBe(false);
      expect(isValidHex('ghij')).toBe(false);
    });

    it('should return false for odd-length strings', () => {
      expect(isValidHex('abc')).toBe(false);
      expect(isValidHex('a')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidHex('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidHex(null as any)).toBe(false);
      expect(isValidHex(undefined as any)).toBe(false);
    });

    it('should validate expected byte length', () => {
      expect(isValidHex('abc123', 3)).toBe(true);  // 3 bytes = 6 chars
      expect(isValidHex('abc123', 2)).toBe(false); // 3 bytes != 2 bytes
      expect(isValidHex('abcd', 2)).toBe(true);    // 2 bytes = 4 chars
    });
  });

  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const bytes = hexToBytes('abc123');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(3);
      expect(bytes[0]).toBe(0xab);
      expect(bytes[1]).toBe(0xc1);
      expect(bytes[2]).toBe(0x23);
    });

    it('should throw for invalid hex', () => {
      expect(() => hexToBytes('xyz')).toThrow('Invalid hex string');
      expect(() => hexToBytes('abc')).toThrow('Invalid hex string');
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([0xab, 0xc1, 0x23]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('abc123');
    });

    it('should pad single digits with zero', () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('010203');
    });

    it('should handle empty array', () => {
      const bytes = new Uint8Array([]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('');
    });
  });

  describe('hexToBytes and bytesToHex roundtrip', () => {
    it('should preserve data through roundtrip', () => {
      const original = 'deadbeef';
      const bytes = hexToBytes(original);
      const result = bytesToHex(bytes);
      expect(result).toBe(original);
    });

    it('should handle uppercase input', () => {
      const original = 'DEADBEEF';
      const bytes = hexToBytes(original);
      const result = bytesToHex(bytes);
      expect(result).toBe(original.toLowerCase());
    });
  });
});

describe('Object Functions', () => {
  describe('deepClone', () => {
    it('should create a deep copy of objects', () => {
      const original = { a: 1, b: { c: 2, d: [3, 4] } };
      const clone = deepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone.b).not.toBe(original.b);
      expect(clone.b.d).not.toBe(original.b.d);
    });

    it('should handle arrays', () => {
      const original = [1, 2, { a: 3 }];
      const clone = deepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone[2]).not.toBe(original[2]);
    });

    it('should handle primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });
  });
});

describe('Async Functions', () => {
  describe('sleep', () => {
    it('should pause for specified duration', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });

    it('should handle zero duration', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('retry', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, { maxAttempts: 3, delayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retry(fn, { maxAttempts: 3, delayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(
        retry(fn, { maxAttempts: 3, delayMs: 10 })
      ).rejects.toThrow('always fail');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retry(fn, { maxAttempts: 2, delayMs: 20, backoff: 2 });
      const elapsed = Date.now() - start;

      // First failure + delay of ~20ms
      expect(elapsed).toBeGreaterThanOrEqual(15);
    });

    it('should use default options', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn);

      expect(result).toBe('success');
    });

    it('should handle non-Error rejections', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      await expect(
        retry(fn, { maxAttempts: 1, delayMs: 1 })
      ).rejects.toThrow('string error');
    });
  });
});

describe('Environment Detection', () => {
  describe('isBrowser', () => {
    it('should return false in Node.js environment', () => {
      expect(isBrowser()).toBe(false);
    });
  });

  describe('isNode', () => {
    it('should return true in Node.js environment', () => {
      expect(isNode()).toBe(true);
    });
  });
});
