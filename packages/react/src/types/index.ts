/**
 * Type definitions for React SDK
 */

import type {
  AuraVerifierConfig,
  VerificationRequest,
  VerificationResult,
  VCStatus,
  VCType,
  NetworkType,
} from '@aura-network/verifier-sdk';

/**
 * Re-export core types for convenience
 * Note: VCStatus and VCType are enums exported from the main index.ts
 */
export type {
  AuraVerifierConfig,
  VerificationRequest,
  VerificationResult,
  VCVerificationDetail,
  DiscloseableAttributes,
  NetworkType,
  CacheConfig,
} from '@aura-network/verifier-sdk';

/**
 * Verification state for hooks
 */
export interface VerificationState {
  /** Current verification result */
  result: VerificationResult | null;
  /** Loading state */
  loading: boolean;
  /** Error if verification failed */
  error: Error | null;
  /** Verify function */
  verify: (qrData: string) => Promise<void>;
  /** Reset function */
  reset: () => void;
}

/**
 * Credential status state
 */
export interface CredentialStatusState {
  /** Current status */
  status: VCStatus | null;
  /** Loading state */
  loading: boolean;
  /** Error if status check failed */
  error: Error | null;
  /** Refresh function */
  refresh: () => Promise<void>;
  /** Last updated timestamp */
  lastUpdated: Date | null;
}

/**
 * Offline mode state
 */
export interface OfflineModeState {
  /** Whether offline mode is enabled */
  isOffline: boolean;
  /** Toggle offline mode */
  toggleOffline: () => void;
  /** Set offline mode explicitly */
  setOffline: (offline: boolean) => void;
  /** Whether cached data is available */
  hasCachedData: boolean;
  /** Last sync timestamp */
  lastSync: Date | null;
  /** Sync function */
  sync: () => Promise<void>;
  /** Syncing state */
  syncing: boolean;
}

/**
 * Verifier provider props
 */
export interface AuraVerifierProviderProps {
  /** Configuration for the verifier */
  config: AuraVerifierConfig;
  /** Children components */
  children: React.ReactNode;
  /** Optional custom error handler */
  onError?: (error: Error) => void;
}

/**
 * Verification history item
 */
export interface VerificationHistoryItem {
  /** Unique ID */
  id: string;
  /** Verification result */
  result: VerificationResult;
  /** Timestamp */
  timestamp: Date;
  /** Holder DID */
  holderDID: string;
  /** Verification method used */
  verificationMethod: 'online' | 'offline' | 'cached';
}

/**
 * Theme configuration
 */
export interface AuraTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    text: {
      primary: string;
      secondary: string;
      inverse: string;
    };
    background: {
      primary: string;
      secondary: string;
      card: string;
    };
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Badge size variant
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge variant
 */
export type BadgeVariant = 'solid' | 'outline' | 'subtle';

/**
 * Component base props
 */
export interface ComponentBaseProps {
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}
