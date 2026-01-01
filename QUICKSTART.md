# Quick Start Guide

This guide will help you get the Aura Verifier SDK up and running in minutes.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Installation Steps

### 1. Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

### 2. Navigate to the project directory

```bash
cd /home/decri/blockchain-projects/third-party-verifier/aura-verifier-sdk
```

### 3. Install dependencies

```bash
pnpm install
```

This will install all dependencies for the monorepo and all packages.

### 4. Build the project

```bash
pnpm build
```

This compiles TypeScript to JavaScript and generates type declarations.

### 5. Run tests

```bash
pnpm test
```

Or with coverage:

```bash
pnpm test:coverage
```

### 6. Verify the build

```bash
# Check that dist directory was created
ls -la packages/core/dist/

# You should see:
# - index.js (ESM)
# - index.cjs (CommonJS)
# - index.d.ts (Type definitions)
# - *.map files (Source maps)
```

## Development Workflow

### Watch mode (auto-rebuild on changes)

```bash
pnpm dev
```

### Run linter

```bash
pnpm lint
```

### Format code

```bash
pnpm format
```

### Type checking

```bash
pnpm typecheck
```

## Using the SDK

### Basic Example

Create a test file `test-sdk.ts`:

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const sdk = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aura.network',
  debug: true
});

// Verify a signature
const result = await sdk.verifySignature({
  publicKey: 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',
  message: '',
  signature: 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
            '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b',
  algorithm: 'ed25519'
});

console.log('Verification result:', result);

// Hash data
const hash = sdk.hash({
  data: 'hello world',
  algorithm: 'sha256',
  encoding: 'hex'
});

console.log('SHA-256 hash:', hash);

// Derive address
const address = sdk.deriveAddress({
  publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  publicKeyFormat: 'hex',
  prefix: 'aura',
  algorithm: 'secp256k1'
});

console.log('Derived address:', address);

await sdk.disconnect();
```

Run it:

```bash
# Using ts-node
npx ts-node test-sdk.ts

# Or compile and run
pnpm build
node packages/core/dist/index.js
```

## Package Structure

```
aura-verifier-sdk/
├── packages/core/         # Main SDK package
│   ├── src/              # TypeScript source
│   ├── dist/             # Compiled output (after build)
│   └── package.json      # Package config
├── package.json          # Root config
└── pnpm-workspace.yaml   # Workspace config
```

## Available Scripts

From the root directory:

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all packages |
| `pnpm dev` | Build in watch mode |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint all code |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format all code |
| `pnpm format:check` | Check code formatting |
| `pnpm typecheck` | Type check all packages |
| `pnpm clean` | Remove build artifacts |

## Troubleshooting

### Issue: pnpm not found

**Solution**: Install pnpm globally:
```bash
npm install -g pnpm
```

### Issue: Build fails with TypeScript errors

**Solution**: Ensure you're using Node.js 18 or higher:
```bash
node --version
```

If using nvm:
```bash
nvm use 18
```

### Issue: Tests fail

**Solution**: Make sure you've built the project first:
```bash
pnpm build
pnpm test
```

### Issue: ESLint errors

**Solution**: Run auto-fix:
```bash
pnpm lint:fix
```

## Next Steps

1. Read the [API Reference](./docs/api-reference.md) (coming soon)
2. Check out the [examples](./examples/)
3. Review the [Contributing Guide](./CONTRIBUTING.md)
4. Join the Aura Network Discord for support

## Support

- GitHub Issues: https://github.com/aura-blockchain/aura-verifier-sdk/issues
- Discord: https://discord.gg/aura
- Email: dev@aura.network
