# Aura Verifier SDK - API Reference

Complete API documentation for the Aura Verifier SDK v1.0.0.

## Table of Contents

- [Core Classes](#core-classes)
  - [AuraVerifier](#auraverifier)
  - [VerifierSDK](#verifiersdk)
- [Verification API](#verification-api)
- [QR Code Module](#qr-code-module)
- [Network Client](#network-client)
- [Offline Support](#offline-support)
- [Security Module](#security-module)
- [Cryptography](#cryptography)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)
- [Utilities](#utilities)

---

## Core Classes

### AuraVerifier

The main high-level verifier class for validating Aura verifiable presentations.

#### Constructor

```typescript
constructor(config: AuraVerifierConfig)
```

**Parameters:**
- `config: AuraVerifierConfig` - Verifier configuration

**AuraVerifierConfig Interface:**
```typescript
interface AuraVerifierConfig {
  network: NetworkType;           // 'mainnet' | 'testnet' | 'local'
  grpcEndpoint?: string;           // Custom gRPC endpoint (optional)
  restEndpoint?: string;           // Custom REST endpoint (optional)
  offlineMode?: boolean;           // Enable offline mode (default: false)
  cacheConfig?: CacheConfig;       // Cache configuration
  timeout?: number;                // Request timeout in ms (default: 30000)
  verbose?: boolean;               // Enable verbose logging (default: false)
  chainId?: string;                // Custom chain ID (for local networks)
}
```

**Example:**
```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
  offlineMode: false,
  verbose: true,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,
    maxSize: 50
  }
});
```

#### Methods

##### initialize()

Initialize the verifier and test connectivity.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
await verifier.initialize();
```

---

##### verify()

Main verification method for validating credential presentations.

```typescript
async verify(request: VerificationRequest): Promise<VerificationResult>
```

**Parameters:**
- `request: VerificationRequest` - Verification request parameters

**VerificationRequest Interface:**
```typescript
interface VerificationRequest {
  qrCodeData: string;                          // QR code data string
  verifierAddress?: string;                    // Verifier DID/address for audit
  requiredVCTypes?: VCType[];                  // Required credential types
  maxCredentialAge?: number;                   // Max credential age in seconds
  requiredDisclosures?: Partial<DisclosureContext>;
  offlineOnly?: boolean;                       // Use cached data only
}
```

**Returns:**
- `Promise<VerificationResult>` - Verification result

**VerificationResult Interface:**
```typescript
interface VerificationResult {
  isValid: boolean;                           // Overall verification status
  holderDID: string;                          // Holder's DID
  verifiedAt: Date;                           // Verification timestamp
  vcDetails: VCVerificationDetail[];          // Details of each credential
  attributes: DiscloseableAttributes;         // Disclosed attributes
  verificationError?: string;                 // Error message if failed
  auditId: string;                            // Unique audit ID
  networkLatency: number;                     // Network latency in ms
  verificationMethod: VerificationStrategy;   // 'online' | 'offline' | 'cached'
  presentationId: string;                     // Presentation ID from QR
  expiresAt: Date;                            // QR code expiration time
  signatureValid: boolean;                    // Signature verification status
  metadata?: Record<string, unknown>;         // Additional metadata
}
```

**Example:**
```typescript
const result = await verifier.verify({
  qrCodeData: qrString,
  verifierAddress: 'aura1verifier...',
  requiredVCTypes: [VCType.PROOF_OF_HUMANITY],
  maxCredentialAge: 86400 // 24 hours
});

if (result.isValid) {
  console.log('Verification successful!');
  console.log('Holder:', result.holderDID);
  console.log('Credentials:', result.vcDetails);
} else {
  console.error('Verification failed:', result.verificationError);
}
```

---

##### verifyBatch()

Verify multiple credential presentations in batch.

```typescript
async verifyBatch(requests: VerificationRequest[]): Promise<VerificationResult[]>
```

**Parameters:**
- `requests: VerificationRequest[]` - Array of verification requests

**Returns:**
- `Promise<VerificationResult[]>` - Array of verification results

**Example:**
```typescript
const results = await verifier.verifyBatch([
  { qrCodeData: qr1 },
  { qrCodeData: qr2 },
  { qrCodeData: qr3 }
]);

results.forEach((result, index) => {
  console.log(`Verification ${index + 1}:`, result.isValid);
});
```

---

##### Convenience Methods

##### isAge21Plus()

Check if holder is 21+ years old.

```typescript
async isAge21Plus(qrCodeData: string): Promise<boolean>
```

**Example:**
```typescript
const isOver21 = await verifier.isAge21Plus(qrString);
if (isOver21) {
  console.log('Customer is 21+, allow entry');
}
```

---

##### isAge18Plus()

Check if holder is 18+ years old.

```typescript
async isAge18Plus(qrCodeData: string): Promise<boolean>
```

---

##### isVerifiedHuman()

Check if holder has proof-of-humanity credential.

```typescript
async isVerifiedHuman(qrCodeData: string): Promise<boolean>
```

---

##### getAuraScore()

Calculate Aura trust score (0-100).

```typescript
async getAuraScore(qrCodeData: string): Promise<number | null>
```

**Returns:**
- `Promise<number | null>` - Trust score 0-100, or null if verification failed

**Example:**
```typescript
const score = await verifier.getAuraScore(qrString);
console.log(`Trust score: ${score}/100`);
```

---

##### Cache and DID Methods

##### checkCredentialStatus()

Check credential status on-chain.

```typescript
async checkCredentialStatus(vcId: string): Promise<VCStatus>
```

**Returns:**
- `Promise<VCStatus>` - Credential status ('active' | 'revoked' | 'expired' | 'suspended' | 'unknown')

---

##### resolveDID()

Resolve DID document from blockchain.

```typescript
async resolveDID(did: string): Promise<DIDDocument | null>
```

**Returns:**
- `Promise<DIDDocument | null>` - DID document or null if not found

---

##### enableOfflineMode()

Enable offline mode (use cached data only).

```typescript
async enableOfflineMode(): Promise<void>
```

---

##### disableOfflineMode()

Disable offline mode (use online verification).

```typescript
async disableOfflineMode(): Promise<void>
```

---

##### syncCache()

Synchronize cache with blockchain.

```typescript
async syncCache(): Promise<SyncResult>
```

**Returns:**
- `Promise<SyncResult>` - Synchronization result

**SyncResult Interface:**
```typescript
interface SyncResult {
  success: boolean;
  didsSynced: number;
  vcsSynced: number;
  revocationsSynced: number;
  duration: number;
  errors: string[];
  lastSyncAt: Date;
}
```

---

##### Event Handlers

##### on()

Register event handler.

```typescript
on(event: VerifierEvent, handler: EventHandler): void
```

**Event Types:**
- `'verification'` - Verification completed
- `'error'` - Error occurred
- `'sync'` - Cache synchronized
- `'cache_update'` - Cache updated

**Example:**
```typescript
verifier.on('verification', (data: VerificationEventData) => {
  console.log('Verification completed:', data.result.isValid);
});

verifier.on('error', (data: ErrorEventData) => {
  console.error('Error:', data.error.message);
});
```

---

##### off()

Unregister event handler.

```typescript
off(event: VerifierEvent, handler: EventHandler): void
```

---

##### destroy()

Destroy verifier and cleanup resources.

```typescript
async destroy(): Promise<void>
```

**Example:**
```typescript
await verifier.destroy();
```

---

### VerifierSDK

Low-level SDK class for direct blockchain operations.

#### Constructor

```typescript
constructor(config: VerifierConfig)
```

**VerifierConfig Interface:**
```typescript
interface VerifierConfig {
  rpcEndpoint: string;      // RPC endpoint URL (required)
  restEndpoint?: string;    // REST endpoint URL (optional)
  timeout?: number;         // Request timeout in ms (default: 30000)
  debug?: boolean;          // Enable debug logging (default: false)
}
```

**Example:**
```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const sdk = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  timeout: 30000,
  debug: false
});
```

#### Methods

##### verifySignature()

Verify a cryptographic signature.

```typescript
async verifySignature(request: SignatureVerificationRequest): Promise<VerificationResult>
```

**SignatureVerificationRequest Interface:**
```typescript
interface SignatureVerificationRequest {
  publicKey: string;              // Public key in hex format
  message: string | Uint8Array;   // Message to verify
  signature: string;              // Signature in hex format
  algorithm: SignatureAlgorithm;  // 'ed25519' | 'secp256k1'
}
```

**Example:**
```typescript
const result = await sdk.verifySignature({
  publicKey: 'a1b2c3...',
  message: 'Hello, Aura!',
  signature: 'd4e5f6...',
  algorithm: 'ed25519'
});

console.log('Signature valid:', result.valid);
```

---

##### verifyTransaction()

Verify a Cosmos SDK transaction on-chain.

```typescript
async verifyTransaction(request: TransactionVerificationRequest): Promise<VerificationResult>
```

**TransactionVerificationRequest Interface:**
```typescript
interface TransactionVerificationRequest {
  txHash: string;           // Transaction hash
  signerAddress: string;    // Expected signer address
  chainId: string;          // Chain ID
}
```

---

##### hash()

Hash data using specified algorithm.

```typescript
hash(request: HashRequest): string | Uint8Array
```

**HashRequest Interface:**
```typescript
interface HashRequest {
  data: string | Uint8Array;
  algorithm: HashAlgorithm;      // 'sha256' | 'sha512' | 'keccak256'
  encoding?: 'hex' | 'base64' | 'bytes';
}
```

---

##### deriveAddress()

Derive blockchain address from public key.

```typescript
deriveAddress(request: AddressDerivationRequest): string
```

**AddressDerivationRequest Interface:**
```typescript
interface AddressDerivationRequest {
  publicKey: string;
  publicKeyFormat: PublicKeyFormat;  // 'hex' | 'base64' | 'bech32'
  prefix: string;                    // Address prefix (e.g., 'aura')
  algorithm: SignatureAlgorithm;     // 'ed25519' | 'secp256k1'
}
```

---

##### getHeight()

Get current blockchain height.

```typescript
async getHeight(): Promise<number>
```

---

##### getChainId()

Get blockchain chain ID.

```typescript
async getChainId(): Promise<string>
```

---

##### disconnect()

Disconnect from RPC endpoint.

```typescript
async disconnect(): Promise<void>
```

---

## QR Code Module

### Functions

#### parseQRCode()

Parse QR code string to structured data.

```typescript
function parseQRCode(
  qrString: string,
  options?: QRParserOptions
): QRCodeData
```

**Parameters:**
- `qrString: string` - QR code data string
- `options?: QRParserOptions` - Parser options

**Returns:**
- `QRCodeData` - Parsed QR code data

**QRCodeData Interface:**
```typescript
interface QRCodeData {
  v: string;              // Protocol version
  p: string;              // Presentation ID
  h: string;              // Holder DID
  vcs: string[];          // Verifiable Credential IDs
  ctx: DisclosureContext; // Disclosure context
  exp: number;            // Expiration timestamp (Unix)
  n: number;              // Nonce
  sig: string;            // Signature (hex)
}
```

**Example:**
```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

const qrData = parseQRCode('aura://verify?data=...');
console.log('Holder DID:', qrData.h);
console.log('Credentials:', qrData.vcs);
```

---

#### parseQRCodeSafe()

Safe version that returns result object instead of throwing.

```typescript
function parseQRCodeSafe(
  qrString: string,
  options?: QRParserOptions
): ParseResult
```

**ParseResult Interface:**
```typescript
interface ParseResult {
  success: boolean;
  data?: QRCodeData;
  error?: string;
}
```

---

#### validateQRCodeData()

Validate parsed QR code data.

```typescript
function validateQRCodeData(
  qrData: QRCodeData,
  options?: QRValidatorOptions
): ValidationResult
```

**ValidationResult Interface:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
```

---

#### parseAndValidateQRCode()

Parse and validate QR code in one step.

```typescript
function parseAndValidateQRCode(
  qrString: string,
  options?: {
    strict?: boolean;
    checkExpiration?: boolean;
    expirationTolerance?: number;
    validateDID?: boolean;
    validateSignature?: boolean;
  }
): QRCodeData
```

---

## Network Client

### AuraClient

Low-level client for Aura blockchain interactions.

#### Constructor

```typescript
constructor(config: AuraClientConfig)
```

**AuraClientConfig Interface:**
```typescript
interface AuraClientConfig {
  grpcEndpoint: string;
  restEndpoint?: string;
  timeout?: number;
  retryConfig?: RetryConfig;
}
```

#### Factory Functions

```typescript
function createAuraClient(config: AuraClientConfig): AuraClient
function connectAuraClient(config: AuraClientConfig): Promise<AuraClient>
```

---

## Offline Support

### CredentialCache

Credential caching for offline verification.

#### Constructor

```typescript
constructor(config?: Partial<CacheConfig>)
```

#### Methods

```typescript
async get(vcId: string): Promise<CachedCredential | null>
async set(vcId: string, credential: CachedCredential): Promise<void>
async delete(vcId: string): Promise<boolean>
async clear(): Promise<void>
async getStats(): Promise<CacheStats>
```

---

### CacheSync

Synchronization between cache and blockchain.

#### Constructor

```typescript
constructor(client: AuraClient, cache: CredentialCache)
```

#### Methods

```typescript
async sync(): Promise<SyncResult>
startAutoSync(intervalMs: number, options?: AutoSyncConfig): void
stopAutoSync(): void
```

---

### createOfflineVerifier()

Factory function for complete offline verification setup.

```typescript
function createOfflineVerifier(options: {
  client: AuraClient;
  cacheConfig?: Partial<CacheConfig>;
  autoSync?: {
    enabled: boolean;
    intervalMs: number;
    syncOnStartup?: boolean;
    wifiOnly?: boolean;
  };
})
```

**Example:**
```typescript
import { createOfflineVerifier, createAuraClient } from '@aura-network/verifier-sdk';

const client = createAuraClient({
  grpcEndpoint: 'https://grpc.aura.network:9090',
  restEndpoint: 'https://lcd.aura.network'
});

const offlineVerifier = createOfflineVerifier({
  client,
  cacheConfig: {
    maxAge: 3600,
    maxEntries: 1000,
    persistToDisk: true
  },
  autoSync: {
    enabled: true,
    intervalMs: 300000, // 5 minutes
    syncOnStartup: true
  }
});

// Verify credential
const result = await offlineVerifier.verify('vc-123');
console.log('Verified:', result.verified);
```

---

## Security Module

### NonceManager

Prevent replay attacks with nonce tracking.

#### Constructor

```typescript
constructor(config?: NonceManagerConfig)
```

**NonceManagerConfig Interface:**
```typescript
interface NonceManagerConfig {
  nonceWindow?: number;      // Nonce validity window in ms (default: 300000)
  cleanupInterval?: number;  // Cleanup interval in ms (default: 60000)
}
```

#### Methods

```typescript
async validateNonce(nonce: string, timestamp: number): Promise<boolean>
async invalidateNonce(nonce: string): Promise<void>
stop(): void
```

**Example:**
```typescript
import { NonceManager } from '@aura-network/verifier-sdk';

const nonceManager = new NonceManager({ nonceWindow: 300000 });

const isValid = await nonceManager.validateNonce('nonce123', Date.now());
if (!isValid) {
  throw new Error('Invalid or replayed nonce');
}
```

---

### RateLimiter

Protect against abuse with rate limiting.

#### Constructor

```typescript
constructor(config?: RateLimiterConfig)
```

**RateLimiterConfig Interface:**
```typescript
interface RateLimiterConfig {
  maxRequests?: number;    // Max requests per window (default: 100)
  windowMs?: number;       // Time window in ms (default: 60000)
  burstCapacity?: number;  // Burst capacity (default: 120)
}
```

#### Methods

```typescript
async checkLimit(identifier: string): Promise<boolean>
async getRemainingRequests(identifier: string): Promise<number>
reset(identifier: string): void
stop(): void
```

**Example:**
```typescript
import { RateLimiter } from '@aura-network/verifier-sdk';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000
});

const allowed = await limiter.checkLimit('user-did');
if (!allowed) {
  throw new Error('Rate limit exceeded');
}
```

---

### AuditLogger

Tamper-evident audit logging.

#### Constructor

```typescript
constructor(config?: AuditLoggerConfig)
```

#### Methods

```typescript
async logVerificationAttempt(params: {
  actor: string;
  target: string;
  outcome: AuditOutcome;
  details?: Record<string, unknown>;
}): Promise<void>

async logAccess(params: {
  actor: string;
  resource: string;
  action: string;
}): Promise<void>

async getLogs(filter?: {
  startTime?: Date;
  endTime?: Date;
  actor?: string;
  category?: AuditCategory;
}): Promise<AuditLogEntry[]>

stop(): void
```

**Example:**
```typescript
import { AuditLogger, AuditOutcome } from '@aura-network/verifier-sdk';

const logger = new AuditLogger({ enableChaining: true });

await logger.logVerificationAttempt({
  actor: 'did:aura:verifier123',
  target: 'vc-456',
  outcome: AuditOutcome.SUCCESS,
  details: { ip: '192.168.1.1' }
});
```

---

### ThreatDetector

Behavioral analysis for threat detection.

#### Constructor

```typescript
constructor(config?: ThreatDetectorConfig)
```

#### Methods

```typescript
async recordRequest(identifier: string, metadata?: Record<string, unknown>): Promise<void>
async recordFailure(identifier: string, reason: string): Promise<void>
async getThreatLevel(identifier: string): Promise<ThreatLevel>
stop(): void
```

---

### createSecureVerifier()

Factory function for secure verifier with all protections.

```typescript
function createSecureVerifier(config?: SecurityConfig): SecureVerifierContext
```

**Example:**
```typescript
import { createSecureVerifier } from '@aura-network/verifier-sdk';

const secureContext = createSecureVerifier({
  enableNonceTracking: true,
  enableRateLimiting: true,
  enableAuditLogging: true,
  enableThreatDetection: true,
  threatConfig: {
    onThreatDetected: (event) => {
      console.error('Threat detected:', event);
    }
  }
});

// Use security components
await secureContext.nonceManager?.validateNonce('nonce', Date.now());
await secureContext.rateLimiter?.checkLimit('user-id');

// Cleanup
secureContext.cleanup();
```

---

## Cryptography

### Ed25519 Signature Verification

```typescript
async function verifyEd25519Signature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean>

function verifyEd25519SignatureSync(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): boolean

function isValidEd25519PublicKey(publicKey: Uint8Array): boolean
function isValidEd25519Signature(signature: Uint8Array): boolean

const ED25519_PUBLIC_KEY_LENGTH = 32
const ED25519_SIGNATURE_LENGTH = 64
```

---

### Secp256k1 Signature Verification

```typescript
async function verifySecp256k1Signature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean>

function verifySecp256k1SignatureSync(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): boolean

function isValidSecp256k1PublicKey(publicKey: Uint8Array): boolean
function isValidSecp256k1Signature(signature: Uint8Array): boolean

const SECP256K1_COMPRESSED_PUBLIC_KEY_LENGTH = 33
const SECP256K1_UNCOMPRESSED_PUBLIC_KEY_LENGTH = 65
const SECP256K1_SIGNATURE_LENGTH = 64
```

---

### Hash Utilities

```typescript
function sha256Hash(data: Uint8Array): Uint8Array
function sha256HashHex(data: string | Uint8Array): string
function hexToUint8Array(hex: string): Uint8Array
function uint8ArrayToHex(bytes: Uint8Array): string
function isValidHexString(hex: string): boolean
```

---

### Encryption Utilities

```typescript
async function encrypt(
  plaintext: Uint8Array,
  key: Uint8Array
): Promise<EncryptedData>

async function decrypt(
  encrypted: EncryptedData,
  key: Uint8Array
): Promise<Uint8Array>

async function encryptString(
  plaintext: string,
  key: Uint8Array
): Promise<EncryptedData>

async function decryptString(
  encrypted: EncryptedData,
  key: Uint8Array
): Promise<string>

async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations?: number
): Promise<Uint8Array>

function generateEncryptionKey(): Uint8Array
```

---

## Error Handling

### Error Classes

#### AuraVerifierError

Base error class for all SDK errors.

```typescript
class AuraVerifierError extends Error {
  constructor(message: string, code: ErrorCode, details?: unknown)

  readonly code: ErrorCode
  readonly details?: unknown
}
```

#### VerificationError

Verification-specific errors.

```typescript
class VerificationError extends AuraVerifierError {
  static qrParseError(details?: unknown): VerificationError
  static qrExpired(expiresAt: Date): VerificationError
  static invalidSignature(details?: unknown): VerificationError
  static didResolutionFailed(did: string): VerificationError
  static vcRevoked(vcId: string): VerificationError
  static vcExpired(vcId: string, expiresAt: Date): VerificationError
  static networkError(details?: unknown): VerificationError
  static timeout(timeoutMs: number): VerificationError
}
```

#### Network Errors

```typescript
class NetworkError extends AuraVerifierError
class TimeoutError extends NetworkError
class NodeUnavailableError extends NetworkError
class APIError extends NetworkError
class RetryExhaustedError extends NetworkError
```

#### Credential Errors

```typescript
class CredentialRevokedError extends AuraVerifierError
class CredentialExpiredError extends AuraVerifierError
class CredentialNotFoundError extends AuraVerifierError
```

#### QR Code Errors

```typescript
class QRCodeError extends AuraVerifierError
class QRParseError extends QRCodeError
class QRValidationError extends QRCodeError
class QRExpiredError extends QRCodeError
class QRNonceError extends QRCodeError
```

---

## Type Definitions

### Enums

#### VCType

```typescript
enum VCType {
  GOVERNMENT_ID = 'GovernmentID',
  BIOMETRIC = 'BiometricVerification',
  AGE_VERIFICATION = 'AgeVerification',
  ADDRESS_PROOF = 'AddressProof',
  KYC = 'KYC',
  PROOF_OF_HUMANITY = 'ProofOfHumanity',
  CUSTOM = 'Custom'
}
```

#### VCStatus

```typescript
enum VCStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  UNKNOWN = 'unknown'
}
```

---

### Constants

```typescript
const NETWORK_ENDPOINTS: Record<NetworkType, NetworkEndpoints>
const DEFAULT_CONFIG: Required<AuraVerifierConfig>
const ERROR_CODES: Record<string, ErrorCode>
const VC_TYPES: Record<string, VCTypeValue>
const VC_STATUSES: Record<string, VCStatusValue>
```

---

## Utilities

### DID Utilities

```typescript
function generateAuditId(): string
function formatDID(network: string, identifier: string): string
function isValidDID(did: string): boolean
function extractDIDNetwork(did: string): string
function extractDIDIdentifier(did: string): string
```

### Time Utilities

```typescript
function timestampToDate(timestamp: number): Date
function dateToTimestamp(date: Date): number
function getCurrentTimestamp(): number
function isExpired(expiresAt: number | Date): boolean
function getTimeRemaining(expiresAt: number | Date): number
function formatTimestamp(timestamp: number | Date): string
```

### General Utilities

```typescript
function generateNonce(): number
function sanitizeForLog(data: unknown): unknown
function deepClone<T>(obj: T): T
function sleep(ms: number): Promise<void>
function retry<T>(fn: () => Promise<T>, options: RetryConfig): Promise<T>
function isBrowser(): boolean
function isNode(): boolean
```

---

## See Also

- [Quick Start Guide](./quick-start.md)
- [Security Guide](./security-guide.md)
- [Migration Guide](./migration-guide.md)
- [Examples](./examples/)
