/**
 * Threat Detector - Behavioral Security Analysis
 *
 * This module provides real-time threat detection and behavioral analysis
 * for identifying suspicious patterns and potential security threats.
 *
 * Features:
 * - Rapid verification attempt detection
 * - Geographic anomaly detection
 * - Pattern-based threat identification
 * - Behavioral profiling
 * - Alert callbacks for security events
 * - Configurable threat thresholds
 * - Historical tracking and analysis
 *
 * @module security/threat-detector
 */

/**
 * Threat level severity
 */
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Threat type categories
 */
export enum ThreatType {
  RAPID_REQUESTS = 'RAPID_REQUESTS',
  GEOGRAPHIC_ANOMALY = 'GEOGRAPHIC_ANOMALY',
  CREDENTIAL_STUFFING = 'CREDENTIAL_STUFFING',
  REPLAY_ATTACK = 'REPLAY_ATTACK',
  BRUTE_FORCE = 'BRUTE_FORCE',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  UNUSUAL_BEHAVIOR = 'UNUSUAL_BEHAVIOR',
  KNOWN_MALICIOUS = 'KNOWN_MALICIOUS',
}

/**
 * Threat detection event
 */
export interface ThreatEvent {
  /** Unique event ID */
  id: string;

  /** Timestamp when threat was detected */
  timestamp: Date;

  /** Threat type */
  type: ThreatType;

  /** Threat severity level */
  level: ThreatLevel;

  /** Entity associated with threat (DID, IP, etc.) */
  entity: string;

  /** Description of the threat */
  description: string;

  /** Evidence/details about the threat */
  evidence: Record<string, unknown>;

  /** Recommended action */
  recommendation?: string;

  /** Whether automatic action was taken */
  automaticActionTaken?: boolean;
}

/**
 * Activity tracking record
 */
interface ActivityRecord {
  /** Timestamps of recent requests */
  requestTimes: number[];

  /** Geographic locations (if available) */
  locations?: string[];

  /** Failed attempt count */
  failureCount: number;

  /** Success count */
  successCount: number;

  /** Last seen timestamp */
  lastSeen: number;

  /** First seen timestamp */
  firstSeen: number;

  /** Associated entities (DIDs, credentials, etc.) */
  entities: Set<string>;

  /** Threat events triggered */
  threats: ThreatEvent[];
}

/**
 * Alert callback function
 */
export type ThreatAlertCallback = (event: ThreatEvent) => void | Promise<void>;

/**
 * Threat detector configuration
 */
export interface ThreatDetectorConfig {
  /**
   * Maximum requests per time window before flagging
   * @default 50
   */
  maxRequestsPerWindow?: number;

  /**
   * Time window for rapid request detection (milliseconds)
   * @default 60000 (1 minute)
   */
  rapidRequestWindow?: number;

  /**
   * Maximum failed attempts before flagging
   * @default 5
   */
  maxFailedAttempts?: number;

  /**
   * Geographic anomaly sensitivity (0-1)
   * @default 0.7
   */
  geoAnomalySensitivity?: number;

  /**
   * Enable automatic blocking for critical threats
   * @default false
   */
  enableAutoBlock?: boolean;

  /**
   * History retention period (milliseconds)
   * @default 86400000 (24 hours)
   */
  historyRetention?: number;

  /**
   * Alert callback for threat events
   */
  onThreatDetected?: ThreatAlertCallback;

  /**
   * Enable behavioral profiling
   * @default true
   */
  enableProfiling?: boolean;

  /**
   * Cleanup interval (milliseconds)
   * @default 3600000 (1 hour)
   */
  cleanupInterval?: number;
}

/**
 * Geographic location information
 */
interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  coordinates?: { lat: number; lon: number };
}

/**
 * Threat Detector for security monitoring
 *
 * @example
 * ```typescript
 * const detector = new ThreatDetector({
 *   maxRequestsPerWindow: 50,
 *   rapidRequestWindow: 60000,
 *   onThreatDetected: async (event) => {
 *     console.error('Threat detected:', event);
 *     // Send alert, block user, etc.
 *   },
 * });
 *
 * // Track verification attempt
 * await detector.trackVerification({
 *   identifier: 'did:aura:user123',
 *   success: true,
 *   sourceIp: '192.168.1.1',
 *   metadata: { credentialType: 'IdentityCredential' },
 * });
 * ```
 */
export class ThreatDetector {
  private readonly maxRequestsPerWindow: number;
  private readonly rapidRequestWindow: number;
  private readonly maxFailedAttempts: number;
  private readonly geoAnomalySensitivity: number;
  private readonly enableAutoBlock: boolean;
  private readonly historyRetention: number;
  private readonly enableProfiling: boolean;
  private readonly onThreatDetected?: ThreatAlertCallback;

  private activities: Map<string, ActivityRecord> = new Map();
  private blockedEntities: Set<string> = new Set();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: ThreatDetectorConfig = {}) {
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 50;
    this.rapidRequestWindow = config.rapidRequestWindow ?? 60000;
    this.maxFailedAttempts = config.maxFailedAttempts ?? 5;
    this.geoAnomalySensitivity = config.geoAnomalySensitivity ?? 0.7;
    this.enableAutoBlock = config.enableAutoBlock ?? false;
    this.historyRetention = config.historyRetention ?? 86400000;
    this.enableProfiling = config.enableProfiling ?? true;
    this.onThreatDetected = config.onThreatDetected;

    // Start cleanup
    const cleanupInterval = config.cleanupInterval ?? 3600000;
    this.startCleanup(cleanupInterval);
  }

  /**
   * Start automatic cleanup of old records
   */
  private startCleanup(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
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
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `threat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get or create activity record
   */
  private getActivityRecord(identifier: string): ActivityRecord {
    let record = this.activities.get(identifier);

    if (!record) {
      record = {
        requestTimes: [],
        failureCount: 0,
        successCount: 0,
        lastSeen: Date.now(),
        firstSeen: Date.now(),
        entities: new Set(),
        threats: [],
      };
      this.activities.set(identifier, record);
    }

    return record;
  }

  /**
   * Emit threat event
   */
  private async emitThreat(event: ThreatEvent): Promise<void> {
    // Store in activity record
    const record = this.getActivityRecord(event.entity);
    record.threats.push(event);

    // Auto-block if enabled and threat is critical
    if (this.enableAutoBlock && event.level === ThreatLevel.CRITICAL) {
      this.blockedEntities.add(event.entity);
      event.automaticActionTaken = true;
      event.recommendation = 'Entity automatically blocked';
    }

    // Call alert callback
    if (this.onThreatDetected) {
      try {
        await this.onThreatDetected(event);
      } catch {
        // Silent callback failure (security: no info disclosure)
      }
    }
  }

  /**
   * Detect rapid request pattern
   */
  private async detectRapidRequests(identifier: string, record: ActivityRecord): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.rapidRequestWindow;

    // Count recent requests
    const recentRequests = record.requestTimes.filter((t) => t >= windowStart);

    if (recentRequests.length >= this.maxRequestsPerWindow) {
      await this.emitThreat({
        id: this.generateEventId(),
        timestamp: new Date(),
        type: ThreatType.RAPID_REQUESTS,
        level: ThreatLevel.HIGH,
        entity: identifier,
        description: `Detected ${recentRequests.length} requests in ${this.rapidRequestWindow / 1000}s`,
        evidence: {
          requestCount: recentRequests.length,
          windowMs: this.rapidRequestWindow,
          requestsPerSecond: recentRequests.length / (this.rapidRequestWindow / 1000),
        },
        recommendation: 'Implement rate limiting or temporary block',
      });
    }
  }

  /**
   * Detect brute force pattern
   */
  private async detectBruteForce(identifier: string, record: ActivityRecord): Promise<void> {
    if (record.failureCount >= this.maxFailedAttempts) {
      const failureRate = record.failureCount / (record.successCount + record.failureCount);

      await this.emitThreat({
        id: this.generateEventId(),
        timestamp: new Date(),
        type: ThreatType.BRUTE_FORCE,
        level: failureRate > 0.8 ? ThreatLevel.CRITICAL : ThreatLevel.HIGH,
        entity: identifier,
        description: `Detected ${record.failureCount} failed attempts`,
        evidence: {
          failureCount: record.failureCount,
          successCount: record.successCount,
          failureRate,
        },
        recommendation: 'Block entity and investigate',
      });
    }
  }

  /**
   * Detect geographic anomaly
   */
  private async detectGeoAnomaly(
    identifier: string,
    record: ActivityRecord,
    currentLocation?: string
  ): Promise<void> {
    if (!this.enableProfiling || !currentLocation || !record.locations) {
      return;
    }

    // Check if current location is significantly different from historical
    const locationHistory = record.locations.filter(Boolean);

    if (locationHistory.length > 0 && !locationHistory.includes(currentLocation)) {
      // Calculate if this is truly anomalous based on sensitivity
      const threshold = Math.ceil(locationHistory.length * (1 - this.geoAnomalySensitivity));

      if (threshold <= 1) {
        await this.emitThreat({
          id: this.generateEventId(),
          timestamp: new Date(),
          type: ThreatType.GEOGRAPHIC_ANOMALY,
          level: ThreatLevel.MEDIUM,
          entity: identifier,
          description: `Access from new geographic location: ${currentLocation}`,
          evidence: {
            currentLocation,
            historicalLocations: Array.from(new Set(locationHistory)),
            anomalyScore: 1.0,
          },
          recommendation: 'Verify identity with additional authentication',
        });
      }
    }
  }

  /**
   * Detect credential stuffing pattern
   */
  private async detectCredentialStuffing(
    identifier: string,
    record: ActivityRecord
  ): Promise<void> {
    // Check for many different credentials/entities accessed rapidly
    const now = Date.now();
    const recentWindow = now - this.rapidRequestWindow;
    const recentRequests = record.requestTimes.filter((t) => t >= recentWindow);

    if (recentRequests.length > 10 && record.entities.size > 5) {
      await this.emitThreat({
        id: this.generateEventId(),
        timestamp: new Date(),
        type: ThreatType.CREDENTIAL_STUFFING,
        level: ThreatLevel.HIGH,
        entity: identifier,
        description: `Accessing ${record.entities.size} different entities rapidly`,
        evidence: {
          entityCount: record.entities.size,
          requestCount: recentRequests.length,
          windowMs: this.rapidRequestWindow,
        },
        recommendation: 'Block entity and review access patterns',
      });
    }
  }

  /**
   * Track verification attempt
   */
  async trackVerification(options: {
    identifier: string;
    success: boolean;
    sourceIp?: string;
    location?: string | GeoLocation;
    targetEntity?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { identifier, success, location, targetEntity } = options;

    // Check if blocked
    if (this.blockedEntities.has(identifier)) {
      await this.emitThreat({
        id: this.generateEventId(),
        timestamp: new Date(),
        type: ThreatType.KNOWN_MALICIOUS,
        level: ThreatLevel.CRITICAL,
        entity: identifier,
        description: 'Blocked entity attempted verification',
        evidence: { ...options.metadata },
        recommendation: 'Reject request immediately',
        automaticActionTaken: true,
      });
      throw new Error(`Entity ${identifier} is blocked`);
    }

    // Get activity record
    const record = this.getActivityRecord(identifier);

    // Update record
    const now = Date.now();
    record.requestTimes.push(now);
    record.lastSeen = now;

    if (success) {
      record.successCount++;
    } else {
      record.failureCount++;
    }

    if (targetEntity) {
      record.entities.add(targetEntity);
    }

    // Prepare location string for anomaly detection
    const locationStr = location
      ? typeof location === 'string'
        ? location
        : location.country || 'unknown'
      : undefined;

    // Run threat detection BEFORE adding location to history
    // (so geo anomaly detection can compare current vs historical)
    await Promise.all([
      this.detectRapidRequests(identifier, record),
      this.detectBruteForce(identifier, record),
      this.detectGeoAnomaly(identifier, record, locationStr),
      this.detectCredentialStuffing(identifier, record),
    ]);

    // Add location to history AFTER anomaly detection
    if (locationStr) {
      if (!record.locations) {
        record.locations = [];
      }
      record.locations.push(locationStr);
    }
  }

  /**
   * Track DID resolution
   */
  async trackDIDResolution(options: {
    did: string;
    success: boolean;
    sourceIp?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.trackVerification({
      identifier: options.sourceIp || options.did,
      success: options.success,
      sourceIp: options.sourceIp,
      targetEntity: options.did,
      metadata: options.metadata,
    });
  }

  /**
   * Check if entity is blocked
   */
  isBlocked(identifier: string): boolean {
    return this.blockedEntities.has(identifier);
  }

  /**
   * Block an entity
   */
  block(identifier: string, reason?: string): void {
    this.blockedEntities.add(identifier);

    // Emit block event
    this.emitThreat({
      id: this.generateEventId(),
      timestamp: new Date(),
      type: ThreatType.KNOWN_MALICIOUS,
      level: ThreatLevel.CRITICAL,
      entity: identifier,
      description: reason || 'Entity manually blocked',
      evidence: { reason },
      recommendation: 'Reject all requests from this entity',
      automaticActionTaken: true,
    }).catch(() => {
      /* Silent failure */
    });
  }

  /**
   * Unblock an entity
   */
  unblock(identifier: string): void {
    this.blockedEntities.delete(identifier);

    // Clear threat history
    const record = this.activities.get(identifier);
    if (record) {
      record.threats = [];
      record.failureCount = 0;
    }
  }

  /**
   * Get activity summary for an entity
   */
  getActivitySummary(identifier: string): {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    firstSeen: Date;
    lastSeen: Date;
    threatCount: number;
    isBlocked: boolean;
  } | null {
    const record = this.activities.get(identifier);

    if (!record) {
      return null;
    }

    return {
      totalRequests: record.requestTimes.length,
      successCount: record.successCount,
      failureCount: record.failureCount,
      firstSeen: new Date(record.firstSeen),
      lastSeen: new Date(record.lastSeen),
      threatCount: record.threats.length,
      isBlocked: this.blockedEntities.has(identifier),
    };
  }

  /**
   * Get recent threats
   */
  getRecentThreats(limit: number = 100): ThreatEvent[] {
    const allThreats: ThreatEvent[] = [];

    for (const record of this.activities.values()) {
      allThreats.push(...record.threats);
    }

    return allThreats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Cleanup old activity records
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.historyRetention;

    for (const [identifier, record] of this.activities.entries()) {
      // Remove old request times
      record.requestTimes = record.requestTimes.filter((t) => t >= cutoff);

      // Remove old threats
      record.threats = record.threats.filter((t) => t.timestamp.getTime() >= cutoff);

      // Remove record if no recent activity
      if (record.lastSeen < cutoff && record.threats.length === 0) {
        this.activities.delete(identifier);
      }
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.activities.clear();
    this.blockedEntities.clear();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEntities: number;
    blockedEntities: number;
    totalThreats: number;
    threatsByType: Record<ThreatType, number>;
    threatsByLevel: Record<ThreatLevel, number>;
  } {
    const threats = this.getRecentThreats(10000);

    const threatsByType = {} as Record<ThreatType, number>;
    const threatsByLevel = {} as Record<ThreatLevel, number>;

    for (const threat of threats) {
      threatsByType[threat.type] = (threatsByType[threat.type] || 0) + 1;
      threatsByLevel[threat.level] = (threatsByLevel[threat.level] || 0) + 1;
    }

    return {
      totalEntities: this.activities.size,
      blockedEntities: this.blockedEntities.size,
      totalThreats: threats.length,
      threatsByType,
      threatsByLevel,
    };
  }
}
