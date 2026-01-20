#!/usr/bin/env node

/**
 * CLI Tool Example - Aura Verifier SDK
 *
 * A command-line tool for verifying Aura credentials from the terminal.
 * Demonstrates parsing arguments, colored output, and interactive verification.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import {
  AuraVerifier,
  parseQRCode,
  VCType,
  VCStatus,
  AuraVerifierError,
  type VerificationResult,
  type QRCodeData,
} from '@aura-network/verifier-sdk';

const program = new Command();

// CLI Configuration
program
  .name('aura-verify')
  .description('CLI tool for verifying Aura blockchain credentials')
  .version('1.0.0');

// ============================================================================
// VERIFY COMMAND
// ============================================================================

program
  .command('verify')
  .description('Verify a credential from QR code data')
  .argument('<qr-code>', 'QR code data (aura://verify?data=... or base64)')
  .option('-n, --network <network>', 'Network to use (mainnet/testnet)', 'testnet')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '10000')
  .option('-v, --verbose', 'Show verbose output', false)
  .option('-j, --json', 'Output as JSON', false)
  .action(async (qrCode: string, options) => {
    const spinner = ora('Initializing verifier...').start();

    try {
      // Initialize verifier
      const verifier = new AuraVerifier({
        network: options.network as 'mainnet' | 'testnet',
        timeout: parseInt(options.timeout, 10),
        offlineMode: false,
      });

      await verifier.initialize();
      spinner.succeed('Verifier initialized');

      // Parse QR code
      spinner.start('Parsing QR code...');
      const qrData = parseQRCode(qrCode);
      spinner.succeed('QR code parsed');

      if (options.verbose) {
        displayQRCodeInfo(qrData);
      }

      // Verify credential
      spinner.start('Verifying credential...');
      const result = await verifier.verify({ qrCodeData: qrCode });
      spinner.stop();

      // Display result
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayVerificationResult(result, options.verbose);
      }

      // Cleanup
      await verifier.destroy();

      // Exit with appropriate code
      process.exit(result.isValid ? 0 : 1);
    } catch (error) {
      spinner.fail('Verification failed');
      handleError(error, options.json);
      process.exit(1);
    }
  });

// ============================================================================
// PARSE COMMAND
// ============================================================================

program
  .command('parse')
  .description('Parse and display QR code data without verification')
  .argument('<qr-code>', 'QR code data')
  .option('-j, --json', 'Output as JSON', false)
  .action((qrCode: string, options) => {
    try {
      const qrData = parseQRCode(qrCode);

      if (options.json) {
        console.log(JSON.stringify(qrData, null, 2));
      } else {
        displayQRCodeInfo(qrData);
      }
    } catch (error) {
      handleError(error, options.json);
      process.exit(1);
    }
  });

// ============================================================================
// STATUS COMMAND
// ============================================================================

program
  .command('status')
  .description('Check the status of a credential')
  .argument('<vc-id>', 'Verifiable Credential ID')
  .option('-n, --network <network>', 'Network to use (mainnet/testnet)', 'testnet')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '10000')
  .option('-j, --json', 'Output as JSON', false)
  .action(async (vcId: string, options) => {
    const spinner = ora('Checking credential status...').start();

    try {
      const verifier = new AuraVerifier({
        network: options.network as 'mainnet' | 'testnet',
        timeout: parseInt(options.timeout, 10),
        offlineMode: false,
      });

      await verifier.initialize();
      const status = await verifier.checkCredentialStatus(vcId);
      spinner.succeed('Status retrieved');

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log();
        console.log(chalk.bold('Credential Status'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`Credential ID: ${chalk.cyan(vcId)}`);
        console.log(`Active: ${status.isActive ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`Revoked: ${status.isRevoked ? chalk.red('Yes') : chalk.green('No')}`);
        console.log(`Expired: ${status.isExpired ? chalk.red('Yes') : chalk.green('No')}`);
        console.log();
      }

      await verifier.destroy();
    } catch (error) {
      spinner.fail('Failed to retrieve status');
      handleError(error, options.json);
      process.exit(1);
    }
  });

// ============================================================================
// AGE-21 COMMAND
// ============================================================================

program
  .command('age-21')
  .description('Quick check if holder is 21 or older')
  .argument('<qr-code>', 'QR code data')
  .option('-n, --network <network>', 'Network to use (mainnet/testnet)', 'testnet')
  .option('-j, --json', 'Output as JSON', false)
  .action(async (qrCode: string, options) => {
    const spinner = ora('Checking age...').start();

    try {
      const verifier = new AuraVerifier({
        network: options.network as 'mainnet' | 'testnet',
        timeout: 10000,
        offlineMode: false,
      });

      await verifier.initialize();
      const isOver21 = await verifier.isAge21Plus(qrCode);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({ isOver21 }, null, 2));
      } else {
        console.log();
        if (isOver21) {
          console.log(chalk.green.bold('✓ Holder is 21 or older'));
        } else {
          console.log(chalk.red.bold('✗ Holder is NOT 21 or older'));
        }
        console.log();
      }

      await verifier.destroy();
      process.exit(isOver21 ? 0 : 1);
    } catch (error) {
      spinner.fail('Failed to verify age');
      handleError(error, options.json);
      process.exit(1);
    }
  });

// ============================================================================
// AGE-18 COMMAND
// ============================================================================

program
  .command('age-18')
  .description('Quick check if holder is 18 or older')
  .argument('<qr-code>', 'QR code data')
  .option('-n, --network <network>', 'Network to use (mainnet/testnet)', 'testnet')
  .option('-j, --json', 'Output as JSON', false)
  .action(async (qrCode: string, options) => {
    const spinner = ora('Checking age...').start();

    try {
      const verifier = new AuraVerifier({
        network: options.network as 'mainnet' | 'testnet',
        timeout: 10000,
        offlineMode: false,
      });

      await verifier.initialize();
      const isOver18 = await verifier.isAge18Plus(qrCode);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({ isOver18 }, null, 2));
      } else {
        console.log();
        if (isOver18) {
          console.log(chalk.green.bold('✓ Holder is 18 or older'));
        } else {
          console.log(chalk.red.bold('✗ Holder is NOT 18 or older'));
        }
        console.log();
      }

      await verifier.destroy();
      process.exit(isOver18 ? 0 : 1);
    } catch (error) {
      spinner.fail('Failed to verify age');
      handleError(error, options.json);
      process.exit(1);
    }
  });

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Display QR code information
 */
function displayQRCodeInfo(qrData: QRCodeData): void {
  console.log();
  console.log(chalk.bold.cyan('QR Code Information'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Version: ${chalk.white(qrData.v)}`);
  console.log(`Presentation ID: ${chalk.white(qrData.p)}`);
  console.log(`Holder DID: ${chalk.white(qrData.h)}`);
  console.log(`Credentials: ${chalk.white(qrData.vcs.join(', '))}`);
  console.log(`Expiration: ${chalk.white(new Date(qrData.exp * 1000).toISOString())}`);
  console.log(`Nonce: ${chalk.white(qrData.n)}`);
  console.log();

  // Display disclosure context
  console.log(chalk.bold.cyan('Disclosure Context'));
  console.log(chalk.gray('─'.repeat(50)));
  const hasDisclosures = Object.keys(qrData.ctx).length > 0;

  if (hasDisclosures) {
    for (const [key, value] of Object.entries(qrData.ctx)) {
      if (value) {
        console.log(`${chalk.green('✓')} ${key}`);
      }
    }
  } else {
    console.log(chalk.gray('No specific disclosures'));
  }
  console.log();
}

/**
 * Display verification result
 */
function displayVerificationResult(result: VerificationResult, verbose: boolean): void {
  console.log();
  console.log(chalk.bold('═'.repeat(60)));

  if (result.isValid) {
    console.log(chalk.green.bold('✓ VERIFICATION SUCCESSFUL'));
  } else {
    console.log(chalk.red.bold('✗ VERIFICATION FAILED'));
  }

  console.log(chalk.bold('═'.repeat(60)));
  console.log();

  // Basic info
  console.log(chalk.bold('Verification Details'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Holder DID: ${chalk.cyan(result.holderDID)}`);
  console.log(`Verified At: ${chalk.white(result.verifiedAt.toISOString())}`);
  console.log(`Audit ID: ${chalk.gray(result.auditId)}`);

  if (result.networkLatency) {
    console.log(`Network Latency: ${chalk.white(result.networkLatency)}ms`);
  }

  if (result.verificationError) {
    console.log(`Error: ${chalk.red(result.verificationError)}`);
  }
  console.log();

  // Attributes
  if (result.isValid && Object.keys(result.attributes).length > 0) {
    console.log(chalk.bold('Verified Attributes'));
    console.log(chalk.gray('─'.repeat(50)));

    for (const [key, value] of Object.entries(result.attributes)) {
      const displayValue =
        typeof value === 'boolean'
          ? value
            ? chalk.green('Yes')
            : chalk.red('No')
          : chalk.white(String(value));
      console.log(`${key}: ${displayValue}`);
    }
    console.log();
  }

  // Credentials
  if (result.vcDetails.length > 0) {
    console.log(chalk.bold('Credentials'));
    console.log(chalk.gray('─'.repeat(50)));

    if (verbose) {
      // Detailed table view
      const data = [
        ['VC ID', 'Type', 'Valid', 'Expired', 'Revoked'],
        ...result.vcDetails.map((vc) => [
          vc.vcId,
          VCType[vc.vcType] || String(vc.vcType),
          vc.isValid ? chalk.green('Yes') : chalk.red('No'),
          vc.isExpired ? chalk.red('Yes') : chalk.green('No'),
          vc.isRevoked ? chalk.red('Yes') : chalk.green('No'),
        ]),
      ];

      console.log(table(data));
    } else {
      // Simple list
      for (const vc of result.vcDetails) {
        const status = vc.isValid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid');
        const type = VCType[vc.vcType] || String(vc.vcType);
        console.log(`${status} - ${chalk.cyan(type)} (${chalk.gray(vc.vcId)})`);
      }
      console.log();
    }
  }
}

/**
 * Handle and display errors
 */
function handleError(error: unknown, jsonOutput: boolean): void {
  if (jsonOutput) {
    const errorObj = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: error instanceof AuraVerifierError ? error.code : 'UNKNOWN_ERROR',
    };
    console.log(JSON.stringify(errorObj, null, 2));
  } else {
    console.log();
    console.log(chalk.red.bold('Error:'));

    if (error instanceof AuraVerifierError) {
      console.log(chalk.red(error.message));
      if (error.code) {
        console.log(chalk.gray(`Code: ${error.code}`));
      }
    } else if (error instanceof Error) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red(String(error)));
    }
    console.log();
  }
}

// ============================================================================
// PARSE AND EXECUTE
// ============================================================================

program.parse();
