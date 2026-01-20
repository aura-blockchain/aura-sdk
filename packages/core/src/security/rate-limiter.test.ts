/**
 * Tests for Rate Limiter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  RateLimiter,
  MultiTierRateLimiter,
  RateLimitError,
  InMemoryRateLimiterStorage,
} from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000,
      burstCapacity: 5,
      cleanupInterval: 500,
      disableJitter: true, // Disable jitter for testing to avoid timing issues
    });
  });

  afterEach(() => {
    limiter.stop();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const identifier = 'test-user';

      for (let i = 0; i < 5; i++) {
        await expect(limiter.checkLimit(identifier)).resolves.not.toThrow();
      }
    });

    it('should reject requests exceeding burst capacity', async () => {
      const identifier = 'test-user';

      // Use up burst capacity
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      // Next request should be rate limited
      await expect(limiter.checkLimit(identifier)).rejects.toThrow(RateLimitError);
    });

    it('should refill tokens over time', async () => {
      const identifier = 'test-user';

      // Use up burst capacity
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      // Wait for token refill
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should be able to make more requests
      await expect(limiter.checkLimit(identifier)).resolves.not.toThrow();
    });

    it('should track different identifiers separately', async () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // User 1 uses up capacity
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(user1);
      }

      // User 2 should still have capacity
      await expect(limiter.checkLimit(user2)).resolves.not.toThrow();
    });

    it('should handle custom cost', async () => {
      const identifier = 'test-user';

      // Use 3 tokens
      await limiter.checkLimit(identifier, 3);

      // Should have 2 tokens left (5 - 3)
      const remaining = await limiter.getRemainingCapacity(identifier);
      expect(remaining).toBeGreaterThanOrEqual(2);
      expect(remaining).toBeLessThanOrEqual(3); // Account for time-based refill
    });

    it('should implement exponential backoff on violations', async () => {
      const identifier = 'test-user';
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        burstCapacity: 2,
        exponentialBackoff: true,
        backoffBase: 100,
      });

      try {
        // Exhaust capacity
        await limiter.checkLimit(identifier);
        await limiter.checkLimit(identifier);

        // First violation
        try {
          await limiter.checkLimit(identifier);
        } catch (error) {
          if (error instanceof RateLimitError) {
            const firstRetryAfter = error.retryAfter;

            // Second violation (should have longer backoff)
            try {
              await limiter.checkLimit(identifier);
            } catch (error2) {
              if (error2 instanceof RateLimitError) {
                expect(error2.retryAfter).toBeGreaterThan(firstRetryAfter);
              }
            }
          }
        }
      } finally {
        limiter.stop();
      }
    });
  });

  describe('getRemainingCapacity', () => {
    it('should return full capacity for new identifier', async () => {
      const remaining = await limiter.getRemainingCapacity('new-user');
      expect(remaining).toBe(5); // burst capacity
    });

    it('should return decreased capacity after requests', async () => {
      const identifier = 'test-user';

      await limiter.checkLimit(identifier);
      await limiter.checkLimit(identifier);

      const remaining = await limiter.getRemainingCapacity(identifier);
      expect(remaining).toBeLessThan(5);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for identifier', async () => {
      const identifier = 'test-user';

      // Use up capacity
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(identifier);
      }

      // Should be rate limited
      await expect(limiter.checkLimit(identifier)).rejects.toThrow(RateLimitError);

      // Reset
      await limiter.reset(identifier);

      // Should work again
      await expect(limiter.checkLimit(identifier)).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all rate limit data', async () => {
      await limiter.checkLimit('user1');
      await limiter.checkLimit('user2');

      expect(await limiter.size()).toBe(2);

      await limiter.clear();
      expect(await limiter.size()).toBe(0);
    });
  });
});

describe('MultiTierRateLimiter', () => {
  let limiter: MultiTierRateLimiter;

  beforeEach(() => {
    // Disable jitter for all tiers to avoid timing issues in tests
    limiter = new MultiTierRateLimiter({
      global: { maxRequests: 100, windowMs: 1000, burstCapacity: 50, disableJitter: true },
      perVerifier: { maxRequests: 50, windowMs: 1000, burstCapacity: 25, disableJitter: true },
      perDID: { maxRequests: 10, windowMs: 1000, burstCapacity: 5, disableJitter: true },
    });
  });

  afterEach(() => {
    limiter.stop();
  });

  describe('checkLimit', () => {
    it('should check all tiers', async () => {
      await expect(
        limiter.checkLimit({
          global: 'global',
          perVerifier: 'verifier1',
          perDID: 'did:aura:user1',
        })
      ).resolves.not.toThrow();
    });

    it('should reject if any tier is exceeded', async () => {
      // Exhaust perDID tier
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit({
          global: 'global',
          perVerifier: 'verifier1',
          perDID: 'did:aura:user1',
        });
      }

      // Next request should fail on perDID tier
      await expect(
        limiter.checkLimit({
          global: 'global',
          perVerifier: 'verifier1',
          perDID: 'did:aura:user1',
        })
      ).rejects.toThrow(RateLimitError);
    });

    it('should track tiers independently', async () => {
      // Use perDID for user1
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit({
          global: 'global',
          perVerifier: 'verifier1',
          perDID: 'did:aura:user1',
        });
      }

      // user2 should still work (different perDID)
      await expect(
        limiter.checkLimit({
          global: 'global',
          perVerifier: 'verifier1',
          perDID: 'did:aura:user2',
        })
      ).resolves.not.toThrow();
    });

    it('should throw error for unknown tier', async () => {
      await expect(
        limiter.checkLimit({
          unknownTier: 'test',
        })
      ).rejects.toThrow('Unknown rate limit tier');
    });
  });

  describe('getRemainingCapacity', () => {
    it('should return capacity for all tiers', async () => {
      const capacity = await limiter.getRemainingCapacity({
        global: 'global',
        perVerifier: 'verifier1',
        perDID: 'did:aura:user1',
      });

      expect(capacity.global).toBe(50);
      expect(capacity.perVerifier).toBe(25);
      expect(capacity.perDID).toBe(5);
    });
  });

  describe('clear', () => {
    it('should clear all tiers', async () => {
      await limiter.checkLimit({
        global: 'global',
        perVerifier: 'verifier1',
        perDID: 'did:aura:user1',
      });

      await limiter.clear();

      const capacity = await limiter.getRemainingCapacity({
        global: 'global',
        perVerifier: 'verifier1',
        perDID: 'did:aura:user1',
      });

      expect(capacity.global).toBe(50);
      expect(capacity.perVerifier).toBe(25);
      expect(capacity.perDID).toBe(5);
    });
  });
});

describe('InMemoryRateLimiterStorage', () => {
  let storage: InMemoryRateLimiterStorage;

  beforeEach(() => {
    storage = new InMemoryRateLimiterStorage();
  });

  it('should store and retrieve buckets', async () => {
    const bucket = {
      tokens: 10,
      lastRefill: Date.now(),
      violations: 0,
    };

    await storage.set('test', bucket, 1000);

    const retrieved = await storage.get('test');
    expect(retrieved).toEqual(bucket);
  });

  it('should return null for non-existent bucket', async () => {
    const result = await storage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should expire buckets after TTL', async () => {
    const bucket = {
      tokens: 10,
      lastRefill: Date.now(),
      violations: 0,
    };

    await storage.set('test', bucket, 100); // 100ms TTL

    // Should exist initially
    expect(await storage.get('test')).not.toBeNull();

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be expired
    expect(await storage.get('test')).toBeNull();
  });

  it('should delete buckets', async () => {
    const bucket = {
      tokens: 10,
      lastRefill: Date.now(),
      violations: 0,
    };

    await storage.set('test', bucket, 1000);
    expect(await storage.get('test')).not.toBeNull();

    await storage.delete('test');
    expect(await storage.get('test')).toBeNull();
  });

  it('should clear all buckets', async () => {
    const bucket = {
      tokens: 10,
      lastRefill: Date.now(),
      violations: 0,
    };

    await storage.set('test1', bucket, 1000);
    await storage.set('test2', bucket, 1000);

    expect(await storage.size()).toBe(2);

    await storage.clear();
    expect(await storage.size()).toBe(0);
  });

  it('should track size and clean up expired entries', async () => {
    const bucket = {
      tokens: 10,
      lastRefill: Date.now(),
      violations: 0,
    };

    await storage.set('valid', bucket, 10000);
    await storage.set('expired', bucket, 100);

    expect(await storage.size()).toBe(2);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Size should clean up and return 1
    expect(await storage.size()).toBe(1);
  });
});
