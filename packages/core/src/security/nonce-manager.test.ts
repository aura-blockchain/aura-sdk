/**
 * Tests for Nonce Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NonceManager,
  InMemoryNonceStorage,
  BloomFilterNonceStorage,
} from './nonce-manager.js';
import { QRNonceError } from '../errors.js';

describe('NonceManager', () => {
  let manager: NonceManager;

  beforeEach(() => {
    manager = new NonceManager({
      nonceWindow: 5000, // 5 seconds for faster tests
      cleanupInterval: 1000,
    });
  });

  afterEach(() => {
    manager.stop();
  });

  describe('validateNonce', () => {
    it('should accept valid nonce', async () => {
      const nonce = '12345';
      const timestamp = Date.now();

      await expect(manager.validateNonce(nonce, timestamp)).resolves.not.toThrow();
    });

    it('should reject reused nonce', async () => {
      const nonce = '12345';
      const timestamp = Date.now();

      await manager.validateNonce(nonce, timestamp);

      await expect(manager.validateNonce(nonce, timestamp)).rejects.toThrow(QRNonceError);
    });

    it('should reject expired nonce', async () => {
      const nonce = '12345';
      const oldTimestamp = Date.now() - 10000; // 10 seconds ago

      await expect(manager.validateNonce(nonce, oldTimestamp)).rejects.toThrow(QRNonceError);
    });

    it('should reject future timestamp beyond clock skew', async () => {
      const nonce = '12345';
      const futureTimestamp = Date.now() + 60000; // 1 minute in future

      await expect(manager.validateNonce(nonce, futureTimestamp)).rejects.toThrow(QRNonceError);
    });

    it('should accept timestamp within clock skew', async () => {
      const nonce = '12345';
      const nearFutureTimestamp = Date.now() + 5000; // 5 seconds in future (within default 30s skew)

      await expect(manager.validateNonce(nonce, nearFutureTimestamp)).resolves.not.toThrow();
    });

    it('should reject empty nonce', async () => {
      await expect(manager.validateNonce('', Date.now())).rejects.toThrow(QRNonceError);
    });

    it('should handle numeric nonce', async () => {
      const nonce = 12345;
      const timestamp = Date.now();

      await expect(manager.validateNonce(nonce, timestamp)).resolves.not.toThrow();
    });
  });

  describe('hasBeenUsed', () => {
    it('should return false for unused nonce', async () => {
      const result = await manager.hasBeenUsed('unused-nonce');
      expect(result).toBe(false);
    });

    it('should return true for used nonce', async () => {
      const nonce = 'used-nonce';
      await manager.validateNonce(nonce, Date.now());

      const result = await manager.hasBeenUsed(nonce);
      expect(result).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove expired nonces', async () => {
      // Create manager with very short nonce window for testing
      const shortWindowManager = new NonceManager({
        nonceWindow: 100, // 100ms window
        cleanupInterval: 60000, // Don't auto-cleanup during test
      });

      try {
        const nonce1 = 'nonce1';
        const nonce2 = 'nonce2';

        // Add first nonce
        await shortWindowManager.validateNonce(nonce1, Date.now());

        // Wait for it to expire
        await new Promise(resolve => setTimeout(resolve, 200));

        // Add second nonce (should still be valid)
        await shortWindowManager.validateNonce(nonce2, Date.now());

        // Cleanup should remove expired nonces
        await shortWindowManager.cleanup();

        // First nonce should be removed (expired)
        expect(await shortWindowManager.hasBeenUsed(nonce1)).toBe(false);
        // Second nonce should remain (still valid)
        expect(await shortWindowManager.hasBeenUsed(nonce2)).toBe(true);
      } finally {
        shortWindowManager.stop();
      }
    });
  });

  describe('size', () => {
    it('should track number of nonces', async () => {
      expect(await manager.size()).toBe(0);

      await manager.validateNonce('nonce1', Date.now());
      expect(await manager.size()).toBe(1);

      await manager.validateNonce('nonce2', Date.now());
      expect(await manager.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all nonces', async () => {
      await manager.validateNonce('nonce1', Date.now());
      await manager.validateNonce('nonce2', Date.now());

      expect(await manager.size()).toBe(2);

      await manager.clear();
      expect(await manager.size()).toBe(0);
    });
  });
});

describe('InMemoryNonceStorage', () => {
  let storage: InMemoryNonceStorage;

  beforeEach(() => {
    storage = new InMemoryNonceStorage();
  });

  it('should add and check nonces', async () => {
    await storage.addNonce('test', Date.now() + 1000);
    expect(await storage.hasNonce('test')).toBe(true);
    expect(await storage.hasNonce('other')).toBe(false);
  });

  it('should cleanup expired nonces', async () => {
    const now = Date.now();
    await storage.addNonce('expired', now - 1000);
    await storage.addNonce('valid', now + 1000);

    await storage.cleanup(now);

    expect(await storage.hasNonce('expired')).toBe(false);
    expect(await storage.hasNonce('valid')).toBe(true);
  });

  it('should clear all nonces', async () => {
    await storage.addNonce('test1', Date.now() + 1000);
    await storage.addNonce('test2', Date.now() + 1000);

    expect(await storage.size()).toBe(2);

    await storage.clear();
    expect(await storage.size()).toBe(0);
  });
});

describe('BloomFilterNonceStorage', () => {
  let storage: BloomFilterNonceStorage;

  beforeEach(() => {
    storage = new BloomFilterNonceStorage(1000, 0.01);
  });

  it('should add and check nonces', async () => {
    await storage.addNonce('test', Date.now() + 1000);
    expect(await storage.hasNonce('test')).toBe(true);
  });

  it('should handle many nonces', async () => {
    const nonces = Array.from({ length: 100 }, (_, i) => `nonce-${i}`);

    for (const nonce of nonces) {
      await storage.addNonce(nonce, Date.now() + 1000);
    }

    // All added nonces should be found
    for (const nonce of nonces) {
      expect(await storage.hasNonce(nonce)).toBe(true);
    }
  });

  it('should have low false positive rate', async () => {
    const nonces = Array.from({ length: 500 }, (_, i) => `nonce-${i}`);

    for (const nonce of nonces) {
      await storage.addNonce(nonce, Date.now() + 1000);
    }

    // Check false positive rate with non-existent nonces
    let falsePositives = 0;
    for (let i = 500; i < 1000; i++) {
      if (await storage.hasNonce(`nonce-${i}`)) {
        falsePositives++;
      }
    }

    const falsePositiveRate = falsePositives / 500;
    expect(falsePositiveRate).toBeLessThan(0.05); // Should be < 5%
  });

  it('should report size correctly', async () => {
    expect(await storage.size()).toBe(0);

    await storage.addNonce('test1', Date.now() + 1000);
    expect(await storage.size()).toBe(1);

    await storage.addNonce('test2', Date.now() + 1000);
    expect(await storage.size()).toBe(2);
  });

  it('should clear all nonces', async () => {
    await storage.addNonce('test1', Date.now() + 1000);
    await storage.addNonce('test2', Date.now() + 1000);

    expect(await storage.size()).toBe(2);

    await storage.clear();
    expect(await storage.size()).toBe(0);
  });

  it('should calculate false positive probability', async () => {
    const storage = new BloomFilterNonceStorage(1000, 0.01);

    const initialProb = storage.getFalsePositiveProbability();
    expect(initialProb).toBe(0);

    // Add some items
    for (let i = 0; i < 100; i++) {
      await storage.addNonce(`nonce-${i}`, Date.now() + 1000);
    }

    const prob = storage.getFalsePositiveProbability();
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThan(1);
  });
});
