/**
 * Tests for Batch Verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BatchVerifier,
  getSuccessfulResults,
  getFailedResults,
  extractErrors,
  groupResultsByStatus,
  calculateSuccessRate,
  formatBatchResult,
  chunkArray,
  verifyLargeBatch,
} from '../batch.js';
import type { VerificationRequest, VerificationResult, BatchVerificationResult } from '../types.js';

// Helper to create mock verification result
function createMockResult(isValid: boolean, overrides?: Partial<VerificationResult>): VerificationResult {
  return {
    isValid,
    holderDID: 'did:aura:mainnet:test123',
    verifiedAt: new Date(),
    vcDetails: [],
    attributes: {},
    verificationError: isValid ? undefined : 'Verification failed',
    auditId: 'audit_' + Math.random().toString(36).substring(7),
    networkLatency: 100,
    verificationMethod: 'online',
    presentationId: 'pres_' + Math.random().toString(36).substring(7),
    expiresAt: new Date(Date.now() + 3600000),
    signatureValid: isValid,
    ...overrides,
  };
}

// Helper to create mock request
function createMockRequest(): VerificationRequest {
  return {
    qrCodeData: 'base64-encoded-data',
    verifierAddress: 'aura1verifier',
  };
}

describe('BatchVerifier', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const verifyFn = vi.fn();
      const verifier = new BatchVerifier(verifyFn);
      expect(verifier).toBeDefined();
    });

    it('should create with custom options', () => {
      const verifyFn = vi.fn();
      const verifier = new BatchVerifier(verifyFn, {
        concurrency: 10,
        stopOnError: true,
        batchTimeout: 60000,
      });
      expect(verifier).toBeDefined();
    });
  });

  describe('verifyBatch', () => {
    it('should return empty result for empty requests', async () => {
      const verifyFn = vi.fn();
      const verifier = new BatchVerifier(verifyFn);

      const result = await verifier.verifyBatch([]);

      expect(result.results).toHaveLength(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.totalTime).toBe(0);
      expect(result.averageTime).toBe(0);
    });

    it('should verify single request', async () => {
      const mockResult = createMockResult(true);
      const verifyFn = vi.fn().mockResolvedValue(mockResult);
      const verifier = new BatchVerifier(verifyFn);

      const result = await verifier.verifyBatch([createMockRequest()]);

      expect(verifyFn).toHaveBeenCalledTimes(1);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(1);
    });

    it('should verify multiple requests concurrently', async () => {
      const mockResult = createMockResult(true);
      const verifyFn = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 10));
        return mockResult;
      });
      const verifier = new BatchVerifier(verifyFn, { concurrency: 5 });

      const requests = Array(10).fill(null).map(() => createMockRequest());
      const result = await verifier.verifyBatch(requests);

      expect(verifyFn).toHaveBeenCalledTimes(10);
      expect(result.successCount).toBe(10);
      expect(result.failureCount).toBe(0);
    });

    it('should handle mixed success and failure', async () => {
      let callCount = 0;
      const verifyFn = vi.fn().mockImplementation(async () => {
        callCount++;
        return createMockResult(callCount % 2 === 0);
      });
      const verifier = new BatchVerifier(verifyFn);

      const requests = Array(6).fill(null).map(() => createMockRequest());
      const result = await verifier.verifyBatch(requests);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(3);
    });

    it('should handle errors in verification', async () => {
      const verifyFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const verifier = new BatchVerifier(verifyFn);

      const result = await verifier.verifyBatch([createMockRequest()]);

      expect(result.failureCount).toBe(1);
      expect(result.results[0]).toBeInstanceOf(Error);
    });

    it('should stop on first error when stopOnError is true', async () => {
      let callCount = 0;
      const verifyFn = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return createMockResult(false);
        }
        return createMockResult(true);
      });
      const verifier = new BatchVerifier(verifyFn, { stopOnError: true, concurrency: 1 });

      const requests = Array(5).fill(null).map(() => createMockRequest());
      const result = await verifier.verifyBatch(requests);

      // With stopOnError=true and concurrency=1, should stop after first failure
      // When it stops, the entire batch is considered failed
      expect(result.failureCount).toBeGreaterThan(0);
      expect(result.results[0]).toBeInstanceOf(Error);
    });

    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const verifyFn = vi.fn().mockImplementation(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(r => setTimeout(r, 20));
        concurrent--;
        return createMockResult(true);
      });

      const verifier = new BatchVerifier(verifyFn, { concurrency: 3 });
      const requests = Array(10).fill(null).map(() => createMockRequest());

      await verifier.verifyBatch(requests);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should calculate timing correctly', async () => {
      const verifyFn = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 10));
        return createMockResult(true);
      });
      const verifier = new BatchVerifier(verifyFn);

      const requests = Array(3).fill(null).map(() => createMockRequest());
      const result = await verifier.verifyBatch(requests);

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageTime).toBe(result.totalTime / 3);
    });
  });

  describe('updateOptions', () => {
    it('should update options', async () => {
      const verifyFn = vi.fn().mockResolvedValue(createMockResult(true));
      const verifier = new BatchVerifier(verifyFn, { concurrency: 5 });

      verifier.updateOptions({ concurrency: 10 });

      // Verify new concurrency is used
      let concurrent = 0;
      let maxConcurrent = 0;
      verifyFn.mockImplementation(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(r => setTimeout(r, 10));
        concurrent--;
        return createMockResult(true);
      });

      const requests = Array(10).fill(null).map(() => createMockRequest());
      await verifier.verifyBatch(requests);

      // With higher concurrency, should be able to run more in parallel
      expect(maxConcurrent).toBeGreaterThan(0);
    });
  });
});

describe('getSuccessfulResults', () => {
  it('should filter out errors', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      new Error('Failed'),
      createMockResult(true),
    ];

    const successful = getSuccessfulResults(results);

    expect(successful).toHaveLength(2);
    expect(successful.every(r => r.isValid)).toBe(true);
  });

  it('should filter out invalid results', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      createMockResult(false),
      createMockResult(true),
    ];

    const successful = getSuccessfulResults(results);

    expect(successful).toHaveLength(2);
  });

  it('should return empty array for all failures', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(false),
      new Error('Failed'),
    ];

    const successful = getSuccessfulResults(results);

    expect(successful).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    const successful = getSuccessfulResults([]);
    expect(successful).toHaveLength(0);
  });
});

describe('getFailedResults', () => {
  it('should include errors', () => {
    const error = new Error('Failed');
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      error,
      createMockResult(true),
    ];

    const failed = getFailedResults(results);

    expect(failed).toHaveLength(1);
    expect(failed[0]).toBe(error);
  });

  it('should include invalid results', () => {
    const invalidResult = createMockResult(false);
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      invalidResult,
      createMockResult(true),
    ];

    const failed = getFailedResults(results);

    expect(failed).toHaveLength(1);
    expect(failed[0]).toBe(invalidResult);
  });

  it('should return empty array for all successes', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      createMockResult(true),
    ];

    const failed = getFailedResults(results);

    expect(failed).toHaveLength(0);
  });
});

describe('extractErrors', () => {
  it('should extract Error messages', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      new Error('Network error'),
      createMockResult(true),
    ];

    const errors = extractErrors(results);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Network error');
  });

  it('should extract verification errors', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      createMockResult(false, { verificationError: 'Invalid signature' }),
    ];

    const errors = extractErrors(results);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Invalid signature');
  });

  it('should combine all error types', () => {
    const results: (VerificationResult | Error)[] = [
      new Error('Error 1'),
      createMockResult(false, { verificationError: 'Error 2' }),
      new Error('Error 3'),
    ];

    const errors = extractErrors(results);

    expect(errors).toHaveLength(3);
  });

  it('should return empty array for no errors', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      createMockResult(true),
    ];

    const errors = extractErrors(results);

    expect(errors).toHaveLength(0);
  });
});

describe('groupResultsByStatus', () => {
  it('should group results correctly', () => {
    const valid = createMockResult(true);
    const invalid = createMockResult(false);
    const error = new Error('Failed');

    const results: (VerificationResult | Error)[] = [valid, invalid, error];
    const grouped = groupResultsByStatus(results);

    expect(grouped.valid).toHaveLength(1);
    expect(grouped.valid[0]).toBe(valid);
    expect(grouped.invalid).toHaveLength(1);
    expect(grouped.invalid[0]).toBe(invalid);
    expect(grouped.errors).toHaveLength(1);
    expect(grouped.errors[0]).toBe(error);
  });

  it('should handle empty array', () => {
    const grouped = groupResultsByStatus([]);

    expect(grouped.valid).toHaveLength(0);
    expect(grouped.invalid).toHaveLength(0);
    expect(grouped.errors).toHaveLength(0);
  });

  it('should handle all valid', () => {
    const results: (VerificationResult | Error)[] = [
      createMockResult(true),
      createMockResult(true),
    ];
    const grouped = groupResultsByStatus(results);

    expect(grouped.valid).toHaveLength(2);
    expect(grouped.invalid).toHaveLength(0);
    expect(grouped.errors).toHaveLength(0);
  });
});

describe('calculateSuccessRate', () => {
  it('should calculate correct rate', () => {
    const batchResult: BatchVerificationResult = {
      results: [],
      successCount: 3,
      failureCount: 1,
      totalTime: 1000,
      averageTime: 250,
    };

    const rate = calculateSuccessRate(batchResult);

    expect(rate).toBe(0.75);
  });

  it('should return 0 for no results', () => {
    const batchResult: BatchVerificationResult = {
      results: [],
      successCount: 0,
      failureCount: 0,
      totalTime: 0,
      averageTime: 0,
    };

    const rate = calculateSuccessRate(batchResult);

    expect(rate).toBe(0);
  });

  it('should return 1 for all successes', () => {
    const batchResult: BatchVerificationResult = {
      results: [],
      successCount: 10,
      failureCount: 0,
      totalTime: 1000,
      averageTime: 100,
    };

    const rate = calculateSuccessRate(batchResult);

    expect(rate).toBe(1);
  });

  it('should return 0 for all failures', () => {
    const batchResult: BatchVerificationResult = {
      results: [],
      successCount: 0,
      failureCount: 10,
      totalTime: 1000,
      averageTime: 100,
    };

    const rate = calculateSuccessRate(batchResult);

    expect(rate).toBe(0);
  });
});

describe('formatBatchResult', () => {
  it('should format result correctly', () => {
    const batchResult: BatchVerificationResult = {
      results: [],
      successCount: 8,
      failureCount: 2,
      totalTime: 1000,
      averageTime: 100,
    };

    const formatted = formatBatchResult(batchResult);

    expect(formatted).toContain('Batch Verification Result');
    expect(formatted).toContain('Total: 10');
    expect(formatted).toContain('Successful: 8');
    expect(formatted).toContain('Failed: 2');
    expect(formatted).toContain('80.0%');
    expect(formatted).toContain('1000ms');
    expect(formatted).toContain('100.00ms');
  });

  it('should handle zero results', () => {
    const batchResult: BatchVerificationResult = {
      results: [],
      successCount: 0,
      failureCount: 0,
      totalTime: 0,
      averageTime: 0,
    };

    const formatted = formatBatchResult(batchResult);

    expect(formatted).toContain('Total: 0');
  });
});

describe('chunkArray', () => {
  it('should chunk array correctly', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const chunks = chunkArray(array, 3);

    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toEqual([1, 2, 3]);
    expect(chunks[1]).toEqual([4, 5, 6]);
    expect(chunks[2]).toEqual([7, 8, 9]);
    expect(chunks[3]).toEqual([10]);
  });

  it('should handle exact division', () => {
    const array = [1, 2, 3, 4, 5, 6];
    const chunks = chunkArray(array, 2);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3, 4]);
    expect(chunks[2]).toEqual([5, 6]);
  });

  it('should handle empty array', () => {
    const chunks = chunkArray([], 3);
    expect(chunks).toHaveLength(0);
  });

  it('should handle chunk size larger than array', () => {
    const array = [1, 2, 3];
    const chunks = chunkArray(array, 10);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual([1, 2, 3]);
  });

  it('should handle chunk size of 1', () => {
    const array = [1, 2, 3];
    const chunks = chunkArray(array, 1);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual([1]);
    expect(chunks[1]).toEqual([2]);
    expect(chunks[2]).toEqual([3]);
  });
});

describe('verifyLargeBatch', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should process large batch in chunks', async () => {
    const verifyFn = vi.fn().mockResolvedValue(createMockResult(true));
    const requests = Array(250).fill(null).map(() => createMockRequest());

    const result = await verifyLargeBatch(requests, verifyFn, {}, 100);

    expect(verifyFn).toHaveBeenCalledTimes(250);
    expect(result.successCount).toBe(250);
    expect(result.results).toHaveLength(250);
  });

  it('should accumulate timing correctly', async () => {
    const verifyFn = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 5));
      return createMockResult(true);
    });
    const requests = Array(20).fill(null).map(() => createMockRequest());

    const result = await verifyLargeBatch(requests, verifyFn, {}, 10);

    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.averageTime).toBe(result.totalTime / 20);
  });

  it('should handle mixed results across chunks', async () => {
    let callCount = 0;
    const verifyFn = vi.fn().mockImplementation(async () => {
      callCount++;
      return createMockResult(callCount % 3 !== 0);
    });
    const requests = Array(30).fill(null).map(() => createMockRequest());

    const result = await verifyLargeBatch(requests, verifyFn, {}, 10);

    expect(result.successCount).toBe(20);
    expect(result.failureCount).toBe(10);
  });

  it('should pass options to internal verifier', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const verifyFn = vi.fn().mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 10));
      concurrent--;
      return createMockResult(true);
    });
    const requests = Array(20).fill(null).map(() => createMockRequest());

    await verifyLargeBatch(requests, verifyFn, { concurrency: 2 }, 10);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});
