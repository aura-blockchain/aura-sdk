/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';

import {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  normalizeInput,
  isValidHex,
  isValidBase64,
  retry,
} from './utils';
import { EncodingError } from './errors';

describe('utils', () => {
  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const result = hexToBytes('48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle 0x prefix', () => {
      const result = hexToBytes('0x48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should throw error for invalid hex', () => {
      expect(() => hexToBytes('xyz')).toThrow(EncodingError);
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = bytesToHex(bytes);
      expect(result).toBe('48656c6c6f');
    });

    it('should add 0x prefix when requested', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = bytesToHex(bytes, true);
      expect(result).toBe('0x48656c6c6f');
    });
  });

  describe('base64ToBytes', () => {
    it('should convert base64 string to bytes', () => {
      const result = base64ToBytes('SGVsbG8=');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should throw error for invalid base64', () => {
      expect(() => base64ToBytes('invalid!@#')).toThrow(EncodingError);
    });
  });

  describe('bytesToBase64', () => {
    it('should convert bytes to base64 string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = bytesToBase64(bytes);
      expect(result).toBe('SGVsbG8=');
    });
  });

  describe('normalizeInput', () => {
    it('should return Uint8Array as-is', () => {
      const input = new Uint8Array([1, 2, 3]);
      const result = normalizeInput(input);
      expect(result).toBe(input);
    });

    it('should convert hex string', () => {
      const result = normalizeInput('48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should convert 0x-prefixed hex string', () => {
      const result = normalizeInput('0x48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should convert base64 string', () => {
      const result = normalizeInput('SGVsbG8=');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should convert UTF-8 string', () => {
      const result = normalizeInput('Hello');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });
  });

  describe('isValidHex', () => {
    it('should return true for valid hex', () => {
      expect(isValidHex('48656c6c6f')).toBe(true);
      expect(isValidHex('0x48656c6c6f')).toBe(true);
      expect(isValidHex('')).toBe(true);
    });

    it('should return false for invalid hex', () => {
      expect(isValidHex('xyz')).toBe(false);
      expect(isValidHex('48656c6c6')).toBe(false); // Odd length
    });
  });

  describe('isValidBase64', () => {
    it('should return true for valid base64', () => {
      expect(isValidBase64('SGVsbG8=')).toBe(true);
      expect(isValidBase64('SGVsbG8')).toBe(true);
      expect(isValidBase64('')).toBe(true);
    });

    it('should return false for invalid base64', () => {
      expect(isValidBase64('invalid!@#')).toBe(false);
    });
  });

  describe('retry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;
      const result = await retry(async () => {
        attempts++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry and eventually succeed', async () => {
      let attempts = 0;
      const result = await retry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Not yet');
          }
          return 'success';
        },
        { maxRetries: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      let attempts = 0;
      await expect(
        retry(
          async () => {
            attempts++;
            throw new Error('Always fail');
          },
          { maxRetries: 2, initialDelay: 10 }
        )
      ).rejects.toThrow('Always fail');

      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });
});
