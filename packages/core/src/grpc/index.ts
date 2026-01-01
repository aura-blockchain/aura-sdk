/**
 * Aura gRPC/REST Client Module
 *
 * Main exports for the Aura blockchain client module.
 */

// Client exports
export {
  AuraClient,
  createAuraClient,
  connectAuraClient,
} from './client.js';
export type { AuraClientConfig } from './client.js';

// Query executor and modules
export {
  QueryExecutor,
  VCRegistryQueries,
  IdentityQueries,
  HealthQueries,
} from './queries.js';

// Network configuration
export {
  AURA_NETWORKS,
  API_PATHS,
  getNetworkConfig,
  isValidNetwork,
  buildEndpointURL,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TIMEOUT,
  DEFAULT_CONNECT_TIMEOUT,
  BATCH_LIMITS,
} from './endpoints.js';
export type { NetworkConfig } from './endpoints.js';

// Type definitions
export type {
  DIDDocument,
  VerificationMethod,
  ServiceEndpoint,
  VerifiableCredential,
  Proof,
  VCRecord,
  VCStatusResponse,
  VerificationResult,
  VerifiedCredential,
  DIDResolutionResponse,
  BatchVCStatusResponse,
  APIErrorResponse,
  APIResponse,
  VerifyPresentationRequest,
  NetworkInfo,
  ConnectionStatus,
  RetryConfig,
} from './types.js';

// Error classes
export {
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  VerificationError,
  RetryExhaustedError,
  ConfigurationError,
} from './errors.js';
