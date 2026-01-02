# Aura Verifier SDK for Flutter

[![pub package](https://img.shields.io/pub/v/aura_verifier.svg)](https://pub.dev/packages/aura_verifier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Flutter SDK for verifying Aura blockchain credentials. Verify age, identity, and other verifiable credentials with a simple, production-ready API.

## Features

- **QR Code Verification**: Verify Aura credentials presented via QR codes
- **Offline Mode**: Cache credentials for offline verification
- **Built-in QR Scanner**: Ready-to-use camera scanning widgets
- **Type-Safe API**: Full Dart type safety with comprehensive error handling
- **Event Streaming**: Monitor verification events in real-time
- **Batch Verification**: Verify multiple credentials efficiently
- **Secure Caching**: Encrypted local storage for credentials
- **Cross-Platform**: Works on iOS, Android, Web, and Desktop

## Installation

Add this to your package's `pubspec.yaml` file:

```yaml
dependencies:
  aura_verifier: ^1.0.0
```

Then run:

```bash
flutter pub get
```

### Platform-Specific Setup

#### iOS

Add camera permission to your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes</string>
```

Minimum iOS version: 12.0

#### Android

Add camera permission to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
```

Minimum SDK version: 21

## Quick Start

### Basic Verification

```dart
import 'package:aura_verifier/aura_verifier.dart';

// Initialize the verifier
final verifier = AuraVerifier(network: AuraNetwork.mainnet);
await verifier.initialize();

// Verify a QR code
final result = await verifier.verify(qrCodeData);

if (result.isValid) {
  print('Verified: ${result.holderDID}');
  print('Credentials: ${result.vcDetails.length}');
} else {
  print('Verification failed: ${result.verificationError}');
}

// Don't forget to dispose when done
verifier.dispose();
```

### Quick Age Checks

```dart
// Check if holder is 21+
bool isAdult = await verifier.isAge21Plus(qrCodeData);

// Check if holder is 18+
bool canVote = await verifier.isAge18Plus(qrCodeData);

// Check if holder is a verified human
bool isHuman = await verifier.isVerifiedHuman(qrCodeData);
```

### QR Code Scanning

Use the built-in scanner widget:

```dart
import 'package:aura_verifier/aura_verifier.dart';

// Full-screen scanner page
await Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => AuraQRScannerPage(
      verifier: verifier,
      onVerificationComplete: (result) {
        if (result.isValid) {
          // Handle successful verification
        }
      },
    ),
  ),
);

// Or embed the scanner widget
AuraQRScanner(
  verifier: verifier,
  autoVerify: true,
  onVerificationComplete: (result) {
    print('Verified: ${result.holderDID}');
  },
  onError: (error) {
    print('Error: ${error.message}');
  },
)
```

## Advanced Usage

### Enhanced Verifier with Caching and Events

```dart
// Create enhanced verifier with offline support
final verifier = AuraVerifierEnhanced(
  network: AuraNetwork.mainnet,
  offlineMode: false,
  cacheConfig: CacheConfig(
    maxAgeSeconds: 3600,      // Cache for 1 hour
    maxEntries: 1000,          // Max 1000 cached items
    persistToDisk: true,       // Persist across app restarts
  ),
);

// Listen to verification events
verifier.events.listen((event) {
  switch (event.type) {
    case VerifierEventType.verificationStarted:
      print('Verification started');
      break;
    case VerifierEventType.verificationCompleted:
      print('Verification completed: ${event.data}');
      break;
    case VerifierEventType.cacheUpdated:
      print('Cache updated');
      break;
    case VerifierEventType.error:
      print('Error: ${event.data}');
      break;
  }
});

await verifier.initialize();
```

### Batch Verification

```dart
final qrCodes = ['qr1', 'qr2', 'qr3', ...];

final batchResult = await verifier.verifyBatch(
  qrCodes,
  options: BatchVerificationOptions(
    concurrency: 5,              // Verify 5 at a time
    stopOnFirstError: false,     // Continue on errors
    includePartialResults: true, // Include failed results
  ),
);

print('Success: ${batchResult.successCount}');
print('Failed: ${batchResult.failureCount}');
print('Success rate: ${batchResult.successRate * 100}%');
```

### Offline Mode

```dart
// Initialize with offline mode
final verifier = AuraVerifierEnhanced(
  network: AuraNetwork.mainnet,
  offlineMode: true,
  cacheConfig: CacheConfig(persistToDisk: true),
);

await verifier.initialize();

// Verify using cached data only
final result = await verifier.verify(qrCodeData);

// When back online, sync the cache
await verifier.setOfflineMode(false);
await verifier.syncCache();
```

### Cache Management

```dart
// Get cache statistics
final stats = verifier.getCacheStats();
print('Cache usage: ${stats?.usagePercent.toStringAsFixed(1)}%');
print('DID cache: ${stats?.didCacheSize} entries');
print('VC cache: ${stats?.vcStatusCacheSize} entries');

// Clear cache
await verifier.clearCache();
```

### Custom Network Configuration

```dart
// Use a custom endpoint
final verifier = AuraVerifier(
  network: AuraNetwork.mainnet,
  customRestEndpoint: 'https://your-custom-endpoint.com',
  timeoutMs: 15000, // 15 second timeout
);
```

### Parsing QR Codes

```dart
// Parse QR code without verification
final qrData = verifier.parseQRCode(rawQRString);

print('Version: ${qrData.version}');
print('Holder: ${qrData.holderDID}');
print('Credentials: ${qrData.vcIds}');
print('Expires: ${qrData.isExpired ? "Yes" : "No"}');
```

## API Reference

### Classes

#### `AuraVerifier`
Basic verifier with essential functionality.

**Constructor:**
```dart
AuraVerifier({
  AuraNetwork network = AuraNetwork.mainnet,
  String? customRestEndpoint,
  int timeoutMs = 10000,
})
```

**Methods:**
- `Future<void> initialize()` - Initialize the verifier
- `Future<VerificationResult> verify(String qrCodeData, {String? verifierAddress})` - Verify a credential
- `Future<bool> isAge21Plus(String qrCodeData)` - Quick 21+ check
- `Future<bool> isAge18Plus(String qrCodeData)` - Quick 18+ check
- `Future<bool> isVerifiedHuman(String qrCodeData)` - Quick verified human check
- `Future<VCStatus> checkCredentialStatus(String vcId)` - Check credential status
- `QRCodeData parseQRCode(String qrCodeData)` - Parse QR code locally
- `void dispose()` - Clean up resources

#### `AuraVerifierEnhanced`
Enhanced verifier with caching, offline mode, and events.

Extends `AuraVerifier` with additional features:
- `Stream<VerifierEvent> events` - Event stream
- `Future<BatchVerificationResult> verifyBatch(List<String> qrCodeDataList, {BatchVerificationOptions options})` - Batch verification
- `Future<void> syncCache()` - Sync cache with network
- `CacheStats? getCacheStats()` - Get cache statistics
- `Future<void> clearCache()` - Clear cache
- `Future<void> setOfflineMode(bool enabled)` - Toggle offline mode

#### `AuraQRScanner`
Widget for scanning QR codes with camera.

**Constructor:**
```dart
AuraQRScanner({
  required AuraVerifier verifier,
  bool autoVerify = true,
  OnQRScanned? onScanned,
  OnVerificationComplete? onVerificationComplete,
  OnScanError? onError,
  bool showOverlay = true,
  Widget? overlay,
  bool allowMultipleScans = false,
})
```

#### `AuraQRScannerPage`
Full-screen QR scanner page.

**Constructor:**
```dart
AuraQRScannerPage({
  required AuraVerifier verifier,
  bool autoVerify = true,
  OnVerificationComplete? onVerificationComplete,
  String? title,
})
```

### Types

#### `VerificationResult`
Result of a verification operation.

**Properties:**
- `bool isValid` - Whether credential is valid
- `String holderDID` - DID of credential holder
- `DateTime verifiedAt` - Verification timestamp
- `List<VCDetail> vcDetails` - List of verified credentials
- `DiscloseableAttributes attributes` - Disclosed attributes
- `String? verificationError` - Error message if failed
- `String auditId` - Audit trail ID
- `int networkLatencyMs` - Network latency
- `VerificationMethod method` - Verification method used

#### `VCDetail`
Details of a single verifiable credential.

**Properties:**
- `String vcId` - Credential ID
- `VCType vcType` - Credential type
- `VCStatus status` - Current status
- `bool isValid` - Whether valid
- `bool isExpired` - Whether expired
- `bool isRevoked` - Whether revoked
- `DateTime? issuedAt` - Issuance date
- `DateTime? expiresAt` - Expiration date

#### `DiscloseableAttributes`
Attributes disclosed by the holder.

**Properties:**
- `String? fullName` - Full name (if disclosed)
- `int? age` - Age (if disclosed)
- `bool isOver18` - Whether over 18
- `bool isOver21` - Whether over 21
- `String? fullAddress` - Full address (if disclosed)
- `String? cityState` - City and state (if disclosed)
- `Map<String, String> customAttributes` - Custom attributes

#### `QRCodeData`
Parsed QR code data.

**Properties:**
- `String version` - Protocol version
- `String presentationId` - Presentation ID
- `String holderDID` - Holder DID
- `List<String> vcIds` - Credential IDs
- `Map<String, bool> context` - Disclosure context
- `int expiresAt` - Expiration timestamp
- `int nonce` - Nonce for replay protection
- `String signature` - Cryptographic signature
- `bool isExpired` - Whether presentation expired

### Enums

#### `AuraNetwork`
- `mainnet` - Production network
- `testnet` - Test network
- `local` - Local development network

#### `VCType`
- `unspecified` - Unknown type
- `verifiedHuman` - Verified human credential
- `ageOver18` - Age 18+ credential
- `ageOver21` - Age 21+ credential
- `residentOf` - Residency credential
- `biometricAuth` - Biometric credential
- `kycVerification` - KYC credential
- `notaryPublic` - Notary credential
- `professionalLicense` - Professional license

#### `VCStatus`
- `unspecified` - Unknown status
- `pending` - Pending issuance
- `active` - Active and valid
- `revoked` - Revoked
- `expired` - Expired
- `suspended` - Temporarily suspended

#### `VerificationMethod`
- `online` - Verified against blockchain
- `offline` - Verified using cache
- `cached` - Retrieved from cache

### Error Handling

All errors are thrown as `AuraVerifierException`:

```dart
try {
  final result = await verifier.verify(qrCodeData);
} on AuraVerifierException catch (e) {
  print('Error: ${e.message}');
  print('Code: ${e.code}');

  switch (e.code) {
    case AuraErrorCode.networkError:
      // Handle network error
      break;
    case AuraErrorCode.qrExpired:
      // Handle expired QR
      break;
    case AuraErrorCode.credentialRevoked:
      // Handle revoked credential
      break;
  }
}
```

**Error Codes:**
- `UNKNOWN` - Unknown error
- `NOT_INITIALIZED` - Verifier not initialized
- `QR_PARSE_ERROR` - Failed to parse QR code
- `QR_EXPIRED` - QR code expired
- `INVALID_SIGNATURE` - Invalid signature
- `NETWORK_ERROR` - Network error
- `TIMEOUT` - Request timeout
- `CREDENTIAL_REVOKED` - Credential revoked
- `CREDENTIAL_EXPIRED` - Credential expired
- `NONCE_REPLAY` - Nonce replay attack
- `INVALID_DID` - Invalid DID format

## Testing

Run the unit tests:

```bash
flutter test
```

Run the example app:

```bash
cd example
flutter run
```

## Example App

The example app demonstrates:
- Basic verification flow
- QR code scanning
- Cache management
- Event monitoring
- Error handling

See [example/lib/main.dart](example/lib/main.dart) for the complete implementation.

## Architecture

The SDK consists of several layers:

1. **Dart API Layer** (`lib/src/`)
   - `verifier.dart` - Basic verifier
   - `verifier_enhanced.dart` - Enhanced verifier with caching
   - `types.dart` - Type definitions
   - `errors.dart` - Error handling
   - `cache.dart` - Cache management
   - `qr_scanner.dart` - QR scanning widgets

2. **Native Platform Layer**
   - iOS: Swift implementation (`ios/Classes/`)
   - Android: Kotlin implementation (`android/src/`)

3. **Core Dependencies**
   - `http` - Network requests
   - `shared_preferences` - Persistent storage
   - `mobile_scanner` - QR code scanning
   - `crypto` - Cryptographic operations

## Security Considerations

1. **QR Code Validation**: All QR codes are validated for format, expiration, and signature
2. **Nonce Protection**: Replay attacks are prevented through nonce validation
3. **Secure Storage**: Cached credentials are stored securely
4. **HTTPS Only**: All network requests use HTTPS
5. **Signature Verification**: Cryptographic signatures are verified against the blockchain

## Performance

- Average verification time: 150-300ms (online)
- Average verification time: 10-50ms (cached)
- QR parsing: <5ms
- Batch verification: 5 concurrent requests by default

## Roadmap

- [ ] Support for additional credential types
- [ ] Biometric verification integration
- [ ] Advanced analytics and reporting
- [ ] WebAssembly support for web platforms
- [ ] gRPC support for faster network calls

## Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

- Documentation: [https://docs.aurablockchain.org](https://docs.aurablockchain.org)
- Issues: [GitHub Issues](https://github.com/aura-blockchain/aura-verifier-sdk/issues)
- Discord: [Aura Network Discord](https://discord.gg/aurablockchain-network)

## Related Packages

- [@aura-network/verifier-sdk](../core) - Core TypeScript SDK
- [@aura-network/verifier-react](../react) - React hooks and components
- [@aura-network/verifier-react-native](../react-native) - React Native SDK

---

Made with ❤️ by the Aura Network team
