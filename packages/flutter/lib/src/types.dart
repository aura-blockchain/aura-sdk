/// Types for the Aura Verifier SDK

/// Result of a credential verification
class VerificationResult {
  /// Whether the credential is valid
  final bool isValid;

  /// The DID of the credential holder
  final String holderDID;

  /// When the verification was performed
  final DateTime verifiedAt;

  /// Details of each verified credential
  final List<VCDetail> vcDetails;

  /// Disclosed attributes from the credential
  final DiscloseableAttributes attributes;

  /// Error message if verification failed
  final String? verificationError;

  /// Unique audit trail identifier
  final String auditId;

  /// Network request latency in milliseconds
  final int networkLatencyMs;

  /// Method used for verification
  final VerificationMethod method;

  VerificationResult({
    required this.isValid,
    required this.holderDID,
    required this.verifiedAt,
    required this.vcDetails,
    required this.attributes,
    this.verificationError,
    required this.auditId,
    required this.networkLatencyMs,
    required this.method,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json, int latencyMs) {
    return VerificationResult(
      isValid: json['is_valid'] ?? false,
      holderDID: json['holder_did'] ?? '',
      verifiedAt: DateTime.tryParse(json['verified_at'] ?? '') ?? DateTime.now(),
      vcDetails: (json['vc_details'] as List<dynamic>?)
              ?.map((e) => VCDetail.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      attributes: DiscloseableAttributes.fromJson(json['attributes'] ?? {}),
      verificationError: json['verification_error'],
      auditId: json['audit_id'] ?? '',
      networkLatencyMs: latencyMs,
      method: VerificationMethod.online,
    );
  }
}

/// Details of a single verifiable credential
class VCDetail {
  final String vcId;
  final VCType vcType;
  final VCStatus status;
  final bool isValid;
  final bool isExpired;
  final bool isRevoked;
  final DateTime? issuedAt;
  final DateTime? expiresAt;

  VCDetail({
    required this.vcId,
    required this.vcType,
    required this.status,
    required this.isValid,
    required this.isExpired,
    required this.isRevoked,
    this.issuedAt,
    this.expiresAt,
  });

  factory VCDetail.fromJson(Map<String, dynamic> json) {
    return VCDetail(
      vcId: json['vc_id'] ?? '',
      vcType: VCType.fromCode(json['vc_type'] ?? 0),
      status: VCStatus.fromCode(json['status'] ?? 0),
      isValid: json['is_valid'] ?? false,
      isExpired: json['is_expired'] ?? false,
      isRevoked: json['is_revoked'] ?? false,
      issuedAt: DateTime.tryParse(json['issued_at'] ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at'] ?? ''),
    );
  }
}

/// Attributes disclosed by the credential holder
class DiscloseableAttributes {
  final String? fullName;
  final int? age;
  final bool isOver18;
  final bool isOver21;
  final String? fullAddress;
  final String? cityState;
  final Map<String, String> customAttributes;

  DiscloseableAttributes({
    this.fullName,
    this.age,
    this.isOver18 = false,
    this.isOver21 = false,
    this.fullAddress,
    this.cityState,
    this.customAttributes = const {},
  });

  factory DiscloseableAttributes.fromJson(Map<String, dynamic> json) {
    return DiscloseableAttributes(
      fullName: json['full_name'],
      age: json['age'],
      isOver18: json['is_over_18'] ?? false,
      isOver21: json['is_over_21'] ?? false,
      fullAddress: json['full_address'],
      cityState: json['city_state'],
      customAttributes: Map<String, String>.from(json['custom_attributes'] ?? {}),
    );
  }
}

/// Parsed QR code data
class QRCodeData {
  final String version;
  final String presentationId;
  final String holderDID;
  final List<String> vcIds;
  final Map<String, bool> context;
  final int expiresAt;
  final int nonce;
  final String signature;

  QRCodeData({
    required this.version,
    required this.presentationId,
    required this.holderDID,
    required this.vcIds,
    required this.context,
    required this.expiresAt,
    required this.nonce,
    required this.signature,
  });

  factory QRCodeData.fromJson(Map<String, dynamic> json) {
    return QRCodeData(
      version: json['v'] ?? '1.0',
      presentationId: json['p'] ?? '',
      holderDID: json['h'] ?? '',
      vcIds: List<String>.from(json['vcs'] ?? []),
      context: Map<String, bool>.from(json['ctx'] ?? {}),
      expiresAt: json['exp'] ?? 0,
      nonce: json['n'] ?? 0,
      signature: json['sig'] ?? '',
    );
  }

  /// Check if the presentation has expired
  bool get isExpired {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return expiresAt <= now;
  }
}

/// Type of verifiable credential
enum VCType {
  unspecified(0, 'Unspecified'),
  verifiedHuman(1, 'Verified Human'),
  ageOver18(2, 'Age 18+'),
  ageOver21(3, 'Age 21+'),
  residentOf(4, 'Resident'),
  biometricAuth(5, 'Biometric'),
  kycVerification(6, 'KYC'),
  notaryPublic(7, 'Notary'),
  professionalLicense(8, 'Professional License');

  final int code;
  final String displayName;

  const VCType(this.code, this.displayName);

  static VCType fromCode(int code) {
    return VCType.values.firstWhere(
      (e) => e.code == code,
      orElse: () => VCType.unspecified,
    );
  }
}

/// Status of a verifiable credential
enum VCStatus {
  unspecified(0, 'Unknown'),
  pending(1, 'Pending'),
  active(2, 'Active'),
  revoked(3, 'Revoked'),
  expired(4, 'Expired'),
  suspended(5, 'Suspended');

  final int code;
  final String displayName;

  const VCStatus(this.code, this.displayName);

  static VCStatus fromCode(int code) {
    return VCStatus.values.firstWhere(
      (e) => e.code == code,
      orElse: () => VCStatus.unspecified,
    );
  }

  /// Whether the credential is valid for verification
  bool get isValid => this == VCStatus.active;
}

/// Method used for verification
enum VerificationMethod {
  /// Verified against the blockchain in real-time
  online,

  /// Verified using cached data
  offline,

  /// Result retrieved from local cache
  cached,
}

/// DID Document representing a decentralized identifier
class DIDDocument {
  final String id;
  final List<VerificationMethodEntry> verificationMethods;
  final List<String> authentication;
  final Map<String, dynamic> service;
  final DateTime? created;
  final DateTime? updated;

  DIDDocument({
    required this.id,
    required this.verificationMethods,
    required this.authentication,
    required this.service,
    this.created,
    this.updated,
  });

  factory DIDDocument.fromJson(Map<String, dynamic> json) {
    return DIDDocument(
      id: json['id'] ?? '',
      verificationMethods: (json['verificationMethod'] as List<dynamic>?)
              ?.map((e) => VerificationMethodEntry.fromJson(e))
              .toList() ??
          [],
      authentication: List<String>.from(json['authentication'] ?? []),
      service: Map<String, dynamic>.from(json['service'] ?? {}),
      created: DateTime.tryParse(json['created'] ?? ''),
      updated: DateTime.tryParse(json['updated'] ?? ''),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'verificationMethod': verificationMethods.map((e) => e.toJson()).toList(),
      'authentication': authentication,
      'service': service,
      if (created != null) 'created': created!.toIso8601String(),
      if (updated != null) 'updated': updated!.toIso8601String(),
    };
  }
}

/// Verification method entry in a DID document
class VerificationMethodEntry {
  final String id;
  final String type;
  final String controller;
  final String publicKeyHex;

  VerificationMethodEntry({
    required this.id,
    required this.type,
    required this.controller,
    required this.publicKeyHex,
  });

  factory VerificationMethodEntry.fromJson(Map<String, dynamic> json) {
    return VerificationMethodEntry(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      controller: json['controller'] ?? '',
      publicKeyHex: json['publicKeyHex'] ?? json['publicKeyBase58'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'controller': controller,
      'publicKeyHex': publicKeyHex,
    };
  }
}

/// Event types for verification events
enum VerifierEventType {
  verificationStarted,
  verificationCompleted,
  verificationFailed,
  cacheUpdated,
  syncStarted,
  syncCompleted,
  error,
}

/// Event emitted by the verifier
class VerifierEvent {
  final VerifierEventType type;
  final DateTime timestamp;
  final Map<String, dynamic> data;

  VerifierEvent({
    required this.type,
    required this.timestamp,
    required this.data,
  });
}

/// Batch verification options
class BatchVerificationOptions {
  final int concurrency;
  final bool stopOnFirstError;
  final bool includePartialResults;

  const BatchVerificationOptions({
    this.concurrency = 5,
    this.stopOnFirstError = false,
    this.includePartialResults = true,
  });
}

/// Result of batch verification
class BatchVerificationResult {
  final List<VerificationResult> results;
  final int successCount;
  final int failureCount;
  final Duration totalDuration;
  final List<String> errors;

  BatchVerificationResult({
    required this.results,
    required this.successCount,
    required this.failureCount,
    required this.totalDuration,
    required this.errors,
  });

  double get successRate => successCount / (successCount + failureCount);
}
