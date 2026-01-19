import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useCredentialStatus } from '../useCredentialStatus';
import { AuraVerifierProvider } from '../../context/AuraVerifierContext';

vi.useFakeTimers();

vi.mock('@aura-network/verifier-sdk', () => {
  class MockVerifier {
    getVCStatus = vi.fn().mockResolvedValue({ status: 'valid' });
  }
  return { AuraVerifier: MockVerifier };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraVerifierProvider config={{ network: 'testnet', grpcEndpoint: 'grpc', restEndpoint: 'rest' } as any}>
    {children}
  </AuraVerifierProvider>
);

describe('useCredentialStatus', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.runOnlyPendingTimers());

  it('returns null status when vcId missing', async () => {
    const { result } = renderHook(() => useCredentialStatus(null), { wrapper });
    expect(result.current.status).toBeNull();
  });

  it('fetches status and updates lastUpdated', async () => {
    const { result } = renderHook(() => useCredentialStatus('vc:aura:1', { autoRefresh: false }), { wrapper });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('valid');
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('auto-refreshes on interval', async () => {
    const { result } = renderHook(() => useCredentialStatus('vc:aura:2', { refreshInterval: 1000 }), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });
});
