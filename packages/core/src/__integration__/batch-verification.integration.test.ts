/**
 * Integration Test: Batch Verification
 *
 * Tests batch verification capabilities:
 * - Verify multiple credentials in parallel
 * - Rate limiting handling
 * - Partial failure scenarios
 * - Performance characteristics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuraVerifier } from '../verification/verifier.js';
import { BatchVerifier } from '../verification/batch.js';
import {
  generateValidQRBatch,
  generateMixedQRBatch,
  generateExpiredQRBatch,
  VALID_AGE_21_QR,
  VALID_AGE_18_QR,
  VALID_HUMAN_QR,
  EXPIRED_QR_1_HOUR,
  REVOKED_CREDENTIAL_QR,
  MALFORMED_INVALID_BASE64,
} from './__fixtures__/test-credentials.js';
import { createMockServer, createSlowServer, MockBlockchainServer } from './__fixtures__/mock-server.js';
import type { VerificationRequest } from '../verification/types.js';

describe('Batch Verification Integration Tests', () => {
  let verifier: AuraVerifier;
  let mockServer: MockBlockchainServer;

  beforeEach(async () => {
    mockServer = createMockServer({
      latency: 50,
      errorRate: 0,
    });

    verifier = new AuraVerifier({
      network: 'testnet',
      offlineMode: false,
      timeout: 10000,
      verbose: false,
    });

    vi.spyOn(verifier as any, 'queryDIDDocument').mockImplementation(
      async (did: string) => mockServer.queryDIDDocument(did)
    );

    vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(
      async (vcId: string) => mockServer.queryVCStatus(vcId)
    );

    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
    mockServer.reset();
    vi.restoreAllMocks();
  });

  describe('Parallel Verification', () => {
    it('should verify multiple valid credentials in parallel', async () => {
      const qrCodes = [VALID_AGE_21_QR, VALID_AGE_18_QR, VALID_HUMAN_QR];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.isValid)).toBe(true);
    });

    it('should verify small batch (10 credentials)', async () => {
      const qrCodes = generateValidQRBatch(10);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const startTime = Date.now();
      const results = await verifier.verifyBatch(requests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should verify medium batch (50 credentials)', async () => {
      const qrCodes = generateValidQRBatch(50);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const startTime = Date.now();
      const results = await verifier.verifyBatch(requests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, 20000);

    it('should verify large batch (100 credentials)', async () => {
      const qrCodes = generateValidQRBatch(100);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const startTime = Date.now();
      const results = await verifier.verifyBatch(requests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);

    it('should process credentials concurrently', async () => {
      const qrCodes = generateValidQRBatch(20);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const startTime = Date.now();
      await verifier.verifyBatch(requests);
      const parallelDuration = Date.now() - startTime;

      // Sequential verification would take much longer
      // With 50ms latency per request, sequential would take ~1000ms
      // Parallel should be much faster
      expect(parallelDuration).toBeLessThan(1000);
    });
  });

  describe('Mixed Results', () => {
    it('should handle mix of valid and expired credentials', async () => {
      const qrCodes = [
        VALID_AGE_21_QR,
        EXPIRED_QR_1_HOUR,
        VALID_AGE_18_QR,
        VALID_HUMAN_QR,
      ];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(4);

      const validCount = results.filter((r) => r.isValid).length;
      const invalidCount = results.filter((r) => !r.isValid).length;

      expect(validCount).toBe(3);
      expect(invalidCount).toBe(1);

      const expiredResult = results.find((r) => !r.isValid);
      expect(expiredResult?.verificationError).toContain('expired');
    });

    it('should handle mix of valid and revoked credentials', async () => {
      const qrCodes = [
        VALID_AGE_21_QR,
        REVOKED_CREDENTIAL_QR,
        VALID_HUMAN_QR,
      ];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(3);

      const validCount = results.filter((r) => r.isValid).length;
      const invalidCount = results.filter((r) => !r.isValid).length;

      expect(validCount).toBe(2);
      expect(invalidCount).toBe(1);

      const revokedResult = results.find((r) => !r.isValid);
      expect(revokedResult?.verificationError).toContain('revoked');
    });

    it('should handle mix of valid and malformed credentials', async () => {
      const qrCodes = [
        VALID_AGE_21_QR,
        MALFORMED_INVALID_BASE64,
        VALID_HUMAN_QR,
      ];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(3);

      const validCount = results.filter((r) => r.isValid).length;
      const invalidCount = results.filter((r) => !r.isValid).length;

      expect(validCount).toBe(2);
      expect(invalidCount).toBe(1);
    });

    it('should process mixed batch efficiently', async () => {
      const qrCodes = generateMixedQRBatch(40, 10);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(50);

      const validCount = results.filter((r) => r.isValid).length;
      const invalidCount = results.filter((r) => !r.isValid).length;

      expect(validCount).toBe(40);
      expect(invalidCount).toBe(10);
    });
  });

  describe('Partial Failure Scenarios', () => {
    it('should continue processing after individual failure', async () => {
      const qrCodes = [
        VALID_AGE_21_QR,
        MALFORMED_INVALID_BASE64, // This will fail
        VALID_AGE_18_QR,
        VALID_HUMAN_QR,
      ];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      // Should process all 4, even though one fails
      expect(results).toHaveLength(4);

      const successCount = results.filter((r) => r.isValid).length;
      expect(successCount).toBe(3);
    });

    it('should handle all failures gracefully', async () => {
      const qrCodes = generateExpiredQRBatch(10);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(10);
      expect(results.every((r) => !r.isValid)).toBe(true);
      expect(results.every((r) => r.verificationError)).toBeTruthy();
    });

    it('should collect all error messages', async () => {
      const qrCodes = [
        EXPIRED_QR_1_HOUR,
        REVOKED_CREDENTIAL_QR,
        MALFORMED_INVALID_BASE64,
      ];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(3);
      expect(results.every((r) => !r.isValid)).toBe(true);

      const errors = results.map((r) => r.verificationError);
      expect(errors.some((e) => e?.includes('expired'))).toBe(true);
      expect(errors.some((e) => e?.includes('revoked'))).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect concurrency limit', async () => {
      const slowServer = createSlowServer(); // 2 second latency
      const qrCodes = generateValidQRBatch(10);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        { concurrency: 2 } // Limit to 2 concurrent
      );

      let activeCount = 0;
      let maxActive = 0;

      vi.spyOn(verifier as any, 'queryVCStatus').mockImplementation(async (vcId: string) => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);

        await slowServer.queryVCStatus(vcId);

        activeCount--;
        return mockServer.queryVCStatus(vcId);
      });

      await batchVerifier.verifyBatch(requests);

      // Should never have more than 2 concurrent requests
      expect(maxActive).toBeLessThanOrEqual(2);

      slowServer.reset();
    }, 30000);

    it('should handle high concurrency', async () => {
      const qrCodes = generateValidQRBatch(20);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        { concurrency: 10 } // High concurrency
      );

      const startTime = Date.now();
      const result = await batchVerifier.verifyBatch(requests);
      const duration = Date.now() - startTime;

      expect(result.results).toHaveLength(20);
      expect(result.successCount).toBe(20);
      expect(result.failureCount).toBe(0);

      // Should complete quickly with high concurrency
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Batch Performance', () => {
    it('should track batch statistics', async () => {
      const qrCodes = generateValidQRBatch(20);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        { concurrency: 5 }
      );

      const result = await batchVerifier.verifyBatch(requests);

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.averageTime).toBe(result.totalTime / requests.length);
      expect(result.successCount).toBe(20);
      expect(result.failureCount).toBe(0);
    });

    it('should be faster than sequential processing', async () => {
      const qrCodes = generateValidQRBatch(10);

      // Sequential processing
      const sequentialStart = Date.now();
      for (const qr of qrCodes) {
        await verifier.verify({ qrCodeData: qr });
      }
      const sequentialDuration = Date.now() - sequentialStart;

      // Batch processing
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));
      const batchStart = Date.now();
      await verifier.verifyBatch(requests);
      const batchDuration = Date.now() - batchStart;

      // Batch should be faster
      expect(batchDuration).toBeLessThan(sequentialDuration);
    });

    it('should calculate correct success rate', async () => {
      const qrCodes = generateMixedQRBatch(7, 3); // 70% success rate
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        { concurrency: 5 }
      );

      const result = await batchVerifier.verifyBatch(requests);

      expect(result.successCount).toBe(7);
      expect(result.failureCount).toBe(3);

      const successRate = result.successCount / (result.successCount + result.failureCount);
      expect(successRate).toBeCloseTo(0.7, 1);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout slow batch operations', async () => {
      const qrCodes = generateValidQRBatch(10);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        {
          concurrency: 5,
          batchTimeout: 100, // Very short timeout
        }
      );

      // Mock slow responses
      mockServer.updateConfig({ latency: 1000 });

      const result = await batchVerifier.verifyBatch(requests);

      // Should timeout and return error
      expect(result.failureCount).toBeGreaterThan(0);
    });

    it('should complete batch within timeout', async () => {
      const qrCodes = generateValidQRBatch(5);
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        {
          concurrency: 5,
          batchTimeout: 10000, // Generous timeout
        }
      );

      const result = await batchVerifier.verifyBatch(requests);

      expect(result.successCount).toBe(5);
      expect(result.failureCount).toBe(0);
      expect(result.totalTime).toBeLessThan(10000);
    });
  });

  describe('Empty Batch', () => {
    it('should handle empty batch gracefully', async () => {
      const requests: VerificationRequest[] = [];

      const batchVerifier = new BatchVerifier(
        async (req) => verifier.verify(req),
        { concurrency: 5 }
      );

      const result = await batchVerifier.verifyBatch(requests);

      expect(result.results).toHaveLength(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.totalTime).toBe(0);
      expect(result.averageTime).toBe(0);
    });
  });

  describe('Error Propagation', () => {
    it('should capture individual verification errors', async () => {
      const qrCodes = [
        VALID_AGE_21_QR,
        MALFORMED_INVALID_BASE64,
        EXPIRED_QR_1_HOUR,
      ];
      const requests: VerificationRequest[] = qrCodes.map((qr) => ({ qrCodeData: qr }));

      const results = await verifier.verifyBatch(requests);

      expect(results).toHaveLength(3);

      const validResult = results[0];
      expect(validResult?.isValid).toBe(true);

      const malformedResult = results[1];
      expect(malformedResult?.isValid).toBe(false);
      expect(malformedResult?.verificationError).toBeDefined();

      const expiredResult = results[2];
      expect(expiredResult?.isValid).toBe(false);
      expect(expiredResult?.verificationError).toContain('expired');
    });
  });
});
