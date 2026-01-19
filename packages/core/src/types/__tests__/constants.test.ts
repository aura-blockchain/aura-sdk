import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ERROR_CODES, VC_STATUSES, VC_TYPES } from '../constants.js';

describe('VC_TYPES', () => {
  it('contains expected core credential mappings', () => {
    expect(VC_TYPES.VERIFIED_HUMAN).toBe(1);
    expect(VC_TYPES.AGE_OVER_18).toBe(2);
    expect(VC_TYPES.AGE_OVER_21).toBe(3);
    expect(VC_TYPES.CUSTOM).toBe(100);
  });
});

describe('VC_STATUSES', () => {
  it('reflects on-chain status values', () => {
    expect(VC_STATUSES.PENDING).toBe(1);
    expect(VC_STATUSES.ACTIVE).toBe(2);
    expect(VC_STATUSES.REVOKED).toBe(3);
    expect(VC_STATUSES.EXPIRED).toBe(4);
    expect(VC_STATUSES.SUSPENDED).toBe(5);
  });
});

describe('ERROR_CODES', () => {
  it('exposes canonical error codes for common failures', () => {
    expect(ERROR_CODES.QR_PARSE_ERROR).toBe('QR_PARSE_ERROR');
    expect(ERROR_CODES.INVALID_SIGNATURE).toBe('INVALID_SIGNATURE');
    expect(ERROR_CODES.CREDENTIAL_EXPIRED).toBe('CREDENTIAL_EXPIRED');
    expect(ERROR_CODES.INVALID_DID_FORMAT).toBe('INVALID_DID_FORMAT');
    expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });
});

describe('DEFAULT_CONFIG', () => {
  it('provides defensive defaults aligned with community practice', () => {
    expect(DEFAULT_CONFIG.TIMEOUT_MS).toBeGreaterThanOrEqual(10000);
    expect(DEFAULT_CONFIG.PRESENTATION_EXPIRY_SECONDS).toBe(300);
    expect(DEFAULT_CONFIG.RETRY_ATTEMPTS).toBe(3);
    expect(DEFAULT_CONFIG.RETRY_BACKOFF).toBe(2);
    expect(DEFAULT_CONFIG.MAX_CONCURRENT_VERIFICATIONS).toBe(5);
  });
});
