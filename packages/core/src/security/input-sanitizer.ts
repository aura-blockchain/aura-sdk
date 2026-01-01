/**
 * Input Sanitizer - Prevent Injection Attacks
 *
 * This module provides comprehensive input validation and sanitization
 * to prevent injection attacks, malformed data, and other security issues.
 *
 * Features:
 * - QR code input sanitization
 * - DID format validation and sanitization
 * - String length enforcement
 * - HTML/script injection prevention
 * - URL validation and sanitization
 * - JSON schema validation
 * - Configurable validation rules
 *
 * @module security/input-sanitizer
 */

import { safeJSONReviver } from '../utils/index.js';

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Input sanitizer configuration
 */
export interface SanitizerConfig {
  /**
   * Maximum string length for general text fields
   * @default 10000
   */
  maxStringLength?: number;

  /**
   * Maximum length for DID strings
   * @default 200
   */
  maxDIDLength?: number;

  /**
   * Maximum JSON size in bytes
   * @default 1000000 (1MB)
   */
  maxJSONSize?: number;

  /**
   * Allow HTML tags in string inputs
   * @default false
   */
  allowHTML?: boolean;

  /**
   * Enable strict mode (more restrictive validation)
   * @default true
   */
  strictMode?: boolean;

  /**
   * Custom validation patterns
   */
  customPatterns?: Record<string, RegExp>;
}

/**
 * Common regex patterns for validation
 */
const PATTERNS = {
  // DID format: did:method:identifier
  DID: /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/,

  // Aura DID: did:aura:...
  AURA_DID: /^did:aura:[a-z0-9]+$/,

  // Hex string (even length)
  HEX: /^(0x)?[0-9a-fA-F]+$/,

  // Base64 string
  BASE64: /^[A-Za-z0-9+/]+=*$/,

  // Alphanumeric with basic special chars
  ALPHANUMERIC_SAFE: /^[a-zA-Z0-9_-]+$/,

  // URL (basic validation)
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,

  // Email
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Timestamp (unix timestamp or ISO 8601)
  TIMESTAMP: /^\d{10,13}$|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,

  // HTML tags (for detection)
  HTML_TAG: /<[^>]*>/,

  // Script tags (for detection)
  SCRIPT_TAG: /<script[^>]*>.*?<\/script>/gi,

  // SQL injection patterns
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)|(-{2})|\/\*|\*\/|;|xp_/gi,

  // Path traversal
  PATH_TRAVERSAL: /\.\.[\/\\]/,
};

/**
 * Input Sanitizer for security validation
 *
 * @example
 * ```typescript
 * const sanitizer = new InputSanitizer({
 *   maxStringLength: 5000,
 *   strictMode: true,
 * });
 *
 * // Sanitize QR code input
 * const qrData = sanitizer.sanitizeQRInput(rawInput);
 *
 * // Validate DID
 * sanitizer.validateDID('did:aura:user123');
 *
 * // Sanitize string with length check
 * const safe = sanitizer.sanitizeString(userInput, { maxLength: 1000 });
 * ```
 */
export class InputSanitizer {
  private readonly maxStringLength: number;
  private readonly maxDIDLength: number;
  private readonly maxJSONSize: number;
  private readonly allowHTML: boolean;
  private readonly strictMode: boolean;
  private readonly customPatterns: Record<string, RegExp>;

  constructor(config: SanitizerConfig = {}) {
    this.maxStringLength = config.maxStringLength ?? 10000;
    this.maxDIDLength = config.maxDIDLength ?? 200;
    this.maxJSONSize = config.maxJSONSize ?? 1000000;
    this.allowHTML = config.allowHTML ?? false;
    this.strictMode = config.strictMode ?? true;
    this.customPatterns = config.customPatterns ?? {};
  }

  /**
   * Sanitize QR code input
   *
   * @param input - Raw QR code data
   * @returns Sanitized input
   * @throws {ValidationError} If input is invalid
   */
  sanitizeQRInput(input: string): string {
    // Check for null/undefined
    if (input == null) {
      throw new ValidationError('QR input is null or undefined', 'qr_input');
    }

    // Convert to string
    const str = String(input).trim();

    // Check length
    if (str.length === 0) {
      throw new ValidationError('QR input is empty', 'qr_input');
    }

    if (str.length > this.maxStringLength) {
      throw new ValidationError(
        `QR input exceeds maximum length (${str.length} > ${this.maxStringLength})`,
        'qr_input',
        str.length
      );
    }

    // Check for null bytes
    if (str.includes('\0')) {
      throw new ValidationError('QR input contains null bytes', 'qr_input');
    }

    // Check for script tags
    if (PATTERNS.SCRIPT_TAG.test(str)) {
      throw new ValidationError('QR input contains script tags', 'qr_input');
    }

    // In strict mode, check for any HTML
    if (this.strictMode && !this.allowHTML && PATTERNS.HTML_TAG.test(str)) {
      throw new ValidationError('QR input contains HTML tags', 'qr_input');
    }

    return str;
  }

  /**
   * Validate DID format
   *
   * @param did - DID string to validate
   * @param requireAura - Require Aura-specific DID
   * @throws {ValidationError} If DID is invalid
   */
  validateDID(did: string, requireAura: boolean = false): void {
    if (!did || typeof did !== 'string') {
      throw new ValidationError('DID must be a non-empty string', 'did', did);
    }

    const trimmed = did.trim();

    if (trimmed.length > this.maxDIDLength) {
      throw new ValidationError(
        `DID exceeds maximum length (${trimmed.length} > ${this.maxDIDLength})`,
        'did',
        trimmed.length
      );
    }

    const pattern = requireAura ? PATTERNS.AURA_DID : PATTERNS.DID;

    if (!pattern.test(trimmed)) {
      throw new ValidationError(
        requireAura ? 'Invalid Aura DID format' : 'Invalid DID format',
        'did',
        trimmed
      );
    }
  }

  /**
   * Sanitize string input
   *
   * @param input - String to sanitize
   * @param options - Sanitization options
   * @returns Sanitized string
   */
  sanitizeString(
    input: unknown,
    options: {
      maxLength?: number;
      allowEmpty?: boolean;
      pattern?: RegExp;
      fieldName?: string;
    } = {}
  ): string {
    const fieldName = options.fieldName ?? 'input';

    // Type check
    if (typeof input !== 'string') {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        typeof input
      );
    }

    const str = input.trim();

    // Empty check
    if (!options.allowEmpty && str.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
    }

    // Length check
    const maxLength = options.maxLength ?? this.maxStringLength;
    if (str.length > maxLength) {
      throw new ValidationError(
        `${fieldName} exceeds maximum length (${str.length} > ${maxLength})`,
        fieldName,
        str.length
      );
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(str)) {
      throw new ValidationError(
        `${fieldName} does not match required pattern`,
        fieldName,
        str
      );
    }

    // HTML check
    if (!this.allowHTML && PATTERNS.HTML_TAG.test(str)) {
      throw new ValidationError(`${fieldName} contains HTML tags`, fieldName);
    }

    // Script injection check
    if (PATTERNS.SCRIPT_TAG.test(str)) {
      throw new ValidationError(`${fieldName} contains script tags`, fieldName);
    }

    // SQL injection check (in strict mode)
    if (this.strictMode && PATTERNS.SQL_INJECTION.test(str)) {
      throw new ValidationError(
        `${fieldName} contains potential SQL injection patterns`,
        fieldName
      );
    }

    // Path traversal check
    if (PATTERNS.PATH_TRAVERSAL.test(str)) {
      throw new ValidationError(
        `${fieldName} contains path traversal patterns`,
        fieldName
      );
    }

    return str;
  }

  /**
   * Validate hex string
   *
   * @param input - Hex string to validate
   * @param exactLength - Exact byte length (if specified)
   * @param fieldName - Field name for error messages
   * @returns Validated hex string (without 0x prefix)
   */
  validateHex(
    input: string,
    exactLength?: number,
    fieldName: string = 'hex'
  ): string {
    const sanitized = this.sanitizeString(input, { fieldName });

    // Remove 0x prefix if present
    const hex = sanitized.startsWith('0x')
      ? sanitized.substring(2)
      : sanitized;

    // Validate hex format
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      throw new ValidationError(
        `${fieldName} must contain only hexadecimal characters`,
        fieldName,
        hex
      );
    }

    // Check even length (hex strings represent bytes)
    if (hex.length % 2 !== 0) {
      throw new ValidationError(
        `${fieldName} must have even length`,
        fieldName,
        hex.length
      );
    }

    // Check exact length if specified
    if (exactLength !== undefined) {
      const byteLength = hex.length / 2;
      if (byteLength !== exactLength) {
        throw new ValidationError(
          `${fieldName} must be exactly ${exactLength} bytes (${exactLength * 2} hex chars), got ${byteLength} bytes`,
          fieldName,
          byteLength
        );
      }
    }

    return hex.toLowerCase();
  }

  /**
   * Validate base64 string
   *
   * @param input - Base64 string to validate
   * @param fieldName - Field name for error messages
   * @returns Validated base64 string
   */
  validateBase64(input: string, fieldName: string = 'base64'): string {
    const sanitized = this.sanitizeString(input, { fieldName });

    if (!PATTERNS.BASE64.test(sanitized)) {
      throw new ValidationError(
        `${fieldName} is not valid base64`,
        fieldName
      );
    }

    return sanitized;
  }

  /**
   * Validate and sanitize URL
   *
   * @param input - URL to validate
   * @param requireHttps - Require HTTPS protocol
   * @param fieldName - Field name for error messages
   * @returns Validated URL
   */
  validateURL(
    input: string,
    requireHttps: boolean = false,
    fieldName: string = 'url'
  ): string {
    const sanitized = this.sanitizeString(input, { fieldName });

    if (!PATTERNS.URL.test(sanitized)) {
      throw new ValidationError(
        `${fieldName} is not a valid URL`,
        fieldName,
        sanitized
      );
    }

    if (requireHttps && !sanitized.startsWith('https://')) {
      throw new ValidationError(
        `${fieldName} must use HTTPS protocol`,
        fieldName,
        sanitized
      );
    }

    return sanitized;
  }

  /**
   * Validate email address
   *
   * @param input - Email to validate
   * @param fieldName - Field name for error messages
   * @returns Validated email
   */
  validateEmail(input: string, fieldName: string = 'email'): string {
    const sanitized = this.sanitizeString(input, { fieldName });

    if (!PATTERNS.EMAIL.test(sanitized)) {
      throw new ValidationError(
        `${fieldName} is not a valid email address`,
        fieldName,
        sanitized
      );
    }

    return sanitized.toLowerCase();
  }

  /**
   * Validate numeric input
   *
   * @param input - Number to validate
   * @param options - Validation options
   * @param fieldName - Field name for error messages
   * @returns Validated number
   */
  validateNumber(
    input: unknown,
    options: {
      min?: number;
      max?: number;
      integer?: boolean;
    } = {},
    fieldName: string = 'number'
  ): number {
    const num = typeof input === 'string' ? parseFloat(input) : Number(input);

    if (isNaN(num) || !isFinite(num)) {
      throw new ValidationError(
        `${fieldName} must be a valid number`,
        fieldName,
        input
      );
    }

    if (options.integer && !Number.isInteger(num)) {
      throw new ValidationError(
        `${fieldName} must be an integer`,
        fieldName,
        num
      );
    }

    if (options.min !== undefined && num < options.min) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.min}`,
        fieldName,
        num
      );
    }

    if (options.max !== undefined && num > options.max) {
      throw new ValidationError(
        `${fieldName} must be at most ${options.max}`,
        fieldName,
        num
      );
    }

    return num;
  }

  /**
   * Validate timestamp
   *
   * @param input - Timestamp (unix or ISO 8601)
   * @param fieldName - Field name for error messages
   * @returns Timestamp in milliseconds
   */
  validateTimestamp(input: string | number, fieldName: string = 'timestamp'): number {
    if (typeof input === 'number') {
      // Unix timestamp (seconds or milliseconds)
      if (input < 0) {
        throw new ValidationError(
          `${fieldName} cannot be negative`,
          fieldName,
          input
        );
      }

      // Convert seconds to milliseconds if needed
      const timestamp = input < 10000000000 ? input * 1000 : input;

      // Check if reasonable (between 2000 and 2100)
      const min = new Date('2000-01-01').getTime();
      const max = new Date('2100-01-01').getTime();

      if (timestamp < min || timestamp > max) {
        throw new ValidationError(
          `${fieldName} is out of reasonable range`,
          fieldName,
          timestamp
        );
      }

      return timestamp;
    }

    // ISO 8601 string
    const str = this.sanitizeString(input, { fieldName });
    const timestamp = Date.parse(str);

    if (isNaN(timestamp)) {
      throw new ValidationError(
        `${fieldName} is not a valid timestamp`,
        fieldName,
        str
      );
    }

    return timestamp;
  }

  /**
   * Sanitize JSON input
   *
   * @param input - JSON string or object
   * @param fieldName - Field name for error messages
   * @returns Parsed and validated JSON object
   */
  sanitizeJSON<T = unknown>(input: string | unknown, fieldName: string = 'json'): T {
    let obj: unknown;

    if (typeof input === 'string') {
      // Check size
      if (input.length > this.maxJSONSize) {
        throw new ValidationError(
          `${fieldName} exceeds maximum size (${input.length} > ${this.maxJSONSize})`,
          fieldName,
          input.length
        );
      }

      try {
        obj = JSON.parse(input, safeJSONReviver);
      } catch (error) {
        throw new ValidationError(
          `${fieldName} is not valid JSON: ${error instanceof Error ? error.message : 'unknown error'}`,
          fieldName
        );
      }
    } else {
      obj = input;
    }

    // Validate it's an object
    if (typeof obj !== 'object' || obj === null) {
      throw new ValidationError(
        `${fieldName} must be a JSON object`,
        fieldName,
        typeof obj
      );
    }

    return obj as T;
  }

  /**
   * Escape HTML special characters
   *
   * @param input - String to escape
   * @returns Escaped string
   */
  escapeHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Remove all HTML tags from string
   *
   * @param input - String to strip
   * @returns String without HTML tags
   */
  stripHTML(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }
}

/**
 * Global default sanitizer instance
 */
export const defaultSanitizer = new InputSanitizer();
