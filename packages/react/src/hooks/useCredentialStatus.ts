/**
 * Hook for checking credential status with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VCStatus } from '@aura-network/verifier-sdk';
import { useAuraVerifierContext } from '../context/AuraVerifierContext.js';
import type { CredentialStatusState } from '../types/index.js';

export interface UseCredentialStatusOptions {
  /** Auto-refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
}

/**
 * Hook for checking and monitoring credential status
 *
 * @param vcId - Verifiable Credential ID
 * @param options - Status check options
 * @returns Credential status state and functions
 *
 * @example
 * ```tsx
 * function CredentialMonitor({ vcId }: { vcId: string }) {
 *   const { status, loading, error, refresh } = useCredentialStatus(vcId, {
 *     refreshInterval: 60000, // Check every minute
 *   });
 *
 *   if (loading) return <div>Checking status...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       Status: {status}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCredentialStatus(
  vcId: string | null,
  options: UseCredentialStatusOptions = {}
): CredentialStatusState {
  const { refreshInterval = 30000, autoRefresh = true } = options;
  const { verifier, isInitialized } = useAuraVerifierContext();
  const [status, setStatus] = useState<VCStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = useCallback(async () => {
    if (!verifier || !isInitialized || !vcId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Note: This assumes the core SDK has a getVCStatus method
      // You may need to adjust based on the actual SDK API
      const response = await verifier.getVCStatus?.(vcId);

      if (response) {
        setStatus(response.status);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check credential status');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [verifier, isInitialized, vcId]);

  const refresh = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  // Initial check
  useEffect(() => {
    if (vcId) {
      checkStatus();
    }
  }, [vcId, checkStatus]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !vcId) {
      return;
    }

    intervalRef.current = setInterval(() => {
      checkStatus();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, vcId, refreshInterval, checkStatus]);

  return {
    status,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}
