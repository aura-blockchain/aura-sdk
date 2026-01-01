/// Cache management for offline verification support
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'types.dart';

/// Manages caching of credentials and DID documents for offline verification
class CredentialCache {
  static const String _keyPrefix = 'aura_verifier_';
  static const String _didCacheKey = '${_keyPrefix}did_cache';
  static const String _vcCacheKey = '${_keyPrefix}vc_cache';
  static const String _resultCacheKey = '${_keyPrefix}result_cache';

  final int maxAgeSeconds;
  final int maxEntries;
  final bool persistToDisk;

  SharedPreferences? _prefs;
  final Map<String, _CachedItem<DIDDocument>> _didCache = {};
  final Map<String, _CachedItem<VCStatus>> _vcStatusCache = {};
  final Map<String, _CachedItem<VerificationResult>> _resultCache = {};

  CredentialCache({
    this.maxAgeSeconds = 3600,
    this.maxEntries = 1000,
    this.persistToDisk = true,
  });

  /// Initialize the cache (load from disk if persistent)
  Future<void> initialize() async {
    if (persistToDisk) {
      _prefs = await SharedPreferences.getInstance();
      await _loadFromDisk();
    }
  }

  /// Cache a DID document
  Future<void> cacheDIDDocument(String did, DIDDocument document) async {
    _didCache[did] = _CachedItem(
      data: document,
      timestamp: DateTime.now(),
    );

    await _pruneCache(_didCache);

    if (persistToDisk) {
      await _saveToDisk();
    }
  }

  /// Get a cached DID document
  DIDDocument? getDIDDocument(String did) {
    final item = _didCache[did];
    if (item == null) return null;

    if (_isExpired(item)) {
      _didCache.remove(did);
      return null;
    }

    return item.data;
  }

  /// Cache a VC status
  Future<void> cacheVCStatus(String vcId, VCStatus status) async {
    _vcStatusCache[vcId] = _CachedItem(
      data: status,
      timestamp: DateTime.now(),
    );

    await _pruneCache(_vcStatusCache);

    if (persistToDisk) {
      await _saveToDisk();
    }
  }

  /// Get a cached VC status
  VCStatus? getVCStatus(String vcId) {
    final item = _vcStatusCache[vcId];
    if (item == null) return null;

    if (_isExpired(item)) {
      _vcStatusCache.remove(vcId);
      return null;
    }

    return item.data;
  }

  /// Cache a verification result
  Future<void> cacheResult(String qrCodeData, VerificationResult result) async {
    final key = _hashQRCode(qrCodeData);
    _resultCache[key] = _CachedItem(
      data: result,
      timestamp: DateTime.now(),
    );

    await _pruneCache(_resultCache);

    if (persistToDisk) {
      await _saveToDisk();
    }
  }

  /// Get a cached verification result
  VerificationResult? getResult(String qrCodeData) {
    final key = _hashQRCode(qrCodeData);
    final item = _resultCache[key];
    if (item == null) return null;

    if (_isExpired(item)) {
      _resultCache.remove(key);
      return null;
    }

    return item.data;
  }

  /// Clear all caches
  Future<void> clear() async {
    _didCache.clear();
    _vcStatusCache.clear();
    _resultCache.clear();

    if (persistToDisk && _prefs != null) {
      await _prefs!.remove(_didCacheKey);
      await _prefs!.remove(_vcCacheKey);
      await _prefs!.remove(_resultCacheKey);
    }
  }

  /// Get cache statistics
  CacheStats getStats() {
    return CacheStats(
      didCacheSize: _didCache.length,
      vcStatusCacheSize: _vcStatusCache.length,
      resultCacheSize: _resultCache.length,
      totalEntries: _didCache.length + _vcStatusCache.length + _resultCache.length,
      maxEntries: maxEntries,
      maxAgeSeconds: maxAgeSeconds,
    );
  }

  bool _isExpired(_CachedItem item) {
    final age = DateTime.now().difference(item.timestamp).inSeconds;
    return age > maxAgeSeconds;
  }

  Future<void> _pruneCache<T>(Map<String, _CachedItem<T>> cache) async {
    // Remove expired items
    cache.removeWhere((key, item) => _isExpired(item));

    // If still over limit, remove oldest items
    if (cache.length > maxEntries) {
      final sortedEntries = cache.entries.toList()
        ..sort((a, b) => a.value.timestamp.compareTo(b.value.timestamp));

      final toRemove = sortedEntries.take(cache.length - maxEntries);
      for (final entry in toRemove) {
        cache.remove(entry.key);
      }
    }
  }

  String _hashQRCode(String qrCodeData) {
    // Simple hash - in production, use a proper hash function
    return qrCodeData.hashCode.toString();
  }

  Future<void> _loadFromDisk() async {
    if (_prefs == null) return;

    try {
      // Load DID cache
      final didData = _prefs!.getString(_didCacheKey);
      if (didData != null) {
        final Map<String, dynamic> decoded = jsonDecode(didData);
        decoded.forEach((key, value) {
          _didCache[key] = _CachedItem<DIDDocument>.fromJson(
            value,
            (data) => DIDDocument.fromJson(data),
          );
        });
      }

      // Load VC status cache
      final vcData = _prefs!.getString(_vcCacheKey);
      if (vcData != null) {
        final Map<String, dynamic> decoded = jsonDecode(vcData);
        decoded.forEach((key, value) {
          _vcStatusCache[key] = _CachedItem<VCStatus>.fromJson(
            value,
            (data) => VCStatus.fromCode(data['code'] as int),
          );
        });
      }

      // Note: We don't persist verification results as they may contain sensitive data
    } catch (e) {
      debugPrint('Failed to load cache from disk: $e');
    }
  }

  Future<void> _saveToDisk() async {
    if (_prefs == null) return;

    try {
      // Save DID cache
      final didData = <String, dynamic>{};
      _didCache.forEach((key, value) {
        didData[key] = value.toJson((data) => data.toJson());
      });
      await _prefs!.setString(_didCacheKey, jsonEncode(didData));

      // Save VC status cache
      final vcData = <String, dynamic>{};
      _vcStatusCache.forEach((key, value) {
        vcData[key] = value.toJson((data) => {'code': data.code});
      });
      await _prefs!.setString(_vcCacheKey, jsonEncode(vcData));
    } catch (e) {
      debugPrint('Failed to save cache to disk: $e');
    }
  }
}

/// Cached item with timestamp
class _CachedItem<T> {
  final T data;
  final DateTime timestamp;

  _CachedItem({
    required this.data,
    required this.timestamp,
  });

  Map<String, dynamic> toJson(Map<String, dynamic> Function(T) dataSerializer) {
    return {
      'data': dataSerializer(data),
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory _CachedItem.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) dataDeserializer,
  ) {
    return _CachedItem(
      data: dataDeserializer(json['data']),
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

/// Cache statistics
class CacheStats {
  final int didCacheSize;
  final int vcStatusCacheSize;
  final int resultCacheSize;
  final int totalEntries;
  final int maxEntries;
  final int maxAgeSeconds;

  CacheStats({
    required this.didCacheSize,
    required this.vcStatusCacheSize,
    required this.resultCacheSize,
    required this.totalEntries,
    required this.maxEntries,
    required this.maxAgeSeconds,
  });

  double get usagePercent => (totalEntries / maxEntries) * 100;

  @override
  String toString() {
    return 'CacheStats(DID: $didCacheSize, VC: $vcStatusCacheSize, '
        'Results: $resultCacheSize, Total: $totalEntries/$maxEntries)';
  }
}
