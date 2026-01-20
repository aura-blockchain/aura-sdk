import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerificationHistory } from '../VerificationHistory';
import type { VerificationHistoryItem } from '../../types';

const baseItem: VerificationHistoryItem = {
  id: '1',
  holderDID: 'did:aura:holder123456789',
  verificationMethod: 'online',
  timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5m ago
  result: {
    isValid: true,
    holderDID: 'did:aura:holder123456789',
    verifiedAt: new Date(),
    vcDetails: [
      {
        vcId: 'vc:aura:1',
        vcType: 'Test',
        issuerDID: 'did:aura:issuer',
        status: 'valid',
        signatureValid: true,
        onChain: true,
      },
    ],
    attributes: {},
    verificationMethod: 'online',
    auditId: 'audit-1',
    networkLatency: 42,
    presentationId: 'pres-1',
    expiresAt: new Date(Date.now() + 100000),
    signatureValid: true,
  },
};

describe('VerificationHistory', () => {
  it('renders empty state', () => {
    render(<VerificationHistory items={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText('Verification History')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders items and truncates DID', () => {
    render(<VerificationHistory items={[baseItem]} />);
    expect(screen.getByText('Verification History')).toBeInTheDocument();
    expect(screen.getByText(/did:aura:h\.\.\./)).toBeInTheDocument(); // truncated
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText(/Method: online/)).toBeInTheDocument();
    expect(screen.getByText(/VCs: 1/)).toBeInTheDocument();
  });

  it('honors maxItems and click handler', () => {
    const onClick = vi.fn();
    const items = [baseItem, { ...baseItem, id: '2' }];
    render(<VerificationHistory items={items} maxItems={1} onItemClick={onClick} />);

    // Only first item rendered
    expect(screen.queryByText(/audit-1/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Verified/));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].id).toBe('1');
  });
});
