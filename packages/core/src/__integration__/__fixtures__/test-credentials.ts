/**
 * Test Fixtures for Integration Tests
 *
 * Provides comprehensive test data including valid QR codes, expired credentials,
 * revoked credentials, and various signature types for integration testing.
 */

import type { QRCodeData } from '../../qr/types.js';
import type { VCType, VCStatus } from '../../verification/types.js';

/**
 * Generate a mock Ed25519 signature (64 bytes = 128 hex chars)
 */
export function generateMockEd25519Signature(): string {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a mock secp256k1 signature (64 bytes = 128 hex chars)
 */
export function generateMockSecp256k1Signature(): string {
  return generateMockEd25519Signature();
}

/**
 * Generate a random presentation ID
 */
export function generatePresentationId(): string {
  return `pres_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/**
 * Create a mock QR code data object with customizable fields
 */
export function createMockQRCodeData(overrides: Partial<QRCodeData> = {}): QRCodeData {
  const now = Math.floor(Date.now() / 1000);

  return {
    v: '1.0',
    p: generatePresentationId(),
    h: 'did:aura:mainnet:aura1abc123def456ghi789jkl012mno345pqr',
    vcs: ['vc_age_over_21_12345'],
    ctx: {
      show_age_over_21: true,
    },
    exp: now + 300, // 5 minutes from now
    n: generateNonce(),
    sig: generateMockEd25519Signature(),
    ...overrides,
  };
}

/**
 * Encode QR code data to aura:// URL format
 */
export function encodeQRCodeData(data: QRCodeData): string {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json).toString('base64');
  return `aura://verify?data=${base64}`;
}

// ============================================================================
// Valid QR Codes
// ============================================================================

/**
 * Valid QR code for age verification (21+)
 */
export const VALID_AGE_21_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_age_21_valid_001'],
    ctx: {
      show_age_over_21: true,
    },
  })
);

/**
 * Valid QR code for age verification (18+)
 */
export const VALID_AGE_18_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_age_18_valid_002'],
    ctx: {
      show_age_over_18: true,
    },
  })
);

/**
 * Valid QR code for verified human credential
 */
export const VALID_HUMAN_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_human_valid_003'],
    ctx: {},
  })
);

/**
 * Valid QR code with government ID credential
 */
export const VALID_GOVERNMENT_ID_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_gov_id_valid_004'],
    ctx: {
      show_full_name: true,
    },
  })
);

/**
 * Valid QR code with KYC credential
 */
export const VALID_KYC_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_kyc_valid_005'],
    ctx: {
      show_full_name: true,
      show_age: true,
      show_city_state: true,
    },
  })
);

/**
 * Valid QR code with multiple credentials
 */
export const VALID_MULTI_CREDENTIAL_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_age_21_valid_006', 'vc_human_valid_007', 'vc_kyc_valid_008'],
    ctx: {
      show_age_over_21: true,
      show_full_name: true,
    },
  })
);

/**
 * Valid QR code with secp256k1 signature
 */
export const VALID_SECP256K1_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_secp256k1_valid_009'],
    sig: generateMockSecp256k1Signature(),
  })
);

// ============================================================================
// Expired QR Codes
// ============================================================================

/**
 * Expired QR code (expired 1 hour ago)
 */
export const EXPIRED_QR_1_HOUR = encodeQRCodeData(
  createMockQRCodeData({
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    vcs: ['vc_expired_001'],
  })
);

/**
 * Expired QR code (expired 1 minute ago)
 */
export const EXPIRED_QR_1_MINUTE = encodeQRCodeData(
  createMockQRCodeData({
    exp: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
    vcs: ['vc_expired_002'],
  })
);

/**
 * Expired QR code (expired 1 day ago)
 */
export const EXPIRED_QR_1_DAY = encodeQRCodeData(
  createMockQRCodeData({
    exp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    vcs: ['vc_expired_003'],
  })
);

// ============================================================================
// Revoked Credentials
// ============================================================================

/**
 * QR code with revoked credential
 */
export const REVOKED_CREDENTIAL_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_revoked_001'],
  })
);

/**
 * QR code with multiple credentials, one revoked
 */
export const PARTIALLY_REVOKED_QR = encodeQRCodeData(
  createMockQRCodeData({
    vcs: ['vc_valid_010', 'vc_revoked_002', 'vc_valid_011'],
  })
);

// ============================================================================
// Invalid Signatures
// ============================================================================

/**
 * QR code with invalid signature (too short)
 */
export const INVALID_SIGNATURE_SHORT_QR = encodeQRCodeData(
  createMockQRCodeData({
    sig: 'deadbeef', // Valid hex but too short (8 chars, need 64+)
  })
);

/**
 * QR code with invalid signature (wrong format)
 */
export const INVALID_SIGNATURE_FORMAT_QR = encodeQRCodeData(
  createMockQRCodeData({
    sig: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
  })
);

/**
 * QR code with empty signature
 */
export const INVALID_SIGNATURE_EMPTY_QR = encodeQRCodeData(
  createMockQRCodeData({
    sig: '',
  })
);

// ============================================================================
// Malformed QR Codes
// ============================================================================

/**
 * QR code with missing required field (vcs)
 */
export const MALFORMED_MISSING_VCS =
  'aura://verify?data=' +
  Buffer.from(
    JSON.stringify({
      v: '1.0',
      p: generatePresentationId(),
      h: 'did:aura:mainnet:test',
      ctx: {},
      exp: Math.floor(Date.now() / 1000) + 300,
      n: generateNonce(),
      sig: generateMockEd25519Signature(),
    })
  ).toString('base64');

/**
 * QR code with missing required field (signature)
 */
export const MALFORMED_MISSING_SIGNATURE =
  'aura://verify?data=' +
  Buffer.from(
    JSON.stringify({
      v: '1.0',
      p: generatePresentationId(),
      h: 'did:aura:mainnet:test',
      vcs: ['vc_test'],
      ctx: {},
      exp: Math.floor(Date.now() / 1000) + 300,
      n: generateNonce(),
    })
  ).toString('base64');

/**
 * QR code with invalid base64
 */
export const MALFORMED_INVALID_BASE64 = 'aura://verify?data=not-valid-base64!!!@#$%';

/**
 * QR code with invalid JSON
 */
export const MALFORMED_INVALID_JSON =
  'aura://verify?data=' + Buffer.from('{invalid json').toString('base64');

/**
 * QR code with wrong protocol version
 */
export const MALFORMED_WRONG_VERSION = encodeQRCodeData(
  createMockQRCodeData({
    v: '99.0',
  })
);

/**
 * Completely invalid QR string
 */
export const MALFORMED_INVALID_FORMAT = 'not-a-valid-qr-code';

/**
 * QR code with wrong URL scheme
 */
export const MALFORMED_WRONG_SCHEME = 'https://example.com/verify?data=abc123';

// ============================================================================
// Special Cases
// ============================================================================

/**
 * QR code that will expire in 10 seconds (for timeout testing)
 */
export function createShortLivedQR(): string {
  return encodeQRCodeData(
    createMockQRCodeData({
      exp: Math.floor(Date.now() / 1000) + 10, // 10 seconds
      vcs: ['vc_short_lived'],
    })
  );
}

/**
 * QR code with very long expiration (1 year)
 */
export const LONG_LIVED_QR = encodeQRCodeData(
  createMockQRCodeData({
    exp: Math.floor(Date.now() / 1000) + 31536000, // 1 year
    vcs: ['vc_long_lived'],
  })
);

/**
 * QR code with nonce = 0 (replay attack test)
 */
export const ZERO_NONCE_QR = encodeQRCodeData(
  createMockQRCodeData({
    n: 0,
    vcs: ['vc_zero_nonce'],
  })
);

/**
 * QR code with duplicate nonce (replay attack test)
 */
export const DUPLICATE_NONCE_QR = encodeQRCodeData(
  createMockQRCodeData({
    n: 123456789,
    vcs: ['vc_duplicate_nonce'],
  })
);

/**
 * Raw base64 data (without aura:// prefix)
 */
export const RAW_BASE64_QR = Buffer.from(JSON.stringify(createMockQRCodeData())).toString('base64');

/**
 * QR code with empty VC array
 */
export const EMPTY_VCS_QR =
  'aura://verify?data=' +
  Buffer.from(
    JSON.stringify({
      v: '1.0',
      p: generatePresentationId(),
      h: 'did:aura:mainnet:test',
      vcs: [],
      ctx: {},
      exp: Math.floor(Date.now() / 1000) + 300,
      n: generateNonce(),
      sig: generateMockEd25519Signature(),
    })
  ).toString('base64');

/**
 * QR code with invalid DID format
 */
export const INVALID_DID_QR = encodeQRCodeData(
  createMockQRCodeData({
    h: 'not-a-valid-did',
  })
);

/**
 * QR code for testnet
 */
export const TESTNET_QR = encodeQRCodeData(
  createMockQRCodeData({
    h: 'did:aura:testnet:aura1test123456789',
    vcs: ['vc_testnet_001'],
  })
);

/**
 * QR code for local network
 */
export const LOCAL_NETWORK_QR = encodeQRCodeData(
  createMockQRCodeData({
    h: 'did:aura:local:aura1local123456789',
    vcs: ['vc_local_001'],
  })
);

// ============================================================================
// Batch Testing Fixtures
// ============================================================================

/**
 * Generate an array of valid QR codes for batch testing
 */
export function generateValidQRBatch(count: number): string[] {
  const qrCodes: string[] = [];
  for (let i = 0; i < count; i++) {
    qrCodes.push(
      encodeQRCodeData(
        createMockQRCodeData({
          vcs: [`vc_batch_valid_${i.toString().padStart(6, '0')}`],
        })
      )
    );
  }
  return qrCodes;
}

/**
 * Generate a mixed batch of valid and invalid QR codes
 */
export function generateMixedQRBatch(validCount: number, invalidCount: number): string[] {
  const qrCodes: string[] = [];

  // Add valid QR codes
  for (let i = 0; i < validCount; i++) {
    qrCodes.push(
      encodeQRCodeData(
        createMockQRCodeData({
          vcs: [`vc_batch_valid_${i.toString().padStart(6, '0')}`],
        })
      )
    );
  }

  // Add invalid QR codes
  for (let i = 0; i < invalidCount; i++) {
    qrCodes.push(MALFORMED_INVALID_BASE64);
  }

  return qrCodes;
}

/**
 * Generate a batch of expired QR codes
 */
export function generateExpiredQRBatch(count: number): string[] {
  const qrCodes: string[] = [];
  for (let i = 0; i < count; i++) {
    qrCodes.push(
      encodeQRCodeData(
        createMockQRCodeData({
          exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
          vcs: [`vc_batch_expired_${i.toString().padStart(6, '0')}`],
        })
      )
    );
  }
  return qrCodes;
}

// ============================================================================
// Mock Data for Credential Details
// ============================================================================

/**
 * Map of VC IDs to their mock statuses
 */
export const MOCK_VC_STATUS_MAP: Record<string, VCStatus> = {
  // Valid credentials
  vc_age_21_valid_001: 'active' as VCStatus,
  vc_age_18_valid_002: 'active' as VCStatus,
  vc_human_valid_003: 'active' as VCStatus,
  vc_gov_id_valid_004: 'active' as VCStatus,
  vc_kyc_valid_005: 'active' as VCStatus,
  vc_age_21_valid_006: 'active' as VCStatus,
  vc_human_valid_007: 'active' as VCStatus,
  vc_kyc_valid_008: 'active' as VCStatus,
  vc_secp256k1_valid_009: 'active' as VCStatus,
  vc_valid_010: 'active' as VCStatus,
  vc_valid_011: 'active' as VCStatus,

  // Revoked credentials
  vc_revoked_001: 'revoked' as VCStatus,
  vc_revoked_002: 'revoked' as VCStatus,

  // Expired credentials
  vc_expired_001: 'expired' as VCStatus,
  vc_expired_002: 'expired' as VCStatus,
  vc_expired_003: 'expired' as VCStatus,
};

/**
 * Get mock VC status (default to active if not in map)
 */
export function getMockVCStatus(vcId: string): VCStatus {
  return MOCK_VC_STATUS_MAP[vcId] || ('active' as VCStatus);
}
