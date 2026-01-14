/// Configuration for the Aura Verifier SDK

/// Available Aura networks
enum AuraNetwork {
  /// Production mainnet
  mainnet,

  /// Public testnet for development
  testnet,

  /// Local development network
  local,
}

/// Network configuration
class AuraNetworkConfig {
  final String name;
  final String restEndpoint;
  final String grpcEndpoint;
  final String chainId;
  final String bech32Prefix;

  const AuraNetworkConfig({
    required this.name,
    required this.restEndpoint,
    required this.grpcEndpoint,
    required this.chainId,
    this.bech32Prefix = 'aura',
  });

  /// Mainnet configuration
  static const mainnet = AuraNetworkConfig(
    name: 'mainnet',
    restEndpoint: 'https://api.aurablockchain.org',
    grpcEndpoint: 'rpc.aurablockchain.org:9090',
    chainId: 'aura-mainnet-1',
  );

  /// Testnet configuration (MVP testnet)
  static const testnet = AuraNetworkConfig(
    name: 'testnet',
    restEndpoint: 'https://testnet-api.aurablockchain.org',
    grpcEndpoint: 'testnet-grpc.aurablockchain.org:443',
    chainId: 'aura-mvp-1',
  );

  /// Local development configuration
  static const local = AuraNetworkConfig(
    name: 'local',
    restEndpoint: 'http://localhost:1317',
    grpcEndpoint: 'localhost:9090',
    chainId: 'aura-local',
  );

  /// Get configuration for a network
  static AuraNetworkConfig getConfig(AuraNetwork network) {
    switch (network) {
      case AuraNetwork.mainnet:
        return mainnet;
      case AuraNetwork.testnet:
        return testnet;
      case AuraNetwork.local:
        return local;
    }
  }
}

/// Verifier configuration options
class AuraVerifierConfig {
  /// Which network to connect to
  final AuraNetwork network;

  /// Custom REST endpoint (overrides network default)
  final String? customRestEndpoint;

  /// Request timeout in milliseconds
  final int timeoutMs;

  /// Enable offline verification mode
  final bool offlineMode;

  /// Cache configuration for offline mode
  final CacheConfig? cacheConfig;

  const AuraVerifierConfig({
    this.network = AuraNetwork.mainnet,
    this.customRestEndpoint,
    this.timeoutMs = 10000,
    this.offlineMode = false,
    this.cacheConfig,
  });
}

/// Cache configuration for offline verification
class CacheConfig {
  /// Maximum age of cached data in seconds
  final int maxAgeSeconds;

  /// Maximum number of cached entries
  final int maxEntries;

  /// Whether to persist cache to disk
  final bool persistToDisk;

  const CacheConfig({
    this.maxAgeSeconds = 3600,
    this.maxEntries = 1000,
    this.persistToDisk = true,
  });
}
