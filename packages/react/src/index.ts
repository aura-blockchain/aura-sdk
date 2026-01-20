/**
 * Aura Verifier SDK - React Integration
 *
 * React hooks and components for integrating Aura Network credential verification
 * into React applications.
 *
 * @packageDocumentation
 *
 * @example
 * ```tsx
 * import {
 *   AuraVerifierProvider,
 *   useVerification,
 *   VerificationBadge,
 * } from '@aura-network/verifier-sdk-react';
 *
 * function App() {
 *   return (
 *     <AuraVerifierProvider config={{ network: 'mainnet' }}>
 *       <VerifyComponent />
 *     </AuraVerifierProvider>
 *   );
 * }
 *
 * function VerifyComponent() {
 *   const { result, loading, verify } = useVerification();
 *
 *   return (
 *     <div>
 *       <button onClick={() => verify(qrData)}>Verify</button>
 *       {loading && <div>Loading...</div>}
 *       <VerificationBadge result={result} />
 *     </div>
 *   );
 * }
 * ```
 */

// ============================================================================
// Context and Provider
// ============================================================================

export { AuraVerifierProvider, useAuraVerifierContext } from './context/AuraVerifierContext.js';

export type { AuraVerifierContextValue } from './context/AuraVerifierContext.js';

// ============================================================================
// Hooks
// ============================================================================

export {
  useAuraVerifier,
  useVerification,
  useCredentialStatus,
  useOfflineMode,
} from './hooks/index.js';

export type { UseAuraVerifierResult, UseCredentialStatusOptions } from './hooks/index.js';

// ============================================================================
// Components
// ============================================================================

export {
  VerificationBadge,
  AgeBadge,
  AuraScoreBadge,
  QRScanner,
  VerificationHistory,
} from './components/index.js';

export type {
  VerificationBadgeProps,
  AgeBadgeProps,
  AuraScoreBadgeProps,
  QRScannerProps,
  VerificationHistoryProps,
} from './components/index.js';

// ============================================================================
// Types
// ============================================================================

export type {
  AuraVerifierConfig,
  VerificationRequest,
  VerificationResult,
  VCVerificationDetail,
  DiscloseableAttributes,
  NetworkType,
  CacheConfig,
  VerificationState,
  CredentialStatusState,
  OfflineModeState,
  AuraVerifierProviderProps,
  VerificationHistoryItem,
  AuraTheme,
  BadgeSize,
  BadgeVariant,
  ComponentBaseProps,
} from './types/index.js';

// ============================================================================
// Utilities
// ============================================================================

export {
  defaultTheme,
  getStatusColor,
  getVCStatusColor,
  applyOpacity,
  lighten,
  darken,
} from './utils/theme.js';

// ============================================================================
// Re-exports from core SDK
// ============================================================================

export { VCType, VCStatus, AuraVerifier } from '@aura-network/verifier-sdk';

export type { VerificationErrorCode } from '@aura-network/verifier-sdk';

// ============================================================================
// Version
// ============================================================================

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Package name
 */
export const PACKAGE_NAME = '@aura-network/verifier-sdk-react';
