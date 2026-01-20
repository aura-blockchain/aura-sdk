# Verification Flow

This document explains the complete credential verification flow in the Aura Network ecosystem, from QR code generation to final verification.

## Table of Contents

- [Overview](#overview)
- [Actors and Roles](#actors-and-roles)
- [QR Code Format](#qr-code-format)
- [Verification Steps](#verification-steps)
- [Signature Verification](#signature-verification)
- [Blockchain Queries](#blockchain-queries)
- [Result Interpretation](#result-interpretation)
- [Security Considerations](#security-considerations)

## Overview

The Aura verification flow enables privacy-preserving credential verification without revealing unnecessary personal information. The process uses:

1. **Selective Disclosure**: Holders choose what information to reveal
2. **Cryptographic Signatures**: Prove authenticity without trusted intermediaries
3. **Blockchain Verification**: Validate credential status and revocation
4. **QR Code Transport**: Simple, user-friendly credential presentation

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Holder    │────1───>│   Verifier   │────3───>│  Blockchain │
│  (Mobile)   │<───2────│   (Scanner)  │<───4────│   (Aura)    │
└─────────────┘         └──────────────┘         └─────────────┘

1. Present QR code
2. Access granted/denied
3. Query credential status
4. Return revocation status
```

## Actors and Roles

### Holder (Credential Owner)

The individual who possesses a verifiable credential on their mobile device.

**Responsibilities:**

- Generate credential presentations with selective disclosure
- Create QR codes for verification
- Sign presentations with their private key
- Control what information is revealed

### Verifier (Third Party)

The business or organization verifying credentials (bars, marketplaces, etc.).

**Responsibilities:**

- Scan QR codes from holders
- Verify cryptographic signatures
- Check credential status on blockchain
- Make access/authorization decisions

### Issuer (Credential Authority)

The trusted entity that originally issued the credential (e.g., government, university).

**Responsibilities:**

- Issue verifiable credentials to holders
- Publish public keys on blockchain
- Maintain revocation lists
- Update credential status

### Blockchain (Aura Network)

The decentralized ledger storing public keys, credential schemas, and revocation data.

**Responsibilities:**

- Store issuer public keys
- Maintain credential revocation lists
- Provide immutable audit trail
- Enable trustless verification

## QR Code Format

### URL Structure

Aura QR codes follow this format:

```
aura://verify?data=<base64_encoded_json>
```

**Components:**

- `aura://` - Custom URI scheme for Aura protocol
- `verify` - Action type (verification request)
- `data` - Query parameter containing base64-encoded JSON payload

### JSON Payload Structure

When decoded, the base64 data contains a JSON object:

```json
{
  "v": "1.0",
  "p": "presentation-request-123",
  "h": "did:aura:mainnet:aura1xyz...",
  "vcs": ["vc-id-123", "vc-id-456"],
  "ctx": {
    "show_age_over_21": true,
    "show_city_state": false
  },
  "exp": 1735560000,
  "n": 123456,
  "sig": "abcdef123456789..."
}
```

**Field Descriptions:**

| Field | Type     | Description                                        |
| ----- | -------- | -------------------------------------------------- |
| `v`   | string   | Protocol version (currently "1.0")                 |
| `p`   | string   | Unique presentation ID for this request            |
| `h`   | string   | Holder's DID containing their public key           |
| `vcs` | string[] | Array of Verifiable Credential IDs being presented |
| `ctx` | object   | Disclosure context (what to reveal)                |
| `exp` | number   | Expiration timestamp (Unix seconds)                |
| `n`   | number   | Nonce for replay attack prevention                 |
| `sig` | string   | Holder's signature over the presentation           |

### Disclosure Context

The `ctx` object specifies selective disclosure:

```typescript
interface DisclosureContext {
  // Age verification
  show_age?: boolean; // Reveal exact age
  show_age_over_18?: boolean; // Prove over 18 (yes/no only)
  show_age_over_21?: boolean; // Prove over 21 (yes/no only)

  // Identity
  show_full_name?: boolean; // Reveal full name

  // Location
  show_city_state?: boolean; // Reveal city and state
  show_full_address?: boolean; // Reveal complete address

  // Custom fields
  [key: string]: boolean; // Additional custom disclosures
}
```

**Privacy Example:**

A bar only needs to know if someone is over 21, not their exact age:

```json
{
  "show_age_over_21": true, // ✓ Reveals: YES/NO
  "show_age": false, // ✗ Keeps age private
  "show_full_name": false // ✗ Keeps name private
}
```

## Verification Steps

### Step 1: QR Code Scanning

The verifier scans the QR code presented by the holder.

```typescript
import { scanQRCode } from 'your-qr-scanner-library';

const qrString = await scanQRCode();
// Result: "aura://verify?data=eyJ2IjoiMS4wIiwicCI6..."
```

### Step 2: QR Code Parsing

Parse the QR code string into structured data.

```typescript
import { parseQRCode } from '@aura-network/verifier-sdk';

const qrData = parseQRCode(qrString);

console.log('Holder DID:', qrData.h);
console.log('Credential IDs:', qrData.vcs);
console.log('Disclosure:', qrData.ctx);
console.log('Expires:', new Date(qrData.exp * 1000));
```

**Parsing validates:**

- URL format is correct
- Base64 decoding succeeds
- JSON is well-formed
- All required fields are present
- Data types are correct

### Step 3: Expiration Check

Verify the presentation hasn't expired.

```typescript
const now = Math.floor(Date.now() / 1000);

if (qrData.exp < now) {
  throw new Error('Presentation has expired');
}

// Optional: Check if expiration is too far in the future (suspicious)
const maxFutureTime = now + 5 * 60; // 5 minutes
if (qrData.exp > maxFutureTime) {
  console.warn('Expiration time is unusually far in the future');
}
```

**Expiration Best Practices:**

- Presentations should expire quickly (30 seconds to 5 minutes)
- Prevents replay attacks
- Forces fresh credential checks

### Step 4: Signature Verification

Verify the holder signed this presentation.

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
});

// Construct the signed message (must match exactly what holder signed)
const message = JSON.stringify({
  p: qrData.p,
  vcs: qrData.vcs,
  ctx: qrData.ctx,
  exp: qrData.exp,
  n: qrData.n,
});

// Verify signature
const result = await verifier.verifySignature({
  publicKey: qrData.h, // Holder's DID/public key
  message: message, // Canonical message
  signature: qrData.sig, // Holder's signature
  algorithm: 'ed25519', // Aura uses Ed25519
});

if (!result.valid) {
  throw new Error('Invalid signature: ' + result.error);
}
```

**Why Signature Verification Matters:**

- Proves the holder possesses the private key
- Ensures data wasn't tampered with
- Authenticates the presentation request

### Step 5: Blockchain Query (Optional)

Query the blockchain for additional verification:

```typescript
// Check credential revocation status
const credential = await queryCredentialStatus(qrData.vcs[0]);

if (credential.revoked) {
  throw new Error('Credential has been revoked');
}

// Verify issuer's signature on the credential
const issuerPublicKey = await queryIssuerPublicKey(credential.issuer);
const issuerSigValid = await verifier.verifySignature({
  publicKey: issuerPublicKey,
  message: credential.data,
  signature: credential.issuerSignature,
  algorithm: 'ed25519',
});

if (!issuerSigValid.valid) {
  throw new Error('Issuer signature is invalid');
}
```

### Step 6: Disclosure Validation

Check that the disclosed information meets your requirements.

```typescript
// Example: Bar requires proof of age over 21
if (!qrData.ctx.show_age_over_21) {
  throw new Error('Age verification not provided');
}

// Example: Marketplace requires verified identity
if (!qrData.ctx.show_full_name || !qrData.ctx.show_city_state) {
  throw new Error('Insufficient identity information');
}

// Business logic based on disclosed attributes
console.log('Verification successful');
console.log('User disclosed:', qrData.ctx);
```

### Step 7: Result and Access Decision

Make final access decision based on verification results.

```typescript
function makeAccessDecision(qrData: QRCodeData, verificationResult: VerificationResult): boolean {
  // All checks must pass
  const checks = {
    signatureValid: verificationResult.valid,
    notExpired: qrData.exp > Date.now() / 1000,
    hasRequiredDisclosure: qrData.ctx.show_age_over_21 === true,
    credentialNotRevoked: true, // From blockchain query
  };

  const allPassed = Object.values(checks).every((check) => check === true);

  if (allPassed) {
    console.log('✓ Access granted');
    return true;
  } else {
    console.log('✗ Access denied');
    console.log(
      'Failed checks:',
      Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([name]) => name)
    );
    return false;
  }
}
```

## Signature Verification

### Message Construction

The message that gets signed is critical. It must be constructed identically by both holder and verifier.

**Canonical Message Format:**

```typescript
const message = JSON.stringify({
  p: qrData.p, // Presentation ID
  vcs: qrData.vcs, // Credential IDs (array)
  ctx: qrData.ctx, // Disclosure context (object)
  exp: qrData.exp, // Expiration (number)
  n: qrData.n, // Nonce (number)
});
```

**Important:**

- Field order matters in JSON
- No whitespace or formatting differences
- Arrays and objects must be identical
- Numbers must not be strings

### Algorithm Selection

Aura Network supports two signature algorithms:

#### Ed25519 (Recommended)

```typescript
const result = await verifier.verifySignature({
  publicKey: holderPublicKey,
  message: message,
  signature: signature,
  algorithm: 'ed25519',
});
```

**Characteristics:**

- Fast verification
- Small signatures (64 bytes)
- Deterministic
- Widely supported
- **Default for Aura Network**

#### secp256k1 (Alternative)

```typescript
const result = await verifier.verifySignature({
  publicKey: holderPublicKey,
  message: message,
  signature: signature,
  algorithm: 'secp256k1',
});
```

**Characteristics:**

- Used by Bitcoin and Ethereum
- Larger signatures
- Non-deterministic (requires nonce)
- Supported for compatibility

### Signature Format

Signatures are hex-encoded strings:

```
a1b2c3d4e5f6789012345678901234567890abcdef...
```

**Length:**

- Ed25519: 128 hex characters (64 bytes)
- secp256k1: 128-144 hex characters (64-72 bytes)

## Blockchain Queries

### Query Credential Status

```typescript
async function queryCredentialStatus(credentialId: string) {
  const query = {
    credential_status: {
      credential_id: credentialId,
    },
  };

  const result = await client.queryContractSmart(CREDENTIAL_CONTRACT_ADDRESS, query);

  return {
    revoked: result.revoked,
    revokedAt: result.revoked_at,
    reason: result.revocation_reason,
  };
}
```

### Query Issuer Public Key

```typescript
async function queryIssuerPublicKey(issuerDid: string) {
  const query = {
    issuer_info: {
      did: issuerDid,
    },
  };

  const result = await client.queryContractSmart(DID_REGISTRY_ADDRESS, query);

  return result.public_key;
}
```

### Query Schema

```typescript
async function queryCredentialSchema(schemaId: string) {
  const query = {
    schema: {
      schema_id: schemaId,
    },
  };

  const result = await client.queryContractSmart(SCHEMA_REGISTRY_ADDRESS, query);

  return result.schema;
}
```

## Result Interpretation

### Verification Result

```typescript
interface VerificationResult {
  valid: boolean; // Overall result
  error?: string; // Error message if invalid
  metadata?: {
    algorithm: string; // Algorithm used
    [key: string]: unknown; // Additional metadata
  };
}
```

### Success Case

```typescript
{
  valid: true,
  metadata: {
    algorithm: 'ed25519',
    verifiedAt: 1735560000,
    chainId: 'aura-mvp-1'
  }
}
```

### Failure Cases

**Invalid Signature:**

```typescript
{
  valid: false,
  error: 'Signature verification failed',
  metadata: {
    algorithm: 'ed25519'
  }
}
```

**Expired Presentation:**

```typescript
{
  valid: false,
  error: 'Presentation has expired',
  metadata: {
    expiredAt: 1735550000,
    currentTime: 1735560000
  }
}
```

**Revoked Credential:**

```typescript
{
  valid: false,
  error: 'Credential has been revoked',
  metadata: {
    revokedAt: 1735540000,
    reason: 'User requested revocation'
  }
}
```

## Security Considerations

### Replay Attack Prevention

**Problem:** Attacker intercepts QR code and reuses it.

**Solutions:**

1. **Short Expiration**: Presentations expire in seconds/minutes
2. **Nonce Tracking**: Store used nonces to detect replays
3. **Challenge-Response**: Verifier provides unique challenge

```typescript
const usedNonces = new Set<number>();

function checkReplay(qrData: QRCodeData): boolean {
  if (usedNonces.has(qrData.n)) {
    throw new Error('Replay attack detected: nonce already used');
  }

  usedNonces.add(qrData.n);

  // Clean up old nonces after expiration
  setTimeout(() => usedNonces.delete(qrData.n), (qrData.exp - Date.now() / 1000 + 60) * 1000);

  return true;
}
```

### Man-in-the-Middle Prevention

- Always verify signatures
- Use HTTPS for blockchain queries
- Pin RPC endpoints
- Validate certificate chains

### Privacy Protection

- Only request necessary disclosures
- Don't log sensitive information
- Use GDPR-compliant data handling
- Delete verification data after use

```typescript
// Good: Minimal logging
console.log('Verification result:', result.valid);

// Bad: Logging sensitive data
console.log('User data:', qrData); // Don't do this!
```

### Time Synchronization

Ensure verifier's clock is accurate:

```typescript
// Check blockchain time vs local time
const chainHeight = await verifier.getHeight();
const blockTime = await getBlockTime(chainHeight);
const localTime = Date.now() / 1000;

const timeDiff = Math.abs(blockTime - localTime);

if (timeDiff > 300) {
  // 5 minutes
  console.warn('Clock drift detected:', timeDiff, 'seconds');
}
```

## Complete Flow Example

```typescript
import { VerifierSDK, parseQRCode } from '@aura-network/verifier-sdk';

async function verifyCredential(qrString: string): Promise<boolean> {
  const verifier = new VerifierSDK({
    rpcEndpoint: 'https://rpc.aurablockchain.org',
  });

  try {
    // Step 1 & 2: Parse QR code
    const qrData = parseQRCode(qrString);

    // Step 3: Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (qrData.exp < now) {
      console.error('Presentation expired');
      return false;
    }

    // Step 4: Verify signature
    const message = JSON.stringify({
      p: qrData.p,
      vcs: qrData.vcs,
      ctx: qrData.ctx,
      exp: qrData.exp,
      n: qrData.n,
    });

    const sigResult = await verifier.verifySignature({
      publicKey: qrData.h,
      message: message,
      signature: qrData.sig,
      algorithm: 'ed25519',
    });

    if (!sigResult.valid) {
      console.error('Invalid signature');
      return false;
    }

    // Step 5: Check revocation (simplified)
    // In production, query blockchain for actual status

    // Step 6: Validate disclosure
    if (!qrData.ctx.show_age_over_21) {
      console.error('Age verification not provided');
      return false;
    }

    // Step 7: Access decision
    console.log('Verification successful');
    return true;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  } finally {
    await verifier.disconnect();
  }
}
```

## Additional Resources

- [API Reference](./api-reference.md) - Complete API documentation
- [Security Guide](./security.md) - In-depth security considerations
- [Error Handling](./error-handling.md) - Handle verification errors
- [Offline Mode](./offline-mode.md) - Verify without internet connection
