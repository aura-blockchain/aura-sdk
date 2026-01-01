/**
 * Aura Blockchain Verifiable Credentials - TypeScript Type Definitions
 *
 * This file contains comprehensive type definitions for the Aura VC system,
 * generated from protobuf definitions in aura/vcregistry/v1beta1.
 *
 * @packageDocumentation
 */

// ============================
// ENUMS
// ============================

/**
 * VCType represents the type of verifiable credential
 */
export enum VCType {
  /** Unspecified VC type */
  VC_TYPE_UNSPECIFIED = 0,

  // Core credentials
  /** Verified Human credential */
  VC_TYPE_VERIFIED_HUMAN = 1,
  /** Age over 18 verification */
  VC_TYPE_AGE_OVER_18 = 2,
  /** Age over 21 verification */
  VC_TYPE_AGE_OVER_21 = 3,
  /** Residency verification */
  VC_TYPE_RESIDENT_OF = 4,
  /** Biometric authentication enabled */
  VC_TYPE_BIOMETRIC_AUTH = 5,
  /** KYC verification completed */
  VC_TYPE_KYC_VERIFICATION = 6,
  /** Notary Public credential */
  VC_TYPE_NOTARY_PUBLIC = 7,
  /** Professional license credential */
  VC_TYPE_PROFESSIONAL_LICENSE = 8,

  // Arena focus credentials
  /** Biometric focus arena credential */
  VC_TYPE_BIOMETRIC_FOCUS = 20,
  /** Social focus arena credential */
  VC_TYPE_SOCIAL_FOCUS = 21,
  /** Geolocation focus arena credential */
  VC_TYPE_GEOLOCATION_FOCUS = 22,
  /** High assurance focus arena credential */
  VC_TYPE_HIGH_ASSURANCE_FOCUS = 23,
  /** Possession focus arena credential */
  VC_TYPE_POSSESSION_FOCUS = 24,
  /** Knowledge focus arena credential */
  VC_TYPE_KNOWLEDGE_FOCUS = 25,
  /** Persistence focus arena credential */
  VC_TYPE_PERSISTENCE_FOCUS = 26,
  /** Specialized focus arena credential */
  VC_TYPE_SPECIALIZED_FOCUS = 27,

  // Custom (governance-defined)
  /** Custom VC types start at 100 */
  VC_TYPE_CUSTOM = 100,
}

/**
 * VCStatus represents the lifecycle status of a credential
 */
export enum VCStatus {
  /** Unspecified status */
  VC_STATUS_UNSPECIFIED = 0,
  /** Minting in progress */
  VC_STATUS_PENDING = 1,
  /** Valid and usable */
  VC_STATUS_ACTIVE = 2,
  /** Permanently revoked */
  VC_STATUS_REVOKED = 3,
  /** Passed expiration date */
  VC_STATUS_EXPIRED = 4,
  /** Temporarily suspended by governance */
  VC_STATUS_SUSPENDED = 5,
}

/**
 * RevocationReason represents why a VC was revoked
 */
export enum RevocationReason {
  /** Unspecified reason */
  REVOCATION_REASON_UNSPECIFIED = 0,
  /** User-initiated revocation */
  REVOCATION_REASON_USER_REQUEST = 1,
  /** Fraud detected and slashed */
  REVOCATION_REASON_FRAUD_DETECTED = 2,
  /** Confidence score dropped below threshold */
  REVOCATION_REASON_CS_BELOW_THRESHOLD = 3,
  /** Required IR was invalidated */
  REVOCATION_REASON_IR_INVALIDATED = 4,
  /** Natural expiration */
  REVOCATION_REASON_EXPIRED = 5,
  /** Governance decision */
  REVOCATION_REASON_GOVERNANCE = 6,
  /** Security incident or compromise */
  REVOCATION_REASON_SECURITY_COMPROMISE = 7,
  /** Policy deprecated */
  REVOCATION_REASON_POLICY_CHANGE = 8,
}

/**
 * AttributeType defines types of identity attributes for selective disclosure
 */
export enum AttributeType {
  /** Unspecified attribute */
  ATTRIBUTE_TYPE_UNSPECIFIED = 0,

  // Personal attributes
  /** Full legal name */
  ATTRIBUTE_TYPE_FULL_NAME = 1,
  /** First name only */
  ATTRIBUTE_TYPE_FIRST_NAME = 2,
  /** Last name only */
  ATTRIBUTE_TYPE_LAST_NAME = 3,
  /** Date of birth */
  ATTRIBUTE_TYPE_DATE_OF_BIRTH = 4,
  /** Age in years */
  ATTRIBUTE_TYPE_AGE = 5,
  /** Gender */
  ATTRIBUTE_TYPE_GENDER = 6,

  // Contact attributes
  /** Email address */
  ATTRIBUTE_TYPE_EMAIL = 10,
  /** Phone number */
  ATTRIBUTE_TYPE_PHONE = 11,
  /** Full address */
  ATTRIBUTE_TYPE_ADDRESS_FULL = 12,
  /** Street address */
  ATTRIBUTE_TYPE_ADDRESS_STREET = 13,
  /** City */
  ATTRIBUTE_TYPE_ADDRESS_CITY = 14,
  /** State or province */
  ATTRIBUTE_TYPE_ADDRESS_STATE = 15,
  /** ZIP or postal code */
  ATTRIBUTE_TYPE_ADDRESS_ZIP = 16,
  /** Country */
  ATTRIBUTE_TYPE_ADDRESS_COUNTRY = 17,

  // Government IDs
  /** Passport number */
  ATTRIBUTE_TYPE_PASSPORT_NUMBER = 20,
  /** Driver's license number */
  ATTRIBUTE_TYPE_DRIVERS_LICENSE = 21,
  /** Social Security Number */
  ATTRIBUTE_TYPE_SSN = 22,
  /** Tax ID number */
  ATTRIBUTE_TYPE_TAX_ID = 23,

  // Physical attributes
  /** Height */
  ATTRIBUTE_TYPE_HEIGHT = 30,
  /** Weight */
  ATTRIBUTE_TYPE_WEIGHT = 31,
  /** Eye color */
  ATTRIBUTE_TYPE_EYE_COLOR = 32,
  /** Hair color */
  ATTRIBUTE_TYPE_HAIR_COLOR = 33,

  // Professional attributes
  /** Occupation */
  ATTRIBUTE_TYPE_OCCUPATION = 40,
  /** Employer name */
  ATTRIBUTE_TYPE_EMPLOYER = 41,
  /** Professional license */
  ATTRIBUTE_TYPE_PROFESSIONAL_LICENSE = 42,
  /** Education level */
  ATTRIBUTE_TYPE_EDUCATION_LEVEL = 43,
  /** Degree earned */
  ATTRIBUTE_TYPE_DEGREE = 44,

  // Special certifications
  /** SCUBA certification */
  ATTRIBUTE_TYPE_SCUBA_CERTIFIED = 50,
  /** Pilot's license */
  ATTRIBUTE_TYPE_PILOTS_LICENSE = 51,
  /** Security clearance level */
  ATTRIBUTE_TYPE_SECURITY_CLEARANCE = 52,

  // Custom
  /** Custom attribute types start at 100 */
  ATTRIBUTE_TYPE_CUSTOM = 100,
}

/**
 * DisclosurePolicyMode defines disclosure behavior for attributes
 */
export enum DisclosurePolicyMode {
  /** Never disclose */
  DISCLOSURE_POLICY_MODE_DENY = 0,
  /** Prompt user each time */
  DISCLOSURE_POLICY_MODE_ASK = 1,
  /** Always disclose */
  DISCLOSURE_POLICY_MODE_ALLOW = 2,
  /** Allow if conditions met */
  DISCLOSURE_POLICY_MODE_CONDITIONAL = 3,
}

// ============================
// ERROR CODES
// ============================

/**
 * Standard error codes for VC verification
 */
export const VC_ERROR_CODES = {
  /** QR code data is invalid or malformed */
  INVALID_QR_CODE: 'INVALID_QR_CODE',
  /** Presentation has expired */
  PRESENTATION_EXPIRED: 'PRESENTATION_EXPIRED',
  /** Signature verification failed */
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  /** VC has been revoked */
  VC_REVOKED: 'VC_REVOKED',
  /** VC has expired */
  VC_EXPIRED: 'VC_EXPIRED',
  /** VC is suspended by governance */
  VC_SUSPENDED: 'VC_SUSPENDED',
  /** VC not found on chain */
  VC_NOT_FOUND: 'VC_NOT_FOUND',
  /** Network connection failed */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** DID resolution failed */
  DID_RESOLUTION_FAILED: 'DID_RESOLUTION_FAILED',
  /** Invalid nonce (replay attack detected) */
  INVALID_NONCE: 'INVALID_NONCE',
  /** General verification error */
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
} as const;

export type VCErrorCode = (typeof VC_ERROR_CODES)[keyof typeof VC_ERROR_CODES];

// ============================
// CORE INTERFACES
// ============================

/**
 * QRCodeData represents the complete data structure encoded in a QR code presentation
 */
export interface QRCodeData {
  /** Unique ID for this presentation */
  presentationId: string;
  /** DID of person presenting */
  holderDid: string;
  /** Bech32 address of holder */
  holderAddress: string;
  /** Array of VC IDs being presented */
  vcIds: string[];
  /** When QR was generated (ISO 8601 timestamp) */
  createdAt: string;
  /** Anti-replay nonce */
  nonce: number;
  /** QR expiration in seconds (e.g., 300 = 5 minutes) */
  expiresInSeconds: number;
  /** Holder's signature over presentation (base64 encoded) */
  signature: string;
  /** Presentation context defining what's disclosed */
  context: PresentationContext;
  /** Selectively disclosed attribute types */
  disclosedAttributes?: AttributeType[];
  /** Full attribute disclosure data */
  attributeDisclosures?: AttributeDisclosure[];
}

/**
 * PresentationContext defines what attributes are disclosed in a presentation
 */
export interface PresentationContext {
  /** Show full legal name */
  showFullName?: boolean;
  /** Show exact age */
  showAge?: boolean;
  /** Show age over 18 proof */
  showAgeOver18?: boolean;
  /** Show age over 21 proof */
  showAgeOver21?: boolean;
  /** Show full address */
  showAddress?: boolean;
  /** Show only city and state */
  showCityStateOnly?: boolean;
  /** Show professional license */
  showProfessionalLicense?: boolean;
  /** Extensible custom attributes */
  customAttributes?: Record<string, boolean>;
  /** Specific attributes to show (selective disclosure) */
  selectiveAttributes?: AttributeType[];
  /** Use zero-knowledge proofs when applicable */
  useZkProofs?: boolean;
}

/**
 * VerificationResult returned to verifier after verification
 */
export interface VerificationResult {
  /** Overall validity of the presentation */
  isValid: boolean;
  /** DID of the person presenting */
  holderDid: string;
  /** Detailed status of each VC in the presentation */
  vcDetails: VCVerificationDetail[];
  /** When verification occurred (ISO 8601 timestamp) */
  verifiedAt: string;
  /** Error message if verification failed */
  verificationError?: string;
  /** Attributes disclosed to verifier */
  attributes?: DiscloseableAttributes;
  /** Disclosed attribute VCs (selective disclosure) */
  disclosedAttributes?: AttributeDisclosure[];
  /** Count of total attributes disclosed */
  totalAttributesDisclosed?: number;
}

/**
 * VCVerificationDetail contains individual VC verification details
 */
export interface VCVerificationDetail {
  /** Unique VC identifier */
  vcId: string;
  /** Type of credential */
  vcType: VCType;
  /** Current status */
  status: VCStatus;
  /** Whether this specific VC is valid */
  isValid: boolean;
  /** Whether this VC has expired */
  isExpired: boolean;
  /** Whether this VC has been revoked */
  isRevoked: boolean;
  /** When VC was issued (ISO 8601 timestamp) */
  issuedAt: string;
  /** When VC expires (ISO 8601 timestamp) */
  expiresAt: string;
}

/**
 * DiscloseableAttributes contains attributes disclosed to verifier
 */
export interface DiscloseableAttributes {
  /** Full legal name (only if showFullName = true) */
  fullName?: string;
  /** Age in years (only if showAge = true) */
  age?: number;
  /** Is over 18 (only if showAgeOver18 = true) */
  isOver18?: boolean;
  /** Is over 21 (only if showAgeOver21 = true) */
  isOver21?: boolean;
  /** Full address (only if showAddress = true) */
  fullAddress?: string;
  /** City and state only (only if showCityStateOnly = true) */
  cityState?: string;
  /** Extensible custom attributes */
  customAttributes?: Record<string, string>;
  /** Attribute values from AttributeVCs (attribute_type -> value) */
  attributeValues?: Record<string, string>;
}

/**
 * AttributeDisclosure represents a single attribute disclosure
 */
export interface AttributeDisclosure {
  /** Type of attribute being disclosed */
  attributeType: AttributeType;
  /** Decrypted value (if full disclosure) */
  revealedValue?: string;
  /** Zero-knowledge proof (if selective disclosure) */
  zkProof?: string;
  /** True if using ZK proof, false if full reveal */
  isZkProof: boolean;
}

// ============================
// VC RECORD TYPES
// ============================

/**
 * VCRecord represents a minted verifiable credential stored on-chain
 */
export interface VCRecord {
  /** Unique identifier */
  vcId: string;
  /** Type of credential */
  vcType: VCType;
  /** Custom type name (if VC_TYPE_CUSTOM) */
  vcTypeCustom?: string;
  /** DID of holder */
  holderDid: string;
  /** Bech32 address of holder */
  holderAddress: string;
  /** Current status */
  status: VCStatus;
  /** When issued (ISO 8601 timestamp) */
  issuedAt: string;
  /** Expiration (ISO 8601 timestamp, null = never expires) */
  expiresAt?: string;
  /** Block height of issuance */
  issuedHeight: number;
  /** SHA256 hash of full credential (hex encoded) */
  credentialHash: string;
  /** Hash of issuing plugin (hex encoded) */
  verifierPluginHash?: string;
  /** AI assistant address that issued */
  issuerAssistant?: string;
  /** Required IR IDs for minting */
  prerequisiteIrIds?: string[];
  /** Extensible metadata */
  metadata?: Record<string, string>;
  /** Confidence score at mint time */
  csAtMint?: number;
  /** Policy version used */
  policyVersion?: string;
}

/**
 * RevocationRecord represents a revoked credential
 */
export interface RevocationRecord {
  /** VC ID that was revoked */
  vcId: string;
  /** When revoked (ISO 8601 timestamp) */
  revokedAt: string;
  /** Block height of revocation */
  revokedHeight: number;
  /** Reason for revocation */
  reason: RevocationReason;
  /** Who revoked (holder DID or "governance") */
  revoker: string;
  /** Evidence (IPFS hash or metadata) */
  evidence?: string;
  /** Merkle proof for trustless verification (hex encoded) */
  merkleProof?: string;
  /** Position in Merkle tree */
  merkleIndex?: number;
}

/**
 * AttributeVC represents a single identity attribute as a VC
 */
export interface AttributeVC {
  /** Unique ID */
  attributeVcId: string;
  /** Owner's address */
  holderAddress: string;
  /** What attribute this is */
  attributeType: AttributeType;
  /** Encrypted attribute value (base64 encoded) */
  encryptedValue: string;
  /** Hash for ZK proofs (hex encoded) */
  valueHash: string;
  /** When issued (ISO 8601 timestamp) */
  issuedAt: string;
  /** When expires (ISO 8601 timestamp) */
  expiresAt: string;
  /** Current status */
  status: VCStatus;
  /** Who verified this attribute */
  issuer: string;
  /** 1-100 confidence level */
  verificationLevel: number;
}

// ============================
// DISCLOSURE TYPES
// ============================

/**
 * DisclosurePolicy defines user's disclosure preferences
 */
export interface DisclosurePolicy {
  /** Owner's address */
  holderAddress: string;
  /** Disclosure rules for specific attributes */
  rules: AttributeDisclosureRule[];
  /** Default mode (default: deny all) */
  defaultMode: DisclosurePolicyMode;
  /** Last updated (ISO 8601 timestamp) */
  updatedAt: string;
}

/**
 * AttributeDisclosureRule defines rules for disclosing a specific attribute
 */
export interface AttributeDisclosureRule {
  /** Attribute type this rule applies to */
  attributeType: AttributeType;
  /** Disclosure mode */
  mode: DisclosurePolicyMode;
  /** Whitelist of allowed verifiers (optional) */
  allowedVerifiers?: string[];
  /** Rate limit (max disclosures per day) */
  maxDisclosuresPerDay?: number;
}

/**
 * DisclosureRequest represents what a verifier is asking for
 */
export interface DisclosureRequest {
  /** Unique request ID */
  requestId: string;
  /** Verifier's blockchain address */
  verifierAddress: string;
  /** Human-readable verifier name (e.g., "Joe's Bar", "DMV") */
  verifierName: string;
  /** Attributes being requested */
  requestedAttributes: AttributeType[];
  /** Purpose of request (e.g., "Age verification for alcohol") */
  purpose: string;
  /** When request was made (ISO 8601 timestamp) */
  requestedAt: string;
  /** Request expiration in seconds */
  expiresInSeconds: number;
}

/**
 * DisclosureResponse represents user's answer to a disclosure request
 */
export interface DisclosureResponse {
  /** Request ID being responded to */
  requestId: string;
  /** Holder's address */
  holderAddress: string;
  /** Whether request was approved */
  approved: boolean;
  /** Disclosed attributes (if approved) */
  disclosedAttributes?: AttributeDisclosure[];
  /** When responded (ISO 8601 timestamp) */
  respondedAt: string;
}

// ============================
// DID TYPES
// ============================

/**
 * DIDDocument represents an on-chain DID document (simplified)
 */
export interface DIDDocument {
  /** Decentralized identifier (e.g., did:aura:mainnet:...) */
  did: string;
  /** Bech32 address controlling this DID */
  controller: string;
  /** Verification methods (public keys) */
  verificationMethods: VerificationMethod[];
  /** List of active VC IDs */
  credentialIds?: string[];
  /** When created (ISO 8601 timestamp) */
  created: string;
  /** Last updated (ISO 8601 timestamp) */
  updated: string;
  /** Full document URI (IPFS) */
  metadataUri?: string;
  /** Service endpoint map */
  serviceEndpoints?: Record<string, string>;
}

/**
 * VerificationMethod represents a public key for verification
 */
export interface VerificationMethod {
  /** Method ID */
  id: string;
  /** Type (e.g., "Ed25519VerificationKey2020") */
  type: string;
  /** DID of controller */
  controller: string;
  /** Raw public key bytes (base64 encoded) */
  publicKey: string;
}

// ============================
// IDENTITY TYPES
// ============================

/**
 * IdentityStatus enum from identity module
 */
export enum IdentityStatus {
  IDENTITY_STATUS_UNSPECIFIED = 0,
  IDENTITY_STATUS_ACTIVE = 1,
  IDENTITY_STATUS_SUSPENDED = 2,
  IDENTITY_STATUS_REVOKED = 3,
  IDENTITY_STATUS_IDLE = 4,
  IDENTITY_STATUS_PENDING_VERIFICATION = 5,
  IDENTITY_STATUS_ERASED = 6,
}

/**
 * IdentityRecord represents a decentralized identity (GDPR-compliant)
 */
export interface IdentityRecord {
  /** Decentralized identifier */
  did: string;
  /** Associated blockchain address */
  address: string;
  /** Current status */
  status: IdentityStatus;
  /** When created (ISO 8601 timestamp) */
  createdAt: string;
  /** Last updated (ISO 8601 timestamp) */
  updatedAt?: string;
  /** Verification methods (public keys, not PII) */
  verificationMethods?: string[];
  /** Confidence score (0-100) */
  confidenceScore?: number;
  /** Metadata hash (hash of off-chain metadata) */
  metadataHash?: string;
  /** Latest IR version */
  latestIrVersion?: string;
  /** Block height of last change */
  lastChangedHeight?: number;
  /** Cryptographic commitment to PII data (SHA-256 hash, hex encoded) */
  piiCommitment?: string;
  /** Salt used in PII commitment (hex encoded) */
  commitmentSalt?: string;
  /** GDPR Right to Erasure flag */
  erased?: boolean;
  /** When erased (ISO 8601 timestamp) */
  erasedAt?: string;
  /** Off-chain data reference (IPFS CID, secure URL, etc.) */
  offChainDataRef?: string;
  /** Off-chain data reference type (ipfs, https, did-document, etc.) */
  offChainDataType?: string;
}

// ============================
// HELPER TYPES
// ============================

/**
 * VCTypeInfo provides human-readable information about VC types
 */
export interface VCTypeInfo {
  /** Enum value */
  type: VCType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon or emoji representation */
  icon?: string;
}

/**
 * AttributeTypeInfo provides human-readable information about attribute types
 */
export interface AttributeTypeInfo {
  /** Enum value */
  type: AttributeType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Whether this is considered sensitive PII */
  isSensitive: boolean;
}

// ============================
// VALIDATION TYPES
// ============================

/**
 * ValidationError represents a validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: VCErrorCode;
}

/**
 * ValidationResult for pre-verification checks
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors (if any) */
  errors?: ValidationError[];
}

// ============================
// UTILITY TYPES
// ============================

/**
 * Timestamp utility type (ISO 8601 string)
 */
export type Timestamp = string;

/**
 * Base64 encoded binary data
 */
export type Base64String = string;

/**
 * Hex encoded binary data
 */
export type HexString = string;

/**
 * Bech32 encoded blockchain address
 */
export type Bech32Address = string;

/**
 * Decentralized Identifier
 */
export type DID = string;

// ============================
// TYPE GUARDS
// ============================

/**
 * Type guard for QRCodeData
 */
export function isQRCodeData(obj: unknown): obj is QRCodeData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as Partial<QRCodeData>;
  return (
    typeof data.presentationId === 'string' &&
    typeof data.holderDid === 'string' &&
    typeof data.holderAddress === 'string' &&
    Array.isArray(data.vcIds) &&
    typeof data.createdAt === 'string' &&
    typeof data.nonce === 'number' &&
    typeof data.expiresInSeconds === 'number' &&
    typeof data.signature === 'string' &&
    typeof data.context === 'object'
  );
}

/**
 * Type guard for VerificationResult
 */
export function isVerificationResult(obj: unknown): obj is VerificationResult {
  if (typeof obj !== 'object' || obj === null) return false;
  const result = obj as Partial<VerificationResult>;
  return (
    typeof result.isValid === 'boolean' &&
    typeof result.holderDid === 'string' &&
    Array.isArray(result.vcDetails) &&
    typeof result.verifiedAt === 'string'
  );
}
