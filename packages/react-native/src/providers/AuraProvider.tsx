import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { AuraClient } from '../client/AuraClient';
import { NetworkType } from '../types';

interface AuraContextValue {
  client: AuraClient | null;
  network: NetworkType;
  isConnected: boolean;
  chainId?: string;
  switchNetwork: (network: NetworkType) => void;
}

const AuraContext = createContext<AuraContextValue | undefined>(undefined);

interface AuraProviderProps {
  children: React.ReactNode;
  network?: NetworkType;
  rpcEndpoint?: string;
}

export const AuraProvider: React.FC<AuraProviderProps> = ({ children, network = NetworkType.TESTNET, rpcEndpoint }) => {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>(network);
  const [client, setClient] = useState<AuraClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const c = new AuraClient({ network: currentNetwork, endpoint: rpcEndpoint });
    setClient(c);

    const connectClient = async () => {
      try {
        await c.connect();
        if (!cancelled) {
          setConnected(true);
        }
      } catch (err) {
        if (!cancelled) {
          // Surface failed connection state without throwing unhandled rejections
          setConnected(false);
          console.warn('AuraProvider failed to connect', err);
        }
      }
    };

    void connectClient();
    return () => {
      cancelled = true;
      c.disconnect();
      setConnected(false);
    };
  }, [currentNetwork, rpcEndpoint]);

  const value = useMemo(
    () => ({
      client,
      network: currentNetwork,
      isConnected: connected,
      chainId: client?.getChainId(),
      switchNetwork: setCurrentNetwork,
    }),
    [client, currentNetwork, connected]
  );

  return <AuraContext.Provider value={value}>{children}</AuraContext.Provider>;
};

export function useAuraContext(): AuraContextValue {
  const ctx = useContext(AuraContext);
  if (!ctx) {
    throw new Error('useAuraContext must be used within AuraProvider');
  }
  return ctx;
}
