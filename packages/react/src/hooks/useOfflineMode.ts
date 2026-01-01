/**
 * Hook for managing offline verification mode
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuraVerifierContext } from '../context/AuraVerifierContext.js';
import type { OfflineModeState } from '../types/index.js';

/**
 * Hook for managing offline verification mode
 *
 * @returns Offline mode state and controls
 *
 * @example
 * ```tsx
 * function OfflineToggle() {
 *   const {
 *     isOffline,
 *     toggleOffline,
 *     hasCachedData,
 *     lastSync,
 *     sync,
 *     syncing,
 *   } = useOfflineMode();
 *
 *   return (
 *     <div>
 *       <button onClick={toggleOffline}>
 *         {isOffline ? 'Go Online' : 'Go Offline'}
 *       </button>
 *       {hasCachedData && <span>Cached data available</span>}
 *       {lastSync && <span>Last sync: {lastSync.toLocaleString()}</span>}
 *       <button onClick={sync} disabled={syncing}>
 *         {syncing ? 'Syncing...' : 'Sync Now'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOfflineMode(): OfflineModeState {
  const { isOffline, setOffline, verifier, isInitialized } = useAuraVerifierContext();
  const [hasCachedData, setHasCachedData] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  const toggleOffline = useCallback(() => {
    setOffline(!isOffline);
  }, [isOffline, setOffline]);

  const setOfflineMode = useCallback(
    (offline: boolean) => {
      setOffline(offline);
    },
    [setOffline]
  );

  const sync = useCallback(async () => {
    if (!verifier || !isInitialized) {
      return;
    }

    setSyncing(true);

    try {
      // Note: This assumes the core SDK has a sync method
      // You may need to adjust based on the actual SDK API
      const result = await verifier.sync?.();

      if (result) {
        setLastSync(new Date());
        setHasCachedData(true);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, [verifier, isInitialized]);

  // Check for cached data on mount
  useEffect(() => {
    if (!verifier || !isInitialized) {
      return;
    }

    // Note: This assumes the core SDK has a method to check cache status
    // You may need to adjust based on the actual SDK API
    const checkCache = async () => {
      try {
        const cacheStats = await verifier.getCacheStats?.();
        if (cacheStats) {
          setHasCachedData(cacheStats.itemCount > 0);
          if (cacheStats.lastSync) {
            setLastSync(new Date(cacheStats.lastSync));
          }
        }
      } catch (error) {
        console.error('Failed to check cache:', error);
      }
    };

    checkCache();
  }, [verifier, isInitialized]);

  return {
    isOffline,
    toggleOffline,
    setOffline: setOfflineMode,
    hasCachedData,
    lastSync,
    sync,
    syncing,
  };
}
