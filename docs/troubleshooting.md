# Troubleshooting Guide

Common issues and solutions for the Aura Verifier SDK.

## Installation Issues

### Module Not Found

**Error:**
```
Cannot find module '@aura-network/verifier-sdk'
```

**Solutions:**

1. Verify installation:
```bash
npm list @aura-network/verifier-sdk
```

2. Reinstall the package:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. Check `package.json` has the dependency:
```json
{
  "dependencies": {
    "@aura-network/verifier-sdk": "^1.0.0"
  }
}
```

### TypeScript Type Errors

**Error:**
```
Could not find a declaration file for module '@aura-network/verifier-sdk'
```

**Solution:**

Install @types/node:
```bash
npm install -D @types/node
```

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "types": ["node"]
  }
}
```

### Buffer/Process Not Defined (Browser)

**Error:**
```
ReferenceError: Buffer is not defined
```

**Solution:**

Install polyfills:
```bash
npm install buffer process
```

Add to webpack config:
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

Or add to entry point:
```javascript
import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;
```

## Verification Issues

### QR Code Parse Errors

**Error:**
```
QRParseError: Failed to parse QR code data
```

**Causes & Solutions:**

1. **Invalid QR Format**
   - Ensure QR starts with `aura://verify?data=`
   - Check base64 encoding is valid
   - Verify JSON structure after decoding

2. **Missing Required Fields**
```typescript
// QR data must include:
{
  v: "1.0",      // version
  p: "...",      // presentation ID
  h: "did:...",  // holder DID
  vcs: [...],    // VC IDs
  ctx: {},       // disclosure context
  exp: 123456,   // expiration
  n: 789,        // nonce
  sig: "..."     // signature
}
```

3. **Debugging**
```typescript
import { parseQRCodeSafe } from '@aura-network/verifier-sdk';

const result = parseQRCodeSafe(qrCodeData);
if (!result.success) {
  console.error('Parse error:', result.error);
}
```

### QR Code Expired

**Error:**
```
QRExpiredError: QR code expired at 2025-01-15T10:30:00Z
```

**Solutions:**

1. **Request New QR Code**
   - User must generate a fresh QR code from their wallet
   - QR codes typically expire after 5-10 minutes

2. **Check System Time**
```bash
# Ensure system clock is accurate
date
# Sync time if needed
sudo ntpdate pool.ntp.org
```

3. **Allow Tolerance (Not Recommended)**
```typescript
const result = await verifier.verify({
  qrCodeData,
  // Don't do this in production
});
```

### Signature Verification Failed

**Error:**
```
VerificationError: Signature verification failed
```

**Causes & Solutions:**

1. **Tampered Data**
   - QR code has been modified
   - Solution: Request new QR code from user

2. **Wrong Public Key**
   - DID resolution returning wrong key
   - Check network configuration
   - Verify DID format

3. **Debugging**
```typescript
const result = await verifier.verify({ qrCodeData });

console.log('Signature valid:', result.signatureValid);
console.log('Holder DID:', result.holderDID);

// Manually check DID
const didDoc = await verifier.resolveDID(result.holderDID);
console.log('DID Document:', didDoc);
```

### Credential Revoked

**Error:**
```
VerificationError: Credential has been revoked: vc-123
```

**Explanation:**
- The credential issuer has revoked this credential
- This is expected behavior for invalidated credentials

**Solutions:**

1. **Request New Credential**
   - User must contact issuer for new credential
   - Or obtain different credential type

2. **Handle Gracefully**
```typescript
try {
  const result = await verifier.verify({ qrCodeData });
} catch (error) {
  if (error instanceof CredentialRevokedError) {
    displayMessage('This credential has been revoked. Please obtain a new one.');
  }
}
```

## Network Issues

### Connection Timeout

**Error:**
```
TimeoutError: Operation timed out after 10000ms
```

**Solutions:**

1. **Increase Timeout**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 30000, // 30 seconds
});
```

2. **Check Network Connectivity**
```bash
# Test gRPC endpoint
curl https://lcd.aura.network/cosmos/base/tendermint/v1beta1/node_info

# Test DNS resolution
nslookup grpc.aura.network
```

3. **Use Custom Endpoint**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  grpcEndpoint: 'your-node.example.com:9090',
});
```

### Network Error

**Error:**
```
NetworkError: Failed to connect to blockchain
```

**Solutions:**

1. **Check Internet Connection**
```bash
ping grpc.aura.network
```

2. **Verify Endpoint**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  verbose: true, // See connection attempts
});
```

3. **Enable Offline Mode**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true, // Use cached data
});
```

### DID Resolution Failed

**Error:**
```
VerificationError: Failed to resolve DID: did:aura:mainnet:abc123
```

**Solutions:**

1. **Check DID Format**
```typescript
import { isValidDID } from '@aura-network/verifier-sdk';

if (!isValidDID(did)) {
  console.error('Invalid DID format');
}
```

2. **Verify Network**
```typescript
// DID network must match verifier network
const verifier = new AuraVerifier({ network: 'mainnet' });
// Can only resolve DIDs with 'mainnet' in them
```

3. **Check DID Exists**
```bash
# Query via REST
curl https://lcd.aura.network/aura/did/v1/did/did:aura:mainnet:abc123
```

## Performance Issues

### Slow Verification

**Problem:** Verification taking > 2 seconds

**Solutions:**

1. **Enable Caching**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    enableDIDCache: true,
    enableVCCache: true,
    ttl: 600, // 10 minutes
    maxSize: 200, // 200 MB
  },
});
```

2. **Use Offline Mode**
```typescript
await verifier.enableOfflineMode();
```

3. **Optimize Network**
- Use closer RPC node
- Reduce timeout for faster failures
- Enable HTTP/2 if available

4. **Profile Performance**
```typescript
const start = Date.now();
const result = await verifier.verify({ qrCodeData });
const duration = Date.now() - start;

console.log('Verification took:', duration, 'ms');
console.log('Network latency:', result.networkLatency, 'ms');
```

### Memory Issues

**Problem:** High memory usage or memory leaks

**Solutions:**

1. **Limit Cache Size**
```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    maxSize: 50, // Reduce from default 200 MB
  },
});
```

2. **Clear Cache Periodically**
```typescript
// Clear cache daily
setInterval(async () => {
  await verifier.syncCache();
}, 86400000);
```

3. **Destroy Unused Instances**
```typescript
await verifier.destroy();
```

## Browser Issues

### CORS Errors

**Error:**
```
Access to fetch at 'https://lcd.aura.network' blocked by CORS policy
```

**Solution:**

Use backend proxy instead of direct browser calls:

```typescript
// Frontend
const response = await fetch('/api/verify', {
  method: 'POST',
  body: JSON.stringify({ qrCodeData }),
});

// Backend (Node.js)
app.post('/api/verify', async (req, res) => {
  const result = await verifier.verify({
    qrCodeData: req.body.qrCodeData,
  });
  res.json(result);
});
```

### Crypto Not Available

**Error:**
```
TypeError: crypto.subtle is undefined
```

**Solution:**

Ensure HTTPS in production:
```typescript
// crypto.subtle requires HTTPS
// Use localhost for development or HTTPS in production
```

## React Native Issues

### Random Values Error

**Error:**
```
Error: crypto.getRandomValues() not supported
```

**Solution:**

Install polyfill:
```bash
npm install react-native-get-random-values
```

Import at app entry:
```typescript
import 'react-native-get-random-values';
import { AuraVerifier } from '@aura-network/verifier-sdk';
```

### Metro Bundler Errors

**Solution:**

Clear cache:
```bash
npm start -- --reset-cache
```

## Debugging Tips

### Enable Verbose Logging

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  verbose: true, // See detailed logs
});
```

### Check SDK Version

```typescript
import { SDK_INFO } from '@aura-network/verifier-sdk';

console.log('SDK Version:', SDK_INFO.version);
console.log('SDK Name:', SDK_INFO.name);
```

### Inspect Verification Result

```typescript
const result = await verifier.verify({ qrCodeData });

console.log('Is Valid:', result.isValid);
console.log('Error:', result.verificationError);
console.log('Signature Valid:', result.signatureValid);
console.log('VC Details:', result.vcDetails);
console.log('Network Latency:', result.networkLatency);
console.log('Method:', result.verificationMethod);
```

### Event Listeners for Debugging

```typescript
verifier.on('verification', (data) => {
  console.log('[VERIFICATION]', {
    auditId: data.result.auditId,
    isValid: data.result.isValid,
    latency: data.result.networkLatency,
  });
});

verifier.on('error', (data) => {
  console.error('[ERROR]', {
    error: data.error.message,
    context: data.context,
  });
});
```

## Getting Help

If your issue isn't listed here:

1. **Check GitHub Issues**: https://github.com/aura-blockchain/aura-verifier-sdk/issues
2. **Ask on Discord**: https://discord.gg/aura
3. **Email Support**: dev@aura.network
4. **Stack Overflow**: Tag with `aura-network`

When reporting issues, include:
- SDK version (`SDK_INFO.version`)
- Node.js version (`node --version`)
- Platform (Node.js, browser, React Native, etc.)
- Error message and stack trace
- Minimal reproduction code
