/**
 * Verification Types for Aura Verifier SDK
 *
 * Defines types and interfaces for the high-level verification API.
 */

import { DisclosureContext } from '../qr/types.js';
import type { NonceManager } from '../security/nonce-manager.js';

/**
 * Network configuration for Aura blockchain
 */
export type NetworkType = 'mainnet' | 'testnet' | 'local';

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Enable caching of DID documents (default: true) */
  enableDIDCache?: boolean;
  /** Enable caching of VC status (default: true) */
  enableVCCache?: boolean;
  /** Cache TTL in seconds (default: 300) */
  ttl?: number;
  /** Maximum cache size in MB (default: 50) */
  maxSize?: number;
  /** Cache storage location for offline mode */
  storageLocation?: string;
}

/**
 * Nonce manager configuration
 */
export interface NonceConfig {
  /** Enable nonce replay protection (default: true) */
  enabled?: boolean;
  /** Time window in milliseconds for nonce validity (default: 300000 = 5 minutes) */
  nonceWindow?: number;
  /** Maximum clock skew allowed in milliseconds (default: 30000 = 30 seconds) */
  clockSkew?: number;
  /** Custom NonceManager instance (if not provided, creates a new one) */
  manager?: NonceManager;
}

/**
 * Configuration for AuraVerifier instance
 */
export interface AuraVerifierConfig {
  /** Network to connect to */
  network: NetworkType;
  /** Custom gRPC endpoint (overrides network default) */
  grpcEndpoint?: string;
  /** Custom REST endpoint (overrides network default) */
  restEndpoint?: string;
  /** Enable offline mode (uses cached data only) */
  offlineMode?: boolean;
  /** Cache configuration */
  cacheConfig?: CacheConfig;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
  /** Custom chain ID (for local networks) */
  chainId?: string;
  /** Nonce replay protection configuration (default: enabled) */
  nonceConfig?: NonceConfig;
}

/**
 * Verifiable Credential types supported by Aura
 */
export enum VCType {
  /** Government-issued identity document */
  GOVERNMENT_ID = 'GovernmentID',
  /** Biometric verification credential */
  BIOMETRIC = 'BiometricVerification',
  /** Age verification credential */
  AGE_VERIFICATION = 'AgeVerification',
  /** Address proof credential */
  ADDRESS_PROOF = 'AddressProof',
  /** KYC (Know Your Customer) credential */
  KYC = 'KYC',
  /** Proof of humanity credential */
  PROOF_OF_HUMANITY = 'ProofOfHumanity',
  /** Custom credential type */
  CUSTOM = 'Custom',
}

/**
 * Credential status on the blockchain
 */
export enum VCStatus {
  /** Credential is valid and active */
  ACTIVE = 'active',
  /** Credential has been revoked */
  REVOKED = 'revoked',
  /** Credential has expired */
  EXPIRED = 'expired',
  /** Credential is suspended */
  SUSPENDED = 'suspended',
  /** Status unknown or not found */
  UNKNOWN = 'unknown',
}

/**
 * Verification request parameters
 */
export interface VerificationRequest {
  /** QR code data (raw string or parsed object) */
  qrCodeData: string;
  /** Optional verifier DID/address for audit trail */
  verifierAddress?: string;
  /** Required VC types (verification fails if not present) */
  requiredVCTypes?: VCType[];
  /** Maximum age of credentials in seconds (default: no limit) */
  maxCredentialAge?: number;
  /** Custom disclosure requirements */
  requiredDisclosures?: Partial<DisclosureContext>;
  /** Skip online verification (use cached data only) */
  offlineOnly?: boolean;
}

/**
 * Individual VC verification details
 */
export interface VCVerificationDetail {
  /** Verifiable Credential ID */
  vcId: string;
  /** Credential type */
  vcType: VCType;
  /** Issuer DID */
  issuerDID: string;
  /** Issuance timestamp */
  issuedAt: Date;
  /** Expiration timestamp (if applicable) */
  expiresAt?: Date;
  /** Current status on chain */
  status: VCStatus;
  /** Whether signature is valid */
  signatureValid: boolean;
  /** Whether credential is on-chain */
  onChain: boolean;
  /** Chain transaction hash (if on-chain) */
  txHash?: string;
  /** Block height where credential was recorded */
  blockHeight?: number;
}

/**
 * Attributes disclosed in the presentation
 */
export interface DiscloseableAttributes {
  /** Full name (if disclosed) */
  fullName?: string;
  /** Age (if disclosed) */
  age?: number;
  /** Whether holder is over 18 (if disclosed) */
  ageOver18?: boolean;
  /** Whether holder is over 21 (if disclosed) */
  ageOver21?: boolean;
  /** City and state (if disclosed) */
  cityState?: string;
  /** Full address (if disclosed) */
  fullAddress?: string;
  /** Additional custom attributes */
  customAttributes?: Record<string, unknown>;
}

/**
 * Verification strategy used (how the verification was performed)
 */
export type VerificationStrategy = 'online' | 'offline' | 'cached';

/**
 * Result of a verification operation
 */
export interface VerificationResult {
  /** Overall verification status */
  isValid: boolean;
  /** Holder's DID */
  holderDID: string;
  /** Verification timestamp */
  verifiedAt: Date;
  /** Details of each verified credential */
  vcDetails: VCVerificationDetail[];
  /** Disclosed attributes from presentation */
  attributes: DiscloseableAttributes;
  /** Error message if verification failed */
  verificationError?: string;
  /** Unique audit ID for this verification */
  auditId: string;
  /** Network round-trip latency in milliseconds */
  networkLatency: number;
  /** Method used for verification */
  verificationMethod: VerificationStrategy;
  /** Presentation ID from QR code */
  presentationId: string;
  /** QR code expiration time */
  expiresAt: Date;
  /** Whether signature verification passed */
  signatureValid: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DID Document structure (simplified)
 */
export interface DIDDocument {
  /** DID identifier */
  id: string;
  /** Verification methods (public keys) */
  verificationMethod: VerificationMethodEntry[];
  /** Authentication methods */
  authentication: string[];
  /** Service endpoints */
  service?: ServiceEndpoint[];
  /** Controller DIDs */
  controller?: string | string[];
  /** Additional context */
  '@context'?: string | string[];
}

/**
 * Verification method in DID Document
 */
export interface VerificationMethodEntry {
  /** Method ID */
  id: string;
  /** Method type (e.g., Ed25519VerificationKey2020) */
  type: string;
  /** Controller DID */
  controller: string;
  /** Public key in various formats */
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, unknown>;
  publicKeyBase58?: string;
  publicKeyHex?: string;
}

/**
 * Service endpoint in DID Document
 */
export interface ServiceEndpoint {
  /** Service ID */
  id: string;
  /** Service type */
  type: string;
  /** Service endpoint URL */
  serviceEndpoint: string;
}

/**
 * Cache synchronization result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Number of DIDs synced */
  didsSynced: number;
  /** Number of VCs synced */
  vcsSynced: number;
  /** Number of revocations synced */
  revocationsSynced: number;
  /** Sync duration in milliseconds */
  duration: number;
  /** Errors encountered during sync */
  errors: string[];
  /** Last sync timestamp */
  lastSyncAt: Date;
}

/**
 * Event types emitted by AuraVerifier
 */
export type VerifierEvent = 'verification' | 'error' | 'sync' | 'cache_update';

/**
 * Event handler function type
 */
export type EventHandler = (data: unknown) => void | Promise<void>;

/**
 * Verification event data
 */
export interface VerificationEventData {
  /** Verification result */
  result: VerificationResult;
  /** Request that triggered verification */
  request: VerificationRequest;
  /** Timestamp of event */
  timestamp: Date;
}

/**
 * Error event data
 */
export interface ErrorEventData {
  /** Error that occurred */
  error: Error;
  /** Context where error occurred */
  context: string;
  /** Timestamp of event */
  timestamp: Date;
  /** Request that caused error (if applicable) */
  request?: VerificationRequest;
}

/**
 * Sync event data
 */
export interface SyncEventData {
  /** Sync result */
  result: SyncResult;
  /** Timestamp of event */
  timestamp: Date;
}

/**
 * Cache update event data
 */
export interface CacheUpdateEventData {
  /** Type of cached item */
  itemType: 'did' | 'vc' | 'revocation';
  /** Item identifier */
  itemId: string;
  /** Operation performed */
  operation: 'add' | 'update' | 'delete';
  /** Timestamp of event */
  timestamp: Date;
}

/**
 * Batch verification options
 */
export interface BatchVerificationOptions {
  /** Maximum concurrent verifications (default: 5) */
  concurrency?: number;
  /** Stop on first error (default: false) */
  stopOnError?: boolean;
  /** Timeout for entire batch in milliseconds */
  batchTimeout?: number;
}

/**
 * Batch verification result
 */
export interface BatchVerificationResult {
  /** Individual verification results */
  results: (VerificationResult | Error)[];
  /** Number of successful verifications */
  successCount: number;
  /** Number of failed verifications */
  failureCount: number;
  /** Total processing time in milliseconds */
  totalTime: number;
  /** Average time per verification in milliseconds */
  averageTime: number;
}

/**
 * Network endpoint configuration
 */
export interface NetworkEndpoints {
  /** gRPC endpoint URL */
  grpc: string;
  /** REST API endpoint URL */
  rest: string;
  /** Chain ID */
  chainId: string;
  /** Network name */
  name: string;
}

/**
 * Default network configurations
 */
export const NETWORK_ENDPOINTS: Record<NetworkType, NetworkEndpoints> = {
  mainnet: {
    grpc: 'rpc.aurablockchain.org:9090',
    rest: 'https://api.aurablockchain.org',
    chainId: 'aura-mainnet-1',
    name: 'Aura Mainnet',
  },
  testnet: {
    grpc: 'testnet-grpc.aurablockchain.org:443',
    rest: 'https://testnet-api.aurablockchain.org',
    chainId: 'aura-mvp-1',
    name: 'Aura Testnet (MVP)',
  },
  local: {
    grpc: 'localhost:9090',
    rest: 'http://localhost:1317',
    chainId: 'aura-local-1',
    name: 'Aura Local',
  },
};

/**
 * Verification error codes
 */
export enum VerificationErrorCode {
  /** QR code parsing failed */
  QR_PARSE_ERROR = 'QR_PARSE_ERROR',
  /** QR code has expired */
  QR_EXPIRED = 'QR_EXPIRED',
  /** Invalid signature */
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  /** DID resolution failed */
  DID_RESOLUTION_FAILED = 'DID_RESOLUTION_FAILED',
  /** Credential not found on chain */
  VC_NOT_FOUND = 'VC_NOT_FOUND',
  /** Credential has been revoked */
  VC_REVOKED = 'VC_REVOKED',
  /** Credential has expired */
  VC_EXPIRED = 'VC_EXPIRED',
  /** Network request failed */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Required VC type missing */
  REQUIRED_VC_MISSING = 'REQUIRED_VC_MISSING',
  /** Required disclosure missing */
  REQUIRED_DISCLOSURE_MISSING = 'REQUIRED_DISCLOSURE_MISSING',
  /** Timeout occurred */
  TIMEOUT = 'TIMEOUT',
  /** Nonce has been replayed (potential replay attack) */
  NONCE_REPLAY = 'NONCE_REPLAY',
  /** Nonce has expired (outside valid time window) */
  NONCE_EXPIRED = 'NONCE_EXPIRED',
  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Verification error class
 */
export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly code: VerificationErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'VerificationError';
    Object.setPrototypeOf(this, VerificationError.prototype);
  }

  /**
   * Create error for QR code parsing failure
   */
  static qrParseError(details?: unknown): VerificationError {
    return new VerificationError(
      'Failed to parse QR code data',
      VerificationErrorCode.QR_PARSE_ERROR,
      details
    );
  }

  /**
   * Create error for expired QR code
   */
  static qrExpired(expiresAt: Date): VerificationError {
    return new VerificationError(
      `QR code expired at ${expiresAt.toISOString()}`,
      VerificationErrorCode.QR_EXPIRED,
      { expiresAt }
    );
  }

  /**
   * Create error for invalid signature
   */
  static invalidSignature(details?: unknown): VerificationError {
    return new VerificationError(
      'Signature verification failed',
      VerificationErrorCode.INVALID_SIGNATURE,
      details
    );
  }

  /**
   * Create error for DID resolution failure
   */
  static didResolutionFailed(did: string, details?: unknown): VerificationError {
    return new VerificationError(
      `Failed to resolve DID: ${did}`,
      VerificationErrorCode.DID_RESOLUTION_FAILED,
      details
    );
  }

  /**
   * Create error for credential not found
   */
  static vcNotFound(vcId: string): VerificationError {
    return new VerificationError(
      `Verifiable Credential not found: ${vcId}`,
      VerificationErrorCode.VC_NOT_FOUND,
      { vcId }
    );
  }

  /**
   * Create error for revoked credential
   */
  static vcRevoked(vcId: string): VerificationError {
    return new VerificationError(
      `Verifiable Credential has been revoked: ${vcId}`,
      VerificationErrorCode.VC_REVOKED,
      { vcId }
    );
  }

  /**
   * Create error for expired credential
   */
  static vcExpired(vcId: string, expiresAt: Date): VerificationError {
    return new VerificationError(
      `Verifiable Credential expired at ${expiresAt.toISOString()}`,
      VerificationErrorCode.VC_EXPIRED,
      { vcId, expiresAt }
    );
  }

  /**
   * Create error for network failure
   */
  static networkError(details?: unknown): VerificationError {
    return new VerificationError(
      'Network request failed',
      VerificationErrorCode.NETWORK_ERROR,
      details
    );
  }

  /**
   * Create error for missing required VC type
   */
  static requiredVCMissing(vcType: VCType): VerificationError {
    return new VerificationError(
      `Required credential type missing: ${vcType}`,
      VerificationErrorCode.REQUIRED_VC_MISSING,
      { vcType }
    );
  }

  /**
   * Create error for timeout
   */
  static timeout(timeoutMs: number): VerificationError {
    return new VerificationError(
      `Operation timed out after ${timeoutMs}ms`,
      VerificationErrorCode.TIMEOUT,
      { timeoutMs }
    );
  }

  /**
   * Create error for nonce replay (potential attack)
   */
  static nonceReplay(nonce: number | string, presentationId: string): VerificationError {
    return new VerificationError(
      'Nonce has already been used (possible replay attack)',
      VerificationErrorCode.NONCE_REPLAY,
      { nonce, presentationId }
    );
  }

  /**
   * Create error for expired nonce
   */
  static nonceExpired(nonce: number | string, windowMs: number): VerificationError {
    return new VerificationError(
      `Nonce expired (outside ${windowMs / 1000}s validity window)`,
      VerificationErrorCode.NONCE_EXPIRED,
      { nonce, windowMs }
    );
  }
}
