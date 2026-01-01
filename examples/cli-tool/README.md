# CLI Tool Example - Aura Verifier SDK

A command-line interface tool for verifying Aura blockchain credentials from your terminal. Features colored output, progress indicators, and multiple verification modes.

## Features

- Verify credentials from QR code data
- Parse QR codes without full verification
- Check credential status
- Quick age verification (18+, 21+)
- Colored terminal output with Chalk
- Progress indicators with Ora
- Table formatting for detailed output
- JSON output mode for scripting
- Verbose mode for detailed information

## Prerequisites

- Node.js >= 18.0.0
- pnpm (or npm/yarn)

## Installation

From the repository root:

```bash
# Install dependencies
pnpm install

# Build the SDK and CLI
pnpm build
```

## Usage

### Verify a Credential

```bash
# Basic verification
pnpm start verify "aura://verify?data=eyJ2IjoiMS4wIiwi..."

# With verbose output
pnpm start verify "aura://verify?data=..." --verbose

# JSON output (for scripting)
pnpm start verify "aura://verify?data=..." --json

# Use mainnet
pnpm start verify "aura://verify?data=..." --network mainnet

# Custom timeout
pnpm start verify "aura://verify?data=..." --timeout 15000
```

### Parse QR Code

Parse and display QR code data without full blockchain verification:

```bash
# Parse QR code
pnpm start parse "aura://verify?data=..."

# JSON output
pnpm start parse "aura://verify?data=..." --json
```

### Check Credential Status

Check if a specific credential is active, revoked, or expired:

```bash
# Check status
pnpm start status "vc_age_21_test123"

# JSON output
pnpm start status "vc_age_21_test123" --json

# Use mainnet
pnpm start status "vc_age_21_test123" --network mainnet
```

### Quick Age Verification

```bash
# Check if 21+
pnpm start age-21 "aura://verify?data=..."

# Check if 18+
pnpm start age-18 "aura://verify?data=..."

# JSON output
pnpm start age-21 "aura://verify?data=..." --json
```

## Commands

### verify

Verify a credential from QR code data.

```bash
aura-verify verify <qr-code> [options]
```

**Arguments:**
- `<qr-code>` - QR code data (aura://verify?data=... or base64)

**Options:**
- `-n, --network <network>` - Network to use (mainnet/testnet) [default: testnet]
- `-t, --timeout <ms>` - Request timeout in milliseconds [default: 10000]
- `-v, --verbose` - Show verbose output
- `-j, --json` - Output as JSON

**Exit codes:**
- `0` - Verification successful
- `1` - Verification failed or error occurred

### parse

Parse and display QR code data without verification.

```bash
aura-verify parse <qr-code> [options]
```

**Arguments:**
- `<qr-code>` - QR code data

**Options:**
- `-j, --json` - Output as JSON

### status

Check the status of a credential.

```bash
aura-verify status <vc-id> [options]
```

**Arguments:**
- `<vc-id>` - Verifiable Credential ID

**Options:**
- `-n, --network <network>` - Network to use [default: testnet]
- `-t, --timeout <ms>` - Request timeout [default: 10000]
- `-j, --json` - Output as JSON

### age-21

Quick check if holder is 21 or older.

```bash
aura-verify age-21 <qr-code> [options]
```

**Arguments:**
- `<qr-code>` - QR code data

**Options:**
- `-n, --network <network>` - Network to use [default: testnet]
- `-j, --json` - Output as JSON

**Exit codes:**
- `0` - Holder is 21+
- `1` - Holder is not 21+ or error occurred

### age-18

Quick check if holder is 18 or older.

```bash
aura-verify age-18 <qr-code> [options]
```

**Arguments:**
- `<qr-code>` - QR code data

**Options:**
- `-n, --network <network>` - Network to use [default: testnet]
- `-j, --json` - Output as JSON

**Exit codes:**
- `0` - Holder is 18+
- `1` - Holder is not 18+ or error occurred

## Example Output

### Successful Verification

```
✔ Verifier initialized
✔ QR code parsed
✔ Verification complete

════════════════════════════════════════════════════════════
✓ VERIFICATION SUCCESSFUL
════════════════════════════════════════════════════════════

Verification Details
──────────────────────────────────────────────────────────
Holder DID: did:aura:testnet:abc123def456
Verified At: 2025-01-15T10:30:00.000Z
Audit ID: audit_xyz789
Network Latency: 150ms

Verified Attributes
──────────────────────────────────────────────────────────
is_over_21: Yes

Credentials
──────────────────────────────────────────────────────────
✓ Valid - AGE_OVER_21 (vc_age_21_test123)
```

### Failed Verification

```
✔ Verifier initialized
✔ QR code parsed
⠴ Verifying credential...

════════════════════════════════════════════════════════════
✗ VERIFICATION FAILED
════════════════════════════════════════════════════════════

Verification Details
──────────────────────────────────────────────────────────
Holder DID: did:aura:testnet:abc123def456
Verified At: 2025-01-15T10:30:00.000Z
Audit ID: audit_xyz789
Error: Credential has been revoked
```

### JSON Output

```json
{
  "isValid": true,
  "holderDID": "did:aura:testnet:abc123def456",
  "verifiedAt": "2025-01-15T10:30:00.000Z",
  "attributes": {
    "is_over_21": true
  },
  "vcDetails": [
    {
      "vcId": "vc_age_21_test123",
      "vcType": 3,
      "isValid": true,
      "isExpired": false,
      "isRevoked": false,
      "issuedAt": "2025-01-01T00:00:00.000Z",
      "expiresAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "auditId": "audit_xyz789",
  "networkLatency": 150
}
```

## Scripting Examples

### Bash Script

```bash
#!/bin/bash

QR_CODE="aura://verify?data=..."

# Verify and capture result
if pnpm start verify "$QR_CODE" --json > result.json 2>&1; then
  echo "Verification successful"
  cat result.json
else
  echo "Verification failed"
  cat result.json
fi
```

### Check Age for Multiple QR Codes

```bash
#!/bin/bash

QR_CODES=(
  "aura://verify?data=..."
  "aura://verify?data=..."
)

for qr in "${QR_CODES[@]}"; do
  if pnpm start age-21 "$qr" --json > /dev/null 2>&1; then
    echo "✓ 21+"
  else
    echo "✗ Not 21+"
  fi
done
```

### Python Integration

```python
import subprocess
import json

def verify_credential(qr_code):
    result = subprocess.run(
        ['pnpm', 'start', 'verify', qr_code, '--json'],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        return json.loads(result.stdout)
    else:
        return None

# Usage
qr_code = "aura://verify?data=..."
result = verify_credential(qr_code)

if result and result['isValid']:
    print(f"Valid credential for {result['holderDID']}")
else:
    print("Invalid credential")
```

## Building for Distribution

To build the CLI tool as a standalone executable:

```bash
# Build TypeScript
pnpm build

# Make executable (Unix/Linux/macOS)
chmod +x dist/index.js

# Run built version
./dist/index.js verify "aura://verify?data=..."

# Or install globally (from examples/cli-tool)
npm link

# Then use anywhere
aura-verify verify "aura://verify?data=..."
```

## Use Cases

1. **Bar/Nightclub Entry**: Quickly verify age at the door
2. **Event Access**: Verify ticket credentials
3. **Automation Scripts**: Integrate with automated verification workflows
4. **Testing**: Manually test credential verification during development
5. **Batch Processing**: Process multiple credentials in shell scripts
6. **CI/CD**: Integrate credential checks into deployment pipelines

## Next Steps

- Add interactive mode with prompts
- Implement QR code scanning from images
- Add configuration file support (~/.aura-verify.json)
- Create shell completion scripts
- Add credential caching for faster repeated verifications

## Learn More

- [Basic Node.js Example](../basic-node/)
- [Express API Example](../express-api/)
- [Offline Mode Example](../offline-mode/)
- [SDK Documentation](../../README.md)
