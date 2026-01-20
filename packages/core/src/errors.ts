/**
 * Centralized Error Definitions for Aura Verifier SDK
 *
 * Provides a comprehensive hierarchy of error classes for different failure scenarios.
 * All errors extend from AuraVerifierError base class for consistent error handling.
 */

import { ERROR_CODES } from './types/constants.js';

/**
 * Base error class for all Aura Verifier SDK errors
 */
export class AuraVerifierError extends Error {
  /**
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param details - Additional error context (optional)
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AuraVerifierError';
    Object.setPrototypeOf(this, AuraVerifierError.prototype);
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

// ============================================================================
// QR Code Errors
// ============================================================================

/**
 * Error thrown when QR code parsing fails
 */
export class QRParseError extends AuraVerifierError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.QR_PARSE_ERROR, details);
    this.name = 'QRParseError';
    Object.setPrototypeOf(this, QRParseError.prototype);
  }

  /**
   * Create error for invalid QR code format
   */
  static invalidFormat(reason: string): QRParseError {
    return new QRParseError(`Invalid QR code format: ${reason}`);
  }

  /**
   * Create error for invalid base64 encoding
   */
  static invalidBase64(details?: unknown): QRParseError {
    return new QRParseError('Failed to decode base64 data', details);
  }

  /**
   * Create error for invalid JSON structure
   */
  static invalidJSON(details?: unknown): QRParseError {
    return new QRParseError('Failed to parse JSON data', details);
  }

  /**
   * Create error for missing required fields
   */
  static missingFields(fields: string[]): QRParseError {
    return new QRParseError(`Missing required fields: ${fields.join(', ')}`);
  }
}

/**
 * Error thrown when QR code validation fails
 */
export class QRValidationError extends AuraVerifierError {
  constructor(
    message: string,
    public readonly field?: string,
    details?: unknown
  ) {
    super(message, ERROR_CODES.QR_VALIDATION_ERROR, details);
    this.name = 'QRValidationError';
    Object.setPrototypeOf(this, QRValidationError.prototype);
  }

  /**
   * Create error for invalid field value
   */
  static invalidField(field: string, reason: string): QRValidationError {
    return new QRValidationError(`Invalid ${field}: ${reason}`, field);
  }

  /**
   * Create error for unsupported protocol version
   */
  static unsupportedVersion(version: string, supported: string[]): QRValidationError {
    return new QRValidationError(
      `Unsupported protocol version "${version}". Supported versions: ${supported.join(', ')}`,
      'v'
    );
  }
}

/**
 * Error thrown when QR code has expired
 */
export class QRExpiredError extends AuraVerifierError {
  constructor(
    public readonly expirationTime: number,
    public readonly currentTime: number
  ) {
    const expDate = new Date(expirationTime * 1000).toISOString();
    const currDate = new Date(currentTime * 1000).toISOString();
    super(`QR code expired at ${expDate} (current time: ${currDate})`, ERROR_CODES.QR_EXPIRED, {
      expirationTime,
      currentTime,
    });
    this.name = 'QRExpiredError';
    Object.setPrototypeOf(this, QRExpiredError.prototype);
  }

  /**
   * Get time elapsed since expiration (in seconds)
   */
  get timeSinceExpiration(): number {
    return this.currentTime - this.expirationTime;
  }

  /**
   * Check if error is within tolerance window
   */
  isWithinTolerance(toleranceSeconds: number): boolean {
    return this.timeSinceExpiration <= toleranceSeconds;
  }
}

/**
 * Error thrown when QR code nonce is invalid or reused
 */
export class QRNonceError extends AuraVerifierError {
  constructor(
    message: string,
    public readonly nonce?: number
  ) {
    super(message, ERROR_CODES.NONCE_REPLAY, { nonce });
    this.name = 'QRNonceError';
    Object.setPrototypeOf(this, QRNonceError.prototype);
  }

  /**
   * Create error for invalid nonce value
   */
  static invalidNonce(nonce: unknown): QRNonceError {
    return new QRNonceError(
      `Invalid nonce value: ${nonce}`,
      typeof nonce === 'number' ? nonce : undefined
    );
  }

  /**
   * Create error for reused nonce (replay attack)
   */
  static reusedNonce(nonce: number): QRNonceError {
    return new QRNonceError(`Nonce ${nonce} has already been used (replay attack detected)`, nonce);
  }
}

// ============================================================================
// Cryptographic Errors
// ============================================================================

/**
 * Error thrown when signature verification fails
 */
export class SignatureError extends AuraVerifierError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.INVALID_SIGNATURE, details);
    this.name = 'SignatureError';
    Object.setPrototypeOf(this, SignatureError.prototype);
  }

  /**
   * Create error for signature verification failure
   */
  static verificationFailed(reason?: string): SignatureError {
    const message = reason
      ? `Signature verification failed: ${reason}`
      : 'Signature verification failed';
    return new SignatureError(message);
  }

  /**
   * Create error for invalid signature format
   */
  static invalidFormat(reason: string): SignatureError {
    return new SignatureError(`Invalid signature format: ${reason}`);
  }

  /**
   * Create error for unsupported algorithm
   */
  static unsupportedAlgorithm(algorithm: string): SignatureError {
    return new SignatureError(`Unsupported signature algorithm: ${algorithm}`, { algorithm });
  }
}

/**
 * Error thrown when public key is invalid
 */
export class PublicKeyError extends AuraVerifierError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.INVALID_PUBLIC_KEY, details);
    this.name = 'PublicKeyError';
    Object.setPrototypeOf(this, PublicKeyError.prototype);
  }

  /**
   * Create error for invalid public key format
   */
  static invalidFormat(reason: string): PublicKeyError {
    return new PublicKeyError(`Invalid public key format: ${reason}`);
  }
}

// ============================================================================
// Network Errors
// ============================================================================

/**
 * Base error class for all network-related errors
 */
export class NetworkError extends AuraVerifierError {
  constructor(
    message: string,
    code: string,
    public readonly statusCode?: number,
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  /**
   * Create error from HTTP response
   */
  static fromResponse(statusCode: number, statusText: string, body?: unknown): NetworkError {
    const message = `HTTP ${statusCode}: ${statusText}`;
    return new NetworkError(message, ERROR_CODES.NETWORK_ERROR, statusCode, body);
  }

  /**
   * Create error for network connection failure
   */
  static connectionFailed(reason: string, details?: unknown): NetworkError {
    return new NetworkError(
      `Network connection failed: ${reason}`,
      ERROR_CODES.NETWORK_ERROR,
      undefined,
      details
    );
  }

  /**
   * Create error for invalid response format
   */
  static invalidResponse(reason: string, details?: unknown): NetworkError {
    return new NetworkError(
      `Invalid response format: ${reason}`,
      ERROR_CODES.INVALID_RESPONSE,
      undefined,
      details
    );
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends NetworkError {
  constructor(
    public readonly timeoutMs: number,
    public readonly operation: string
  ) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`, ERROR_CODES.TIMEOUT, 408, {
      timeoutMs,
      operation,
    });
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when Aura node is unavailable or unreachable
 */
export class NodeUnavailableError extends NetworkError {
  constructor(
    public readonly endpoint: string,
    public readonly attemptedEndpoints: string[] = [],
    details?: unknown
  ) {
    const endpointList =
      attemptedEndpoints.length > 0 ? ` (tried: ${attemptedEndpoints.join(', ')})` : '';
    super(
      `Aura node unavailable at ${endpoint}${endpointList}`,
      ERROR_CODES.NODE_UNAVAILABLE,
      503,
      details
    );
    this.name = 'NodeUnavailableError';
    Object.setPrototypeOf(this, NodeUnavailableError.prototype);
  }
}

/**
 * Error thrown when API returns an error response
 */
export class APIError extends NetworkError {
  constructor(
    message: string,
    public readonly endpoint: string,
    statusCode?: number,
    public readonly errorCode?: string,
    details?: unknown
  ) {
    super(message, ERROR_CODES.API_ERROR, statusCode, details);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * Create error from Aura API error response
   */
  static fromAuraResponse(
    endpoint: string,
    statusCode: number,
    response: { code?: number; message?: string; details?: unknown }
  ): APIError {
    const message = response.message || `API error at ${endpoint}`;
    const errorCode = response.code?.toString();
    return new APIError(message, endpoint, statusCode, errorCode, response.details);
  }
}

/**
 * Error thrown when retry attempts are exhausted
 */
export class RetryExhaustedError extends NetworkError {
  constructor(
    public readonly operation: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(
      `Retry exhausted for "${operation}" after ${attempts} attempts. Last error: ${lastError.message}`,
      ERROR_CODES.NETWORK_ERROR,
      undefined,
      { operation, attempts, lastError }
    );
    this.name = 'RetryExhaustedError';
    Object.setPrototypeOf(this, RetryExhaustedError.prototype);
  }
}

// ============================================================================
// Credential Errors
// ============================================================================

/**
 * Error thrown when credential has been revoked
 */
export class CredentialRevokedError extends AuraVerifierError {
  constructor(
    public readonly vcId: string,
    public readonly revokedAt?: Date
  ) {
    const dateInfo = revokedAt ? ` at ${revokedAt.toISOString()}` : '';
    super(`Credential ${vcId} has been revoked${dateInfo}`, ERROR_CODES.CREDENTIAL_REVOKED, {
      vcId,
      revokedAt,
    });
    this.name = 'CredentialRevokedError';
    Object.setPrototypeOf(this, CredentialRevokedError.prototype);
  }
}

/**
 * Error thrown when credential has expired
 */
export class CredentialExpiredError extends AuraVerifierError {
  constructor(
    public readonly vcId: string,
    public readonly expirationDate: Date
  ) {
    super(
      `Credential ${vcId} expired at ${expirationDate.toISOString()}`,
      ERROR_CODES.CREDENTIAL_EXPIRED,
      { vcId, expirationDate }
    );
    this.name = 'CredentialExpiredError';
    Object.setPrototypeOf(this, CredentialExpiredError.prototype);
  }
}

/**
 * Error thrown when credential is not found on blockchain
 */
export class CredentialNotFoundError extends AuraVerifierError {
  constructor(public readonly vcId: string) {
    super(`Credential ${vcId} not found on blockchain`, ERROR_CODES.CREDENTIAL_NOT_FOUND, { vcId });
    this.name = 'CredentialNotFoundError';
    Object.setPrototypeOf(this, CredentialNotFoundError.prototype);
  }
}

/**
 * Error thrown when credential is suspended
 */
export class CredentialSuspendedError extends AuraVerifierError {
  constructor(
    public readonly vcId: string,
    public readonly suspendedAt?: Date
  ) {
    const dateInfo = suspendedAt ? ` at ${suspendedAt.toISOString()}` : '';
    super(`Credential ${vcId} is suspended${dateInfo}`, ERROR_CODES.CREDENTIAL_SUSPENDED, {
      vcId,
      suspendedAt,
    });
    this.name = 'CredentialSuspendedError';
    Object.setPrototypeOf(this, CredentialSuspendedError.prototype);
  }
}

/**
 * Error thrown when credential is in pending status
 */
export class CredentialPendingError extends AuraVerifierError {
  constructor(public readonly vcId: string) {
    super(`Credential ${vcId} is still pending activation`, ERROR_CODES.CREDENTIAL_PENDING, {
      vcId,
    });
    this.name = 'CredentialPendingError';
    Object.setPrototypeOf(this, CredentialPendingError.prototype);
  }
}

// ============================================================================
// DID Errors
// ============================================================================

/**
 * Error thrown when DID resolution fails
 */
export class DIDResolutionError extends AuraVerifierError {
  constructor(
    public readonly did: string,
    public readonly reason?: string,
    details?: unknown
  ) {
    const reasonText = reason ? `: ${reason}` : '';
    super(`Failed to resolve DID ${did}${reasonText}`, ERROR_CODES.DID_RESOLUTION_FAILED, details);
    this.name = 'DIDResolutionError';
    Object.setPrototypeOf(this, DIDResolutionError.prototype);
  }
}

/**
 * Error thrown when DID format is invalid
 */
export class InvalidDIDError extends AuraVerifierError {
  constructor(
    public readonly did: string,
    public readonly reason?: string
  ) {
    const reasonText = reason ? `: ${reason}` : '';
    super(`Invalid DID format: ${did}${reasonText}`, ERROR_CODES.INVALID_DID_FORMAT, { did });
    this.name = 'InvalidDIDError';
    Object.setPrototypeOf(this, InvalidDIDError.prototype);
  }
}

/**
 * Error thrown when DID document is not found
 */
export class DIDNotFoundError extends AuraVerifierError {
  constructor(public readonly did: string) {
    super(`DID document not found: ${did}`, ERROR_CODES.DID_NOT_FOUND, { did });
    this.name = 'DIDNotFoundError';
    Object.setPrototypeOf(this, DIDNotFoundError.prototype);
  }
}

// ============================================================================
// Verification Errors
// ============================================================================

/**
 * Error thrown when verification fails
 */
export class VerificationError extends AuraVerifierError {
  constructor(
    message: string,
    public readonly reason: string,
    details?: unknown
  ) {
    super(message, ERROR_CODES.PRESENTATION_VERIFICATION_FAILED, details);
    this.name = 'VerificationError';
    Object.setPrototypeOf(this, VerificationError.prototype);
  }

  /**
   * Create error for invalid presentation
   */
  static invalidPresentation(reason: string, details?: unknown): VerificationError {
    return new VerificationError(
      `Invalid presentation: ${reason}`,
      'INVALID_PRESENTATION',
      details
    );
  }

  /**
   * Create error for missing required credential type
   */
  static requiredVCMissing(vcType: string): VerificationError {
    return new VerificationError(
      `Required credential type missing: ${vcType}`,
      'REQUIRED_VC_MISSING',
      { vcType }
    );
  }

  /**
   * Create error for missing required disclosure
   */
  static requiredDisclosureMissing(disclosure: string): VerificationError {
    return new VerificationError(
      `Required disclosure missing: ${disclosure}`,
      'REQUIRED_DISCLOSURE_MISSING',
      { disclosure }
    );
  }
}

// ============================================================================
// Cache Errors
// ============================================================================

/**
 * Error thrown when cache operations fail
 */
export class CacheError extends AuraVerifierError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.CACHE_ERROR, details);
    this.name = 'CacheError';
    Object.setPrototypeOf(this, CacheError.prototype);
  }

  /**
   * Create error for cache read failure
   */
  static readFailed(key: string, reason?: string): CacheError {
    const reasonText = reason ? `: ${reason}` : '';
    return new CacheError(`Failed to read cache key "${key}"${reasonText}`);
  }

  /**
   * Create error for cache write failure
   */
  static writeFailed(key: string, reason?: string): CacheError {
    const reasonText = reason ? `: ${reason}` : '';
    return new CacheError(`Failed to write cache key "${key}"${reasonText}`);
  }
}

/**
 * Error thrown when cache synchronization fails
 */
export class SyncError extends AuraVerifierError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.SYNC_ERROR, details);
    this.name = 'SyncError';
    Object.setPrototypeOf(this, SyncError.prototype);
  }
}

/**
 * Error thrown when offline mode is unavailable
 */
export class OfflineModeUnavailableError extends AuraVerifierError {
  constructor(public readonly reason: string) {
    super(`Offline mode unavailable: ${reason}`, ERROR_CODES.OFFLINE_MODE_UNAVAILABLE, { reason });
    this.name = 'OfflineModeUnavailableError';
    Object.setPrototypeOf(this, OfflineModeUnavailableError.prototype);
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends AuraVerifierError {
  constructor(
    message: string,
    public readonly field?: string,
    details?: unknown
  ) {
    super(message, ERROR_CODES.INVALID_CONFIGURATION, details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }

  /**
   * Create error for missing required configuration
   */
  static missingRequired(field: string): ConfigurationError {
    return new ConfigurationError(`Missing required configuration: ${field}`, field);
  }

  /**
   * Create error for invalid configuration value
   */
  static invalidValue(field: string, reason: string): ConfigurationError {
    return new ConfigurationError(`Invalid configuration for ${field}: ${reason}`, field);
  }
}

// ============================================================================
// Encoding Errors
// ============================================================================

/**
 * Error thrown when encoding/decoding fails
 */
export class EncodingError extends AuraVerifierError {
  constructor(message: string, details?: unknown) {
    super(message, 'ENCODING_ERROR', details);
    this.name = 'EncodingError';
    Object.setPrototypeOf(this, EncodingError.prototype);
  }
}

// ============================================================================
// Legacy Error Classes (for backwards compatibility)
// ============================================================================

/**
 * Error thrown when configuration is invalid
 */
export class InvalidConfigError extends ConfigurationError {
  constructor(message: string, details?: unknown) {
    super(message, undefined, details);
    this.name = 'InvalidConfigError';
    Object.setPrototypeOf(this, InvalidConfigError.prototype);
  }
}

/**
 * Error thrown when RPC connection fails
 */
export class RpcConnectionError extends NetworkError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.NETWORK_ERROR, undefined, details);
    this.name = 'RpcConnectionError';
    Object.setPrototypeOf(this, RpcConnectionError.prototype);
  }
}

/**
 * Error thrown when transaction verification fails
 */
export class TransactionVerificationError extends VerificationError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRANSACTION_VERIFICATION_FAILED', details);
    this.name = 'TransactionVerificationError';
    Object.setPrototypeOf(this, TransactionVerificationError.prototype);
  }
}

// ============================================================================
// Export all error classes
// ============================================================================

/**
 * Check if an error is an Aura Verifier SDK error
 */
export function isAuraVerifierError(error: unknown): error is AuraVerifierError {
  return error instanceof AuraVerifierError;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isAuraVerifierError(error)) {
    return error.code;
  }
  return ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Convert any error to AuraVerifierError
 */
export function toAuraVerifierError(error: unknown): AuraVerifierError {
  if (isAuraVerifierError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AuraVerifierError(error.message, ERROR_CODES.UNKNOWN_ERROR, {
      originalError: error,
    });
  }

  return new AuraVerifierError(String(error), ERROR_CODES.UNKNOWN_ERROR, { originalError: error });
}
