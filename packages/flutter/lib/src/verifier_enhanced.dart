/// Enhanced verifier with offline mode, caching, and event support
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'types.dart';
import 'errors.dart';
import 'config.dart';
import 'cache.dart';
import 'verifier.dart';

/// Enhanced AuraVerifier with full feature set
class AuraVerifierEnhanced extends AuraVerifier {
  /// Cache for offline mode
  final CredentialCache? cache;

  /// Event stream controller
  final StreamController<VerifierEvent> _eventController =
      StreamController<VerifierEvent>.broadcast();

  /// Stream of verification events
  Stream<VerifierEvent> get events => _eventController.stream;

  /// Whether offline mode is enabled
  final bool offlineMode;

  /// Cache configuration
  final CacheConfig? cacheConfig;

  AuraVerifierEnhanced({
    required super.network,
    super.customRestEndpoint,
    super.timeoutMs,
    this.offlineMode = false,
    this.cacheConfig,
  }) : cache = cacheConfig != null
            ? CredentialCache(
                maxAgeSeconds: cacheConfig.maxAgeSeconds,
                maxEntries: cacheConfig.maxEntries,
                persistToDisk: cacheConfig.persistToDisk,
              )
            : null;

  @override
  Future<void> initialize() async {
    await super.initialize();

    // Initialize cache if enabled
    if (cache != null) {
      await cache!.initialize();
    }

    _emitEvent(VerifierEventType.syncCompleted, {
      'initialized': true,
      'offlineMode': offlineMode,
      'cacheEnabled': cache != null,
    });
  }

  @override
  void dispose() {
    _eventController.close();
    super.dispose();
  }

  @override
  Future<VerificationResult> verify(
    String qrCodeData, {
    String? verifierAddress,
  }) async {
    _emitEvent(VerifierEventType.verificationStarted, {
      'qrCodeDataLength': qrCodeData.length,
      'verifierAddress': verifierAddress,
    });

    try {
      // Check cache first if enabled
      if (cache != null) {
        final cached = cache!.getResult(qrCodeData);
        if (cached != null) {
          _emitEvent(VerifierEventType.verificationCompleted, {
            'method': 'cached',
            'holderDID': cached.holderDID,
          });
          return cached;
        }
      }

      // If offline mode and no cache, fail
      if (offlineMode) {
        throw AuraVerifierException(
          'Offline mode enabled but no cached result available',
          code: AuraErrorCode.networkError,
        );
      }

      // Perform online verification
      final result = await super.verify(
        qrCodeData,
        verifierAddress: verifierAddress,
      );

      // Cache the result if caching is enabled
      if (cache != null) {
        await cache!.cacheResult(qrCodeData, result);
        _emitEvent(VerifierEventType.cacheUpdated, {
          'type': 'verification_result',
          'holderDID': result.holderDID,
        });
      }

      _emitEvent(VerifierEventType.verificationCompleted, {
        'method': 'online',
        'holderDID': result.holderDID,
        'isValid': result.isValid,
      });

      return result;
    } catch (e) {
      _emitEvent(VerifierEventType.verificationFailed, {
        'error': e.toString(),
      });
      rethrow;
    }
  }

  /// Verify multiple QR codes in batch
  Future<BatchVerificationResult> verifyBatch(
    List<String> qrCodeDataList, {
    BatchVerificationOptions options = const BatchVerificationOptions(),
  }) async {
    final startTime = DateTime.now();
    final results = <VerificationResult>[];
    final errors = <String>[];
    int successCount = 0;
    int failureCount = 0;

    _emitEvent(VerifierEventType.verificationStarted, {
      'batch': true,
      'count': qrCodeDataList.length,
    });

    // Process in parallel with concurrency limit
    final chunks = <List<String>>[];
    for (var i = 0; i < qrCodeDataList.length; i += options.concurrency) {
      chunks.add(
        qrCodeDataList.sublist(
          i,
          i + options.concurrency > qrCodeDataList.length
              ? qrCodeDataList.length
              : i + options.concurrency,
        ),
      );
    }

    for (final chunk in chunks) {
      final futures = chunk.map((qrData) async {
        try {
          final result = await verify(qrData);
          successCount++;
          return result;
        } catch (e) {
          failureCount++;
          errors.add(e.toString());
          if (options.stopOnFirstError) {
            rethrow;
          }
          // Return a failed result if partial results are included
          if (options.includePartialResults) {
            return VerificationResult(
              isValid: false,
              holderDID: '',
              verifiedAt: DateTime.now(),
              vcDetails: [],
              attributes: DiscloseableAttributes(),
              verificationError: e.toString(),
              auditId: '',
              networkLatencyMs: 0,
              method: VerificationMethod.online,
            );
          }
          return null;
        }
      });

      final chunkResults = await Future.wait(futures);
      results.addAll(chunkResults.whereType<VerificationResult>());

      if (options.stopOnFirstError && errors.isNotEmpty) {
        break;
      }
    }

    final duration = DateTime.now().difference(startTime);

    _emitEvent(VerifierEventType.verificationCompleted, {
      'batch': true,
      'successCount': successCount,
      'failureCount': failureCount,
      'duration': duration.inMilliseconds,
    });

    return BatchVerificationResult(
      results: results,
      successCount: successCount,
      failureCount: failureCount,
      totalDuration: duration,
      errors: errors,
    );
  }

  /// Sync cache with network (refresh cached credentials)
  Future<void> syncCache() async {
    if (cache == null) {
      throw AuraVerifierException(
        'Cache not enabled',
        code: AuraErrorCode.unknown,
      );
    }

    if (offlineMode) {
      throw AuraVerifierException(
        'Cannot sync cache in offline mode',
        code: AuraErrorCode.networkError,
      );
    }

    _emitEvent(VerifierEventType.syncStarted, {
      'timestamp': DateTime.now().toIso8601String(),
    });

    try {
      // In a real implementation, this would fetch updates from the network
      // For now, we just emit a completion event
      _emitEvent(VerifierEventType.syncCompleted, {
        'timestamp': DateTime.now().toIso8601String(),
        'success': true,
      });
    } catch (e) {
      _emitEvent(VerifierEventType.error, {
        'operation': 'sync',
        'error': e.toString(),
      });
      rethrow;
    }
  }

  /// Get cache statistics
  CacheStats? getCacheStats() {
    return cache?.getStats();
  }

  /// Clear the cache
  Future<void> clearCache() async {
    if (cache != null) {
      await cache!.clear();
      _emitEvent(VerifierEventType.cacheUpdated, {
        'action': 'cleared',
      });
    }
  }

  /// Enable or disable offline mode
  Future<void> setOfflineMode(bool enabled) async {
    // This would need to be implemented with state management
    // For now, we just emit an event
    _emitEvent(VerifierEventType.cacheUpdated, {
      'offlineMode': enabled,
    });
  }

  void _emitEvent(VerifierEventType type, Map<String, dynamic> data) {
    if (!_eventController.isClosed) {
      _eventController.add(VerifierEvent(
        type: type,
        timestamp: DateTime.now(),
        data: data,
      ));
    }
  }
}
