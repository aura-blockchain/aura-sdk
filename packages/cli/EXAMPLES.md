# Aura Verifier CLI - Usage Examples

This document provides practical examples of using the Aura Verifier CLI.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Verification](#basic-verification)
- [Advanced Verification](#advanced-verification)
- [Credential Status Checking](#credential-status-checking)
- [DID Resolution](#did-resolution)
- [Configuration Management](#configuration-management)
- [Testing & Development](#testing--development)
- [Scripting & Automation](#scripting--automation)

## Getting Started

### Installation

```bash
# Install globally
npm install -g @aura-network/verifier-cli

# Verify installation
aura-verify --version
```

### First Run

```bash
# Configure the CLI
aura-verify config

# Follow the prompts:
# - Select network: mainnet
# - Custom endpoints: No
# - Verbose logging: No
# - JSON output: No
```

## Basic Verification

### Interactive Scan

The simplest way to verify a credential:

```bash
$ aura-verify scan

ℹ Starting interactive QR verification on mainnet network

? Paste QR code data or URL: aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNfMT...

⠋ Verifying credential...

╔═══════════════════════════════════════════╗
║             ✓ VALID                       ║
╚═══════════════════════════════════════════╝

Presentation Details:
  Holder DID:       did:aura:mainnet:aura1xyz...
  Presentation ID:  pres_1234567890
  Expires At:       2024-12-31T23:59:59.000Z
  Verification:     online
  Signature Valid:  Yes
  Network Latency:  156ms

✓ Verification completed successfully
```

### Direct Verification

Verify without interaction:

```bash
$ aura-verify check "aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXNfMT..."
```

## Advanced Verification

### Require Specific Credentials

Only allow presentations that include specific credential types:

```bash
# Require government ID
$ aura-verify check "$QR_DATA" --required-types GovernmentID

# Require multiple types
$ aura-verify check "$QR_DATA" --required-types GovernmentID Biometric

# Require proof of humanity
$ aura-verify check "$QR_DATA" --required-types ProofOfHumanity
```

### Age Restrictions

Limit credential freshness:

```bash
# Credentials must be less than 1 hour old (3600 seconds)
$ aura-verify check "$QR_DATA" --max-age 3600

# Credentials must be less than 24 hours old
$ aura-verify check "$QR_DATA" --max-age 86400

# Credentials must be less than 30 days old
$ aura-verify check "$QR_DATA" --max-age 2592000
```

### Combined Requirements

```bash
# Require government ID issued within last 30 days
$ aura-verify check "$QR_DATA" \
    --required-types GovernmentID \
    --max-age 2592000 \
    --verbose

# Require multiple credentials with age limit
$ aura-verify check "$QR_DATA" \
    --required-types GovernmentID Biometric AgeVerification \
    --max-age 86400
```

### Offline Verification

Use cached data only (no network access):

```bash
$ aura-verify check "$QR_DATA" --offline
```

## Credential Status Checking

### Check Individual Credential

```bash
$ aura-verify status vc_gov_id_001

╔═══════════════════════════════════════════╗
║             ✓ ACTIVE                      ║
╚═══════════════════════════════════════════╝

Credential ID: vc_gov_id_001
Status: active

✓ Credential is active
```

### Check on Different Networks

```bash
# Check on testnet
$ aura-verify status vc_test_123 --network testnet

# Check on local network
$ aura-verify status vc_local_456 --network local
```

### Batch Status Checking

```bash
# Check multiple credentials
for vc_id in vc_001 vc_002 vc_003; do
    echo "Checking $vc_id..."
    aura-verify status "$vc_id" --json | jq -r '.status'
done
```

## DID Resolution

### Resolve DID Document

```bash
$ aura-verify did did:aura:mainnet:aura1xyz123abc456

╔═══════════════════════════════════════════╗
║          DID Document                     ║
╚═══════════════════════════════════════════╝

DID: did:aura:mainnet:aura1xyz123abc456

Verification Methods:
┌────────────────────────┬─────────────────┬──────────────────┐
│ ID                     │ Type            │ Controller       │
├────────────────────────┼─────────────────┼──────────────────┤
│ #key-1                 │ Ed25519Verifi...│ did:aura:main... │
└────────────────────────┴─────────────────┴──────────────────┘

Authentication:
  • #key-1

✓ DID resolved successfully
```

### Export DID Document

```bash
# Export as JSON
$ aura-verify did did:aura:mainnet:aura1xyz --json > did_document.json

# Pretty print
$ aura-verify did did:aura:mainnet:aura1xyz --json | jq .
```

## Configuration Management

### Show Current Configuration

```bash
$ aura-verify config --show

╔═══════════════════════════════════════════╗
║    Aura Verifier Configuration           ║
╚═══════════════════════════════════════════╝

┌─────────────────┬──────────────────────────┐
│ Setting         │ Value                    │
├─────────────────┼──────────────────────────┤
│ network         │ mainnet                  │
│ verbose         │ false                    │
│ jsonOutput      │ false                    │
└─────────────────┴──────────────────────────┘

ℹ Configuration file: ~/.config/aura-verifier/config.json
```

### Set Network

```bash
# Switch to testnet
$ aura-verify config --network testnet

# Switch to mainnet
$ aura-verify config --network mainnet

# Switch to local development
$ aura-verify config --network local
```

### Custom Endpoints

```bash
# Set custom gRPC endpoint
$ aura-verify config --grpc http://custom-node.example.com:9090

# Set custom REST endpoint
$ aura-verify config --rest https://custom-api.example.com

# Set both
$ aura-verify config \
    --grpc http://node.example.com:9090 \
    --rest https://api.example.com
```

### Enable Logging

```bash
# Enable verbose logging
$ aura-verify config --verbose

# Disable verbose logging
$ aura-verify config --no-verbose

# Enable JSON output by default
$ aura-verify config --json
```

### Reset Configuration

```bash
$ aura-verify config --reset

? Are you sure you want to reset configuration to defaults? Yes

✓ Configuration reset to defaults
```

## Testing & Development

### Generate Test QR Codes

```bash
# Interactive generation
$ aura-verify generate-qr

? Select QR code type: Simple (basic age verification)
? Save QR code to file? Yes
? Output filename: test-qr.png
? Display QR code in terminal? Yes

Sample QR Code Generated
──────────────────────────────────────────────────

Type: simple
Data: aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZX...

QR Code:
[QR code displayed in terminal]

✓ QR code saved to: /path/to/test-qr.png

ℹ You can test this QR code with:
  aura-verify check "aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZX..."
```

### Generate Simple QR Code

```bash
# Generate and display in terminal
$ aura-verify generate-qr --type simple

# Generate and save to file
$ aura-verify generate-qr --type simple --output simple.png

# Generate without display
$ aura-verify generate-qr --type simple --output simple.png --no-display
```

### Generate Complex QR Code

```bash
# Complex QR with multiple credentials
$ aura-verify generate-qr --type complex --output complex.png
```

### Export QR Data for Testing

```bash
# Export as JSON
$ aura-verify generate-qr --type simple --json > test_data.json

# Extract QR data
$ QR_DATA=$(aura-verify generate-qr --type simple --json | jq -r '.qrData')

# Use in tests
$ aura-verify check "$QR_DATA"
```

## Scripting & Automation

### Shell Script Example

```bash
#!/bin/bash

# verify_credentials.sh - Verify multiple credentials

CREDENTIALS_FILE="credentials.txt"
RESULTS_FILE="results.json"

echo "[]" > "$RESULTS_FILE"

while IFS= read -r qr_data; do
    echo "Verifying: ${qr_data:0:50}..."

    # Verify credential
    result=$(aura-verify check "$qr_data" --json 2>/dev/null)

    # Append to results
    echo "$result" | jq -s ". + $(cat "$RESULTS_FILE")" > "$RESULTS_FILE"

    # Check if valid
    if echo "$result" | jq -e '.isValid' > /dev/null; then
        echo "  ✓ Valid"
    else
        echo "  ✗ Invalid"
    fi
done < "$CREDENTIALS_FILE"

echo ""
echo "Results saved to: $RESULTS_FILE"
```

### Node.js Integration

```javascript
// verify.js
const { execSync } = require('child_process');

function verifyCredential(qrData, options = {}) {
    const flags = [];

    if (options.network) flags.push(`--network ${options.network}`);
    if (options.requiredTypes) flags.push(`--required-types ${options.requiredTypes.join(' ')}`);
    if (options.maxAge) flags.push(`--max-age ${options.maxAge}`);

    const command = `aura-verify check "${qrData}" --json ${flags.join(' ')}`;

    try {
        const result = execSync(command, { encoding: 'utf-8' });
        return JSON.parse(result);
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

// Usage
const result = verifyCredential('aura://verify?data=...', {
    network: 'mainnet',
    requiredTypes: ['GovernmentID'],
    maxAge: 86400
});

console.log('Verification result:', result);
```

### Python Integration

```python
#!/usr/bin/env python3
# verify.py

import subprocess
import json
import sys

def verify_credential(qr_data, network='mainnet', required_types=None, max_age=None):
    """Verify a credential using Aura Verifier CLI"""

    cmd = ['aura-verify', 'check', qr_data, '--json', '--network', network]

    if required_types:
        cmd.extend(['--required-types'] + required_types)

    if max_age:
        cmd.extend(['--max-age', str(max_age)])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        return {
            'isValid': False,
            'error': e.stderr
        }

# Usage
if __name__ == '__main__':
    qr_data = sys.argv[1] if len(sys.argv) > 1 else ''

    result = verify_credential(
        qr_data,
        network='mainnet',
        required_types=['GovernmentID'],
        max_age=86400
    )

    print(json.dumps(result, indent=2))
    sys.exit(0 if result.get('isValid') else 1)
```

### CI/CD Integration

#### GitHub Actions

```yaml
# .github/workflows/verify.yml
name: Verify Credentials

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Aura Verifier CLI
        run: npm install -g @aura-network/verifier-cli

      - name: Verify Test Credential
        run: |
          # Generate test credential
          QR_DATA=$(aura-verify generate-qr --type simple --json | jq -r '.qrData')

          # Verify credential
          if aura-verify check "$QR_DATA" --json | jq -e '.isValid'; then
            echo "✓ Verification passed"
          else
            echo "✗ Verification failed"
            exit 1
          fi
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
verify_credentials:
  stage: test
  image: node:18
  script:
    - npm install -g @aura-network/verifier-cli
    - aura-verify config --network testnet
    - |
      for qr in $(cat test_credentials.txt); do
        if ! aura-verify check "$qr" --json | jq -e '.isValid'; then
          echo "Verification failed for: $qr"
          exit 1
        fi
      done
```

### Monitoring & Alerting

```bash
#!/bin/bash
# monitor_credentials.sh - Monitor credential status

CREDENTIALS=(
    "vc_001"
    "vc_002"
    "vc_003"
)

for vc_id in "${CREDENTIALS[@]}"; do
    status=$(aura-verify status "$vc_id" --json | jq -r '.status')

    if [ "$status" != "active" ]; then
        # Send alert (example using curl to webhook)
        curl -X POST https://alerts.example.com/webhook \
            -H "Content-Type: application/json" \
            -d "{\"credential\":\"$vc_id\",\"status\":\"$status\"}"

        echo "ALERT: Credential $vc_id is $status"
    else
        echo "OK: Credential $vc_id is active"
    fi
done
```

## Best Practices

### 1. Always Use JSON for Scripting

```bash
# Good
result=$(aura-verify check "$QR_DATA" --json)

# Bad (output format may change)
result=$(aura-verify check "$QR_DATA")
```

### 2. Check Exit Codes

```bash
# Good
if aura-verify check "$QR_DATA" --json > /dev/null; then
    echo "Valid"
else
    echo "Invalid"
fi

# Also good
aura-verify check "$QR_DATA" --json
exit_code=$?
```

### 3. Handle Errors Gracefully

```bash
# Good
result=$(aura-verify check "$QR_DATA" --json 2>&1)
if [ $? -eq 0 ]; then
    echo "$result" | jq '.attributes'
else
    echo "Error: $result" >&2
    exit 1
fi
```

### 4. Use Configuration for Repeated Operations

```bash
# Configure once
aura-verify config --network testnet --verbose

# Then run commands without flags
aura-verify check "$QR_DATA"
aura-verify status vc_123
```

### 5. Cache Results When Appropriate

```bash
# Cache DID documents
did_cache_file="did_$(echo "$DID" | md5sum | cut -d' ' -f1).json"

if [ ! -f "$did_cache_file" ]; then
    aura-verify did "$DID" --json > "$did_cache_file"
fi

cat "$did_cache_file"
```

## Troubleshooting Examples

### Debug Connection Issues

```bash
# Enable debug mode
DEBUG=1 aura-verify check "$QR_DATA" --verbose

# Test with different network
aura-verify check "$QR_DATA" --network testnet --verbose

# Check configuration
aura-verify config --show
```

### Verify CLI Installation

```bash
# Check version
aura-verify --version

# Check if command is in PATH
which aura-verify

# Check Node.js version (requires Node 18+)
node --version
```

### Reset Everything

```bash
# Reset configuration
aura-verify config --reset

# Reinstall CLI
npm uninstall -g @aura-network/verifier-cli
npm install -g @aura-network/verifier-cli
```

## More Examples

For more examples and use cases, see:
- [README.md](./README.md) - Complete CLI documentation
- [GitHub Repository](https://github.com/aura-blockchain/aura-verifier-sdk) - SDK documentation
- [Examples Directory](../../examples/) - Integration examples
