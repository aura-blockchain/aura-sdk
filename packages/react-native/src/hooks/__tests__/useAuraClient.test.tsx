import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuraClient } from '../useAuraClient';
import { AuraProvider } from '../../providers/AuraProvider';
import { NetworkType } from '../../types';
import { AuraClient } from '../../client/AuraClient';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraProvider network={NetworkType.TESTNET}>{children}</AuraProvider>
);

describe('useAuraClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize client on mount', async () => {
    const { result } = renderHook(() => useAuraClient(), { wrapper });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.client).toBeDefined();
    expect(result.current.chainId).toBe('aura-mvp-1');
  });

  it('should handle connection errors gracefully', async () => {
    const spy = vi
      .spyOn(AuraClient.prototype, 'connect')
      .mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useAuraClient(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe('Connection failed');
    expect(result.current.isConnected).toBe(false);
    spy.mockRestore();
  });

  it('should reconnect on network change', async () => {
    const { result, rerender } = renderHook(({ network }) => useAuraClient({ network }), {
      wrapper,
      initialProps: { network: NetworkType.TESTNET },
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    rerender({ network: NetworkType.MAINNET });

    await waitFor(() => {
      expect(result.current.chainId).toBeDefined();
    });
  });

  it('should disconnect on unmount', async () => {
    const disconnectSpy = vi.spyOn(AuraClient.prototype, 'disconnect');
    const { unmount } = renderHook(() => useAuraClient(), { wrapper });
    await waitFor(() => expect(disconnectSpy).not.toHaveBeenCalled());
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});
