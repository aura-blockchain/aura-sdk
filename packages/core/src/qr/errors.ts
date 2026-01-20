/**
 * Custom Error Classes for QR Code Processing
 *
 * Provides specific error types for different QR code failure scenarios.
 */

/**
 * Base error class for all QR code related errors
 */
export class QRCodeError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'QRCodeError';
    Object.setPrototypeOf(this, QRCodeError.prototype);
  }
}

/**
 * Error thrown when QR code parsing fails
 */
export class QRParseError extends QRCodeError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message, 'QR_PARSE_ERROR');
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
export class QRValidationError extends QRCodeError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: unknown
  ) {
    super(message, 'QR_VALIDATION_ERROR');
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

  /**
   * Create error for invalid DID format
   */
  static invalidDID(did: string, reason?: string): QRValidationError {
    const message = reason ? `Invalid DID format: ${reason}` : `Invalid DID format: ${did}`;
    return new QRValidationError(message, 'h');
  }

  /**
   * Create error for invalid signature format
   */
  static invalidSignature(reason: string): QRValidationError {
    return new QRValidationError(`Invalid signature format: ${reason}`, 'sig');
  }

  /**
   * Create error for invalid array field
   */
  static invalidArray(field: string, reason: string): QRValidationError {
    return new QRValidationError(`Invalid ${field} array: ${reason}`, field);
  }
}

/**
 * Error thrown when QR code has expired
 */
export class QRExpiredError extends QRCodeError {
  constructor(
    public readonly expirationTime: number,
    public readonly currentTime: number
  ) {
    const expDate = new Date(expirationTime * 1000).toISOString();
    const currDate = new Date(currentTime * 1000).toISOString();
    super(`QR code expired at ${expDate} (current time: ${currDate})`, 'QR_EXPIRED');
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
export class QRNonceError extends QRCodeError {
  constructor(
    message: string,
    public readonly nonce?: number
  ) {
    super(message, 'QR_NONCE_ERROR');
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
   * Create error for reused nonce
   */
  static reusedNonce(nonce: number): QRNonceError {
    return new QRNonceError(`Nonce ${nonce} has already been used (replay attack detected)`, nonce);
  }
}
