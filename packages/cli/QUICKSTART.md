# Aura Verifier CLI - Quick Start Guide

Get up and running with the Aura Verifier CLI in minutes.

## Installation

```bash
# Install globally
npm install -g @aura-network/verifier-cli

# Or with pnpm
pnpm add -g @aura-network/verifier-cli

# Or with yarn
yarn global add @aura-network/verifier-cli
```

## Verify Installation

```bash
aura-verify --version
```

## 5-Minute Tutorial

### Step 1: Configure the CLI

```bash
aura-verify config
```

Follow the prompts:

- Network: **mainnet** (for production) or **testnet** (for testing)
- Custom endpoints: **No** (use defaults)
- Verbose logging: **No**
- JSON output: **No**

### Step 2: Generate a Test QR Code

```bash
aura-verify generate-qr
```

The CLI will:

1. Display a QR code in your terminal
2. Show the QR data string
3. Provide example commands to verify it

Copy the QR data string (starts with `aura://verify?data=...`)

### Step 3: Verify the QR Code

```bash
aura-verify scan
```

Paste the QR data when prompted. You'll see a detailed verification result.

### Step 4: Try Other Commands

```bash
# Check credential status
aura-verify status vc_gov_id_001

# Resolve a DID
aura-verify did did:aura:mainnet:aura1xyz...

# View configuration
aura-verify config --show
```

## Common Use Cases

### Age Verification at a Bar/Restaurant

```bash
# Customer shows QR code
# Staff scans and verifies age 21+

aura-verify scan

# Check result:
# ✓ If valid and ageOver21 = true → Allow entry
# ✗ If invalid or ageOver21 = false → Deny entry
```

### Government ID Verification

```bash
# Verify QR code and require government ID
aura-verify check "$QR_DATA" --required-types GovernmentID

# Exit code 0 = valid, 1 = invalid
```

### KYC Compliance Check

```bash
# Verify with multiple requirements
aura-verify check "$QR_DATA" \
  --required-types GovernmentID Biometric \
  --max-age 2592000  # 30 days

# Get JSON output for logging
aura-verify check "$QR_DATA" --json > kyc_result.json
```

### Monitoring Credential Status

```bash
# Check if credential is still active
aura-verify status vc_12345678

# In a script
if aura-verify status vc_12345678 | grep -q "ACTIVE"; then
    echo "Credential is valid"
else
    echo "Credential is revoked/expired"
fi
```

## Output Modes

### Human-Readable (Default)

Colorful, formatted output perfect for interactive use:

```bash
aura-verify check "$QR_DATA"
```

### JSON (For Scripting)

Machine-readable output for automation:

```bash
aura-verify check "$QR_DATA" --json
```

Extract specific fields:

```bash
# Check if valid
aura-verify check "$QR_DATA" --json | jq '.isValid'

# Get disclosed attributes
aura-verify check "$QR_DATA" --json | jq '.attributes'

# Get credential types
aura-verify check "$QR_DATA" --json | jq '.vcDetails[].vcType'
```

## Network Selection

### Mainnet (Production)

```bash
aura-verify config --network mainnet
# or
aura-verify check "$QR_DATA" --network mainnet
```

### Testnet (Testing)

```bash
aura-verify config --network testnet
# or
aura-verify check "$QR_DATA" --network testnet
```

### Local (Development)

```bash
aura-verify config --network local
# or
aura-verify check "$QR_DATA" --network local
```

## Tips & Tricks

### 1. Use Configuration for Repeated Tasks

Instead of:

```bash
aura-verify check "$QR_DATA" --network testnet --verbose
aura-verify status vc_123 --network testnet --verbose
```

Do this:

```bash
aura-verify config --network testnet --verbose
aura-verify check "$QR_DATA"
aura-verify status vc_123
```

### 2. Create Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias av='aura-verify'
alias avs='aura-verify scan'
alias avc='aura-verify check'
alias avst='aura-verify status'
```

Then use:

```bash
av scan
avc "$QR_DATA"
avst vc_123
```

### 3. Quick Status Check

```bash
# One-liner to check if credential is active
aura-verify status vc_123 --json | jq -r '.status' | grep -q active && echo "OK" || echo "FAIL"
```

### 4. Batch Verification

Create a file `qr_codes.txt` with one QR data string per line:

```bash
while read qr; do
    if aura-verify check "$qr" --json | jq -e '.isValid' > /dev/null; then
        echo "✓ $qr"
    else
        echo "✗ $qr"
    fi
done < qr_codes.txt
```

### 5. Debug Mode

Enable detailed logging:

```bash
DEBUG=1 aura-verify check "$QR_DATA" --verbose
```

## Next Steps

- Read the [full documentation](./README.md)
- Explore [usage examples](./EXAMPLES.md)
- Check the [SDK documentation](../../README.md)
- Join the [Aura Network Discord](https://discord.gg/aurablockchain-network)

## Getting Help

```bash
# Show all commands
aura-verify --help

# Show command-specific help
aura-verify check --help
aura-verify scan --help
aura-verify config --help
```

## Troubleshooting

### Command Not Found

```bash
# Check if installed
npm list -g @aura-network/verifier-cli

# Reinstall
npm install -g @aura-network/verifier-cli
```

### Connection Issues

```bash
# Test with verbose mode
aura-verify check "$QR_DATA" --verbose

# Try testnet
aura-verify check "$QR_DATA" --network testnet
```

### Configuration Issues

```bash
# Show current config
aura-verify config --show

# Reset to defaults
aura-verify config --reset
```

## Support

- Issues: https://github.com/aura-blockchain/aura-verifier-sdk/issues
- Discord: https://discord.gg/aurablockchain-network
- Documentation: https://github.com/aura-blockchain/aura-verifier-sdk
