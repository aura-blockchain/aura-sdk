# Custom Configuration Example

Advanced configuration examples for specialized deployment scenarios.

## Overview

This guide shows how to customize the Aura Verifier SDK for specific requirements and environments.

## Production Configuration

Complete production-ready configuration:

```typescript
import { AuraVerifier, createSecureVerifier } from '@aura-network/verifier-sdk';

async function createProductionVerifier() {
  // Security context with all protections
  const securityContext = createSecureVerifier({
    enableNonceTracking: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    enableThreatDetection: true,

    nonceConfig: {
      nonceWindow: 300000, // 5 minutes
      cleanupInterval: 60000, // Cleanup every minute
    },

    rateLimitConfig: {
      maxRequests: 100,
      windowMs: 60000,
      burstCapacity: 120,
    },

    auditConfig: {
      enableChaining: true,
      bufferSize: 1000,
      flushInterval: 5000,
    },

    threatConfig: {
      maxRequestsPerWindow: 50,
      rapidRequestWindow: 10000,
      maxFailedAttempts: 5,
      onThreatDetected: async (event) => {
        await alertSecurityTeam(event);
        await blockIdentifier(event.identifier);
      },
    },
  });

  // Main verifier configuration
  const verifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 10000,
    verbose: false, // Disable in production

    cacheConfig: {
      enableDIDCache: true,
      enableVCCache: true,
      ttl: 300,
      maxSize: 100,
      storageLocation: process.env.CACHE_DIR,
    },

    // Use environment variables for sensitive config
    grpcEndpoint: process.env.AURA_GRPC_ENDPOINT,
    restEndpoint: process.env.AURA_REST_ENDPOINT,
  });

  await verifier.initialize();

  return { verifier, securityContext };
}

// Usage
const { verifier, securityContext } = await createProductionVerifier();

// Cleanup
await verifier.destroy();
securityContext.cleanup();
```

## High-Performance Configuration

Optimized for maximum throughput:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const highPerformanceVerifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 5000, // Shorter timeout
  verbose: false,

  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 7200, // Longer TTL for better cache hits
    maxSize: 500, // Larger cache
    maxEntries: 10000,
  },
});

await highPerformanceVerifier.initialize();

// Use batch verification for best performance
const results = await highPerformanceVerifier.verifyBatch(
  qrCodes.map((qr) => ({ qrCodeData: qr }))
);
```

## Multi-Network Configuration

Support multiple networks simultaneously:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

class MultiNetworkVerifier {
  private verifiers: Map<string, AuraVerifier> = new Map();

  async initialize() {
    // Initialize verifiers for each network
    const networks = ['mainnet', 'testnet'] as const;

    for (const network of networks) {
      const verifier = new AuraVerifier({
        network,
        timeout: 10000,
        cacheConfig: {
          enableVCCache: true,
          ttl: 3600,
        },
      });

      await verifier.initialize();
      this.verifiers.set(network, verifier);
    }
  }

  async verify(qrCode: string, network: string = 'mainnet') {
    const verifier = this.verifiers.get(network);
    if (!verifier) {
      throw new Error(`No verifier for network: ${network}`);
    }

    return await verifier.verify({ qrCodeData: qrCode });
  }

  async destroy() {
    for (const verifier of this.verifiers.values()) {
      await verifier.destroy();
    }
  }
}

// Usage
const multiVerifier = new MultiNetworkVerifier();
await multiVerifier.initialize();

const mainnetResult = await multiVerifier.verify(qr, 'mainnet');
const testnetResult = await multiVerifier.verify(qr, 'testnet');

await multiVerifier.destroy();
```

## Custom Network Endpoints

Use custom or self-hosted endpoints:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const customVerifier = new AuraVerifier({
  network: 'local', // Use 'local' for custom endpoints
  grpcEndpoint: 'grpcs://your-custom-grpc.example.com:9090',
  restEndpoint: 'https://your-custom-rest.example.com',
  chainId: 'aura-custom-1',
  timeout: 15000,
});

await customVerifier.initialize();
```

## Load Balancing Configuration

Distribute load across multiple endpoints:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

class LoadBalancedVerifier {
  private verifiers: AuraVerifier[] = [];
  private currentIndex = 0;

  async initialize(endpoints: { grpc: string; rest: string }[]) {
    for (const endpoint of endpoints) {
      const verifier = new AuraVerifier({
        network: 'mainnet',
        grpcEndpoint: endpoint.grpc,
        restEndpoint: endpoint.rest,
        timeout: 10000,
      });

      await verifier.initialize();
      this.verifiers.push(verifier);
    }
  }

  private getNextVerifier(): AuraVerifier {
    const verifier = this.verifiers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.verifiers.length;
    return verifier;
  }

  async verify(qrCode: string) {
    const verifier = this.getNextVerifier();
    return await verifier.verify({ qrCodeData: qrCode });
  }

  async destroy() {
    await Promise.all(this.verifiers.map((v) => v.destroy()));
  }
}

// Usage
const lb = new LoadBalancedVerifier();
await lb.initialize([
  { grpc: 'rpc1.aurablockchain.org:9090', rest: 'https://api1.aurablockchain.org' },
  { grpc: 'rpc2.aurablockchain.org:9090', rest: 'https://api2.aurablockchain.org' },
  { grpc: 'rpc3.aurablockchain.org:9090', rest: 'https://api3.aurablockchain.org' },
]);
```

## Retry and Fallback Configuration

Robust error handling with retries:

```typescript
import { AuraVerifier, NetworkError } from '@aura-network/verifier-sdk';

async function createResilientVerifier() {
  const primaryVerifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 5000,
  });

  const fallbackVerifier = new AuraVerifier({
    network: 'mainnet',
    grpcEndpoint: 'rpc-backup.aurablockchain.org:9090',
    restEndpoint: 'https://api-backup.aurablockchain.org',
    timeout: 10000,
  });

  await primaryVerifier.initialize();
  await fallbackVerifier.initialize();

  return {
    async verify(qrCode: string, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Try primary first
          return await primaryVerifier.verify({ qrCodeData: qrCode });
        } catch (error) {
          if (error instanceof NetworkError && attempt === maxRetries) {
            // Last attempt - try fallback
            console.log('Primary failed, trying fallback...');
            return await fallbackVerifier.verify({ qrCodeData: qrCode });
          }

          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          } else {
            throw error;
          }
        }
      }

      throw new Error('All attempts exhausted');
    },

    async destroy() {
      await primaryVerifier.destroy();
      await fallbackVerifier.destroy();
    },
  };
}
```

## Environment-Specific Configuration

Different configs for dev, staging, and production:

```typescript
import { AuraVerifier, type AuraVerifierConfig } from '@aura-network/verifier-sdk';

type Environment = 'development' | 'staging' | 'production';

function getConfig(env: Environment): AuraVerifierConfig {
  const configs: Record<Environment, AuraVerifierConfig> = {
    development: {
      network: 'testnet',
      timeout: 30000,
      verbose: true, // Debug logging in dev
      cacheConfig: {
        enableVCCache: false, // Disable cache in dev
      },
    },

    staging: {
      network: 'testnet',
      timeout: 15000,
      verbose: true,
      cacheConfig: {
        enableVCCache: true,
        ttl: 300,
      },
    },

    production: {
      network: 'mainnet',
      timeout: 10000,
      verbose: false, // No debug logs in production
      cacheConfig: {
        enableDIDCache: true,
        enableVCCache: true,
        ttl: 3600,
        maxSize: 100,
      },
    },
  };

  return configs[env];
}

// Usage
const env = (process.env.NODE_ENV || 'development') as Environment;
const config = getConfig(env);

const verifier = new AuraVerifier(config);
await verifier.initialize();
```

## Monitoring and Metrics Configuration

Integrate with monitoring systems:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

async function createMonitoredVerifier() {
  // Initialize metrics
  const metricsExporter = new PrometheusExporter({
    port: 9464,
  });

  const verifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 10000,
    verbose: false,
  });

  await verifier.initialize();

  // Track verification metrics
  verifier.on('verification', (data) => {
    const duration = Date.now() - data.timestamp.getTime();

    // Record metrics
    metricsExporter.recordMetric('verification_total', 1, {
      status: data.result.isValid ? 'success' : 'failure',
      method: data.result.verificationMethod,
    });

    metricsExporter.recordMetric('verification_duration_ms', duration, {
      method: data.result.verificationMethod,
    });
  });

  verifier.on('error', (data) => {
    metricsExporter.recordMetric('verification_errors_total', 1, {
      error_type: data.error.name,
    });
  });

  return verifier;
}
```

## Circuit Breaker Pattern

Prevent cascading failures:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

class CircuitBreakerVerifier {
  private verifier: AuraVerifier;
  private failures = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = 0;

  constructor(config: AuraVerifierConfig) {
    this.verifier = new AuraVerifier(config);
  }

  async initialize() {
    await this.verifier.initialize();
  }

  async verify(qrCode: string) {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
    }

    try {
      const result = await this.verifier.verify({ qrCodeData: qrCode });

      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;

    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.error('Circuit breaker opened due to failures');
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'closed';
    console.log('Circuit breaker reset to CLOSED');
  }

  async destroy() {
    await this.verifier.destroy();
  }
}
```

## Best Practices Summary

### 1. Use Environment Variables

```bash
# .env
AURA_NETWORK=mainnet
AURA_GRPC_ENDPOINT=rpc.aurablockchain.org:9090
AURA_REST_ENDPOINT=https://api.aurablockchain.org
CACHE_DIR=/var/cache/aura
ENCRYPTION_KEY=your-encryption-key
```

### 2. Implement Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await verifier.destroy();
  process.exit(0);
});
```

### 3. Monitor Performance

```typescript
const startTime = Date.now();
const result = await verifier.verify({ qrCodeData });
const duration = Date.now() - startTime;

if (duration > 5000) {
  console.warn('Slow verification:', duration, 'ms');
}
```

### 4. Use Configuration Management

```typescript
import config from './config.json';

const verifier = new AuraVerifier(config.verifier);
```

## Next Steps

- [Basic Verification Example](./basic-verification.md)
- [Security Guide](../security-guide.md)
- [API Reference](../api-reference.md)
