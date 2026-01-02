/**
 * Network Endpoint Configuration for Aura Blockchain
 *
 * Defines endpoints and chain IDs for different Aura networks.
 */

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  /** gRPC endpoint URL */
  grpc: string;
  /** REST API endpoint URL */
  rest: string;
  /** Cosmos chain ID */
  chainId: string;
}

/**
 * Aura network configurations
 *
 * Security:
 * - Mainnet and testnet use TLS-secured endpoints (HTTPS/gRPCS)
 * - gRPC endpoints use port 443 with TLS by default
 * - Local network allows insecure connections for development only
 */
export const AURA_NETWORKS: Record<'mainnet' | 'testnet' | 'local', NetworkConfig> = {
  /**
   * Aura Mainnet (Production)
   * Security: TLS required for all connections
   * Note: Mainnet endpoints are TBD
   */
  mainnet: {
    grpc: 'grpcs://mainnet-rpc.aurablockchain.org:443', // TBD
    rest: 'https://mainnet-api.aurablockchain.org', // TBD
    chainId: 'aura-mainnet-1',
  },

  /**
   * Aura Testnet
   * Security: TLS required for all connections
   */
  testnet: {
    grpc: 'grpcs://testnet-rpc.aurablockchain.org:443',
    rest: 'https://testnet-api.aurablockchain.org',
    chainId: 'aura-testnet-1',
  },

  /**
   * Local Development Network
   * Security: Insecure connections allowed for localhost only
   */
  local: {
    grpc: 'grpc://localhost:9090',
    rest: 'http://localhost:1317',
    chainId: 'aura-local-test',
  },
};

/**
 * REST API endpoint paths
 */
export const API_PATHS = {
  /**
   * VC Registry module endpoints
   */
  vcregistry: {
    /** Verify a presentation */
    verifyPresentation: '/aura/vcregistry/v1beta1/verify_presentation',
    /** Get VC by ID */
    getVC: (vcId: string) => `/aura/vcregistry/v1beta1/vc/${encodeURIComponent(vcId)}`,
    /** Get VC status */
    getVCStatus: (vcId: string) => `/aura/vcregistry/v1beta1/vc_status/${encodeURIComponent(vcId)}`,
    /** List VCs by holder */
    listVCsByHolder: (holderDid: string) => `/aura/vcregistry/v1beta1/vcs/holder/${encodeURIComponent(holderDid)}`,
    /** List VCs by issuer */
    listVCsByIssuer: (issuerDid: string) => `/aura/vcregistry/v1beta1/vcs/issuer/${encodeURIComponent(issuerDid)}`,
  },

  /**
   * Identity module endpoints
   */
  identity: {
    /** Resolve DID document */
    resolveDID: (did: string) => `/aura/identity/v1beta1/did/${encodeURIComponent(did)}`,
    /** Get DID verification methods */
    getVerificationMethods: (did: string) => `/aura/identity/v1beta1/did/${encodeURIComponent(did)}/verification_methods`,
  },

  /**
   * Chain info endpoints
   */
  chain: {
    /** Get node info */
    nodeInfo: '/cosmos/base/tendermint/v1beta1/node_info',
    /** Get latest block */
    latestBlock: '/cosmos/base/tendermint/v1beta1/blocks/latest',
    /** Get syncing status */
    syncing: '/cosmos/base/tendermint/v1beta1/syncing',
  },
};

/**
 * Get network configuration by name
 */
export function getNetworkConfig(network: 'mainnet' | 'testnet' | 'local'): NetworkConfig {
  return AURA_NETWORKS[network];
}

/**
 * Validate network name
 */
export function isValidNetwork(network: string): network is 'mainnet' | 'testnet' | 'local' {
  return network === 'mainnet' || network === 'testnet' || network === 'local';
}

/**
 * Build full REST endpoint URL
 */
export function buildEndpointURL(baseURL: string, path: string): string {
  // Remove trailing slash from base URL
  const base = baseURL.replace(/\/+$/, '');
  // Ensure path starts with slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Security: Validate that endpoint uses TLS (HTTPS)
 * @param endpoint - URL to validate
 * @param allowInsecureLocal - Allow HTTP for localhost only (default: false)
 * @returns true if secure, throws otherwise
 */
export function validateTLSEndpoint(
  endpoint: string,
  allowInsecureLocal: boolean = false
): boolean {
  const url = new URL(endpoint);

  // HTTPS is always allowed
  if (url.protocol === 'https:') {
    return true;
  }

  // HTTP only allowed for localhost in development
  if (url.protocol === 'http:') {
    const isLocalhost = url.hostname === 'localhost' ||
                        url.hostname === '127.0.0.1' ||
                        url.hostname === '::1';

    if (isLocalhost && allowInsecureLocal) {
      return true;
    }

    throw new Error(
      `Security: TLS required. Endpoint "${endpoint}" must use HTTPS. ` +
      `HTTP is only allowed for localhost in development mode.`
    );
  }

  throw new Error(`Unsupported protocol: ${url.protocol}`);
}

/**
 * Security: Validate gRPC endpoint format and TLS requirements
 *
 * Production gRPC MUST use TLS (grpcs:// protocol or port 443)
 * @param endpoint - gRPC endpoint URL (e.g., grpcs://rpc.aurablockchain.org:443)
 * @param network - Network type (mainnet, testnet, local)
 * @param allowInsecure - Allow insecure connections (default: false, only for local)
 * @returns true if valid, throws SecurityError otherwise
 */
export function validateGRPCEndpoint(
  endpoint: string,
  network: 'mainnet' | 'testnet' | 'local',
  allowInsecure: boolean = false
): boolean {
  // Parse the endpoint
  const grpcsMatch = endpoint.match(/^grpcs:\/\/(.+):(\d+)$/);
  const grpcMatch = endpoint.match(/^grpc:\/\/(.+):(\d+)$/);
  const legacyMatch = endpoint.match(/^([^:]+):(\d+)$/);

  // Check for grpcs:// (secure gRPC with TLS)
  if (grpcsMatch) {
    return true; // TLS is explicitly enabled
  }

  // Check for grpc:// (insecure gRPC)
  if (grpcMatch) {
    const host = grpcMatch[1];
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    if (network === 'local' && isLocalhost) {
      return true; // Insecure localhost is allowed for local network
    }

    if (allowInsecure && isLocalhost) {
      console.warn(
        `[Security Warning] Allowing insecure gRPC connection to ${endpoint}. ` +
        `This should only be used for local development.`
      );
      return true;
    }

    throw new Error(
      `Security: TLS required for gRPC. Endpoint "${endpoint}" uses insecure grpc:// protocol. ` +
      `Use grpcs:// for secure connections to non-local networks.`
    );
  }

  // Legacy format without protocol (e.g., "rpc.aurablockchain.org:9090")
  if (legacyMatch) {
    const host = legacyMatch[1];
    const port = parseInt(legacyMatch[2], 10);
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    // Local network with localhost is allowed
    if (network === 'local' && isLocalhost) {
      console.warn(
        `[Security] Legacy gRPC endpoint format "${endpoint}". ` +
        `Consider using grpc://localhost:${port} for clarity.`
      );
      return true;
    }

    // For non-local networks, require explicit protocol
    throw new Error(
      `Security: Ambiguous gRPC endpoint "${endpoint}". ` +
      `Use grpcs://${host}:${port} for TLS-secured connections, ` +
      `or grpc://${host}:${port} for insecure (local only).`
    );
  }

  throw new Error(
    `Invalid gRPC endpoint format: "${endpoint}". ` +
    `Expected format: grpcs://host:port or grpc://host:port`
  );
}

/**
 * Get secure network configuration
 * Security: Validates TLS requirements for non-local networks
 */
export function getSecureNetworkConfig(
  network: 'mainnet' | 'testnet' | 'local',
  options: { allowInsecureLocal?: boolean } = {}
): NetworkConfig {
  const config = AURA_NETWORKS[network];

  // Validate TLS for non-local networks
  if (network !== 'local') {
    validateTLSEndpoint(config.rest, false);
    validateGRPCEndpoint(config.grpc, network);
  } else if (options.allowInsecureLocal) {
    // Local is explicitly allowed
    validateTLSEndpoint(config.rest, true);
  }

  return config;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryOnTimeout: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Default timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Default connection timeout in milliseconds
 */
export const DEFAULT_CONNECT_TIMEOUT = 5000; // 5 seconds

/**
 * Batch query limits
 */
export const BATCH_LIMITS = {
  /** Maximum VCs to query in single batch */
  maxBatchSize: 100,
  /** Concurrent requests in batch */
  concurrentRequests: 10,
};
