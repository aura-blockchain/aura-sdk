/**
 * Audit Logger - Tamper-Evident Security Logging
 *
 * This module provides enterprise-grade audit logging with tamper-evident features
 * for compliance and security monitoring in the Aura Verifier SDK.
 *
 * Features:
 * - Structured audit logging with standard fields
 * - Tamper-evident log chains using cryptographic hashes
 * - Log rotation and archival support
 * - Compliance-ready formats (GDPR, SOC2, ISO 27001)
 * - Async log writing with buffering
 * - Pluggable storage backends (file, database, cloud)
 *
 * @module security/audit-logger
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit event categories
 */
export enum AuditCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VERIFICATION = 'VERIFICATION',
  CREDENTIAL_ACCESS = 'CREDENTIAL_ACCESS',
  DID_RESOLUTION = 'DID_RESOLUTION',
  CONFIGURATION = 'CONFIGURATION',
  SECURITY = 'SECURITY',
  PRIVACY = 'PRIVACY',
  SYSTEM = 'SYSTEM',
}

/**
 * Audit event outcome
 */
export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique log entry ID */
  id: string;

  /** Timestamp (ISO 8601) */
  timestamp: string;

  /** Event category */
  category: AuditCategory;

  /** Event action/operation */
  action: string;

  /** Event outcome */
  outcome: AuditOutcome;

  /** Severity level */
  severity: AuditSeverity;

  /** Actor (user DID, verifier ID, system) */
  actor?: string;

  /** Target resource (credential ID, DID, etc.) */
  target?: string;

  /** IP address or network identifier */
  sourceIp?: string;

  /** User agent or client information */
  userAgent?: string;

  /** Session or request ID for correlation */
  sessionId?: string;

  /** Human-readable message */
  message: string;

  /** Additional structured data */
  metadata?: Record<string, unknown>;

  /** Hash of previous log entry (for tamper detection) */
  previousHash?: string;

  /** Hash of current log entry */
  hash: string;

  /** Sequence number in log chain */
  sequence: number;
}

/**
 * Storage interface for audit logs
 */
export interface AuditLogStorage {
  /**
   * Write a log entry
   */
  write(entry: AuditLogEntry): Promise<void>;

  /**
   * Read log entries with optional filters
   */
  read(options?: {
    startTime?: Date;
    endTime?: Date;
    category?: AuditCategory;
    actor?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]>;

  /**
   * Get the last log entry
   */
  getLast(): Promise<AuditLogEntry | null>;

  /**
   * Rotate logs (archive old entries)
   */
  rotate(beforeDate: Date): Promise<void>;

  /**
   * Verify log chain integrity
   */
  verifyChain(entries: AuditLogEntry[]): Promise<boolean>;

  /**
   * Get total number of log entries
   */
  count(): Promise<number>;
}

/**
 * In-memory audit log storage (for testing)
 */
export class InMemoryAuditLogStorage implements AuditLogStorage {
  private entries: AuditLogEntry[] = [];

  async write(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async read(
    options: {
      startTime?: Date;
      endTime?: Date;
      category?: AuditCategory;
      actor?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuditLogEntry[]> {
    let filtered = this.entries;

    // Filter by time range
    if (options.startTime) {
      filtered = filtered.filter((e) => new Date(e.timestamp) >= options.startTime!);
    }
    if (options.endTime) {
      filtered = filtered.filter((e) => new Date(e.timestamp) <= options.endTime!);
    }

    // Filter by category
    if (options.category) {
      filtered = filtered.filter((e) => e.category === options.category);
    }

    // Filter by actor
    if (options.actor) {
      filtered = filtered.filter((e) => e.actor === options.actor);
    }

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  async getLast(): Promise<AuditLogEntry | null> {
    return this.entries[this.entries.length - 1] || null;
  }

  async rotate(beforeDate: Date): Promise<void> {
    this.entries = this.entries.filter((e) => new Date(e.timestamp) >= beforeDate);
  }

  async verifyChain(entries: AuditLogEntry[]): Promise<boolean> {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify sequence number
      if (entry.sequence !== i) {
        return false;
      }

      // Verify hash chain
      if (i > 0) {
        const prev = entries[i - 1];
        if (entry.previousHash !== prev.hash) {
          return false;
        }
      }

      // Verify entry hash
      const calculatedHash = this.calculateHash(entry);
      if (entry.hash !== calculatedHash) {
        return false;
      }
    }

    return true;
  }

  async count(): Promise<number> {
    return this.entries.length;
  }

  private calculateHash(entry: Partial<AuditLogEntry>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      category: entry.category,
      action: entry.action,
      outcome: entry.outcome,
      severity: entry.severity,
      actor: entry.actor,
      target: entry.target,
      message: entry.message,
      metadata: entry.metadata,
      previousHash: entry.previousHash,
      sequence: entry.sequence,
    });

    return bytesToHex(sha256(new TextEncoder().encode(data)));
  }
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /**
   * Storage backend for audit logs
   */
  storage?: AuditLogStorage;

  /**
   * Enable tamper-evident log chaining
   * @default true
   */
  enableChaining?: boolean;

  /**
   * Buffer size before flushing to storage
   * @default 10
   */
  bufferSize?: number;

  /**
   * Auto-flush interval in milliseconds
   * @default 5000 (5 seconds)
   */
  flushInterval?: number;

  /**
   * Include stack traces in error logs
   * @default true
   */
  includeStackTraces?: boolean;

  /**
   * Redact sensitive fields from metadata
   * @default ['password', 'token', 'secret', 'privateKey']
   */
  redactFields?: string[];

  /**
   * Enable log rotation
   * @default false
   */
  enableRotation?: boolean;

  /**
   * Log retention period in days
   * @default 90
   */
  retentionDays?: number;
}

/**
 * Audit Logger for security and compliance
 *
 * @example
 * ```typescript
 * const logger = new AuditLogger({
 *   enableChaining: true,
 *   bufferSize: 100,
 * });
 *
 * // Log verification attempt
 * await logger.log({
 *   category: AuditCategory.VERIFICATION,
 *   action: 'VERIFY_CREDENTIAL',
 *   outcome: AuditOutcome.SUCCESS,
 *   severity: AuditSeverity.INFO,
 *   actor: 'did:aura:verifier123',
 *   target: 'did:aura:credential456',
 *   message: 'Successfully verified credential',
 *   metadata: { vcType: 'IdentityCredential' },
 * });
 * ```
 */
export class AuditLogger {
  private readonly storage: AuditLogStorage;
  private readonly enableChaining: boolean;
  private readonly bufferSize: number;
  private readonly includeStackTraces: boolean;
  private readonly redactFields: Set<string>;
  private buffer: AuditLogEntry[] = [];
  private sequence: number = 0;
  private lastHash?: string;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AuditLoggerConfig = {}) {
    this.storage = config.storage || new InMemoryAuditLogStorage();
    this.enableChaining = config.enableChaining ?? true;
    this.bufferSize = config.bufferSize ?? 10;
    this.includeStackTraces = config.includeStackTraces ?? true;
    this.redactFields = new Set(
      config.redactFields ?? ['password', 'token', 'secret', 'privateKey', 'signature']
    );

    // Initialize sequence from last entry
    this.initializeSequence();

    // Start auto-flush
    const flushInterval = config.flushInterval ?? 5000;
    this.startAutoFlush(flushInterval);
  }

  /**
   * Initialize sequence number from storage
   */
  private async initializeSequence(): Promise<void> {
    try {
      const last = await this.storage.getLast();
      if (last) {
        this.sequence = last.sequence + 1;
        this.lastHash = last.hash;
      }
    } catch {
      // Silent initialization failure (security: no info disclosure)
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(interval: number): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {
        // Silent flush failure (security: no info disclosure)
      });
    }, interval);

    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Stop auto-flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Generate unique log entry ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Calculate hash for log entry
   */
  private calculateHash(entry: Partial<AuditLogEntry>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      category: entry.category,
      action: entry.action,
      outcome: entry.outcome,
      severity: entry.severity,
      actor: entry.actor,
      target: entry.target,
      message: entry.message,
      metadata: entry.metadata,
      previousHash: entry.previousHash,
      sequence: entry.sequence,
    });

    return bytesToHex(sha256(new TextEncoder().encode(data)));
  }

  /**
   * Redact sensitive fields from metadata
   */
  private redactMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.redactFields.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactMetadata(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Log an audit event
   */
  async log(options: {
    category: AuditCategory;
    action: string;
    outcome: AuditOutcome;
    severity: AuditSeverity;
    actor?: string;
    target?: string;
    sourceIp?: string;
    userAgent?: string;
    sessionId?: string;
    message: string;
    metadata?: Record<string, unknown>;
    error?: Error;
  }): Promise<void> {
    // Create log entry
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      category: options.category,
      action: options.action,
      outcome: options.outcome,
      severity: options.severity,
      actor: options.actor,
      target: options.target,
      sourceIp: options.sourceIp,
      userAgent: options.userAgent,
      sessionId: options.sessionId,
      message: options.message,
      metadata: this.redactMetadata(options.metadata),
      sequence: this.sequence++,
      previousHash: this.enableChaining ? this.lastHash : undefined,
      hash: '', // Will be calculated
    };

    // Add error stack trace if available
    if (options.error && this.includeStackTraces) {
      entry.metadata = {
        ...entry.metadata,
        error: {
          name: options.error.name,
          message: options.error.message,
          stack: options.error.stack,
        },
      };
    }

    // Calculate hash
    entry.hash = this.calculateHash(entry);
    this.lastHash = entry.hash;

    // Add to buffer
    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Flush buffered log entries to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await Promise.all(entries.map((entry) => this.storage.write(entry)));
    } catch (error) {
      // Re-add entries to buffer on failure
      this.buffer.unshift(...entries);
      throw error;
    }
  }

  /**
   * Convenience methods for common log operations
   */

  async logVerificationAttempt(options: {
    actor: string;
    target: string;
    outcome: AuditOutcome;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      category: AuditCategory.VERIFICATION,
      action: 'VERIFY_CREDENTIAL',
      outcome: options.outcome,
      severity:
        options.outcome === AuditOutcome.SUCCESS ? AuditSeverity.INFO : AuditSeverity.WARNING,
      actor: options.actor,
      target: options.target,
      message: `Credential verification ${options.outcome.toLowerCase()}`,
      metadata: options.metadata,
    });
  }

  async logDIDResolution(options: {
    did: string;
    outcome: AuditOutcome;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      category: AuditCategory.DID_RESOLUTION,
      action: 'RESOLVE_DID',
      outcome: options.outcome,
      severity:
        options.outcome === AuditOutcome.SUCCESS ? AuditSeverity.INFO : AuditSeverity.WARNING,
      target: options.did,
      message: `DID resolution ${options.outcome.toLowerCase()}`,
      metadata: options.metadata,
    });
  }

  async logSecurityEvent(options: {
    action: string;
    severity: AuditSeverity;
    message: string;
    actor?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      category: AuditCategory.SECURITY,
      action: options.action,
      outcome: AuditOutcome.FAILURE,
      severity: options.severity,
      actor: options.actor,
      message: options.message,
      metadata: options.metadata,
    });
  }

  /**
   * Query audit logs
   */
  async query(options?: {
    startTime?: Date;
    endTime?: Date;
    category?: AuditCategory;
    actor?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    return this.storage.read(options);
  }

  /**
   * Verify log chain integrity
   */
  async verifyIntegrity(entries?: AuditLogEntry[]): Promise<boolean> {
    const logsToVerify = entries || (await this.storage.read());
    return this.storage.verifyChain(logsToVerify);
  }

  /**
   * Get total log count
   */
  async count(): Promise<number> {
    return this.storage.count();
  }
}
