/**
 * Mock gRPC/REST Server for Integration Testing
 *
 * Provides a configurable mock server that simulates Aura blockchain responses
 * including DID resolution, credential verification, and revocation checks.
 */

import { VCStatus, DIDDocument } from '../../verification/types.js';
import { getMockVCStatus } from './test-credentials.js';

export interface MockServerConfig {
  /** Network latency simulation in milliseconds */
  latency?: number;
  /** Probability of network errors (0-1) */
  errorRate?: number;
  /** Whether to simulate timeouts */
  simulateTimeouts?: boolean;
  /** Timeout duration in milliseconds */
  timeoutDuration?: number;
  /** Custom response overrides */
  customResponses?: Record<string, unknown>;
}

/**
 * Mock blockchain server for testing
 */
export class MockBlockchainServer {
  private config: Required<MockServerConfig>;
  private requestCount = 0;
  private activeRequests = new Map<string, boolean>();

  constructor(config: MockServerConfig = {}) {
    this.config = {
      latency: config.latency || 50,
      errorRate: config.errorRate || 0,
      simulateTimeouts: config.simulateTimeouts || false,
      timeoutDuration: config.timeoutDuration || 30000,
      customResponses: config.customResponses || {},
    };
  }

  /**
   * Simulate network latency
   */
  private async simulateLatency(): Promise<void> {
    if (this.config.latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latency));
    }
  }

  /**
   * Check if request should error
   */
  private shouldError(): boolean {
    return Math.random() < this.config.errorRate;
  }

  /**
   * Check if request should timeout
   */
  private shouldTimeout(): boolean {
    return this.config.simulateTimeouts && Math.random() < 0.1;
  }

  /**
   * Query DID document
   */
  async queryDIDDocument(did: string): Promise<DIDDocument | null> {
    this.requestCount++;
    const requestId = `did-${did}-${Date.now()}`;
    this.activeRequests.set(requestId, true);

    try {
      await this.simulateLatency();

      if (this.shouldError()) {
        throw new Error('Network error: Failed to query DID document');
      }

      if (this.shouldTimeout()) {
        await new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeoutDuration)
        );
      }

      // Check for custom response
      if (this.config.customResponses[`did:${did}`]) {
        return this.config.customResponses[`did:${did}`] as DIDDocument;
      }

      // Return mock DID document
      return {
        id: did,
        verificationMethod: [
          {
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
          },
        ] as any,
        authentication: [`${did}#key-1`],
        service: [
          {
            id: `${did}#credential-service`,
            type: 'CredentialService',
            serviceEndpoint: 'https://testnet-api.aurablockchain.org/aura/vcregistry/v1beta1',
          },
        ],
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Query VC status
   */
  async queryVCStatus(vcId: string): Promise<VCStatus> {
    this.requestCount++;
    const requestId = `vc-${vcId}-${Date.now()}`;
    this.activeRequests.set(requestId, true);

    try {
      await this.simulateLatency();

      if (this.shouldError()) {
        throw new Error('Network error: Failed to query VC status');
      }

      if (this.shouldTimeout()) {
        await new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeoutDuration)
        );
      }

      // Check for custom response
      if (this.config.customResponses[`vc:${vcId}`]) {
        return this.config.customResponses[`vc:${vcId}`] as VCStatus;
      }

      // Return mock status based on VC ID
      return getMockVCStatus(vcId);
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Query blockchain height
   */
  async queryHeight(): Promise<number> {
    await this.simulateLatency();

    if (this.shouldError()) {
      throw new Error('Network error: Failed to query height');
    }

    return 12345678;
  }

  /**
   * Query chain ID
   */
  async queryChainId(): Promise<string> {
    await this.simulateLatency();

    if (this.shouldError()) {
      throw new Error('Network error: Failed to query chain ID');
    }

    return 'aura-mvp-1';
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      activeRequests: this.activeRequests.size,
      config: this.config,
    };
  }

  /**
   * Reset server state
   */
  reset() {
    this.requestCount = 0;
    this.activeRequests.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MockServerConfig>) {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create a mock server with default settings
 */
export function createMockServer(config?: MockServerConfig): MockBlockchainServer {
  return new MockBlockchainServer(config);
}

/**
 * Create a mock server that simulates network errors
 */
export function createUnstableServer(): MockBlockchainServer {
  return new MockBlockchainServer({
    latency: 100,
    errorRate: 0.3,
    simulateTimeouts: true,
  });
}

/**
 * Create a mock server with fast responses (no latency)
 */
export function createFastServer(): MockBlockchainServer {
  return new MockBlockchainServer({
    latency: 0,
    errorRate: 0,
    simulateTimeouts: false,
  });
}

/**
 * Create a mock server with slow responses
 */
export function createSlowServer(): MockBlockchainServer {
  return new MockBlockchainServer({
    latency: 2000,
    errorRate: 0,
    simulateTimeouts: false,
  });
}
