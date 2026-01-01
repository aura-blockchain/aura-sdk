/// Aura Verifier SDK for Flutter
///
/// This package provides Flutter bindings for the Aura Verifier SDK,
/// enabling mobile apps to verify Aura blockchain credentials.
///
/// ## Quick Start
///
/// ```dart
/// import 'package:aura_verifier/aura_verifier.dart';
///
/// final verifier = AuraVerifier(network: AuraNetwork.mainnet);
/// await verifier.initialize();
///
/// final result = await verifier.verify(qrCodeData);
/// if (result.isValid) {
///   print('Verified: ${result.holderDID}');
/// }
/// ```
///
/// ## Enhanced Features
///
/// For offline mode, caching, and event support:
///
/// ```dart
/// final verifier = AuraVerifierEnhanced(
///   network: AuraNetwork.mainnet,
///   offlineMode: false,
///   cacheConfig: CacheConfig(
///     maxAgeSeconds: 3600,
///     maxEntries: 1000,
///     persistToDisk: true,
///   ),
/// );
///
/// // Listen to events
/// verifier.events.listen((event) {
///   print('Event: ${event.type}');
/// });
///
/// await verifier.initialize();
/// ```
///
/// ## QR Code Scanning
///
/// Use the built-in QR scanner widget:
///
/// ```dart
/// AuraQRScanner(
///   verifier: verifier,
///   autoVerify: true,
///   onVerificationComplete: (result) {
///     if (result.isValid) {
///       print('Verified: ${result.holderDID}');
///     }
///   },
/// )
/// ```
library aura_verifier;

export 'src/verifier.dart';
export 'src/verifier_enhanced.dart';
export 'src/types.dart';
export 'src/errors.dart';
export 'src/config.dart';
export 'src/cache.dart';
export 'src/qr_scanner.dart';
