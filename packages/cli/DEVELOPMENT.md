# Aura Verifier CLI - Development Guide

This guide is for developers who want to contribute to or maintain the Aura Verifier CLI.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm
- TypeScript knowledge
- Git

### Initial Setup

```bash
# Clone the repository
git clone git@github.com:aura-blockchain/aura-verifier-sdk.git
cd aura-verifier-sdk

# Install dependencies (from root)
pnpm install

# Build core package first
cd packages/core
pnpm build

# Build CLI package
cd ../cli
pnpm build

# Link for local testing
npm link
```

### Development Workflow

```bash
# Watch mode (auto-rebuild on changes)
pnpm dev

# In another terminal, test your changes
aura-verify --help
```

## Project Structure

```
packages/cli/
├── src/
│   ├── commands/          # Command implementations
│   │   ├── check.ts       # aura-verify check
│   │   ├── config.ts      # aura-verify config
│   │   ├── did.ts         # aura-verify did
│   │   ├── generate-qr.ts # aura-verify generate-qr
│   │   ├── scan.ts        # aura-verify scan
│   │   └── status.ts      # aura-verify status
│   ├── utils/             # Shared utilities
│   │   ├── config.ts      # Configuration management
│   │   ├── output.ts      # Output formatting
│   │   ├── qr.ts          # QR code utilities
│   │   ├── verifier.ts    # Verifier instance management
│   │   └── index.ts       # Exports
│   └── index.ts           # Main CLI entry point
├── package.json           # Package metadata and dependencies
├── tsconfig.json          # TypeScript configuration
├── tsconfig.build.json    # Build-specific TypeScript config
├── README.md              # User documentation
├── QUICKSTART.md          # Quick start guide
├── EXAMPLES.md            # Usage examples
├── CHANGELOG.md           # Version history
├── DEVELOPMENT.md         # This file
├── PACKAGE_OVERVIEW.md    # Technical overview
├── LICENSE                # MIT License
├── .gitignore            # Git ignore patterns
└── .npmignore            # NPM ignore patterns
```

## Adding a New Command

### 1. Create Command File

```typescript
// src/commands/my-command.ts
import { Command } from 'commander';
import ora from 'ora';
import type { NetworkType } from '@aura-network/verifier-sdk';
import { getVerifier, destroyVerifier } from '../utils/verifier.js';
import { success, error } from '../utils/output.js';
import { configManager } from '../utils/config.js';

export function createMyCommand(): Command {
  const command = new Command('my-command');

  command
    .description('Description of my command')
    .argument('<arg>', 'Required argument')
    .option('-n, --network <network>', 'Network to use', 'mainnet')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-j, --json', 'Output as JSON')
    .action(async (arg: string, options) => {
      const network = options.network as NetworkType;
      const verbose = options.verbose || configManager.get('verbose');
      const jsonOutput = options.json || configManager.get('jsonOutput');

      const spinner = jsonOutput ? null : ora('Processing...').start();

      try {
        const verifier = await getVerifier({ network, verbose });

        // Your command logic here
        const result = await verifier.someMethod(arg);

        spinner?.stop();

        // Output result
        if (jsonOutput) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          success('Operation completed successfully');
          // Pretty print result
        }

        await destroyVerifier();
        process.exit(0);
      } catch (err) {
        spinner?.fail('Operation failed');

        if (jsonOutput) {
          console.error(
            JSON.stringify(
              {
                error: err instanceof Error ? err.message : String(err),
              },
              null,
              2
            )
          );
        } else {
          error(err instanceof Error ? err.message : String(err));
        }

        await destroyVerifier();
        process.exit(1);
      }
    });

  return command;
}
```

### 2. Register Command

```typescript
// src/index.ts
import { createMyCommand } from './commands/my-command.js';

// ... existing imports ...

program.addCommand(createMyCommand());
```

### 3. Add Tests (Future)

```typescript
// src/commands/__tests__/my-command.test.ts
import { describe, it, expect } from 'vitest';
import { createMyCommand } from '../my-command.js';

describe('my-command', () => {
  it('should execute successfully', async () => {
    // Test implementation
  });
});
```

### 4. Update Documentation

- Add command to README.md
- Add examples to EXAMPLES.md
- Update CHANGELOG.md

## Code Style Guide

### TypeScript

```typescript
// Use explicit types
function verify(qrData: string): Promise<VerificationResult> {
  // Implementation
}

// Use interfaces for objects
interface CommandOptions {
  network: NetworkType;
  verbose: boolean;
  jsonOutput: boolean;
}

// Use async/await over promises
async function doSomething(): Promise<void> {
  const result = await asyncOperation();
  return result;
}

// Handle errors properly
try {
  await operation();
} catch (err) {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
```

### Naming Conventions

- **Commands**: lowercase with hyphens (`generate-qr`, `check-status`)
- **Functions**: camelCase (`createCommand`, `printResult`)
- **Types**: PascalCase (`NetworkType`, `VerificationResult`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `MAX_RETRIES`)
- **Files**: kebab-case (`my-command.ts`, `output-formatter.ts`)

### Import Order

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External dependencies
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// 3. SDK imports
import type { NetworkType } from '@aura-network/verifier-sdk';

// 4. Internal imports
import { getVerifier } from '../utils/verifier.js';
import { success, error } from '../utils/output.js';
```

### Error Handling Pattern

```typescript
// Always use this pattern
const spinner = jsonOutput ? null : ora('Loading...').start();

try {
  // Operation
  const result = await operation();

  spinner?.stop();

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    success('Success message');
  }

  process.exit(0);
} catch (err) {
  spinner?.fail('Error message');

  if (jsonOutput) {
    console.error(
      JSON.stringify(
        {
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2
      )
    );
  } else {
    error(err instanceof Error ? err.message : String(err));
  }

  process.exit(1);
}
```

## Output Formatting

### Use Existing Utilities

```typescript
import { success, error, warning, info, verbose } from '../utils/output.js';

// Success message
success('Operation completed');

// Error message
error('Operation failed');

// Warning message
warning('This is deprecated');

// Info message
info('Starting operation...');

// Verbose message (only shown in verbose mode)
verbose('Debug information', { verbose: options.verbose });
```

### JSON Output

Always support JSON output for scripting:

```typescript
if (options.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  // Human-readable output
  printHumanReadable(result);
}
```

### Tables

```typescript
import Table from 'cli-table3';
import chalk from 'chalk';

const table = new Table({
  head: [chalk.cyan('Column 1'), chalk.cyan('Column 2')],
  colWidths: [30, 50],
});

table.push(['Value 1', 'Value 2']);
console.log(table.toString());
```

## Testing

### Manual Testing

```bash
# Build
pnpm build

# Test command
aura-verify my-command --help
aura-verify my-command test-arg --verbose

# Test with different networks
aura-verify my-command test-arg --network testnet
aura-verify my-command test-arg --network local

# Test JSON output
aura-verify my-command test-arg --json

# Test error cases
aura-verify my-command invalid-arg
```

### Automated Testing (Future)

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

## Building and Publishing

### Build

```bash
# Clean previous build
pnpm clean

# Build TypeScript
pnpm build

# Verify build
ls -la dist/
```

### Pre-publish Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run `pnpm build`
- [ ] Test locally with `npm link`
- [ ] Verify all commands work
- [ ] Check documentation is up-to-date
- [ ] Commit all changes
- [ ] Create git tag

### Publishing

```bash
# Build
pnpm build

# Publish to NPM (requires authentication)
npm publish --access public

# Tag release in Git
git tag v1.0.0
git push origin v1.0.0
```

## Debugging

### Enable Debug Mode

```bash
DEBUG=1 aura-verify command --verbose
```

### Check Configuration

```bash
# Show config file location
aura-verify config --show

# Reset config
aura-verify config --reset
```

### Test with Local SDK

```bash
# In core package
cd packages/core
pnpm build

# In CLI package
cd packages/cli
pnpm build
npm link

# Test
aura-verify --version
```

### Common Issues

#### Command Not Found

```bash
# Verify link
npm list -g @aura-network/verifier-cli

# Re-link
npm unlink -g
npm link
```

#### TypeScript Errors

```bash
# Check TypeScript version
tsc --version

# Verify types
pnpm typecheck
```

#### Import Errors

- Ensure all imports end with `.js` (ESM requirement)
- Check `package.json` has `"type": "module"`
- Verify `tsconfig.json` targets ESM

## Performance Optimization

### Lazy Loading

```typescript
// Bad: Import everything upfront
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier(config);

// Good: Only import when needed
async function getVerifier() {
  const { AuraVerifier } = await import('@aura-network/verifier-sdk');
  return new AuraVerifier(config);
}
```

### Caching

```typescript
// Singleton pattern for verifier
let verifierInstance: AuraVerifier | null = null;

export async function getVerifier(options) {
  if (!verifierInstance) {
    verifierInstance = new AuraVerifier(options);
    await verifierInstance.initialize();
  }
  return verifierInstance;
}
```

### Parallel Operations

```typescript
// Bad: Sequential
const did1 = await verifier.resolveDID(did1);
const did2 = await verifier.resolveDID(did2);

// Good: Parallel
const [did1, did2] = await Promise.all([verifier.resolveDID(did1), verifier.resolveDID(did2)]);
```

## Security Best Practices

### Input Validation

```typescript
// Validate user input
if (!qrData || qrData.trim().length === 0) {
  throw new Error('QR data cannot be empty');
}

// Sanitize for logs
import { sanitizeForLog } from '../utils/output.js';
console.log(sanitizeForLog(userInput));
```

### Environment Variables

```typescript
// Never log sensitive data
if (process.env.DEBUG) {
  console.log('Debug info:', sanitized);
}
```

### Error Messages

```typescript
// Bad: Expose internal details
throw new Error(`Database connection failed: ${dbPassword}`);

// Good: Generic message
throw new Error('Connection failed. Check configuration.');
```

## Documentation Standards

### Command Help Text

```typescript
command
  .description('Clear, concise description of what the command does')
  .argument('<required>', 'Description of required argument')
  .option('-o, --optional <value>', 'Description of optional flag', 'default')
  .addHelpText(
    'after',
    `
Examples:
  $ aura-verify command arg
  $ aura-verify command arg --optional value
  `
  );
```

### Code Comments

```typescript
/**
 * Verify a credential presentation
 *
 * @param qrData - QR code data string
 * @param options - Verification options
 * @returns Verification result
 * @throws {Error} If verification fails
 */
async function verify(qrData: string, options: Options): Promise<Result> {
  // Implementation
}
```

### README Updates

When adding features:

1. Add to command list
2. Add usage examples
3. Update table of contents
4. Add to EXAMPLES.md if complex

## Contributing Guidelines

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/my-feature`)
3. Make changes
4. Test thoroughly
5. Update documentation
6. Commit with clear messages
7. Push to fork
8. Create pull request

### Commit Messages

```bash
# Format: <type>(<scope>): <subject>

feat(cli): add new verify-batch command
fix(output): correct table alignment
docs(readme): update installation instructions
chore(deps): update dependencies
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `chore/` - Maintenance

## Troubleshooting Development Issues

### Build Fails

```bash
# Clean everything
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

### Type Errors

```bash
# Check types without building
pnpm typecheck

# Check specific file
tsc --noEmit src/commands/my-command.ts
```

### Import Resolution

```bash
# Verify module resolution
tsc --showConfig

# Check if file exists
ls dist/commands/my-command.js
```

## Future Enhancements

### Planned Features

1. **Shell Completion**

   - Bash, Zsh, Fish support
   - Auto-complete commands and options

2. **Watch Mode**

   - Continuous verification
   - File watching

3. **Plugins**

   - External command plugins
   - Custom output formats

4. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

### Architecture Improvements

1. **Modular Output**

   - Plugin-based formatters
   - Custom themes

2. **Configuration**

   - Multiple profiles
   - Environment-based config

3. **Performance**
   - Parallel batch verification
   - Connection pooling

## Resources

### Documentation

- [Commander.js](https://github.com/tj/commander.js)
- [Chalk](https://github.com/chalk/chalk)
- [Ora](https://github.com/sindresorhus/ora)
- [Enquirer](https://github.com/enquirer/enquirer)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESM in Node.js](https://nodejs.org/api/esm.html)

### Aura Network

- [Aura Docs](https://docs.aurablockchain.org)
- [Verifier SDK](../../README.md)

## Support

For development questions:

- Open an issue on GitHub
- Join Discord #development channel
- Check existing documentation

Happy coding!
