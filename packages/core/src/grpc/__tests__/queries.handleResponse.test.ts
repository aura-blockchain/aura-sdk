/**
 * QueryExecutor response-handling tests
 *
 * Covers success unwrapping, Aura API error shapes, invalid JSON,
 * and non-retryable failures (should not loop).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryExecutor } from '../queries.js';
import { APIError, NetworkError, RetryExhaustedError } from '../errors.js';

const realFetch = global.fetch;

// Minimal deterministic retry config
const retryConfig = {
  maxAttempts: 1,
  initialDelay: 1,
  maxDelay: 1,
  backoffMultiplier: 1,
  retryOnTimeout: false,
  retryableStatusCodes: [408, 500, 503],
};

describe('QueryExecutor handleResponse', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let executor: QueryExecutor;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    executor = new QueryExecutor('https://api.example.com', 500, retryConfig);
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('unwraps Aura responses with data field', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { hello: 'world' } }),
    });

    const result = await executor.get<{ hello: string }>('/hello');

    expect(result).toEqual({ hello: 'world' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/hello');
  });

  it('returns raw JSON when no data wrapper is present', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', height: 123 }),
    });

    const result = await executor.get<{ status: string; height: number }>('/status');
    expect(result).toEqual({ status: 'ok', height: 123 });
  });

  it('converts nested Aura error payload to APIError (wrapped in RetryExhausted)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: { message: 'invalid request', code: 42 },
      }),
    });

    const err = await executor.get('/bad').catch((e) => e);

    expect(err).toBeInstanceOf(RetryExhaustedError);
    expect((err as RetryExhaustedError).lastError).toBeInstanceOf(APIError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('wraps JSON parse failures as NetworkError(INVALID_RESPONSE)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('boom');
      },
    });

    const err = await executor.get('/broken').catch((e) => e as RetryExhaustedError);
    expect(err).toBeInstanceOf(RetryExhaustedError);
    expect((err as RetryExhaustedError).lastError).toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('maps TypeError network failures to NetworkError(CONNECTION_FAILED)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const err = await executor.get('/down').catch((e) => e as RetryExhaustedError);
    expect(err).toBeInstanceOf(RetryExhaustedError);
    expect((err as RetryExhaustedError).lastError).toMatchObject({ code: 'CONNECTION_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
