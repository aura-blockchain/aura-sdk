import 'package:flutter_test/flutter_test.dart';
import 'package:aura_verifier/aura_verifier.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

void main() {
  group('AuraVerifier', () {
    test('initialization', () async {
      final verifier = AuraVerifier(network: AuraNetwork.testnet);
      await verifier.initialize();
      expect(verifier.restEndpoint, contains('testnet'));
      verifier.dispose();
    });

    test('network configuration', () {
      final mainnetVerifier = AuraVerifier(network: AuraNetwork.mainnet);
      expect(mainnetVerifier.restEndpoint, contains('api.aurablockchain.org'));

      final testnetVerifier = AuraVerifier(network: AuraNetwork.testnet);
      expect(testnetVerifier.restEndpoint, contains('testnet'));

      final localVerifier = AuraVerifier(network: AuraNetwork.local);
      expect(localVerifier.restEndpoint, contains('localhost'));
    });

    test('custom endpoint', () {
      final verifier = AuraVerifier(
        network: AuraNetwork.mainnet,
        customRestEndpoint: 'https://custom.endpoint.com',
      );
      expect(verifier.restEndpoint, equals('https://custom.endpoint.com'));
    });

    test('QR code parsing - valid data', () {
      final verifier = AuraVerifier(network: AuraNetwork.mainnet);

      final qrData = {
        'v': '1.0',
        'p': 'presentation-123',
        'h': 'did:aura:mainnet:abc123',
        'vcs': ['vc-1', 'vc-2'],
        'ctx': {'age': true},
        'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600,
        'n': 12345,
        'sig': 'signature-data',
      };

      final encoded = base64Encode(utf8.encode(jsonEncode(qrData)));
      final parsed = verifier.parseQRCode(encoded);

      expect(parsed.version, equals('1.0'));
      expect(parsed.presentationId, equals('presentation-123'));
      expect(parsed.holderDID, equals('did:aura:mainnet:abc123'));
      expect(parsed.vcIds, hasLength(2));
    });

    test('QR code parsing - with URL prefix', () {
      final verifier = AuraVerifier(network: AuraNetwork.mainnet);

      final qrData = {
        'v': '1.0',
        'p': 'presentation-123',
        'h': 'did:aura:mainnet:abc123',
        'vcs': ['vc-1'],
        'ctx': {},
        'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600,
        'n': 12345,
        'sig': 'signature-data',
      };

      final encoded = base64Encode(utf8.encode(jsonEncode(qrData)));
      final withPrefix = 'aura://verify?data=$encoded';
      final parsed = verifier.parseQRCode(withPrefix);

      expect(parsed.version, equals('1.0'));
      expect(parsed.holderDID, equals('did:aura:mainnet:abc123'));
    });

    test('QR code parsing - invalid data throws exception', () {
      final verifier = AuraVerifier(network: AuraNetwork.mainnet);

      expect(
        () => verifier.parseQRCode('invalid-data'),
        throwsA(isA<AuraVerifierException>()),
      );
    });

    test('QR code expiration check', () {
      final verifier = AuraVerifier(network: AuraNetwork.mainnet);

      // Expired QR code
      final expiredData = {
        'v': '1.0',
        'p': 'presentation-123',
        'h': 'did:aura:mainnet:abc123',
        'vcs': ['vc-1'],
        'ctx': {},
        'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 - 3600, // 1 hour ago
        'n': 12345,
        'sig': 'signature-data',
      };

      final encoded = base64Encode(utf8.encode(jsonEncode(expiredData)));
      final parsed = verifier.parseQRCode(encoded);

      expect(parsed.isExpired, isTrue);

      // Valid QR code
      final validData = {
        'v': '1.0',
        'p': 'presentation-123',
        'h': 'did:aura:mainnet:abc123',
        'vcs': ['vc-1'],
        'ctx': {},
        'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600, // 1 hour from now
        'n': 12345,
        'sig': 'signature-data',
      };

      final validEncoded = base64Encode(utf8.encode(jsonEncode(validData)));
      final validParsed = verifier.parseQRCode(validEncoded);

      expect(validParsed.isExpired, isFalse);
    });
  });

  group('VCType', () {
    test('from code conversion', () {
      expect(VCType.fromCode(0), equals(VCType.unspecified));
      expect(VCType.fromCode(1), equals(VCType.verifiedHuman));
      expect(VCType.fromCode(2), equals(VCType.ageOver18));
      expect(VCType.fromCode(3), equals(VCType.ageOver21));
      expect(VCType.fromCode(999), equals(VCType.unspecified)); // Unknown code
    });

    test('display names', () {
      expect(VCType.verifiedHuman.displayName, equals('Verified Human'));
      expect(VCType.ageOver18.displayName, equals('Age 18+'));
      expect(VCType.ageOver21.displayName, equals('Age 21+'));
    });
  });

  group('VCStatus', () {
    test('from code conversion', () {
      expect(VCStatus.fromCode(0), equals(VCStatus.unspecified));
      expect(VCStatus.fromCode(1), equals(VCStatus.pending));
      expect(VCStatus.fromCode(2), equals(VCStatus.active));
      expect(VCStatus.fromCode(3), equals(VCStatus.revoked));
      expect(VCStatus.fromCode(4), equals(VCStatus.expired));
      expect(VCStatus.fromCode(5), equals(VCStatus.suspended));
    });

    test('isValid property', () {
      expect(VCStatus.active.isValid, isTrue);
      expect(VCStatus.pending.isValid, isFalse);
      expect(VCStatus.revoked.isValid, isFalse);
      expect(VCStatus.expired.isValid, isFalse);
      expect(VCStatus.suspended.isValid, isFalse);
    });
  });

  group('DiscloseableAttributes', () {
    test('fromJson parsing', () {
      final json = {
        'full_name': 'John Doe',
        'age': 25,
        'is_over_18': true,
        'is_over_21': true,
        'city_state': 'New York, NY',
        'custom_attributes': {
          'aura_score': '850',
        },
      };

      final attrs = DiscloseableAttributes.fromJson(json);

      expect(attrs.fullName, equals('John Doe'));
      expect(attrs.age, equals(25));
      expect(attrs.isOver18, isTrue);
      expect(attrs.isOver21, isTrue);
      expect(attrs.cityState, equals('New York, NY'));
      expect(attrs.customAttributes['aura_score'], equals('850'));
    });

    test('fromJson with missing fields', () {
      final json = <String, dynamic>{};
      final attrs = DiscloseableAttributes.fromJson(json);

      expect(attrs.fullName, isNull);
      expect(attrs.age, isNull);
      expect(attrs.isOver18, isFalse);
      expect(attrs.isOver21, isFalse);
      expect(attrs.customAttributes, isEmpty);
    });
  });

  group('VerificationResult', () {
    test('fromJson parsing', () {
      final json = {
        'is_valid': true,
        'holder_did': 'did:aura:mainnet:abc123',
        'verified_at': DateTime.now().toIso8601String(),
        'vc_details': [
          {
            'vc_id': 'vc-123',
            'vc_type': 1,
            'status': 2,
            'is_valid': true,
            'is_expired': false,
            'is_revoked': false,
          }
        ],
        'attributes': {
          'is_over_21': true,
        },
        'audit_id': 'audit-123',
      };

      final result = VerificationResult.fromJson(json, 150);

      expect(result.isValid, isTrue);
      expect(result.holderDID, equals('did:aura:mainnet:abc123'));
      expect(result.vcDetails, hasLength(1));
      expect(result.vcDetails[0].vcType, equals(VCType.verifiedHuman));
      expect(result.networkLatencyMs, equals(150));
    });
  });

  group('AuraVerifierException', () {
    test('error code and message', () {
      final exception = AuraVerifierException(
        'Test error',
        code: AuraErrorCode.networkError,
      );

      expect(exception.message, equals('Test error'));
      expect(exception.code, equals(AuraErrorCode.networkError));
      expect(exception.toString(), contains('Test error'));
      expect(exception.toString(), contains('NETWORK_ERROR'));
    });

    test('default error code', () {
      final exception = AuraVerifierException('Test error');
      expect(exception.code, equals(AuraErrorCode.unknown));
    });
  });

  group('CacheConfig', () {
    test('default values', () {
      const config = CacheConfig();

      expect(config.maxAgeSeconds, equals(3600));
      expect(config.maxEntries, equals(1000));
      expect(config.persistToDisk, isTrue);
    });

    test('custom values', () {
      const config = CacheConfig(
        maxAgeSeconds: 7200,
        maxEntries: 500,
        persistToDisk: false,
      );

      expect(config.maxAgeSeconds, equals(7200));
      expect(config.maxEntries, equals(500));
      expect(config.persistToDisk, isFalse);
    });
  });
}
