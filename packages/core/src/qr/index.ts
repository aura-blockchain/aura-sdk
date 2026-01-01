/**
 * QR Code Module for Aura Verifier SDK
 *
 * Provides complete QR code parsing and validation functionality
 * for Aura verification protocol.
 *
 * @module @aura/verifier-sdk/qr
 *
 * @example
 * ```typescript
 * import { parseQRCode, validateQRCodeData } from '@aura/verifier-sdk/qr';
 *
 * // Parse QR code
 * const qrString = "aura://verify?data=eyJ2IjoiMS4wIiwicCI6IjEyMyIsImgiOiJkaWQ6YXVyYTptYWlubmV0OmFiYzEyMyIsInZjcyI6WyJ2YzEiXSwiY3R4Ijp7fSwiZXhwIjoxNzM1NTYwMDAwLCJuIjoxMjM0NTYsInNpZyI6ImFiY2RlZiJ9";
 * const qrData = parseQRCode(qrString);
 *
 * // Validate QR code data
 * const result = validateQRCodeData(qrData);
 * if (result.valid) {
 *   console.log('QR code is valid');
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

// Parser imports and exports
import { parseQRCode, parseQRCodeSafe } from './parser.js';
export { parseQRCode, parseQRCodeSafe };

// Validator imports and exports
import {
  validateQRCodeData,
  validateQRCodeDataStrict,
  validateQRCodeDataAsync,
  validateQRCodeDataStrictAsync,
  validateQRCode,
  validateQRCodeAsync,
} from './validator.js';
export {
  validateQRCodeData,
  validateQRCodeDataStrict,
  validateQRCodeDataAsync,
  validateQRCodeDataStrictAsync,
  validateQRCode,
  validateQRCodeAsync,
};

// Type exports
export type {
  QRCodeData,
  DisclosureContext,
  ParseResult,
  ValidationResult,
  ValidationError,
  QRParserOptions,
  QRValidatorOptions,
  NonceValidator,
} from './types.js';

// Error exports
export {
  QRCodeError,
  QRParseError,
  QRValidationError,
  QRExpiredError,
  QRNonceError,
} from './errors.js';

/**
 * Convenience function to parse and validate QR code in one step
 *
 * @param qrString - QR code string
 * @param options - Combined parser and validator options
 * @returns Validated QR code data
 * @throws {QRParseError} If parsing fails
 * @throws {QRValidationError} If validation fails
 * @throws {QRExpiredError} If QR code is expired
 *
 * @example
 * ```typescript
 * import { parseAndValidateQRCode } from '@aura/verifier-sdk/qr';
 *
 * try {
 *   const qrData = parseAndValidateQRCode(qrString);
 *   console.log('Valid QR code:', qrData);
 * } catch (error) {
 *   console.error('Error:', error.message);
 * }
 * ```
 */
export function parseAndValidateQRCode(
  qrString: string,
  options?: {
    strict?: boolean;
    checkExpiration?: boolean;
    expirationTolerance?: number;
    validateDID?: boolean;
    validateSignature?: boolean;
    supportedVersions?: string[];
  }
): import('./types.js').QRCodeData {
  // Build parser options, filtering out undefined values to use defaults
  const parserOpts: import('./types.js').QRParserOptions = {};
  if (options?.strict !== undefined) parserOpts.strict = options.strict;
  if (options?.expirationTolerance !== undefined) parserOpts.expirationTolerance = options.expirationTolerance;
  if (options?.supportedVersions !== undefined) parserOpts.supportedVersions = options.supportedVersions;

  // Parse QR code
  const qrData = parseQRCode(qrString, parserOpts);

  // Build validator options, filtering out undefined values to use defaults
  const validatorOpts: import('./types.js').QRValidatorOptions = {};
  if (options?.checkExpiration !== undefined) validatorOpts.checkExpiration = options.checkExpiration;
  if (options?.expirationTolerance !== undefined) validatorOpts.expirationTolerance = options.expirationTolerance;
  if (options?.validateDID !== undefined) validatorOpts.validateDID = options.validateDID;
  if (options?.validateSignature !== undefined) validatorOpts.validateSignature = options.validateSignature;
  if (options?.supportedVersions !== undefined) validatorOpts.supportedVersions = options.supportedVersions;

  // Validate QR code data
  validateQRCodeDataStrict(qrData, validatorOpts);

  return qrData;
}

/**
 * Convenience function to parse and validate QR code (non-throwing version)
 *
 * @param qrString - QR code string
 * @param options - Combined parser and validator options
 * @returns Result object with success status and data or error
 *
 * @example
 * ```typescript
 * import { parseAndValidateQRCodeSafe } from '@aura/verifier-sdk/qr';
 *
 * const result = parseAndValidateQRCodeSafe(qrString);
 * if (result.success) {
 *   console.log('Valid QR code:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export function parseAndValidateQRCodeSafe(
  qrString: string,
  options?: {
    strict?: boolean;
    checkExpiration?: boolean;
    expirationTolerance?: number;
    validateDID?: boolean;
    validateSignature?: boolean;
    supportedVersions?: string[];
  }
): import('./types.js').ParseResult & {
  validationResult?: import('./types.js').ValidationResult;
} {
  try {
    const qrData = parseAndValidateQRCode(qrString, options);
    return {
      success: true,
      data: qrData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
