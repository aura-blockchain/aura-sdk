import { describe, expect, it } from 'vitest';

import { isQRCodeData, isVerificationResult, type VerificationResult } from '../index.js';

describe('Type guards', () => {
  describe('isQRCodeData', () => {
    const baseQRCode = {
      presentationId: 'pres-123',
      holderDid: 'did:aura:test:holder123',
      holderAddress: 'aura1holderaddress',
      vcIds: ['vc:aura:1', 'vc:aura:2'],
      createdAt: new Date().toISOString(),
      nonce: 42,
      expiresInSeconds: 300,
      signature: 'deadbeef',
      context: { purpose: 'login' },
    };

    it('accepts fully populated QR payloads', () => {
      expect(isQRCodeData(baseQRCode)).toBe(true);
    });

    it('rejects missing required fields', () => {
      expect(isQRCodeData({ ...baseQRCode, presentationId: undefined })).toBe(false);
      expect(isQRCodeData({ ...baseQRCode, vcIds: 'not-an-array' })).toBe(false);
      expect(isQRCodeData({ ...baseQRCode, nonce: '123' as unknown as number })).toBe(false);
      expect(isQRCodeData({})).toBe(false);
    });

    it('rejects non-object inputs', () => {
      expect(isQRCodeData(null)).toBe(false);
      expect(isQRCodeData(undefined)).toBe(false);
      expect(isQRCodeData('invalid')).toBe(false);
      expect(isQRCodeData(123 as unknown as Record<string, unknown>)).toBe(false);
    });
  });

  describe('isVerificationResult', () => {
    const baseResult: VerificationResult = {
      isValid: true,
      holderDid: 'did:aura:test:holder',
      verifiedAt: new Date().toISOString() as unknown as Date,
      vcDetails: [],
      attributes: {},
      auditId: 'audit-1234567890abcd',
      networkLatency: 120,
      verificationMethod: 'online',
      presentationId: 'pres-1',
      expiresAt: new Date(),
      signatureValid: true,
    } as unknown as VerificationResult;

    it('validates minimal verification result shape', () => {
      // Type guard expects string verifiedAt, so keep ISO string
      const candidate = {
        ...baseResult,
        verifiedAt: new Date().toISOString(),
      };

      expect(isVerificationResult(candidate)).toBe(true);
    });

    it('rejects malformed verification results', () => {
      expect(isVerificationResult({ ...baseResult, isValid: 'yes' })).toBe(false);
      expect(isVerificationResult({ ...baseResult, holderDid: 123 })).toBe(false);
      expect(isVerificationResult({ ...baseResult, vcDetails: 'not-an-array' })).toBe(false);
      expect(isVerificationResult({ ...baseResult, verifiedAt: 1700000000 })).toBe(false);
      expect(isVerificationResult(null)).toBe(false);
    });
  });
});
