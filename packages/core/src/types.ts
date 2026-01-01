/**
 * Type definitions for the Aura Verifier SDK
 */

/**
 * Supported signature algorithms
 */
export type SignatureAlgorithm = 'ed25519' | 'secp256k1';

/**
 * Verification result
 */
export interface VerificationResult {
  /** Whether the verification was successful */
  valid: boolean;
  /** Error message if verification failed */
  error?: string;
  /** Additional metadata about the verification */
  metadata?: Record<string, unknown>;
}

/**
 * Signature verification request
 */
export interface SignatureVerificationRequest {
  /** Public key in hex format */
  publicKey: string;
  /** Message to verify (raw bytes or hex string) */
  message: string | Uint8Array;
  /** Signature in hex format */
  signature: string;
  /** Signature algorithm to use */
  algorithm: SignatureAlgorithm;
}

/**
 * Cosmos transaction verification request
 */
export interface TransactionVerificationRequest {
  /** Transaction hash */
  txHash: string;
  /** Expected signer address */
  signerAddress: string;
  /** Chain ID */
  chainId: string;
}

/**
 * Verifier SDK configuration
 */
export interface VerifierConfig {
  /** RPC endpoint URL */
  rpcEndpoint: string;
  /** Optional REST API endpoint */
  restEndpoint?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Hash algorithm options
 */
export type HashAlgorithm = 'sha256' | 'sha512' | 'keccak256';

/**
 * Hash request
 */
export interface HashRequest {
  /** Data to hash */
  data: string | Uint8Array;
  /** Hash algorithm to use */
  algorithm: HashAlgorithm;
  /** Output encoding */
  encoding?: 'hex' | 'base64' | 'bytes';
}

/**
 * Public key format
 */
export type PublicKeyFormat = 'hex' | 'base64' | 'bech32';

/**
 * Address derivation request
 */
export interface AddressDerivationRequest {
  /** Public key */
  publicKey: string;
  /** Public key format */
  publicKeyFormat: PublicKeyFormat;
  /** Address prefix (e.g., 'aura', 'cosmos') */
  prefix: string;
  /** Signature algorithm */
  algorithm: SignatureAlgorithm;
}
