/**
 * Integration tests for Security Module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSecureVerifier,
  SecurityUtils,
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
  ThreatType,
  ThreatLevel,
} from './index.js';

describe('createSecureVerifier', () => {
  it('should create verifier with default configuration', () => {
    const context = createSecureVerifier();

    expect(context.nonceManager).toBeDefined();
    expect(context.rateLimiter).toBeDefined();
    expect(context.auditLogger).toBeDefined();
    expect(context.inputSanitizer).toBeDefined();
    expect(context.threatDetector).toBeUndefined(); // Disabled by default

    context.cleanup();
  });

  it('should create verifier with all features enabled', () => {
    const context = createSecureVerifier({
      enableNonceTracking: true,
      enableRateLimiting: true,
      enableAuditLogging: true,
      enableThreatDetection: true,
      enableInputSanitization: true,
    });

    expect(context.nonceManager).toBeDefined();
    expect(context.rateLimiter).toBeDefined();
    expect(context.auditLogger).toBeDefined();
    expect(context.inputSanitizer).toBeDefined();
    expect(context.threatDetector).toBeDefined();

    context.cleanup();
  });

  it('should create verifier with selective features', () => {
    const context = createSecureVerifier({
      enableNonceTracking: true,
      enableRateLimiting: false,
      enableAuditLogging: false,
      enableThreatDetection: true,
    });

    expect(context.nonceManager).toBeDefined();
    expect(context.rateLimiter).toBeUndefined();
    expect(context.auditLogger).toBeUndefined();
    expect(context.threatDetector).toBeDefined();

    context.cleanup();
  });

  it('should apply custom configuration', () => {
    const context = createSecureVerifier({
      nonceConfig: {
        nonceWindow: 60000,
        cleanupInterval: 30000,
      },
      rateLimitConfig: {
        maxRequests: 50,
        windowMs: 30000,
      },
    });

    expect(context.nonceManager).toBeDefined();
    expect(context.rateLimiter).toBeDefined();

    context.cleanup();
  });

  it('should cleanup all components', () => {
    const context = createSecureVerifier({
      enableThreatDetection: true,
    });

    // Should not throw
    expect(() => context.cleanup()).not.toThrow();
  });
});

describe('Complete Security Workflow', () => {
  let context: ReturnType<typeof createSecureVerifier>;
  const testDID = 'did:aura:user123';
  const testVerifier = 'verifier-001';

  beforeEach(() => {
    context = createSecureVerifier({
      enableNonceTracking: true,
      enableRateLimiting: true,
      enableAuditLogging: true,
      enableThreatDetection: true,
      enableInputSanitization: true,
      rateLimitConfig: {
        maxRequests: 10,
        windowMs: 1000,
        burstCapacity: 5,
        disableJitter: true, // Disable jitter for testing to avoid timing issues
      },
      threatConfig: {
        maxRequestsPerWindow: 10,
        rapidRequestWindow: 1000,
        maxFailedAttempts: 3,
      },
    });
  });

  afterEach(() => {
    context.cleanup();
  });

  it('should complete full verification workflow', async () => {
    const nonce = '12345';
    const timestamp = Date.now();

    // 1. Sanitize input
    const sanitizedDID = context.inputSanitizer!.sanitizeString(testDID);
    expect(sanitizedDID).toBe(testDID);

    // 2. Validate nonce
    await context.nonceManager!.validateNonce(nonce, timestamp);

    // 3. Check rate limit
    await context.rateLimiter!.checkLimit(testDID);

    // 4. Track verification attempt
    await context.threatDetector!.trackVerification({
      identifier: testDID,
      success: true,
      targetEntity: 'credential-123',
    });

    // 5. Log audit event
    await context.auditLogger!.logVerificationAttempt({
      actor: testVerifier,
      target: testDID,
      outcome: AuditOutcome.SUCCESS,
      metadata: { nonce, timestamp },
    });

    // Verify audit log
    await context.auditLogger!.flush();
    const count = await context.auditLogger!.count();
    expect(count).toBeGreaterThan(0);
  });

  it('should detect and log replay attack', async () => {
    const nonce = '12345';
    const timestamp = Date.now();

    // First use should succeed
    await context.nonceManager!.validateNonce(nonce, timestamp);

    // Second use should fail
    await expect(context.nonceManager!.validateNonce(nonce, timestamp)).rejects.toThrow();

    // Log security event
    await context.auditLogger!.logSecurityEvent({
      action: 'REPLAY_ATTACK_DETECTED',
      severity: AuditSeverity.CRITICAL,
      message: 'Nonce reuse detected',
      actor: testDID,
      metadata: { nonce },
    });

    await context.auditLogger!.flush();
    const logs = await context.auditLogger!.query({
      category: AuditCategory.SECURITY,
    });

    expect(logs.length).toBeGreaterThan(0);
  });

  it('should detect and respond to rate limiting', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await context.rateLimiter!.checkLimit(testDID);
    }

    // Next request should fail
    let rateLimitError: any;
    try {
      await context.rateLimiter!.checkLimit(testDID);
    } catch (error) {
      rateLimitError = error;
    }

    expect(rateLimitError).toBeDefined();
    expect(rateLimitError.name).toBe('RateLimitError');

    // Log rate limit event
    await context.auditLogger!.logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      severity: AuditSeverity.WARNING,
      message: 'Rate limit exceeded',
      actor: testDID,
    });
  });

  it('should detect suspicious patterns', async () => {
    const threats: any[] = [];

    // Reconfigure with threat callback
    const contextWithCallback = createSecureVerifier({
      enableThreatDetection: true,
      threatConfig: {
        maxRequestsPerWindow: 3,
        rapidRequestWindow: 1000,
        onThreatDetected: (event) => {
          threats.push(event);
        },
      },
    });

    // Make rapid requests
    for (let i = 0; i < 5; i++) {
      await contextWithCallback.threatDetector!.trackVerification({
        identifier: testDID,
        success: true,
      });
    }

    // Wait for threat detection
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have detected rapid requests
    expect(threats.length).toBeGreaterThan(0);
    expect(threats[0].type).toBe(ThreatType.RAPID_REQUESTS);

    contextWithCallback.cleanup();
  });

  it('should maintain audit log integrity', async () => {
    // Log multiple events
    for (let i = 0; i < 5; i++) {
      await context.auditLogger!.log({
        category: AuditCategory.VERIFICATION,
        action: 'TEST_ACTION',
        outcome: AuditOutcome.SUCCESS,
        severity: AuditSeverity.INFO,
        message: `Test event ${i}`,
      });
    }

    await context.auditLogger!.flush();

    // Verify chain integrity
    const logs = await context.auditLogger!.query();
    const isValid = await context.auditLogger!.verifyIntegrity(logs);

    expect(isValid).toBe(true);
  });

  it('should handle failed verification attempts', async () => {
    // Track multiple failed attempts
    for (let i = 0; i < 3; i++) {
      await context.threatDetector!.trackVerification({
        identifier: testDID,
        success: false,
      });
    }

    // Get activity summary
    const summary = context.threatDetector!.getActivitySummary(testDID);

    expect(summary).toBeDefined();
    expect(summary!.failureCount).toBe(3);
    expect(summary!.successCount).toBe(0);
  });
});

describe('SecurityUtils', () => {
  describe('sanitizeQRInput', () => {
    it('should sanitize QR input', () => {
      const input = 'valid-qr-data';
      expect(SecurityUtils.sanitizeQRInput(input)).toBe(input);
    });

    it('should reject invalid input', () => {
      expect(() => SecurityUtils.sanitizeQRInput('<script>xss</script>')).toThrow();
    });
  });

  describe('generateRandomBytes', () => {
    it('should generate random bytes', () => {
      const bytes = SecurityUtils.generateRandomBytes(32);
      expect(bytes).toHaveLength(32);
    });
  });

  describe('generateRandomString', () => {
    it('should generate random string', () => {
      const str = SecurityUtils.generateRandomString(20);
      expect(str).toHaveLength(20);
    });
  });

  describe('hash', () => {
    it('should hash data', () => {
      const hash = SecurityUtils.hash('test data');
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash).toHaveLength(32);
    });
  });

  describe('constantTimeEqual', () => {
    it('should compare arrays in constant time', () => {
      const arr1 = new Uint8Array([1, 2, 3]);
      const arr2 = new Uint8Array([1, 2, 3]);
      expect(SecurityUtils.constantTimeEqual(arr1, arr2)).toBe(true);
    });
  });
});

describe('Security Component Integration', () => {
  it('should work together seamlessly', async () => {
    const context = createSecureVerifier({
      enableNonceTracking: true,
      enableRateLimiting: true,
      enableAuditLogging: true,
      enableThreatDetection: true,
    });

    const testIdentifier = 'test-user';
    const nonce = Date.now().toString();
    const timestamp = Date.now();

    try {
      // Complete security check
      await context.nonceManager!.validateNonce(nonce, timestamp);
      await context.rateLimiter!.checkLimit(testIdentifier);
      await context.threatDetector!.trackVerification({
        identifier: testIdentifier,
        success: true,
      });

      await context.auditLogger!.log({
        category: AuditCategory.VERIFICATION,
        action: 'COMPLETE_CHECK',
        outcome: AuditOutcome.SUCCESS,
        severity: AuditSeverity.INFO,
        message: 'All security checks passed',
        actor: testIdentifier,
      });

      // Verify everything worked
      expect(await context.nonceManager!.hasBeenUsed(nonce)).toBe(true);
      const remaining = await context.rateLimiter!.getRemainingCapacity(testIdentifier);
      expect(remaining).toBeLessThan(100); // Default burst capacity is 100

      await context.auditLogger!.flush();
      const logCount = await context.auditLogger!.count();
      expect(logCount).toBeGreaterThan(0);
    } finally {
      context.cleanup();
    }
  });
});
