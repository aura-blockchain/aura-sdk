# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email: security@aurablockchain.org
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Disclosure Policy

- We follow coordinated disclosure practices
- Security advisories will be published after fixes are released
- Credit will be given to reporters (unless anonymity is requested)

## Security Best Practices

When using this SDK:

1. **Keep dependencies updated** - Run `pnpm audit` regularly
2. **Validate all inputs** - Never trust QR code data without verification
3. **Use HTTPS endpoints** - Always connect to mainnet/testnet via HTTPS
4. **Protect private keys** - Never log or expose cryptographic keys
5. **Check expiration** - Always verify credential expiration timestamps
6. **Verify revocation status** - Check the blockchain for revoked credentials

See [Security Guide](./docs/security-guide.md) for detailed implementation guidance.
