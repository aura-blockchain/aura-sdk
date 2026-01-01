/**
 * Aura Client - Main gRPC/REST Client for Aura Blockchain
 *
 * Provides high-level interface for communicating with Aura blockchain nodes.
 */

import {
  NetworkError,
  NodeUnavailableError,
  ConfigurationError,
} from './errors.js';
import {
  VerificationResult,
  VCStatusResponse,
  VCRecord,
  DIDDocument,
  NetworkInfo,
  ConnectionStatus,
  RetryConfig,
} from './types.js';
import {
  AURA_NETWORKS,
  getNetworkConfig,
  isValidNetwork,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CONNECT_TIMEOUT,
  validateTLSEndpoint,
  validateGRPCEndpoint,
} from './endpoints.js';
import {
  QueryExecutor,
  VCRegistryQueries,
  IdentityQueries,
  HealthQueries,
} from './queries.js';

/**
 * Aura client configuration
 */
export interface AuraClientConfig {
  /** Network to connect to */
  network: 'mainnet' | 'testnet' | 'local';
  /** Custom gRPC endpoint (overrides network default) */
  grpcEndpoint?: string;
  /** Custom REST endpoint (overrides network default) */
  restEndpoint?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
  /** Auto-connect on instantiation (default: false) */
  autoConnect?: boolean;
  /**
   * Security: Allow insecure connections for local development
   * Only applies when network is 'local' or using localhost endpoints.
   * Default: false (TLS required for all non-localhost connections)
   */
  allowInsecureLocal?: boolean;
}

/**
 * Main Aura blockchain client
 */
export class AuraClient {
  private readonly network: 'mainnet' | 'testnet' | 'local';
  private readonly grpcEndpoint: string;
  private readonly restEndpoint: string;
  private readonly timeout: number;
  private readonly connectTimeout: number;
  private readonly retryConfig: RetryConfig;
  private readonly autoConnect: boolean;

  private queryExecutor: QueryExecutor | null = null;
  private vcRegistryQueries: VCRegistryQueries | null = null;
  private identityQueries: IdentityQueries | null = null;
  private healthQueries: HealthQueries | null = null;

  private connected: boolean = false;
  private lastConnected?: number;
  private lastError?: string;

  constructor(config: AuraClientConfig) {
    // Validate network
    if (!isValidNetwork(config.network)) {
      throw ConfigurationError.invalidValue(
        'network',
        `Must be one of: mainnet, testnet, local`
      );
    }

    this.network = config.network;

    // Get network defaults
    const networkConfig = getNetworkConfig(config.network);

    // Set endpoints (custom or default)
    this.grpcEndpoint = config.grpcEndpoint ?? networkConfig.grpc;
    this.restEndpoint = config.restEndpoint ?? networkConfig.rest;

    // Security: Validate TLS for non-local networks
    const allowInsecure = config.allowInsecureLocal ?? false;
    this.validateEndpointSecurity(allowInsecure);

    // Set timeouts
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.connectTimeout = config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT;

    // Validate timeout values
    if (this.timeout <= 0) {
      throw ConfigurationError.invalidValue('timeout', 'Must be greater than 0');
    }
    if (this.connectTimeout <= 0) {
      throw ConfigurationError.invalidValue('connectTimeout', 'Must be greater than 0');
    }

    // Merge retry config with defaults
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config.retryConfig,
    };

    this.autoConnect = config.autoConnect ?? false;

    // Auto-connect if requested
    if (this.autoConnect) {
      // Don't await - let connection happen in background
      this.connect().catch((error) => {
        this.lastError = error instanceof Error ? error.message : 'Unknown error';
      });
    }
  }

  /**
   * Security: Validate TLS requirements for endpoints
   * @throws ConfigurationError if TLS validation fails
   */
  private validateEndpointSecurity(allowInsecureLocal: boolean): void {
    try {
      // Validate REST endpoint (HTTPS required for non-local)
      validateTLSEndpoint(
        this.restEndpoint,
        this.network === 'local' && allowInsecureLocal
      );

      // Validate gRPC endpoint (grpcs:// required for non-local)
      validateGRPCEndpoint(
        this.grpcEndpoint,
        this.network,
        allowInsecureLocal
      );
    } catch (error) {
      throw ConfigurationError.invalidValue(
        'endpoint',
        error instanceof Error ? error.message : 'TLS validation failed'
      );
    }
  }

  /**
   * Connect to Aura network
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return; // Already connected
    }

    try {
      // Initialize query executor
      this.queryExecutor = new QueryExecutor(
        this.restEndpoint,
        this.timeout,
        this.retryConfig
      );

      // Initialize query modules
      this.vcRegistryQueries = new VCRegistryQueries(this.queryExecutor);
      this.identityQueries = new IdentityQueries(this.queryExecutor);
      this.healthQueries = new HealthQueries(this.queryExecutor);

      // Verify connectivity with timeout
      const healthCheck = await this.executeWithTimeout(
        this.healthQueries.checkHealth(),
        this.connectTimeout,
        'Health check'
      );

      if (!healthCheck) {
        throw new NodeUnavailableError(this.restEndpoint);
      }

      // Mark as connected
      this.connected = true;
      this.lastConnected = Date.now();
      this.lastError = undefined;
    } catch (error) {
      this.connected = false;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof NodeUnavailableError) {
        throw error;
      }

      throw new NodeUnavailableError(
        this.restEndpoint,
        [this.restEndpoint],
        error
      );
    }
  }

  /**
   * Disconnect from Aura network
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.queryExecutor = null;
    this.vcRegistryQueries = null;
    this.identityQueries = null;
    this.healthQueries = null;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.connected,
      network: this.network,
      endpoint: this.restEndpoint,
      last_connected: this.lastConnected,
      last_error: this.lastError,
    };
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkInfo {
    const config = getNetworkConfig(this.network);
    return {
      network: this.network,
      chain_id: config.chainId,
      grpc_endpoint: this.grpcEndpoint,
      rest_endpoint: this.restEndpoint,
      connected: this.connected,
    };
  }

  /**
   * Verify a presentation from QR code data
   */
  async verifyPresentation(
    qrCodeData: string,
    verifierAddress?: string
  ): Promise<VerificationResult> {
    this.ensureConnected();
    return this.vcRegistryQueries!.verifyPresentation(qrCodeData, verifierAddress);
  }

  /**
   * Check VC status
   */
  async checkVCStatus(vcId: string): Promise<VCStatusResponse> {
    this.ensureConnected();
    return this.vcRegistryQueries!.checkVCStatus(vcId);
  }

  /**
   * Batch check VC status for multiple VCs
   */
  async batchCheckVCStatus(vcIds: string[]): Promise<Map<string, VCStatusResponse>> {
    this.ensureConnected();

    if (vcIds.length === 0) {
      return new Map();
    }

    return this.vcRegistryQueries!.batchCheckVCStatus(vcIds);
  }

  /**
   * Resolve DID document
   */
  async resolveDID(did: string): Promise<DIDDocument> {
    this.ensureConnected();
    return this.identityQueries!.resolveDID(did);
  }

  /**
   * Get VC record by ID
   */
  async getVC(vcId: string): Promise<VCRecord | null> {
    this.ensureConnected();
    return this.vcRegistryQueries!.getVC(vcId);
  }

  /**
   * Check node health
   */
  async checkHealth(): Promise<boolean> {
    this.ensureConnected();
    return this.healthQueries!.checkHealth();
  }

  /**
   * Get node info
   */
  async getNodeInfo(): Promise<unknown> {
    this.ensureConnected();
    return this.healthQueries!.getNodeInfo();
  }

  /**
   * Ensure client is connected, throw if not
   */
  private ensureConnected(): void {
    if (!this.connected || !this.queryExecutor) {
      throw new NetworkError(
        'Client is not connected. Call connect() first.',
        'NOT_CONNECTED'
      );
    }
  }

  /**
   * Execute promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Create Aura client with default configuration
 */
export function createAuraClient(
  network: 'mainnet' | 'testnet' | 'local',
  options?: Partial<Omit<AuraClientConfig, 'network'>>
): AuraClient {
  return new AuraClient({
    network,
    ...options,
  });
}

/**
 * Create and connect Aura client
 */
export async function connectAuraClient(
  network: 'mainnet' | 'testnet' | 'local',
  options?: Partial<Omit<AuraClientConfig, 'network'>>
): Promise<AuraClient> {
  const client = createAuraClient(network, options);
  await client.connect();
  return client;
}
