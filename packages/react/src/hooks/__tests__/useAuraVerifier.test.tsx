import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuraVerifier } from '../useAuraVerifier';

vi.mock('@aura-network/verifier-sdk', () => {
  class MockVerifier {
    constructor(_config: any) {}
  }
  return { AuraVerifier: MockVerifier };
});

describe('useAuraVerifier', () => {
  const baseConfig = {
    network: 'testnet',
    grpcEndpoint: 'grpc://local',
    restEndpoint: 'http://local',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes verifier with config', async () => {
    const { result } = renderHook(() => useAuraVerifier(baseConfig));

    await act(async () => {});

    expect(result.current.verifier).toBeTruthy();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reinitialize replaces verifier and sets initialized', () => {
    const { result } = renderHook(() => useAuraVerifier(baseConfig));

    act(() => {
      result.current.reinitialize({ ...baseConfig, network: 'devnet' });
    });

    expect(result.current.verifier).toBeTruthy();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
