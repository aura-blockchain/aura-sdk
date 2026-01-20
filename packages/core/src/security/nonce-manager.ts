/**
 * Nonce Manager - Prevents Replay Attacks
 *
 * This module provides nonce tracking to prevent replay attacks in the Aura Verifier SDK.
 * It supports both in-memory and distributed storage backends with configurable time-based expiration.
 *
 * Features:
 * - Track used nonces with automatic expiration
 * - Prevent replay attacks by detecting reused nonces
 * - Memory-efficient bloom filter option for high-volume scenarios
 * - Pluggable storage backend (in-memory, Redis, etc.)
 * - Configurable time windows for nonce validity
 *
 * @module security/nonce-manager
 */

import { QRNonceError } from '../errors.js';

/**
 * Storage interface for nonce tracking
 * Implement this interface to use custom storage backends (Redis, database, etc.)
 */
export interface NonceStorage {
  /**
   * Check if a nonce has been used
   * @param nonce - The nonce to check
   * @returns Promise resolving to true if nonce has been used
   */
  hasNonce(nonce: string): Promise<boolean>;

  /**
   * Mark a nonce as used
   * @param nonce - The nonce to mark
   * @param expiresAt - Timestamp when nonce should expire (milliseconds)
   */
  addNonce(nonce: string, expiresAt: number): Promise<void>;

  /**
   * Remove expired nonces from storage
   * @param beforeTimestamp - Remove nonces expiring before this timestamp
   */
  cleanup(beforeTimestamp: number): Promise<void>;

  /**
   * Clear all nonces (for testing/reset)
   */
  clear(): Promise<void>;

  /**
   * Get total number of tracked nonces
   */
  size(): Promise<number>;
}

/**
 * In-memory nonce storage implementation
 * Suitable for single-instance deployments or testing
 */
export class InMemoryNonceStorage implements NonceStorage {
  private nonces: Map<string, number> = new Map();

  async hasNonce(nonce: string): Promise<boolean> {
    return this.nonces.has(nonce);
  }

  async addNonce(nonce: string, expiresAt: number): Promise<void> {
    this.nonces.set(nonce, expiresAt);
  }

  async cleanup(beforeTimestamp: number): Promise<void> {
    const toDelete: string[] = [];

    for (const [nonce, expiresAt] of this.nonces.entries()) {
      if (expiresAt < beforeTimestamp) {
        toDelete.push(nonce);
      }
    }

    for (const nonce of toDelete) {
      this.nonces.delete(nonce);
    }
  }

  async clear(): Promise<void> {
    this.nonces.clear();
  }

  async size(): Promise<number> {
    return this.nonces.size;
  }
}

/**
 * Bloom filter for memory-efficient nonce tracking
 * Provides probabilistic membership testing with low memory footprint
 * Note: May produce false positives but never false negatives
 */
export class BloomFilterNonceStorage implements NonceStorage {
  private bitArray: Uint8Array;
  private filterSize: number;
  private hashCount: number;
  private itemCount: number = 0;

  /**
   * @param expectedItems - Expected number of nonces to track
   * @param falsePositiveRate - Desired false positive rate (0-1)
   */
  constructor(expectedItems: number = 100000, falsePositiveRate: number = 0.01) {
    // Calculate optimal bloom filter size
    this.filterSize = Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / Math.log(2) ** 2);

    // Calculate optimal number of hash functions
    this.hashCount = Math.ceil((this.filterSize / expectedItems) * Math.log(2));

    // Initialize bit array
    this.bitArray = new Uint8Array(Math.ceil(this.filterSize / 8));
  }

  /**
   * Generate hash values for a nonce
   */
  private getHashes(nonce: string): number[] {
    const hashes: number[] = [];

    // Use simple hash functions (in production, consider crypto.subtle)
    for (let i = 0; i < this.hashCount; i++) {
      let hash = 0;
      const data = nonce + i.toString();

      for (let j = 0; j < data.length; j++) {
        hash = (hash << 5) - hash + data.charCodeAt(j);
        hash = hash & hash; // Convert to 32-bit integer
      }

      hashes.push(Math.abs(hash) % this.filterSize);
    }

    return hashes;
  }

  /**
   * Set a bit in the bit array
   */
  private setBit(position: number): void {
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    this.bitArray[byteIndex] |= 1 << bitIndex;
  }

  /**
   * Check if a bit is set
   */
  private isBitSet(position: number): boolean {
    const byteIndex = Math.floor(position / 8);
    const bitIndex = position % 8;
    return (this.bitArray[byteIndex] & (1 << bitIndex)) !== 0;
  }

  async hasNonce(nonce: string): Promise<boolean> {
    const hashes = this.getHashes(nonce);

    // Check if all bits are set
    for (const hash of hashes) {
      if (!this.isBitSet(hash)) {
        return false;
      }
    }

    return true;
  }

  async addNonce(nonce: string, _expiresAt: number): Promise<void> {
    const hashes = this.getHashes(nonce);

    // Set all bits
    for (const hash of hashes) {
      this.setBit(hash);
    }

    this.itemCount++;
  }

  async cleanup(_beforeTimestamp: number): Promise<void> {
    // Bloom filters don't support individual item removal
    // This is a limitation - consider using counting bloom filter for this feature
  }

  async clear(): Promise<void> {
    this.bitArray = new Uint8Array(Math.ceil(this.filterSize / 8));
    this.itemCount = 0;
  }

  async size(): Promise<number> {
    return this.itemCount;
  }

  /**
   * Calculate current false positive probability
   */
  getFalsePositiveProbability(): number {
    const ratio = this.itemCount / (this.filterSize / this.hashCount);
    return Math.pow(1 - Math.exp(-ratio), this.hashCount);
  }
}

/**
 * Configuration for NonceManager
 */
export interface NonceManagerConfig {
  /**
   * Time window in milliseconds for nonce validity
   * Nonces older than this will be rejected
   * @default 300000 (5 minutes)
   */
  nonceWindow?: number;

  /**
   * How often to cleanup expired nonces (milliseconds)
   * @default 60000 (1 minute)
   */
  cleanupInterval?: number;

  /**
   * Storage backend for nonce tracking
   * @default InMemoryNonceStorage
   */
  storage?: NonceStorage;

  /**
   * Maximum clock skew allowed (milliseconds)
   * Accounts for time differences between client and server
   * @default 30000 (30 seconds)
   */
  clockSkew?: number;
}

/**
 * Nonce Manager for preventing replay attacks
 *
 * @example
 * ```typescript
 * const manager = new NonceManager({
 *   nonceWindow: 300000, // 5 minutes
 *   cleanupInterval: 60000, // 1 minute
 * });
 *
 * // Check and mark nonce as used
 * await manager.validateNonce('123456789', Date.now());
 *
 * // This will throw QRNonceError
 * await manager.validateNonce('123456789', Date.now());
 * ```
 */
export class NonceManager {
  private readonly storage: NonceStorage;
  private readonly nonceWindow: number;
  private readonly clockSkew: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: NonceManagerConfig = {}) {
    this.storage = config.storage || new InMemoryNonceStorage();
    this.nonceWindow = config.nonceWindow ?? 300000; // 5 minutes default
    this.clockSkew = config.clockSkew ?? 30000; // 30 seconds default

    // Start automatic cleanup
    const cleanupInterval = config.cleanupInterval ?? 60000;
    this.startCleanup(cleanupInterval);
  }

  /**
   * Start automatic cleanup of expired nonces
   */
  private startCleanup(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      this.storage.cleanup(now).catch(() => {
        // Silent cleanup failure (security: no info disclosure)
      });
    }, interval);

    // Allow process to exit if this is the only timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Validate a nonce and mark it as used
   *
   * @param nonce - The nonce value to validate
   * @param timestamp - Timestamp when nonce was created (milliseconds)
   * @throws {QRNonceError} If nonce is invalid, expired, or already used
   */
  async validateNonce(nonce: string | number, timestamp: number): Promise<void> {
    // Convert nonce to string
    const nonceStr = String(nonce);

    // Validate nonce format
    if (!nonceStr || nonceStr.trim() === '') {
      throw QRNonceError.invalidNonce(nonce);
    }

    // Check timestamp is not in the future (accounting for clock skew)
    const now = Date.now();
    if (timestamp > now + this.clockSkew) {
      throw new QRNonceError(
        `Nonce timestamp is in the future (possible clock skew)`,
        typeof nonce === 'number' ? nonce : undefined
      );
    }

    // Check if nonce is within valid time window
    const age = now - timestamp;
    if (age > this.nonceWindow) {
      throw new QRNonceError(
        `Nonce expired (age: ${Math.floor(age / 1000)}s, window: ${Math.floor(this.nonceWindow / 1000)}s)`,
        typeof nonce === 'number' ? nonce : undefined
      );
    }

    // Check if nonce has been used
    const hasBeenUsed = await this.storage.hasNonce(nonceStr);
    if (hasBeenUsed) {
      throw QRNonceError.reusedNonce(typeof nonce === 'number' ? nonce : parseInt(nonceStr, 10));
    }

    // Mark nonce as used with expiration time
    const expiresAt = timestamp + this.nonceWindow;
    await this.storage.addNonce(nonceStr, expiresAt);
  }

  /**
   * Check if a nonce has been used without marking it
   *
   * @param nonce - The nonce to check
   * @returns Promise resolving to true if nonce has been used
   */
  async hasBeenUsed(nonce: string | number): Promise<boolean> {
    return this.storage.hasNonce(String(nonce));
  }

  /**
   * Manually trigger cleanup of expired nonces
   */
  async cleanup(): Promise<void> {
    await this.storage.cleanup(Date.now());
  }

  /**
   * Clear all tracked nonces (for testing)
   */
  async clear(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Get number of tracked nonces
   */
  async size(): Promise<number> {
    return this.storage.size();
  }
}

/**
 * Adapter that wraps NonceManager to implement the NonceValidator interface
 * from qr/types.ts for integration with QR validation flow.
 *
 * @example
 * ```typescript
 * import { NonceManager, NonceValidatorAdapter } from './security/nonce-manager.js';
 * import { validateQRCode } from './qr/validator.js';
 *
 * const nonceManager = new NonceManager({ nonceWindow: 300000 });
 * const nonceValidator = new NonceValidatorAdapter(nonceManager);
 *
 * await validateQRCode(qrData, { nonceValidator });
 * ```
 */
export class NonceValidatorAdapter {
  private readonly manager: NonceManager;

  constructor(manager: NonceManager) {
    this.manager = manager;
  }

  /**
   * Validate a nonce and mark it as used
   *
   * @param nonce - The nonce value from QR code
   * @param presentationId - The presentation ID (for context/logging)
   * @param expiresAt - When this nonce should expire (Unix timestamp in seconds)
   * @returns Promise resolving to true if nonce is valid (not previously used)
   */
  async validateAndMark(
    nonce: number,
    presentationId: string,
    expiresAt: number
  ): Promise<boolean> {
    try {
      // Convert expiresAt from seconds to milliseconds for NonceManager
      // The timestamp is when the presentation was created (derived from expiration)
      const expiresAtMs = expiresAt * 1000;

      // Use a composite key to include presentation context
      const compositeNonce = `${presentationId}:${nonce}`;

      // Validate and mark using the underlying manager
      // Use current time for timestamp since we're validating at presentation time
      await this.manager.validateNonce(compositeNonce, Date.now());

      return true;
    } catch {
      // Nonce validation failed (expired, reused, or invalid)
      // Security: Don't expose details about why it failed
      return false;
    }
  }
}

/**
 * Create a NonceValidator from a NonceManager
 *
 * @param manager - The NonceManager instance to wrap
 * @returns A NonceValidator implementation
 */
export function createNonceValidator(manager: NonceManager): NonceValidatorAdapter {
  return new NonceValidatorAdapter(manager);
}
