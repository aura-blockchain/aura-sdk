/**
 * QR Code Validator
 *
 * Validates parsed QR code data for security and correctness.
 * Performs semantic validation beyond basic structure checks.
 */

import type {
  QRCodeData,
  ValidationResult,
  ValidationError,
  QRValidatorOptions,
} from './types.js';
import { QRValidationError, QRExpiredError, QRNonceError } from './errors.js';

/**
 * Default validator options (without nonceValidator which is optional)
 */
const DEFAULT_OPTIONS = {
  checkExpiration: true,
  expirationTolerance: 0,
  validateDID: true,
  validateSignature: true,
  supportedVersions: ['1.0'],
} as const;

/**
 * Type for merged options with defaults
 */
type MergedOptions = typeof DEFAULT_OPTIONS & { nonceValidator?: QRValidatorOptions['nonceValidator'] };

/**
 * Validate QR code data
 *
 * @param data - Parsed QR code data
 * @param options - Validator configuration options
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateQRCodeData(qrData);
 * if (result.valid) {
 *   console.log('QR code is valid');
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
/**
 * Alias for validateQRCodeData for convenience
 */
export const validateQRCode = (
  data: QRCodeData,
  options?: QRValidatorOptions
): ValidationResult => validateQRCodeData(data, options);

export function validateQRCodeData(
  data: QRCodeData,
  options?: QRValidatorOptions
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate protocol version
  validateVersion(data, opts, errors);

  // Validate presentation ID
  validatePresentationID(data, errors);

  // Validate holder DID
  if (opts.validateDID) {
    validateHolderDID(data, errors);
  }

  // Validate VC IDs array
  validateVCIDs(data, errors, warnings);

  // Validate disclosure context
  validateDisclosureContext(data, errors, warnings);

  // Validate expiration
  if (opts.checkExpiration) {
    validateExpiration(data, opts, errors);
  }

  // Validate nonce
  validateNonce(data, errors);

  // Validate signature
  if (opts.validateSignature) {
    validateSignatureFormat(data, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate QR code data with async nonce validation
 *
 * @param data - Parsed QR code data
 * @param options - Validator configuration options (including nonceValidator)
 * @returns Promise resolving to validation result with errors and warnings
 *
 * @example
 * ```typescript
 * import { NonceManager, NonceValidatorAdapter } from '../security/nonce-manager.js';
 *
 * const nonceManager = new NonceManager({ nonceWindow: 300000 });
 * const nonceValidator = new NonceValidatorAdapter(nonceManager);
 *
 * const result = await validateQRCodeDataAsync(qrData, { nonceValidator });
 * if (result.valid) {
 *   console.log('QR code is valid and nonce has been marked as used');
 * }
 * ```
 */
export async function validateQRCodeDataAsync(
  data: QRCodeData,
  options?: QRValidatorOptions
): Promise<ValidationResult> {
  // First run synchronous validation
  const syncResult = validateQRCodeData(data, options);

  // If sync validation failed, return early
  if (!syncResult.valid) {
    return syncResult;
  }

  // If no nonce validator provided, return sync result
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!opts.nonceValidator) {
    return syncResult;
  }

  // Perform async nonce validation
  const errors = [...syncResult.errors];

  try {
    const isNonceValid = await opts.nonceValidator.validateAndMark(
      data.n,
      data.p,
      data.exp
    );

    if (!isNonceValid) {
      errors.push({
        field: 'n',
        message: 'Nonce validation failed (possibly reused or expired)',
        severity: 'error',
      });
    }
  } catch (error) {
    // Security: Don't expose internal error details
    errors.push({
      field: 'n',
      message: 'Nonce validation failed',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: syncResult.warnings,
  };
}

/**
 * Alias for validateQRCodeDataAsync for convenience
 */
export const validateQRCodeAsync = (
  data: QRCodeData,
  options?: QRValidatorOptions
): Promise<ValidationResult> => validateQRCodeDataAsync(data, options);

/**
 * Validate QR code data and throw on error
 *
 * @param data - Parsed QR code data
 * @param options - Validator configuration options
 * @throws {QRValidationError} If validation fails
 * @throws {QRExpiredError} If QR code is expired
 *
 * @example
 * ```typescript
 * try {
 *   validateQRCodeDataStrict(qrData);
 *   console.log('QR code is valid');
 * } catch (error) {
 *   if (error instanceof QRExpiredError) {
 *     console.error('QR code expired');
 *   } else {
 *     console.error('Validation error:', error.message);
 *   }
 * }
 * ```
 */
export function validateQRCodeDataStrict(
  data: QRCodeData,
  options?: QRValidatorOptions
): void {
  const result = validateQRCodeData(data, options);
  throwOnValidationError(data, result);
}

/**
 * Validate QR code data with async nonce validation and throw on error
 *
 * @param data - Parsed QR code data
 * @param options - Validator configuration options (including nonceValidator)
 * @throws {QRValidationError} If validation fails
 * @throws {QRExpiredError} If QR code is expired
 * @throws {QRNonceError} If nonce validation fails
 *
 * @example
 * ```typescript
 * import { NonceManager, NonceValidatorAdapter } from '../security/nonce-manager.js';
 *
 * const nonceManager = new NonceManager({ nonceWindow: 300000 });
 * const nonceValidator = new NonceValidatorAdapter(nonceManager);
 *
 * try {
 *   await validateQRCodeDataStrictAsync(qrData, { nonceValidator });
 *   console.log('QR code is valid');
 * } catch (error) {
 *   if (error instanceof QRNonceError) {
 *     console.error('Nonce validation failed - possible replay attack');
 *   }
 * }
 * ```
 */
export async function validateQRCodeDataStrictAsync(
  data: QRCodeData,
  options?: QRValidatorOptions
): Promise<void> {
  const result = await validateQRCodeDataAsync(data, options);
  throwOnValidationError(data, result);
}

/**
 * Helper to throw appropriate error from validation result
 */
function throwOnValidationError(data: QRCodeData, result: ValidationResult): void {
  if (!result.valid) {
    const firstError = result.errors[0];

    // Only throw QRExpiredError if the error message contains 'expired' (actual expiration)
    if (firstError.field === 'exp' && firstError.message.toLowerCase().includes('expired')) {
      // Throw specific expiration error
      const now = Math.floor(Date.now() / 1000);
      throw new QRExpiredError(data.exp, now);
    }

    // Throw QRNonceError for nonce-related errors
    if (firstError.field === 'n' && firstError.message.toLowerCase().includes('nonce')) {
      throw new QRNonceError(firstError.message, data.n);
    }

    throw new QRValidationError(
      firstError.message,
      firstError.field
    );
  }
}

/**
 * Validate protocol version
 */
function validateVersion(
  data: QRCodeData,
  options: { supportedVersions: readonly string[] },
  errors: ValidationError[]
): void {
  if (!data.v || typeof data.v !== 'string') {
    errors.push({
      field: 'v',
      message: 'Protocol version must be a non-empty string',
      severity: 'error',
    });
    return;
  }

  if (!options.supportedVersions.includes(data.v)) {
    errors.push({
      field: 'v',
      message: `Unsupported protocol version "${data.v}". Supported versions: ${options.supportedVersions.join(', ')}`,
      severity: 'error',
    });
  }
}

/**
 * Validate presentation ID
 */
function validatePresentationID(
  data: QRCodeData,
  errors: ValidationError[]
): void {
  if (!data.p || typeof data.p !== 'string') {
    errors.push({
      field: 'p',
      message: 'Presentation ID must be a non-empty string',
      severity: 'error',
    });
    return;
  }

  if (data.p.trim().length === 0) {
    errors.push({
      field: 'p',
      message: 'Presentation ID cannot be empty or whitespace',
      severity: 'error',
    });
    return;
  }

  // Check reasonable length
  if (data.p.length > 256) {
    errors.push({
      field: 'p',
      message: 'Presentation ID exceeds maximum length (256 characters)',
      severity: 'error',
    });
  }
}

/**
 * Validate holder DID format
 */
function validateHolderDID(
  data: QRCodeData,
  errors: ValidationError[]
): void {
  if (!data.h || typeof data.h !== 'string') {
    errors.push({
      field: 'h',
      message: 'Holder DID must be a non-empty string',
      severity: 'error',
    });
    return;
  }

  const did = data.h.trim();

  if (did.length === 0) {
    errors.push({
      field: 'h',
      message: 'Holder DID cannot be empty or whitespace',
      severity: 'error',
    });
    return;
  }

  // Validate DID format: did:aura:network:identifier
  if (!did.startsWith('did:aura:')) {
    errors.push({
      field: 'h',
      message: 'Holder DID must start with "did:aura:"',
      severity: 'error',
    });
    return;
  }

  // Split DID into components
  const parts = did.split(':');
  if (parts.length < 4) {
    errors.push({
      field: 'h',
      message: 'Holder DID must have format: did:aura:network:identifier',
      severity: 'error',
    });
    return;
  }

  const [method, didMethod, network, ...identifierParts] = parts;

  if (method !== 'did') {
    errors.push({
      field: 'h',
      message: 'DID must start with "did:"',
      severity: 'error',
    });
  }

  if (didMethod !== 'aura') {
    errors.push({
      field: 'h',
      message: 'DID method must be "aura"',
      severity: 'error',
    });
  }

  if (!network || network.length === 0) {
    errors.push({
      field: 'h',
      message: 'DID network cannot be empty',
      severity: 'error',
    });
  }

  const identifier = identifierParts.join(':');
  if (!identifier || identifier.length === 0) {
    errors.push({
      field: 'h',
      message: 'DID identifier cannot be empty',
      severity: 'error',
    });
  }

  // Validate identifier contains only valid characters
  if (identifier && !/^[a-zA-Z0-9._-]+$/.test(identifier)) {
    errors.push({
      field: 'h',
      message: 'DID identifier contains invalid characters (only alphanumeric, dots, underscores, and hyphens allowed)',
      severity: 'error',
    });
  }
}

/**
 * Validate VC IDs array
 */
function validateVCIDs(
  data: QRCodeData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!Array.isArray(data.vcs)) {
    errors.push({
      field: 'vcs',
      message: 'VC IDs must be an array',
      severity: 'error',
    });
    return;
  }

  if (data.vcs.length === 0) {
    errors.push({
      field: 'vcs',
      message: 'VC IDs array cannot be empty',
      severity: 'error',
    });
    return;
  }

  // Check each VC ID
  for (let i = 0; i < data.vcs.length; i++) {
    const vcId = data.vcs[i];

    if (typeof vcId !== 'string') {
      errors.push({
        field: `vcs[${i}]`,
        message: `VC ID at index ${i} must be a string`,
        severity: 'error',
      });
      continue;
    }

    if (vcId.trim().length === 0) {
      errors.push({
        field: `vcs[${i}]`,
        message: `VC ID at index ${i} cannot be empty or whitespace`,
        severity: 'error',
      });
    }
  }

  // Check for duplicates
  const uniqueVCs = new Set(data.vcs);
  if (uniqueVCs.size !== data.vcs.length) {
    warnings.push({
      field: 'vcs',
      message: 'VC IDs array contains duplicate entries',
      severity: 'warning',
    });
  }

  // Warn if too many VCs
  if (data.vcs.length > 10) {
    warnings.push({
      field: 'vcs',
      message: `Large number of VCs (${data.vcs.length}). This may impact performance.`,
      severity: 'warning',
    });
  }
}

/**
 * Validate disclosure context
 */
function validateDisclosureContext(
  data: QRCodeData,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!data.ctx || typeof data.ctx !== 'object') {
    errors.push({
      field: 'ctx',
      message: 'Disclosure context must be an object',
      severity: 'error',
    });
    return;
  }

  if (Array.isArray(data.ctx)) {
    errors.push({
      field: 'ctx',
      message: 'Disclosure context must be an object, not an array',
      severity: 'error',
    });
    return;
  }

  // Validate each field is boolean or undefined
  for (const [key, value] of Object.entries(data.ctx)) {
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push({
        field: `ctx.${key}`,
        message: `Disclosure context field "${key}" must be boolean or undefined, got ${typeof value}`,
        severity: 'error',
      });
    }
  }

  // Check if at least one disclosure field is set to true
  const hasAnyDisclosure = Object.values(data.ctx).some((value) => value === true);
  if (!hasAnyDisclosure) {
    warnings.push({
      field: 'ctx',
      message: 'No disclosure fields are enabled. Presentation may be empty.',
      severity: 'warning',
    });
  }
}

/**
 * Validate expiration timestamp
 */
function validateExpiration(
  data: QRCodeData,
  options: { expirationTolerance: number },
  errors: ValidationError[]
): void {
  if (typeof data.exp !== 'number') {
    errors.push({
      field: 'exp',
      message: 'Expiration must be a number',
      severity: 'error',
    });
    return;
  }

  if (!Number.isFinite(data.exp)) {
    errors.push({
      field: 'exp',
      message: 'Expiration must be a finite number',
      severity: 'error',
    });
    return;
  }

  if (data.exp <= 0) {
    errors.push({
      field: 'exp',
      message: 'Expiration must be a positive timestamp',
      severity: 'error',
    });
    return;
  }

  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  const isExpired = data.exp < now - options.expirationTolerance;

  if (isExpired) {
    const expDate = new Date(data.exp * 1000).toISOString();
    const tolerance = options.expirationTolerance > 0
      ? ` (tolerance: ${options.expirationTolerance}s)`
      : '';
    errors.push({
      field: 'exp',
      message: `QR code expired at ${expDate}${tolerance}`,
      severity: 'error',
    });
  }

  // Check if expiration is too far in the future (max 10 years)
  const MAX_EXPIRATION_YEARS = 10;
  const maxExpiration = now + MAX_EXPIRATION_YEARS * 365 * 24 * 60 * 60;
  if (data.exp > maxExpiration) {
    errors.push({
      field: 'exp',
      message: `Expiration too far in the future. Maximum is ${MAX_EXPIRATION_YEARS} years from now.`,
      severity: 'error',
    });
  }
}

/**
 * Validate nonce value
 */
function validateNonce(
  data: QRCodeData,
  errors: ValidationError[]
): void {
  if (typeof data.n !== 'number') {
    errors.push({
      field: 'n',
      message: 'Nonce must be a number',
      severity: 'error',
    });
    return;
  }

  if (!Number.isFinite(data.n)) {
    errors.push({
      field: 'n',
      message: 'Nonce must be a finite number',
      severity: 'error',
    });
    return;
  }

  if (!Number.isInteger(data.n)) {
    errors.push({
      field: 'n',
      message: 'Nonce must be an integer',
      severity: 'error',
    });
    return;
  }

  if (data.n < 0) {
    errors.push({
      field: 'n',
      message: 'Nonce must be non-negative',
      severity: 'error',
    });
    return;
  }

  // Check if nonce is within uint64 range (0 to 2^64 - 1)
  const MAX_UINT64 = Math.pow(2, 64) - 1;
  if (data.n > MAX_UINT64) {
    errors.push({
      field: 'n',
      message: `Nonce exceeds uint64 maximum value (${MAX_UINT64})`,
      severity: 'error',
    });
  }
}

/**
 * Validate signature format
 */
function validateSignatureFormat(
  data: QRCodeData,
  errors: ValidationError[]
): void {
  if (!data.sig || typeof data.sig !== 'string') {
    errors.push({
      field: 'sig',
      message: 'Signature must be a non-empty string',
      severity: 'error',
    });
    return;
  }

  if (data.sig.trim().length === 0) {
    errors.push({
      field: 'sig',
      message: 'Signature cannot be empty or whitespace',
      severity: 'error',
    });
    return;
  }

  // Validate hex encoding
  if (!/^[0-9a-fA-F]+$/.test(data.sig)) {
    errors.push({
      field: 'sig',
      message: 'Signature must be hex-encoded (only 0-9, a-f, A-F characters)',
      severity: 'error',
    });
    return;
  }

  // Check signature length (typical signature lengths)
  // Ed25519: 64 bytes = 128 hex chars
  // ECDSA: 64-72 bytes = 128-144 hex chars
  const sigLength = data.sig.length;

  if (sigLength < 64) {
    errors.push({
      field: 'sig',
      message: `Signature too short (${sigLength} chars). Expected at least 64 hex characters.`,
      severity: 'error',
    });
  }

  if (sigLength > 256) {
    errors.push({
      field: 'sig',
      message: `Signature too long (${sigLength} chars). Expected at most 256 hex characters.`,
      severity: 'error',
    });
  }

  // Signature should be even length (each byte = 2 hex chars)
  if (sigLength % 2 !== 0) {
    errors.push({
      field: 'sig',
      message: 'Signature must have even number of hex characters (each byte = 2 chars)',
      severity: 'error',
    });
  }
}
