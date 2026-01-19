/**
 * Aura Blockchain Network Configuration Types
 *
 * This file contains network configuration types and endpoint definitions
 * for connecting to Aura blockchain mainnet and testnet.
 *
 * @packageDocumentation
 */

// ============================
// NETWORK ENUMS
// ============================

/**
 * NetworkType represents the blockchain network
 */
export enum NetworkType {
  /** Mainnet production network */
  MAINNET = 'mainnet',
  /** Testnet development network */
  TESTNET = 'testnet',
  /** Local development network */
  LOCALNET = 'localnet',
}

/**
 * ChainID for each network
 */
export enum ChainID {
  /** Mainnet chain ID */
  MAINNET = 'aura-mvp-1',
  /** Testnet chain ID (MVP testnet) */
  TESTNET = 'aura-mvp-1',
  /** Local chain ID */
  LOCALNET = 'aura-local-1',
}

// ============================
// ENDPOINT CONFIGURATION
// ============================

/**
 * NetworkEndpoints defines RPC and REST endpoints for a network
 */
export interface NetworkEndpoints {
  /** gRPC endpoint (e.g., https://rpc.aurablockchain.org:9090) */
  grpc: string;
  /** REST/LCD endpoint (e.g., https://api.aurablockchain.org) */
  rest: string;
  /** Tendermint RPC endpoint (e.g., https://rpc.aurablockchain.org) */
  rpc: string;
  /** WebSocket endpoint for subscriptions (optional) */
  websocket?: string;
}

/**
 * NetworkConfig defines complete network configuration
 */
export interface NetworkConfig {
  /** Network type */
  network: NetworkType;
  /** Chain ID */
  chainId: ChainID;
  /** Network endpoints */
  endpoints: NetworkEndpoints;
  /** Address prefix (e.g., "aura") */
  addressPrefix: string;
  /** DID prefix (e.g., "did:aura") */
  didPrefix: string;
  /** DID network identifier (e.g., "mainnet", "testnet") */
  didNetwork: string;
  /** Gas price configuration */
  gasPrice?: GasPrice;
  /** Block time in milliseconds */
  blockTime?: number;
  /** Whether this is a production network */
  isProduction: boolean;
}

/**
 * GasPrice configuration for transactions
 */
export interface GasPrice {
  /** Amount (e.g., "0.025") */
  amount: string;
  /** Denom (e.g., "uaura") */
  denom: string;
}

// ============================
// PREDEFINED NETWORK CONFIGS
// ============================

/**
 * Mainnet configuration
 * Note: Mainnet endpoints are TBD - these are placeholders
 */
export const MAINNET_CONFIG: NetworkConfig = {
  network: NetworkType.MAINNET,
  chainId: ChainID.MAINNET,
  endpoints: {
    grpc: 'https://mainnet-rpc.aurablockchain.org:9090', // TBD
    rest: 'https://mainnet-api.aurablockchain.org', // TBD
    rpc: 'https://mainnet-rpc.aurablockchain.org', // TBD
    websocket: 'wss://mainnet-rpc.aurablockchain.org/websocket', // TBD
  },
  addressPrefix: 'aura',
  didPrefix: 'did:aura',
  didNetwork: 'mainnet',
  gasPrice: {
    amount: '0.025',
    denom: 'uaura',
  },
  blockTime: 6000, // 6 seconds
  isProduction: true,
};

/**
 * Testnet configuration
 */
export const TESTNET_CONFIG: NetworkConfig = {
  network: NetworkType.TESTNET,
  chainId: ChainID.TESTNET,
  endpoints: {
    grpc: 'testnet-grpc.aurablockchain.org:443',
    rest: 'https://testnet-api.aurablockchain.org',
    rpc: 'https://testnet-rpc.aurablockchain.org',
    websocket: 'wss://testnet-ws.aurablockchain.org/websocket',
  },
  addressPrefix: 'aura',
  didPrefix: 'did:aura',
  didNetwork: 'testnet',
  gasPrice: {
    amount: '0.025',
    denom: 'uaura',
  },
  blockTime: 6000, // 6 seconds
  isProduction: false,
};

/**
 * Local development network configuration
 */
export const LOCALNET_CONFIG: NetworkConfig = {
  network: NetworkType.LOCALNET,
  chainId: ChainID.LOCALNET,
  endpoints: {
    grpc: 'http://localhost:9090',
    rest: 'http://localhost:1317',
    rpc: 'http://localhost:26657',
    websocket: 'ws://localhost:26657/websocket',
  },
  addressPrefix: 'aura',
  didPrefix: 'did:aura',
  didNetwork: 'localnet',
  gasPrice: {
    amount: '0.025',
    denom: 'uaura',
  },
  blockTime: 1000, // 1 second (faster for development)
  isProduction: false,
};

/**
 * Map of network type to configuration
 */
export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  [NetworkType.MAINNET]: MAINNET_CONFIG,
  [NetworkType.TESTNET]: TESTNET_CONFIG,
  [NetworkType.LOCALNET]: LOCALNET_CONFIG,
};

// ============================
// CONNECTION OPTIONS
// ============================

/**
 * ConnectionOptions for blockchain connection
 */
export interface ConnectionOptions {
  /** Network configuration */
  network: NetworkConfig;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts for failed requests */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Custom headers for HTTP requests */
  headers?: Record<string, string>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default connection options
 */
export const DEFAULT_CONNECTION_OPTIONS: Partial<ConnectionOptions> = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  debug: false,
};

// ============================
// QUERY OPTIONS
// ============================

/**
 * QueryOptions for blockchain queries
 */
export interface QueryOptions {
  /** Block height to query (undefined = latest) */
  height?: number;
  /** Whether to prove the query result */
  prove?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * PaginationOptions for paginated queries
 */
export interface PaginationOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Offset (alternative to page) */
  offset?: number;
  /** Count total items */
  countTotal?: boolean;
  /** Reverse order */
  reverse?: boolean;
}

// ============================
// TRANSACTION OPTIONS
// ============================

/**
 * TransactionOptions for broadcasting transactions
 */
export interface TransactionOptions {
  /** Gas limit */
  gas?: string;
  /** Gas price */
  gasPrice?: GasPrice;
  /** Fee amount */
  fee?: {
    amount: string;
    denom: string;
  };
  /** Memo text */
  memo?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Broadcast mode (sync, async, block) */
  broadcastMode?: BroadcastMode;
}

/**
 * BroadcastMode for transaction broadcasting
 */
export enum BroadcastMode {
  /** Return immediately after CheckTx */
  SYNC = 'sync',
  /** Return immediately without CheckTx */
  ASYNC = 'async',
  /** Wait for transaction to be included in a block */
  BLOCK = 'block',
}

// ============================
// SERVICE ENDPOINTS
// ============================

/**
 * ServiceEndpoints for specific module queries
 */
export interface ServiceEndpoints {
  /** VC Registry module endpoints */
  vcRegistry: {
    /** Get VC by ID */
    getVC: string;
    /** List user VCs */
    listUserVCs: string;
    /** Check VC status */
    checkVCStatus: string;
    /** Batch VC status */
    batchVCStatus: string;
    /** Verify presentation */
    verifyPresentation: string;
    /** Get revocation list */
    getRevocationList: string;
    /** Check revocation */
    checkRevocation: string;
    /** Resolve DID */
    resolveDID: string;
    /** Get DID by address */
    getDIDByAddress: string;
    /** Get attribute VC */
    getAttributeVC: string;
    /** List attribute VCs */
    listAttributeVCs: string;
    /** Get disclosure policy */
    getDisclosurePolicy: string;
  };
  /** Identity module endpoints */
  identity: {
    /** Get identity by DID */
    getIdentity: string;
    /** Get identity by address */
    getIdentityByAddress: string;
    /** List identities */
    listIdentities: string;
  };
}

/**
 * Build service endpoints for a given network configuration
 */
export function buildServiceEndpoints(config: NetworkConfig): ServiceEndpoints {
  const restBase = config.endpoints.rest;

  return {
    vcRegistry: {
      getVC: `${restBase}/aura/vcregistry/v1beta1/vc/{vcId}`,
      listUserVCs: `${restBase}/aura/vcregistry/v1beta1/vcs/{holderAddress}`,
      checkVCStatus: `${restBase}/aura/vcregistry/v1beta1/vc/{vcId}/status`,
      batchVCStatus: `${restBase}/aura/vcregistry/v1beta1/vcs/batch-status`,
      verifyPresentation: `${restBase}/aura/vcregistry/v1beta1/presentation/verify`,
      getRevocationList: `${restBase}/aura/vcregistry/v1beta1/revocation-list`,
      checkRevocation: `${restBase}/aura/vcregistry/v1beta1/vc/{vcId}/revocation`,
      resolveDID: `${restBase}/aura/vcregistry/v1beta1/did/{did}`,
      getDIDByAddress: `${restBase}/aura/vcregistry/v1beta1/did/address/{address}`,
      getAttributeVC: `${restBase}/aura/vcregistry/v1beta1/attribute-vc/{attributeVcId}`,
      listAttributeVCs: `${restBase}/aura/vcregistry/v1beta1/attribute-vcs/{holderAddress}`,
      getDisclosurePolicy: `${restBase}/aura/vcregistry/v1beta1/disclosure-policy/{holderAddress}`,
    },
    identity: {
      getIdentity: `${restBase}/aura/identity/v1beta1/identity/{did}`,
      getIdentityByAddress: `${restBase}/aura/identity/v1beta1/identity/address/{address}`,
      listIdentities: `${restBase}/aura/identity/v1beta1/identities`,
    },
  };
}

// ============================
// NETWORK UTILITIES
// ============================

/**
 * Get network configuration by type
 */
export function getNetworkConfig(network: NetworkType): NetworkConfig {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Unknown network type: ${network}`);
  }
  return config;
}

/**
 * Get network configuration by chain ID
 */
export function getNetworkConfigByChainId(chainId: string): NetworkConfig | undefined {
  return Object.values(NETWORK_CONFIGS).find((config) => config.chainId === chainId);
}

/**
 * Validate network configuration
 */
export function validateNetworkConfig(config: NetworkConfig): boolean {
  return !!(
    config.network &&
    config.chainId &&
    config.endpoints?.grpc &&
    config.endpoints?.rest &&
    config.endpoints?.rpc &&
    config.addressPrefix &&
    config.didPrefix &&
    config.didNetwork
  );
}

/**
 * Check if network is production
 */
export function isProductionNetwork(network: NetworkType): boolean {
  return network === NetworkType.MAINNET;
}

/**
 * Build DID from address and network
 */
export function buildDID(address: string, network: NetworkType): string {
  const config = getNetworkConfig(network);
  return `${config.didPrefix}:${config.didNetwork}:${address}`;
}

/**
 * Parse DID to extract components
 */
export interface ParsedDID {
  /** DID method (e.g., "aura") */
  method: string;
  /** Network identifier (e.g., "mainnet") */
  network: string;
  /** Address or identifier */
  identifier: string;
  /** Full DID string */
  did: string;
}

/**
 * Parse a DID string into components
 */
export function parseDID(did: string): ParsedDID | null {
  // Expected format: did:aura:mainnet:aura1abc...
  const parts = did.split(':');

  if (parts.length < 4 || parts[0] !== 'did') {
    return null;
  }

  return {
    method: parts[1],
    network: parts[2],
    identifier: parts.slice(3).join(':'),
    did,
  };
}

/**
 * Validate a DID string
 */
export function isValidDID(did: string): boolean {
  const parsed = parseDID(did);
  return parsed !== null && parsed.method === 'aura';
}

// ============================
// ERROR TYPES
// ============================

/**
 * NetworkError for network-related errors
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly network: NetworkType,
    public readonly endpoint?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * ConnectionError for connection failures
 */
export class ConnectionError extends NetworkError {
  constructor(message: string, network: NetworkType, endpoint?: string) {
    super(message, network, endpoint);
    this.name = 'ConnectionError';
  }
}

/**
 * TimeoutError for request timeouts
 */
export class TimeoutError extends NetworkError {
  constructor(
    message: string,
    network: NetworkType,
    endpoint?: string,
    public readonly timeoutMs?: number
  ) {
    super(message, network, endpoint);
    this.name = 'TimeoutError';
  }
}

// ============================
// HEALTH CHECK
// ============================

/**
 * NetworkHealth represents network health status
 */
export interface NetworkHealth {
  /** Whether the network is healthy */
  healthy: boolean;
  /** Latest block height */
  latestBlockHeight?: number;
  /** Latest block time */
  latestBlockTime?: string;
  /** Network peers count */
  peersCount?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * HealthCheckOptions for network health checks
 */
export interface HealthCheckOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Check all endpoints */
  checkAllEndpoints?: boolean;
}
