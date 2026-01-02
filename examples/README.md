# Aura Verifier SDK - Examples

This directory contains practical examples demonstrating how to use the Aura Verifier SDK in different scenarios and environments.

## Available Examples

### 1. Basic Node.js Example

**Location**: [`basic-node/`](./basic-node/)

A straightforward Node.js application showing the fundamental features of the SDK.

**What you'll learn:**
- How to initialize the verifier
- Parse QR codes
- Verify credentials
- Check specific attributes (age verification)
- Proper error handling and cleanup

**Best for:** Getting started, understanding the basics, quick prototyping

```bash
cd examples/basic-node
pnpm install
pnpm start
```

[Read full documentation →](./basic-node/README.md)

---

### 2. Express API Server

**Location**: [`express-api/`](./express-api/)

A production-ready REST API server for credential verification.

**What you'll learn:**
- Building a verification API service
- REST endpoint design
- Batch verification
- Error handling middleware
- Security best practices (CORS, Helmet)
- Request logging and monitoring

**Best for:** Integration with existing web applications, microservices architecture

**Endpoints:**
- `POST /verify` - Main verification endpoint
- `POST /verify/age-21` - Quick age 21+ check
- `POST /verify/age-18` - Quick age 18+ check
- `POST /verify/human` - Verified human check
- `POST /verify/batch` - Batch verification
- `GET /credential/:vcId/status` - Credential status
- `GET /health` - Health check

```bash
cd examples/express-api
pnpm install
pnpm start
```

[Read full documentation →](./express-api/README.md)

---

### 3. CLI Tool

**Location**: [`cli-tool/`](./cli-tool/)

A command-line interface tool for terminal-based verification.

**What you'll learn:**
- Building CLI tools with Commander
- Colored terminal output with Chalk
- Progress indicators with Ora
- Table formatting
- Exit codes for scripting
- JSON output mode

**Best for:** System administration, automation scripts, testing, CI/CD pipelines

**Commands:**
```bash
aura-verify verify <qr-code>     # Verify a credential
aura-verify parse <qr-code>      # Parse QR without verification
aura-verify status <vc-id>       # Check credential status
aura-verify age-21 <qr-code>     # Quick age 21+ check
aura-verify age-18 <qr-code>     # Quick age 18+ check
```

```bash
cd examples/cli-tool
pnpm install
pnpm start verify "aura://verify?data=..."
```

[Read full documentation →](./cli-tool/README.md)

---

### 4. Offline Mode

**Location**: [`offline-mode/`](./offline-mode/)

Demonstrates offline credential verification with caching.

**What you'll learn:**
- Credential caching strategies
- Synchronization when online
- Revocation list caching
- File-based persistent storage
- Cache encryption
- Graceful degradation
- Performance optimization

**Best for:** Remote locations, high-traffic events, unreliable connectivity, cost optimization

**Modes:**
```bash
pnpm start           # Online with caching
pnpm run offline     # Offline mode
pnpm run sync        # Sync cache only
pnpm run clean       # Clear cache
```

```bash
cd examples/offline-mode
pnpm install
pnpm start
```

[Read full documentation →](./offline-mode/README.md)

---

## Quick Start

### Installation

From the repository root:

```bash
# Install all dependencies
pnpm install

# Build the SDK
pnpm build
```

### Run an Example

```bash
# Navigate to an example
cd examples/basic-node

# Install dependencies (if needed)
pnpm install

# Run the example
pnpm start
```

## Use Case Matrix

Choose the right example for your needs:

| Use Case | Recommended Example | Why |
|----------|-------------------|-----|
| Learning the SDK | Basic Node.js | Simple, focused on core concepts |
| Web Integration | Express API | REST API ready for integration |
| Mobile Backend | Express API | RESTful service for mobile apps |
| Automation/Scripts | CLI Tool | Easy to script and automate |
| Testing/QA | CLI Tool | Quick manual testing |
| Remote Locations | Offline Mode | Works without connectivity |
| High-Traffic Events | Offline Mode | Reduced network load |
| Cost Optimization | Offline Mode | Fewer blockchain queries |
| Desktop App | Basic Node.js | Simple integration pattern |
| IoT Devices | Offline Mode | Limited connectivity scenarios |

## Common Integration Patterns

### 1. Bar/Nightclub Age Verification

Use the **Express API** example as a backend service:

```typescript
// Mobile app or scanner device sends QR to API
const response = await fetch('https://api.yourbar.com/verify/age-21', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ qrCodeData }),
});

const { isOver21 } = await response.json();

if (isOver21) {
  // Allow entry
} else {
  // Deny entry
}
```

### 2. Event Access Control with Offline Support

Use the **Offline Mode** example for events with spotty WiFi:

```typescript
// Pre-sync cache before event
await verifier.syncCache();

// During event (works offline)
const result = await verifier.verify({ qrCodeData });

// After event, sync audit logs
await verifier.syncCache();
```

### 3. Automated Verification Pipeline

Use the **CLI Tool** in a shell script:

```bash
#!/bin/bash

# Read QR codes from file
while IFS= read -r qr_code; do
  if pnpm start verify "$qr_code" --json > /dev/null 2>&1; then
    echo "PASS: $qr_code"
  else
    echo "FAIL: $qr_code"
  fi
done < qr_codes.txt
```

### 4. Marketplace Trust Verification

Combine **Express API** with **Offline Mode**:

```typescript
// Cache trusted seller credentials
await verifier.syncCache();

// Quick verification during browsing (offline)
const isTrusted = await verifier.isVerifiedHuman(sellerQR);

// Full verification during purchase (online)
const result = await verifier.verify({ qrCodeData: sellerQR });
```

## Testing Examples

Each example includes sample QR code data for testing. Here's a sample QR code you can use:

```typescript
// Sample QR code (age 21+ verification)
const sampleQR = "aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNfYWJjMTIzIiwiaCI6ImRpZDphdXJhOnRlc3RuZXQ6YWJjMTIzZGVmNDU2IiwidmNzIjpbInZjX2FnZV8yMV90ZXN0MTIzIl0sImN0eCI6eyJzaG93X2FnZV9vdmVyXzIxIjp0cnVlfSwiZXhwIjoxNzM1NTYwMDAwLCJuIjoxMjM0NTY3ODksInNpZyI6ImFiY2RlZi4uLiJ9";

// This decodes to:
{
  "v": "1.0",
  "p": "pres_abc123",
  "h": "did:aura:testnet:abc123def456",
  "vcs": ["vc_age_21_test123"],
  "ctx": {
    "show_age_over_21": true
  },
  "exp": 1735560000,
  "n": 123456789,
  "sig": "abcdef..."
}
```

## Environment Variables

Common environment variables used across examples:

```bash
# Network configuration
AURA_NETWORK=testnet          # or 'mainnet'

# API configuration (Express API)
PORT=3000
TIMEOUT=10000

# Cache configuration (Offline Mode)
CACHE_PATH=./.cache
CACHE_MAX_AGE=3600
CACHE_ENCRYPTION_KEY=your-key-here

# Development
NODE_ENV=development          # or 'production'
DEBUG=aura:*                  # Enable debug logging
```

## Troubleshooting

### Example won't start

```bash
# Make sure SDK is built
cd ../..
pnpm build

# Reinstall dependencies
cd examples/<example-name>
rm -rf node_modules
pnpm install
```

### Import errors

```bash
# Check that you're using Node.js 18+
node --version

# Rebuild the SDK
cd ../..
pnpm clean
pnpm build
```

### Network errors

```bash
# Check network connectivity
curl https://testnet-rpc.aurablockchain.org/status

# Try increasing timeout
TIMEOUT=30000 pnpm start
```

### Cache issues (Offline Mode)

```bash
# Clear cache and start fresh
pnpm run clean
pnpm start
```

## Development Workflow

### 1. Modify SDK Code

```bash
# From repository root
cd packages/core
# Make changes to SDK code

# Rebuild
pnpm build

# Test in example
cd ../../examples/basic-node
pnpm start
```

### 2. Create Custom Example

```bash
# Copy an existing example
cp -r basic-node my-custom-example
cd my-custom-example

# Modify package.json
vim package.json

# Implement your custom logic
vim index.ts

# Run it
pnpm start
```

## Production Deployment

Before deploying examples to production:

1. **Set environment variables** appropriately
2. **Enable HTTPS** for API endpoints
3. **Add authentication** (API keys, OAuth, etc.)
4. **Implement rate limiting**
5. **Set up monitoring** and alerting
6. **Configure proper logging**
7. **Use production network** endpoints
8. **Implement proper error handling**
9. **Add input validation**
10. **Review security best practices**

See individual example READMEs for specific deployment guidance.

## Additional Resources

- [SDK Documentation](../README.md)
- [API Reference](../docs/api-reference.md)
- [Verification Flow](../docs/verification-flow.md)
- [Offline Mode Guide](../docs/offline-mode.md)
- [Security Best Practices](../docs/security.md)
- [Error Handling](../docs/error-handling.md)

## Contributing

Found an issue or want to add a new example? Please see our [Contributing Guide](../CONTRIBUTING.md).

## License

These examples are part of the Aura Verifier SDK and are licensed under the MIT License. See [LICENSE](../LICENSE) for details.
