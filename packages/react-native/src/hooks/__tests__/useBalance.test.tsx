import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBalance } from '../useBalance';
import { AuraProvider } from '../../providers/AuraProvider';
import { NetworkType } from '../../types';
import * as clientHook from '../useAuraClient';

const mockBalances = [
  { denom: 'uaura', amount: '1000000' },
  { denom: 'stake', amount: '500000' },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraProvider network={NetworkType.TESTNET}>{children}</AuraProvider>
);

describe('useBalance', () => {
  const testAddress = 'aura1abc123def456';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(clientHook, 'useAuraClient').mockReturnValue({
      client: {
        queryBalance: vi.fn().mockResolvedValue(mockBalances),
        queryBalanceByDenom: vi
          .fn()
          .mockImplementation((addr: string, denom: string) =>
            Promise.resolve(mockBalances.find((b) => b.denom === denom))
          ),
      } as any,
      isConnected: true,
      chainId: 'aura-mvp-1',
      error: null,
    } as any);
  });

  it('should fetch balance on mount', async () => {
    const { result } = renderHook(() => useBalance(testAddress), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balances).toEqual(mockBalances);
    expect(result.current.error).toBeNull();
  });

  it('should fetch specific denom balance', async () => {
    const { result } = renderHook(() => useBalance(testAddress, { denom: 'uaura' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.balance).toEqual({ denom: 'uaura', amount: '1000000' });
  });

  it('should format balance with decimals', async () => {
    const { result } = renderHook(() => useBalance(testAddress, { formatDecimals: 6 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.formattedBalance).toBe('1.000000');
  });

  it('should refresh balance on demand', async () => {
    const { result } = renderHook(() => useBalance(testAddress), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty when client is missing', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValueOnce({
      client: null,
      isConnected: false,
    } as any);

    const { result } = renderHook(() => useBalance(testAddress), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balances).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
