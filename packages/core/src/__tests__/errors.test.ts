/**
 * Error Classes Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  AuraVerifierError,
  ConfigurationError,
  NetworkError,
  VerificationError,
  EncodingError,
  InvalidConfigError,
  RpcConnectionError,
  TransactionVerificationError,
  QRParseError,
  QRValidationError,
  QRExpiredError,
  QRNonceError,
  SignatureError,
  PublicKeyError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  RetryExhaustedError,
  CredentialRevokedError,
  CredentialExpiredError,
  CredentialNotFoundError,
  CredentialSuspendedError,
  CredentialPendingError,
  DIDResolutionError,
  InvalidDIDError,
  DIDNotFoundError,
  CacheError,
  SyncError,
  OfflineModeUnavailableError,
  isAuraVerifierError,
  getErrorCode,
  toAuraVerifierError,
} from '../errors.js';
import { ERROR_CODES } from '../types/constants.js';

describe('Error Classes', () => {
  describe('AuraVerifierError', () => {
    it('should create error with message and code', () => {
      const error = new AuraVerifierError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('AuraVerifierError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should include details in error', () => {
      const details = { key: 'value', count: 42 };
      const error = new AuraVerifierError('Test error', 'TEST_ERROR', details);

      expect(error.details).toEqual(details);
    });

    it('should serialize to JSON correctly', () => {
      const error = new AuraVerifierError('Test error', 'TEST_ERROR', { foo: 'bar' });
      const json = error.toJSON();

      expect(json.name).toBe('AuraVerifierError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.details).toEqual({ foo: 'bar' });
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Invalid config');

      expect(error.name).toBe('ConfigurationError');
      expect(error).toBeInstanceOf(AuraVerifierError);
    });

    it('should include field information', () => {
      const error = new ConfigurationError('Invalid value', 'rpcEndpoint');

      expect(error.field).toBe('rpcEndpoint');
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('Connection failed', ERROR_CODES.NETWORK_ERROR);

      expect(error.name).toBe('NetworkError');
      expect(error).toBeInstanceOf(AuraVerifierError);
    });

    it('should include status code', () => {
      const error = new NetworkError('Not found', ERROR_CODES.NETWORK_ERROR, 404);

      expect(error.statusCode).toBe(404);
    });
  });

  describe('VerificationError', () => {
    it('should create verification error', () => {
      const error = new VerificationError(
        'Signature invalid',
        'SIGNATURE_VERIFICATION_FAILED'
      );

      expect(error.name).toBe('VerificationError');
      expect(error).toBeInstanceOf(AuraVerifierError);
    });
  });


  describe('EncodingError', () => {
    it('should create encoding error', () => {
      const error = new EncodingError('Invalid base64');

      expect(error.name).toBe('EncodingError');
      expect(error.code).toBe('ENCODING_ERROR');
      expect(error).toBeInstanceOf(AuraVerifierError);
    });
  });

  describe('InvalidConfigError', () => {
    it('should be an alias for ConfigurationError', () => {
      const error = new InvalidConfigError('Bad config');

      expect(error.name).toBe('InvalidConfigError');
      expect(error).toBeInstanceOf(ConfigurationError);
    });
  });

  describe('RpcConnectionError', () => {
    it('should create RPC connection error', () => {
      const error = new RpcConnectionError('Connection refused');

      expect(error.name).toBe('RpcConnectionError');
      expect(error).toBeInstanceOf(NetworkError);
    });
  });

  describe('TransactionVerificationError', () => {
    it('should create transaction verification error', () => {
      const error = new TransactionVerificationError('Invalid tx', { txHash: 'abc123' });

      expect(error.name).toBe('TransactionVerificationError');
      expect(error).toBeInstanceOf(VerificationError);
      expect(error.details).toEqual({ txHash: 'abc123' });
    });
  });

  describe('ERROR_CODES', () => {
    it('should have standard error codes', () => {
      expect(ERROR_CODES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_CODES.QR_PARSE_ERROR).toBeDefined();
      expect(ERROR_CODES.QR_EXPIRED).toBeDefined();
      expect(ERROR_CODES.INVALID_SIGNATURE).toBeDefined();
      expect(ERROR_CODES.CREDENTIAL_REVOKED).toBeDefined();
    });
  });

  describe('QR Errors', () => {
    it('should create QRParseError', () => {
      const error = new QRParseError('Invalid format');
      expect(error.name).toBe('QRParseError');
      expect(error).toBeInstanceOf(AuraVerifierError);
    });

    it('should create QRValidationError with field', () => {
      const error = new QRValidationError('Validation failed', 'signature');
      expect(error.name).toBe('QRValidationError');
      expect(error.field).toBe('signature');
    });

    it('should create QRExpiredError with timestamps', () => {
      const expirationTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const currentTime = Math.floor(Date.now() / 1000);
      const error = new QRExpiredError(expirationTime, currentTime);
      expect(error.name).toBe('QRExpiredError');
      expect(error.expirationTime).toBe(expirationTime);
      expect(error.currentTime).toBe(currentTime);
    });

    it('should create QRNonceError', () => {
      const error = new QRNonceError('Nonce already used');
      expect(error.name).toBe('QRNonceError');
    });
  });

  describe('Cryptographic Errors', () => {
    it('should create SignatureError', () => {
      const error = new SignatureError('Invalid signature format');
      expect(error.name).toBe('SignatureError');
      expect(error).toBeInstanceOf(AuraVerifierError);
    });

    it('should create PublicKeyError', () => {
      const error = new PublicKeyError('Invalid public key');
      expect(error.name).toBe('PublicKeyError');
    });
  });

  describe('Network Errors Extended', () => {
    it('should create TimeoutError', () => {
      const error = new TimeoutError(5000, 'verifyCredential');
      expect(error.name).toBe('TimeoutError');
      expect(error.timeoutMs).toBe(5000);
      expect(error.operation).toBe('verifyCredential');
    });

    it('should create NodeUnavailableError', () => {
      const error = new NodeUnavailableError('https://node.example.com');
      expect(error.name).toBe('NodeUnavailableError');
      expect(error.endpoint).toBe('https://node.example.com');
    });

    it('should create APIError with endpoint and status code', () => {
      const error = new APIError('Not found', '/api/v1/test', 404);
      expect(error.name).toBe('APIError');
      expect(error.statusCode).toBe(404);
      expect(error.endpoint).toBe('/api/v1/test');
    });

    it('should create RetryExhaustedError', () => {
      const lastError = new Error('Connection failed');
      const error = new RetryExhaustedError('verifyCredential', 3, lastError);
      expect(error.name).toBe('RetryExhaustedError');
      expect(error.attempts).toBe(3);
      expect(error.operation).toBe('verifyCredential');
    });
  });

  describe('Credential Errors', () => {
    it('should create CredentialRevokedError', () => {
      const error = new CredentialRevokedError('vc123', new Date('2024-01-01'));
      expect(error.name).toBe('CredentialRevokedError');
      expect(error.vcId).toBe('vc123');
    });

    it('should create CredentialExpiredError', () => {
      const error = new CredentialExpiredError('vc123', new Date('2024-01-01'));
      expect(error.name).toBe('CredentialExpiredError');
    });

    it('should create CredentialNotFoundError', () => {
      const error = new CredentialNotFoundError('vc123');
      expect(error.name).toBe('CredentialNotFoundError');
    });

    it('should create CredentialSuspendedError', () => {
      const error = new CredentialSuspendedError('vc123', new Date('2024-01-01'));
      expect(error.name).toBe('CredentialSuspendedError');
      expect(error.vcId).toBe('vc123');
    });

    it('should create CredentialPendingError', () => {
      const error = new CredentialPendingError('vc123');
      expect(error.name).toBe('CredentialPendingError');
    });
  });

  describe('DID Errors', () => {
    it('should create DIDResolutionError', () => {
      const error = new DIDResolutionError('did:aura:123', 'Not found');
      expect(error.name).toBe('DIDResolutionError');
      expect(error.did).toBe('did:aura:123');
    });

    it('should create InvalidDIDError', () => {
      const error = new InvalidDIDError('invalid-did');
      expect(error.name).toBe('InvalidDIDError');
    });

    it('should create DIDNotFoundError', () => {
      const error = new DIDNotFoundError('did:aura:123');
      expect(error.name).toBe('DIDNotFoundError');
    });
  });

  describe('Cache Errors', () => {
    it('should create CacheError', () => {
      const error = new CacheError('Cache operation failed');
      expect(error.name).toBe('CacheError');
    });

    it('should create CacheError with readFailed factory', () => {
      const error = CacheError.readFailed('key123', 'Corrupted data');
      expect(error.message).toContain('key123');
      expect(error.message).toContain('Corrupted data');
    });

    it('should create CacheError with writeFailed factory', () => {
      const error = CacheError.writeFailed('key123');
      expect(error.message).toContain('key123');
    });

    it('should create SyncError', () => {
      const error = new SyncError('Sync failed');
      expect(error.name).toBe('SyncError');
    });

    it('should create OfflineModeUnavailableError', () => {
      const error = new OfflineModeUnavailableError('No cache configured');
      expect(error.name).toBe('OfflineModeUnavailableError');
      expect(error.reason).toBe('No cache configured');
    });
  });

  describe('Configuration Errors Extended', () => {
    it('should create ConfigurationError with missingRequired factory', () => {
      const error = ConfigurationError.missingRequired('apiKey');
      expect(error.message).toContain('apiKey');
      expect(error.field).toBe('apiKey');
    });

    it('should create ConfigurationError with invalidValue factory', () => {
      const error = ConfigurationError.invalidValue('timeout', 'must be positive');
      expect(error.message).toContain('timeout');
      expect(error.message).toContain('must be positive');
    });
  });

  describe('Error Utility Functions', () => {
    it('isAuraVerifierError should detect AuraVerifierError', () => {
      const auraError = new AuraVerifierError('test', 'TEST');
      const normalError = new Error('test');

      expect(isAuraVerifierError(auraError)).toBe(true);
      expect(isAuraVerifierError(normalError)).toBe(false);
      expect(isAuraVerifierError(null)).toBe(false);
      expect(isAuraVerifierError(undefined)).toBe(false);
      expect(isAuraVerifierError('string')).toBe(false);
    });

    it('getErrorCode should return error code for AuraVerifierError', () => {
      const auraError = new AuraVerifierError('test', 'TEST_CODE');
      expect(getErrorCode(auraError)).toBe('TEST_CODE');
    });

    it('getErrorCode should return UNKNOWN_ERROR for non-AuraVerifierError', () => {
      const normalError = new Error('test');
      expect(getErrorCode(normalError)).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(getErrorCode('string')).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(getErrorCode(null)).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    it('toAuraVerifierError should return same error for AuraVerifierError', () => {
      const auraError = new AuraVerifierError('test', 'TEST');
      const result = toAuraVerifierError(auraError);
      expect(result).toBe(auraError);
    });

    it('toAuraVerifierError should wrap regular Error', () => {
      const normalError = new Error('test message');
      const result = toAuraVerifierError(normalError);

      expect(result).toBeInstanceOf(AuraVerifierError);
      expect(result.message).toBe('test message');
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    it('toAuraVerifierError should wrap non-Error values', () => {
      const result = toAuraVerifierError('string error');

      expect(result).toBeInstanceOf(AuraVerifierError);
      expect(result.message).toBe('string error');
    });
  });

  describe('VerificationError Static Methods', () => {
    it('should create invalidPresentation error', () => {
      const error = VerificationError.invalidPresentation('Missing signature');
      expect(error.message).toContain('Missing signature');
      expect(error.name).toBe('VerificationError');
    });

    it('should create requiredVCMissing error', () => {
      const error = VerificationError.requiredVCMissing('PROOF_OF_HUMANITY');
      expect(error.message).toContain('PROOF_OF_HUMANITY');
      expect(error.name).toBe('VerificationError');
    });

    it('should create requiredDisclosureMissing error', () => {
      const error = VerificationError.requiredDisclosureMissing('age');
      expect(error.message).toContain('age');
    });
  });
});
