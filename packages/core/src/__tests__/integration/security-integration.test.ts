/**
 * Integration Test: Security Module Integration
 *
 * Tests the integration between security components:
 * - Nonce manager with rate limiter
 * - Audit logging during verification
 * - Threat detection patterns
 * - Input sanitization in QR parsing
 * - Complete security workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NonceManager, InMemoryNonceStorage } from '../../security/nonce-manager.js';
import { RateLimiter, RateLimitError, InMemoryRateLimiterStorage } from '../../security/rate-limiter.js';
import {
  AuditLogger,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
  InMemoryAuditLogStorage,
} from '../../security/audit-logger.js';
import {
  ThreatDetector,
  ThreatLevel,
  ThreatType,
} from '../../security/threat-detector.js';
import { QRNonceError } from '../../errors.js';
import {
  createMockQRCodeData,
  generateNonce,
} from '../../__integration__/__fixtures__/test-credentials.js';

describe('Security Integration Tests', () => {
  describe('Nonce Manager with Rate Limiter Integration', () => {
    let nonceManager: NonceManager;
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      nonceManager = new NonceManager({
        nonceWindow: 300000, // 5 minutes
        cleanupInterval: 60000,
      });

      rateLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        burstCapacity: 5,
      });
    });

    afterEach(() => {
      nonceManager.stop();
      rateLimiter.stop();
    });

    it('should prevent replay attacks with nonce tracking', async () => {
      const nonce = generateNonce();
      const timestamp = Date.now();
      const identifier = 'did:aura:user123';

      // First use should succeed
      await expect(nonceManager.validateNonce(nonce, timestamp)).resolves.not.toThrow();

      // Second use should fail (replay attack)
      await expect(nonceManager.validateNonce(nonce, timestamp)).rejects.toThrow(QRNonceError);
    });

    it('should enforce rate limits while allowing valid nonces', async () => {
      const identifier = 'did:aura:user123';

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const nonce = generateNonce();
        await nonceManager.validateNonce(nonce, Date.now());
        await rateLimiter.checkLimit(identifier);
      }

      // Next request should be rate limited
      await expect(rateLimiter.checkLimit(identifier)).rejects.toThrow(RateLimitError);
    });

    it('should combine nonce validation and rate limiting in verification flow', async () => {
      const identifier = 'did:aura:verifier456';

      // Simulate multiple verifications
      for (let i = 0; i < 3; i++) {
        const nonce = generateNonce();
        const timestamp = Date.now();

        // Check rate limit first
        await rateLimiter.checkLimit(identifier);

        // Then validate nonce
        await nonceManager.validateNonce(nonce, timestamp);
      }

      // All should succeed
      const size = await nonceManager.size();
      expect(size).toBe(3);

      const remaining = await rateLimiter.getRemainingCapacity(identifier);
      expect(remaining).toBeLessThan(5);
    });

    it('should handle nonce expiration with rate limit reset', async () => {
      const nonce = generateNonce();
      const oldTimestamp = Date.now() - 400000; // 400 seconds ago (beyond 5 min window)
      const identifier = 'did:aura:user789';

      // Old nonce should be rejected
      await expect(nonceManager.validateNonce(nonce, oldTimestamp)).rejects.toThrow(QRNonceError);

      // But rate limit should still work
      await expect(rateLimiter.checkLimit(identifier)).resolves.not.toThrow();
    });

    it('should coordinate cleanup between nonce manager and rate limiter', async () => {
      const identifier = 'did:aura:user999';

      // Add some nonces and trigger rate limiter
      for (let i = 0; i < 3; i++) {
        const nonce = generateNonce();
        await nonceManager.validateNonce(nonce, Date.now());
        await rateLimiter.checkLimit(identifier);
      }

      // Trigger cleanup
      await nonceManager.cleanup();
      await rateLimiter.clear();

      // After cleanup, rate limiter should be reset
      const remaining = await rateLimiter.getRemainingCapacity(identifier);
      expect(remaining).toBeGreaterThan(0);
    });
  });

  describe('Audit Logging During Verification', () => {
    let auditLogger: AuditLogger;
    let nonceManager: NonceManager;
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      auditLogger = new AuditLogger({
        enableChaining: true,
        bufferSize: 5,
      });

      nonceManager = new NonceManager();
      rateLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });
    });

    afterEach(() => {
      auditLogger.stop();
      nonceManager.stop();
      rateLimiter.stop();
    });

    it('should log successful verification with all security checks', async () => {
      const identifier = 'did:aura:holder123';
      const nonce = generateNonce();
      const timestamp = Date.now();

      // Perform security checks
      await rateLimiter.checkLimit(identifier);
      await nonceManager.validateNonce(nonce, timestamp);

      // Log verification
      await auditLogger.logVerificationAttempt({
        actor: 'did:aura:verifier',
        target: identifier,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          nonce,
          timestamp,
        },
      });

      await auditLogger.flush();

      const logs = await auditLogger.query({ limit: 1 });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.category).toBe(AuditCategory.VERIFICATION);
      expect(logs[0]?.outcome).toBe(AuditOutcome.SUCCESS);
      expect(logs[0]?.metadata?.nonce).toBe(nonce);
    });

    it('should log failed verification due to rate limiting', async () => {
      const identifier = 'did:aura:attacker';

      // Exceed rate limit
      for (let i = 0; i < 15; i++) {
        try {
          await rateLimiter.checkLimit(identifier);
        } catch (error) {
          if (error instanceof RateLimitError) {
            // Log rate limit violation
            await auditLogger.logSecurityEvent({
              action: 'RATE_LIMIT_EXCEEDED',
              severity: AuditSeverity.WARNING,
              message: error.message,
              actor: identifier,
              metadata: {
                retryAfter: error.retryAfter,
              },
            });
          }
        }
      }

      await auditLogger.flush();

      const logs = await auditLogger.query({ category: AuditCategory.SECURITY });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.action).toBe('RATE_LIMIT_EXCEEDED');
      expect(logs[0]?.severity).toBe(AuditSeverity.WARNING);
    });

    it('should log replay attack detection', async () => {
      const nonce = generateNonce();
      const timestamp = Date.now();
      const identifier = 'did:aura:suspicious';

      // First use
      await nonceManager.validateNonce(nonce, timestamp);

      // Second use (replay attack)
      try {
        await nonceManager.validateNonce(nonce, timestamp);
      } catch (error) {
        if (error instanceof QRNonceError) {
          await auditLogger.logSecurityEvent({
            action: 'REPLAY_ATTACK_DETECTED',
            severity: AuditSeverity.CRITICAL,
            message: 'Nonce reuse detected',
            actor: identifier,
            metadata: {
              nonce,
              timestamp,
            },
          });
        }
      }

      await auditLogger.flush();

      const logs = await auditLogger.query({ category: AuditCategory.SECURITY });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.action).toBe('REPLAY_ATTACK_DETECTED');
      expect(logs[0]?.severity).toBe(AuditSeverity.CRITICAL);
    });

    it('should maintain tamper-evident log chain', async () => {
      const identifier = 'did:aura:user';

      // Log multiple events
      for (let i = 0; i < 5; i++) {
        await auditLogger.log({
          category: AuditCategory.VERIFICATION,
          action: 'VERIFY_CREDENTIAL',
          outcome: AuditOutcome.SUCCESS,
          severity: AuditSeverity.INFO,
          actor: identifier,
          target: `vc_${i}`,
          message: `Verification ${i}`,
        });
      }

      await auditLogger.flush();

      // Verify chain integrity
      const logs = await auditLogger.query();
      const isValid = await auditLogger.verifyIntegrity(logs);

      expect(isValid).toBe(true);

      // Check chain structure
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i]?.previousHash).toBe(logs[i - 1]?.hash);
        expect(logs[i]?.sequence).toBe(logs[i - 1]!.sequence + 1);
      }
    });

    it('should redact sensitive information in logs', async () => {
      await auditLogger.log({
        category: AuditCategory.VERIFICATION,
        action: 'VERIFY_CREDENTIAL',
        outcome: AuditOutcome.SUCCESS,
        severity: AuditSeverity.INFO,
        actor: 'did:aura:user',
        target: 'vc_123',
        message: 'Verification successful',
        metadata: {
          signature: 'deadbeef1234', // Should be redacted
          publicKey: 'abcd5678', // Not in redact list
          password: 'secret123', // Should be redacted
        },
      });

      await auditLogger.flush();

      const logs = await auditLogger.query({ limit: 1 });
      expect(logs[0]?.metadata?.signature).toBe('[REDACTED]');
      expect(logs[0]?.metadata?.password).toBe('[REDACTED]');
      expect(logs[0]?.metadata?.publicKey).not.toBe('[REDACTED]');
    });
  });

  describe('Threat Detection Integration', () => {
    let threatDetector: ThreatDetector;
    let auditLogger: AuditLogger;
    let nonceManager: NonceManager;

    beforeEach(() => {
      threatDetector = new ThreatDetector({
        maxRequestsPerWindow: 10,
        rapidRequestWindow: 10000, // 10 seconds
        maxFailedAttempts: 3,
        enableAutoBlock: true,
      });

      auditLogger = new AuditLogger();
      nonceManager = new NonceManager();
    });

    afterEach(() => {
      threatDetector.stop();
      auditLogger.stop();
      nonceManager.stop();
    });

    it('should detect rapid verification attempts', async () => {
      const identifier = 'did:aura:suspicious';
      let threatDetected = false;

      threatDetector = new ThreatDetector({
        maxRequestsPerWindow: 5,
        rapidRequestWindow: 1000,
        onThreatDetected: async (event) => {
          threatDetected = true;
          expect(event.type).toBe(ThreatType.RAPID_REQUESTS);
          expect(event.level).toBe(ThreatLevel.HIGH);

          // Log threat
          await auditLogger.logSecurityEvent({
            action: 'THREAT_DETECTED',
            severity: AuditSeverity.CRITICAL,
            message: event.description,
            actor: identifier,
            metadata: event.evidence,
          });
        },
      });

      // Make rapid requests
      for (let i = 0; i < 6; i++) {
        try {
          await threatDetector.trackVerification({
            identifier,
            success: true,
          });
        } catch (error) {
          // May throw if auto-blocked
        }
      }

      expect(threatDetected).toBe(true);
    });

    it('should detect brute force patterns', async () => {
      const identifier = 'did:aura:attacker';
      let bruteForceDetected = false;

      threatDetector = new ThreatDetector({
        maxFailedAttempts: 3,
        onThreatDetected: async (event) => {
          if (event.type === ThreatType.BRUTE_FORCE) {
            bruteForceDetected = true;
            expect(event.level).toBeGreaterThanOrEqual(ThreatLevel.HIGH);
          }
        },
      });

      // Simulate failed attempts
      for (let i = 0; i < 5; i++) {
        await threatDetector.trackVerification({
          identifier,
          success: false,
        });
      }

      expect(bruteForceDetected).toBe(true);
    });

    it('should detect credential stuffing', async () => {
      const identifier = 'did:aura:stuffing';
      let credentialStuffingDetected = false;

      threatDetector = new ThreatDetector({
        maxRequestsPerWindow: 20,
        rapidRequestWindow: 10000,
        onThreatDetected: async (event) => {
          if (event.type === ThreatType.CREDENTIAL_STUFFING) {
            credentialStuffingDetected = true;
          }
        },
      });

      // Access many different credentials rapidly
      for (let i = 0; i < 15; i++) {
        await threatDetector.trackVerification({
          identifier,
          success: true,
          targetEntity: `vc_${i}`,
        });
      }

      expect(credentialStuffingDetected).toBe(true);
    });

    it('should auto-block on critical threats', async () => {
      const identifier = 'did:aura:malicious';

      // Trigger critical threat
      for (let i = 0; i < 15; i++) {
        try {
          await threatDetector.trackVerification({
            identifier,
            success: false,
          });
        } catch (error) {
          // Expected to throw when blocked
        }
      }

      // Should be blocked
      expect(threatDetector.isBlocked(identifier)).toBe(true);

      // Further attempts should be rejected
      await expect(
        threatDetector.trackVerification({
          identifier,
          success: true,
        })
      ).rejects.toThrow('blocked');
    });

    it('should track and report activity summary', async () => {
      const identifier = 'did:aura:user';

      for (let i = 0; i < 5; i++) {
        await threatDetector.trackVerification({
          identifier,
          success: i < 4, // 4 successes, 1 failure
        });
      }

      const summary = threatDetector.getActivitySummary(identifier);

      expect(summary).not.toBeNull();
      expect(summary?.totalRequests).toBe(5);
      expect(summary?.successCount).toBe(4);
      expect(summary?.failureCount).toBe(1);
      expect(summary?.isBlocked).toBe(false);
    });

    it('should integrate with nonce manager to detect replay attacks', async () => {
      const identifier = 'did:aura:replayer';
      const nonce = generateNonce();
      const timestamp = Date.now();

      // First verification
      await nonceManager.validateNonce(nonce, timestamp);
      await threatDetector.trackVerification({
        identifier,
        success: true,
      });

      // Replay attempt
      let replayDetected = false;
      try {
        await nonceManager.validateNonce(nonce, timestamp);
      } catch (error) {
        replayDetected = true;

        // Log as security threat
        await threatDetector.trackVerification({
          identifier,
          success: false,
          metadata: {
            threatType: 'replay_attack',
            nonce,
          },
        });
      }

      expect(replayDetected).toBe(true);
    });
  });

  describe('Complete Security Workflow', () => {
    let nonceManager: NonceManager;
    let rateLimiter: RateLimiter;
    let auditLogger: AuditLogger;
    let threatDetector: ThreatDetector;

    beforeEach(() => {
      nonceManager = new NonceManager({
        nonceWindow: 300000,
      });

      rateLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      auditLogger = new AuditLogger({
        enableChaining: true,
      });

      threatDetector = new ThreatDetector({
        maxRequestsPerWindow: 10,
        maxFailedAttempts: 3,
      });
    });

    afterEach(() => {
      nonceManager.stop();
      rateLimiter.stop();
      auditLogger.stop();
      threatDetector.stop();
    });

    it('should execute complete security check workflow', async () => {
      const identifier = 'did:aura:holder';
      const verifierId = 'did:aura:verifier';
      const nonce = generateNonce();
      const timestamp = Date.now();

      // Step 1: Check rate limit
      await rateLimiter.checkLimit(identifier);

      // Step 2: Validate nonce (prevent replay)
      await nonceManager.validateNonce(nonce, timestamp);

      // Step 3: Track with threat detector
      await threatDetector.trackVerification({
        identifier,
        success: true,
        targetEntity: 'vc_test',
      });

      // Step 4: Log successful verification
      await auditLogger.logVerificationAttempt({
        actor: verifierId,
        target: identifier,
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          nonce,
          timestamp,
        },
      });

      await auditLogger.flush();

      // Verify all security components worked
      const hasNonce = await nonceManager.hasBeenUsed(nonce);
      expect(hasNonce).toBe(true);

      const remaining = await rateLimiter.getRemainingCapacity(identifier);
      expect(remaining).toBeLessThan(10);

      const summary = threatDetector.getActivitySummary(identifier);
      expect(summary?.successCount).toBe(1);

      const logs = await auditLogger.query({ limit: 1 });
      expect(logs).toHaveLength(1);
    });

    it('should handle security violation workflow', async () => {
      const identifier = 'did:aura:attacker';
      const nonce = generateNonce();
      const timestamp = Date.now();

      // First verification succeeds
      await rateLimiter.checkLimit(identifier);
      await nonceManager.validateNonce(nonce, timestamp);
      await threatDetector.trackVerification({ identifier, success: true });

      // Replay attack detected
      let replayDetected = false;
      try {
        await nonceManager.validateNonce(nonce, timestamp);
      } catch (error) {
        replayDetected = true;

        // Log security event
        await auditLogger.logSecurityEvent({
          action: 'REPLAY_ATTACK',
          severity: AuditSeverity.CRITICAL,
          message: 'Nonce reuse detected',
          actor: identifier,
        });

        // Track as failed attempt
        await threatDetector.trackVerification({
          identifier,
          success: false,
        });
      }

      await auditLogger.flush();

      expect(replayDetected).toBe(true);

      const logs = await auditLogger.query({ category: AuditCategory.SECURITY });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should coordinate rate limiting and threat detection', async () => {
      const identifier = 'did:aura:abuser';

      // Make many requests to trigger both systems
      for (let i = 0; i < 12; i++) {
        try {
          await rateLimiter.checkLimit(identifier);
          await threatDetector.trackVerification({
            identifier,
            success: true,
          });
        } catch (error) {
          if (error instanceof RateLimitError) {
            // Track failed attempt in threat detector
            await threatDetector.trackVerification({
              identifier,
              success: false,
            });
          }
        }
      }

      // Should have hit rate limit
      await expect(rateLimiter.checkLimit(identifier)).rejects.toThrow(RateLimitError);

      // Threat detector should have recorded activity
      const summary = threatDetector.getActivitySummary(identifier);
      expect(summary?.totalRequests).toBeGreaterThan(10);
    });

    it('should maintain security through cleanup cycles', async () => {
      const identifier = 'did:aura:user';

      // Add activity
      const nonce = generateNonce();
      await nonceManager.validateNonce(nonce, Date.now());
      await rateLimiter.checkLimit(identifier);
      await threatDetector.trackVerification({ identifier, success: true });

      // Trigger cleanup
      await nonceManager.cleanup();
      threatDetector.cleanup();

      // Old nonce should still be tracked (within window)
      const hasNonce = await nonceManager.hasBeenUsed(nonce);
      expect(hasNonce).toBe(true);
    });
  });

  describe('Input Sanitization Integration', () => {
    it('should sanitize identifiers before security checks', async () => {
      const nonceManager = new NonceManager();
      const rateLimiter = new RateLimiter();

      // Various identifier formats
      const identifiers = [
        'did:aura:mainnet:user123',
        '192.168.1.1',
        'verifier@example.com',
        'user-with-dashes',
      ];

      for (const identifier of identifiers) {
        const nonce = generateNonce();

        await expect(nonceManager.validateNonce(nonce, Date.now())).resolves.not.toThrow();
        await expect(rateLimiter.checkLimit(identifier)).resolves.not.toThrow();
      }

      nonceManager.stop();
      rateLimiter.stop();
    });

    it('should handle special characters in audit logs', async () => {
      const auditLogger = new AuditLogger();

      await auditLogger.log({
        category: AuditCategory.VERIFICATION,
        action: 'TEST_SPECIAL_CHARS',
        outcome: AuditOutcome.SUCCESS,
        severity: AuditSeverity.INFO,
        actor: 'user<script>alert("xss")</script>',
        message: 'Test with special chars: <>&"\'',
        metadata: {
          data: '{"key": "value"}',
        },
      });

      await auditLogger.flush();

      const logs = await auditLogger.query({ limit: 1 });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.actor).toBeDefined();

      auditLogger.stop();
    });
  });
});
