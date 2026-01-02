# Configuration

Complete reference for configuring the Aura Verifier SDK.

## Basic Configuration

The minimal configuration requires only a network:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({
  network: 'mainnet'
});
```

## Configuration Interface

```typescript
interface AuraVerifierConfig {
  /** Network to connect to: 'mainnet', 'testnet', or 'local' */
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
}
```

## Network Configuration

### Mainnet (Production)

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
});
```

**Default Endpoints:**
- gRPC: `rpc.aurablockchain.org:9090`
- REST: `https://api.aurablockchain.org`
- Chain ID: `aura-mainnet-1`

### Testnet (Development)

```typescript
const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 10000,
  verbose: true, // Enable logging for development
});
```

**Default Endpoints:**
- gRPC: `testnet-rpc.aurablockchain.org:9090`
- REST: `https://testnet-api.aurablockchain.org`
- Chain ID: `aura-testnet-2`

### Local (Development)

```typescript
const verifier = new AuraVerifier({
  network: 'local',
  grpcEndpoint: 'localhost:9090',
  restEndpoint: 'http://localhost:1317',
  chainId: 'aura-local-1',
});
```

**Default Endpoints:**
- gRPC: `localhost:9090`
- REST: `http://localhost:1317`
- Chain ID: `aura-local-1`

### Custom Endpoints

Override default endpoints for specific networks:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: 'my-custom-node.example.com:9090',
  restEndpoint: 'https://my-custom-node.example.com',
});
```

## Cache Configuration

Control credential and DID caching behavior:

```typescript
interface CacheConfig {
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
```

### Default Cache Settings

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,        // 5 minutes
    maxSize: 50,     // 50 MB
  },
});
```

### Aggressive Caching (Offline-First)

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 3600,       // 1 hour
    maxSize: 200,    // 200 MB
    storageLocation: './cache',
  },
});
```

### Minimal Caching

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 60,         // 1 minute
    maxSize: 10,     // 10 MB
  },
});
```

### Disable Caching

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    enableDIDCache: false,
    enableVCCache: false,
  },
});
```

## Timeout Configuration

Set network request timeouts:

```typescript
// Short timeout (fast local network)
const verifier = new AuraVerifier({
  network: 'local',
  timeout: 5000, // 5 seconds
});

// Standard timeout (typical internet)
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000, // 10 seconds (recommended)
});

// Long timeout (slow/unreliable network)
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 30000, // 30 seconds
});
```

## Offline Mode

Enable offline-only verification:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  cacheConfig: {
    storageLocation: './offline-cache',
    ttl: 86400, // 24 hours
  },
});
```

See the [Offline Mode Guide](../guides/offline-mode.md) for details.

## Logging Configuration

### Enable Verbose Logging

```typescript
const verifier = new AuraVerifier({
  network: 'testnet',
  verbose: true, // Enable detailed logging
});
```

**Output:**
```
[AuraVerifier] Initializing...
[AuraVerifier] Network: testnet
[AuraVerifier] gRPC: testnet-rpc.aurablockchain.org:9090
[AuraVerifier] REST: https://testnet-api.aurablockchain.org
[AuraVerifier] Offline Mode: false
[AuraVerifier] Testing connectivity...
[AuraVerifier] Connectivity test passed
[AuraVerifier] Initialization complete
```

### Production Logging

In production, disable verbose logging:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  verbose: false, // Disable verbose logs (default)
});
```

Use event handlers for custom logging:

```typescript
verifier.on('verification', (data) => {
  console.log('Verification:', data.result.auditId, data.result.isValid);
});

verifier.on('error', (data) => {
  console.error('Error:', data.error.message);
});
```

## Environment-Based Configuration

Use environment variables for flexible deployment:

```typescript
const verifier = new AuraVerifier({
  network: (process.env.AURA_NETWORK || 'mainnet') as NetworkType,
  timeout: parseInt(process.env.AURA_TIMEOUT || '10000'),
  verbose: process.env.NODE_ENV === 'development',
  grpcEndpoint: process.env.AURA_GRPC_ENDPOINT,
  restEndpoint: process.env.AURA_REST_ENDPOINT,
  offlineMode: process.env.AURA_OFFLINE_MODE === 'true',
});
```

**Environment Variables (.env):**
```bash
# Network configuration
AURA_NETWORK=mainnet
AURA_TIMEOUT=10000

# Custom endpoints (optional)
AURA_GRPC_ENDPOINT=rpc.aurablockchain.org:9090
AURA_REST_ENDPOINT=https://api.aurablockchain.org

# Modes
AURA_OFFLINE_MODE=false
NODE_ENV=production
```

## Configuration Presets

### Production Preset

```typescript
const productionConfig = {
  network: 'mainnet' as const,
  timeout: 10000,
  verbose: false,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,
    maxSize: 50,
  },
};

const verifier = new AuraVerifier(productionConfig);
```

### Development Preset

```typescript
const developmentConfig = {
  network: 'testnet' as const,
  timeout: 30000,
  verbose: true,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 60,
    maxSize: 20,
  },
};

const verifier = new AuraVerifier(developmentConfig);
```

### Offline Kiosk Preset

```typescript
const kioskConfig = {
  network: 'mainnet' as const,
  offlineMode: true,
  timeout: 5000,
  verbose: false,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 86400, // 24 hours
    maxSize: 200,
    storageLocation: './kiosk-cache',
  },
};

const verifier = new AuraVerifier(kioskConfig);
```

### High-Volume Server Preset

```typescript
const serverConfig = {
  network: 'mainnet' as const,
  timeout: 5000,
  verbose: false,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 600, // 10 minutes
    maxSize: 500,
  },
};

const verifier = new AuraVerifier(serverConfig);
```

## Runtime Configuration Changes

Some settings can be changed after initialization:

### Toggle Offline Mode

```typescript
// Enable offline mode
await verifier.enableOfflineMode();

// Disable offline mode
await verifier.disableOfflineMode();
```

### Event Listeners

Add or remove event listeners at runtime:

```typescript
const handler = (data) => {
  console.log('Verification event:', data);
};

// Add listener
verifier.on('verification', handler);

// Remove listener
verifier.off('verification', handler);
```

## Configuration Validation

The SDK validates configuration on initialization:

```typescript
// Invalid: missing network
const verifier = new AuraVerifier({} as any);
// Throws: ConfigurationError: 'network' is required

// Invalid: unknown network
const verifier = new AuraVerifier({
  network: 'invalid' as any
});
// Throws: ConfigurationError: Invalid network: invalid

// Invalid: negative timeout
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: -1000
});
// Throws: ConfigurationError: timeout must be positive
```

## Configuration Best Practices

### 1. Use TypeScript for Type Safety

```typescript
import { AuraVerifier, AuraVerifierConfig } from '@aura-network/verifier-sdk';

const config: AuraVerifierConfig = {
  network: 'mainnet',
  timeout: 10000,
  // TypeScript will validate all fields
};

const verifier = new AuraVerifier(config);
```

### 2. Externalize Configuration

```typescript
// config/verifier.ts
export const verifierConfig = {
  production: {
    network: 'mainnet' as const,
    timeout: 10000,
    verbose: false,
  },
  development: {
    network: 'testnet' as const,
    timeout: 30000,
    verbose: true,
  },
  test: {
    network: 'testnet' as const,
    timeout: 5000,
    verbose: true,
  },
};

// app.ts
import { verifierConfig } from './config/verifier';

const env = process.env.NODE_ENV || 'development';
const verifier = new AuraVerifier(verifierConfig[env]);
```

### 3. Document Custom Endpoints

If using custom endpoints, document why:

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  // Using our own node for better reliability
  grpcEndpoint: 'node.ourcompany.com:9090',
  // Using our caching proxy for faster responses
  restEndpoint: 'https://api.ourcompany.com/aura',
});
```

### 4. Use Appropriate Cache Sizes

Base cache size on your usage:

```typescript
// Low traffic (< 100 verifications/day)
cacheConfig: { maxSize: 10 }

// Medium traffic (100-1000 verifications/day)
cacheConfig: { maxSize: 50 }

// High traffic (> 1000 verifications/day)
cacheConfig: { maxSize: 200 }
```

### 5. Set Timeouts Based on Network

```typescript
// Local network: short timeout
const verifier = new AuraVerifier({
  network: 'local',
  timeout: 5000,
});

// Internet: medium timeout
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
});

// Unreliable network: long timeout
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 30000,
});
```

## Configuration Examples

### Bar/Nightclub Setup

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 5000, // Fast verification needed
  offlineMode: false,
  cacheConfig: {
    enableVCCache: true,
    ttl: 300,
    maxSize: 100,
  },
  verbose: false,
});
```

### Online Marketplace

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 600, // 10 minutes
    maxSize: 200,
  },
});
```

### Offline Kiosk

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  timeout: 5000,
  cacheConfig: {
    storageLocation: '/var/cache/aura-verifier',
    ttl: 86400, // 24 hours
    maxSize: 500,
  },
});

// Sync cache daily
setInterval(async () => {
  await verifier.syncCache();
}, 86400000); // 24 hours
```

## Next Steps

- Learn about [different environments](./environments.md)
- Set up [offline mode](../guides/offline-mode.md)
- Review [security best practices](../guides/security-best-practices.md)
