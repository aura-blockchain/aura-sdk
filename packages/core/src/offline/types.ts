/**
 * Offline Verification Types for Aura Verifier SDK
 *
 * Defines types for offline credential caching, synchronization, and revocation checking.
 */

/**
 * Configuration for credential cache
 */
export interface CacheConfig {
  /** Maximum age of cached credentials in seconds (default: 3600) */
  maxAge: number;
  /** Maximum number of cached credentials (default: 1000) */
  maxEntries: number;
  /** Whether to persist cache to disk/localStorage (default: true) */
  persistToDisk: boolean;
  /** Optional encryption key for cache data (hex string) */
  encryptionKey?: string;
  /** Storage adapter to use (default: auto-detect) */
  storageAdapter?: 'memory' | 'browser' | 'file';
  /** Custom storage path for file storage (Node.js only) */
  storagePath?: string;
}

/**
 * Cached credential data structure
 */
export interface CachedCredential {
  /** Verifiable Credential ID */
  vcId: string;
  /** Complete credential data */
  credential: VerifiableCredential;
  /** Credential holder DID */
  holderDid: string;
  /** Credential issuer DID */
  issuerDid: string;
  /** Revocation status at time of caching */
  revocationStatus: {
    isRevoked: boolean;
    merkleRoot?: string;
    checkedAt: Date;
  };
  /** Credential metadata */
  metadata: {
    /** When this credential was cached */
    cachedAt: Date;
    /** When this cache entry expires */
    expiresAt: Date;
    /** Credential issuance date */
    issuedAt?: Date;
    /** Credential expiration date */
    credentialExpiresAt?: Date;
  };
  /** Verification result snapshot */
  lastVerification?: {
    verified: boolean;
    timestamp: Date;
    errors?: string[];
  };
}

/**
 * Verifiable Credential structure (simplified)
 */
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    signature: string;
    [key: string]: unknown;
  };
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cached credentials */
  totalEntries: number;
  /** Number of expired entries */
  expiredEntries: number;
  /** Number of revoked credentials in cache */
  revokedEntries: number;
  /** Total cache size in bytes */
  sizeBytes: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Last sync timestamp */
  lastSyncTime?: Date;
  /** Storage backend in use */
  storageBackend: string;
}

/**
 * Synchronization result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Number of credentials synced */
  credentialsSynced: number;
  /** Whether revocation list was updated */
  revocationListUpdated: boolean;
  /** Timestamp of this sync */
  lastSyncTime: Date;
  /** Any errors encountered during sync */
  errors: SyncError[];
  /** Statistics about the sync operation */
  stats?: {
    credentialsAdded: number;
    credentialsUpdated: number;
    credentialsRemoved: number;
    revocationChecks: number;
  };
}

/**
 * Synchronization error
 */
export interface SyncError {
  /** Error type */
  type: 'network' | 'validation' | 'storage' | 'revocation' | 'unknown';
  /** Error message */
  message: string;
  /** Associated credential ID (if applicable) */
  vcId?: string;
  /** Timestamp of error */
  timestamp: Date;
  /** Whether this error is recoverable */
  recoverable: boolean;
}

/**
 * Revocation list entry
 */
export interface RevocationList {
  /** Merkle root of the revocation tree */
  merkleRoot: string;
  /** Compressed bitmap of revoked credential indices */
  bitmap: Uint8Array;
  /** Total number of credentials in this list */
  totalCredentials: number;
  /** Number of revoked credentials */
  revokedCount: number;
  /** When this list was last updated */
  updatedAt: Date;
  /** Block height at which this list was published */
  blockHeight?: number;
}

/**
 * Merkle proof for revocation verification
 */
export interface MerkleProof {
  /** Credential ID being proven */
  vcId: string;
  /** Position in the Merkle tree */
  index: number;
  /** Merkle siblings (hash path to root) */
  siblings: string[];
  /** Merkle root this proof is for */
  root: string;
  /** Whether credential is revoked */
  isRevoked: boolean;
}

/**
 * Offline verification result
 */
export interface OfflineVerificationResult {
  /** Whether verification was successful */
  verified: boolean;
  /** Whether this verification used cached data */
  fromCache: boolean;
  /** Credential data */
  credential?: CachedCredential;
  /** Revocation status */
  revocationStatus: {
    checked: boolean;
    isRevoked: boolean;
    lastChecked?: Date;
    source: 'cache' | 'online' | 'not-checked';
  };
  /** Verification errors */
  errors: string[];
  /** Verification warnings */
  warnings: string[];
  /** Timestamp of verification */
  timestamp: Date;
}

/**
 * Network connectivity status
 */
export interface ConnectivityStatus {
  /** Whether device is online */
  isOnline: boolean;
  /** Network quality (if available) */
  quality?: 'excellent' | 'good' | 'poor' | 'offline';
  /** Last successful network request */
  lastSuccessfulRequest?: Date;
  /** Whether in offline mode by choice */
  forceOffline: boolean;
}

/**
 * Cache entry metadata (internal)
 */
export interface CacheEntryMetadata {
  key: string;
  sizeBytes: number;
  createdAt: Date;
  expiresAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  /** Get value by key */
  get(key: string): Promise<string | null>;
  /** Set value by key */
  set(key: string, value: string): Promise<void>;
  /** Delete value by key */
  delete(key: string): Promise<void>;
  /** Clear all values */
  clear(): Promise<void>;
  /** List all keys */
  keys(): Promise<string[]>;
  /** Get storage size in bytes */
  size(): Promise<number>;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Encryption algorithm (currently only AES-256-GCM supported) */
  algorithm: 'aes-256-gcm';
  /** Encryption key (32 bytes for AES-256) */
  key: Uint8Array;
  /** Whether to compress data before encryption */
  compress?: boolean;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Encryption algorithm used */
  algorithm: 'aes-256-gcm';
  /** Initialization vector (12 bytes for GCM) */
  iv: string;
  /** Authentication tag (16 bytes for GCM) */
  authTag: string;
  /** Encrypted ciphertext (base64) */
  ciphertext: string;
  /** Optional additional authenticated data */
  aad?: string;
}

/**
 * Auto-sync configuration
 */
export interface AutoSyncConfig {
  /** Whether auto-sync is enabled */
  enabled: boolean;
  /** Sync interval in milliseconds */
  intervalMs: number;
  /** Whether to sync only on WiFi (mobile optimization) */
  wifiOnly?: boolean;
  /** Whether to sync on app startup */
  syncOnStartup?: boolean;
  /** Maximum retry attempts for failed syncs */
  maxRetries?: number;
  /** Backoff multiplier for retries */
  retryBackoff?: number;
}

/**
 * Bitmap index for efficient revocation checking
 */
export interface RevocationBitmap {
  /** Bitmap data */
  data: Uint8Array;
  /** Total bits in bitmap */
  length: number;
  /** Number of set bits (revoked credentials) */
  setBits: number;
}
