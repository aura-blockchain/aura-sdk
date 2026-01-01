/**
 * Verifier instance management
 */

import { AuraVerifier, type AuraVerifierConfig, type NetworkType } from '@aura-network/verifier-sdk';
import { configManager } from './config.js';

let verifierInstance: AuraVerifier | null = null;

/**
 * Get or create verifier instance
 */
export async function getVerifier(options: {
  network?: NetworkType;
  verbose?: boolean;
  grpcEndpoint?: string;
  restEndpoint?: string;
}): Promise<AuraVerifier> {
  const network = options.network || configManager.get('network') || 'mainnet';
  const verbose = options.verbose ?? configManager.get('verbose') ?? false;
  const grpcEndpoint = options.grpcEndpoint || configManager.get('grpcEndpoint');
  const restEndpoint = options.restEndpoint || configManager.get('restEndpoint');

  const config: AuraVerifierConfig = {
    network,
    verbose,
    grpcEndpoint,
    restEndpoint,
    timeout: 30000,
    offlineMode: false,
    cacheConfig: {
      enableDIDCache: true,
      enableVCCache: true,
      ttl: 300,
    },
  };

  // Create new instance if needed
  if (!verifierInstance) {
    verifierInstance = new AuraVerifier(config);
    await verifierInstance.initialize();
  }

  return verifierInstance;
}

/**
 * Destroy verifier instance
 */
export async function destroyVerifier(): Promise<void> {
  if (verifierInstance) {
    await verifierInstance.destroy();
    verifierInstance = null;
  }
}
