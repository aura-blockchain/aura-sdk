/**
 * Hook to initialize and manage Aura Verifier instance
 */

import { useState, useEffect, useRef } from 'react';
import { AuraVerifier } from '@aura-network/verifier-sdk';
import type { AuraVerifierConfig } from '@aura-network/verifier-sdk';

export interface UseAuraVerifierResult {
  /** Verifier instance */
  verifier: AuraVerifier | null;
  /** Whether verifier is initialized */
  isInitialized: boolean;
  /** Initialization error */
  error: Error | null;
  /** Reinitialize with new config */
  reinitialize: (newConfig: AuraVerifierConfig) => void;
}

/**
 * Hook to initialize and manage AuraVerifier instance
 *
 * @param config - Verifier configuration
 * @returns Verifier instance and state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { verifier, isInitialized, error } = useAuraVerifier({
 *     network: 'mainnet',
 *     timeout: 10000,
 *   });
 *
 *   if (!isInitialized) {
 *     return <div>Initializing...</div>;
 *   }
 *
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 *
 *   // Use verifier...
 * }
 * ```
 */
export function useAuraVerifier(config: AuraVerifierConfig): UseAuraVerifierResult {
  const [verifier, setVerifier] = useState<AuraVerifier | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const configRef = useRef(config);
  const initRef = useRef(false);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

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
        const instance = new AuraVerifier(configRef.current);

        if (mounted) {
          setVerifier(instance);
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize verifier');

        if (mounted) {
          setError(error);
          setIsInitialized(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
      initRef.current = false;
    };
  }, []);

  // Reinitialize function
  const reinitialize = (newConfig: AuraVerifierConfig) => {
    setIsInitialized(false);
    setError(null);

    try {
      const instance = new AuraVerifier(newConfig);
      setVerifier(instance);
      setIsInitialized(true);
      configRef.current = newConfig;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reinitialize verifier');
      setError(error);
      setIsInitialized(false);
    }
  };

  return {
    verifier,
    isInitialized,
    error,
    reinitialize,
  };
}
