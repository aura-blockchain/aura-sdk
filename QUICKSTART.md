# Quick Start

Get the Aura Verifier SDK running in minutes.

## Prerequisites

- Node.js 18.0.0 or higher
- pnpm 8.0.0 or higher

## Installation

```bash
# Clone the repository
git clone git@github.com:aura-blockchain/aura-verifier-sdk.git
cd aura-verifier-sdk

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## Development

```bash
# Watch mode (auto-rebuild)
pnpm dev

# Run linter
pnpm lint

# Format code
pnpm format

# Type checking
pnpm typecheck
```

## Basic Usage

```typescript
import { VerifierSDK } from '@aura-network/verifier-sdk';

const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
});

await verifier.initialize();

const result = await verifier.verify({
  qrCodeData: 'aura://verify?data=...',
});

console.log('Valid:', result.isValid);

await verifier.destroy();
```

## Available Scripts

| Command              | Description             |
| -------------------- | ----------------------- |
| `pnpm install`       | Install dependencies    |
| `pnpm build`         | Build all packages      |
| `pnpm dev`           | Build in watch mode     |
| `pnpm test`          | Run tests               |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint`          | Lint code               |
| `pnpm format`        | Format code             |
| `pnpm typecheck`     | Type check              |

## Troubleshooting

**pnpm not found:**

```bash
npm install -g pnpm
```

**TypeScript errors:**
Ensure Node.js 18+ is installed:

```bash
node --version
```

**Tests fail:**
Build before testing:

```bash
pnpm build && pnpm test
```

## Next Steps

1. Read the [API documentation](./packages/core/README.md)
2. Review [example implementations](./examples/)
3. See [contributing guidelines](./CONTRIBUTING.md)

## Support

- GitHub Issues: https://github.com/aura-blockchain/aura-verifier-sdk/issues
- Discord: https://discord.gg/aurablockchain
