/**
 * Interactive QR code verification command
 */

import { Command } from 'commander';
import ora from 'ora';
import type { NetworkType } from '@aura-network/verifier-sdk';
import { getVerifier, destroyVerifier } from '../utils/verifier.js';
import { printVerificationResult, error, info, success } from '../utils/output.js';
import { configManager } from '../utils/config.js';
import { inputPrompt } from '../utils/prompts.js';

export function createScanCommand(): Command {
  const command = new Command('scan');

  command
    .description('Interactive QR code verification (paste QR data)')
    .option('-n, --network <network>', 'Network to use (mainnet|testnet|local)', 'mainnet')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const network = options.network as NetworkType;
        const verbose = options.verbose || configManager.get('verbose');
        const jsonOutput = options.json || configManager.get('jsonOutput');

        if (!jsonOutput) {
          info(`Starting interactive QR verification on ${network} network`);
          console.log();
        }

        // Prompt for QR code data
        const response = await inputPrompt({
          message: 'Paste QR code data or URL:',
          validate: (value: string) => {
            if (!value || value.trim().length === 0) {
              return 'QR code data is required';
            }
            return true;
          },
        });

        const qrData = response.trim();

        // Create spinner
        const spinner = jsonOutput ? null : ora('Verifying credential...').start();

        try {
          // Get verifier instance
          const verifier = await getVerifier({ network, verbose });

          // Verify the credential
          const result = await verifier.verify({ qrCodeData: qrData });

          spinner?.stop();

          // Print result
          printVerificationResult(result, { json: jsonOutput, verbose });

          if (!jsonOutput) {
            if (result.isValid) {
              success('Verification completed successfully');
            } else {
              error('Verification failed');
            }
          }

          // Cleanup
          await destroyVerifier();

          process.exit(result.isValid ? 0 : 1);
        } catch (err) {
          spinner?.fail('Verification failed');

          if (jsonOutput) {
            console.error(
              JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2)
            );
          } else {
            error(err instanceof Error ? err.message : String(err));
          }

          await destroyVerifier();
          process.exit(1);
        }
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  return command;
}
