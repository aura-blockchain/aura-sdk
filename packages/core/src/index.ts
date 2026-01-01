/**
 * Aura Verifier SDK - Core Package
 *
 * Complete SDK for verifying Aura blockchain credentials with support for:
 * - QR code parsing and validation
 * - Cryptographic signature verification
 * - Online and offline credential verification
 * - DID resolution and management
 * - Credential caching and synchronization
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { AuraVerifier } from '@aura-network/verifier-sdk';
 *
 * // Initialize verifier
 * const verifier = new AuraVerifier({
 *   network: 'mainnet',
 *   timeout: 10000,
 *   offlineMode: false
 * });
 *
 * // Verify a QR code presentation
 * const result = await verifier.verify({
 *   qrCodeData: qrString,
 *   verifierAddress: 'aura1...',
 *   requiredVCTypes: [VCType.PROOF_OF_HUMANITY]
 * });
 *
 * if (result.isValid) {
 *   console.log('Verification successful!');
 *   console.log('Holder DID:', result.holderDID);
 *   console.log('Credentials:', result.vcDetails);
 * } else {
 *   console.error('Verification failed:', result.verificationError);
 * }
 * ```
 */

// ============================================================================
// Main Verifier Class and Configuration
// ============================================================================

// Main entry point - export from verification module
export { AuraVerifier } from './verification/verifier.js';

// Verification types and interfaces
export type {
  AuraVerifierConfig,
  VerificationRequest,
  VerificationResult,
  VCVerificationDetail,
  DiscloseableAttributes,
  NetworkType,
  CacheConfig,
  VerificationStrategy,
  DIDDocument,
  VerificationMethodEntry,
  ServiceEndpoint,
  SyncResult,
  VerifierEvent,
  EventHandler,
  VerificationEventData,
  ErrorEventData,
  SyncEventData,
  CacheUpdateEventData,
  BatchVerificationOptions,
  BatchVerificationResult,
  NetworkEndpoints,
  VerificationErrorCode,
} from './verification/types.js';

// Verification enums
export { VCType, VCStatus } from './verification/types.js';

// Network endpoints
export { NETWORK_ENDPOINTS } from './verification/types.js';

// Verification errors
export { VerificationError as VCVerificationError } from './verification/types.js';

// ============================================================================
// QR Code Module
// ============================================================================

// QR parser and validator
export {
  parseQRCode,
  parseQRCodeSafe,
  validateQRCodeData,
  validateQRCodeDataStrict,
  parseAndValidateQRCode,
  parseAndValidateQRCodeSafe,
} from './qr/index.js';

// QR types
export type {
  QRCodeData,
  DisclosureContext,
  ParseResult,
  ValidationResult,
  ValidationError as QRValidationError,
  QRParserOptions,
  QRValidatorOptions,
} from './qr/types.js';

// QR errors (re-export with QR prefix to avoid naming conflicts)
export {
  QRCodeError,
  QRParseError,
  QRValidationError as QRCodeValidationError,
  QRExpiredError,
  QRNonceError,
} from './qr/errors.js';

// ============================================================================
// Network Client (gRPC/REST)
// ============================================================================

// Aura client for advanced usage
export {
  AuraClient,
  createAuraClient,
  connectAuraClient,
} from './grpc/client.js';

// Client configuration
export type { AuraClientConfig } from './grpc/client.js';

export type {
  DIDDocument as AuraDIDDocument,
  VerifiableCredential as AuraVerifiableCredential,
  VCRecord,
  VCStatusResponse,
  VerifiedCredential,
  DIDResolutionResponse,
  BatchVCStatusResponse,
  APIErrorResponse,
  APIResponse,
  VerifyPresentationRequest,
  NetworkInfo,
  ConnectionStatus,
  RetryConfig,
} from './grpc/types.js';

// Network configuration
export {
  AURA_NETWORKS,
  API_PATHS,
  getNetworkConfig,
  isValidNetwork,
  buildEndpointURL,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TIMEOUT,
  DEFAULT_CONNECT_TIMEOUT,
  BATCH_LIMITS,
} from './grpc/endpoints.js';

export type { NetworkConfig } from './grpc/endpoints.js';

// ============================================================================
// Offline Support and Caching
// ============================================================================

// Cache and synchronization
export {
  CredentialCache,
  CacheSync,
  createOfflineVerifier,
} from './offline/index.js';

// Storage adapters
export {
  MemoryStorage,
  BrowserStorage,
  FileStorage,
  createStorageAdapter,
} from './offline/storage.js';

// Encryption utilities
export {
  deriveKeyFromPassword,
  generateEncryptionKey,
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,
  isValidEncryptionKey,
  hexToKey,
  keyToHex,
} from './offline/encryption.js';

// Revocation utilities
export {
  createRevocationBitmap,
  isRevokedInBitmap,
  compressBitmap,
  decompressBitmap,
  calculateMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  hashCredentialId,
  createRevocationList,
  isRevoked,
  getRevocationStats,
  validateRevocationList,
} from './offline/revocation.js';

// Offline types
export type {
  CacheConfig as OfflineCacheConfig,
  CachedCredential,
  CacheStats,
  VerifiableCredential as OfflineVerifiableCredential,
  SyncResult as OfflineSyncResult,
  SyncError as OfflineSyncError,
  RevocationList,
  RevocationBitmap,
  MerkleProof,
  OfflineVerificationResult,
  ConnectivityStatus,
  CacheEntryMetadata,
  StorageAdapter,
  EncryptionConfig,
  EncryptedData,
  AutoSyncConfig,
} from './offline/types.js';

// ============================================================================
// Cryptography
// ============================================================================

// Ed25519 signature verification
export {
  verifyEd25519Signature,
  verifyEd25519SignatureSync,
  isValidEd25519PublicKey,
  isValidEd25519Signature,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
} from './crypto/ed25519.js';

// Secp256k1 signature verification
export {
  verifySecp256k1Signature,
  verifySecp256k1SignatureSync,
  isValidSecp256k1PublicKey,
  isValidSecp256k1Signature,
  SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH,
  SECP256K1_SIGNATURE_LENGTH,
} from './crypto/secp256k1.js';

// Hash utilities
export {
  sha256Hash,
  sha256HashHex,
  hexToUint8Array,
  uint8ArrayToHex,
  isValidHex as isValidHexString,
} from './crypto/hash.js';

// ============================================================================
// Centralized Error Classes
// ============================================================================

// Base error and utilities
export {
  AuraVerifierError,
  isAuraVerifierError,
  getErrorCode,
  toAuraVerifierError,
} from './errors.js';

// QR errors
export {
  QRParseError as ParseError,
  QRValidationError as ValidationError,
  QRExpiredError as ExpiredError,
  QRNonceError as NonceError,
} from './errors.js';

// Cryptographic errors
export {
  SignatureError,
  PublicKeyError,
} from './errors.js';

// Network errors
export {
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  RetryExhaustedError,
} from './errors.js';

// Credential errors
export {
  CredentialRevokedError,
  CredentialExpiredError,
  CredentialNotFoundError,
  CredentialSuspendedError,
  CredentialPendingError,
} from './errors.js';

// DID errors
export {
  DIDResolutionError,
  InvalidDIDError,
  DIDNotFoundError,
} from './errors.js';

// Verification errors
export {
  VerificationError,
} from './errors.js';

// Cache errors
export {
  CacheError,
  SyncError,
  OfflineModeUnavailableError,
} from './errors.js';

// Configuration errors
export {
  ConfigurationError,
} from './errors.js';

// ============================================================================
// Constants
// ============================================================================

// VC types and statuses
export {
  VC_TYPES,
  VC_STATUSES,
} from './types/constants.js';

export type {
  VCTypeValue,
  VCStatusValue,
} from './types/constants.js';

// Error codes
export {
  ERROR_CODES,
} from './types/constants.js';

export type { ErrorCode } from './types/constants.js';

// Default configuration
export {
  DEFAULT_CONFIG,
  PROTOCOL_VERSIONS,
  CRYPTO_ALGORITHMS,
  DID_METHODS,
  DID_PATTERN,
  NETWORK_IDS,
  CACHE_STORAGE_TYPES,
  VERIFICATION_METHODS,
  EVENT_TYPES,
  HTTP_STATUS_CODES,
  MAX_VALUES,
  TIME_CONSTANTS,
} from './types/constants.js';

export type { NetworkId } from './types/constants.js';

// ============================================================================
// Utility Functions
// ============================================================================

export {
  generateAuditId,
  generatePresentationId,
  generateNonce,
  formatDID,
  isValidDID,
  extractDIDNetwork,
  extractDIDIdentifier,
  isValidVCId,
  timestampToDate,
  dateToTimestamp,
  getCurrentTimestamp,
  isExpired,
  getTimeRemaining,
  formatTimestamp,
  sanitizeForLog,
  isValidHex,
  hexToBytes,
  bytesToHex,
  deepClone,
  sleep,
  retry,
  truncate,
  isBrowser,
  isNode,
} from './utils/index.js';

// ============================================================================
// Re-exports for backwards compatibility (if needed)
// ============================================================================

// Legacy type exports (for backwards compatibility)
export type {
  VCRecord as VCRegistryRecord,
  Proof as CredentialProof,
} from './grpc/types.js';

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export with main verifier class
 */
export { AuraVerifier as default } from './verification/verifier.js';

// ============================================================================
// Version
// ============================================================================

/**
 * SDK version (should be synchronized with package.json)
 */
export const VERSION = '1.0.0';

/**
 * SDK name
 */
export const SDK_NAME = '@aura-network/verifier-sdk';

/**
 * SDK information
 */
export const SDK_INFO = {
  name: SDK_NAME,
  version: VERSION,
  description: 'Aura Network Verifiable Credential Verifier SDK',
  author: 'Aura Network',
  license: 'MIT',
} as const;
