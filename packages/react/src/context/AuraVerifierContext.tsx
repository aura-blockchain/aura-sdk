/**
 * React Context for Aura Verifier SDK
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AuraVerifier } from '@aura-network/verifier-sdk';
import type { AuraVerifierConfig } from '@aura-network/verifier-sdk';
import type { AuraVerifierProviderProps } from '../types/index.js';

/**
 * Context value interface
 */
export interface AuraVerifierContextValue {
  /** Verifier instance */
  verifier: AuraVerifier | null;
  /** Configuration */
  config: AuraVerifierConfig;
  /** Whether verifier is initialized */
  isInitialized: boolean;
  /** Initialization error */
  initError: Error | null;
  /** Offline mode state */
  isOffline: boolean;
  /** Set offline mode */
  setOffline: (offline: boolean) => void;
}

/**
 * Create context
 */
const AuraVerifierContext = createContext<AuraVerifierContextValue | undefined>(undefined);

/**
 * Provider component
 */
export function AuraVerifierProvider({
  config,
  children,
  onError,
}: AuraVerifierProviderProps): JSX.Element {
  const [verifier, setVerifier] = useState<AuraVerifier | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [isOffline, setIsOfflineState] = useState(config.offlineMode ?? false);
  const initRef = useRef(false);

  // Initialize verifier
  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    let mounted = true;

    async function initialize() {
      try {
        const instance = new AuraVerifier(config);

        if (mounted) {
          setVerifier(instance);
          setIsInitialized(true);
          setInitError(null);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to initialize verifier');

        if (mounted) {
          setInitError(err);
          setIsInitialized(false);

          if (onError) {
            onError(err);
          }
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
      // Cleanup if needed
      if (verifier) {
        // Add cleanup logic if verifier has dispose method
      }
    };
  }, [config, onError]);

  // Handle offline mode changes
  const setOffline = useCallback((offline: boolean) => {
    setIsOfflineState(offline);
    if (verifier) {
      // Update verifier offline mode if it has a method for it
      // This would depend on the core SDK implementation
    }
  }, [verifier]);

  const contextValue: AuraVerifierContextValue = {
    verifier,
    config,
    isInitialized,
    initError,
    isOffline,
    setOffline,
  };

  return (
    <AuraVerifierContext.Provider value={contextValue}>
      {children}
    </AuraVerifierContext.Provider>
  );
}

/**
 * Hook to use the Aura Verifier context
 */
export function useAuraVerifierContext(): AuraVerifierContextValue {
  const context = useContext(AuraVerifierContext);

  if (context === undefined) {
    throw new Error('useAuraVerifierContext must be used within an AuraVerifierProvider');
  }

  return context;
}
