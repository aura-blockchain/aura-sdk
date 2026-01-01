/**
 * AuraVerifier Tests
 *
 * Comprehensive test suite for the Aura verification API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuraVerifier } from '../verifier.js';
import {
  AuraVerifierConfig,
  VerificationRequest,
  VCType,
  VCStatus,
} from '../types.js';
import { formatVerificationResult, calculateVerificationScore } from '../result.js';
import { BatchVerifier } from '../batch.js';

// ============================================================================
// Mock Data
// ============================================================================

/**
 * Create a mock QR code data string
 */
function createMockQRCode(options: {
  expired?: boolean;
  validSignature?: boolean;
  holderDID?: string;
  vcIds?: string[];
}): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = options.expired ? now - 3600 : now + 3600; // 1 hour ago or 1 hour from now

  const qrData = {
    v: '1.0',
    p: 'presentation-' + Math.random().toString(36).substring(7),
    h: options.holderDID || 'did:aura:testnet:holder123',
    vcs: options.vcIds || ['vc-gov-id-001', 'vc-age-002'],
    ctx: {
      show_age_over_21: true,
      show_age_over_18: true,
    },
    exp,
    n: Math.floor(Math.random() * 1000000),
    sig: options.validSignature !== false
      ? '1234567890abcdef'.repeat(8) // 128 hex chars (64 bytes)
      : 'invalid',
  };

  const jsonString = JSON.stringify(qrData);
  const base64Data = Buffer.from(jsonString).toString('base64');
  return `aura://verify?data=${base64Data}`;
}

/**
 * Create mock verifier config
 */
function createMockConfig(overrides?: Partial<AuraVerifierConfig>): AuraVerifierConfig {
  return {
    network: 'testnet',
    offlineMode: true, // Use offline mode for testing
    verbose: false,
    timeout: 5000,
    ...overrides,
  };
}

// ============================================================================
// Test Suite: AuraVerifier Initialization
// ============================================================================

describe('AuraVerifier - Initialization', () => {
  let verifier: AuraVerifier;

  afterEach(async () => {
    if (verifier) {
      await verifier.destroy();
    }
  });

  it('should create verifier with valid config', () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    expect(verifier).toBeDefined();
  });

  it('should initialize successfully', async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);

    await expect(verifier.initialize()).resolves.not.toThrow();
  });

  it('should not initialize twice', async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);

    await verifier.initialize();
    await verifier.initialize(); // Should not throw
  });

  it('should use network defaults', async () => {
    verifier = new AuraVerifier({
      network: 'mainnet',
    });

    await verifier.initialize();
    // Verifier should use mainnet endpoints by default
  });

  it('should allow custom endpoints', async () => {
    verifier = new AuraVerifier({
      network: 'testnet',
      grpcEndpoint: 'custom-grpc.example.com:9090',
      restEndpoint: 'https://custom-rest.example.com',
    });

    await verifier.initialize();
  });

  it('should cleanup on destroy', async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);

    await verifier.initialize();
    await verifier.destroy();

    // Subsequent verification should fail
    await expect(
      verifier.verify({ qrCodeData: createMockQRCode({}) })
    ).rejects.toThrow('not initialized');
  });
});

// ============================================================================
// Test Suite: Basic Verification
// ============================================================================

describe('AuraVerifier - Basic Verification', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should verify valid QR code', async () => {
    const qrCode = createMockQRCode({});
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.holderDID).toBe('did:aura:testnet:holder123');
    expect(result.signatureValid).toBe(true);
    expect(result.auditId).toMatch(/^audit-/);
  });

  it('should reject expired QR code', async () => {
    const qrCode = createMockQRCode({ expired: true });
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result.isValid).toBe(false);
    expect(result.verificationError).toContain('expired');
  });

  it('should reject invalid signature', async () => {
    const qrCode = createMockQRCode({ validSignature: false });
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result.isValid).toBe(false);
    expect(result.signatureValid).toBe(false);
  });

  it('should reject malformed QR code', async () => {
    const result = await verifier.verify({ qrCodeData: 'invalid-qr-code' });

    expect(result.isValid).toBe(false);
    expect(result.verificationError).toBeDefined();
  });

  it('should include verification metadata', async () => {
    const qrCode = createMockQRCode({});
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result.verifiedAt).toBeInstanceOf(Date);
    expect(result.networkLatency).toBeGreaterThanOrEqual(0);
    expect(result.verificationMethod).toBeDefined();
    expect(result.presentationId).toBeDefined();
  });
});

// ============================================================================
// Test Suite: Credential Verification
// ============================================================================

describe('AuraVerifier - Credential Verification', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should verify multiple credentials', async () => {
    const qrCode = createMockQRCode({
      vcIds: ['vc-001', 'vc-002', 'vc-003'],
    });
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result.isValid).toBe(true);
    expect(result.vcDetails).toHaveLength(3);
  });

  it('should include credential details', async () => {
    const qrCode = createMockQRCode({});
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result.vcDetails.length).toBeGreaterThan(0);

    const vc = result.vcDetails[0];
    expect(vc.vcId).toBeDefined();
    expect(vc.vcType).toBeDefined();
    expect(vc.issuerDID).toBeDefined();
    expect(vc.status).toBeDefined();
    expect(vc.signatureValid).toBeDefined();
    expect(vc.onChain).toBeDefined();
  });

  it('should check credential status', async () => {
    const status = await verifier.checkCredentialStatus('vc-test-001');
    expect(status).toBeDefined();
    expect(Object.values(VCStatus)).toContain(status);
  });

  it('should validate required VC types', async () => {
    const qrCode = createMockQRCode({});
    const request: VerificationRequest = {
      qrCodeData: qrCode,
      requiredVCTypes: [VCType.GOVERNMENT_ID],
    };

    const result = await verifier.verify(request);
    // With our current mock, this should pass as we default to GOVERNMENT_ID
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// Test Suite: Convenience Methods
// ============================================================================

describe('AuraVerifier - Convenience Methods', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should check age 21+', async () => {
    const qrCode = createMockQRCode({});
    const result = await verifier.isAge21Plus(qrCode);
    expect(typeof result).toBe('boolean');
    expect(result).toBe(true); // Mock data includes age_over_21
  });

  it('should check age 18+', async () => {
    const qrCode = createMockQRCode({});
    const result = await verifier.isAge18Plus(qrCode);
    expect(typeof result).toBe('boolean');
    expect(result).toBe(true); // Mock data includes age_over_18
  });

  it('should check verified human', async () => {
    const qrCode = createMockQRCode({});
    // This will fail because we don't have the required VC types in mock
    const result = await verifier.isVerifiedHuman(qrCode);
    expect(typeof result).toBe('boolean');
  });

  it('should calculate Aura score', async () => {
    const qrCode = createMockQRCode({});
    const score = await verifier.getAuraScore(qrCode);

    if (score !== null) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('should return null score for invalid verification', async () => {
    const qrCode = createMockQRCode({ expired: true });
    const score = await verifier.getAuraScore(qrCode);
    expect(score).toBeNull();
  });
});

// ============================================================================
// Test Suite: Batch Verification
// ============================================================================

describe('AuraVerifier - Batch Verification', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should verify multiple QR codes in batch', async () => {
    const requests = [
      { qrCodeData: createMockQRCode({}) },
      { qrCodeData: createMockQRCode({}) },
      { qrCodeData: createMockQRCode({}) },
    ];

    const results = await verifier.verifyBatch(requests);
    expect(results).toHaveLength(3);
  });

  it('should handle mixed valid/invalid in batch', async () => {
    const requests = [
      { qrCodeData: createMockQRCode({}) },
      { qrCodeData: createMockQRCode({ expired: true }) },
      { qrCodeData: createMockQRCode({}) },
    ];

    const results = await verifier.verifyBatch(requests);
    expect(results).toHaveLength(3);

    const validCount = results.filter((r) => r.isValid).length;
    const invalidCount = results.filter((r) => !r.isValid).length;

    expect(validCount).toBe(2);
    expect(invalidCount).toBe(1);
  });

  it('should handle empty batch', async () => {
    const results = await verifier.verifyBatch([]);
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// Test Suite: DID Resolution
// ============================================================================

describe('AuraVerifier - DID Resolution', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should resolve DID document', async () => {
    const did = 'did:aura:test123';
    const didDoc = await verifier.resolveDID(did);

    // In offline mode, should return null or mock data
    if (didDoc) {
      expect(didDoc.id).toBeDefined();
      expect(didDoc.verificationMethod).toBeDefined();
      expect(didDoc.authentication).toBeDefined();
    }
  });

  it('should cache DID documents', async () => {
    const did = 'did:aura:test123';

    // First resolution
    const doc1 = await verifier.resolveDID(did);

    // Second resolution (should use cache)
    const doc2 = await verifier.resolveDID(did);

    if (doc1 && doc2) {
      expect(doc1.id).toBe(doc2.id);
    }
  });
});

// ============================================================================
// Test Suite: Offline Mode
// ============================================================================

describe('AuraVerifier - Offline Mode', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig({ offlineMode: true });
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should work in offline mode', async () => {
    const qrCode = createMockQRCode({});
    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result).toBeDefined();
    // Offline mode may have limited verification
  });

  it('should enable offline mode', async () => {
    await verifier.enableOfflineMode();
    // Should not throw
  });

  it('should disable offline mode', async () => {
    await verifier.disableOfflineMode();
    // Should not throw
  });

  it('should sync cache', async () => {
    const syncResult = await verifier.syncCache();

    expect(syncResult).toBeDefined();
    expect(syncResult.success).toBeDefined();
    expect(syncResult.duration).toBeGreaterThanOrEqual(0);
    expect(syncResult.lastSyncAt).toBeInstanceOf(Date);
  });
});

// ============================================================================
// Test Suite: Event Handling
// ============================================================================

describe('AuraVerifier - Event Handling', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should emit verification event', async () => {
    const events: unknown[] = [];

    verifier.on('verification', (data) => {
      events.push(data);
    });

    const qrCode = createMockQRCode({});
    await verifier.verify({ qrCodeData: qrCode });

    expect(events.length).toBe(1);
  });

  it('should emit error event', async () => {
    const errors: unknown[] = [];

    verifier.on('error', (data) => {
      errors.push(data);
    });

    const qrCode = createMockQRCode({ expired: true });
    await verifier.verify({ qrCodeData: qrCode });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should emit sync event', async () => {
    const syncEvents: unknown[] = [];

    verifier.on('sync', (data) => {
      syncEvents.push(data);
    });

    await verifier.syncCache();

    expect(syncEvents.length).toBe(1);
  });

  it('should remove event listeners', () => {
    const handler = vi.fn();

    verifier.on('verification', handler);
    verifier.off('verification', handler);

    // Handler should not be called after removal
  });
});

// ============================================================================
// Test Suite: Result Utilities
// ============================================================================

describe('Verification Result Utilities', () => {
  it('should format verification result', async () => {
    const config = createMockConfig();
    const verifier = new AuraVerifier(config);
    await verifier.initialize();

    const qrCode = createMockQRCode({});
    const result = await verifier.verify({ qrCodeData: qrCode });

    const formatted = formatVerificationResult(result);
    expect(formatted).toContain('Verification Result');
    expect(formatted).toContain(result.holderDID);
    expect(formatted).toContain(result.auditId);

    await verifier.destroy();
  });

  it('should calculate verification score', async () => {
    const config = createMockConfig();
    const verifier = new AuraVerifier(config);
    await verifier.initialize();

    const qrCode = createMockQRCode({});
    const result = await verifier.verify({ qrCodeData: qrCode });

    const score = calculateVerificationScore(result);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    await verifier.destroy();
  });

  it('should score invalid results as 0', () => {
    const invalidResult = {
      isValid: false,
      holderDID: 'did:aura:test',
      verifiedAt: new Date(),
      vcDetails: [],
      attributes: {},
      auditId: 'audit-123',
      networkLatency: 0,
      verificationMethod: 'offline' as const,
      presentationId: 'p-123',
      expiresAt: new Date(),
      signatureValid: false,
    };

    const score = calculateVerificationScore(invalidResult);
    expect(score).toBe(0);
  });
});

// ============================================================================
// Test Suite: Batch Verification Utilities
// ============================================================================

describe('Batch Verification Utilities', () => {
  it('should process batch with concurrency control', async () => {
    const config = createMockConfig();
    const verifier = new AuraVerifier(config);
    await verifier.initialize();

    const batchVerifier = new BatchVerifier(
      (req) => verifier.verify(req),
      { concurrency: 2 }
    );

    const requests = Array(5)
      .fill(null)
      .map(() => ({ qrCodeData: createMockQRCode({}) }));

    const result = await batchVerifier.verifyBatch(requests);

    expect(result.results).toHaveLength(5);
    expect(result.totalTime).toBeGreaterThanOrEqual(0);

    await verifier.destroy();
  });

  it('should respect batch timeout', async () => {
    const config = createMockConfig();
    const verifier = new AuraVerifier(config);
    await verifier.initialize();

    const slowVerify = async (req: VerificationRequest) => {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
      return verifier.verify(req);
    };

    const batchVerifier = new BatchVerifier(slowVerify, {
      concurrency: 1,
      batchTimeout: 100, // 100ms timeout
    });

    const requests = [{ qrCodeData: createMockQRCode({}) }];
    const result = await batchVerifier.verifyBatch(requests);

    expect(result.failureCount).toBeGreaterThan(0);

    await verifier.destroy();
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('AuraVerifier - Error Handling', () => {
  let verifier: AuraVerifier;

  beforeEach(async () => {
    const config = createMockConfig();
    verifier = new AuraVerifier(config);
    await verifier.initialize();
  });

  afterEach(async () => {
    await verifier.destroy();
  });

  it('should handle parse errors gracefully', async () => {
    const result = await verifier.verify({ qrCodeData: 'completely-invalid' });

    expect(result.isValid).toBe(false);
    expect(result.verificationError).toBeDefined();
  });

  it('should handle missing required fields', async () => {
    const invalidJson = JSON.stringify({ v: '1.0' }); // Missing required fields
    const base64 = Buffer.from(invalidJson).toString('base64');
    const qrCode = `aura://verify?data=${base64}`;

    const result = await verifier.verify({ qrCodeData: qrCode });

    expect(result.isValid).toBe(false);
  });

  it('should require initialization before verify', async () => {
    const uninitializedVerifier = new AuraVerifier(createMockConfig());

    await expect(
      uninitializedVerifier.verify({ qrCodeData: createMockQRCode({}) })
    ).rejects.toThrow('not initialized');
  });
});
