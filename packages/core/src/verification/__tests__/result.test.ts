/**
 * Tests for Verification Result Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAuditId,
  extractAttributes,
  formatVerificationResult,
  serializeVerificationResult,
  createFailedResult,
  createQuickErrorResult,
  createSuccessResult,
  hasRequiredVCTypes,
  calculateVerificationScore,
  isTrustedIdentity,
  getVerificationSummary,
} from '../result.js';
import { VCVerificationDetail, VerificationResult, DiscloseableAttributes } from '../types.js';
import { DisclosureContext } from '../../qr/types.js';

// Helper to create mock VC details
function createMockVCDetail(overrides: Partial<VCVerificationDetail> = {}): VCVerificationDetail {
  return {
    vcId: 'vc-123',
    vcType: 'IdentityCredential',
    issuerDID: 'did:aura:mainnet:issuer123',
    issuedAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-01-01'),
    status: 'active',
    signatureValid: true,
    onChain: true,
    txHash: '0x123abc',
    blockHeight: 12345,
    ...overrides,
  };
}

// Helper to create mock verification result
function createMockResult(overrides: Partial<VerificationResult> = {}): VerificationResult {
  return {
    isValid: true,
    holderDID: 'did:aura:mainnet:holder123',
    verifiedAt: new Date('2024-06-15T10:00:00Z'),
    vcDetails: [createMockVCDetail()],
    attributes: { fullName: 'John Doe' },
    auditId: 'audit-1234567890abcdef',
    networkLatency: 150,
    verificationMethod: 'online',
    presentationId: 'pres-123',
    expiresAt: new Date('2024-06-15T12:00:00Z'),
    signatureValid: true,
    ...overrides,
  };
}

describe('generateAuditId', () => {
  it('should generate consistent audit ID for same inputs', () => {
    const timestamp = new Date('2024-06-15T10:00:00Z');
    const id1 = generateAuditId('did:aura:mainnet:holder', 'pres-123', timestamp);
    const id2 = generateAuditId('did:aura:mainnet:holder', 'pres-123', timestamp);
    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different holders', () => {
    const timestamp = new Date('2024-06-15T10:00:00Z');
    const id1 = generateAuditId('did:aura:mainnet:holder1', 'pres-123', timestamp);
    const id2 = generateAuditId('did:aura:mainnet:holder2', 'pres-123', timestamp);
    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs for different presentation IDs', () => {
    const timestamp = new Date('2024-06-15T10:00:00Z');
    const id1 = generateAuditId('did:aura:mainnet:holder', 'pres-123', timestamp);
    const id2 = generateAuditId('did:aura:mainnet:holder', 'pres-456', timestamp);
    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs for different timestamps', () => {
    const id1 = generateAuditId('did:aura:mainnet:holder', 'pres-123', new Date('2024-06-15T10:00:00Z'));
    const id2 = generateAuditId('did:aura:mainnet:holder', 'pres-123', new Date('2024-06-15T11:00:00Z'));
    expect(id1).not.toBe(id2);
  });

  it('should start with audit- prefix', () => {
    const id = generateAuditId('did:aura:mainnet:holder', 'pres-123', new Date());
    expect(id).toMatch(/^audit-[a-f0-9]{16}$/);
  });

  it('should be 22 characters (audit- + 16 hex chars)', () => {
    const id = generateAuditId('did:aura:mainnet:holder', 'pres-123', new Date());
    expect(id.length).toBe(22);
  });
});

describe('extractAttributes', () => {
  it('should extract age over 21 attribute', () => {
    const context: DisclosureContext = { show_age_over_21: true };
    const attrs = extractAttributes(context, []);
    expect(attrs.ageOver21).toBe(true);
  });

  it('should extract age over 18 attribute', () => {
    const context: DisclosureContext = { show_age_over_18: true };
    const attrs = extractAttributes(context, []);
    expect(attrs.ageOver18).toBe(true);
  });

  it('should extract full name attribute', () => {
    const context: DisclosureContext = { show_full_name: 'John Doe' };
    const attrs = extractAttributes(context, []);
    expect(attrs.fullName).toBe('John Doe');
  });

  it('should extract age attribute', () => {
    const context: DisclosureContext = { show_age: 25 };
    const attrs = extractAttributes(context, []);
    expect(attrs.age).toBe(25);
  });

  it('should convert string age to number', () => {
    const context: DisclosureContext = { show_age: '30' as unknown as number };
    const attrs = extractAttributes(context, []);
    expect(attrs.age).toBe(30);
  });

  it('should extract city and state', () => {
    const context: DisclosureContext = { show_city_state: 'Los Angeles, CA' };
    const attrs = extractAttributes(context, []);
    expect(attrs.cityState).toBe('Los Angeles, CA');
  });

  it('should extract full address', () => {
    const context: DisclosureContext = { show_full_address: '123 Main St, LA, CA 90210' };
    const attrs = extractAttributes(context, []);
    expect(attrs.fullAddress).toBe('123 Main St, LA, CA 90210');
  });

  it('should extract custom attributes', () => {
    const context: DisclosureContext = {
      custom_field_1: 'value1',
      custom_field_2: 123,
    } as DisclosureContext;
    const attrs = extractAttributes(context, []);
    expect(attrs.customAttributes).toEqual({
      custom_field_1: 'value1',
      custom_field_2: 123,
    });
  });

  it('should handle multiple standard attributes', () => {
    const context: DisclosureContext = {
      show_full_name: 'Jane Doe',
      show_age: 28,
      show_age_over_21: true,
      show_city_state: 'New York, NY',
    };
    const attrs = extractAttributes(context, []);
    expect(attrs.fullName).toBe('Jane Doe');
    expect(attrs.age).toBe(28);
    expect(attrs.ageOver21).toBe(true);
    expect(attrs.cityState).toBe('New York, NY');
  });

  it('should return empty object for empty context', () => {
    const context: DisclosureContext = {};
    const attrs = extractAttributes(context, []);
    expect(attrs).toEqual({});
  });

  it('should not include undefined custom attributes', () => {
    const context: DisclosureContext = {
      show_full_name: 'John',
      undefined_custom: undefined,
    } as DisclosureContext;
    const attrs = extractAttributes(context, []);
    expect(attrs.customAttributes).toBeUndefined();
  });

  it('should handle mixed standard and custom attributes', () => {
    const context: DisclosureContext = {
      show_full_name: 'John Doe',
      custom_employee_id: 'EMP123',
    } as DisclosureContext;
    const attrs = extractAttributes(context, []);
    expect(attrs.fullName).toBe('John Doe');
    expect(attrs.customAttributes).toEqual({ custom_employee_id: 'EMP123' });
  });
});

describe('formatVerificationResult', () => {
  it('should format valid result', () => {
    const result = createMockResult();
    const formatted = formatVerificationResult(result);

    expect(formatted).toContain('=== Verification Result ===');
    expect(formatted).toContain('Status: VALID ✓');
    expect(formatted).toContain('Holder DID: did:aura:mainnet:holder123');
  });

  it('should format invalid result', () => {
    const result = createMockResult({
      isValid: false,
      verificationError: 'Signature verification failed',
    });
    const formatted = formatVerificationResult(result);

    expect(formatted).toContain('Status: INVALID ✗');
    expect(formatted).toContain('Error: Signature verification failed');
  });

  it('should include all credential details', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({
          vcId: 'vc-001',
          vcType: 'IdentityCredential',
          signatureValid: true,
          onChain: true,
          txHash: '0xabc123',
        }),
      ],
    });
    const formatted = formatVerificationResult(result);

    expect(formatted).toContain('--- Credentials ---');
    expect(formatted).toContain('IdentityCredential');
    expect(formatted).toContain('ID: vc-001');
    expect(formatted).toContain('Signature: Valid ✓');
    expect(formatted).toContain('On-Chain: Yes');
    expect(formatted).toContain('Tx Hash: 0xabc123');
  });

  it('should format credential with invalid signature', () => {
    const result = createMockResult({
      vcDetails: [createMockVCDetail({ signatureValid: false })],
    });
    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('Signature: Invalid ✗');
  });

  it('should format credential not on-chain', () => {
    const result = createMockResult({
      vcDetails: [createMockVCDetail({ onChain: false })],
    });
    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('On-Chain: No');
  });

  it('should include disclosed attributes', () => {
    const result = createMockResult({
      attributes: {
        fullName: 'John Doe',
        age: 25,
        ageOver21: true,
        cityState: 'Los Angeles, CA',
      },
    });
    const formatted = formatVerificationResult(result);

    expect(formatted).toContain('--- Disclosed Attributes ---');
    expect(formatted).toContain('Full Name: John Doe');
    expect(formatted).toContain('Age: 25');
    expect(formatted).toContain('Age Over 21: Yes');
    expect(formatted).toContain('City, State: Los Angeles, CA');
  });

  it('should format ageOver18 attribute', () => {
    const result = createMockResult({
      attributes: { ageOver18: true },
    });
    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('Age Over 18: Yes');
  });

  it('should format full address attribute', () => {
    const result = createMockResult({
      attributes: { fullAddress: '123 Main St, Los Angeles, CA 90210' },
    });
    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('Address: 123 Main St, Los Angeles, CA 90210');
  });

  it('should include custom attributes', () => {
    const result = createMockResult({
      attributes: {
        customAttributes: {
          employeeId: 'EMP123',
          department: 'Engineering',
        },
      },
    });
    const formatted = formatVerificationResult(result);

    expect(formatted).toContain('Custom Attributes:');
    expect(formatted).toContain('employeeId: "EMP123"');
    expect(formatted).toContain('department: "Engineering"');
  });

  it('should include verification method', () => {
    const result = createMockResult({ verificationMethod: 'online' });
    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('Method: ONLINE');
  });

  it('should include network latency', () => {
    const result = createMockResult({ networkLatency: 250 });
    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('Network Latency: 250ms');
  });

  it('should format multiple credentials', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ vcId: 'vc-001', vcType: 'IdentityCredential' }),
        createMockVCDetail({ vcId: 'vc-002', vcType: 'AgeCredential' }),
      ],
    });
    const formatted = formatVerificationResult(result);

    expect(formatted).toContain('1. IdentityCredential');
    expect(formatted).toContain('2. AgeCredential');
  });
});

describe('serializeVerificationResult', () => {
  it('should serialize all fields', () => {
    const result = createMockResult();
    const serialized = serializeVerificationResult(result);

    expect(serialized.isValid).toBe(true);
    expect(serialized.holderDID).toBe('did:aura:mainnet:holder123');
    expect(serialized.verifiedAt).toBe('2024-06-15T10:00:00.000Z');
    expect(serialized.networkLatency).toBe(150);
    expect(serialized.verificationMethod).toBe('online');
    expect(serialized.presentationId).toBe('pres-123');
  });

  it('should serialize VC details with dates as ISO strings', () => {
    const result = createMockResult();
    const serialized = serializeVerificationResult(result);

    expect(Array.isArray(serialized.vcDetails)).toBe(true);
    const vcDetail = (serialized.vcDetails as Record<string, unknown>[])[0];
    expect(vcDetail.issuedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(vcDetail.expiresAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('should handle optional expiresAt in VC', () => {
    const result = createMockResult({
      vcDetails: [createMockVCDetail({ expiresAt: undefined })],
    });
    const serialized = serializeVerificationResult(result);
    const vcDetail = (serialized.vcDetails as Record<string, unknown>[])[0];
    expect(vcDetail.expiresAt).toBeUndefined();
  });

  it('should preserve attributes', () => {
    const result = createMockResult({
      attributes: {
        fullName: 'John Doe',
        age: 25,
        customAttributes: { extra: 'data' },
      },
    });
    const serialized = serializeVerificationResult(result);
    expect(serialized.attributes).toEqual({
      fullName: 'John Doe',
      age: 25,
      customAttributes: { extra: 'data' },
    });
  });

  it('should serialize verification error when present', () => {
    const result = createMockResult({
      isValid: false,
      verificationError: 'Invalid signature',
    });
    const serialized = serializeVerificationResult(result);
    expect(serialized.verificationError).toBe('Invalid signature');
  });

  it('should be JSON-safe', () => {
    const result = createMockResult();
    const serialized = serializeVerificationResult(result);

    // Should not throw
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);

    expect(parsed.isValid).toBe(true);
    expect(parsed.holderDID).toBe('did:aura:mainnet:holder123');
  });

  it('should preserve metadata', () => {
    const result = createMockResult({
      metadata: { source: 'mobile-app', version: '1.0.0' },
    });
    const serialized = serializeVerificationResult(result);
    expect(serialized.metadata).toEqual({ source: 'mobile-app', version: '1.0.0' });
  });
});

describe('createFailedResult', () => {
  it('should create result with isValid false', () => {
    const result = createFailedResult(
      'did:aura:mainnet:holder',
      'pres-123',
      'Verification failed',
      new Date('2024-06-15T12:00:00Z')
    );
    expect(result.isValid).toBe(false);
  });

  it('should set holder DID correctly', () => {
    const result = createFailedResult(
      'did:aura:mainnet:holder',
      'pres-123',
      'Error',
      new Date()
    );
    expect(result.holderDID).toBe('did:aura:mainnet:holder');
  });

  it('should set error message', () => {
    const result = createFailedResult(
      'did:aura:mainnet:holder',
      'pres-123',
      'Signature verification failed',
      new Date()
    );
    expect(result.verificationError).toBe('Signature verification failed');
  });

  it('should have empty VC details', () => {
    const result = createFailedResult('did', 'pres', 'error', new Date());
    expect(result.vcDetails).toEqual([]);
  });

  it('should have empty attributes', () => {
    const result = createFailedResult('did', 'pres', 'error', new Date());
    expect(result.attributes).toEqual({});
  });

  it('should set verification method to offline', () => {
    const result = createFailedResult('did', 'pres', 'error', new Date());
    expect(result.verificationMethod).toBe('offline');
  });

  it('should have network latency of 0', () => {
    const result = createFailedResult('did', 'pres', 'error', new Date());
    expect(result.networkLatency).toBe(0);
  });

  it('should set signatureValid to false', () => {
    const result = createFailedResult('did', 'pres', 'error', new Date());
    expect(result.signatureValid).toBe(false);
  });

  it('should generate audit ID', () => {
    const result = createFailedResult('did', 'pres', 'error', new Date());
    expect(result.auditId).toMatch(/^audit-/);
  });

  it('should set expires at', () => {
    const expires = new Date('2024-06-15T12:00:00Z');
    const result = createFailedResult('did', 'pres', 'error', expires);
    expect(result.expiresAt).toEqual(expires);
  });

  it('should set verified at to now', () => {
    const before = new Date();
    const result = createFailedResult('did', 'pres', 'error', new Date());
    const after = new Date();

    expect(result.verifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.verifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('createQuickErrorResult', () => {
  it('should create result with isValid false', () => {
    const result = createQuickErrorResult('Something went wrong');
    expect(result.isValid).toBe(false);
  });

  it('should set error message', () => {
    const result = createQuickErrorResult('Network timeout');
    expect(result.verificationError).toBe('Network timeout');
  });

  it('should set holder DID to unknown', () => {
    const result = createQuickErrorResult('error');
    expect(result.holderDID).toBe('unknown');
  });

  it('should set presentation ID to unknown', () => {
    const result = createQuickErrorResult('error');
    expect(result.presentationId).toBe('unknown');
  });

  it('should generate unique audit ID', () => {
    const result1 = createQuickErrorResult('error1');
    const result2 = createQuickErrorResult('error2');
    expect(result1.auditId).not.toBe(result2.auditId);
  });

  it('should start audit ID with err_', () => {
    const result = createQuickErrorResult('error');
    expect(result.auditId).toMatch(/^err_/);
  });

  it('should have empty VC details', () => {
    const result = createQuickErrorResult('error');
    expect(result.vcDetails).toEqual([]);
  });

  it('should have empty attributes', () => {
    const result = createQuickErrorResult('error');
    expect(result.attributes).toEqual({});
  });

  it('should set signatureValid to false', () => {
    const result = createQuickErrorResult('error');
    expect(result.signatureValid).toBe(false);
  });
});

describe('createSuccessResult', () => {
  it('should create result with isValid true', () => {
    const result = createSuccessResult(
      'did:aura:mainnet:holder',
      'pres-123',
      [createMockVCDetail()],
      { fullName: 'John Doe' },
      new Date('2024-06-15T12:00:00Z'),
      150,
      'online',
      true
    );
    expect(result.isValid).toBe(true);
  });

  it('should set all provided fields', () => {
    const vcDetails = [createMockVCDetail()];
    const attributes: DiscloseableAttributes = { fullName: 'John' };
    const expires = new Date('2024-06-15T12:00:00Z');

    const result = createSuccessResult(
      'did:aura:mainnet:holder',
      'pres-123',
      vcDetails,
      attributes,
      expires,
      200,
      'cached',
      true
    );

    expect(result.holderDID).toBe('did:aura:mainnet:holder');
    expect(result.presentationId).toBe('pres-123');
    expect(result.vcDetails).toEqual(vcDetails);
    expect(result.attributes).toEqual(attributes);
    expect(result.expiresAt).toEqual(expires);
    expect(result.networkLatency).toBe(200);
    expect(result.verificationMethod).toBe('cached');
    expect(result.signatureValid).toBe(true);
  });

  it('should generate audit ID', () => {
    const result = createSuccessResult(
      'did:aura:mainnet:holder',
      'pres-123',
      [],
      {},
      new Date(),
      0,
      'online',
      true
    );
    expect(result.auditId).toMatch(/^audit-/);
  });

  it('should set verified at to now', () => {
    const before = new Date();
    const result = createSuccessResult('did', 'pres', [], {}, new Date(), 0, 'online', true);
    const after = new Date();

    expect(result.verifiedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.verifiedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should not have verification error', () => {
    const result = createSuccessResult('did', 'pres', [], {}, new Date(), 0, 'online', true);
    expect(result.verificationError).toBeUndefined();
  });
});

describe('hasRequiredVCTypes', () => {
  it('should return true when all required types present', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ vcType: 'IdentityCredential' }),
        createMockVCDetail({ vcType: 'AgeCredential' }),
      ],
    });
    expect(hasRequiredVCTypes(result, ['IdentityCredential', 'AgeCredential'])).toBe(true);
  });

  it('should return false when missing required type', () => {
    const result = createMockResult({
      vcDetails: [createMockVCDetail({ vcType: 'IdentityCredential' })],
    });
    expect(hasRequiredVCTypes(result, ['IdentityCredential', 'AgeCredential'])).toBe(false);
  });

  it('should return true for empty required types', () => {
    const result = createMockResult({ vcDetails: [] });
    expect(hasRequiredVCTypes(result, [])).toBe(true);
  });

  it('should return false for empty vcDetails with required types', () => {
    const result = createMockResult({ vcDetails: [] });
    expect(hasRequiredVCTypes(result, ['IdentityCredential'])).toBe(false);
  });

  it('should handle extra VCs beyond required', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ vcType: 'IdentityCredential' }),
        createMockVCDetail({ vcType: 'AgeCredential' }),
        createMockVCDetail({ vcType: 'AddressCredential' }),
      ],
    });
    expect(hasRequiredVCTypes(result, ['IdentityCredential'])).toBe(true);
  });

  it('should be case-sensitive', () => {
    const result = createMockResult({
      vcDetails: [createMockVCDetail({ vcType: 'IdentityCredential' })],
    });
    expect(hasRequiredVCTypes(result, ['identitycredential'])).toBe(false);
  });
});

describe('calculateVerificationScore', () => {
  it('should return 0 for invalid result', () => {
    const result = createMockResult({ isValid: false });
    expect(calculateVerificationScore(result)).toBe(0);
  });

  it('should return at least 30 for valid result', () => {
    const result = createMockResult({ isValid: true, signatureValid: false });
    expect(calculateVerificationScore(result)).toBeGreaterThanOrEqual(30);
  });

  it('should add 20 points for valid signature', () => {
    const resultWithoutSig = createMockResult({
      isValid: true,
      signatureValid: false,
      vcDetails: [],
    });
    const resultWithSig = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [],
    });

    const diff = calculateVerificationScore(resultWithSig) - calculateVerificationScore(resultWithoutSig);
    expect(diff).toBe(20);
  });

  it('should give higher score for more valid VCs', () => {
    const resultNoVCs = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [],
    });
    const resultWithVCs = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active' }),
        createMockVCDetail({ signatureValid: true, status: 'active' }),
      ],
    });

    expect(calculateVerificationScore(resultWithVCs)).toBeGreaterThan(calculateVerificationScore(resultNoVCs));
  });

  it('should give higher score for on-chain VCs', () => {
    const offChainResult = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [createMockVCDetail({ onChain: false, signatureValid: true, status: 'active' })],
    });
    const onChainResult = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [createMockVCDetail({ onChain: true, signatureValid: true, status: 'active' })],
    });

    expect(calculateVerificationScore(onChainResult)).toBeGreaterThan(calculateVerificationScore(offChainResult));
  });

  it('should return max 100', () => {
    const perfectResult = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active', onChain: true }),
        createMockVCDetail({ signatureValid: true, status: 'active', onChain: true }),
      ],
    });
    expect(calculateVerificationScore(perfectResult)).toBe(100);
  });

  it('should handle mixed valid/invalid VCs', () => {
    const result = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active' }),
        createMockVCDetail({ signatureValid: false, status: 'revoked' }),
      ],
    });
    const score = calculateVerificationScore(result);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(100);
  });
});

describe('isTrustedIdentity', () => {
  it('should return true for high score', () => {
    const result = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active', onChain: true }),
      ],
    });
    expect(isTrustedIdentity(result)).toBe(true);
  });

  it('should return false for invalid result', () => {
    const result = createMockResult({ isValid: false });
    expect(isTrustedIdentity(result)).toBe(false);
  });

  it('should use default threshold of 80', () => {
    // Create result with score around 70
    const result = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [createMockVCDetail({ signatureValid: true, status: 'active', onChain: false })],
    });
    const score = calculateVerificationScore(result);

    if (score < 80) {
      expect(isTrustedIdentity(result)).toBe(false);
    } else {
      expect(isTrustedIdentity(result)).toBe(true);
    }
  });

  it('should respect custom threshold', () => {
    const result = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [],
    });
    const score = calculateVerificationScore(result);

    // With low threshold, should pass
    expect(isTrustedIdentity(result, 40)).toBe(true);

    // With high threshold, should fail
    expect(isTrustedIdentity(result, 90)).toBe(false);
  });

  it('should return true for exact threshold match', () => {
    const result = createMockResult({
      isValid: true,
      signatureValid: true,
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active', onChain: true }),
      ],
    });
    const score = calculateVerificationScore(result);
    expect(isTrustedIdentity(result, score)).toBe(true);
  });
});

describe('getVerificationSummary', () => {
  it('should count total credentials', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail(),
        createMockVCDetail(),
        createMockVCDetail(),
      ],
    });
    const summary = getVerificationSummary(result);
    expect(summary.totalCredentials).toBe(3);
  });

  it('should count valid credentials', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active' }),
        createMockVCDetail({ signatureValid: true, status: 'active' }),
        createMockVCDetail({ signatureValid: false, status: 'active' }),
      ],
    });
    const summary = getVerificationSummary(result);
    expect(summary.validCredentials).toBe(2);
  });

  it('should count revoked credentials', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ status: 'revoked' }),
        createMockVCDetail({ status: 'revoked' }),
        createMockVCDetail({ status: 'active' }),
      ],
    });
    const summary = getVerificationSummary(result);
    expect(summary.revokedCredentials).toBe(2);
  });

  it('should count expired credentials', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ status: 'expired' }),
        createMockVCDetail({ status: 'active' }),
      ],
    });
    const summary = getVerificationSummary(result);
    expect(summary.expiredCredentials).toBe(1);
  });

  it('should count on-chain credentials', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ onChain: true }),
        createMockVCDetail({ onChain: true }),
        createMockVCDetail({ onChain: false }),
      ],
    });
    const summary = getVerificationSummary(result);
    expect(summary.onChainCredentials).toBe(2);
  });

  it('should include verification score', () => {
    const result = createMockResult({ isValid: true });
    const summary = getVerificationSummary(result);
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.score).toBeLessThanOrEqual(100);
  });

  it('should return score 0 for invalid result', () => {
    const result = createMockResult({ isValid: false });
    const summary = getVerificationSummary(result);
    expect(summary.score).toBe(0);
  });

  it('should handle empty vcDetails', () => {
    const result = createMockResult({ vcDetails: [] });
    const summary = getVerificationSummary(result);
    expect(summary.totalCredentials).toBe(0);
    expect(summary.validCredentials).toBe(0);
    expect(summary.revokedCredentials).toBe(0);
    expect(summary.expiredCredentials).toBe(0);
    expect(summary.onChainCredentials).toBe(0);
  });

  it('should handle all statuses', () => {
    const result = createMockResult({
      vcDetails: [
        createMockVCDetail({ signatureValid: true, status: 'active', onChain: true }),
        createMockVCDetail({ signatureValid: true, status: 'revoked', onChain: false }),
        createMockVCDetail({ signatureValid: false, status: 'expired', onChain: true }),
      ],
    });
    const summary = getVerificationSummary(result);

    expect(summary.totalCredentials).toBe(3);
    expect(summary.validCredentials).toBe(1);
    expect(summary.revokedCredentials).toBe(1);
    expect(summary.expiredCredentials).toBe(1);
    expect(summary.onChainCredentials).toBe(2);
  });
});
