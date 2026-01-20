import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVerification } from '../useVerification';
import { AuraProvider } from '../../providers/AuraProvider';
import { NetworkType } from '../../types';
import * as clientHook from '../useAuraClient';

const mockPresentationRequest = {
  id: 'pr:123',
  verifier: 'did:aura:verifier789',
  requestedCredentials: [
    {
      type: 'UniversityDegreeCredential',
      required: true,
      constraints: { fields: ['degree.type'] },
    },
  ],
  challenge: 'abc123',
  domain: 'https://verifier.example.com',
};

const mockPresentation = { holder: 'did:aura:holder456' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraProvider network={NetworkType.TESTNET}>{children}</AuraProvider>
);

describe('useVerification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(clientHook, 'useAuraClient').mockReturnValue({
      client: {
        createPresentation: vi.fn().mockResolvedValue(mockPresentation),
        submitPresentation: vi.fn().mockResolvedValue({ accepted: true }),
        verifyPresentation: vi.fn().mockResolvedValue({ verified: true }),
      },
      isConnected: true,
    } as any);
  });

  it('should create presentation from credentials', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    act(() => {
      result.current.createPresentation(['vc:aura:123'], mockPresentationRequest);
    });

    await waitFor(() => {
      expect(result.current.presentation).toBeDefined();
    });
  });

  it('should submit presentation to verifier', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    act(() => {
      result.current.createPresentation(['vc:aura:123'], mockPresentationRequest);
    });

    await waitFor(() => expect(result.current.presentation).toBeDefined());

    act(() => {
      result.current.submitPresentation();
    });

    await waitFor(() => {
      expect(result.current.submissionResult?.accepted).toBe(true);
    });
  });

  it('should verify presentation locally', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    act(() => {
      result.current.verifyPresentation(mockPresentation);
    });

    await waitFor(() => {
      expect(result.current.verificationResult?.verified).toBe(true);
    });
  });

  it('should handle verification errors', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({
      client: {
        createPresentation: vi.fn().mockResolvedValue(mockPresentation),
        submitPresentation: vi.fn().mockRejectedValue(new Error('Verifier unreachable')),
        verifyPresentation: vi.fn().mockResolvedValue({ verified: true }),
      },
      isConnected: true,
    } as any);

    const { result } = renderHook(() => useVerification(), { wrapper });

    act(() => {
      result.current.createPresentation(['vc:aura:123'], mockPresentationRequest);
    });

    await waitFor(() => expect(result.current.presentation).toBeDefined());

    act(() => {
      result.current.submitPresentation();
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Verifier unreachable');
    });
  });

  it('should parse verification request JSON and set pending request', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });
    const payload = JSON.stringify(mockPresentationRequest);

    act(() => result.current.parseVerificationRequest(payload));

    expect(result.current.pendingRequest?.id).toBe('pr:123');
    expect(result.current.error).toBeNull();
  });

  it('should return early when client is missing', async () => {
    (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({
      client: null,
      isConnected: false,
    } as any);
    const { result } = renderHook(() => useVerification(), { wrapper });

    await act(async () => {
      await result.current.createPresentation(['vc'], mockPresentationRequest);
      await result.current.submitPresentation();
      await result.current.verifyPresentation({});
    });

    expect(result.current.presentation).toBeNull();
    expect(result.current.submissionResult).toBeNull();
    expect(result.current.verificationResult).toBeNull();
  });

  it('should compute availability check entries', () => {
    const { result } = renderHook(() => useVerification(), { wrapper });
    act(() => result.current.checkCredentialAvailability(mockPresentationRequest));
    expect(result.current.availabilityCheck?.availability).toHaveLength(1);
    expect(result.current.availabilityCheck?.availability[0].available).toBe(true);
  });

  it('should reject invalid verification request payloads', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    act(() => {
      result.current.parseVerificationRequest('not-json');
    });

    expect(result.current.error).toBeDefined();
  });

  it('should reset state', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    act(() => {
      result.current.createPresentation(['vc:aura:123'], mockPresentationRequest);
    });
    await waitFor(() => expect(result.current.presentation).toBeDefined());

    act(() => result.current.reset());

    expect(result.current.presentation).toBeNull();
    expect(result.current.pendingRequest).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

it('should create selective presentation', async () => {
  const { result } = renderHook(() => useVerification(), { wrapper });
  act(() => {
    result.current.createSelectivePresentation(
      [{ credentialId: 'vc:aura:sel', disclosedFields: ['degree.type'] }],
      mockPresentationRequest
    );
  });
  await waitFor(() => expect(result.current.presentation).toBeDefined());
});

it('sets error when createPresentation fails', async () => {
  (clientHook.useAuraClient as unknown as vi.Mock).mockReturnValue({
    client: {
      createPresentation: vi.fn().mockRejectedValue(new Error('boom')),
      submitPresentation: vi.fn(),
      verifyPresentation: vi.fn(),
    },
    isConnected: true,
  } as any);
  const { result } = renderHook(() => useVerification(), { wrapper });
  await act(async () => {
    await result.current.createPresentation(['vc'], mockPresentationRequest);
  });
  expect(result.current.error?.message).toBe('boom');
});
