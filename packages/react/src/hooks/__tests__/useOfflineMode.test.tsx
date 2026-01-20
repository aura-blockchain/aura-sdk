import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useOfflineMode } from '../useOfflineMode';
import { AuraVerifierProvider } from '../../context/AuraVerifierContext';

vi.mock('@aura-network/verifier-sdk', () => {
  class MockVerifier {
    sync = vi.fn().mockResolvedValue(true);
    getCacheStats = vi.fn().mockResolvedValue({ itemCount: 2, lastSync: new Date().toISOString() });
  }
  return { AuraVerifier: MockVerifier };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraVerifierProvider
    config={
      { network: 'testnet', grpcEndpoint: 'grpc', restEndpoint: 'rest', offlineMode: false } as any
    }
  >
    {children}
  </AuraVerifierProvider>
);

describe('useOfflineMode', () => {
  it('toggles offline state', async () => {
    const { result } = renderHook(() => useOfflineMode(), { wrapper });

    act(() => result.current.toggleOffline());
    expect(result.current.isOffline).toBe(true);

    act(() => result.current.setOffline(false));
    expect(result.current.isOffline).toBe(false);
  });

  it('syncs and updates cache state', async () => {
    const { result } = renderHook(() => useOfflineMode(), { wrapper });

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.syncing).toBe(false);
    expect(result.current.hasCachedData).toBe(true);
    expect(result.current.lastSync).toBeInstanceOf(Date);
  });
});
