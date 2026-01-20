# Migration Guide

This guide helps you migrate from other Aura SDK implementations or upgrade between versions.

## From Core TypeScript SDK

If you're familiar with the core TypeScript SDK, here's how the Flutter API maps:

### Initialization

**TypeScript:**

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({
  network: 'mainnet',
  timeout: 10000,
  offlineMode: false,
});

await verifier.initialize();
```

**Flutter:**

```dart
import 'package:aura_verifier/aura_verifier.dart';

final verifier = AuraVerifier(
  network: AuraNetwork.mainnet,
  timeoutMs: 10000,
);

await verifier.initialize();
```

### Verification

**TypeScript:**

```typescript
const result = await verifier.verify({
  qrCodeData: qrString,
  verifierAddress: 'aura1...',
});

if (result.isValid) {
  console.log('Verified:', result.holderDID);
}
```

**Flutter:**

```dart
final result = await verifier.verify(
  qrString,
  verifierAddress: 'aura1...',
);

if (result.isValid) {
  print('Verified: ${result.holderDID}');
}
```

### Offline Mode

**TypeScript:**

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  offlineMode: true,
  cacheConfig: {
    enableDIDCache: true,
    ttl: 3600,
  },
});
```

**Flutter:**

```dart
final verifier = AuraVerifierEnhanced(
  network: AuraNetwork.mainnet,
  offlineMode: true,
  cacheConfig: CacheConfig(
    maxAgeSeconds: 3600,
    persistToDisk: true,
  ),
);
```

### Event Handling

**TypeScript:**

```typescript
verifier.on('verification:complete', (data) => {
  console.log('Verification completed:', data);
});
```

**Flutter:**

```dart
verifier.events.listen((event) {
  if (event.type == VerifierEventType.verificationCompleted) {
    print('Verification completed: ${event.data}');
  }
});
```

### Batch Verification

**TypeScript:**

```typescript
const results = await verifier.verifyBatch(qrCodes, {
  concurrency: 5,
  stopOnFirstError: false,
});
```

**Flutter:**

```dart
final results = await verifier.verifyBatch(
  qrCodes,
  options: BatchVerificationOptions(
    concurrency: 5,
    stopOnFirstError: false,
  ),
);
```

## From React Native SDK

If migrating from React Native, the concepts are similar but with Flutter-specific patterns:

### Component to Widget

**React Native:**

```jsx
import { AuraQRScanner } from '@aura-network/verifier-react-native';

<AuraQRScanner
  onScan={(result) => console.log(result)}
  onError={(error) => console.error(error)}
/>;
```

**Flutter:**

```dart
import 'package:aura_verifier/aura_verifier.dart';

AuraQRScanner(
  verifier: verifier,
  onVerificationComplete: (result) => print(result),
  onError: (error) => print(error),
)
```

### Hooks to State Management

**React Native:**

```jsx
import { useAuraVerifier } from '@aura-network/verifier-react-native';

function MyComponent() {
  const { verifier, isReady } = useAuraVerifier({ network: 'mainnet' });

  // Use verifier
}
```

**Flutter:**

```dart
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  late AuraVerifier verifier;
  bool isReady = false;

  @override
  void initState() {
    super.initState();
    verifier = AuraVerifier(network: AuraNetwork.mainnet);
    _initialize();
  }

  Future<void> _initialize() async {
    await verifier.initialize();
    setState(() => isReady = true);
  }

  @override
  void dispose() {
    verifier.dispose();
    super.dispose();
  }
}
```

## Key Differences

### 1. Async Patterns

**TypeScript (Promises):**

```typescript
verifier
  .verify(qrCode)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

**Flutter (Futures):**

```dart
try {
  final result = await verifier.verify(qrCode);
  print(result);
} catch (error) {
  print(error);
}
```

### 2. Error Handling

**TypeScript:**

```typescript
import { VerificationError } from '@aura-network/verifier-sdk';

try {
  await verifier.verify(qrCode);
} catch (error) {
  if (error instanceof VerificationError) {
    console.log('Code:', error.code);
  }
}
```

**Flutter:**

```dart
import 'package:aura_verifier/aura_verifier.dart';

try {
  await verifier.verify(qrCode);
} on AuraVerifierException catch (e) {
  print('Code: ${e.code}');
  print('Message: ${e.message}');
}
```

### 3. Type Naming

| TypeScript           | Flutter                     |
| -------------------- | --------------------------- |
| `NetworkType`        | `AuraNetwork`               |
| `VCType`             | `VCType` (same)             |
| `VCStatus`           | `VCStatus` (same)           |
| `VerificationResult` | `VerificationResult` (same) |
| `QRCodeData`         | `QRCodeData` (same)         |

### 4. Configuration

**TypeScript:**

```typescript
interface AuraVerifierConfig {
  network: NetworkType;
  grpcEndpoint?: string;
  restEndpoint?: string;
  offlineMode?: boolean;
  timeout?: number;
}
```

**Flutter:**

```dart
class AuraVerifier {
  final AuraNetwork network;
  final String? customRestEndpoint;
  final int timeoutMs;

  AuraVerifier({
    this.network = AuraNetwork.mainnet,
    this.customRestEndpoint,
    this.timeoutMs = 10000,
  });
}
```

## Best Practices

### 1. Lifecycle Management

Always dispose of the verifier when done:

```dart
class MyWidget extends StatefulWidget {
  // ...
}

class _MyWidgetState extends State<MyWidget> {
  late AuraVerifier verifier;

  @override
  void initState() {
    super.initState();
    verifier = AuraVerifier(network: AuraNetwork.mainnet);
    verifier.initialize();
  }

  @override
  void dispose() {
    verifier.dispose(); // Important!
    super.dispose();
  }
}
```

### 2. Error Handling

Use specific error codes for better UX:

```dart
try {
  final result = await verifier.verify(qrCode);
} on AuraVerifierException catch (e) {
  switch (e.code) {
    case AuraErrorCode.qrExpired:
      showDialog(context, 'QR code expired. Please generate a new one.');
      break;
    case AuraErrorCode.networkError:
      showDialog(context, 'Network error. Please check your connection.');
      break;
    case AuraErrorCode.credentialRevoked:
      showDialog(context, 'This credential has been revoked.');
      break;
    default:
      showDialog(context, 'Verification failed: ${e.message}');
  }
}
```

### 3. Caching Strategy

Use caching wisely:

```dart
// For frequently verified credentials
final verifier = AuraVerifierEnhanced(
  network: AuraNetwork.mainnet,
  cacheConfig: CacheConfig(
    maxAgeSeconds: 3600,     // 1 hour cache
    maxEntries: 500,          // Keep 500 entries
    persistToDisk: true,      // Persist across app restarts
  ),
);

// Check cache stats periodically
final stats = verifier.getCacheStats();
if (stats != null && stats.usagePercent > 90) {
  // Cache is getting full, consider clearing old entries
  await verifier.clearCache();
}
```

### 4. Network Optimization

For batch operations, use batch verification:

```dart
// Instead of this:
for (final qrCode in qrCodes) {
  await verifier.verify(qrCode); // Sequential, slow
}

// Do this:
final results = await verifier.verifyBatch(
  qrCodes,
  options: BatchVerificationOptions(
    concurrency: 5, // Parallel processing
  ),
);
```

### 5. QR Scanning UX

Provide feedback during scanning:

```dart
AuraQRScanner(
  verifier: verifier,
  autoVerify: true,
  showOverlay: true,
  onScanned: (qrData) {
    // Show loading indicator
    setState(() => isProcessing = true);
  },
  onVerificationComplete: (result) {
    setState(() => isProcessing = false);
    if (result.isValid) {
      // Navigate to success screen
    }
  },
  onError: (error) {
    setState(() => isProcessing = false);
    // Show error message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error.message)),
    );
  },
)
```

## Common Issues

### Issue 1: "Verifier not initialized"

**Problem:**

```dart
final verifier = AuraVerifier(network: AuraNetwork.mainnet);
await verifier.verify(qrCode); // Error: not initialized
```

**Solution:**

```dart
final verifier = AuraVerifier(network: AuraNetwork.mainnet);
await verifier.initialize(); // Must call initialize first
await verifier.verify(qrCode); // Now works
```

### Issue 2: Camera permission denied

**Problem:** QR scanner doesn't open

**Solution:** Add permissions to platform files:

iOS (`Info.plist`):

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes</string>
```

Android (`AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### Issue 3: Memory leaks

**Problem:** App memory grows over time

**Solution:** Always dispose verifiers:

```dart
@override
void dispose() {
  verifier.dispose();
  super.dispose();
}
```

### Issue 4: Network timeout

**Problem:** Verification takes too long

**Solution:** Increase timeout or use caching:

```dart
final verifier = AuraVerifier(
  network: AuraNetwork.mainnet,
  timeoutMs: 30000, // 30 seconds
);

// Or use enhanced verifier with caching
final verifier = AuraVerifierEnhanced(
  network: AuraNetwork.mainnet,
  cacheConfig: CacheConfig(maxAgeSeconds: 3600),
);
```

## Support

If you encounter issues during migration:

1. Check the [API documentation](README.md)
2. Review the [example app](example/lib/main.dart)
3. Search [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
4. Ask on [Discord](https://discord.gg/aurablockchain-network)

---

Last updated: 2025-12-30
