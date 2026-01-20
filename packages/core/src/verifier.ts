/**
 * Main Verifier SDK class
 */

import { StargateClient } from '@cosmjs/stargate';

// Import crypto setup first to configure @noble libraries
import './crypto/setup.js';

import type {
  VerifierConfig,
  SignatureVerificationRequest,
  VerificationResult,
  TransactionVerificationRequest,
  HashRequest,
  AddressDerivationRequest,
} from './types';
import { InvalidConfigError, RpcConnectionError, TransactionVerificationError } from './errors';
import { verifySignature, hash, deriveAddress } from './crypto';
import { retry } from './utils';

/**
 * Aura Network Verifier SDK
 */
export class VerifierSDK {
  private readonly config: Required<VerifierConfig>;
  private client: StargateClient | null = null;

  constructor(config: VerifierConfig) {
    // Validate configuration
    if (!config.rpcEndpoint || typeof config.rpcEndpoint !== 'string') {
      throw new InvalidConfigError('RPC endpoint is required and must be a string');
    }

    this.config = {
      rpcEndpoint: config.rpcEndpoint,
      restEndpoint: config.restEndpoint ?? '',
      timeout: config.timeout ?? 30000,
      debug: config.debug ?? false,
    };

    if (this.config.debug) {
      console.log('VerifierSDK initialized with config:', this.config);
    }
  }

  /**
   * Get or create Stargate client
   */
  private async getClient(): Promise<StargateClient> {
    if (this.client !== null) {
      return this.client;
    }

    try {
      this.client = await retry(
        async () => {
          return await StargateClient.connect(this.config.rpcEndpoint);
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
        }
      );

      if (this.config.debug) {
        console.log('Connected to RPC endpoint:', this.config.rpcEndpoint);
      }

      return this.client;
    } catch (error) {
      throw new RpcConnectionError('Failed to connect to RPC endpoint', {
        endpoint: this.config.rpcEndpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Verify a signature
   */
  async verifySignature(request: SignatureVerificationRequest): Promise<VerificationResult> {
    try {
      const isValid = await verifySignature(
        request.publicKey,
        request.message,
        request.signature,
        request.algorithm
      );

      return {
        valid: isValid,
        metadata: {
          algorithm: request.algorithm,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          algorithm: request.algorithm,
        },
      };
    }
  }

  /**
   * Verify a Cosmos SDK transaction
   */
  async verifyTransaction(request: TransactionVerificationRequest): Promise<VerificationResult> {
    try {
      const client = await this.getClient();

      // Fetch transaction
      const tx = await client.getTx(request.txHash);

      if (tx === null) {
        return {
          valid: false,
          error: 'Transaction not found',
          metadata: {
            txHash: request.txHash,
          },
        };
      }

      // Check if transaction succeeded
      if (tx.code !== 0) {
        return {
          valid: false,
          error: `Transaction failed with code ${tx.code}`,
          metadata: {
            txHash: request.txHash,
            code: tx.code,
            rawLog: tx.rawLog,
          },
        };
      }

      // Note: tx.tx is raw bytes (Uint8Array), detailed signer verification
      // would require decoding the transaction using protobuf.
      // For now, we consider a successful transaction (code === 0) as valid.
      // In production, implement full transaction decoding and signature verification.
      const hasTxData = tx.tx && tx.tx.length > 0;

      if (!hasTxData) {
        return {
          valid: false,
          error: 'Transaction data is empty',
          metadata: {
            txHash: request.txHash,
          },
        };
      }

      return {
        valid: true,
        metadata: {
          txHash: request.txHash,
          height: tx.height,
          gasUsed: tx.gasUsed,
          gasWanted: tx.gasWanted,
        },
      };
    } catch (error) {
      throw new TransactionVerificationError('Transaction verification failed', {
        txHash: request.txHash,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Hash data
   */
  hash(request: HashRequest): string | Uint8Array {
    return hash(request);
  }

  /**
   * Derive address from public key
   */
  deriveAddress(request: AddressDerivationRequest): string {
    return deriveAddress(request);
  }

  /**
   * Get blockchain height
   */
  async getHeight(): Promise<number> {
    const client = await this.getClient();
    return await client.getHeight();
  }

  /**
   * Get blockchain chain ID
   */
  async getChainId(): Promise<string> {
    const client = await this.getClient();
    return await client.getChainId();
  }

  /**
   * Disconnect from RPC endpoint
   */
  async disconnect(): Promise<void> {
    if (this.client !== null) {
      this.client.disconnect();
      this.client = null;

      if (this.config.debug) {
        console.log('Disconnected from RPC endpoint');
      }
    }
  }
}
