import { describe, it, expect, vi } from 'vitest';
import { QueryExecutor } from '../queries.js';
import { RetryExhaustedError, TimeoutError } from '../errors.js';

describe('QueryExecutor retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('retries retryable errors then throws RetryExhaustedError', async () => {
    const fetchMock = global.fetch as unknown as vi.Mock;
    fetchMock.mockRejectedValue(new TypeError('network down'));
    const executor = new QueryExecutor('https://api.example.com', 100, {
      maxAttempts: 3,
      initialDelay: 1,
      maxDelay: 2,
      backoffMultiplier: 1,
      retryOnTimeout: true,
      retryableStatusCodes: [408, 500, 503],
    });

    const promise = executor.get('/status');
    promise.catch(() => {}); // prevent unhandled rejection warnings
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toBeInstanceOf(RetryExhaustedError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('times out and surfaces TimeoutError (wrapped in RetryExhausted)', async () => {
    const fetchMock = global.fetch as unknown as vi.Mock;
    fetchMock.mockImplementation((_url: string, opts: any) => {
      const signal: AbortSignal | undefined = opts?.signal;
      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const executor = new QueryExecutor('https://api.example.com', 10, {
      maxAttempts: 2,
      initialDelay: 1,
      maxDelay: 2,
      backoffMultiplier: 1,
      retryOnTimeout: true,
      retryableStatusCodes: [408, 500, 503],
    });

    const promise = executor.get('/slow');
    promise.catch(() => {});
    await vi.runAllTimersAsync(); // trigger the abort timeout
    const err = await promise.catch((e) => e);
    expect(err).toBeInstanceOf(RetryExhaustedError);
    expect((err as RetryExhaustedError).lastError).toBeInstanceOf(TimeoutError);
  });
});
