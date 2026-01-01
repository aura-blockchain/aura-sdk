/**
 * Output formatting utilities for CLI
 */

import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import type { VerificationResult, VCVerificationDetail, DIDDocument } from '@aura-network/verifier-sdk';

export interface OutputOptions {
  json?: boolean;
  verbose?: boolean;
}

/**
 * Print success message
 */
export function success(message: string, options: OutputOptions = {}): void {
  if (options.json) return;
  console.log(chalk.green('✓'), message);
}

/**
 * Print error message
 */
export function error(message: string, options: OutputOptions = {}): void {
  if (options.json) return;
  console.error(chalk.red('✗'), message);
}

/**
 * Print warning message
 */
export function warning(message: string, options: OutputOptions = {}): void {
  if (options.json) return;
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Print info message
 */
export function info(message: string, options: OutputOptions = {}): void {
  if (options.json) return;
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print verbose message
 */
export function verbose(message: string, options: OutputOptions = {}): void {
  if (options.json || !options.verbose) return;
  console.log(chalk.gray('→'), message);
}

/**
 * Print JSON output
 */
export function json(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print verification result
 */
export function printVerificationResult(result: VerificationResult, options: OutputOptions = {}): void {
  if (options.json) {
    json(result);
    return;
  }

  const borderColor = result.isValid ? 'green' : 'red';
  const statusIcon = result.isValid ? '✓' : '✗';
  const statusText = result.isValid ? 'VALID' : 'INVALID';
  const statusColor = result.isValid ? chalk.green : chalk.red;

  console.log();
  console.log(
    boxen(
      `${statusIcon} ${statusColor.bold(statusText)}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: borderColor,
      }
    )
  );

  if (!result.isValid) {
    error(`Verification failed: ${result.verificationError}`);
    console.log();
    return;
  }

  // Print basic information
  console.log(chalk.bold('Presentation Details:'));
  console.log(`  Holder DID:       ${chalk.cyan(result.holderDID)}`);
  console.log(`  Presentation ID:  ${chalk.cyan(result.presentationId)}`);
  console.log(`  Expires At:       ${chalk.yellow(result.expiresAt.toISOString())}`);
  console.log(`  Verification:     ${chalk.green(result.verificationMethod)}`);
  console.log(`  Signature Valid:  ${result.signatureValid ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`  Network Latency:  ${chalk.gray(`${result.networkLatency}ms`)}`);
  console.log();

  // Print credentials table
  if (result.vcDetails.length > 0) {
    console.log(chalk.bold('Verifiable Credentials:'));
    printCredentialsTable(result.vcDetails);
    console.log();
  }

  // Print disclosed attributes
  if (result.attributes && Object.keys(result.attributes).length > 0) {
    console.log(chalk.bold('Disclosed Attributes:'));
    printAttributes(result.attributes);
    console.log();
  }
}

/**
 * Print credentials table
 */
export function printCredentialsTable(credentials: VCVerificationDetail[]): void {
  const table = new Table({
    head: [
      chalk.cyan('Type'),
      chalk.cyan('Status'),
      chalk.cyan('Issuer'),
      chalk.cyan('On-Chain'),
    ],
    colWidths: [25, 12, 30, 10],
  });

  for (const vc of credentials) {
    const statusColor = vc.status === 'active' ? chalk.green : chalk.red;
    const onChainIcon = vc.onChain ? chalk.green('✓') : chalk.gray('-');

    table.push([
      vc.vcType,
      statusColor(vc.status),
      truncate(vc.issuerDID, 28),
      onChainIcon,
    ]);
  }

  console.log(table.toString());
}

/**
 * Print attributes
 */
export function printAttributes(attributes: Record<string, any>): void {
  const table = new Table({
    head: [chalk.cyan('Attribute'), chalk.cyan('Value')],
    colWidths: [25, 40],
  });

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      table.push([key, displayValue]);
    }
  }

  console.log(table.toString());
}

/**
 * Print DID document
 */
export function printDIDDocument(did: string, doc: DIDDocument, options: OutputOptions = {}): void {
  if (options.json) {
    json({ did, document: doc });
    return;
  }

  console.log();
  console.log(
    boxen(
      chalk.bold('DID Document'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  console.log(chalk.bold('DID:'), chalk.cyan(doc.id));
  console.log();

  if (doc.verificationMethod && doc.verificationMethod.length > 0) {
    console.log(chalk.bold('Verification Methods:'));
    const table = new Table({
      head: [chalk.cyan('ID'), chalk.cyan('Type'), chalk.cyan('Controller')],
      colWidths: [30, 25, 30],
    });

    for (const method of doc.verificationMethod) {
      table.push([
        truncate(method.id, 28),
        method.type,
        truncate(method.controller, 28),
      ]);
    }

    console.log(table.toString());
    console.log();
  }

  if (doc.authentication && doc.authentication.length > 0) {
    console.log(chalk.bold('Authentication:'));
    for (const auth of doc.authentication) {
      console.log(`  ${chalk.gray('•')} ${auth}`);
    }
    console.log();
  }

  if (doc.service && doc.service.length > 0) {
    console.log(chalk.bold('Services:'));
    const table = new Table({
      head: [chalk.cyan('ID'), chalk.cyan('Type'), chalk.cyan('Endpoint')],
      colWidths: [25, 25, 35],
    });

    for (const service of doc.service) {
      table.push([
        truncate(service.id, 23),
        service.type,
        truncate(service.serviceEndpoint, 33),
      ]);
    }

    console.log(table.toString());
    console.log();
  }
}

/**
 * Print credential status
 */
export function printCredentialStatus(vcId: string, status: string, options: OutputOptions = {}): void {
  if (options.json) {
    json({ vcId, status });
    return;
  }

  const statusColor = status === 'active' ? chalk.green : chalk.red;
  const statusIcon = status === 'active' ? '✓' : '✗';

  console.log();
  console.log(
    boxen(
      `${statusIcon} ${statusColor.bold(status.toUpperCase())}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: status === 'active' ? 'green' : 'red',
      }
    )
  );

  console.log(chalk.bold('Credential ID:'), chalk.cyan(vcId));
  console.log(chalk.bold('Status:'), statusColor(status));
  console.log();
}

/**
 * Print configuration
 */
export function printConfig(config: Record<string, any>, options: OutputOptions = {}): void {
  if (options.json) {
    json(config);
    return;
  }

  console.log();
  console.log(
    boxen(
      chalk.bold('Aura Verifier Configuration'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  const table = new Table({
    head: [chalk.cyan('Setting'), chalk.cyan('Value')],
    colWidths: [25, 50],
  });

  for (const [key, value] of Object.entries(config)) {
    table.push([key, String(value)]);
  }

  console.log(table.toString());
  console.log();
}

/**
 * Truncate string
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Print header
 */
export function printHeader(title: string): void {
  console.log();
  console.log(chalk.bold.cyan(title));
  console.log(chalk.gray('─'.repeat(title.length)));
  console.log();
}
