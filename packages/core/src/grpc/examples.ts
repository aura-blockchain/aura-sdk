/**
 * Usage Examples for Aura Client
 *
 * Demonstrates practical usage patterns for the Aura blockchain client.
 */

import {
  AuraClient,
  createAuraClient,
  connectAuraClient,
  NetworkError,
  TimeoutError,
  NodeUnavailableError,
  APIError,
  VerificationError,
} from './index.js';

/**
 * Example 1: Basic verification workflow
 */
export async function basicVerificationExample() {
  // Connect to testnet
  const client = await connectAuraClient('testnet');

  try {
    // Simulate QR code data (in real app, this comes from scanning QR)
    const qrCodeData = 'base64_encoded_presentation_data';

    // Verify the presentation
    const result = await client.verifyPresentation(qrCodeData);

    if (result.verified) {
      console.log('✓ Presentation verified successfully');
      console.log('  Holder:', result.holder_did);
      console.log('  Credentials:', result.credentials.length);
      console.log('  Disclosed attributes:', result.disclosed_attributes);

      // Check each credential
      for (const cred of result.credentials) {
        if (cred.valid) {
          console.log(`  ✓ VC ${cred.vc_id}: Valid`);
        } else {
          console.log(`  ✗ VC ${cred.vc_id}: Invalid`);
          console.log(`    Errors:`, cred.errors);
        }
      }
    } else {
      console.log('✗ Presentation verification failed');
      console.log('  Errors:', result.errors);
      console.log('  Warnings:', result.warnings);
    }
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 2: Check credential status
 */
export async function checkCredentialStatusExample() {
  const client = await connectAuraClient('testnet');

  try {
    const vcId = 'vc_example_123';
    const status = await client.checkVCStatus(vcId);

    console.log(`VC ${vcId} Status:`);
    console.log('  Exists:', status.exists);
    console.log('  Revoked:', status.revoked);
    console.log('  Expired:', status.expired);

    if (status.vc_record) {
      console.log('  Holder:', status.vc_record.holder_did);
      console.log('  Issuer:', status.vc_record.issuer_did);
      console.log('  Issued:', new Date(status.vc_record.issued_at * 1000));

      if (status.vc_record.expires_at > 0) {
        console.log('  Expires:', new Date(status.vc_record.expires_at * 1000));
      }
    }
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 3: Batch check multiple credentials
 */
export async function batchCheckExample() {
  const client = await connectAuraClient('testnet');

  try {
    // Check status of multiple VCs at once
    const vcIds = [
      'vc_identity_001',
      'vc_identity_002',
      'vc_identity_003',
      'vc_identity_004',
      'vc_identity_005',
    ];

    console.log(`Checking status of ${vcIds.length} credentials...`);
    const results = await client.batchCheckVCStatus(vcIds);

    let existCount = 0;
    let revokedCount = 0;
    let expiredCount = 0;

    for (const [vcId, status] of results) {
      if (status.exists) existCount++;
      if (status.revoked) revokedCount++;
      if (status.expired) expiredCount++;

      console.log(`${vcId}:`, {
        exists: status.exists,
        revoked: status.revoked,
        expired: status.expired,
      });
    }

    console.log('\nSummary:');
    console.log(`  Total: ${vcIds.length}`);
    console.log(`  Exist: ${existCount}`);
    console.log(`  Revoked: ${revokedCount}`);
    console.log(`  Expired: ${expiredCount}`);
    console.log(`  Valid: ${existCount - revokedCount - expiredCount}`);
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 4: Resolve DID and inspect public keys
 */
export async function resolveDIDExample() {
  const client = await connectAuraClient('testnet');

  try {
    const did = 'did:aura:example123';
    const didDoc = await client.resolveDID(did);

    console.log('DID Document:');
    console.log('  ID:', didDoc.id);

    if (didDoc.controller) {
      console.log('  Controller:', didDoc.controller);
    }

    if (didDoc.verificationMethod && didDoc.verificationMethod.length > 0) {
      console.log(`  Verification Methods: ${didDoc.verificationMethod.length}`);

      for (const vm of didDoc.verificationMethod) {
        console.log(`    - ${vm.id}`);
        console.log(`      Type: ${vm.type}`);
        console.log(`      Controller: ${vm.controller}`);

        if (vm.publicKeyMultibase) {
          console.log(`      Public Key: ${vm.publicKeyMultibase.substring(0, 20)}...`);
        }
      }
    }

    if (didDoc.service && didDoc.service.length > 0) {
      console.log(`  Services: ${didDoc.service.length}`);
      for (const service of didDoc.service) {
        console.log(`    - ${service.id} (${service.type})`);
      }
    }
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 5: Advanced error handling
 */
export async function errorHandlingExample() {
  const client = createAuraClient('testnet', {
    timeout: 5000, // 5 second timeout
    retryConfig: {
      maxAttempts: 3,
      initialDelay: 1000,
    },
  });

  try {
    // Connect with error handling
    try {
      await client.connect();
      console.log('✓ Connected to Aura testnet');
    } catch (error) {
      if (error instanceof NodeUnavailableError) {
        console.error('✗ Cannot connect to Aura node');
        console.error('  Endpoint:', error.endpoint);
        console.error('  This might be a network issue or the node is down');
        return;
      }
      throw error;
    }

    // Perform operations with detailed error handling
    try {
      const qrData = 'invalid_qr_data';
      const result = await client.verifyPresentation(qrData);
      console.log('Verification result:', result);
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.error('✗ Request timed out');
        console.error(`  Operation: ${error.operation}`);
        console.error(`  Timeout: ${error.timeoutMs}ms`);
        console.error('  Try increasing the timeout or check network connection');
      } else if (error instanceof APIError) {
        console.error('✗ API Error');
        console.error(`  Status: ${error.statusCode}`);
        console.error(`  Message: ${error.message}`);
        console.error(`  Endpoint: ${error.endpoint}`);

        if (error.statusCode === 400) {
          console.error('  This is likely due to invalid input data');
        } else if (error.statusCode === 404) {
          console.error('  The requested resource was not found');
        } else if (error.statusCode && error.statusCode >= 500) {
          console.error('  Server error - the node might be experiencing issues');
        }
      } else if (error instanceof VerificationError) {
        console.error('✗ Verification Failed');
        console.error(`  Reason: ${error.reason}`);
        console.error(`  Details:`, error.details);
      } else if (error instanceof NetworkError) {
        console.error('✗ Network Error');
        console.error(`  Code: ${error.code}`);
        console.error(`  Message: ${error.message}`);
      } else {
        console.error('✗ Unexpected error:', error);
      }
    }
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
}

/**
 * Example 6: Custom network configuration
 */
export async function customNetworkExample() {
  // Use custom endpoints (e.g., for private testnet or proxy)
  const client = new AuraClient({
    network: 'testnet',
    restEndpoint: 'https://my-custom-proxy.example.com/aura',
    timeout: 15000, // 15 seconds
    connectTimeout: 5000, // 5 seconds
    retryConfig: {
      maxAttempts: 5,
      initialDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryOnTimeout: true,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    },
  });

  await client.connect();

  try {
    const info = client.getNetworkInfo();
    console.log('Network Configuration:');
    console.log('  Network:', info.network);
    console.log('  Chain ID:', info.chain_id);
    console.log('  REST Endpoint:', info.rest_endpoint);
    console.log('  gRPC Endpoint:', info.grpc_endpoint);
    console.log('  Connected:', info.connected);

    // Perform operations...
    const health = await client.checkHealth();
    console.log('Node health:', health ? 'healthy' : 'unhealthy');
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 7: Production verifier service
 */
export class ProductionVerifierService {
  private client: AuraClient | null = null;

  constructor(
    private readonly network: 'mainnet' | 'testnet' | 'local' = 'mainnet'
  ) {}

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.client = new AuraClient({
      network: this.network,
      timeout: 10000,
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
      },
      autoConnect: true, // Connect automatically
    });

    // Wait for connection
    let attempts = 0;
    while (!this.client.isConnected() && attempts < 10) {
      await this.sleep(500);
      attempts++;
    }

    if (!this.client.isConnected()) {
      throw new Error('Failed to initialize verifier service');
    }

    console.log('Verifier service initialized');
  }

  /**
   * Verify a presentation with comprehensive validation
   */
  async verify(qrCodeData: string, verifierDid?: string): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    if (!this.client || !this.client.isConnected()) {
      return {
        success: false,
        error: 'Service not initialized',
      };
    }

    try {
      const result = await this.client.verifyPresentation(
        qrCodeData,
        verifierDid
      );

      // Additional validation
      if (!result.verified) {
        return {
          success: false,
          error: `Verification failed: ${result.errors.join(', ')}`,
        };
      }

      // Check all credentials are valid
      const invalidCreds = result.credentials.filter((c) => !c.valid);
      if (invalidCreds.length > 0) {
        return {
          success: false,
          error: `Invalid credentials: ${invalidCreds.map((c) => c.vc_id).join(', ')}`,
        };
      }

      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.client.isConnected()) {
      return false;
    }

    try {
      return await this.client.checkHealth();
    } catch {
      return false;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Example 8: Using the production service
 */
export async function productionServiceExample() {
  const service = new ProductionVerifierService('testnet');

  try {
    // Initialize
    await service.initialize();

    // Check health
    const healthy = await service.healthCheck();
    console.log('Service healthy:', healthy);

    // Verify presentation
    const qrData = 'base64_encoded_presentation';
    const verifyResult = await service.verify(qrData, 'did:aura:verifier123');

    if (verifyResult.success) {
      console.log('✓ Verification successful');
      console.log('  Result:', verifyResult.result);
    } else {
      console.log('✗ Verification failed');
      console.log('  Error:', verifyResult.error);
    }
  } finally {
    // Always shutdown
    await service.shutdown();
  }
}

// Run examples (uncomment to test)
// basicVerificationExample();
// checkCredentialStatusExample();
// batchCheckExample();
// resolveDIDExample();
// errorHandlingExample();
// customNetworkExample();
// productionServiceExample();
