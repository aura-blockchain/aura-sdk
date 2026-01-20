import { useEffect, useState } from 'react';
import { AuraClient } from '../client/AuraClient';
import { useAuraContext } from '../providers/AuraProvider';
import { NetworkType } from '../types';

interface Options {
  network?: NetworkType;
  endpoint?: string;
}

export function useAuraClient(opts?: Options) {
  const ctx = useAuraContext();
  const [client, setClient] = useState<AuraClient | null>(ctx.client);
  const [isConnected, setConnected] = useState<boolean>(ctx.isConnected);
  const [error, setError] = useState<Error | null>(null);
  const [chainId, setChainId] = useState<string | undefined>(ctx.chainId);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const c = new AuraClient({
          network: opts?.network ?? ctx.network,
          endpoint: opts?.endpoint,
        });
        await c.connect();
        if (cancelled) return;
        setClient(c);
        setConnected(true);
        setChainId(c.getChainId());
      } catch (err) {
        if (cancelled) return;
        setError(err as Error);
        setConnected(false);
      }
    };
    init();

    return () => {
      cancelled = true;
      client?.disconnect();
    };
  }, [opts?.network, opts?.endpoint, ctx.network]);

  return {
    client,
    isConnected,
    chainId,
    error,
  };
}
