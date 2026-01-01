/**
 * Tests for gRPC/Network Error Classes
 */

import { describe, it, expect } from 'vitest';
import {
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  VerificationError,
  RetryExhaustedError,
  ConfigurationError,
} from '../errors.js';

describe('NetworkError', () => {
  describe('constructor', () => {
    it('should create error with basic properties', () => {
      const error = new NetworkError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('NetworkError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NetworkError);
    });

    it('should include statusCode when provided', () => {
      const error = new NetworkError('Test error', 'TEST_CODE', 500);

      expect(error.statusCode).toBe(500);
    });

    it('should include details when provided', () => {
      const details = { extra: 'info' };
      const error = new NetworkError('Test error', 'TEST_CODE', 400, details);

      expect(error.details).toEqual(details);
    });
  });

  describe('fromResponse', () => {
    it('should create error from HTTP response', () => {
      const error = NetworkError.fromResponse(404, 'Not Found');

      expect(error.message).toBe('HTTP 404: Not Found');
      expect(error.code).toBe('HTTP_ERROR');
      expect(error.statusCode).toBe(404);
    });

    it('should include body as details', () => {
      const body = { error: 'Resource not found' };
      const error = NetworkError.fromResponse(404, 'Not Found', body);

      expect(error.details).toEqual(body);
    });
  });

  describe('connectionFailed', () => {
    it('should create connection failed error', () => {
      const error = NetworkError.connectionFailed('Connection refused');

      expect(error.message).toContain('Connection refused');
      expect(error.code).toBe('CONNECTION_FAILED');
    });

    it('should include details', () => {
      const details = { port: 443, host: 'example.com' };
      const error = NetworkError.connectionFailed('ECONNREFUSED', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('invalidResponse', () => {
    it('should create invalid response error', () => {
      const error = NetworkError.invalidResponse('Expected JSON');

      expect(error.message).toContain('Expected JSON');
      expect(error.code).toBe('INVALID_RESPONSE');
    });

    it('should include details', () => {
      const details = { received: 'text/html' };
      const error = NetworkError.invalidResponse('Wrong content type', details);

      expect(error.details).toEqual(details);
    });
  });
});

describe('TimeoutError', () => {
  it('should create timeout error with operation name', () => {
    const error = new TimeoutError(5000, 'fetchCredential');

    expect(error.message).toContain('fetchCredential');
    expect(error.message).toContain('5000ms');
    expect(error.timeoutMs).toBe(5000);
    expect(error.operation).toBe('fetchCredential');
    expect(error.code).toBe('TIMEOUT');
    expect(error.statusCode).toBe(408);
    expect(error.name).toBe('TimeoutError');
  });

  it('should be instanceof NetworkError', () => {
    const error = new TimeoutError(1000, 'test');

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(TimeoutError);
  });
});

describe('NodeUnavailableError', () => {
  it('should create error with endpoint', () => {
    const error = new NodeUnavailableError('https://rpc.aura.network');

    expect(error.message).toContain('https://rpc.aura.network');
    expect(error.endpoint).toBe('https://rpc.aura.network');
    expect(error.code).toBe('NODE_UNAVAILABLE');
    expect(error.statusCode).toBe(503);
    expect(error.name).toBe('NodeUnavailableError');
  });

  it('should list attempted endpoints', () => {
    const attempted = [
      'https://rpc1.aura.network',
      'https://rpc2.aura.network',
    ];
    const error = new NodeUnavailableError('https://rpc.aura.network', attempted);

    expect(error.message).toContain('rpc1.aura.network');
    expect(error.message).toContain('rpc2.aura.network');
    expect(error.attemptedEndpoints).toEqual(attempted);
  });

  it('should include details', () => {
    const details = { reason: 'DNS resolution failed' };
    const error = new NodeUnavailableError('https://rpc.aura.network', [], details);

    expect(error.details).toEqual(details);
  });

  it('should handle empty attempted endpoints', () => {
    const error = new NodeUnavailableError('https://rpc.aura.network');

    expect(error.attemptedEndpoints).toEqual([]);
    expect(error.message).not.toContain('tried:');
  });

  it('should be instanceof NetworkError', () => {
    const error = new NodeUnavailableError('test');

    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe('APIError', () => {
  it('should create error with endpoint', () => {
    const error = new APIError('Resource not found', '/api/credentials/123');

    expect(error.message).toBe('Resource not found');
    expect(error.endpoint).toBe('/api/credentials/123');
    expect(error.code).toBe('API_ERROR');
    expect(error.name).toBe('APIError');
  });

  it('should include statusCode and errorCode', () => {
    const error = new APIError('Invalid request', '/api', 400, 'INVALID_REQUEST');

    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe('INVALID_REQUEST');
  });

  it('should include details', () => {
    const details = { validation: ['field required'] };
    const error = new APIError('Validation failed', '/api', 400, undefined, details);

    expect(error.details).toEqual(details);
  });

  describe('fromAuraResponse', () => {
    it('should create error from Aura response with message', () => {
      const error = APIError.fromAuraResponse('/verify', 400, {
        code: 3,
        message: 'Invalid credential format',
      });

      expect(error.message).toBe('Invalid credential format');
      expect(error.endpoint).toBe('/verify');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('3');
    });

    it('should use default message when not provided', () => {
      const error = APIError.fromAuraResponse('/verify', 500, {
        code: 13,
      });

      expect(error.message).toContain('/verify');
    });

    it('should include response details', () => {
      const error = APIError.fromAuraResponse('/verify', 400, {
        message: 'Error',
        details: { field: 'value' },
      });

      expect(error.details).toEqual({ field: 'value' });
    });

    it('should handle missing errorCode', () => {
      const error = APIError.fromAuraResponse('/verify', 400, {
        message: 'Error',
      });

      expect(error.errorCode).toBeUndefined();
    });
  });

  it('should be instanceof NetworkError', () => {
    const error = new APIError('test', '/api');

    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe('VerificationError', () => {
  it('should create error with reason', () => {
    const error = new VerificationError('Test failed', 'TEST_REASON');

    expect(error.message).toBe('Test failed');
    expect(error.reason).toBe('TEST_REASON');
    expect(error.name).toBe('VerificationError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include details', () => {
    const details = { extra: 'info' };
    const error = new VerificationError('Test', 'REASON', details);

    expect(error.details).toEqual(details);
  });

  describe('invalidPresentation', () => {
    it('should create invalid presentation error', () => {
      const error = VerificationError.invalidPresentation('Missing signature');

      expect(error.message).toContain('Missing signature');
      expect(error.reason).toBe('INVALID_PRESENTATION');
    });

    it('should include details', () => {
      const details = { field: 'signature' };
      const error = VerificationError.invalidPresentation('Missing field', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('revokedCredential', () => {
    it('should create revoked credential error', () => {
      const error = VerificationError.revokedCredential('vc-123');

      expect(error.message).toContain('vc-123');
      expect(error.message).toContain('revoked');
      expect(error.reason).toBe('CREDENTIAL_REVOKED');
      expect(error.details).toEqual({ vcId: 'vc-123' });
    });
  });

  describe('expiredCredential', () => {
    it('should create expired credential error', () => {
      const expDate = new Date('2024-01-15T00:00:00Z');
      const error = VerificationError.expiredCredential('vc-456', expDate);

      expect(error.message).toContain('vc-456');
      expect(error.message).toContain('2024-01-15');
      expect(error.reason).toBe('CREDENTIAL_EXPIRED');
      expect(error.details).toEqual({
        vcId: 'vc-456',
        expirationDate: expDate,
      });
    });
  });

  describe('signatureVerificationFailed', () => {
    it('should create signature verification error', () => {
      const error = VerificationError.signatureVerificationFailed('Invalid curve point');

      expect(error.message).toContain('Invalid curve point');
      expect(error.reason).toBe('SIGNATURE_VERIFICATION_FAILED');
    });
  });
});

describe('RetryExhaustedError', () => {
  it('should create error with operation and attempts', () => {
    const lastError = new Error('Connection refused');
    const error = new RetryExhaustedError('fetchCredential', 3, lastError);

    expect(error.message).toContain('fetchCredential');
    expect(error.message).toContain('3 attempts');
    expect(error.message).toContain('Connection refused');
    expect(error.operation).toBe('fetchCredential');
    expect(error.attempts).toBe(3);
    expect(error.lastError).toBe(lastError);
    expect(error.code).toBe('RETRY_EXHAUSTED');
    expect(error.name).toBe('RetryExhaustedError');
  });

  it('should include lastError in details', () => {
    const lastError = new Error('Network error');
    const error = new RetryExhaustedError('test', 5, lastError);

    expect((error.details as any).lastError).toBe(lastError);
  });

  it('should be instanceof NetworkError', () => {
    const error = new RetryExhaustedError('test', 1, new Error());

    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe('ConfigurationError', () => {
  it('should create error with message', () => {
    const error = new ConfigurationError('Invalid config');

    expect(error.message).toBe('Invalid config');
    expect(error.name).toBe('ConfigurationError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include field when provided', () => {
    const error = new ConfigurationError('Invalid value', 'timeout');

    expect(error.field).toBe('timeout');
  });

  describe('missingRequired', () => {
    it('should create missing required error', () => {
      const error = ConfigurationError.missingRequired('rpcEndpoint');

      expect(error.message).toContain('rpcEndpoint');
      expect(error.message).toContain('Missing required');
      expect(error.field).toBe('rpcEndpoint');
    });
  });

  describe('invalidValue', () => {
    it('should create invalid value error', () => {
      const error = ConfigurationError.invalidValue('timeout', 'must be positive');

      expect(error.message).toContain('timeout');
      expect(error.message).toContain('must be positive');
      expect(error.field).toBe('timeout');
    });
  });
});
