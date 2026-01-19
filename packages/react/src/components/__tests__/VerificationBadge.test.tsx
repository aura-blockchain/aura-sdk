import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerificationBadge } from '../VerificationBadge';
import type { VerificationResult } from '@aura-network/verifier-sdk';

const baseResult: VerificationResult = {
  isValid: true,
  holderDID: 'did:aura:holder1',
  verifiedAt: new Date('2024-01-01T00:00:00Z'),
  vcDetails: [
    {
      vcId: 'vc:aura:1',
      vcType: 'TestCredential',
      issuerDID: 'did:aura:issuer',
      status: 'valid',
      signatureValid: true,
      onChain: true,
      issuedAt: new Date('2023-01-01T00:00:00Z'),
    },
  ],
  attributes: {},
  verificationMethod: 'online',
  auditId: 'audit-123',
  networkLatency: 42,
  presentationId: 'pres-1',
  expiresAt: new Date('2025-01-01T00:00:00Z'),
  signatureValid: true,
};

describe('VerificationBadge', () => {
  it('renders pending state when result is null', () => {
    render(<VerificationBadge result={null} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('renders verified state with default props', () => {
    render(<VerificationBadge result={baseResult} />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders failed state and details when showDetails=true', () => {
    const failed: VerificationResult = { ...baseResult, isValid: false, verificationError: 'bad sig' };

    render(<VerificationBadge result={failed} showDetails />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
    expect(screen.getByText(/bad sig/)).toBeInTheDocument();
  });
});
