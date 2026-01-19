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
 * DID Document structure matching chain DIDDocument proto
 * Based on W3C DID Core specification with Aura-specific extensions
 */
export interface DIDDocument {
  /** The DID this document describes (did:aura:mainnet:...) */
  did: string;
  /** Bech32 address of controller */
  controller: string;
  /** Verification methods (public keys) */
  verification_methods: ChainVerificationMethod[];
  /** List of active VC IDs */
  credential_ids: string[];
  /** When created (ISO 8601) */
  created: string;
  /** When last updated (ISO 8601) */
  updated: string;
  /** Full document URI (IPFS) */
  metadata_uri?: string;
  /** Service endpoint map */
  service_endpoints?: Record<string, string>;
}

/**
 * Chain verification method structure
 */
export interface ChainVerificationMethod {
  /** Method ID */
  id: string;
  /** Type (e.g., "Ed25519VerificationKey2020") */
  type: string;
  /** DID of controller */
  controller: string;
  /** Raw public key bytes (hex encoded) */
  public_key: string;
}

/**
 * W3C DID Document structure (for external compatibility)
 */
export interface W3CDIDDocument {
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
 * VCType enum values matching chain proto definition
 */
export enum VCType {
  UNSPECIFIED = 0,
  VERIFIED_HUMAN = 1,
  AGE_OVER_18 = 2,
  AGE_OVER_21 = 3,
  RESIDENT_OF = 4,
  BIOMETRIC_AUTH = 5,
  KYC_VERIFICATION = 6,
  NOTARY_PUBLIC = 7,
  PROFESSIONAL_LICENSE = 8,
  // Arena focus credentials
  BIOMETRIC_FOCUS = 20,
  SOCIAL_FOCUS = 21,
  GEOLOCATION_FOCUS = 22,
  HIGH_ASSURANCE_FOCUS = 23,
  POSSESSION_FOCUS = 24,
  KNOWLEDGE_FOCUS = 25,
  PERSISTENCE_FOCUS = 26,
  SPECIALIZED_FOCUS = 27,
  // Custom types start at 100
  CUSTOM = 100,
}

/**
 * VCStatus enum values matching chain proto definition
 */
export enum VCStatus {
  UNSPECIFIED = 0,
  PENDING = 1,
  ACTIVE = 2,
  REVOKED = 3,
  EXPIRED = 4,
  SUSPENDED = 5,
}

/**
 * RevocationReason enum matching chain proto definition
 */
export enum RevocationReason {
  UNSPECIFIED = 0,
  USER_REQUEST = 1,
  FRAUD_DETECTED = 2,
  CS_BELOW_THRESHOLD = 3,
  IR_INVALIDATED = 4,
  EXPIRED = 5,
  GOVERNANCE = 6,
  SECURITY_COMPROMISE = 7,
  POLICY_CHANGE = 8,
}

/**
 * VC record stored on Aura blockchain
 * Matches VCRecord in aura/vcregistry/v1beta1/vc_registry.proto
 */
export interface VCRecord {
  /** Unique identifier (DID-based or UUID) */
  vc_id: string;
  /** Type of credential */
  vc_type: VCType;
  /** Custom type name (if VC_TYPE_CUSTOM) */
  vc_type_custom?: string;
  /** DID of holder */
  holder_did: string;
  /** Bech32 address of holder */
  holder_address: string;
  /** Current status (ACTIVE, REVOKED, SUSPENDED, etc.) */
  status: VCStatus;
  /** When issued (ISO 8601 timestamp) */
  issued_at: string;
  /** Expiration (ISO 8601 timestamp, empty = never expires) */
  expires_at?: string;
  /** Block height of issuance (for audit) */
  issued_height: number;
  /** SHA256 of full credential (tamper detection) */
  credential_hash: string;
  /** Hash of issuing plug-in (code verification) */
  verifier_plugin_hash?: string;
  /** AI assistant address (IR runner) */
  issuer_assistant?: string;
  /** Inclusion Routines required for minting */
  prerequisite_ir_ids?: string[];
  /** Extensible metadata (IPFS CID, etc.) */
  metadata?: Record<string, string>;
  /** Confidence Score at mint time (audit trail) */
  cs_at_mint?: number;
  /** Policy version used (governance tracking) */
  policy_version?: string;
  /** Full VC data (optional, may be stored off-chain) */
  credential_data?: VerifiableCredential;
}

/**
 * VC status response matching QueryCheckVCStatusResponse
 */
export interface VCStatusResponse {
  /** VC status enum */
  status: VCStatus;
  /** Whether credential is valid (active and not expired) */
  valid: boolean;
  /** Whether VC exists */
  exists?: boolean;
  /** VC identifier */
  vc_id?: string;
  /** Whether revoked (legacy compatibility) */
  revoked?: boolean;
  /** Whether expired (legacy compatibility) */
  expired?: boolean;
  /** Expiration timestamp (ISO 8601) */
  expires_at?: string;
  /** Revocation record (if revoked) */
  revocation?: RevocationRecord;
  /** Merkle proof for trustless verification */
  merkle_proof?: string;
}

/**
 * Revocation record matching RevocationRecord proto
 */
export interface RevocationRecord {
  /** Credential ID */
  vc_id: string;
  /** When revoked (ISO 8601) */
  revoked_at: string;
  /** Block height of revocation */
  revoked_height: number;
  /** Reason for revocation */
  reason: RevocationReason;
  /** Who revoked (holder_did or "governance") */
  revoker: string;
  /** Evidence (IPFS hash or metadata) */
  evidence?: string;
  /** Merkle proof bytes (hex encoded) */
  merkle_proof?: string;
  /** Position in Merkle tree */
  merkle_index?: number;
}

/**
 * Legacy VC status response format for backwards compatibility
 */
export interface LegacyVCStatusResponse {
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

// ============================
// ATTRIBUTE VC TYPES
// ============================

/**
 * AttributeType enum matching chain proto
 */
export enum AttributeType {
  UNSPECIFIED = 0,
  // Personal attributes
  FULL_NAME = 1,
  FIRST_NAME = 2,
  LAST_NAME = 3,
  DATE_OF_BIRTH = 4,
  AGE = 5,
  GENDER = 6,
  // Contact attributes
  EMAIL = 10,
  PHONE = 11,
  ADDRESS_FULL = 12,
  ADDRESS_STREET = 13,
  ADDRESS_CITY = 14,
  ADDRESS_STATE = 15,
  ADDRESS_ZIP = 16,
  ADDRESS_COUNTRY = 17,
  // Government IDs
  PASSPORT_NUMBER = 20,
  DRIVERS_LICENSE = 21,
  SSN = 22,
  TAX_ID = 23,
  // Physical attributes
  HEIGHT = 30,
  WEIGHT = 31,
  EYE_COLOR = 32,
  HAIR_COLOR = 33,
  // Professional attributes
  OCCUPATION = 40,
  EMPLOYER = 41,
  PROFESSIONAL_LICENSE = 42,
  EDUCATION_LEVEL = 43,
  DEGREE = 44,
  // Special certifications
  SCUBA_CERTIFIED = 50,
  PILOTS_LICENSE = 51,
  SECURITY_CLEARANCE = 52,
  // Custom
  CUSTOM = 100,
}

/**
 * DisclosurePolicyMode enum matching chain proto
 */
export enum DisclosurePolicyMode {
  DENY = 0,
  ASK = 1,
  ALLOW = 2,
  CONDITIONAL = 3,
}

/**
 * AttributeVC representing a single identity attribute as a VC
 */
export interface AttributeVC {
  /** Unique ID */
  attribute_vc_id: string;
  /** Owner address */
  holder_address: string;
  /** What attribute */
  attribute_type: AttributeType;
  /** Encrypted attribute value (hex encoded) */
  encrypted_value: string;
  /** Hash for ZK proofs (hex encoded) */
  value_hash: string;
  /** When issued (ISO 8601) */
  issued_at: string;
  /** Expiration (ISO 8601) */
  expires_at?: string;
  /** Current status */
  status: VCStatus;
  /** Who verified this attribute */
  issuer: string;
  /** Confidence level 1-100 */
  verification_level: number;
}

/**
 * Disclosure policy defining user's disclosure preferences
 */
export interface DisclosurePolicy {
  /** User's address */
  holder_address: string;
  /** Attribute-specific rules */
  rules: AttributeDisclosureRule[];
  /** Default mode (deny all by default) */
  default_mode: DisclosurePolicyMode;
  /** When last updated (ISO 8601) */
  updated_at: string;
}

/**
 * Rule for disclosing a specific attribute
 */
export interface AttributeDisclosureRule {
  /** Which attribute */
  attribute_type: AttributeType;
  /** Disclosure mode */
  mode: DisclosurePolicyMode;
  /** Whitelist of allowed verifiers (optional) */
  allowed_verifiers?: string[];
  /** Rate limit */
  max_disclosures_per_day?: number;
}

/**
 * Disclosure request from a verifier
 */
export interface DisclosureRequest {
  /** Request ID */
  request_id: string;
  /** Verifier's address */
  verifier_address: string;
  /** Verifier's display name */
  verifier_name: string;
  /** Requested attributes */
  requested_attributes: AttributeType[];
  /** Purpose description */
  purpose: string;
  /** When requested (ISO 8601) */
  requested_at: string;
  /** TTL in seconds */
  expires_in_seconds: number;
}

/**
 * Disclosure response from user
 */
export interface DisclosureResponse {
  /** Request ID */
  request_id: string;
  /** User's address */
  holder_address: string;
  /** Whether approved */
  approved: boolean;
  /** Disclosed attributes */
  disclosed_attributes: AttributeDisclosure[];
  /** When responded (ISO 8601) */
  responded_at: string;
}

/**
 * Single attribute disclosure
 */
export interface AttributeDisclosure {
  /** Which attribute */
  attribute_type: AttributeType;
  /** Decrypted value (if full disclosure) */
  revealed_value?: string;
  /** ZK proof (hex encoded, if selective) */
  zk_proof?: string;
  /** True if using ZK, false if full reveal */
  is_zk_proof: boolean;
}

/**
 * VC Policy defining minting criteria for a VC type
 */
export interface VCPolicy {
  /** Human-readable type name */
  vc_type_name: string;
  /** Enum value */
  vc_type_enum: VCType;
  /** Minimum confidence score required */
  cs_threshold: number;
  /** Required IR completions */
  required_ir_ids: string[];
  /** Required arena (if any) */
  required_arena?: string;
  /** Minimum arena score */
  required_arena_score?: number;
  /** Expiry duration (0 = no expiry) */
  expiry_duration_days: number;
  /** Only one active per user */
  singleton: boolean;
  /** Requires annual renewal */
  requires_annual_renewal: boolean;
  /** Policy details URI */
  metadata_uri?: string;
  /** Policy status */
  status: VCPolicyStatus;
  /** Policy version */
  version: string;
  /** When created (ISO 8601) */
  created_at?: string;
  /** Creation block height */
  created_height?: number;
  /** Governance address */
  creator?: string;
}

/**
 * VCPolicyStatus enum
 */
export enum VCPolicyStatus {
  UNSPECIFIED = 0,
  DRAFT = 1,
  ACTIVE = 2,
  DEPRECATED = 3,
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  total_vcs_minted: number;
  total_active_vcs: number;
  total_revoked_vcs: number;
  total_expired_vcs: number;
  total_dids: number;
  total_policies: number;
  vcs_by_type: Record<string, number>;
}

/**
 * Mint eligibility check response
 */
export interface MintEligibilityResponse {
  /** Whether user is eligible to mint */
  eligible: boolean;
  /** What's missing */
  missing_requirements: string[];
  /** Current confidence score */
  current_cs: number;
  /** Required confidence score */
  required_cs: number;
  /** Completed IR IDs */
  completed_ir_ids: string[];
  /** Required IR IDs */
  required_ir_ids: string[];
}
