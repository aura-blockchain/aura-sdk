import { useEffect, useMemo, useState } from 'react';
import { useAuraClient } from './useAuraClient';
import { Balance } from '../types';

interface Options {
  denom?: string;
  formatDecimals?: number;
  pollInterval?: number;
}

export function useBalance(address: string, options?: Options) {
  const { client, isConnected } = useAuraClient();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalances = async () => {
    if (!client || !isConnected || !address) return;
    setLoading(true);
    try {
      const all = await client.queryBalance(address);
      setBalances(all);
      if (options?.denom) {
        const denomBal = await client.queryBalanceByDenom(address, options.denom);
        setBalance(denomBal);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    if (options?.pollInterval && options.pollInterval > 0) {
      const id = setInterval(fetchBalances, options.pollInterval);
      return () => clearInterval(id);
    }
  }, [client, isConnected, address, options?.denom, options?.pollInterval]);

  const formattedBalance = useMemo(() => {
    if (options?.formatDecimals === undefined) return undefined;
    const source = balance ?? balances[0];
    if (!source) return undefined;
    const amt = Number(source.amount) / 10 ** options.formatDecimals;
    return amt.toFixed(options.formatDecimals);
  }, [balance, balances, options?.formatDecimals]);

  return {
    balances,
    balance,
    formattedBalance,
    isLoading,
    error,
    refresh: fetchBalances,
  };
}
