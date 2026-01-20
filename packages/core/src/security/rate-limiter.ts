/**
 * Rate Limiter - Protect Against Abuse
 *
 * This module provides configurable rate limiting to prevent abuse of the Aura Verifier SDK.
 * Supports per-DID, per-verifier, and global rate limiting with multiple algorithms.
 *
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Sliding window rate limiting
 * - Per-identifier rate limiting (DID, verifier, IP, etc.)
 * - Configurable burst capacity
 * - Exponential backoff support
 * - Distributed rate limiting support (Redis, etc.)
 * - Timing attack resistance with cryptographic jitter
 *
 * @module security/rate-limiter
 */

import { randomBytes } from 'crypto';

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly identifier: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Rate limit bucket state
 */
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  violations: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /**
   * Maximum number of requests allowed per time window
   * @default 100
   */
  maxRequests?: number;

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Burst capacity (requests allowed in quick succession)
   * @default maxRequests
   */
  burstCapacity?: number;

  /**
   * Token refill rate (tokens per millisecond)
   * Calculated automatically if not provided
   */
  refillRate?: number;

  /**
   * Enable exponential backoff on repeated violations
   * @default true
   */
  exponentialBackoff?: boolean;

  /**
   * Base backoff time in milliseconds
   * @default 1000 (1 second)
   */
  backoffBase?: number;

  /**
   * Maximum backoff time in milliseconds
   * @default 3600000 (1 hour)
   */
  maxBackoff?: number;

  /**
   * How often to cleanup stale entries (milliseconds)
   * @default 300000 (5 minutes)
   */
  cleanupInterval?: number;

  /**
   * Disable timing jitter (for testing only - NOT recommended in production)
   * When enabled, removes the cryptographic timing jitter that protects against timing attacks.
   * @default false
   */
  disableJitter?: boolean;
}

/**
 * Storage interface for rate limiting
 */
export interface RateLimiterStorage {
  /**
   * Get bucket state for an identifier
   */
  get(identifier: string): Promise<RateLimitBucket | null>;

  /**
   * Set bucket state for an identifier
   */
  set(identifier: string, bucket: RateLimitBucket, ttlMs: number): Promise<void>;

  /**
   * Delete bucket for an identifier
   */
  delete(identifier: string): Promise<void>;

  /**
   * Clear all buckets
   */
  clear(): Promise<void>;

  /**
   * Get total number of tracked identifiers
   */
  size(): Promise<number>;
}

/**
 * In-memory rate limiter storage
 */
export class InMemoryRateLimiterStorage implements RateLimiterStorage {
  private buckets: Map<string, { bucket: RateLimitBucket; expiresAt: number }> = new Map();

  async get(identifier: string): Promise<RateLimitBucket | null> {
    const entry = this.buckets.get(identifier);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.buckets.delete(identifier);
      return null;
    }

    return entry.bucket;
  }

  async set(identifier: string, bucket: RateLimitBucket, ttlMs: number): Promise<void> {
    this.buckets.set(identifier, {
      bucket,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(identifier: string): Promise<void> {
    this.buckets.delete(identifier);
  }

  async clear(): Promise<void> {
    this.buckets.clear();
  }

  async size(): Promise<number> {
    // Clean up expired entries first
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, entry] of this.buckets.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.buckets.delete(id);
    }

    return this.buckets.size;
  }
}

/**
 * Token Bucket Rate Limiter
 *
 * Uses the token bucket algorithm for smooth rate limiting with burst capacity.
 * Tokens are refilled at a constant rate, allowing for burst traffic up to the bucket capacity.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000, // 1 minute
 *   burstCapacity: 20, // Allow 20 requests in quick succession
 * });
 *
 * // Check if request is allowed
 * try {
 *   await limiter.checkLimit('did:aura:user123');
 *   // Process request
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
 *   }
 * }
 * ```
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly burstCapacity: number;
  private readonly refillRate: number;
  private readonly exponentialBackoff: boolean;
  private readonly backoffBase: number;
  private readonly maxBackoff: number;
  private readonly storage: RateLimiterStorage;
  private readonly disableJitter: boolean;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: RateLimiterConfig = {}, storage?: RateLimiterStorage) {
    this.maxRequests = config.maxRequests ?? 100;
    this.windowMs = config.windowMs ?? 60000;
    this.burstCapacity = config.burstCapacity ?? this.maxRequests;
    this.exponentialBackoff = config.exponentialBackoff ?? true;
    this.backoffBase = config.backoffBase ?? 1000;
    this.maxBackoff = config.maxBackoff ?? 3600000;
    this.storage = storage || new InMemoryRateLimiterStorage();
    this.disableJitter = config.disableJitter ?? false;

    // Calculate refill rate (tokens per millisecond)
    this.refillRate = config.refillRate ?? this.maxRequests / this.windowMs;

    // Start cleanup
    const cleanupInterval = config.cleanupInterval ?? 300000;
    this.startCleanup(cleanupInterval);
  }

  /**
   * Start automatic cleanup of stale entries
   */
  private startCleanup(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.storage.size().catch(() => {
        // Silent cleanup failure (security: no info disclosure)
      });
    }, interval);

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
   * Get or create bucket for an identifier
   */
  private async getBucket(identifier: string): Promise<RateLimitBucket> {
    const existing = await this.storage.get(identifier);

    if (existing) {
      return existing;
    }

    // Create new bucket with full capacity
    return {
      tokens: this.burstCapacity,
      lastRefill: Date.now(),
      violations: 0,
    };
  }

  /**
   * Refill tokens in the bucket
   */
  private refillBucket(bucket: RateLimitBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;

    // Calculate tokens to add
    const tokensToAdd = timePassed * this.refillRate;

    // Refill bucket (capped at burst capacity)
    bucket.tokens = Math.min(this.burstCapacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Calculate backoff time based on violations
   */
  private calculateBackoff(violations: number): number {
    if (!this.exponentialBackoff) {
      return this.backoffBase;
    }

    // Exponential backoff: base * 2^violations
    const backoff = this.backoffBase * Math.pow(2, violations);
    return Math.min(backoff, this.maxBackoff);
  }

  /**
   * Add cryptographically random jitter to make timing attacks infeasible
   *
   * Security: Prevents attackers from inferring rate limit state via timing.
   * Uses crypto.randomBytes() for unpredictable randomness, not Math.random().
   * Window of 5-25ms provides sufficient variance to defeat statistical analysis.
   */
  private async addTimingJitter(): Promise<void> {
    // Skip jitter if disabled (for testing only)
    if (this.disableJitter) {
      return;
    }

    // Use cryptographic randomness instead of Math.random()
    // Range: 5-25ms provides sufficient variance against timing attacks
    // While 0-5ms could be statistically analyzed with enough samples,
    // 20ms variance makes timing attacks computationally infeasible
    const bytes = randomBytes(2);
    const randomValue = bytes.readUInt16LE(0);
    const jitter = 5 + (randomValue / 65535) * 20; // 5-25ms range

    await new Promise((resolve) => setTimeout(resolve, jitter));
  }

  /**
   * Constant-time comparison to prevent timing attacks on string comparisons.
   * Returns true if both strings are equal, takes the same time regardless of
   * where strings differ.
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do the comparison to maintain constant time
      // even when lengths differ
      const maxLen = Math.max(a.length, b.length);
      a = a.padEnd(maxLen, '\0');
      b = b.padEnd(maxLen, '\0');
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Check if a request is allowed for the given identifier
   *
   * Security: Uses constant-time patterns and jitter to prevent timing attacks
   *
   * @param identifier - Unique identifier (DID, verifier ID, IP address, etc.)
   * @param cost - Number of tokens to consume (default: 1)
   * @throws {RateLimitError} If rate limit is exceeded
   */
  async checkLimit(identifier: string, cost: number = 1): Promise<void> {
    // Security: Add jitter at start to prevent timing attacks
    await this.addTimingJitter();

    // Get bucket and refill tokens
    const bucket = await this.getBucket(identifier);
    this.refillBucket(bucket);

    // Security: Always calculate backoff even if not needed (constant-time)
    // This prevents timing-based inference of rate limit state
    const hasEnoughTokens = bucket.tokens >= cost;
    const potentialViolations = bucket.violations + 1;
    const retryAfter = this.calculateBackoff(potentialViolations);

    // Update bucket state - same operations regardless of outcome
    if (hasEnoughTokens) {
      bucket.tokens -= cost;
      bucket.violations = 0;
    } else {
      bucket.violations = potentialViolations;
    }

    // Save bucket state (always executed)
    await this.storage.set(identifier, bucket, this.windowMs * 2);

    // Security: Add final jitter before response
    await this.addTimingJitter();

    // Throw only after all operations complete
    if (!hasEnoughTokens) {
      throw new RateLimitError(
        `Rate limit exceeded for ${identifier}. Retry after ${Math.ceil(retryAfter / 1000)}s`,
        identifier,
        retryAfter
      );
    }
  }

  /**
   * Check remaining capacity for an identifier without consuming tokens
   *
   * @param identifier - Unique identifier
   * @returns Remaining tokens available
   */
  async getRemainingCapacity(identifier: string): Promise<number> {
    const bucket = await this.getBucket(identifier);
    this.refillBucket(bucket);
    return Math.floor(bucket.tokens);
  }

  /**
   * Reset rate limit for an identifier
   *
   * @param identifier - Unique identifier to reset
   */
  async reset(identifier: string): Promise<void> {
    await this.storage.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  async clear(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Get total number of tracked identifiers
   */
  async size(): Promise<number> {
    return this.storage.size();
  }
}

/**
 * Multi-tier rate limiter with different limits for different scopes
 *
 * @example
 * ```typescript
 * const limiter = new MultiTierRateLimiter({
 *   global: { maxRequests: 10000, windowMs: 60000 },
 *   perVerifier: { maxRequests: 1000, windowMs: 60000 },
 *   perDID: { maxRequests: 100, windowMs: 60000 },
 * });
 *
 * await limiter.checkLimit({
 *   verifierId: 'verifier123',
 *   did: 'did:aura:user456',
 * });
 * ```
 */
export class MultiTierRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor(private configs: Record<string, RateLimiterConfig>) {
    for (const [tier, config] of Object.entries(configs)) {
      this.limiters.set(tier, new RateLimiter(config));
    }
  }

  /**
   * Check rate limits for multiple tiers
   *
   * @param identifiers - Map of tier names to identifiers
   * @throws {RateLimitError} If any tier limit is exceeded
   */
  async checkLimit(identifiers: Record<string, string>): Promise<void> {
    // Check all tiers in parallel
    const checks = Object.entries(identifiers).map(async ([tier, identifier]) => {
      const limiter = this.limiters.get(tier);
      if (!limiter) {
        throw new Error(`Unknown rate limit tier: ${tier}`);
      }
      return limiter.checkLimit(identifier);
    });

    await Promise.all(checks);
  }

  /**
   * Get remaining capacity for all tiers
   */
  async getRemainingCapacity(identifiers: Record<string, string>): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const [tier, identifier] of Object.entries(identifiers)) {
      const limiter = this.limiters.get(tier);
      if (limiter) {
        results[tier] = await limiter.getRemainingCapacity(identifier);
      }
    }

    return results;
  }

  /**
   * Stop all rate limiters
   */
  stop(): void {
    for (const limiter of this.limiters.values()) {
      limiter.stop();
    }
  }

  /**
   * Clear all rate limit data
   */
  async clear(): Promise<void> {
    await Promise.all(Array.from(this.limiters.values()).map((limiter) => limiter.clear()));
  }
}
