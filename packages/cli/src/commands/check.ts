/**
 * Verify QR code from command line
 */

import { Command } from 'commander';
import ora from 'ora';
import type { NetworkType, VCType } from '@aura-network/verifier-sdk';
import { getVerifier, destroyVerifier } from '../utils/verifier.js';
import { printVerificationResult, error, success } from '../utils/output.js';
import { configManager } from '../utils/config.js';

export function createCheckCommand(): Command {
  const command = new Command('check');

  command
    .description('Verify a QR code from command line')
    .argument('<qr-data>', 'QR code data or URL to verify')
    .option('-n, --network <network>', 'Network to use (mainnet|testnet|local)', 'mainnet')
    .option('-r, --required-types <types...>', 'Required VC types (comma-separated)')
    .option('-m, --max-age <seconds>', 'Maximum credential age in seconds')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-j, --json', 'Output as JSON')
    .option('-o, --offline', 'Use offline verification only')
    .action(async (qrData: string, options) => {
      const network = options.network as NetworkType;
      const verbose = options.verbose || configManager.get('verbose');
      const jsonOutput = options.json || configManager.get('jsonOutput');

      // Create spinner
      const spinner = jsonOutput ? null : ora('Verifying credential...').start();

      try {
        // Get verifier instance
        const verifier = await getVerifier({ network, verbose });

        // Parse required types
        let requiredVCTypes: VCType[] | undefined;
        if (options.requiredTypes) {
          requiredVCTypes = options.requiredTypes.map((type: string) => type as VCType);
        }

        // Parse max age
        const maxCredentialAge = options.maxAge ? parseInt(options.maxAge, 10) : undefined;

        // Verify the credential
        const result = await verifier.verify({
          qrCodeData: qrData,
          requiredVCTypes,
          maxCredentialAge,
          offlineOnly: options.offline,
        });

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
    });

  return command;
}
