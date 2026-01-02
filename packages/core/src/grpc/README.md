# Aura gRPC/REST Client Module

Complete implementation of the Aura blockchain client for verifying presentations and querying the Aura network.

## Overview

This module provides a production-ready client for communicating with Aura blockchain nodes via REST API. It includes:

- Full-featured REST client with retry logic and error handling
- Type-safe API with comprehensive TypeScript types
- Network configuration for mainnet, testnet, and local networks
- Batch query support for efficient operations
- Comprehensive error handling and custom error classes
- Complete test suite with mocked responses

## Files

### Core Implementation

1. **client.ts** (338 lines)
   - `AuraClient` - Main client class
   - `createAuraClient()` - Factory function
   - `connectAuraClient()` - Create and connect in one step
   - Connection management and health checks

2. **queries.ts** (480 lines)
   - `QueryExecutor` - HTTP request execution with retry logic
   - `VCRegistryQueries` - VC registry module queries
   - `IdentityQueries` - DID resolution queries
   - `HealthQueries` - Node health checks
   - Exponential backoff retry mechanism

3. **endpoints.ts** (149 lines)
   - Network configurations (mainnet, testnet, local)
   - REST API endpoint paths
   - Default retry and timeout configurations
   - Helper functions for endpoint management

4. **types.ts** (324 lines)
   - Complete type definitions for all API responses
   - DID document types (W3C DID Core)
   - Verifiable Credential structures
   - VC status and verification results
   - Network and connection types

5. **errors.ts** (240 lines)
   - `NetworkError` - Base network error
   - `TimeoutError` - Request timeout errors
   - `NodeUnavailableError` - Node connectivity errors
   - `APIError` - API response errors
   - `VerificationError` - Verification failures
   - `RetryExhaustedError` - Retry limit reached
   - `ConfigurationError` - Invalid configuration

6. **index.ts** (67 lines)
   - Main module exports
   - Re-exports all public APIs

### Tests

7. **__tests__/client.test.ts** (598 lines)
   - Comprehensive test suite with vitest
   - Mocked fetch responses
   - Tests for all client methods
   - Error handling scenarios
   - Retry logic verification

## Usage

### Basic Usage

```typescript
import { AuraClient, connectAuraClient } from '@aura-network/verifier-sdk/grpc';

// Connect to testnet
const client = await connectAuraClient('testnet');

// Verify a presentation
const result = await client.verifyPresentation(qrCodeData);
console.log('Verified:', result.verified);

// Check VC status
const status = await client.checkVCStatus('vc_123');
console.log('VC exists:', status.exists);
console.log('VC revoked:', status.revoked);

// Resolve DID
const didDoc = await client.resolveDID('did:aura:holder123');
console.log('DID:', didDoc.id);

// Disconnect when done
await client.disconnect();
```

### Advanced Configuration

```typescript
import { AuraClient } from '@aura-network/verifier-sdk/grpc';

const client = new AuraClient({
  network: 'mainnet',
  timeout: 15000, // 15 seconds
  connectTimeout: 5000, // 5 seconds
  restEndpoint: 'https://custom.api.aurablockchain.org', // Optional custom endpoint
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
});

await client.connect();
```

### Batch Operations

```typescript
// Batch check multiple VCs
const vcIds = ['vc_1', 'vc_2', 'vc_3', 'vc_4', 'vc_5'];
const results = await client.batchCheckVCStatus(vcIds);

for (const [vcId, status] of results) {
  console.log(`${vcId}: exists=${status.exists}, revoked=${status.revoked}`);
}
```

### Error Handling

```typescript
import {
  AuraClient,
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
} from '@aura-network/verifier-sdk/grpc';

try {
  const result = await client.verifyPresentation(qrData);
  console.log('Verification result:', result);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out after', error.timeoutMs, 'ms');
  } else if (error instanceof NodeUnavailableError) {
    console.error('Node unavailable:', error.endpoint);
  } else if (error instanceof APIError) {
    console.error('API error:', error.message, 'Status:', error.statusCode);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Connection Management

```typescript
// Check if connected
if (!client.isConnected()) {
  await client.connect();
}

// Get connection status
const status = client.getConnectionStatus();
console.log('Connected:', status.connected);
console.log('Network:', status.network);
console.log('Endpoint:', status.endpoint);
console.log('Last connected:', new Date(status.last_connected!));

// Get network info
const info = client.getNetworkInfo();
console.log('Network:', info.network);
console.log('Chain ID:', info.chain_id);
console.log('gRPC:', info.grpc_endpoint);
console.log('REST:', info.rest_endpoint);
```

## API Reference

### AuraClient

#### Constructor Options

```typescript
interface AuraClientConfig {
  network: 'mainnet' | 'testnet' | 'local';
  grpcEndpoint?: string;
  restEndpoint?: string;
  timeout?: number; // ms, default 10000
  connectTimeout?: number; // ms, default 5000
  retryConfig?: Partial<RetryConfig>;
  autoConnect?: boolean; // default false
}
```

#### Methods

- `connect(): Promise<void>` - Connect to Aura network
- `disconnect(): Promise<void>` - Disconnect from network
- `isConnected(): boolean` - Check connection status
- `getConnectionStatus(): ConnectionStatus` - Get detailed status
- `getNetworkInfo(): NetworkInfo` - Get network information

##### VC Registry Methods

- `verifyPresentation(qrCodeData: string, verifierAddress?: string): Promise<VerificationResult>`
  - Verify a presentation from QR code data

- `checkVCStatus(vcId: string): Promise<VCStatusResponse>`
  - Check status of a single VC

- `batchCheckVCStatus(vcIds: string[]): Promise<Map<string, VCStatusResponse>>`
  - Batch check status of multiple VCs

- `getVC(vcId: string): Promise<VCRecord | null>`
  - Get full VC record (returns null if not found)

##### Identity Methods

- `resolveDID(did: string): Promise<DIDDocument>`
  - Resolve DID document

##### Health Methods

- `checkHealth(): Promise<boolean>`
  - Check if node is available

- `getNodeInfo(): Promise<unknown>`
  - Get node information

## Network Endpoints

### Mainnet
- REST: `https://api.aurablockchain.org`
- gRPC: `rpc.aurablockchain.org:9090`
- Chain ID: `aura-mainnet-1`

### Testnet
- REST: `https://testnet-api.aurablockchain.org`
- gRPC: `testnet-rpc.aurablockchain.org:9090`
- Chain ID: `aura-testnet-1`

### Local
- REST: `http://localhost:1317`
- gRPC: `localhost:9090`
- Chain ID: `aura-local-test`

## REST API Endpoints

The client implements these Aura REST API endpoints:

### VC Registry Module
- `POST /aura/vcregistry/v1beta1/verify_presentation` - Verify presentation
- `GET /aura/vcregistry/v1beta1/vc/{vc_id}` - Get VC by ID
- `GET /aura/vcregistry/v1beta1/vc_status/{vc_id}` - Get VC status
- `GET /aura/vcregistry/v1beta1/vcs/holder/{holder_did}` - List VCs by holder
- `GET /aura/vcregistry/v1beta1/vcs/issuer/{issuer_did}` - List VCs by issuer

### Identity Module
- `GET /aura/identity/v1beta1/did/{did}` - Resolve DID document
- `GET /aura/identity/v1beta1/did/{did}/verification_methods` - Get verification methods

### Chain Info
- `GET /cosmos/base/tendermint/v1beta1/node_info` - Get node info
- `GET /cosmos/base/tendermint/v1beta1/blocks/latest` - Get latest block
- `GET /cosmos/base/tendermint/v1beta1/syncing` - Get syncing status

## Retry Configuration

Default retry behavior:
- Max attempts: 3
- Initial delay: 1000ms (1 second)
- Max delay: 10000ms (10 seconds)
- Backoff multiplier: 2x
- Retry on timeout: Yes
- Retryable status codes: 408, 429, 500, 502, 503, 504

Exponential backoff formula:
```
delay = min(initialDelay * (multiplier ^ attempt), maxDelay) + jitter
jitter = random(0, delay * 0.2)
```

## Features

### Automatic Retry
- Exponential backoff with jitter
- Configurable retry attempts and delays
- Automatic retry on network errors and specific HTTP status codes
- Timeout handling with retry support

### Type Safety
- Complete TypeScript type definitions
- Type-safe API responses
- Compile-time error checking
- IntelliSense support

### Error Handling
- Custom error classes for different scenarios
- Detailed error messages with context
- HTTP status codes and error details
- Structured error information

### Browser and Node.js Support
- Uses standard `fetch` API (works in both environments)
- No Node.js-specific dependencies
- Compatible with modern browsers
- Polyfill support available

## Testing

Run tests:
```bash
npm test -- src/grpc/__tests__/client.test.ts
```

The test suite includes:
- Constructor and configuration tests
- Connection and disconnection tests
- All API method tests
- Error handling scenarios
- Retry logic verification
- Timeout handling
- Network error simulation
- Mock fetch responses

## Dependencies

Uses native browser APIs:
- `fetch` - HTTP requests
- `AbortController` - Request cancellation
- `setTimeout` - Timeouts and delays
- `Promise` - Async operations

No external HTTP libraries required - works with standard web APIs.

## License

MIT

## Author

Aura Network
