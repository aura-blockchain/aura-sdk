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
  VCStatus,
  AttributeVC,
  DisclosurePolicy,
  DisclosureRequest,
  VCPolicy,
  RegistryStats,
  MintEligibilityResponse,
  VCType,
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
        throw new RetryExhaustedError(`${method} ${url}`, attempt, error as Error);
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
  private async executeRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
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
        throw NetworkError.connectionFailed(error.message, { url, method });
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
        if (data && typeof data === 'object' && 'data' in data) {
          return (data as { data: T }).data;
        }
        return data as T;
      } catch (error) {
        throw NetworkError.invalidResponse('Failed to parse JSON response', { url, error });
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
    throw NetworkError.fromResponse(response.status, response.statusText, errorBody);
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
    if (error instanceof NetworkError && error.code === 'CONNECTION_FAILED') {
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Aligned with aura/vcregistry/v1beta1 proto definitions
 */
export class VCRegistryQueries {
  constructor(private readonly executor: QueryExecutor) {}

  /**
   * Verify presentation - maps to Query.VerifyPresentation
   */
  async verifyPresentation(
    qrCodeData: string,
    verifierAddress?: string
  ): Promise<VerificationResult> {
    const body: VerifyPresentationRequest = {
      qr_code_data: qrCodeData,
      verifier_address: verifierAddress,
    };

    return this.executor.post<VerificationResult>(API_PATHS.vcregistry.verifyPresentation, body);
  }

  /**
   * Get VC by ID - maps to Query.GetVC
   */
  async getVC(vcId: string): Promise<VCRecord | null> {
    try {
      const response = await this.executor.get<
        { vc?: VCRecord; exists?: boolean } | VCRecord | null
      >(API_PATHS.vcregistry.getVC(vcId));

      if (!response) return null;

      if (typeof response === 'object' && 'vc' in response) {
        const wrapped = response as { vc?: VCRecord; exists?: boolean };
        if (wrapped.exists === false) return null;
        return wrapped.vc ?? null;
      }

      if (typeof response === 'object' && 'vc_id' in response) {
        return response as VCRecord;
      }

      return null;
    } catch (error) {
      // Handle 404 gracefully
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List VCs for a user - maps to Query.ListUserVCs
   */
  async listUserVCs(
    holderAddress: string,
    options?: {
      statusFilter?: VCStatus;
      typeFilter?: VCType;
      pagination?: { key?: string; limit?: number };
    }
  ): Promise<{ vcs: VCRecord[]; pagination?: { nextKey?: string } }> {
    let path = API_PATHS.vcregistry.listUserVCs(holderAddress);

    // Add query params
    const params = new URLSearchParams();
    if (options?.statusFilter !== undefined) {
      params.set('status_filter', options.statusFilter.toString());
    }
    if (options?.typeFilter !== undefined) {
      params.set('type_filter', options.typeFilter.toString());
    }
    if (options?.pagination?.key) {
      params.set('pagination.key', options.pagination.key);
    }
    if (options?.pagination?.limit) {
      params.set('pagination.limit', options.pagination.limit.toString());
    }

    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }

    const response = await this.executor.get<{
      vcs: VCRecord[];
      pagination?: { next_key?: string };
    }>(path);

    return {
      vcs: response.vcs ?? [],
      pagination: response.pagination ? { nextKey: response.pagination.next_key } : undefined,
    };
  }

  /**
   * List VCs by holder DID - maps to Query.ListVCsByHolder
   */
  async listVCsByHolder(holderDid: string): Promise<{ vcs: VCRecord[] }> {
    return this.executor.get<{ vcs: VCRecord[] }>(API_PATHS.vcregistry.listVCsByHolder(holderDid));
  }

  /**
   * List VCs by issuer DID - maps to Query.ListVCsByIssuer
   */
  async listVCsByIssuer(issuerDid: string): Promise<{ vcs: VCRecord[] }> {
    return this.executor.get<{ vcs: VCRecord[] }>(API_PATHS.vcregistry.listVCsByIssuer(issuerDid));
  }

  /**
   * Check VC status - maps to Query.CheckVCStatus
   */
  async checkVCStatus(vcId: string): Promise<VCStatusResponse> {
    try {
      const response = await this.executor.get<
        VCStatusResponse & {
          exists?: boolean;
          vc_id?: string;
          revoked?: boolean;
          expired?: boolean;
        }
      >(API_PATHS.vcregistry.getVCStatus(vcId));

      return {
        ...response,
        exists: response.exists ?? true,
        vc_id: response.vc_id ?? vcId,
        revoked: response.revoked ?? false,
        expired: response.expired ?? false,
      } as VCStatusResponse;
    } catch (error) {
      // Handle 404 gracefully (VC not found = doesn't exist)
      if (
        (error instanceof APIError && error.statusCode === 404) ||
        (error instanceof NetworkError && error.statusCode === 404)
      ) {
        return {
          status: VCStatus.UNSPECIFIED,
          valid: false,
          exists: false,
          vc_id: vcId,
          revoked: false,
          expired: false,
        };
      }
      throw error;
    }
  }

  /**
   * Batch check VC status - maps to Query.BatchVCStatus
   */
  async batchCheckVCStatus(vcIds: string[]): Promise<Map<string, VCStatusResponse>> {
    const results = new Map<string, VCStatusResponse>();

    const tasks = vcIds.map(async (id) => {
      try {
        const status = await this.checkVCStatus(id);
        results.set(id, status);
      } catch {
        results.set(id, { status: VCStatus.UNSPECIFIED, valid: false, exists: false, vc_id: id });
      }
    });

    await Promise.all(tasks);
    return results;
  }

  /**
   * Resolve DID - maps to Query.ResolveDID
   */
  async resolveDID(did: string): Promise<DIDResolutionResponse | null> {
    try {
      const response = await this.executor.get<{
        did_document: DIDDocument;
        exists: boolean;
        credentials?: VCRecord[];
      }>(API_PATHS.vcregistry.resolveDID(did));

      if (!response.exists) {
        return null;
      }

      return {
        did_document: response.did_document,
        metadata: {},
      };
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get DIDs by address - maps to Query.GetDIDByAddress
   */
  async getDIDsByAddress(controller: string): Promise<string[]> {
    const response = await this.executor.get<{ dids: string[] }>(
      API_PATHS.vcregistry.getDIDByAddress(controller)
    );

    return response.dids ?? [];
  }

  /**
   * Get VC policy - maps to Query.GetVCPolicy
   */
  async getVCPolicy(vcTypeName: string): Promise<VCPolicy | null> {
    try {
      const response = await this.executor.get<{ policy: VCPolicy; exists: boolean }>(
        API_PATHS.vcregistry.getVCPolicy(vcTypeName)
      );

      if (!response.exists) {
        return null;
      }

      return response.policy;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List VC policies - maps to Query.ListVCPolicies
   */
  async listVCPolicies(options?: {
    statusFilter?: number;
    pagination?: { key?: string; limit?: number };
  }): Promise<{ policies: VCPolicy[]; pagination?: { nextKey?: string } }> {
    let path = API_PATHS.vcregistry.listVCPolicies;

    const params = new URLSearchParams();
    if (options?.statusFilter !== undefined) {
      params.set('status_filter', options.statusFilter.toString());
    }
    if (options?.pagination?.key) {
      params.set('pagination.key', options.pagination.key);
    }
    if (options?.pagination?.limit) {
      params.set('pagination.limit', options.pagination.limit.toString());
    }

    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }

    const response = await this.executor.get<{
      policies: VCPolicy[];
      pagination?: { next_key?: string };
    }>(path);

    return {
      policies: response.policies ?? [],
      pagination: response.pagination ? { nextKey: response.pagination.next_key } : undefined,
    };
  }

  /**
   * Check revocation status - maps to Query.CheckRevocation
   */
  async checkRevocation(vcId: string): Promise<{
    revoked: boolean;
    merkleProof?: string;
  }> {
    const response = await this.executor.get<{
      revoked: boolean;
      record?: unknown;
      merkle_proof?: string;
    }>(API_PATHS.vcregistry.checkRevocation(vcId));

    return {
      revoked: response.revoked,
      merkleProof: response.merkle_proof,
    };
  }

  /**
   * Validate mint eligibility - maps to Query.ValidateMintEligibility
   */
  async validateMintEligibility(
    holderAddress: string,
    vcType: VCType
  ): Promise<MintEligibilityResponse> {
    const response = await this.executor.get<MintEligibilityResponse>(
      API_PATHS.vcregistry.validateMintEligibility(holderAddress, vcType)
    );

    return response;
  }

  /**
   * Get registry stats - maps to Query.Stats
   */
  async getStats(): Promise<RegistryStats> {
    const response = await this.executor.get<RegistryStats>(API_PATHS.vcregistry.stats);
    return response;
  }

  /**
   * Get module params - maps to Query.Params
   */
  async getParams(): Promise<Record<string, unknown>> {
    const response = await this.executor.get<{ params: Record<string, unknown> }>(
      API_PATHS.vcregistry.params
    );
    return response.params;
  }

  // ============================
  // ATTRIBUTE VC QUERIES
  // ============================

  /**
   * Get attribute VC - maps to Query.GetAttributeVC
   */
  async getAttributeVC(attributeVcId: string): Promise<AttributeVC | null> {
    try {
      const response = await this.executor.get<{ attribute_vc: AttributeVC; exists: boolean }>(
        API_PATHS.vcregistry.getAttributeVC(attributeVcId)
      );

      if (!response.exists) {
        return null;
      }

      return response.attribute_vc;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List attribute VCs for a user - maps to Query.ListAttributeVCs
   */
  async listAttributeVCs(holderAddress: string, filterTypes?: number[]): Promise<AttributeVC[]> {
    let path = API_PATHS.vcregistry.listAttributeVCs(holderAddress);

    if (filterTypes && filterTypes.length > 0) {
      const params = new URLSearchParams();
      filterTypes.forEach((t) => params.append('filter_types', t.toString()));
      path += `?${params.toString()}`;
    }

    const response = await this.executor.get<{ attribute_vcs: AttributeVC[] }>(path);
    return response.attribute_vcs ?? [];
  }

  /**
   * Get disclosure policy - maps to Query.GetDisclosurePolicy
   */
  async getDisclosurePolicy(holderAddress: string): Promise<DisclosurePolicy | null> {
    try {
      const response = await this.executor.get<{ policy: DisclosurePolicy; exists: boolean }>(
        API_PATHS.vcregistry.getDisclosurePolicy(holderAddress)
      );

      if (!response.exists) {
        return null;
      }

      return response.policy;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get disclosure request - maps to Query.GetDisclosureRequest
   */
  async getDisclosureRequest(requestId: string): Promise<DisclosureRequest | null> {
    try {
      const response = await this.executor.get<{ request: DisclosureRequest; exists: boolean }>(
        API_PATHS.vcregistry.getDisclosureRequest(requestId)
      );

      if (!response.exists) {
        return null;
      }

      return response.request;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}

/**
 * Query functions for Aura Identity module
 * Aligned with aura/identity/v1beta1 proto definitions
 */
export class IdentityQueries {
  constructor(private readonly executor: QueryExecutor) {}

  /**
   * Resolve DID document - maps to Query.ResolveDID
   */
  async resolveDID(did: string): Promise<DIDDocument | null> {
    try {
      const response = await this.executor.get<
        { did_document?: DIDDocument; exists?: boolean } | DIDDocument
      >(API_PATHS.identity.resolveDID(did));

      if (response && 'did_document' in (response as Record<string, unknown>)) {
        const wrapped = response as { did_document?: DIDDocument; exists?: boolean };
        if (wrapped.exists === false) return null;
        return wrapped.did_document ?? null;
      }

      if (response && typeof response === 'object') {
        return response as DIDDocument;
      }

      return null;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get verification methods for a DID
   */
  async getVerificationMethods(did: string): Promise<unknown[]> {
    const response = await this.executor.get<{ methods?: unknown[] } | unknown[]>(
      API_PATHS.identity.getVerificationMethods(did)
    );

    if (Array.isArray(response)) return response;
    return response.methods ?? [];
  }

  /**
   * Get identity record by DID - maps to Query.IdentityRecord
   */
  async getIdentity(did: string): Promise<unknown | null> {
    try {
      const response = await this.executor.get<{ record: unknown }>(
        API_PATHS.identity.getIdentity(did)
      );
      return response.record ?? null;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get identity record by address - maps to Query.IdentityRecordByAddress
   */
  async getIdentityByAddress(address: string): Promise<unknown | null> {
    try {
      const response = await this.executor.get<{ record: unknown }>(
        API_PATHS.identity.getIdentityByAddress(address)
      );
      return response.record ?? null;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all identity records - maps to Query.AllIdentityRecords
   */
  async listIdentities(pagination?: {
    key?: string;
    limit?: number;
  }): Promise<{ records: unknown[]; pagination?: { nextKey?: string } }> {
    let path = API_PATHS.identity.listIdentities;

    if (pagination) {
      const params = new URLSearchParams();
      if (pagination.key) params.set('pagination.key', pagination.key);
      if (pagination.limit) params.set('pagination.limit', pagination.limit.toString());
      const queryString = params.toString();
      if (queryString) path += `?${queryString}`;
    }

    const response = await this.executor.get<{
      records: unknown[];
      pagination?: { next_key?: string };
    }>(path);

    return {
      records: response.records ?? [],
      pagination: response.pagination ? { nextKey: response.pagination.next_key } : undefined,
    };
  }

  /**
   * Get change request - maps to Query.ChangeRequest
   */
  async getChangeRequest(requestId: string): Promise<unknown | null> {
    try {
      const response = await this.executor.get<{ request: unknown }>(
        API_PATHS.identity.getChangeRequest(requestId)
      );
      return response.request ?? null;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get change history for a DID - maps to Query.ChangeHistory
   */
  async getChangeHistory(
    did: string,
    pagination?: {
      key?: string;
      limit?: number;
    }
  ): Promise<{ entries: unknown[]; pagination?: { nextKey?: string } }> {
    let path = API_PATHS.identity.getChangeHistory(did);

    if (pagination) {
      const params = new URLSearchParams();
      if (pagination.key) params.set('pagination.key', pagination.key);
      if (pagination.limit) params.set('pagination.limit', pagination.limit.toString());
      const queryString = params.toString();
      if (queryString) path += `?${queryString}`;
    }

    const response = await this.executor.get<{
      entries: unknown[];
      pagination?: { next_key?: string };
    }>(path);

    return {
      entries: response.entries ?? [],
      pagination: response.pagination ? { nextKey: response.pagination.next_key } : undefined,
    };
  }

  /**
   * Check if address has permission - maps to Query.HasPermission
   */
  async hasPermission(
    address: string,
    permission: string
  ): Promise<{
    hasPermission: boolean;
    roles: string[];
  }> {
    const response = await this.executor.get<{
      has_permission: boolean;
      roles: string[];
    }>(API_PATHS.identity.hasPermission(address, permission));

    return {
      hasPermission: response.has_permission,
      roles: response.roles ?? [],
    };
  }

  /**
   * Get role assignments for address - maps to Query.RoleAssignments
   */
  async getRoleAssignments(address: string): Promise<unknown[]> {
    const response = await this.executor.get<{ assignments: unknown[] }>(
      API_PATHS.identity.getRoleAssignments(address)
    );
    return response.assignments ?? [];
  }

  /**
   * Get session by ID - maps to Query.Session
   */
  async getSession(sessionId: string): Promise<unknown | null> {
    try {
      const response = await this.executor.get<{ session: unknown }>(
        API_PATHS.identity.getSession(sessionId)
      );
      return response.session ?? null;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get sessions by address - maps to Query.SessionsByAddress
   */
  async getSessionsByAddress(
    address: string,
    pagination?: {
      key?: string;
      limit?: number;
    }
  ): Promise<{ sessions: unknown[]; pagination?: { nextKey?: string } }> {
    let path = API_PATHS.identity.getSessionsByAddress(address);

    if (pagination) {
      const params = new URLSearchParams();
      if (pagination.key) params.set('pagination.key', pagination.key);
      if (pagination.limit) params.set('pagination.limit', pagination.limit.toString());
      const queryString = params.toString();
      if (queryString) path += `?${queryString}`;
    }

    const response = await this.executor.get<{
      sessions: unknown[];
      pagination?: { next_key?: string };
    }>(path);

    return {
      sessions: response.sessions ?? [],
      pagination: response.pagination ? { nextKey: response.pagination.next_key } : undefined,
    };
  }

  /**
   * Get audit logs - maps to Query.AuditLogs
   */
  async getAuditLogs(pagination?: {
    key?: string;
    limit?: number;
  }): Promise<{ logs: unknown[]; pagination?: { nextKey?: string } }> {
    let path = API_PATHS.identity.getAuditLogs;

    if (pagination) {
      const params = new URLSearchParams();
      if (pagination.key) params.set('pagination.key', pagination.key);
      if (pagination.limit) params.set('pagination.limit', pagination.limit.toString());
      const queryString = params.toString();
      if (queryString) path += `?${queryString}`;
    }

    const response = await this.executor.get<{
      logs: unknown[];
      pagination?: { next_key?: string };
    }>(path);

    return {
      logs: response.logs ?? [],
      pagination: response.pagination ? { nextKey: response.pagination.next_key } : undefined,
    };
  }

  /**
   * Get module params - maps to Query.Params
   */
  async getParams(): Promise<Record<string, unknown>> {
    const response = await this.executor.get<{ params: Record<string, unknown> }>(
      API_PATHS.identity.params
    );
    return response.params;
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
    const response = await this.executor.get<APIResponse<unknown>>(API_PATHS.chain.nodeInfo);

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
