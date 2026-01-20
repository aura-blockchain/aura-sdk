# Changelog

All notable changes to the Aura Verifier CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-30

### Added

#### Commands

- `aura-verify scan` - Interactive QR code verification with prompts
- `aura-verify check <qr-data>` - Direct QR code verification from command line
- `aura-verify status <vc-id>` - Check credential status on-chain
- `aura-verify did <did>` - Resolve and display DID documents
- `aura-verify config` - Configure network and CLI settings
- `aura-verify generate-qr` - Generate sample QR codes for testing

#### Features

- Colorful terminal output with success/failure indicators
- JSON output mode for scripting and automation (`--json` flag)
- Verbose mode for debugging (`--verbose` flag)
- Network selection (mainnet/testnet/local)
- Interactive prompts for user-friendly experience
- Configuration persistence across sessions
- QR code display in terminal
- Comprehensive error handling
- Exit codes for script integration
- Batch verification support
- Credential age validation
- Required credential type enforcement
- Offline verification mode
- Custom endpoint configuration
- DID caching for performance
- VC status caching

#### Output Formats

- Beautiful formatted tables for credentials
- Boxed status indicators
- Color-coded results (green=success, red=failure, yellow=warning)
- Detailed attribute display
- Network latency reporting
- Signature validation status

#### Documentation

- Comprehensive README.md with all commands
- EXAMPLES.md with practical usage scenarios
- QUICKSTART.md for new users
- Inline help text for all commands
- MIT License

### Technical Details

#### Dependencies

- `commander` ^11.1.0 - CLI framework
- `chalk` ^5.3.0 - Terminal colors
- `ora` ^8.0.1 - Loading spinners
- `qrcode-terminal` ^0.12.0 - Terminal QR display
- `qrcode` ^1.5.3 - QR code generation
- `enquirer` ^2.4.1 - Interactive prompts
- `conf` ^12.0.0 - Configuration management
- `cli-table3` ^0.6.3 - Table formatting
- `boxen` ^7.1.1 - Box drawing

#### Requirements

- Node.js >= 18.0.0
- TypeScript ^5.3.3

#### Build System

- TypeScript compilation with ESM output
- Source maps for debugging
- Type declarations included
- Executable shebang for direct execution

### Architecture

- Command pattern for extensibility
- Shared utility modules for code reuse
- Singleton verifier instance management
- Configuration-driven network selection
- Event-based error handling

### Testing Support

- Sample QR code generation
- Simple and complex test data
- Multiple credential type support
- Configurable expiration times

### Developer Experience

- TypeScript for type safety
- Modular command structure
- Reusable utility functions
- Clear separation of concerns
- Comprehensive error messages

## [Unreleased]

### Planned Features

- Shell completion (bash/zsh/fish)
- Watch mode for continuous verification
- Webhook support for notifications
- CSV/Excel export for batch results
- Multi-language support (i18n)
- Performance benchmarking
- Integration tests
- Docker image
- Homebrew formula
- Snap package

### Under Consideration

- GUI/TUI mode with terminal UI
- Real-time credential monitoring
- Revocation list management
- Credential issuance (if applicable)
- Analytics and reporting
- Plugin system for extensions

## Version History

- **1.0.0** - Initial release with core verification features
