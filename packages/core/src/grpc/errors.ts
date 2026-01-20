/**
 * Network Error Classes for Aura gRPC/REST Client
 *
 * Provides specific error types for different network and API failure scenarios.
 */

/**
 * Base error class for all network-related errors
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  /**
   * Create error from HTTP response
   */
  static fromResponse(statusCode: number, statusText: string, body?: unknown): NetworkError {
    const message = `HTTP ${statusCode}: ${statusText}`;
    return new NetworkError(message, 'HTTP_ERROR', statusCode, body);
  }

  /**
   * Create error for network connection failure
   */
  static connectionFailed(reason: string, details?: unknown): NetworkError {
    return new NetworkError(
      `Network connection failed: ${reason}`,
      'CONNECTION_FAILED',
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
      'INVALID_RESPONSE',
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
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`, 'TIMEOUT', 408);
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
    super(`Aura node unavailable at ${endpoint}${endpointList}`, 'NODE_UNAVAILABLE', 503, details);
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
    super(message, 'API_ERROR', statusCode, details);
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
 * Error thrown when verification fails
 */
export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
    public readonly details?: unknown
  ) {
    super(message);
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
   * Create error for revoked credential
   */
  static revokedCredential(vcId: string): VerificationError {
    return new VerificationError(`Credential ${vcId} has been revoked`, 'CREDENTIAL_REVOKED', {
      vcId,
    });
  }

  /**
   * Create error for expired credential
   */
  static expiredCredential(vcId: string, expirationDate: Date): VerificationError {
    return new VerificationError(
      `Credential ${vcId} expired at ${expirationDate.toISOString()}`,
      'CREDENTIAL_EXPIRED',
      { vcId, expirationDate }
    );
  }

  /**
   * Create error for signature verification failure
   */
  static signatureVerificationFailed(reason: string): VerificationError {
    return new VerificationError(
      `Signature verification failed: ${reason}`,
      'SIGNATURE_VERIFICATION_FAILED'
    );
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
      'RETRY_EXHAUSTED',
      undefined,
      { lastError }
    );
    this.name = 'RetryExhaustedError';
    Object.setPrototypeOf(this, RetryExhaustedError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
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
