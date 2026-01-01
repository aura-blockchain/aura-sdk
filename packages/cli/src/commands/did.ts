/**
 * Resolve and display DID document
 */

import { Command } from 'commander';
import ora from 'ora';
import type { NetworkType } from '@aura-network/verifier-sdk';
import { getVerifier, destroyVerifier } from '../utils/verifier.js';
import { printDIDDocument, error, success } from '../utils/output.js';
import { configManager } from '../utils/config.js';

export function createDIDCommand(): Command {
  const command = new Command('did');

  command
    .description('Resolve and display DID document')
    .argument('<did>', 'DID to resolve (e.g., did:aura:mainnet:aura1...)')
    .option('-n, --network <network>', 'Network to use (mainnet|testnet|local)', 'mainnet')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-j, --json', 'Output as JSON')
    .action(async (did: string, options) => {
      const network = options.network as NetworkType;
      const verbose = options.verbose || configManager.get('verbose');
      const jsonOutput = options.json || configManager.get('jsonOutput');

      // Create spinner
      const spinner = jsonOutput ? null : ora('Resolving DID...').start();

      try {
        // Get verifier instance
        const verifier = await getVerifier({ network, verbose });

        // Resolve DID
        const didDoc = await verifier.resolveDID(did);

        spinner?.stop();

        if (!didDoc) {
          throw new Error(`DID not found: ${did}`);
        }

        // Print DID document
        printDIDDocument(did, didDoc, { json: jsonOutput, verbose });

        if (!jsonOutput) {
          success('DID resolved successfully');
        }

        // Cleanup
        await destroyVerifier();

        process.exit(0);
      } catch (err) {
        spinner?.fail('DID resolution failed');

        if (jsonOutput) {
          console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2));
        } else {
          error(err instanceof Error ? err.message : String(err));
        }

        await destroyVerifier();
        process.exit(1);
      }
    });

  return command;
}
