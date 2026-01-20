# Environments

Learn about the different Aura Network environments and when to use each one.

## Overview

The Aura Verifier SDK supports three environments:

1. **Mainnet** - Production blockchain with real credentials
2. **Testnet** - Testing environment with test credentials
3. **Local** - Local development blockchain

## Mainnet (Production)

### When to Use

- Production applications
- Real user credentials
- Live businesses and services

### Configuration

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
});
```

### Network Details

- **Network ID**: `aura-mvp-1`
- **gRPC Endpoint**: `rpc.aurablockchain.org:9090`
- **REST Endpoint**: `https://api.aurablockchain.org`
- **Explorer**: `https://explorer.aurablockchain.org`
- **Block Time**: ~6 seconds
- **Finality**: 1 block (~6 seconds)

### Characteristics

- Real economic value
- Permanent credential storage
- High reliability and uptime
- Production-grade infrastructure
- Rate limits may apply

### Best Practices for Mainnet

1. **Test thoroughly on testnet first**
2. **Use production-grade error handling**
3. **Implement proper logging and monitoring**
4. **Set up alerts for failures**
5. **Use caching to reduce blockchain queries**

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
  verbose: false, // Disable verbose logging
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300, // 5 minutes
  },
});

// Production error handling
verifier.on('error', async (data) => {
  await alertOps(data.error);
  await logToMonitoring(data);
});
```

## Testnet (Development & Testing)

### When to Use

- Development and testing
- Integration testing
- Staging environments
- Credential format validation
- Training and demos

### Configuration

```typescript
const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 15000, // Longer timeout for less stable network
  verbose: true, // Enable logging for debugging
});
```

### Network Details

- **Network ID**: `aura-mvp-1`
- **gRPC Endpoint**: `testnet-grpc.aurablockchain.org:443`
- **REST Endpoint**: `https://testnet-api.aurablockchain.org`
- **Explorer**: `https://testnet-explorer.aurablockchain.org`
- **Block Time**: ~6 seconds
- **Finality**: 1 block (~6 seconds)

### Characteristics

- No real economic value
- May be reset periodically
- Test credentials available
- Less stable than mainnet
- Free to use
- Perfect for development

### Getting Test Credentials

1. **Testnet Wallet**: https://testnet-wallet.aurablockchain.org
2. **Faucet**: https://testnet-faucet.aurablockchain.org
3. **Test Issuer**: https://testnet-issuer.aurablockchain.org

### Testnet Best Practices

```typescript
// Development configuration
const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 30000, // Longer timeout
  verbose: true, // See what's happening
  cacheConfig: {
    ttl: 60, // Short TTL for rapid iteration
  },
});

// Test with various scenarios
async function testVerification() {
  // Test valid credential
  await verifier.verify({ qrCodeData: validQR });

  // Test expired credential
  await verifier.verify({ qrCodeData: expiredQR });

  // Test revoked credential
  await verifier.verify({ qrCodeData: revokedQR });

  // Test invalid signature
  await verifier.verify({ qrCodeData: invalidSigQR });
}
```

## Local (Development)

### When to Use

- Local development
- Offline development
- Unit testing
- CI/CD pipelines
- Learning and experimentation

### Configuration

```typescript
const verifier = new AuraVerifier({
  network: 'local',
  grpcEndpoint: 'localhost:9090',
  restEndpoint: 'http://localhost:1317',
  chainId: 'aura-local-1',
  timeout: 5000, // Fast local network
  verbose: true,
});
```

### Setup Local Network

#### Using Docker

```bash
# Clone Aura blockchain
git clone https://github.com/aura-blockchain/aura.git
cd aura

# Start local node
docker-compose up -d

# Verify it's running
curl http://localhost:1317/cosmos/base/tendermint/v1beta1/node_info
```

#### Using Binary

```bash
# Download Aura binary
wget https://github.com/aura-blockchain/aura/releases/download/v1.0.0/aura-linux-amd64

# Initialize local node
./aura-linux-amd64 init mynode --chain-id aura-local-1

# Start node
./aura-linux-amd64 start
```

### Local Network Details

- **Network ID**: `aura-local-1` (customizable)
- **gRPC Endpoint**: `localhost:9090`
- **REST Endpoint**: `http://localhost:1317`
- **Block Time**: Configurable (default ~1 second)
- **Instant finality**: Perfect for testing

### Characteristics

- Complete control
- Fast block times
- No external dependencies
- Perfect for testing
- Ideal for CI/CD

### Local Development Best Practices

```typescript
// Local development config
const verifier = new AuraVerifier({
  network: 'local',
  timeout: 5000,
  verbose: true,
  cacheConfig: {
    enableDIDCache: false, // No caching needed locally
    enableVCCache: false,
  },
});

// Quick local testing
async function localTest() {
  await verifier.initialize();

  // Create test credential (using local CLI)
  // aura tx vc issue ...

  const result = await verifier.verify({
    qrCodeData: localTestQR,
  });

  console.log('Local test result:', result.isValid);
}
```

## Environment Comparison

| Feature          | Mainnet       | Testnet  | Local       |
| ---------------- | ------------- | -------- | ----------- |
| Stability        | High          | Medium   | High        |
| Speed            | Fast          | Medium   | Very Fast   |
| Cost             | May have fees | Free     | Free        |
| Reset Frequency  | Never         | Periodic | Manual      |
| Real Credentials | Yes           | No       | No          |
| Uptime           | 99.9%+        | 95%+     | Depends     |
| Rate Limits      | Yes           | Generous | None        |
| Best For         | Production    | Testing  | Development |

## Environment Selection Strategy

### Development Phase

```typescript
// Start with local
const localVerifier = new AuraVerifier({
  network: 'local',
  verbose: true,
});

// Move to testnet for integration
const testVerifier = new AuraVerifier({
  network: 'testnet',
  verbose: true,
});

// Finally mainnet for production
const prodVerifier = new AuraVerifier({
  network: 'mainnet',
  verbose: false,
});
```

### Environment-Aware Configuration

```typescript
function createVerifier() {
  const env = process.env.NODE_ENV || 'development';

  const config = {
    development: {
      network: 'local' as const,
      timeout: 5000,
      verbose: true,
    },
    test: {
      network: 'testnet' as const,
      timeout: 15000,
      verbose: true,
    },
    staging: {
      network: 'testnet' as const,
      timeout: 10000,
      verbose: false,
    },
    production: {
      network: 'mainnet' as const,
      timeout: 10000,
      verbose: false,
    },
  };

  return new AuraVerifier(config[env] || config.development);
}

const verifier = createVerifier();
```

## Network Migration

### From Local to Testnet

```typescript
// 1. Update configuration
const verifier = new AuraVerifier({
  network: 'testnet', // Changed from 'local'
  timeout: 15000, // Increased timeout
});

// 2. Update test data sources
// Replace local QR codes with testnet QR codes

// 3. Test thoroughly
await runIntegrationTests();
```

### From Testnet to Mainnet

```typescript
// 1. Update configuration
const verifier = new AuraVerifier({
  network: 'mainnet', // Changed from 'testnet'
  timeout: 10000,
  verbose: false, // Disable verbose logging
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 300,
  },
});

// 2. Update monitoring
setupProductionMonitoring(verifier);

// 3. Gradual rollout
await canaryDeployment();
```

## Custom Endpoints

Use custom RPC nodes for better performance or reliability:

```typescript
// Mainnet with custom node
const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: 'my-aura-node.example.com:9090',
  restEndpoint: 'https://my-aura-node.example.com',
});

// Multiple fallback nodes
const endpoints = [
  'rpc.aurablockchain.org:9090',
  'backup1.aurablockchain.org:9090',
  'backup2.aurablockchain.org:9090',
];

const verifier = createVerifierWithFallback(endpoints);
```

## Environment-Specific Testing

### Local Environment Tests

```typescript
describe('Local Verification', () => {
  let verifier: AuraVerifier;

  beforeAll(async () => {
    verifier = new AuraVerifier({
      network: 'local',
      timeout: 5000,
    });
    await verifier.initialize();
  });

  it('should verify local credential', async () => {
    const result = await verifier.verify({ qrCodeData: localQR });
    expect(result.isValid).toBe(true);
  });

  afterAll(async () => {
    await verifier.destroy();
  });
});
```

### Testnet Integration Tests

```typescript
describe('Testnet Integration', () => {
  let verifier: AuraVerifier;

  beforeAll(async () => {
    verifier = new AuraVerifier({
      network: 'testnet',
      timeout: 30000,
    });
    await verifier.initialize();
  });

  it('should verify testnet credential', async () => {
    const result = await verifier.verify({ qrCodeData: testnetQR });
    expect(result.isValid).toBe(true);
  });

  it('should detect revoked credential', async () => {
    const result = await verifier.verify({ qrCodeData: revokedQR });
    expect(result.isValid).toBe(false);
  });
});
```

## Next Steps

- Review [Configuration Options](./configuration.md)
- Set up [Offline Mode](../guides/offline-mode.md)
- Explore [Security Best Practices](../guides/security-best-practices.md)
