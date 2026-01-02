# Contributing to Aura Verifier SDK

Thank you for your interest in contributing to the Aura Verifier SDK! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We pledge to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community

### Enforcement

Report violations to: dev@aurablockchain.org

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **pnpm**: Version 8.0.0 or higher
- **Git**: For version control
- **A GitHub account**: For submitting pull requests

### Setting Up Development Environment

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own fork.

2. **Clone your fork**

   ```bash
   git clone git@github.com:YOUR_USERNAME/aura-verifier-sdk.git
   cd aura-verifier-sdk
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream git@github.com:aura-blockchain/aura-verifier-sdk.git
   ```

4. **Install dependencies**

   ```bash
   pnpm install
   ```

5. **Build the project**

   ```bash
   pnpm build
   ```

6. **Run tests**

   ```bash
   pnpm test
   ```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### 4. Commit Your Changes

Follow the commit message guidelines (see below):

```bash
git add .
git commit -m "feat: add new signature verification method"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request"
3. Select your branch
4. Fill out the PR template
5. Submit the PR

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` type - use specific types or `unknown`
- Use interfaces for object shapes
- Document public APIs with JSDoc comments

### Naming Conventions

- **Classes**: PascalCase (`VerifierSDK`, `CacheManager`)
- **Functions**: camelCase (`verifySignature`, `parseQRCode`)
- **Variables**: camelCase (`publicKey`, `messageHash`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase (`VerifierConfig`, `QRCodeData`)

### Documentation

All public APIs must be documented with JSDoc:

```typescript
/**
 * Parse and validate an Aura verification QR code
 *
 * @param qrString - QR code string in URL format or raw base64
 * @param options - Optional parser configuration
 * @returns Parsed and validated QR code data
 * @throws {QRParseError} If QR code format is invalid
 */
export function parseQRCode(
  qrString: string,
  options?: QRParserOptions
): QRCodeData {
  // Implementation
}
```

## Testing Requirements

### Test Coverage

- **Minimum Coverage**: 80% for new code
- **Preferred Coverage**: 90%+
- All new features must include tests
- All bug fixes must include regression tests

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test verify.test.ts

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

## Pull Request Process

### Before Submitting

Ensure your PR meets these requirements:

- [ ] All tests pass (`pnpm test`)
- [ ] Code is properly formatted (`pnpm format`)
- [ ] Code passes linting (`pnpm lint`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] Documentation is updated
- [ ] Tests cover new functionality

### Review Process

1. **Automated Checks**: CI/CD runs tests, linting, type checking
2. **Code Review**: Maintainers review code quality, design, tests
3. **Feedback**: Address review comments
4. **Approval**: At least one maintainer must approve
5. **Merge**: Maintainers merge the PR

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
# Feature
feat(verifier): add support for secp256k1 signatures

# Bug fix
fix(qr-parser): handle malformed base64 data gracefully

# Documentation
docs(api): update VerifierSDK examples

# Breaking change
feat(api)!: change signature verification return type

BREAKING CHANGE: verifySignature now returns VerificationResult instead of boolean
```

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat and community support
- **Email**: dev@aurablockchain.org for direct contact

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask in GitHub Discussions
4. Join Discord for real-time help
5. Email for private inquiries

## Development Tips

### Useful Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Clean build artifacts
pnpm clean

# Run in development mode
pnpm dev
```

### Debugging

```typescript
// Enable debug logging
const verifier = new VerifierSDK({
  rpcEndpoint: 'https://rpc.aurablockchain.org',
  debug: true  // Enables verbose logging
});
```

## Thank You!

Thank you for contributing to the Aura Verifier SDK! Your efforts help make this project better for everyone.

---

**License**: By contributing, you agree that your contributions will be licensed under the MIT License.
