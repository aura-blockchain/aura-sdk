/**
 * Check credential status on-chain
 */

import { Command } from 'commander';
import ora from 'ora';
import type { NetworkType } from '@aura-network/verifier-sdk';
import { getVerifier, destroyVerifier } from '../utils/verifier.js';
import { printCredentialStatus, error, success } from '../utils/output.js';
import { configManager } from '../utils/config.js';

export function createStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Check credential status on-chain')
    .argument('<vc-id>', 'Verifiable Credential ID to check')
    .option('-n, --network <network>', 'Network to use (mainnet|testnet|local)', 'mainnet')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-j, --json', 'Output as JSON')
    .action(async (vcId: string, options) => {
      const network = options.network as NetworkType;
      const verbose = options.verbose || configManager.get('verbose');
      const jsonOutput = options.json || configManager.get('jsonOutput');

      // Create spinner
      const spinner = jsonOutput ? null : ora('Checking credential status...').start();

      try {
        // Get verifier instance
        const verifier = await getVerifier({ network, verbose });

        // Check credential status
        const status = await verifier.checkCredentialStatus(vcId);

        spinner?.stop();

        // Print result
        printCredentialStatus(vcId, status, { json: jsonOutput, verbose });

        if (!jsonOutput) {
          if (status === 'active') {
            success('Credential is active');
          } else {
            error(`Credential status: ${status}`);
          }
        }

        // Cleanup
        await destroyVerifier();

        process.exit(status === 'active' ? 0 : 1);
      } catch (err) {
        spinner?.fail('Status check failed');

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
