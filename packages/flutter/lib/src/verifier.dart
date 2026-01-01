import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'types.dart';
import 'errors.dart';
import 'config.dart';

/// Main class for verifying Aura blockchain credentials.
///
/// Use this class to verify QR codes presented by Aura credential holders.
///
/// Example:
/// ```dart
/// final verifier = AuraVerifier(network: AuraNetwork.mainnet);
/// await verifier.initialize();
///
/// final result = await verifier.verify(qrCodeData);
/// ```
class AuraVerifier {
  /// The network configuration
  final AuraNetwork network;

  /// Custom REST endpoint (overrides network default)
  final String? customRestEndpoint;

  /// Request timeout in milliseconds
  final int timeoutMs;

  /// HTTP client
  http.Client? _client;

  /// Whether the verifier has been initialized
  bool _initialized = false;

  /// Creates a new AuraVerifier instance.
  ///
  /// [network] specifies which Aura network to connect to (mainnet, testnet, or local).
  /// [customRestEndpoint] can be used to override the default endpoint for the network.
  /// [timeoutMs] sets the request timeout (default: 10000ms).
  AuraVerifier({
    this.network = AuraNetwork.mainnet,
    this.customRestEndpoint,
    this.timeoutMs = 10000,
  });

  /// The REST API endpoint being used
  String get restEndpoint =>
      customRestEndpoint ?? AuraNetworkConfig.getConfig(network).restEndpoint;

  /// Initialize the verifier.
  ///
  /// This must be called before using any verification methods.
  Future<void> initialize() async {
    if (_initialized) return;

    _client = http.Client();
    _initialized = true;
  }

  /// Dispose of resources.
  ///
  /// Call this when you're done using the verifier.
  void dispose() {
    _client?.close();
    _client = null;
    _initialized = false;
  }

  /// Verify a credential from QR code data.
  ///
  /// [qrCodeData] is the raw data from scanning an Aura QR code.
  /// [verifierAddress] is an optional Aura address identifying the verifier.
  ///
  /// Returns a [VerificationResult] containing the verification outcome.
  ///
  /// Throws [AuraVerifierException] if verification fails.
  Future<VerificationResult> verify(
    String qrCodeData, {
    String? verifierAddress,
  }) async {
    _ensureInitialized();

    final stopwatch = Stopwatch()..start();

    try {
      final response = await _client!
          .post(
            Uri.parse('$restEndpoint/aura/vcregistry/v1beta1/verify_presentation'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'qr_code_data': qrCodeData,
              if (verifierAddress != null) 'verifier_address': verifierAddress,
            }),
          )
          .timeout(Duration(milliseconds: timeoutMs));

      stopwatch.stop();

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final result = data['result'] ?? data;

        return VerificationResult.fromJson(result, stopwatch.elapsedMilliseconds);
      } else {
        final errorData = jsonDecode(response.body);
        throw AuraVerifierException(
          errorData['error'] ?? 'Verification failed',
          code: 'HTTP_${response.statusCode}',
        );
      }
    } on TimeoutException {
      throw AuraVerifierException(
        'Request timed out',
        code: AuraErrorCode.timeout,
      );
    } on http.ClientException catch (e) {
      throw AuraVerifierException(
        'Network error: ${e.message}',
        code: AuraErrorCode.networkError,
      );
    }
  }

  /// Quick check if the credential holder is 21+.
  ///
  /// Returns `true` if the holder has a valid 21+ age credential.
  Future<bool> isAge21Plus(String qrCodeData) async {
    final result = await verify(qrCodeData);
    return result.attributes.isOver21;
  }

  /// Quick check if the credential holder is 18+.
  ///
  /// Returns `true` if the holder has a valid 18+ age credential.
  Future<bool> isAge18Plus(String qrCodeData) async {
    final result = await verify(qrCodeData);
    return result.attributes.isOver18 || result.attributes.isOver21;
  }

  /// Quick check if the credential holder is a verified human.
  ///
  /// Returns `true` if the holder has a valid verified human credential.
  Future<bool> isVerifiedHuman(String qrCodeData) async {
    final result = await verify(qrCodeData);
    return result.vcDetails.any(
      (vc) => vc.vcType == VCType.verifiedHuman && vc.isValid,
    );
  }

  /// Get the Aura Score for the credential holder.
  ///
  /// Returns the score if available, or `null` if not disclosed.
  Future<int?> getAuraScore(String qrCodeData) async {
    final result = await verify(qrCodeData);
    final scoreStr = result.attributes.customAttributes['aura_score'];
    return scoreStr != null ? int.tryParse(scoreStr) : null;
  }

  /// Check the status of a specific credential.
  ///
  /// [vcId] is the unique identifier of the verifiable credential.
  Future<VCStatus> checkCredentialStatus(String vcId) async {
    _ensureInitialized();

    try {
      final response = await _client!
          .get(
            Uri.parse('$restEndpoint/aura/vcregistry/v1beta1/vc_status/$vcId'),
            headers: {'Accept': 'application/json'},
          )
          .timeout(Duration(milliseconds: timeoutMs));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return VCStatus.fromCode(data['status'] ?? 0);
      }

      return VCStatus.unspecified;
    } catch (e) {
      throw AuraVerifierException(
        'Failed to check credential status',
        code: AuraErrorCode.statusCheckError,
      );
    }
  }

  /// Parse QR code data without network verification.
  ///
  /// This performs local validation of the QR code format.
  /// Use [verify] for full verification against the blockchain.
  QRCodeData parseQRCode(String qrCodeData) {
    try {
      String base64Data;

      if (qrCodeData.startsWith('aura://verify?data=')) {
        base64Data = qrCodeData.substring('aura://verify?data='.length);
      } else {
        base64Data = qrCodeData;
      }

      final jsonStr = utf8.decode(base64Decode(base64Data));
      final json = jsonDecode(jsonStr) as Map<String, dynamic>;

      return QRCodeData.fromJson(json);
    } catch (e) {
      throw AuraVerifierException(
        'Invalid QR code format',
        code: AuraErrorCode.qrParseError,
      );
    }
  }

  void _ensureInitialized() {
    if (!_initialized) {
      throw AuraVerifierException(
        'Verifier not initialized. Call initialize() first.',
        code: AuraErrorCode.notInitialized,
      );
    }
  }
}
