/**
 * QR Code Parser
 *
 * Parses Aura QR codes from string format to structured data.
 * Supports both full URL format (aura://verify?data=<base64>) and raw base64.
 */

import type { QRCodeData, ParseResult, QRParserOptions } from './types.js';
import { QRParseError } from './errors.js';

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: Required<QRParserOptions> = {
  strict: true,
  expirationTolerance: 0,
  supportedVersions: ['1.0'],
};

/**
 * Parse QR code string into structured data
 *
 * @param qrString - QR code string (URL format or raw base64)
 * @param options - Parser configuration options
 * @returns Parsed QR code data
 * @throws {QRParseError} If parsing fails
 *
 * @example
 * ```typescript
 * const qrString = "aura://verify?data=eyJ2IjoiMS4wIiwicCI6IjEyMyIsImgiOiJkaWQ6YXVyYTptYWlubmV0OmFiYzEyMyIsInZjcyI6WyJ2YzEiXSwiY3R4Ijp7fSwiZXhwIjoxNzM1NTYwMDAwLCJuIjoxMjM0NTYsInNpZyI6ImFiY2RlZiJ9";
 * const data = parseQRCode(qrString);
 * console.log(data.p); // "123"
 * ```
 */
export function parseQRCode(qrString: string, options?: QRParserOptions): QRCodeData {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate input
  if (!qrString || typeof qrString !== 'string') {
    throw QRParseError.invalidFormat('QR string must be a non-empty string');
  }

  const trimmed = qrString.trim();
  if (trimmed.length === 0) {
    throw QRParseError.invalidFormat('QR string cannot be empty or whitespace');
  }

  // Extract base64 data
  const base64Data = extractBase64Data(trimmed);

  // Decode base64
  const jsonString = decodeBase64(base64Data);

  // Parse JSON
  const rawData = parseJSON(jsonString);

  // Validate and construct typed data
  const qrData = validateAndConstructQRData(rawData, opts);

  return qrData;
}

/**
 * Parse QR code string and return result object (non-throwing version)
 *
 * @param qrString - QR code string
 * @param options - Parser configuration options
 * @returns Parse result with success status and data or error
 *
 * @example
 * ```typescript
 * const result = parseQRCodeSafe(qrString);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function parseQRCodeSafe(qrString: string, options?: QRParserOptions): ParseResult {
  try {
    const data = parseQRCode(qrString, options);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract base64 data from QR string
 * Supports both URL format and raw base64
 */
function extractBase64Data(qrString: string): string {
  // Check if it's a URL format
  if (qrString.startsWith('aura://verify?')) {
    return extractFromURL(qrString);
  }

  // Check if it's a full URL with scheme
  if (qrString.startsWith('aura://')) {
    throw QRParseError.invalidFormat('URL must be in format: aura://verify?data=<base64>');
  }

  // Assume it's raw base64 data
  return qrString;
}

/**
 * Extract base64 data from URL format
 *
 * Handles the custom aura:// scheme by converting to a parseable format.
 * The URL format is: aura://verify?data=<base64>
 *
 * When converting aura://verify?data=... to http://verify?data=...,
 * the URL parser treats "verify" as the hostname, not the path.
 * We handle this by checking both hostname and pathname.
 */
function extractFromURL(url: string): string {
  try {
    // Parse URL (replace custom scheme with http for URL parsing)
    // Note: aura://verify?data=... becomes http://verify?data=...
    // where "verify" is treated as the hostname by the URL parser
    const parsedURL = new URL(url.replace('aura://', 'http://'));

    // In aura://verify?data=..., after conversion to http://verify?data=...
    // the URL parser treats "verify" as hostname and pathname becomes "/"
    // We need to accept both patterns:
    // 1. hostname === 'verify' && pathname === '/' (most common: aura://verify?data=...)
    // 2. pathname === '/verify' (alternative format: aura://host/verify?data=...)
    const isValidPath =
      (parsedURL.hostname === 'verify' && parsedURL.pathname === '/') ||
      parsedURL.pathname === '/verify' ||
      parsedURL.pathname === 'verify';

    if (!isValidPath) {
      throw QRParseError.invalidFormat(
        `Invalid URL format: expected "aura://verify?data=...", got hostname="${parsedURL.hostname}", path="${parsedURL.pathname}"`
      );
    }

    // Extract data parameter
    const data = parsedURL.searchParams.get('data');
    if (!data) {
      throw QRParseError.invalidFormat('Missing "data" parameter in URL');
    }

    if (data.trim().length === 0) {
      throw QRParseError.invalidFormat('"data" parameter cannot be empty');
    }

    return data;
  } catch (error) {
    if (error instanceof QRParseError) {
      throw error;
    }
    throw QRParseError.invalidFormat(
      `Failed to parse URL: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decode base64 string to JSON string
 */
function decodeBase64(base64String: string): string {
  try {
    // Remove whitespace and validate base64 characters
    const cleaned = base64String.replace(/\s/g, '');

    // Basic base64 validation
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      throw new Error('Invalid base64 characters');
    }

    // Decode base64 (Node.js/Browser compatible)
    let decoded: string;
    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
    } else if (typeof atob !== 'undefined') {
      // Browser environment - handle UTF-8 properly
      const binaryString = atob(cleaned);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      decoded = new TextDecoder('utf-8').decode(bytes);
    } else {
      throw new Error('No base64 decoder available');
    }

    if (!decoded || decoded.length === 0) {
      throw new Error('Decoded data is empty');
    }

    return decoded;
  } catch (error) {
    throw QRParseError.invalidBase64(error);
  }
}

/**
 * Reviver function to prevent prototype pollution attacks
 * Security: Blocks __proto__, constructor, and prototype keys
 */
function safeJSONReviver(key: string, value: unknown): unknown {
  // Block prototype pollution vectors
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return value;
}

/**
 * Parse JSON string to object
 * Security: Uses reviver function to prevent prototype pollution
 */
function parseJSON(jsonString: string): unknown {
  try {
    // Security: Use reviver to prevent prototype pollution
    const parsed = JSON.parse(jsonString, safeJSONReviver);

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parsed data must be an object');
    }

    return parsed;
  } catch (error) {
    throw QRParseError.invalidJSON(error);
  }
}

/**
 * Validate raw data and construct typed QRCodeData object
 */
function validateAndConstructQRData(
  rawData: unknown,
  options: Required<QRParserOptions>
): QRCodeData {
  if (!rawData || typeof rawData !== 'object') {
    throw QRParseError.invalidFormat('Data must be an object');
  }

  const data = rawData as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['v', 'p', 'h', 'vcs', 'ctx', 'exp', 'n', 'sig'];
  const missingFields = requiredFields.filter((field) => !(field in data));

  if (missingFields.length > 0) {
    throw QRParseError.missingFields(missingFields);
  }

  // Validate types
  if (typeof data.v !== 'string') {
    throw QRParseError.invalidFormat('Field "v" must be a string');
  }

  if (typeof data.p !== 'string') {
    throw QRParseError.invalidFormat('Field "p" must be a string');
  }

  if (typeof data.h !== 'string') {
    throw QRParseError.invalidFormat('Field "h" must be a string');
  }

  if (!Array.isArray(data.vcs)) {
    throw QRParseError.invalidFormat('Field "vcs" must be an array');
  }

  if (!data.vcs.every((item) => typeof item === 'string')) {
    throw QRParseError.invalidFormat('All items in "vcs" must be strings');
  }

  if (!data.ctx || typeof data.ctx !== 'object' || Array.isArray(data.ctx)) {
    throw QRParseError.invalidFormat('Field "ctx" must be an object');
  }

  if (typeof data.exp !== 'number') {
    throw QRParseError.invalidFormat('Field "exp" must be a number');
  }

  if (typeof data.n !== 'number') {
    throw QRParseError.invalidFormat('Field "n" must be a number');
  }

  if (typeof data.sig !== 'string') {
    throw QRParseError.invalidFormat('Field "sig" must be a string');
  }

  // Validate disclosure context
  const ctx = data.ctx as Record<string, unknown>;
  for (const [key, value] of Object.entries(ctx)) {
    if (value !== undefined && typeof value !== 'boolean') {
      throw QRParseError.invalidFormat(
        `Disclosure context field "${key}" must be boolean or undefined`
      );
    }
  }

  // Construct typed object
  const qrData: QRCodeData = {
    v: data.v as string,
    p: data.p as string,
    h: data.h as string,
    vcs: data.vcs as string[],
    ctx: ctx as QRCodeData['ctx'],
    exp: data.exp as number,
    n: data.n as number,
    sig: data.sig as string,
  };

  // Additional validations in strict mode
  if (options.strict) {
    validateStrictConstraints(qrData, options);
  }

  return qrData;
}

/**
 * Perform strict validation checks
 */
function validateStrictConstraints(data: QRCodeData, options: Required<QRParserOptions>): void {
  // Check protocol version
  if (!options.supportedVersions.includes(data.v)) {
    throw QRParseError.invalidFormat(
      `Unsupported protocol version "${data.v}". Supported: ${options.supportedVersions.join(', ')}`
    );
  }

  // Check empty strings
  if (data.p.trim().length === 0) {
    throw QRParseError.invalidFormat('Presentation ID cannot be empty');
  }

  if (data.h.trim().length === 0) {
    throw QRParseError.invalidFormat('Holder DID cannot be empty');
  }

  if (data.sig.trim().length === 0) {
    throw QRParseError.invalidFormat('Signature cannot be empty');
  }

  // Check vcs array
  if (data.vcs.length === 0) {
    throw QRParseError.invalidFormat('VC IDs array cannot be empty');
  }

  if (data.vcs.some((vc) => vc.trim().length === 0)) {
    throw QRParseError.invalidFormat('VC IDs cannot contain empty strings');
  }

  // Check nonce is non-negative
  if (data.n < 0) {
    throw QRParseError.invalidFormat('Nonce must be non-negative');
  }

  // Check expiration is valid timestamp
  if (data.exp <= 0) {
    throw QRParseError.invalidFormat('Expiration must be a positive timestamp');
  }

  // Check expiration is in reasonable range (not too far in past or future)
  const now = Math.floor(Date.now() / 1000);
  const yearInSeconds = 365 * 24 * 60 * 60;

  if (data.exp < now - yearInSeconds) {
    throw QRParseError.invalidFormat('Expiration timestamp is too far in the past (>1 year)');
  }

  if (data.exp > now + 10 * yearInSeconds) {
    throw QRParseError.invalidFormat('Expiration timestamp is too far in the future (>10 years)');
  }
}
