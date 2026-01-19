import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCredential } from '../useCredential';
import { AuraProvider } from '../../providers/AuraProvider';
import { NetworkType, CredentialStatus } from '../../types';
import * as clientHook from '../useAuraClient';

const mockCredential = {
  id: 'vc:aura:123',
  issuer: 'did:aura:issuer123',
  subject: 'did:aura:holder456',
  status: CredentialStatus.VALID,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraProvider network={NetworkType.TESTNET}>{children}</AuraProvider>
);

describe('useCredential', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(clientHook, 'useAuraClient').mockReturnValue({
      client: {
        queryCredential: vi.fn().mockResolvedValue(mockCredential),
        verifyCredential: vi.fn().mockResolvedValue({ verified: true, checks: [] }),
        getCredentialStatus: vi.fn().mockResolvedValue(CredentialStatus.VALID),
      } as any,
      isConnected: true,
    } as any);
  });

  it('should fetch credential by ID', async () => {
    const { result } = renderHook(() => useCredential('vc:aura:123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.credential).toEqual(mockCredential);
  });

  it('handles missing client gracefully', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({ client: null, isConnected: false } as any);
    const { result } = renderHook(() => useCredential('vc:aura:123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.credential).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when queryCredential throws', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({
      client: { queryCredential: vi.fn().mockRejectedValue(new Error('boom')) },
      isConnected: true,
    } as any);
    const { result } = renderHook(() => useCredential('vc:aura:123'), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toBe('boom'));
  });

  it('should verify credential on demand', async () => {
    const { result } = renderHook(() => useCredential('vc:aura:123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.verify();
    });

    await waitFor(() => {
      expect(result.current.verificationResult).toBeDefined();
    });
    expect(result.current.verificationResult?.verified).toBe(true);
  });

  it('should handle revoked credential', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({
      client: {
        queryCredential: vi.fn().mockResolvedValue({ ...mockCredential, status: CredentialStatus.REVOKED }),
        verifyCredential: vi.fn().mockResolvedValue({ verified: false, checks: [] }),
        getCredentialStatus: vi.fn().mockResolvedValue(CredentialStatus.REVOKED),
      },
      isConnected: true,
    } as any);

    const { result } = renderHook(() => useCredential('vc:aura:revoked', { checkStatus: true }), { wrapper });

    await waitFor(() => expect(result.current.status).toBe(CredentialStatus.REVOKED));
    expect(result.current.isValid).toBe(false);
  });

  it('marks expired credential invalid', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({
      client: {
        queryCredential: vi.fn().mockResolvedValue({
          ...mockCredential,
          expirationDate: new Date(Date.now() - 1000).toISOString(),
          status: CredentialStatus.EXPIRED,
        }),
        verifyCredential: vi.fn().mockResolvedValue({ verified: false, checks: [] }),
        getCredentialStatus: vi.fn().mockResolvedValue(CredentialStatus.EXPIRED),
      },
      isConnected: true,
    } as any);

    const { result } = renderHook(() => useCredential('vc:aura:expired', { checkStatus: true }), { wrapper });
    await waitFor(() => expect(result.current.status).toBe(CredentialStatus.EXPIRED));
    expect(result.current.isExpired).toBe(true);
    expect(result.current.isValid).toBe(false);
  });
});
