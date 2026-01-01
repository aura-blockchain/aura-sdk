/// Error handling for the Aura Verifier SDK

/// Exception thrown by the Aura Verifier
class AuraVerifierException implements Exception {
  /// Human-readable error message
  final String message;

  /// Machine-readable error code
  final String code;

  /// Additional error details
  final dynamic details;

  AuraVerifierException(
    this.message, {
    this.code = AuraErrorCode.unknown,
    this.details,
  });

  @override
  String toString() => 'AuraVerifierException: $message (code: $code)';
}

/// Standard error codes
class AuraErrorCode {
  /// Unknown error
  static const String unknown = 'UNKNOWN';

  /// Verifier not initialized
  static const String notInitialized = 'NOT_INITIALIZED';

  /// Failed to parse QR code
  static const String qrParseError = 'QR_PARSE_ERROR';

  /// QR code / presentation has expired
  static const String qrExpired = 'QR_EXPIRED';

  /// Invalid cryptographic signature
  static const String invalidSignature = 'INVALID_SIGNATURE';

  /// Network connection error
  static const String networkError = 'NETWORK_ERROR';

  /// Request timed out
  static const String timeout = 'TIMEOUT';

  /// Credential has been revoked
  static const String credentialRevoked = 'CREDENTIAL_REVOKED';

  /// Credential has expired
  static const String credentialExpired = 'CREDENTIAL_EXPIRED';

  /// Nonce has already been used (replay attack)
  static const String nonceReplay = 'NONCE_REPLAY';

  /// Failed to check credential status
  static const String statusCheckError = 'STATUS_CHECK_ERROR';

  /// Invalid DID format
  static const String invalidDID = 'INVALID_DID';

  /// Required credential type not present
  static const String missingCredentialType = 'MISSING_CREDENTIAL_TYPE';
}
