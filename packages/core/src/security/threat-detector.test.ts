/**
 * Tests for Threat Detector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThreatDetector, ThreatLevel, ThreatType, ThreatEvent } from './threat-detector.js';

describe('ThreatDetector', () => {
  let detector: ThreatDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    detector = new ThreatDetector({
      maxRequestsPerWindow: 10,
      rapidRequestWindow: 60000,
      maxFailedAttempts: 3,
      cleanupInterval: 3600000,
    });
  });

  afterEach(() => {
    detector.stop();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const defaultDetector = new ThreatDetector();
      expect(defaultDetector).toBeDefined();
      defaultDetector.stop();
    });

    it('should accept custom config', () => {
      const customDetector = new ThreatDetector({
        maxRequestsPerWindow: 100,
        rapidRequestWindow: 30000,
        maxFailedAttempts: 10,
        geoAnomalySensitivity: 0.9,
        enableAutoBlock: true,
        historyRetention: 48 * 3600 * 1000,
        enableProfiling: false,
      });
      expect(customDetector).toBeDefined();
      customDetector.stop();
    });

    it('should accept alert callback', () => {
      const callback = vi.fn();
      const detectorWithCallback = new ThreatDetector({
        onThreatDetected: callback,
      });
      expect(detectorWithCallback).toBeDefined();
      detectorWithCallback.stop();
    });
  });

  describe('trackVerification', () => {
    it('should track successful verification', async () => {
      await detector.trackVerification({
        identifier: 'user-123',
        success: true,
      });

      const summary = detector.getActivitySummary('user-123');
      expect(summary).not.toBeNull();
      expect(summary!.successCount).toBe(1);
      expect(summary!.failureCount).toBe(0);
      expect(summary!.totalRequests).toBe(1);
    });

    it('should track failed verification', async () => {
      await detector.trackVerification({
        identifier: 'user-123',
        success: false,
      });

      const summary = detector.getActivitySummary('user-123');
      expect(summary!.failureCount).toBe(1);
      expect(summary!.successCount).toBe(0);
    });

    it('should track target entities', async () => {
      await detector.trackVerification({
        identifier: 'user-123',
        success: true,
        targetEntity: 'vc-001',
      });

      // Tracker internally stores entities
      const summary = detector.getActivitySummary('user-123');
      expect(summary).not.toBeNull();
    });

    it('should track location', async () => {
      await detector.trackVerification({
        identifier: 'user-123',
        success: true,
        location: 'US',
      });

      // Location is stored internally
      const summary = detector.getActivitySummary('user-123');
      expect(summary).not.toBeNull();
    });

    it('should track location object', async () => {
      await detector.trackVerification({
        identifier: 'user-123',
        success: true,
        location: { country: 'US', city: 'New York' },
      });

      const summary = detector.getActivitySummary('user-123');
      expect(summary).not.toBeNull();
    });

    it('should throw for blocked entity', async () => {
      detector.block('blocked-user');

      await expect(
        detector.trackVerification({
          identifier: 'blocked-user',
          success: true,
        })
      ).rejects.toThrow('blocked');
    });
  });

  describe('rapid request detection', () => {
    it('should detect rapid requests', async () => {
      const alertCallback = vi.fn();
      const rapidDetector = new ThreatDetector({
        maxRequestsPerWindow: 5,
        rapidRequestWindow: 60000,
        onThreatDetected: alertCallback,
      });

      // Make 6 requests rapidly (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        await rapidDetector.trackVerification({
          identifier: 'rapid-user',
          success: true,
        });
      }

      expect(alertCallback).toHaveBeenCalled();
      const threat = alertCallback.mock.calls[0][0] as ThreatEvent;
      expect(threat.type).toBe(ThreatType.RAPID_REQUESTS);
      expect(threat.level).toBe(ThreatLevel.HIGH);

      rapidDetector.stop();
    });
  });

  describe('brute force detection', () => {
    it('should detect brute force attacks', async () => {
      const alertCallback = vi.fn();
      const bruteDetector = new ThreatDetector({
        maxFailedAttempts: 3,
        onThreatDetected: alertCallback,
      });

      // Make 4 failed attempts (exceeds limit of 3)
      for (let i = 0; i < 4; i++) {
        await bruteDetector.trackVerification({
          identifier: 'brute-user',
          success: false,
        });
      }

      expect(alertCallback).toHaveBeenCalled();
      const threat = alertCallback.mock.calls[0][0] as ThreatEvent;
      expect(threat.type).toBe(ThreatType.BRUTE_FORCE);

      bruteDetector.stop();
    });

    it('should set CRITICAL level for high failure rate', async () => {
      const alertCallback = vi.fn();
      const bruteDetector = new ThreatDetector({
        maxFailedAttempts: 3,
        onThreatDetected: alertCallback,
      });

      // All failures (100% failure rate > 80%)
      for (let i = 0; i < 10; i++) {
        await bruteDetector.trackVerification({
          identifier: 'bad-actor',
          success: false,
        });
      }

      const threats = alertCallback.mock.calls.map((c) => c[0] as ThreatEvent);
      const criticalThreat = threats.find((t) => t.level === ThreatLevel.CRITICAL);
      expect(criticalThreat).toBeDefined();

      bruteDetector.stop();
    });
  });

  describe('geographic anomaly detection', () => {
    it('should detect access from new location', async () => {
      const alertCallback = vi.fn();
      const geoDetector = new ThreatDetector({
        enableProfiling: true,
        geoAnomalySensitivity: 0.7,
        onThreatDetected: alertCallback,
      });

      // Establish location history
      await geoDetector.trackVerification({
        identifier: 'traveler',
        success: true,
        location: 'US',
      });

      // Access from new location
      await geoDetector.trackVerification({
        identifier: 'traveler',
        success: true,
        location: 'RU',
      });

      expect(alertCallback).toHaveBeenCalled();
      const threat = alertCallback.mock.calls[0][0] as ThreatEvent;
      expect(threat.type).toBe(ThreatType.GEOGRAPHIC_ANOMALY);
      expect(threat.level).toBe(ThreatLevel.MEDIUM);

      geoDetector.stop();
    });

    it('should not detect anomaly when profiling disabled', async () => {
      const alertCallback = vi.fn();
      const noProfiling = new ThreatDetector({
        enableProfiling: false,
        onThreatDetected: alertCallback,
      });

      await noProfiling.trackVerification({
        identifier: 'user',
        success: true,
        location: 'US',
      });

      await noProfiling.trackVerification({
        identifier: 'user',
        success: true,
        location: 'CN',
      });

      // No geo anomaly should be detected
      const geoThreats = alertCallback.mock.calls.filter(
        (c) => (c[0] as ThreatEvent).type === ThreatType.GEOGRAPHIC_ANOMALY
      );
      expect(geoThreats).toHaveLength(0);

      noProfiling.stop();
    });
  });

  describe('credential stuffing detection', () => {
    it('should detect credential stuffing', async () => {
      const alertCallback = vi.fn();
      const stuffingDetector = new ThreatDetector({
        onThreatDetected: alertCallback,
      });

      // Access many different entities rapidly
      for (let i = 0; i < 15; i++) {
        await stuffingDetector.trackVerification({
          identifier: 'attacker',
          success: true,
          targetEntity: `vc-${i}`,
        });
      }

      expect(alertCallback).toHaveBeenCalled();
      const threats = alertCallback.mock.calls.map((c) => c[0] as ThreatEvent);
      const stuffingThreat = threats.find((t) => t.type === ThreatType.CREDENTIAL_STUFFING);
      expect(stuffingThreat).toBeDefined();

      stuffingDetector.stop();
    });
  });

  describe('auto-blocking', () => {
    it('should auto-block on critical threat when enabled', async () => {
      const detector = new ThreatDetector({
        maxFailedAttempts: 3,
        enableAutoBlock: true,
      });

      // Trigger critical threat (high failure rate)
      for (let i = 0; i < 10; i++) {
        try {
          await detector.trackVerification({
            identifier: 'auto-blocked',
            success: false,
          });
        } catch {
          // Expected when blocked
        }
      }

      expect(detector.isBlocked('auto-blocked')).toBe(true);

      detector.stop();
    });

    it('should not auto-block when disabled', async () => {
      const detector = new ThreatDetector({
        maxFailedAttempts: 3,
        enableAutoBlock: false,
      });

      for (let i = 0; i < 10; i++) {
        await detector.trackVerification({
          identifier: 'not-blocked',
          success: false,
        });
      }

      expect(detector.isBlocked('not-blocked')).toBe(false);

      detector.stop();
    });
  });

  describe('block/unblock', () => {
    it('should block entity', () => {
      detector.block('bad-user');
      expect(detector.isBlocked('bad-user')).toBe(true);
    });

    it('should block with reason', () => {
      detector.block('bad-user', 'Suspicious activity');
      expect(detector.isBlocked('bad-user')).toBe(true);
    });

    it('should unblock entity', () => {
      detector.block('temp-blocked');
      expect(detector.isBlocked('temp-blocked')).toBe(true);

      detector.unblock('temp-blocked');
      expect(detector.isBlocked('temp-blocked')).toBe(false);
    });

    it('should clear threat history on unblock', async () => {
      // Create some activity
      await detector.trackVerification({
        identifier: 'user-to-unblock',
        success: false,
      });
      await detector.trackVerification({
        identifier: 'user-to-unblock',
        success: false,
      });
      await detector.trackVerification({
        identifier: 'user-to-unblock',
        success: false,
      });

      const beforeUnblock = detector.getActivitySummary('user-to-unblock');
      expect(beforeUnblock!.failureCount).toBe(3);

      detector.unblock('user-to-unblock');

      const afterUnblock = detector.getActivitySummary('user-to-unblock');
      expect(afterUnblock!.failureCount).toBe(0);
      expect(afterUnblock!.threatCount).toBe(0);
    });
  });

  describe('isBlocked', () => {
    it('should return false for non-blocked entity', () => {
      expect(detector.isBlocked('normal-user')).toBe(false);
    });

    it('should return true for blocked entity', () => {
      detector.block('blocked-user');
      expect(detector.isBlocked('blocked-user')).toBe(true);
    });
  });

  describe('getActivitySummary', () => {
    it('should return null for unknown entity', () => {
      const summary = detector.getActivitySummary('unknown');
      expect(summary).toBeNull();
    });

    it('should return correct summary', async () => {
      await detector.trackVerification({
        identifier: 'tracked-user',
        success: true,
      });
      await detector.trackVerification({
        identifier: 'tracked-user',
        success: true,
      });
      await detector.trackVerification({
        identifier: 'tracked-user',
        success: false,
      });

      const summary = detector.getActivitySummary('tracked-user');

      expect(summary).not.toBeNull();
      expect(summary!.totalRequests).toBe(3);
      expect(summary!.successCount).toBe(2);
      expect(summary!.failureCount).toBe(1);
      expect(summary!.firstSeen).toBeInstanceOf(Date);
      expect(summary!.lastSeen).toBeInstanceOf(Date);
      expect(summary!.isBlocked).toBe(false);
    });

    it('should reflect blocked status', async () => {
      await detector.trackVerification({
        identifier: 'blocked-tracked',
        success: true,
      });

      detector.block('blocked-tracked');

      const summary = detector.getActivitySummary('blocked-tracked');
      expect(summary!.isBlocked).toBe(true);
    });
  });

  describe('getRecentThreats', () => {
    it('should return empty array when no threats', () => {
      const threats = detector.getRecentThreats();
      expect(threats).toEqual([]);
    });

    it('should return threats sorted by time', async () => {
      const alertDetector = new ThreatDetector({
        maxFailedAttempts: 1,
      });

      // Generate threats
      vi.advanceTimersByTime(1000);
      await alertDetector.trackVerification({
        identifier: 'user1',
        success: false,
      });

      vi.advanceTimersByTime(1000);
      await alertDetector.trackVerification({
        identifier: 'user2',
        success: false,
      });

      const threats = alertDetector.getRecentThreats();
      expect(threats.length).toBeGreaterThanOrEqual(2);

      // Should be sorted newest first
      for (let i = 1; i < threats.length; i++) {
        expect(threats[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          threats[i].timestamp.getTime()
        );
      }

      alertDetector.stop();
    });

    it('should respect limit parameter', async () => {
      const alertDetector = new ThreatDetector({
        maxFailedAttempts: 1,
      });

      // Generate multiple threats
      for (let i = 0; i < 5; i++) {
        await alertDetector.trackVerification({
          identifier: `user-${i}`,
          success: false,
        });
      }

      const threats = alertDetector.getRecentThreats(2);
      expect(threats.length).toBe(2);

      alertDetector.stop();
    });
  });

  describe('cleanup', () => {
    it('should remove old request times', async () => {
      vi.useRealTimers();

      const shortRetention = new ThreatDetector({
        historyRetention: 100, // 100ms
      });

      await shortRetention.trackVerification({
        identifier: 'old-user',
        success: true,
      });

      // Wait for history to expire
      await new Promise((r) => setTimeout(r, 150));

      shortRetention.cleanup();

      // Record should be cleaned up
      const summary = shortRetention.getActivitySummary('old-user');
      expect(summary).toBeNull();

      shortRetention.stop();
    });

    it('should keep recent activity', async () => {
      vi.useRealTimers();

      const shortRetention = new ThreatDetector({
        historyRetention: 1000, // 1 second
      });

      await shortRetention.trackVerification({
        identifier: 'recent-user',
        success: true,
      });

      shortRetention.cleanup();

      const summary = shortRetention.getActivitySummary('recent-user');
      expect(summary).not.toBeNull();

      shortRetention.stop();
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await detector.trackVerification({
        identifier: 'user1',
        success: true,
      });
      await detector.trackVerification({
        identifier: 'user2',
        success: false,
      });
      detector.block('blocked-user');

      detector.clear();

      expect(detector.getActivitySummary('user1')).toBeNull();
      expect(detector.getActivitySummary('user2')).toBeNull();
      expect(detector.isBlocked('blocked-user')).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return empty statistics initially', () => {
      const stats = detector.getStatistics();

      expect(stats.totalEntities).toBe(0);
      expect(stats.blockedEntities).toBe(0);
      expect(stats.totalThreats).toBe(0);
      expect(stats.threatsByType).toEqual({});
      expect(stats.threatsByLevel).toEqual({});
    });

    it('should track entity count', async () => {
      await detector.trackVerification({
        identifier: 'user1',
        success: true,
      });
      await detector.trackVerification({
        identifier: 'user2',
        success: true,
      });

      const stats = detector.getStatistics();
      expect(stats.totalEntities).toBe(2);
    });

    it('should track blocked count', () => {
      detector.block('bad1');
      detector.block('bad2');
      detector.block('bad3');

      const stats = detector.getStatistics();
      expect(stats.blockedEntities).toBe(3);
    });

    it('should categorize threats by type and level', async () => {
      const statsDetector = new ThreatDetector({
        maxFailedAttempts: 1,
        maxRequestsPerWindow: 2,
      });

      // Generate brute force threat
      await statsDetector.trackVerification({
        identifier: 'brute',
        success: false,
      });

      // Generate rapid request threat
      await statsDetector.trackVerification({
        identifier: 'rapid',
        success: true,
      });
      await statsDetector.trackVerification({
        identifier: 'rapid',
        success: true,
      });

      const stats = statsDetector.getStatistics();

      expect(stats.totalThreats).toBeGreaterThan(0);
      expect(Object.keys(stats.threatsByType).length).toBeGreaterThan(0);
      expect(Object.keys(stats.threatsByLevel).length).toBeGreaterThan(0);

      statsDetector.stop();
    });
  });

  describe('trackDIDResolution', () => {
    it('should track DID resolution', async () => {
      await detector.trackDIDResolution({
        did: 'did:aura:mainnet:user123',
        success: true,
        sourceIp: '192.168.1.1',
      });

      const summary = detector.getActivitySummary('192.168.1.1');
      expect(summary).not.toBeNull();
      expect(summary!.totalRequests).toBe(1);
    });

    it('should use DID as identifier when no sourceIp', async () => {
      await detector.trackDIDResolution({
        did: 'did:aura:mainnet:user456',
        success: true,
      });

      const summary = detector.getActivitySummary('did:aura:mainnet:user456');
      expect(summary).not.toBeNull();
    });
  });

  describe('stop', () => {
    it('should stop cleanup timer', () => {
      const newDetector = new ThreatDetector();
      newDetector.stop();
      // Should not throw
      newDetector.stop(); // Multiple stops should be safe
    });
  });

  describe('alert callback errors', () => {
    it('should silently handle callback errors', async () => {
      const errorCallback = vi.fn().mockRejectedValue(new Error('Callback error'));
      const errorDetector = new ThreatDetector({
        maxFailedAttempts: 1,
        onThreatDetected: errorCallback,
      });

      // Should not throw despite callback error
      await errorDetector.trackVerification({
        identifier: 'user',
        success: false,
      });

      expect(errorCallback).toHaveBeenCalled();
      errorDetector.stop();
    });
  });
});
