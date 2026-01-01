/**
 * QR Code Types for Aura Verifier SDK
 *
 * Defines the structure of QR codes used in Aura verification protocol.
 * Format: aura://verify?data=<base64_encoded_json>
 */

/**
 * Disclosure context specifying which credential attributes to reveal
 */
export interface DisclosureContext {
  /** Show full name from credential */
  show_full_name?: boolean;
  /** Show age from credential */
  show_age?: boolean;
  /** Show proof that holder is over 18 */
  show_age_over_18?: boolean;
  /** Show proof that holder is over 21 */
  show_age_over_21?: boolean;
  /** Show city and state from address */
  show_city_state?: boolean;
  /** Show full address from credential */
  show_full_address?: boolean;
  /** Additional custom disclosure fields */
  [key: string]: boolean | undefined;
}

/**
 * Main QR code data structure
 */
export interface QRCodeData {
  /** Protocol version (e.g., "1.0") */
  v: string;
  /** Unique presentation request ID */
  p: string;
  /** Holder's Decentralized Identifier (DID) */
  h: string;
  /** Array of Verifiable Credential IDs to present */
  vcs: string[];
  /** Context specifying which attributes to disclose */
  ctx: DisclosureContext;
  /** Expiration timestamp (Unix time in seconds) */
  exp: number;
  /** Cryptographic nonce for replay protection */
  n: number;
  /** Holder's signature over the presentation (hex-encoded) */
  sig: string;
}

/**
 * Result of QR code parsing operation
 */
export interface ParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed QR code data (if successful) */
  data?: QRCodeData;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message describing the validation failure */
  message: string;
  /** Severity level of the error */
  severity: 'error' | 'warning';
}

/**
 * Result of QR code data validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: ValidationError[];
  /** List of validation warnings */
  warnings: ValidationError[];
}

/**
 * Configuration options for QR code parsing
 */
export interface QRParserOptions {
  /** Whether to perform strict validation (default: true) */
  strict?: boolean;
  /** Custom expiration tolerance in seconds (default: 0) */
  expirationTolerance?: number;
  /** Supported protocol versions (default: ["1.0"]) */
  supportedVersions?: string[];
}

/**
 * Nonce validator interface for replay attack prevention
 * Security: Implement this to track and reject reused nonces
 */
export interface NonceValidator {
  /**
   * Check if nonce has been used and mark it as used
   * @param nonce - The nonce value to check
   * @param presentationId - The presentation ID (for context)
   * @param expiresAt - When this nonce should expire (Unix timestamp in seconds)
   * @returns Promise resolving to true if nonce is valid (not previously used)
   */
  validateAndMark(nonce: number, presentationId: string, expiresAt: number): Promise<boolean>;
}

/**
 * Configuration options for QR code validation
 */
export interface QRValidatorOptions {
  /** Whether to check expiration (default: true) */
  checkExpiration?: boolean;
  /** Custom expiration tolerance in seconds (default: 0) */
  expirationTolerance?: number;
  /** Whether to validate DID format (default: true) */
  validateDID?: boolean;
  /** Whether to validate signature format (default: true) */
  validateSignature?: boolean;
  /** Supported protocol versions (default: ["1.0"]) */
  supportedVersions?: string[];
  /**
   * Nonce validator for replay attack prevention
   * Security: When provided, nonces will be checked and marked as used
   */
  nonceValidator?: NonceValidator;
}
