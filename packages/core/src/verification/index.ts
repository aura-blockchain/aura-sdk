/**
 * Verification Module - Main Exports
 *
 * Exports the high-level verification API for Aura Verifier SDK.
 */

// Main verifier class
export { AuraVerifier } from './verifier.js';

// Types and interfaces
export type {
  // Configuration types
  AuraVerifierConfig,
  NetworkType,
  CacheConfig,
  NetworkEndpoints,

  // Request and result types
  VerificationRequest,
  VerificationResult,
  VCVerificationDetail,
  DiscloseableAttributes,
  VerificationStrategy,

  // Batch verification types
  BatchVerificationOptions,
  BatchVerificationResult,

  // Sync types
  SyncResult,

  // DID types
  DIDDocument,
  VerificationMethodEntry,
  ServiceEndpoint,

  // Event types
  VerifierEvent,
  EventHandler,
  VerificationEventData,
  ErrorEventData,
  SyncEventData,
  CacheUpdateEventData,
} from './types.js';

export {
  // Credential types (enums)
  VCType,
  VCStatus,

  // Error types (classes)
  VerificationError,
  VerificationErrorCode,

  // Constants
  NETWORK_ENDPOINTS,
} from './types.js';

// Event emitter
export {
  VerificationEventEmitter,
  createVerificationEvent,
  createErrorEvent,
  createSyncEvent,
  createCacheUpdateEvent,
} from './events.js';

// Result utilities
export {
  generateAuditId,
  extractAttributes,
  formatVerificationResult,
  serializeVerificationResult,
  createFailedResult,
  createQuickErrorResult,
  createSuccessResult,
  hasRequiredVCTypes,
  calculateVerificationScore,
  isTrustedIdentity,
  getVerificationSummary,
} from './result.js';

// Batch verification
export {
  BatchVerifier,
  getSuccessfulResults,
  getFailedResults,
  extractErrors,
  groupResultsByStatus,
  calculateSuccessRate,
  formatBatchResult,
  chunkArray,
  verifyLargeBatch,
} from './batch.js';
