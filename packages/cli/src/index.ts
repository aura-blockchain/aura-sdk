#!/usr/bin/env node

/**
 * Aura Verifier CLI
 *
 * Professional command-line interface for verifying Aura blockchain credentials
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createScanCommand } from './commands/scan.js';
import { createCheckCommand } from './commands/check.js';
import { createStatusCommand } from './commands/status.js';
import { createDIDCommand } from './commands/did.js';
import { createConfigCommand } from './commands/config.js';
import { createGenerateQRCommand } from './commands/generate-qr.js';

// Package info
const packageJson = {
  name: '@aura-network/verifier-cli',
  version: '1.0.0',
  description: 'Aura Network Verifier SDK - Command Line Interface',
};

// Create main program
const program = new Command();

// Configure program
program
  .name('aura-verify')
  .description(chalk.cyan.bold('Aura Network Verifiable Credential Verifier'))
  .version(packageJson.version, '-v, --version', 'Output the current version')
  .addHelpText(
    'before',
    `
${chalk.cyan.bold('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan.bold('║')}  ${chalk.white.bold('Aura Verifier CLI')}                                    ${chalk.cyan.bold('║')}
${chalk.cyan.bold('║')}  ${chalk.gray('Professional credential verification for Aura Network')} ${chalk.cyan.bold('║')}
${chalk.cyan.bold('╚═══════════════════════════════════════════════════════════╝')}
`
  )
  .addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.gray('# Interactive QR code verification')}
  ${chalk.cyan('$ aura-verify scan')}

  ${chalk.gray('# Verify a QR code directly')}
  ${chalk.cyan('$ aura-verify check "aura://verify?data=..."')}

  ${chalk.gray('# Check credential status')}
  ${chalk.cyan('$ aura-verify status vc_123456789')}

  ${chalk.gray('# Resolve a DID document')}
  ${chalk.cyan('$ aura-verify did did:aura:mainnet:aura1...')}

  ${chalk.gray('# Configure network settings')}
  ${chalk.cyan('$ aura-verify config')}

  ${chalk.gray('# Generate a sample QR code for testing')}
  ${chalk.cyan('$ aura-verify generate-qr')}

${chalk.bold('Documentation:')}
  ${chalk.blue.underline('https://github.com/aura-blockchain/aura-verifier-sdk')}

${chalk.bold('Support:')}
  ${chalk.blue.underline('https://github.com/aura-blockchain/aura-verifier-sdk/issues')}
`
  );

// Add commands
program.addCommand(createScanCommand());
program.addCommand(createCheckCommand());
program.addCommand(createStatusCommand());
program.addCommand(createDIDCommand());
program.addCommand(createConfigCommand());
program.addCommand(createGenerateQRCommand());

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('\nError: Invalid command "%s"'), program.args.join(' '));
  console.log(chalk.gray('\nSee --help for a list of available commands.\n'));
  process.exit(1);
});

// Error handling
process.on('unhandledRejection', (error: Error) => {
  console.error(chalk.red('\nUnexpected error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error(chalk.red('\nFatal error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
