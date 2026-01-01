# AuraVerifier API Reference

Complete API reference for the `AuraVerifier` class - the main entry point for credential verification.

## Class: AuraVerifier

The primary class for verifying Aura Network credentials.

### Constructor

```typescript
new AuraVerifier(config: AuraVerifierConfig)
```

Creates a new `AuraVerifier` instance.

**Parameters:**
- `config` - Configuration object (see [Configuration](../getting-started/configuration.md))

**Example:**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
  verbose: false,
});
```

**Throws:**
- `ConfigurationError` - If configuration is invalid

---

## Instance Methods

### initialize()

```typescript
async initialize(): Promise<void>
```

Initializes the verifier and establishes blockchain connectivity. Must be called before verification operations.

**Returns:** Promise that resolves when initialization is complete

**Throws:**
- `NetworkError` - If unable to connect to blockchain
- `ConfigurationError` - If configuration is invalid

**Example:**
```typescript
const verifier = new AuraVerifier({ network: 'mainnet' });
await verifier.initialize();
```

---

### verify()

```typescript
async verify(request: VerificationRequest): Promise<VerificationResult>
```

Verifies a credential presentation from a QR code.

**Parameters:**
- `request` - Verification request object

```typescript
interface VerificationRequest {
  qrCodeData: string;                    // QR code string
  verifierAddress?: string;              // Optional verifier DID/address
  requiredVCTypes?: VCType[];           // Required credential types
  maxCredentialAge?: number;            // Max age in seconds
  requiredDisclosures?: Partial<DisclosureContext>;
  offlineOnly?: boolean;                // Use cache only
}
```

**Returns:** Promise resolving to `VerificationResult`

```typescript
interface VerificationResult {
  isValid: boolean;                      // Overall status
  holderDID: string;                     // Holder's DID
  verifiedAt: Date;                      // Verification timestamp
  vcDetails: VCVerificationDetail[];     // Credential details
  attributes: DiscloseableAttributes;    // Disclosed attributes
  verificationError?: string;            // Error if failed
  auditId: string;                       // Unique audit ID
  networkLatency: number;                // Response time (ms)
  verificationMethod: VerificationMethod;// 'online' | 'offline' | 'cached'
  presentationId: string;                // Presentation ID
  expiresAt: Date;                       // QR expiration time
  signatureValid: boolean;               // Signature status
  metadata?: Record<string, unknown>;    // Additional data
}
```

**Throws:**
- `QRParseError` - If QR code parsing fails
- `QRExpiredError` - If QR code has expired
- `VerificationError` - If verification fails
- `NetworkError` - If network request fails
- `TimeoutError` - If request times out

**Example:**
```typescript
try {
  const result = await verifier.verify({
    qrCodeData: qrString,
    requiredVCTypes: [VCType.AGE_VERIFICATION],
  });

  if (result.isValid) {
    console.log('Verified!', result.attributes);
  } else {
    console.log('Failed:', result.verificationError);
  }
} catch (error) {
  console.error('Error:', error);
}
```

---

### verifyBatch()

```typescript
async verifyBatch(requests: VerificationRequest[]): Promise<VerificationResult[]>
```

Verifies multiple credentials concurrently.

**Parameters:**
- `requests` - Array of verification requests

**Returns:** Promise resolving to array of `VerificationResult` (errors are filtered out)

**Example:**
```typescript
const requests = [
  { qrCodeData: qr1 },
  { qrCodeData: qr2 },
  { qrCodeData: qr3 },
];

const results = await verifier.verifyBatch(requests);

for (const result of results) {
  console.log(result.holderDID, result.isValid);
}
```

See [Batch Verification Guide](../guides/batch-verification.md) for details.

---

### isAge21Plus()

```typescript
async isAge21Plus(qrCodeData: string): Promise<boolean>
```

Convenience method to check if holder is 21 years or older.

**Parameters:**
- `qrCodeData` - QR code string

**Returns:** `true` if verified and over 21, `false` otherwise

**Example:**
```typescript
const isOver21 = await verifier.isAge21Plus(qrCodeData);

if (isOver21) {
  console.log('Allow alcohol service');
} else {
  console.log('Deny - under 21');
}
```

---

### isAge18Plus()

```typescript
async isAge18Plus(qrCodeData: string): Promise<boolean>
```

Convenience method to check if holder is 18 years or older.

**Parameters:**
- `qrCodeData` - QR code string

**Returns:** `true` if verified and over 18, `false` otherwise

**Example:**
```typescript
const isOver18 = await verifier.isAge18Plus(qrCodeData);

if (isOver18) {
  console.log('Allow adult content');
}
```

---

### isVerifiedHuman()

```typescript
async isVerifiedHuman(qrCodeData: string): Promise<boolean>
```

Convenience method to check if holder has proof-of-humanity and biometric credentials.

**Parameters:**
- `qrCodeData` - QR code string

**Returns:** `true` if verified human, `false` otherwise

**Example:**
```typescript
const isHuman = await verifier.isVerifiedHuman(qrCodeData);

if (isHuman) {
  console.log('Verified human - no bot');
}
```

---

### getAuraScore()

```typescript
async getAuraScore(qrCodeData: string): Promise<number | null>
```

Calculates an Aura trust score (0-100) based on credential diversity, on-chain presence, and signature validity.

**Parameters:**
- `qrCodeData` - QR code string

**Returns:** Score from 0-100, or `null` if verification failed

**Scoring:**
- Base: 30 points for valid verification
- Credential diversity: Up to 30 points (10 per unique VC type)
- On-chain presence: Up to 20 points (10 per on-chain VC)
- Signature validity: 20 points

**Example:**
```typescript
const score = await verifier.getAuraScore(qrCodeData);

if (score !== null) {
  if (score >= 80) {
    console.log('High trust - full access');
  } else if (score >= 50) {
    console.log('Medium trust - limited access');
  } else {
    console.log('Low trust - additional verification needed');
  }
}
```

---

### checkCredentialStatus()

```typescript
async checkCredentialStatus(vcId: string): Promise<VCStatus>
```

Checks the status of a specific credential on-chain.

**Parameters:**
- `vcId` - Verifiable Credential ID

**Returns:** Credential status enum value

```typescript
enum VCStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  UNKNOWN = 'unknown',
}
```

**Example:**
```typescript
const status = await verifier.checkCredentialStatus('vc-123');

switch (status) {
  case VCStatus.ACTIVE:
    console.log('Credential is active');
    break;
  case VCStatus.REVOKED:
    console.log('Credential has been revoked');
    break;
  case VCStatus.EXPIRED:
    console.log('Credential has expired');
    break;
}
```

---

### resolveDID()

```typescript
async resolveDID(did: string): Promise<DIDDocument | null>
```

Resolves a DID to its DID Document.

**Parameters:**
- `did` - Decentralized Identifier string (e.g., `did:aura:mainnet:abc123`)

**Returns:** DID Document or `null` if not found

**Example:**
```typescript
const didDoc = await verifier.resolveDID('did:aura:mainnet:abc123');

if (didDoc) {
  console.log('DID resolved:', didDoc.id);
  console.log('Verification methods:', didDoc.verificationMethod);
}
```

---

### enableOfflineMode()

```typescript
async enableOfflineMode(): Promise<void>
```

Enables offline mode - uses cached data only, no network requests.

**Example:**
```typescript
await verifier.enableOfflineMode();
console.log('Offline mode enabled');
```

---

### disableOfflineMode()

```typescript
async disableOfflineMode(): Promise<void>
```

Disables offline mode - resumes network requests.

**Example:**
```typescript
await verifier.disableOfflineMode();
console.log('Online mode enabled');
```

---

### syncCache()

```typescript
async syncCache(): Promise<SyncResult>
```

Synchronizes local cache with blockchain data.

**Returns:** Synchronization result

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

**Example:**
```typescript
const result = await verifier.syncCache();

console.log('Sync complete:');
console.log('- VCs synced:', result.vcsSynced);
console.log('- DIDs synced:', result.didsSynced);
console.log('- Duration:', result.duration, 'ms');
```

---

### on()

```typescript
on(event: VerifierEvent, handler: EventHandler): void
```

Registers an event handler.

**Parameters:**
- `event` - Event type: `'verification'` | `'error'` | `'sync'` | `'cache_update'`
- `handler` - Event handler function

**Example:**
```typescript
verifier.on('verification', (data: VerificationEventData) => {
  console.log('Verification:', data.result.auditId, data.result.isValid);
  logToDatabase(data);
});

verifier.on('error', (data: ErrorEventData) => {
  console.error('Error:', data.error.message);
  alertOps(data);
});

verifier.on('sync', (data: SyncEventData) => {
  console.log('Cache synced:', data.result.vcsSynced, 'VCs');
});
```

---

### off()

```typescript
off(event: VerifierEvent, handler: EventHandler): void
```

Unregisters an event handler.

**Parameters:**
- `event` - Event type
- `handler` - Handler function to remove

**Example:**
```typescript
const handler = (data) => console.log(data);

verifier.on('verification', handler);
// ... later
verifier.off('verification', handler);
```

---

### destroy()

```typescript
async destroy(): Promise<void>
```

Destroys the verifier instance, saves cache, and cleans up resources. Call before application shutdown.

**Example:**
```typescript
process.on('SIGTERM', async () => {
  await verifier.destroy();
  process.exit(0);
});
```

---

## Configuration Properties

### config

```typescript
config: Required<AuraVerifierConfig>
```

Read-only configuration object. Access via:

```typescript
console.log('Network:', verifier.config.network);
console.log('Timeout:', verifier.config.timeout);
console.log('Offline mode:', verifier.config.offlineMode);
```

---

## Event Types

### VerificationEventData

```typescript
interface VerificationEventData {
  result: VerificationResult;
  request: VerificationRequest;
  timestamp: Date;
}
```

### ErrorEventData

```typescript
interface ErrorEventData {
  error: Error;
  context: string;
  timestamp: Date;
  request?: VerificationRequest;
}
```

### SyncEventData

```typescript
interface SyncEventData {
  result: SyncResult;
  timestamp: Date;
}
```

### CacheUpdateEventData

```typescript
interface CacheUpdateEventData {
  itemType: 'did' | 'vc' | 'revocation';
  itemId: string;
  operation: 'add' | 'update' | 'delete';
  timestamp: Date;
}
```

---

## Common Patterns

### Singleton Pattern

Create once, use everywhere:

```typescript
// verifier.ts
export const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
});

await verifier.initialize();

// app.ts
import { verifier } from './verifier';

app.post('/verify', async (req, res) => {
  const result = await verifier.verify({ qrCodeData: req.body.qr });
  res.json(result);
});
```

### Error Handling Pattern

```typescript
async function safeVerify(qrCodeData: string) {
  try {
    const result = await verifier.verify({ qrCodeData });
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof QRExpiredError) {
      return { success: false, error: 'QR expired', userError: true };
    } else if (error instanceof NetworkError) {
      return { success: false, error: 'Network error', retry: true };
    } else {
      return { success: false, error: error.message, fatal: true };
    }
  }
}
```

### Lifecycle Management

```typescript
class VerificationService {
  private verifier: AuraVerifier;

  async start() {
    this.verifier = new AuraVerifier({ network: 'mainnet' });
    await this.verifier.initialize();
    this.setupEventHandlers();
  }

  async stop() {
    await this.verifier.destroy();
  }

  private setupEventHandlers() {
    this.verifier.on('error', this.handleError.bind(this));
    this.verifier.on('verification', this.handleVerification.bind(this));
  }

  private async handleError(data: ErrorEventData) {
    // Handle errors
  }

  private async handleVerification(data: VerificationEventData) {
    // Handle verifications
  }
}
```

---

## See Also

- [Configuration Guide](../getting-started/configuration.md)
- [Error Handling Guide](../guides/error-handling.md)
- [QR Parser API](./qr-parser.md)
- [Type Reference](./types.md)
