import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useVerification } from '../useVerification';
import { AuraVerifierProvider } from '../../context/AuraVerifierContext';

const mockVerify = vi.fn();
const mockReset = vi.fn();

vi.mock('@aura-network/verifier-sdk', () => {
  class MockVerifier {
    verify = mockVerify;
    reset = mockReset;
  }
  return { AuraVerifier: MockVerifier };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraVerifierProvider config={{ network: 'testnet', grpcEndpoint: 'grpc', restEndpoint: 'rest' } as any}>
    {children}
  </AuraVerifierProvider>
);

describe('useVerification branches', () => {
  it('handles verification errors and can reset', async () => {
    mockVerify.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useVerification(), { wrapper });

    await act(async () => {
      await result.current.verify('bad-qr');
    });

    expect(result.current.error?.message).toBe('fail');

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(mockReset).toHaveBeenCalledTimes(0); // reset is handled in hook, not sdk
  });
});
