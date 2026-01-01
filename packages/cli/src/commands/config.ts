/**
 * Configure network and CLI settings
 */

import { Command } from 'commander';
import type { NetworkType } from '@aura-network/verifier-sdk';
import { configManager } from '../utils/config.js';
import { printConfig, success, error, info } from '../utils/output.js';
import { selectPrompt, inputPrompt, confirmPrompt } from '../utils/prompts.js';

export function createConfigCommand(): Command {
  const command = new Command('config');

  command
    .description('Configure network and CLI settings')
    .option('-s, --show', 'Show current configuration')
    .option('-r, --reset', 'Reset configuration to defaults')
    .option('-n, --network <network>', 'Set network (mainnet|testnet|local)')
    .option('--grpc <endpoint>', 'Set custom gRPC endpoint')
    .option('--rest <endpoint>', 'Set custom REST endpoint')
    .option('--verbose', 'Enable verbose logging')
    .option('--no-verbose', 'Disable verbose logging')
    .option('--json', 'Enable JSON output')
    .option('--no-json', 'Disable JSON output')
    .action(async (options) => {
      try {
        // Show configuration
        if (options.show) {
          const config = configManager.getAll();
          printConfig(config);
          info(`Configuration file: ${configManager.getConfigPath()}`);
          return;
        }

        // Reset configuration
        if (options.reset) {
          const shouldReset = await confirmPrompt({
            message: 'Are you sure you want to reset configuration to defaults?',
          });

          if (shouldReset) {
            configManager.reset();
            success('Configuration reset to defaults');
          }
          return;
        }

        // If options are provided, set them directly
        if (options.network || options.grpc || options.rest || options.verbose !== undefined || options.json !== undefined) {
          if (options.network) {
            configManager.set('network', options.network);
          }
          if (options.grpc) {
            configManager.set('grpcEndpoint', options.grpc);
          }
          if (options.rest) {
            configManager.set('restEndpoint', options.rest);
          }
          if (options.verbose !== undefined) {
            configManager.set('verbose', options.verbose);
          }
          if (options.json !== undefined) {
            configManager.set('jsonOutput', options.json);
          }

          success('Configuration updated');
          const config = configManager.getAll();
          printConfig(config);
          return;
        }

        // Interactive configuration
        console.log();
        info('Interactive Configuration');
        console.log();

        // Select network
        const network = await selectPrompt({
          message: 'Select network:',
          choices: [
            { name: 'mainnet', message: 'Mainnet (Production)' },
            { name: 'testnet', message: 'Testnet (Testing)' },
            { name: 'local', message: 'Local (Development)' },
          ],
          initial: configManager.get('network') || 'mainnet',
        }) as NetworkType;

        configManager.set('network', network);

        // Custom endpoints
        const useCustomEndpoints = await confirmPrompt({
          message: 'Configure custom endpoints?',
          initial: false,
        });

        if (useCustomEndpoints) {
          const grpcEndpoint = await inputPrompt({
            message: 'gRPC endpoint:',
            initial: configManager.get('grpcEndpoint') || '',
          });

          const restEndpoint = await inputPrompt({
            message: 'REST endpoint:',
            initial: configManager.get('restEndpoint') || '',
          });

          if (grpcEndpoint) {
            configManager.set('grpcEndpoint', grpcEndpoint);
          }
          if (restEndpoint) {
            configManager.set('restEndpoint', restEndpoint);
          }
        }

        // Verbose logging
        const verbose = await confirmPrompt({
          message: 'Enable verbose logging?',
          initial: configManager.get('verbose') || false,
        });

        configManager.set('verbose', verbose);

        // JSON output
        const jsonOutput = await confirmPrompt({
          message: 'Enable JSON output by default?',
          initial: configManager.get('jsonOutput') || false,
        });

        configManager.set('jsonOutput', jsonOutput);

        console.log();
        success('Configuration saved successfully');

        const config = configManager.getAll();
        printConfig(config);

        info(`Configuration file: ${configManager.getConfigPath()}`);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  return command;
}
