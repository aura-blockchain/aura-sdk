/**
 * Security Hardening Module for Aura Verifier SDK
 *
 * This module provides enterprise-grade security features for the Aura Verifier SDK:
 *
 * - **Nonce Management**: Prevent replay attacks with time-based nonce tracking
 * - **Rate Limiting**: Protect against abuse with configurable rate limits
 * - **Audit Logging**: Tamper-evident logging for compliance and security monitoring
 * - **Input Sanitization**: Prevent injection attacks and validate all external input
 * - **Threat Detection**: Behavioral analysis to identify suspicious patterns
 * - **Encryption Utilities**: AES-256-GCM encryption and secure key management
 *
 * @module security
 *
 * @example
 * ```typescript
 * import { createSecureVerifier, NonceManager, RateLimiter, AuditLogger } from '@aura-network/verifier-sdk/security';
 *
 * // Create a secure verifier with all protections enabled
 * const verifier = createSecureVerifier({
 *   rpcEndpoint: 'https://rpc.aurablockchain.org',
 *   security: {
 *     enableNonceTracking: true,
 *     enableRateLimiting: true,
 *     enableAuditLogging: true,
 *     enableThreatDetection: true,
 *   },
 * });
 *
 * // Or use individual security components
 * const nonceManager = new NonceManager({ nonceWindow: 300000 });
 * const rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
 * const auditLogger = new AuditLogger({ enableChaining: true });
 * ```
 */

// Internal imports for use in this module
import { NonceManager as _NonceManager } from './nonce-manager.js';
import { RateLimiter as _RateLimiter } from './rate-limiter.js';
import { AuditLogger as _AuditLogger } from './audit-logger.js';
import { InputSanitizer as _InputSanitizer, defaultSanitizer as _defaultSanitizer } from './input-sanitizer.js';
import { ThreatDetector as _ThreatDetector } from './threat-detector.js';
import { encryptionUtils as _encryptionUtils } from './encryption-utils.js';

// Nonce Management
export {
  NonceManager,
  InMemoryNonceStorage,
  BloomFilterNonceStorage,
  NonceValidatorAdapter,
  createNonceValidator,
} from './nonce-manager.js';
export type {
  NonceStorage,
  NonceManagerConfig,
} from './nonce-manager.js';

// Rate Limiting
export {
  RateLimiter,
  MultiTierRateLimiter,
  InMemoryRateLimiterStorage,
  RateLimitError,
} from './rate-limiter.js';
export type {
  RateLimiterConfig,
  RateLimiterStorage,
} from './rate-limiter.js';

// Audit Logging
export {
  AuditLogger,
  InMemoryAuditLogStorage,
  AuditSeverity,
  AuditCategory,
  AuditOutcome,
} from './audit-logger.js';
export type {
  AuditLoggerConfig,
  AuditLogEntry,
  AuditLogStorage,
} from './audit-logger.js';

// Input Sanitization
export {
  InputSanitizer,
  ValidationError,
  defaultSanitizer,
} from './input-sanitizer.js';
export type {
  SanitizerConfig,
} from './input-sanitizer.js';

// Threat Detection
export {
  ThreatDetector,
  ThreatLevel,
  ThreatType,
} from './threat-detector.js';
export type {
  ThreatDetectorConfig,
  ThreatEvent,
  ThreatAlertCallback,
} from './threat-detector.js';

// Encryption Utilities
export {
  EncryptionUtils,
  KeyRotationManager,
  encryptionUtils,
  EncryptionAlgorithm,
  KDFAlgorithm,
} from './encryption-utils.js';
export type {
  EncryptedData,
  KeyDerivationOptions,
  EncryptionOptions,
} from './encryption-utils.js';

/**
 * Security configuration for createSecureVerifier
 */
export interface SecurityConfig {
  /**
   * Enable nonce tracking to prevent replay attacks
   * @default true
   */
  enableNonceTracking?: boolean;

  /**
   * Nonce tracking configuration
   */
  nonceConfig?: {
    nonceWindow?: number;
    cleanupInterval?: number;
  };

  /**
   * Enable rate limiting
   * @default true
   */
  enableRateLimiting?: boolean;

  /**
   * Rate limiting configuration
   */
  rateLimitConfig?: {
    maxRequests?: number;
    windowMs?: number;
    burstCapacity?: number;
  };

  /**
   * Enable audit logging
   * @default true
   */
  enableAuditLogging?: boolean;

  /**
   * Audit logging configuration
   */
  auditConfig?: {
    enableChaining?: boolean;
    bufferSize?: number;
    flushInterval?: number;
  };

  /**
   * Enable threat detection
   * @default false
   */
  enableThreatDetection?: boolean;

  /**
   * Threat detection configuration
   */
  threatConfig?: {
    maxRequestsPerWindow?: number;
    rapidRequestWindow?: number;
    maxFailedAttempts?: number;
    onThreatDetected?: (event: import('./threat-detector.js').ThreatEvent) => void;
  };

  /**
   * Enable input sanitization
   * @default true
   */
  enableInputSanitization?: boolean;

  /**
   * Input sanitization configuration
   */
  sanitizerConfig?: {
    maxStringLength?: number;
    strictMode?: boolean;
  };
}

/**
 * Secure verifier wrapper with all security features
 */
export interface SecureVerifierContext {
  /** Nonce manager instance */
  nonceManager?: _NonceManager;

  /** Rate limiter instance */
  rateLimiter?: _RateLimiter;

  /** Audit logger instance */
  auditLogger?: _AuditLogger;

  /** Threat detector instance */
  threatDetector?: _ThreatDetector;

  /** Input sanitizer instance */
  inputSanitizer?: _InputSanitizer;

  /** Cleanup all security components */
  cleanup: () => void;
}

/**
 * Create a secure verifier with all security features enabled
 *
 * This factory function creates a verifier context with security components
 * configured based on the provided security configuration.
 *
 * @param config - Security configuration
 * @returns Secure verifier context with security components
 *
 * @example
 * ```typescript
 * const context = createSecureVerifier({
 *   enableNonceTracking: true,
 *   enableRateLimiting: true,
 *   enableAuditLogging: true,
 *   enableThreatDetection: true,
 *   threatConfig: {
 *     onThreatDetected: async (event) => {
 *       console.error('Security threat detected:', event);
 *       // Send alert, block user, etc.
 *     },
 *   },
 * });
 *
 * // Use security components
 * await context.nonceManager?.validateNonce('12345', Date.now());
 * await context.rateLimiter?.checkLimit('did:aura:user123');
 * await context.auditLogger?.logVerificationAttempt({
 *   actor: 'did:aura:verifier',
 *   target: 'did:aura:credential',
 *   outcome: AuditOutcome.SUCCESS,
 * });
 *
 * // Cleanup when done
 * context.cleanup();
 * ```
 */
export function createSecureVerifier(config: SecurityConfig = {}): SecureVerifierContext {
  const components: SecureVerifierContext = {
    cleanup: () => {
      // Cleanup all components
      components.nonceManager?.stop();
      components.rateLimiter?.stop();
      components.auditLogger?.stop();
      components.threatDetector?.stop();
    },
  };

  // Initialize nonce manager
  if (config.enableNonceTracking !== false) {
    components.nonceManager = new _NonceManager(config.nonceConfig);
  }

  // Initialize rate limiter
  if (config.enableRateLimiting !== false) {
    components.rateLimiter = new _RateLimiter(config.rateLimitConfig);
  }

  // Initialize audit logger
  if (config.enableAuditLogging !== false) {
    components.auditLogger = new _AuditLogger(config.auditConfig);
  }

  // Initialize threat detector
  if (config.enableThreatDetection) {
    components.threatDetector = new _ThreatDetector(config.threatConfig);
  }

  // Initialize input sanitizer
  if (config.enableInputSanitization !== false) {
    components.inputSanitizer = new _InputSanitizer(config.sanitizerConfig);
  }

  return components;
}

/**
 * Security utilities namespace
 */
export const SecurityUtils = {
  /**
   * Create a secure verifier context
   */
  createSecureVerifier,

  /**
   * Validate and sanitize QR input
   */
  sanitizeQRInput: (input: string): string => {
    return _defaultSanitizer.sanitizeQRInput(input);
  },

  /**
   * Generate secure random bytes
   */
  generateRandomBytes: (length: number): Uint8Array => {
    return _encryptionUtils.generateRandomBytes(length);
  },

  /**
   * Generate secure random string
   */
  generateRandomString: (length: number): string => {
    return _encryptionUtils.generateRandomString(length);
  },

  /**
   * Hash data with SHA-256
   */
  hash: (data: string | Uint8Array): Uint8Array => {
    return _encryptionUtils.hash(data);
  },

  /**
   * Constant-time comparison
   */
  constantTimeEqual: (a: Uint8Array, b: Uint8Array): boolean => {
    return _encryptionUtils.constantTimeEqual(a, b);
  },
};
