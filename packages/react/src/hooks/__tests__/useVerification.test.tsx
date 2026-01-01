/**
 * Tests for useVerification hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVerification } from '../useVerification.js';
import { AuraVerifierProvider } from '../../context/AuraVerifierContext.js';
import type { AuraVerifierConfig } from '@aura-network/verifier-sdk';

// Mock the AuraVerifier
vi.mock('@aura-network/verifier-sdk', () => ({
  AuraVerifier: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockResolvedValue({
      isValid: true,
      holderDID: 'did:aura:test123',
      verifiedAt: new Date(),
      vcDetails: [],
      attributes: {},
      auditId: 'audit123',
      networkLatency: 100,
      verificationMethod: 'online',
      presentationId: 'pres123',
      expiresAt: new Date(),
      signatureValid: true,
    }),
  })),
  VCType: {
    PROOF_OF_HUMANITY: 'ProofOfHumanity',
  },
  VCStatus: {
    ACTIVE: 'active',
  },
}));

describe('useVerification', () => {
  const config: AuraVerifierConfig = {
    network: 'testnet',
    timeout: 10000,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuraVerifierProvider config={config}>{children}</AuraVerifierProvider>
  );

  it('should initialize with null result', () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should verify QR code successfully', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    await waitFor(() => {
      expect(result.current.verify).toBeDefined();
    });

    const qrData = 'test-qr-data';
    await result.current.verify(qrData);

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.isValid).toBe(true);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should reset verification state', async () => {
    const { result } = renderHook(() => useVerification(), { wrapper });

    await waitFor(() => {
      expect(result.current.verify).toBeDefined();
    });

    await result.current.verify('test-qr-data');

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    result.current.reset();

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
