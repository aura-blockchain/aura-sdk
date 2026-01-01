/**
 * Query Implementations for Aura REST API
 *
 * Provides REST API query functions with retry logic and error handling.
 */

import {
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  RetryExhaustedError,
} from './errors.js';
import {
  VerificationResult,
  VCStatusResponse,
  VCRecord,
  DIDDocument,
  DIDResolutionResponse,
  APIResponse,
  VerifyPresentationRequest,
  RetryConfig,
} from './types.js';
import { API_PATHS, DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT } from './endpoints.js';

/**
 * Query executor with timeout and retry logic
 */
export class QueryExecutor {
  constructor(
    private readonly baseURL: string,
    private readonly timeout: number = DEFAULT_TIMEOUT,
    private readonly retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {}

  /**
   * Execute a GET request with retry logic
   */
  async get<T>(path: string): Promise<T> {
    const url = this.buildURL(path);
    return this.executeWithRetry('GET', url);
  }

  /**
   * Execute a POST request with retry logic
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.buildURL(path);
    return this.executeWithRetry('POST', url, body);
  }

  /**
   * Execute HTTP request with timeout and retry
   */
  private async executeWithRetry<T>(
    method: string,
    url: string,
    body?: unknown,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await this.executeRequest<T>(method, url, body);
    } catch (error) {
      // Check if we should retry
      if (attempt >= this.retryConfig.maxAttempts) {
        throw new RetryExhaustedError(
          `${method} ${url}`,
          attempt,
          error as Error
        );
      }

      // Check if error is retryable
      if (!this.isRetryableError(error)) {
        throw error;
      }

      // Calculate backoff delay
      const delay = this.calculateBackoff(attempt);

      // Wait before retry
      await this.sleep(delay);

      // Retry request
      return this.executeWithRetry<T>(method, url, body, attempt + 1);
    }
  }

  /**
   * Execute single HTTP request with timeout
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      };

      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      // Clear timeout
      clearTimeout(timeoutId);

      // Parse response
      return await this.handleResponse<T>(response, url);
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(this.timeout, `${method} ${url}`);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw NetworkError.connectionFailed(
          error.message,
          { url, method }
        );
      }

      throw error;
    }
  }

  /**
   * Handle HTTP response and extract data
   */
  private async handleResponse<T>(response: Response, url: string): Promise<T> {
    // Check for successful response
    if (response.ok) {
      try {
        const data = await response.json();
        return data as T;
      } catch (error) {
        throw NetworkError.invalidResponse(
          'Failed to parse JSON response',
          { url, error }
        );
      }
    }

    // Handle error responses
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      // Response body is not JSON
      errorBody = await response.text();
    }

    // Check if response matches Aura API error format
    // Support both { message: ... } and { error: { message: ... } } formats
    let apiError: { code?: number; message: string; details?: unknown } | null = null;

    if (errorBody && typeof errorBody === 'object') {
      if ('message' in errorBody) {
        apiError = errorBody as { code?: number; message: string; details?: unknown };
      } else if (
        'error' in errorBody &&
        typeof (errorBody as { error: unknown }).error === 'object' &&
        (errorBody as { error: { message?: unknown } }).error?.message
      ) {
        // Handle nested error format: { error: { message: ... } }
        const nested = (errorBody as { error: { message: string; code?: number } }).error;
        apiError = { message: nested.message, code: nested.code };
      }
    }

    if (apiError) {
      throw APIError.fromAuraResponse(url, response.status, apiError);
    }

    // Generic HTTP error
    throw NetworkError.fromResponse(
      response.status,
      response.statusText,
      errorBody
    );
  }

  /**
   * Check if error should trigger retry
   */
  private isRetryableError(error: unknown): boolean {
    // Retry on timeout
    if (error instanceof TimeoutError && this.retryConfig.retryOnTimeout) {
      return true;
    }

    // Retry on specific HTTP status codes
    if (error instanceof NetworkError && error.statusCode) {
      return this.retryConfig.retryableStatusCodes.includes(error.statusCode);
    }

    // Retry on connection failures
    if (
      error instanceof NetworkError &&
      error.code === 'CONNECTION_FAILED'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );
    // Add jitter (random 0-20% of delay)
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build full URL from path
   */
  private buildURL(path: string): string {
    const base = this.baseURL.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
}

/**
 * Query functions for Aura VC Registry module
 */
export class VCRegistryQueries {
  constructor(private readonly executor: QueryExecutor) {}

  /**
   * Verify a presentation
   */
  async verifyPresentation(
    qrCodeData: string,
    verifierAddress?: string
  ): Promise<VerificationResult> {
    const request: VerifyPresentationRequest = {
      presentation_data: qrCodeData,
      verifier_did: verifierAddress,
      options: {
        check_revocation: true,
        check_expiration: true,
        verify_signature: true,
      },
    };

    const response = await this.executor.post<APIResponse<VerificationResult>>(
      API_PATHS.vcregistry.verifyPresentation,
      request
    );

    if (response.error) {
      throw new APIError(
        response.error.message,
        API_PATHS.vcregistry.verifyPresentation,
        response.status,
        response.error.code?.toString(),
        response.error.details
      );
    }

    if (!response.data) {
      throw NetworkError.invalidResponse(
        'Missing data in verification response',
        response
      );
    }

    return response.data;
  }

  /**
   * Get VC by ID
   */
  async getVC(vcId: string): Promise<VCRecord | null> {
    try {
      const response = await this.executor.get<APIResponse<{ vc: VCRecord }>>(
        API_PATHS.vcregistry.getVC(vcId)
      );

      if (response.error) {
        // If VC not found, return null instead of throwing
        if (response.status === 404) {
          return null;
        }
        throw new APIError(
          response.error.message,
          API_PATHS.vcregistry.getVC(vcId),
          response.status,
          response.error.code?.toString(),
          response.error.details
        );
      }

      return response.data?.vc ?? null;
    } catch (error) {
      // Handle 404 gracefully
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check VC status
   */
  async checkVCStatus(vcId: string): Promise<VCStatusResponse> {
    try {
      const response = await this.executor.get<APIResponse<VCStatusResponse>>(
        API_PATHS.vcregistry.getVCStatus(vcId)
      );

      if (response.error) {
        throw new APIError(
          response.error.message,
          API_PATHS.vcregistry.getVCStatus(vcId),
          response.status,
          response.error.code?.toString(),
          response.error.details
        );
      }

      if (!response.data) {
        // If VC doesn't exist, return status indicating that
        return {
          vc_id: vcId,
          exists: false,
          revoked: false,
          expired: false,
        };
      }

      return response.data;
    } catch (error) {
      // Handle 404 gracefully (VC not found = doesn't exist)
      if (
        (error instanceof APIError && error.statusCode === 404) ||
        (error instanceof NetworkError && error.statusCode === 404)
      ) {
        return {
          vc_id: vcId,
          exists: false,
          revoked: false,
          expired: false,
        };
      }
      throw error;
    }
  }

  /**
   * Batch check VC status for multiple VCs
   */
  async batchCheckVCStatus(vcIds: string[]): Promise<Map<string, VCStatusResponse>> {
    const results = new Map<string, VCStatusResponse>();

    // Execute queries in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < vcIds.length; i += concurrency) {
      const batch = vcIds.slice(i, i + concurrency);
      const promises = batch.map(async (vcId) => {
        try {
          const status = await this.checkVCStatus(vcId);
          return { vcId, status };
        } catch (error) {
          // On error, return error status
          return {
            vcId,
            status: {
              vc_id: vcId,
              exists: false,
              revoked: false,
              expired: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            } as VCStatusResponse,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ vcId, status }) => {
        results.set(vcId, status);
      });
    }

    return results;
  }
}

/**
 * Query functions for Aura Identity module
 */
export class IdentityQueries {
  constructor(private readonly executor: QueryExecutor) {}

  /**
   * Resolve DID document
   */
  async resolveDID(did: string): Promise<DIDDocument> {
    const response = await this.executor.get<APIResponse<DIDResolutionResponse>>(
      API_PATHS.identity.resolveDID(did)
    );

    if (response.error) {
      throw new APIError(
        response.error.message,
        API_PATHS.identity.resolveDID(did),
        response.status,
        response.error.code?.toString(),
        response.error.details
      );
    }

    if (!response.data?.did_document) {
      throw NetworkError.invalidResponse(
        'Missing DID document in response',
        response
      );
    }

    return response.data.did_document;
  }
}

/**
 * Health check queries
 */
export class HealthQueries {
  constructor(private readonly executor: QueryExecutor) {}

  /**
   * Check if node is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.executor.get(API_PATHS.chain.syncing);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get node info
   */
  async getNodeInfo(): Promise<unknown> {
    const response = await this.executor.get<APIResponse<unknown>>(
      API_PATHS.chain.nodeInfo
    );

    if (response.error) {
      throw new APIError(
        response.error.message,
        API_PATHS.chain.nodeInfo,
        response.status,
        response.error.code?.toString(),
        response.error.details
      );
    }

    return response.data;
  }
}
