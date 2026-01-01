/**
 * Type Definitions for Aura gRPC/REST API Responses
 *
 * Defines all response types from Aura blockchain REST API endpoints.
 */

/**
 * JSON Web Key (JWK) format for public keys
 * Based on RFC 7517: https://tools.ietf.org/html/rfc7517
 */
export interface JsonWebKey {
  /** Key type (e.g., "RSA", "EC", "OKP") */
  kty: string;
  /** Public key use (e.g., "sig", "enc") */
  use?: string;
  /** Key operations */
  key_ops?: string[];
  /** Algorithm */
  alg?: string;
  /** Key ID */
  kid?: string;
  /** X.509 certificate chain */
  x5c?: string[];
  /** X.509 certificate SHA-1 thumbprint */
  x5t?: string;
  /** X.509 certificate SHA-256 thumbprint */
  'x5t#S256'?: string;
  /** Curve name (for EC keys, e.g., "P-256", "Ed25519") */
  crv?: string;
  /** X coordinate (for EC keys) */
  x?: string;
  /** Y coordinate (for EC keys) */
  y?: string;
  /** RSA modulus */
  n?: string;
  /** RSA public exponent */
  e?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * DID Document structure (W3C DID Core specification)
 */
export interface DIDDocument {
  /** The DID this document describes */
  id: string;
  /** Verification methods for the DID */
  verificationMethod?: VerificationMethod[];
  /** Authentication verification methods */
  authentication?: (string | VerificationMethod)[];
  /** Assertion method verification methods */
  assertionMethod?: (string | VerificationMethod)[];
  /** Key agreement verification methods */
  keyAgreement?: (string | VerificationMethod)[];
  /** Capability invocation verification methods */
  capabilityInvocation?: (string | VerificationMethod)[];
  /** Capability delegation verification methods */
  capabilityDelegation?: (string | VerificationMethod)[];
  /** Service endpoints */
  service?: ServiceEndpoint[];
  /** Controller of the DID */
  controller?: string | string[];
  /** Additional context */
  '@context'?: string | string[] | Record<string, unknown>;
}

/**
 * Verification method in a DID document
 */
export interface VerificationMethod {
  /** Verification method ID */
  id: string;
  /** Type of verification method (e.g., "Ed25519VerificationKey2020") */
  type: string;
  /** Controller of this verification method */
  controller: string;
  /** Public key in multibase format */
  publicKeyMultibase?: string;
  /** Public key in JWK format */
  publicKeyJwk?: JsonWebKey;
  /** Public key in base58 format (deprecated) */
  publicKeyBase58?: string;
  /** Public key in hex format */
  publicKeyHex?: string;
}

/**
 * Service endpoint in a DID document
 */
export interface ServiceEndpoint {
  /** Service ID */
  id: string;
  /** Service type */
  type: string;
  /** Service endpoint URL */
  serviceEndpoint: string | string[] | Record<string, unknown>;
}

/**
 * Verifiable Credential structure
 */
export interface VerifiableCredential {
  /** JSON-LD context */
  '@context': string | string[];
  /** Credential ID */
  id: string;
  /** Credential types */
  type: string[];
  /** Issuer DID or issuer object */
  issuer: string | { id: string; [key: string]: unknown };
  /** Issuance date (ISO 8601) */
  issuanceDate: string;
  /** Expiration date (ISO 8601, optional) */
  expirationDate?: string;
  /** Credential subject (holder claims) */
  credentialSubject: {
    /** Subject DID */
    id?: string;
    /** Additional claims */
    [key: string]: unknown;
  };
  /** Cryptographic proof */
  proof?: Proof | Proof[];
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Cryptographic proof
 */
export interface Proof {
  /** Proof type */
  type: string;
  /** Creation timestamp (ISO 8601) */
  created: string;
  /** Verification method ID */
  verificationMethod: string;
  /** Proof purpose */
  proofPurpose: string;
  /** Signature value */
  proofValue?: string;
  /** JWS signature */
  jws?: string;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * VC record stored on Aura blockchain
 */
export interface VCRecord {
  /** Credential ID */
  vc_id: string;
  /** Holder DID */
  holder_did: string;
  /** Issuer DID */
  issuer_did: string;
  /** VC data hash (SHA-256) */
  data_hash: string;
  /** Issuance timestamp (Unix time) */
  issued_at: number;
  /** Expiration timestamp (Unix time, 0 if no expiration) */
  expires_at: number;
  /** Revocation status */
  revoked: boolean;
  /** Revocation timestamp (Unix time, 0 if not revoked) */
  revoked_at: number;
  /** Full VC data (optional, may be stored off-chain) */
  credential_data?: VerifiableCredential;
}

/**
 * VC status response
 */
export interface VCStatusResponse {
  /** Credential ID */
  vc_id: string;
  /** Whether credential exists on chain */
  exists: boolean;
  /** Whether credential is revoked */
  revoked: boolean;
  /** Whether credential is expired */
  expired: boolean;
  /** Credential record (if exists) */
  vc_record?: VCRecord;
  /** Error message (if query failed) */
  error?: string;
}

/**
 * Verification result from presentation verification
 */
export interface VerificationResult {
  /** Overall verification status */
  verified: boolean;
  /** Presentation ID */
  presentation_id: string;
  /** Holder DID */
  holder_did: string;
  /** Verifier DID (if provided) */
  verifier_did?: string;
  /** Verified credentials */
  credentials: VerifiedCredential[];
  /** Disclosed attributes based on context */
  disclosed_attributes: Record<string, unknown>;
  /** Verification timestamp */
  verified_at: number;
  /** Verification errors (if any) */
  errors: string[];
  /** Verification warnings (if any) */
  warnings: string[];
}

/**
 * Individual verified credential in presentation
 */
export interface VerifiedCredential {
  /** Credential ID */
  vc_id: string;
  /** Whether this credential is valid */
  valid: boolean;
  /** Issuer DID */
  issuer_did: string;
  /** Issuance date */
  issued_at: number;
  /** Expiration date (0 if no expiration) */
  expires_at: number;
  /** Whether credential is revoked */
  revoked: boolean;
  /** Verification errors for this credential */
  errors: string[];
}

/**
 * DID resolution response
 */
export interface DIDResolutionResponse {
  /** DID document */
  did_document: DIDDocument;
  /** DID metadata */
  metadata: {
    /** Creation timestamp */
    created?: number;
    /** Last update timestamp */
    updated?: number;
    /** Whether DID is deactivated */
    deactivated?: boolean;
    /** Additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Batch VC status query response
 */
export interface BatchVCStatusResponse {
  /** Map of VC ID to status */
  statuses: Record<string, VCStatusResponse>;
  /** Number of successful queries */
  success_count: number;
  /** Number of failed queries */
  error_count: number;
}

/**
 * API error response structure
 */
export interface APIErrorResponse {
  /** Error code */
  code?: number;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: unknown;
}

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  /** Response data */
  data?: T;
  /** Error (if request failed) */
  error?: APIErrorResponse;
  /** HTTP status code */
  status: number;
}

/**
 * Presentation verification request payload
 */
export interface VerifyPresentationRequest {
  /** QR code data (base64 or JSON string) */
  presentation_data: string;
  /** Verifier DID (optional) */
  verifier_did?: string;
  /** Challenge nonce (optional, for additional security) */
  challenge?: string;
  /** Verification options */
  options?: {
    /** Check credential revocation status */
    check_revocation?: boolean;
    /** Check credential expiration */
    check_expiration?: boolean;
    /** Verify holder signature */
    verify_signature?: boolean;
  };
}

/**
 * Network information
 */
export interface NetworkInfo {
  /** Network name */
  network: 'mainnet' | 'testnet' | 'local';
  /** Chain ID */
  chain_id: string;
  /** gRPC endpoint */
  grpc_endpoint: string;
  /** REST endpoint */
  rest_endpoint: string;
  /** Whether client is connected */
  connected: boolean;
}

/**
 * Client connection status
 */
export interface ConnectionStatus {
  /** Whether connected to network */
  connected: boolean;
  /** Current network */
  network: string;
  /** REST endpoint in use */
  endpoint: string;
  /** Last successful connection time */
  last_connected?: number;
  /** Last connection error */
  last_error?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to retry on timeout */
  retryOnTimeout: boolean;
  /** HTTP status codes that should trigger retry */
  retryableStatusCodes: number[];
}
