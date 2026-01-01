/**
 * Tests for SDK index exports
 * Ensures all public API exports are working correctly
 */
import { describe, expect, it } from 'vitest';

import {
  // Version and SDK info
  VERSION,
  SDK_NAME,
  SDK_INFO,

  // Main verifier
  AuraVerifier,

  // QR exports
  parseQRCode,
  parseQRCodeSafe,
  validateQRCodeData,
  QRCodeError,
  QRParseError,

  // Client exports
  AuraClient,
  createAuraClient,

  // Network config
  AURA_NETWORKS,
  getNetworkConfig,
  isValidNetwork,
  buildEndpointURL,

  // Crypto exports
  verifyEd25519Signature,
  verifySecp256k1Signature,
  sha256Hash,
  sha256HashHex,
  hexToUint8Array,
  uint8ArrayToHex,

  // Offline exports
  CredentialCache,
  deriveKeyFromPassword,
  generateEncryptionKey,
  encrypt,
  decrypt,

  // Error exports
  AuraVerifierError,
  isAuraVerifierError,
  NetworkError,
  VerificationError,

  // Constants
  ERROR_CODES,

  // Utility exports
  generateAuditId,
  isValidDID,
  formatDID,
  sleep,
  retry,
  isBrowser,
  isNode,

  // VCType and VCStatus enums
  VCType,
  VCStatus,
} from '../index.js';

describe('SDK Exports', () => {
  describe('Version and SDK Info', () => {
    it('should export VERSION', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should export SDK_NAME', () => {
      expect(SDK_NAME).toBe('@aura-network/verifier-sdk');
    });

    it('should export SDK_INFO with all required fields', () => {
      expect(SDK_INFO).toBeDefined();
      expect(SDK_INFO.name).toBe(SDK_NAME);
      expect(SDK_INFO.version).toBe(VERSION);
      expect(SDK_INFO.description).toBeDefined();
      expect(SDK_INFO.author).toBe('Aura Network');
      expect(SDK_INFO.license).toBe('MIT');
    });
  });

  describe('Main Verifier', () => {
    it('should export AuraVerifier class', () => {
      expect(AuraVerifier).toBeDefined();
      expect(typeof AuraVerifier).toBe('function');
    });
  });

  describe('QR Exports', () => {
    it('should export parseQRCode function', () => {
      expect(parseQRCode).toBeDefined();
      expect(typeof parseQRCode).toBe('function');
    });

    it('should export parseQRCodeSafe function', () => {
      expect(parseQRCodeSafe).toBeDefined();
      expect(typeof parseQRCodeSafe).toBe('function');
    });

    it('should export validateQRCodeData function', () => {
      expect(validateQRCodeData).toBeDefined();
      expect(typeof validateQRCodeData).toBe('function');
    });

    it('should export QR error classes', () => {
      expect(QRCodeError).toBeDefined();
      expect(QRParseError).toBeDefined();
    });
  });

  describe('Client Exports', () => {
    it('should export AuraClient class', () => {
      expect(AuraClient).toBeDefined();
      expect(typeof AuraClient).toBe('function');
    });

    it('should export createAuraClient function', () => {
      expect(createAuraClient).toBeDefined();
      expect(typeof createAuraClient).toBe('function');
    });
  });

  describe('Network Configuration', () => {
    it('should export AURA_NETWORKS', () => {
      expect(AURA_NETWORKS).toBeDefined();
      expect(typeof AURA_NETWORKS).toBe('object');
    });

    it('should export getNetworkConfig function', () => {
      expect(getNetworkConfig).toBeDefined();
      expect(typeof getNetworkConfig).toBe('function');
    });

    it('should export isValidNetwork function', () => {
      expect(isValidNetwork).toBeDefined();
      expect(typeof isValidNetwork).toBe('function');
    });

    it('should export buildEndpointURL function', () => {
      expect(buildEndpointURL).toBeDefined();
      expect(typeof buildEndpointURL).toBe('function');
    });
  });

  describe('Crypto Exports', () => {
    it('should export Ed25519 verification function', () => {
      expect(verifyEd25519Signature).toBeDefined();
      expect(typeof verifyEd25519Signature).toBe('function');
    });

    it('should export Secp256k1 verification function', () => {
      expect(verifySecp256k1Signature).toBeDefined();
      expect(typeof verifySecp256k1Signature).toBe('function');
    });

    it('should export hash functions', () => {
      expect(sha256Hash).toBeDefined();
      expect(sha256HashHex).toBeDefined();

      const hash = sha256HashHex('test');
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should export hex conversion utilities', () => {
      expect(hexToUint8Array).toBeDefined();
      expect(uint8ArrayToHex).toBeDefined();

      const bytes = hexToUint8Array('deadbeef');
      const hex = uint8ArrayToHex(bytes);
      expect(hex).toBe('deadbeef');
    });
  });

  describe('Offline Exports', () => {
    it('should export CredentialCache class', () => {
      expect(CredentialCache).toBeDefined();
      expect(typeof CredentialCache).toBe('function');
    });

    it('should export encryption functions', () => {
      expect(deriveKeyFromPassword).toBeDefined();
      expect(generateEncryptionKey).toBeDefined();
      expect(encrypt).toBeDefined();
      expect(decrypt).toBeDefined();
    });
  });

  describe('Error Exports', () => {
    it('should export AuraVerifierError', () => {
      expect(AuraVerifierError).toBeDefined();
      // Constructor: (message, code, details?)
      const error = new AuraVerifierError('test error', 'TEST');
      expect(error.code).toBe('TEST');
      expect(error.message).toBe('test error');
    });

    it('should export isAuraVerifierError function', () => {
      expect(isAuraVerifierError).toBeDefined();

      const auraError = new AuraVerifierError('test', 'TEST');
      expect(isAuraVerifierError(auraError)).toBe(true);
      expect(isAuraVerifierError(new Error('test'))).toBe(false);
    });

    it('should export specific error classes', () => {
      expect(NetworkError).toBeDefined();
      expect(VerificationError).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export ERROR_CODES', () => {
      expect(ERROR_CODES).toBeDefined();
      expect(typeof ERROR_CODES).toBe('object');
    });
  });

  describe('VCType Enum', () => {
    it('should export VCType enum', () => {
      expect(VCType).toBeDefined();
      expect(typeof VCType).toBe('object');
    });
  });

  describe('VCStatus Enum', () => {
    it('should export VCStatus enum', () => {
      expect(VCStatus).toBeDefined();
      expect(typeof VCStatus).toBe('object');
    });
  });

  describe('Utility Functions', () => {
    it('should export generateAuditId', () => {
      expect(generateAuditId).toBeDefined();
      const id = generateAuditId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should export DID utilities', () => {
      expect(isValidDID).toBeDefined();
      expect(formatDID).toBeDefined();
      expect(typeof isValidDID).toBe('function');
      expect(typeof formatDID).toBe('function');
    });

    it('should export sleep function', async () => {
      expect(sleep).toBeDefined();
      const start = Date.now();
      await sleep(10);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(9); // Allow some tolerance
    });

    it('should export retry function', () => {
      expect(retry).toBeDefined();
      expect(typeof retry).toBe('function');
    });

    it('should export environment detection utilities', () => {
      expect(isBrowser).toBeDefined();
      expect(isNode).toBeDefined();
      expect(typeof isBrowser()).toBe('boolean');
      expect(typeof isNode()).toBe('boolean');
    });
  });
});
