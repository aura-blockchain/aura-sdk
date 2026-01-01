/**
 * Utility Functions for Aura Verifier SDK
 *
 * Provides helper functions for common operations like ID generation,
 * DID validation, timestamp conversion, and data formatting.
 */

import { randomBytes } from 'crypto';
import { DID_PATTERN } from '../types/constants.js';

/**
 * Generate a unique audit ID for verification operations
 * Uses cryptographically secure random bytes for uniqueness
 *
 * @returns A unique hex-encoded audit ID (32 characters)
 *
 * @example
 * ```typescript
 * const auditId = generateAuditId();
 * console.log(auditId); // "a1b2c3d4e5f67890abcdef1234567890"
 * ```
 */
export function generateAuditId(): string {
  // Generate 16 random bytes (128 bits) for strong uniqueness
  const bytes = randomBytes(16);
  // Convert to hex string (32 characters)
  return bytes.toString('hex');
}

/**
 * Generate a unique presentation ID
 * Alias for generateAuditId() for semantic clarity
 *
 * @returns A unique hex-encoded presentation ID (32 characters)
 */
export function generatePresentationId(): string {
  return generateAuditId();
}

/**
 * Generate a cryptographically secure nonce
 *
 * @returns A random number between 0 and 2^32-1
 *
 * @example
 * ```typescript
 * const nonce = generateNonce();
 * console.log(nonce); // 2847562901
 * ```
 */
export function generateNonce(): number {
  // Generate 4 random bytes and convert to uint32
  const bytes = randomBytes(4);
  return bytes.readUInt32BE(0);
}

/**
 * Format a DID string for display
 * Shortens long DIDs for better readability while preserving uniqueness
 *
 * @param did - The DID to format
 * @param maxLength - Maximum length of formatted DID (default: 40)
 * @returns Formatted DID string
 *
 * @example
 * ```typescript
 * const did = "did:aura:mainnet:aura1234567890abcdefghijklmnopqrstuvwxyz";
 * const formatted = formatDID(did);
 * console.log(formatted); // "did:aura:mainnet:aura123...rstuvwxyz"
 * ```
 */
export function formatDID(did: string, maxLength: number = 40): string {
  if (!did || did.length <= maxLength) {
    return did;
  }

  // Extract DID parts
  const parts = did.split(':');
  if (parts.length < 4) {
    // Not a valid DID, just truncate
    return `${did.substring(0, maxLength - 3)}...`;
  }

  // Format as "did:method:network:id..."
  const [method, didMethod, network, ...identifierParts] = parts;
  const identifier = identifierParts.join(':');

  const prefix = `${method}:${didMethod}:${network}:`;
  const availableLength = maxLength - prefix.length - 3; // 3 for "..."

  if (availableLength < 10) {
    // Not enough space, just truncate
    return `${did.substring(0, maxLength - 3)}...`;
  }

  // Show first and last parts of identifier
  const firstPart = identifier.substring(0, Math.floor(availableLength / 2));
  const lastPart = identifier.substring(identifier.length - Math.floor(availableLength / 2));

  return `${prefix}${firstPart}...${lastPart}`;
}

/**
 * Validate if a string is a valid Aura DID
 *
 * @param did - The DID string to validate
 * @returns True if valid DID format, false otherwise
 *
 * @example
 * ```typescript
 * isValidDID("did:aura:mainnet:aura1abc123"); // true
 * isValidDID("invalid-did"); // false
 * ```
 */
export function isValidDID(did: string): boolean {
  if (!did || typeof did !== 'string') {
    return false;
  }

  // Check basic DID pattern
  if (!DID_PATTERN.test(did)) {
    return false;
  }

  // Additional validation
  const parts = did.split(':');
  if (parts.length < 4) {
    return false;
  }

  const [method, didMethod, network, ...identifierParts] = parts;

  // Validate method
  if (method !== 'did') {
    return false;
  }

  // Validate DID method
  if (didMethod !== 'aura') {
    return false;
  }

  // Validate network is not empty
  if (!network || network.length === 0) {
    return false;
  }

  // Validate identifier is not empty
  const identifier = identifierParts.join(':');
  if (!identifier || identifier.length === 0) {
    return false;
  }

  // Validate identifier contains only valid characters
  if (!/^[a-zA-Z0-9._-]+$/.test(identifier)) {
    return false;
  }

  return true;
}

/**
 * Extract network from DID
 *
 * @param did - The DID string
 * @returns Network identifier or null if invalid
 *
 * @example
 * ```typescript
 * extractDIDNetwork("did:aura:mainnet:aura1abc"); // "mainnet"
 * extractDIDNetwork("did:aura:testnet:aura1abc"); // "testnet"
 * ```
 */
export function extractDIDNetwork(did: string): string | null {
  if (!isValidDID(did)) {
    return null;
  }

  const parts = did.split(':');
  return parts[2] || null;
}

/**
 * Extract identifier from DID
 *
 * @param did - The DID string
 * @returns Identifier portion or null if invalid
 *
 * @example
 * ```typescript
 * extractDIDIdentifier("did:aura:mainnet:aura1abc123"); // "aura1abc123"
 * ```
 */
export function extractDIDIdentifier(did: string): string | null {
  if (!isValidDID(did)) {
    return null;
  }

  const parts = did.split(':');
  return parts.slice(3).join(':') || null;
}

/**
 * Validate if a string is a valid VC ID
 * VC IDs should be non-empty strings with reasonable length
 *
 * @param vcId - The VC ID to validate
 * @returns True if valid VC ID, false otherwise
 *
 * @example
 * ```typescript
 * isValidVCId("vc-123-abc"); // true
 * isValidVCId(""); // false
 * ```
 */
export function isValidVCId(vcId: string): boolean {
  if (!vcId || typeof vcId !== 'string') {
    return false;
  }

  const trimmed = vcId.trim();

  // Must not be empty
  if (trimmed.length === 0) {
    return false;
  }

  // Must not exceed reasonable length
  if (trimmed.length > 256) {
    return false;
  }

  // Should contain only alphanumeric, hyphens, underscores, and dots
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Convert Unix timestamp (seconds) to Date object
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Date object
 *
 * @example
 * ```typescript
 * const date = timestampToDate(1735560000);
 * console.log(date.toISOString()); // "2025-01-01T00:00:00.000Z"
 * ```
 */
export function timestampToDate(timestamp: number): Date {
  // Unix timestamps are in seconds, Date expects milliseconds
  return new Date(timestamp * 1000);
}

/**
 * Convert Date object to Unix timestamp (seconds)
 *
 * @param date - Date object to convert
 * @returns Unix timestamp in seconds
 *
 * @example
 * ```typescript
 * const timestamp = dateToTimestamp(new Date('2025-01-01'));
 * console.log(timestamp); // 1735689600
 * ```
 */
export function dateToTimestamp(date: Date): number {
  // Date.getTime() returns milliseconds, convert to seconds
  return Math.floor(date.getTime() / 1000);
}

/**
 * Get current Unix timestamp in seconds
 *
 * @returns Current Unix timestamp
 *
 * @example
 * ```typescript
 * const now = getCurrentTimestamp();
 * console.log(now); // 1735689600
 * ```
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Check if a timestamp has expired
 *
 * @param expirationTime - Expiration timestamp in seconds
 * @param toleranceSeconds - Tolerance window in seconds (default: 0)
 * @returns True if expired, false otherwise
 *
 * @example
 * ```typescript
 * const expired = isExpired(1735560000, 30);
 * ```
 */
export function isExpired(expirationTime: number, toleranceSeconds: number = 0): boolean {
  const now = getCurrentTimestamp();
  return expirationTime < now - toleranceSeconds;
}

/**
 * Calculate time remaining until expiration
 *
 * @param expirationTime - Expiration timestamp in seconds
 * @returns Seconds remaining (negative if expired)
 *
 * @example
 * ```typescript
 * const remaining = getTimeRemaining(1735560000);
 * console.log(`${remaining} seconds remaining`);
 * ```
 */
export function getTimeRemaining(expirationTime: number): number {
  const now = getCurrentTimestamp();
  return expirationTime - now;
}

/**
 * Format timestamp as human-readable string
 *
 * @param timestamp - Unix timestamp in seconds
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date/time string
 *
 * @example
 * ```typescript
 * const formatted = formatTimestamp(1735560000);
 * console.log(formatted); // "12/30/2024, 12:00:00 PM"
 * ```
 */
export function formatTimestamp(timestamp: number, locale: string = 'en-US'): string {
  const date = timestampToDate(timestamp);
  return date.toLocaleString(locale);
}

/**
 * Sanitize string for safe logging (redact sensitive info)
 *
 * @param value - String to sanitize
 * @param showChars - Number of characters to show at start/end (default: 4)
 * @returns Sanitized string
 *
 * @example
 * ```typescript
 * sanitizeForLog("aura1234567890abcdef"); // "aura...cdef"
 * ```
 */
export function sanitizeForLog(value: string, showChars: number = 4): string {
  if (!value || value.length <= showChars * 2) {
    return value;
  }

  const start = value.substring(0, showChars);
  const end = value.substring(value.length - showChars);
  return `${start}...${end}`;
}

/**
 * Validate hex string format
 *
 * @param value - String to validate
 * @param expectedLength - Expected byte length (optional)
 * @returns True if valid hex string
 *
 * @example
 * ```typescript
 * isValidHex("abc123"); // true
 * isValidHex("xyz"); // false
 * isValidHex("abc123", 3); // true (3 bytes = 6 hex chars)
 * ```
 */
export function isValidHex(value: string, expectedLength?: number): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Check hex format
  if (!/^[0-9a-fA-F]+$/.test(value)) {
    return false;
  }

  // Hex strings should have even length (2 chars per byte)
  if (value.length % 2 !== 0) {
    return false;
  }

  // Check expected length if provided
  if (expectedLength !== undefined) {
    const byteLength = value.length / 2;
    return byteLength === expectedLength;
  }

  return true;
}

/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hex string to convert
 * @returns Uint8Array
 *
 * @example
 * ```typescript
 * const bytes = hexToBytes("abc123");
 * console.log(bytes); // Uint8Array(3) [171, 193, 35]
 * ```
 */
export function hexToBytes(hex: string): Uint8Array {
  if (!isValidHex(hex)) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 *
 * @param bytes - Byte array to convert
 * @returns Hex string
 *
 * @example
 * ```typescript
 * const hex = bytesToHex(new Uint8Array([171, 193, 35]));
 * console.log(hex); // "abc123"
 * ```
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deep clone an object using JSON serialization
 * Note: This will not preserve functions, undefined, or circular references
 *
 * @param obj - Object to clone
 * @returns Cloned object
 *
 * @example
 * ```typescript
 * const clone = deepClone({ a: 1, b: { c: 2 } });
 * ```
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Promise with function result
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 3, delayMs: 1000, backoff: 2 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = 2 } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        await sleep(currentDelay);
        currentDelay *= backoff;
      }
    }
  }

  throw lastError || new Error('Retry failed with no error');
}

/**
 * Truncate string to maximum length
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated (default: '...')
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * truncate("Hello World", 8); // "Hello..."
 * ```
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Check if running in browser environment
 *
 * @returns True if browser, false if Node.js
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Check if running in Node.js environment
 *
 * @returns True if Node.js, false if browser
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * Safe JSON reviver function to prevent prototype pollution attacks
 *
 * This reviver function blocks dangerous property names that could be used
 * for prototype pollution attacks when parsing untrusted JSON data.
 *
 * @param key - Property key being processed
 * @param value - Property value being processed
 * @returns The value if safe, undefined if the key is dangerous
 *
 * @example
 * ```typescript
 * const untrustedJSON = '{"__proto__": {"isAdmin": true}}';
 * const safe = JSON.parse(untrustedJSON, safeJSONReviver);
 * // __proto__ property will be undefined
 * ```
 */
export function safeJSONReviver(key: string, value: unknown): unknown {
  // Block prototype pollution vectors
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return value;
}
