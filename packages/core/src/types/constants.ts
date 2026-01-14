/**
 * SDK Constants for Aura Verifier SDK
 *
 * Defines constant values used throughout the SDK including VC types,
 * statuses, error codes, and default configuration values.
 */

/**
 * Verifiable Credential types supported by Aura blockchain
 * Maps credential type to numeric identifier used in on-chain storage
 * Matches VCType enum in aura/vcregistry/v1beta1/types.proto
 */
export const VC_TYPES = {
  /** Unspecified type */
  UNSPECIFIED: 0,
  /** Verified human credential - proves holder is a real person */
  VERIFIED_HUMAN: 1,
  /** Age verification - holder is over 18 years old */
  AGE_OVER_18: 2,
  /** Age verification - holder is over 21 years old */
  AGE_OVER_21: 3,
  /** Residency proof - holder is resident of specified location */
  RESIDENT_OF: 4,
  /** Biometric authentication credential */
  BIOMETRIC_AUTH: 5,
  /** KYC (Know Your Customer) verification credential */
  KYC_VERIFICATION: 6,
  /** Notary public credential */
  NOTARY_PUBLIC: 7,
  /** Professional license credential */
  PROFESSIONAL_LICENSE: 8,
  // Arena focus credentials
  /** Biometric focus arena credential */
  BIOMETRIC_FOCUS: 20,
  /** Social focus arena credential */
  SOCIAL_FOCUS: 21,
  /** Geolocation focus arena credential */
  GEOLOCATION_FOCUS: 22,
  /** High assurance focus arena credential */
  HIGH_ASSURANCE_FOCUS: 23,
  /** Possession focus arena credential */
  POSSESSION_FOCUS: 24,
  /** Knowledge focus arena credential */
  KNOWLEDGE_FOCUS: 25,
  /** Persistence focus arena credential */
  PERSISTENCE_FOCUS: 26,
  /** Specialized focus arena credential */
  SPECIALIZED_FOCUS: 27,
  /** Custom credential types start at 100 */
  CUSTOM: 100,
} as const;

/**
 * Type for VC type values
 */
export type VCTypeValue = typeof VC_TYPES[keyof typeof VC_TYPES];

/**
 * Credential status values on the Aura blockchain
 * Maps status to numeric identifier
 */
export const VC_STATUSES = {
  /** Credential is pending activation */
  PENDING: 1,
  /** Credential is active and valid */
  ACTIVE: 2,
  /** Credential has been revoked by issuer */
  REVOKED: 3,
  /** Credential has expired based on expiration date */
  EXPIRED: 4,
  /** Credential is temporarily suspended */
  SUSPENDED: 5,
} as const;

/**
 * Type for VC status values
 */
export type VCStatusValue = typeof VC_STATUSES[keyof typeof VC_STATUSES];

/**
 * Standard error codes used throughout the SDK
 */
export const ERROR_CODES = {
  // QR Code Errors
  /** Failed to parse QR code data */
  QR_PARSE_ERROR: 'QR_PARSE_ERROR',
  /** QR code has expired */
  QR_EXPIRED: 'QR_EXPIRED',
  /** QR code validation failed */
  QR_VALIDATION_ERROR: 'QR_VALIDATION_ERROR',
  /** Nonce has been reused (replay attack) */
  NONCE_REPLAY: 'NONCE_REPLAY',

  // Cryptographic Errors
  /** Signature verification failed */
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  /** Invalid public key format */
  INVALID_PUBLIC_KEY: 'INVALID_PUBLIC_KEY',
  /** Unsupported signature algorithm */
  UNSUPPORTED_SIGNATURE_ALGORITHM: 'UNSUPPORTED_SIGNATURE_ALGORITHM',

  // Network Errors
  /** Generic network communication error */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Request timed out */
  TIMEOUT: 'TIMEOUT',
  /** Aura node is unavailable */
  NODE_UNAVAILABLE: 'NODE_UNAVAILABLE',
  /** API returned an error */
  API_ERROR: 'API_ERROR',
  /** Invalid response format from server */
  INVALID_RESPONSE: 'INVALID_RESPONSE',

  // Credential Errors
  /** Credential has been revoked */
  CREDENTIAL_REVOKED: 'CREDENTIAL_REVOKED',
  /** Credential has expired */
  CREDENTIAL_EXPIRED: 'CREDENTIAL_EXPIRED',
  /** Credential not found on blockchain */
  CREDENTIAL_NOT_FOUND: 'CREDENTIAL_NOT_FOUND',
  /** Credential is suspended */
  CREDENTIAL_SUSPENDED: 'CREDENTIAL_SUSPENDED',
  /** Credential is in pending status */
  CREDENTIAL_PENDING: 'CREDENTIAL_PENDING',

  // DID Errors
  /** DID resolution failed */
  DID_RESOLUTION_FAILED: 'DID_RESOLUTION_FAILED',
  /** Invalid DID format */
  INVALID_DID_FORMAT: 'INVALID_DID_FORMAT',
  /** DID document not found */
  DID_NOT_FOUND: 'DID_NOT_FOUND',

  // Verification Errors
  /** Presentation verification failed */
  PRESENTATION_VERIFICATION_FAILED: 'PRESENTATION_VERIFICATION_FAILED',
  /** Required credential type is missing */
  REQUIRED_VC_MISSING: 'REQUIRED_VC_MISSING',
  /** Required disclosure is missing */
  REQUIRED_DISCLOSURE_MISSING: 'REQUIRED_DISCLOSURE_MISSING',

  // Cache Errors
  /** Cache read/write error */
  CACHE_ERROR: 'CACHE_ERROR',
  /** Cache synchronization failed */
  SYNC_ERROR: 'SYNC_ERROR',
  /** Offline mode is required but unavailable */
  OFFLINE_MODE_UNAVAILABLE: 'OFFLINE_MODE_UNAVAILABLE',

  // Configuration Errors
  /** Invalid configuration provided */
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  /** Required configuration is missing */
  MISSING_CONFIGURATION: 'MISSING_CONFIGURATION',

  // Generic Errors
  /** Unknown or unclassified error */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  /** Operation not supported */
  NOT_SUPPORTED: 'NOT_SUPPORTED',
} as const;

/**
 * Type for error code values
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Default configuration values for the SDK
 */
export const DEFAULT_CONFIG = {
  /** Default request timeout in milliseconds (10 seconds) */
  TIMEOUT_MS: 10000,

  /** Default QR code presentation expiry in seconds (5 minutes) */
  PRESENTATION_EXPIRY_SECONDS: 300,

  /** Default cache maximum age in seconds (1 hour) */
  CACHE_MAX_AGE_SECONDS: 3600,

  /** Default maximum number of cache entries */
  CACHE_MAX_ENTRIES: 1000,

  /** Default number of retry attempts for network requests */
  RETRY_ATTEMPTS: 3,

  /** Default retry delay in milliseconds */
  RETRY_DELAY_MS: 1000,

  /** Default retry backoff multiplier */
  RETRY_BACKOFF: 2,

  /** Default expiration tolerance in seconds (allow 30s clock skew) */
  EXPIRATION_TOLERANCE_SECONDS: 30,

  /** Default maximum concurrent verification requests */
  MAX_CONCURRENT_VERIFICATIONS: 5,

  /** Default DID cache TTL in seconds (1 hour) */
  DID_CACHE_TTL_SECONDS: 3600,

  /** Default VC status cache TTL in seconds (5 minutes) */
  VC_STATUS_CACHE_TTL_SECONDS: 300,
} as const;

/**
 * Protocol version constants
 */
export const PROTOCOL_VERSIONS = {
  /** Current supported protocol version */
  CURRENT: '1.0',

  /** Supported protocol versions */
  SUPPORTED: ['1.0'],

  /** Minimum supported version */
  MIN_VERSION: '1.0',

  /** Maximum supported version */
  MAX_VERSION: '1.0',
} as const;

/**
 * Cryptographic algorithm constants
 */
export const CRYPTO_ALGORITHMS = {
  /** Ed25519 signature algorithm (Cosmos SDK default) */
  ED25519: 'Ed25519',

  /** Secp256k1 signature algorithm (Ethereum compatible) */
  SECP256K1: 'Secp256k1',

  /** SHA-256 hash algorithm */
  SHA256: 'SHA-256',
} as const;

/**
 * DID method constants
 */
export const DID_METHODS = {
  /** Aura DID method */
  AURA: 'aura',
} as const;

/**
 * DID format regex pattern
 * Matches: did:aura:network:identifier
 */
export const DID_PATTERN = /^did:aura:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/;

/**
 * Network identifiers
 */
export const NETWORK_IDS = {
  /** Mainnet network identifier */
  MAINNET: 'mainnet',

  /** Testnet network identifier */
  TESTNET: 'testnet',

  /** Local development network identifier */
  LOCAL: 'local',
} as const;

/**
 * Type for network ID values
 */
export type NetworkId = typeof NETWORK_IDS[keyof typeof NETWORK_IDS];

/**
 * Cache storage types
 */
export const CACHE_STORAGE_TYPES = {
  /** In-memory storage (not persistent) */
  MEMORY: 'memory',

  /** Browser localStorage/sessionStorage */
  BROWSER: 'browser',

  /** File system storage (Node.js) */
  FILE: 'file',
} as const;

/**
 * Verification method types
 */
export const VERIFICATION_METHODS = {
  /** Online verification (requires network) */
  ONLINE: 'online',

  /** Offline verification (uses cache only) */
  OFFLINE: 'offline',

  /** Cached verification (uses cache with optional fallback to online) */
  CACHED: 'cached',
} as const;

/**
 * Event types emitted by the SDK
 */
export const EVENT_TYPES = {
  /** Verification completed */
  VERIFICATION: 'verification',

  /** Error occurred */
  ERROR: 'error',

  /** Cache synchronized */
  SYNC: 'sync',

  /** Cache updated */
  CACHE_UPDATE: 'cache_update',

  /** Network status changed */
  NETWORK_STATUS: 'network_status',
} as const;

/**
 * HTTP status codes used in network operations
 */
export const HTTP_STATUS_CODES = {
  /** Request succeeded */
  OK: 200,

  /** Bad request (invalid input) */
  BAD_REQUEST: 400,

  /** Unauthorized (authentication required) */
  UNAUTHORIZED: 401,

  /** Forbidden (insufficient permissions) */
  FORBIDDEN: 403,

  /** Resource not found */
  NOT_FOUND: 404,

  /** Request timeout */
  TIMEOUT: 408,

  /** Internal server error */
  INTERNAL_SERVER_ERROR: 500,

  /** Service unavailable */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Maximum values for validation
 */
export const MAX_VALUES = {
  /** Maximum presentation ID length */
  PRESENTATION_ID_LENGTH: 256,

  /** Maximum DID length */
  DID_LENGTH: 512,

  /** Maximum VC ID length */
  VC_ID_LENGTH: 256,

  /** Maximum number of VCs in a single presentation */
  VCS_PER_PRESENTATION: 10,

  /** Maximum signature length in hex characters */
  SIGNATURE_HEX_LENGTH: 256,

  /** Minimum signature length in hex characters */
  MIN_SIGNATURE_HEX_LENGTH: 64,
} as const;

/**
 * Time constants (in milliseconds)
 */
export const TIME_CONSTANTS = {
  /** One second in milliseconds */
  SECOND: 1000,

  /** One minute in milliseconds */
  MINUTE: 60 * 1000,

  /** One hour in milliseconds */
  HOUR: 60 * 60 * 1000,

  /** One day in milliseconds */
  DAY: 24 * 60 * 60 * 1000,

  /** One week in milliseconds */
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
