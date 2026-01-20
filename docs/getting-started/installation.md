# Installation

This guide covers installing the Aura Verifier SDK in various environments and package managers.

## Prerequisites

### Node.js Version

The Aura Verifier SDK requires Node.js version 18.0.0 or higher.

Check your Node.js version:

```bash
node --version
```

If you need to upgrade, visit [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm):

```bash
# Install Node.js 18 (LTS)
nvm install 18
nvm use 18
```

### TypeScript (Optional but Recommended)

While the SDK works with JavaScript, TypeScript provides the best developer experience with full type safety.

```bash
npm install -D typescript
# or
pnpm add -D typescript
# or
yarn add -D typescript
```

## Package Managers

### npm

The most common Node.js package manager:

```bash
npm install @aura-network/verifier-sdk
```

For development dependencies (if building integrations):

```bash
npm install --save-dev @aura-network/verifier-sdk
```

### pnpm (Recommended)

pnpm is faster and more disk-efficient:

```bash
pnpm add @aura-network/verifier-sdk
```

For development:

```bash
pnpm add -D @aura-network/verifier-sdk
```

### Yarn

Using Yarn Classic (1.x):

```bash
yarn add @aura-network/verifier-sdk
```

Using Yarn Berry (2.x+):

```bash
yarn add @aura-network/verifier-sdk
```

## Platform-Specific Installation

### Node.js Backend

```bash
npm install @aura-network/verifier-sdk
```

**Additional dependencies for Node.js:**

```bash
# If using Express.js
npm install express
npm install -D @types/express

# If using Fastify
npm install fastify
npm install -D @types/fastify
```

### React Web Application

```bash
npm install @aura-network/verifier-sdk
```

**Browser polyfills** (if needed for older browsers):

```bash
npm install buffer process
```

Add to your webpack config:

```javascript
module.exports = {
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser'),
    },
  },
};
```

### React Native

Install the React Native-specific package:

```bash
npm install @aura-network/verifier-sdk-react-native
```

**Additional setup for React Native:**

```bash
# Install peer dependencies
npm install react-native-crypto
npm install react-native-get-random-values

# iOS specific
cd ios && pod install && cd ..
```

### Next.js

```bash
npm install @aura-network/verifier-sdk
```

**Next.js configuration** (`next.config.js`):

```javascript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};
```

### Vite

```bash
npm install @aura-network/verifier-sdk
```

**Vite configuration** (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
});
```

### Flutter/Dart

Install the Flutter package:

```bash
flutter pub add aura_verifier_sdk
```

Or add to `pubspec.yaml`:

```yaml
dependencies:
  aura_verifier_sdk: ^1.0.0
```

Then run:

```bash
flutter pub get
```

## CDN Installation (Browser Only)

For quick prototyping or simple web pages, you can use a CDN:

### ESM (Modern Browsers)

```html
<script type="module">
  import { AuraVerifier } from 'https://cdn.jsdelivr.net/npm/@aura-network/verifier-sdk@1.0.0/+esm';

  const verifier = new AuraVerifier({ network: 'mainnet' });
  // ... use verifier
</script>
```

### UMD (Universal)

```html
<script src="https://cdn.jsdelivr.net/npm/@aura-network/verifier-sdk@1.0.0/dist/index.umd.js"></script>
<script>
  const { AuraVerifier } = AuraVerifierSDK;

  const verifier = new AuraVerifier({ network: 'mainnet' });
  // ... use verifier
</script>
```

## Verify Installation

Create a test file to verify the installation:

### TypeScript (`test-install.ts`)

```typescript
import { AuraVerifier, SDK_INFO } from '@aura-network/verifier-sdk';

console.log('SDK Version:', SDK_INFO.version);
console.log('SDK Name:', SDK_INFO.name);

const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 10000,
});

console.log('AuraVerifier initialized successfully!');
```

Run with:

```bash
# Using ts-node
npx ts-node test-install.ts

# Or compile first
npx tsc test-install.ts
node test-install.js
```

### JavaScript (`test-install.js`)

```javascript
const { AuraVerifier, SDK_INFO } = require('@aura-network/verifier-sdk');

console.log('SDK Version:', SDK_INFO.version);
console.log('SDK Name:', SDK_INFO.name);

const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 10000,
});

console.log('AuraVerifier initialized successfully!');
```

Run with:

```bash
node test-install.js
```

### ESM JavaScript (`test-install.mjs`)

```javascript
import { AuraVerifier, SDK_INFO } from '@aura-network/verifier-sdk';

console.log('SDK Version:', SDK_INFO.version);
console.log('SDK Name:', SDK_INFO.name);

const verifier = new AuraVerifier({
  network: 'testnet',
  timeout: 10000,
});

console.log('AuraVerifier initialized successfully!');
```

Run with:

```bash
node test-install.mjs
```

## Troubleshooting Installation

### Module Not Found Error

If you see `Cannot find module '@aura-network/verifier-sdk'`:

1. Verify the package is installed:

   ```bash
   npm list @aura-network/verifier-sdk
   ```

2. Clear npm cache and reinstall:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check your `package.json` dependencies

### TypeScript Type Errors

If TypeScript can't find types:

1. Ensure `@types/node` is installed:

   ```bash
   npm install -D @types/node
   ```

2. Update `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "types": ["node"]
     }
   }
   ```

### Browser Polyfill Issues

If you see errors like `Buffer is not defined` in the browser:

```bash
npm install buffer process
```

Add to your entry point:

```javascript
import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;
```

### React Native Errors

If you encounter errors in React Native:

1. Install crypto polyfill:

   ```bash
   npm install react-native-get-random-values
   ```

2. Import at the top of your app entry point:

   ```javascript
   import 'react-native-get-random-values';
   ```

3. Clear metro bundler cache:
   ```bash
   npm start -- --reset-cache
   ```

### Version Conflicts

Check for peer dependency conflicts:

```bash
npm ls @aura-network/verifier-sdk
```

Update to the latest version:

```bash
npm update @aura-network/verifier-sdk
```

### Network Issues

If installation fails due to network issues:

1. Use a different registry:

   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

2. Or try with increased timeout:
   ```bash
   npm install --timeout=60000 @aura-network/verifier-sdk
   ```

## Development Installation

For contributors or those building from source:

### Clone Repository

```bash
git clone https://github.com/aura-blockchain/aura-verifier-sdk.git
cd aura-verifier-sdk
```

### Install Dependencies

Using pnpm (required for monorepo):

```bash
pnpm install
```

### Build from Source

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Link Locally

To use your local build in another project:

```bash
# In the SDK directory
pnpm link --global

# In your project directory
pnpm link --global @aura-network/verifier-sdk
```

## Post-Installation Steps

After successful installation:

1. Read the [Quick Start Guide](./quick-start.md) for your first verification
2. Review [Configuration Options](./configuration.md)
3. Choose your [Environment](./environments.md) (mainnet, testnet, or local)

## System Requirements Summary

| Platform     | Minimum Version | Recommended |
| ------------ | --------------- | ----------- |
| Node.js      | 18.0.0          | 20.x LTS    |
| npm          | 9.0.0           | Latest      |
| pnpm         | 8.0.0           | Latest      |
| TypeScript   | 5.0.0           | 5.3+        |
| React        | 17.0.0          | 18.x        |
| React Native | 0.70.0          | 0.73+       |
| Flutter      | 3.0.0           | 3.16+       |

## Next Steps

Continue to [Quick Start](./quick-start.md) to build your first verification.
