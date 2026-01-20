# Aura Verifier CLI

Professional command-line interface for verifying Aura blockchain credentials.

## Installation

### Global Installation

```bash
npm install -g @aura-network/verifier-cli
```

### Local Installation

```bash
npm install @aura-network/verifier-cli
```

### From Source

```bash
cd packages/cli
pnpm install
pnpm build
npm link
```

## Quick Start

```bash
# Interactive QR code verification
aura-verify scan

# Verify a QR code directly
aura-verify check "aura://verify?data=..."

# Check credential status
aura-verify status vc_123456789

# Configure network
aura-verify config
```

## Commands

### `aura-verify scan`

Interactive QR code verification. Prompts you to paste QR data and verifies the credential.

**Options:**

- `-n, --network <network>` - Network to use (mainnet|testnet|local) [default: mainnet]
- `-v, --verbose` - Enable verbose logging
- `-j, --json` - Output as JSON

**Example:**

```bash
aura-verify scan
# Paste QR code data when prompted
```

**Example with network:**

```bash
aura-verify scan --network testnet
```

---

### `aura-verify check <qr-data>`

Verify a QR code from the command line without interaction.

**Arguments:**

- `<qr-data>` - QR code data or URL to verify

**Options:**

- `-n, --network <network>` - Network to use (mainnet|testnet|local) [default: mainnet]
- `-r, --required-types <types...>` - Required VC types (space-separated)
- `-m, --max-age <seconds>` - Maximum credential age in seconds
- `-v, --verbose` - Enable verbose logging
- `-j, --json` - Output as JSON
- `-o, --offline` - Use offline verification only

**Examples:**

```bash
# Basic verification
aura-verify check "aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNfMT..."

# Require specific credential types
aura-verify check "aura://..." --required-types GovernmentID Biometric

# With maximum age constraint (1 hour)
aura-verify check "aura://..." --max-age 3600

# JSON output for scripting
aura-verify check "aura://..." --json

# Offline verification
aura-verify check "aura://..." --offline
```

**Exit Codes:**

- `0` - Verification successful
- `1` - Verification failed

---

### `aura-verify status <vc-id>`

Check the on-chain status of a verifiable credential.

**Arguments:**

- `<vc-id>` - Verifiable Credential ID to check

**Options:**

- `-n, --network <network>` - Network to use (mainnet|testnet|local) [default: mainnet]
- `-v, --verbose` - Enable verbose logging
- `-j, --json` - Output as JSON

**Examples:**

```bash
# Check credential status
aura-verify status vc_gov_id_001

# Check on testnet
aura-verify status vc_test_123 --network testnet

# JSON output
aura-verify status vc_123 --json
```

**Status Values:**

- `active` - Credential is valid and active
- `revoked` - Credential has been revoked
- `expired` - Credential has expired
- `suspended` - Credential is suspended
- `unknown` - Status unknown or not found

---

### `aura-verify did <did>`

Resolve and display a DID document from the blockchain.

**Arguments:**

- `<did>` - DID to resolve (e.g., did:aura:mainnet:aura1...)

**Options:**

- `-n, --network <network>` - Network to use (mainnet|testnet|local) [default: mainnet]
- `-v, --verbose` - Enable verbose logging
- `-j, --json` - Output as JSON

**Examples:**

```bash
# Resolve DID
aura-verify did did:aura:mainnet:aura1xyz123abc456

# Resolve on testnet
aura-verify did did:aura:testnet:aura1test --network testnet

# JSON output
aura-verify did did:aura:mainnet:aura1xyz123 --json
```

---

### `aura-verify config`

Configure network and CLI settings. Can be used interactively or with flags.

**Options:**

- `-s, --show` - Show current configuration
- `-r, --reset` - Reset configuration to defaults
- `-n, --network <network>` - Set network (mainnet|testnet|local)
- `--grpc <endpoint>` - Set custom gRPC endpoint
- `--rest <endpoint>` - Set custom REST endpoint
- `--verbose` - Enable verbose logging
- `--no-verbose` - Disable verbose logging
- `--json` - Enable JSON output
- `--no-json` - Disable JSON output

**Examples:**

```bash
# Interactive configuration
aura-verify config

# Show current config
aura-verify config --show

# Set network
aura-verify config --network testnet

# Set custom endpoints
aura-verify config --grpc http://localhost:9090 --rest http://localhost:1317

# Enable verbose logging
aura-verify config --verbose

# Reset to defaults
aura-verify config --reset
```

**Configuration File:**
The configuration is stored in:

- Linux: `~/.config/aura-verifier/config.json`
- macOS: `~/Library/Preferences/aura-verifier/config.json`
- Windows: `%APPDATA%\aura-verifier\Config\config.json`

---

### `aura-verify generate-qr`

Generate sample QR codes for testing purposes.

**Options:**

- `-t, --type <type>` - QR code type (simple|complex) [default: simple]
- `-o, --output <file>` - Save QR code to file (PNG)
- `-d, --display` - Display QR code in terminal [default: true]
- `--no-display` - Do not display QR code in terminal
- `-j, --json` - Output raw data as JSON

**Examples:**

```bash
# Interactive generation
aura-verify generate-qr

# Generate simple QR code
aura-verify generate-qr --type simple

# Generate complex QR code with multiple credentials
aura-verify generate-qr --type complex

# Save to file
aura-verify generate-qr --type simple --output sample.png

# Output as JSON (for scripting)
aura-verify generate-qr --type complex --json
```

**QR Code Types:**

- `simple` - Basic age verification (ageOver18)
- `complex` - Multiple credentials (GovernmentID, Biometric, Age)

---

## Global Options

All commands support these common options:

- `-v, --verbose` - Enable verbose logging
- `-j, --json` - Output as JSON (for scripting)
- `-n, --network <network>` - Network selection (mainnet|testnet|local)

## Networks

The CLI supports three networks:

### Mainnet (Production)

```bash
aura-verify check "..." --network mainnet
```

- gRPC: `rpc.aurablockchain.org:9090`
- REST: `https://api.aurablockchain.org`

### Testnet (Testing)

```bash
aura-verify check "..." --network testnet
```

- gRPC: `testnet-grpc.aurablockchain.org:443`
- REST: `https://testnet-api.aurablockchain.org`

### Local (Development)

```bash
aura-verify check "..." --network local
```

- gRPC: `localhost:9090`
- REST: `http://localhost:1317`

## Output Formats

### Human-Readable (Default)

Colorful, formatted output with tables and boxes:

```
╔═══════════════════════════════════════════╗
║             ✓ VALID                       ║
╔═══════════════════════════════════════════╗

Presentation Details:
  Holder DID:       did:aura:mainnet:aura1xyz...
  Presentation ID:  pres_1234567890
  Expires At:       2024-12-31T23:59:59.000Z
  Verification:     online
  Signature Valid:  Yes
  Network Latency:  156ms

Verifiable Credentials:
┌──────────────────────┬───────┬────────────────┬──────────┐
│ Type                 │ Status│ Issuer         │ On-Chain │
├──────────────────────┼───────┼────────────────┼──────────┤
│ GovernmentID         │ active│ did:aura:is... │    ✓     │
└──────────────────────┴───────┴────────────────┴──────────┘

Disclosed Attributes:
┌──────────────────────┬──────────────────────┐
│ Attribute            │ Value                │
├──────────────────────┼──────────────────────┤
│ ageOver18            │ true                 │
│ ageOver21            │ true                 │
│ cityState            │ San Francisco, CA    │
└──────────────────────┴──────────────────────┘
```

### JSON Output

Machine-readable JSON for scripting and automation:

```bash
aura-verify check "..." --json
```

```json
{
  "isValid": true,
  "holderDID": "did:aura:mainnet:aura1xyz...",
  "presentationId": "pres_1234567890",
  "vcDetails": [
    {
      "vcId": "vc_gov_id_001",
      "vcType": "GovernmentID",
      "issuerDID": "did:aura:issuer",
      "issuedAt": "2024-01-01T00:00:00.000Z",
      "status": "active",
      "signatureValid": true,
      "onChain": true
    }
  ],
  "attributes": {
    "ageOver18": true,
    "ageOver21": true,
    "cityState": "San Francisco, CA"
  },
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "verificationMethod": "online",
  "signatureValid": true,
  "networkLatency": 156
}
```

## Scripting & Automation

The CLI is designed for both interactive use and automation:

### Exit Codes

All commands follow standard exit code conventions:

- `0` - Success
- `1` - Failure/Error

### JSON Mode

Use `--json` flag for machine-readable output:

```bash
# Verify and capture result
result=$(aura-verify check "..." --json)

# Check if valid
if echo "$result" | jq -e '.isValid' > /dev/null; then
    echo "Credential is valid"
else
    echo "Credential is invalid"
fi
```

### Batch Processing

```bash
# Verify multiple credentials
while IFS= read -r qr_data; do
    if aura-verify check "$qr_data" --json | jq -e '.isValid' > /dev/null; then
        echo "✓ Valid: $qr_data"
    else
        echo "✗ Invalid: $qr_data"
    fi
done < qr_codes.txt
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Verify Credential
  run: |
    if aura-verify check "$QR_DATA" --json; then
      echo "Verification passed"
    else
      echo "Verification failed"
      exit 1
    fi
```

## Environment Variables

The CLI respects these environment variables:

- `DEBUG=1` - Enable debug output (stack traces on errors)
- `NO_COLOR=1` - Disable colored output
- `FORCE_COLOR=1` - Force colored output (even in non-TTY)

## Troubleshooting

### Connection Issues

If you're having trouble connecting to the network:

```bash
# Try verbose mode to see detailed logs
aura-verify check "..." --verbose

# Test with testnet
aura-verify check "..." --network testnet

# Use custom endpoints
aura-verify config --grpc http://custom-node:9090 --rest http://custom-node:1317
```

### Cache Issues

If you're seeing stale data:

```bash
# Reset configuration (clears cache)
aura-verify config --reset
```

### Debug Mode

Enable debug mode for detailed error information:

```bash
DEBUG=1 aura-verify check "..."
```

## Examples

### Basic Verification Workflow

```bash
# 1. Generate a test QR code
aura-verify generate-qr --type simple --output test.png

# 2. The command will output the QR data, copy it

# 3. Verify the QR code
aura-verify check "aura://verify?data=..."

# 4. Check credential status
aura-verify status vc_gov_id_001

# 5. Resolve DID
aura-verify did did:aura:mainnet:aura1xyz...
```

### Production Use Case

```bash
# Configure for production
aura-verify config --network mainnet --verbose

# Verify with strict requirements
aura-verify check "$QR_DATA" \
  --required-types GovernmentID Biometric \
  --max-age 86400 \
  --json > verification_result.json

# Check result
if jq -e '.isValid' verification_result.json > /dev/null; then
    echo "Access granted"
else
    echo "Access denied"
fi
```

### Testing & Development

```bash
# Use local network for testing
aura-verify config --network local \
  --grpc http://localhost:9090 \
  --rest http://localhost:1317

# Generate test data
aura-verify generate-qr --type complex --json > test_qr.json

# Extract QR data and verify
QR_DATA=$(jq -r '.qrData' test_qr.json)
aura-verify check "$QR_DATA" --verbose
```

## API Integration

Use the CLI in your applications:

### Node.js

```javascript
const { execSync } = require('child_process');

function verifyCredential(qrData) {
  try {
    const result = execSync(`aura-verify check "${qrData}" --json`, {
      encoding: 'utf-8',
    });
    return JSON.parse(result);
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}
```

### Python

```python
import subprocess
import json

def verify_credential(qr_data):
    try:
        result = subprocess.run(
            ['aura-verify', 'check', qr_data, '--json'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError:
        return {'isValid': False}
```

### Shell Script

```bash
#!/bin/bash

verify_credential() {
    local qr_data="$1"
    local result=$(aura-verify check "$qr_data" --json 2>/dev/null)

    if echo "$result" | jq -e '.isValid' > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Usage
if verify_credential "$QR_DATA"; then
    echo "Valid credential"
else
    echo "Invalid credential"
fi
```

## Support

- Documentation: https://github.com/aura-blockchain/aura-verifier-sdk
- Issues: https://github.com/aura-blockchain/aura-verifier-sdk/issues
- Discord: https://discord.gg/aurablockchain-network

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.
