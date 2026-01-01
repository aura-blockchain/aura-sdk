/**
 * Generate sample QR codes for testing
 */

import { Command } from 'commander';
import { generateSampleQRData, displayQRCode, generateQRCodeFile } from '../utils/qr.js';
import { success, error, info } from '../utils/output.js';
import { selectPrompt, inputPrompt, confirmPrompt } from '../utils/prompts.js';
import chalk from 'chalk';
import path from 'path';

export function createGenerateQRCommand(): Command {
  const command = new Command('generate-qr');

  command
    .description('Generate sample QR codes for testing')
    .option('-t, --type <type>', 'QR code type (simple|complex)', 'simple')
    .option('-o, --output <file>', 'Save QR code to file (PNG)')
    .option('-d, --display', 'Display QR code in terminal', true)
    .option('--no-display', 'Do not display QR code in terminal')
    .option('-j, --json', 'Output raw data as JSON')
    .action(async (options) => {
      try {
        let qrType: 'simple' | 'complex' = 'simple';
        let outputFile: string | undefined;
        let shouldDisplay = options.display;

        // Interactive mode if no options provided
        if (!options.type && !options.output && !options.json) {
          console.log();
          info('Generate Sample QR Code');
          console.log();

          // Select type
          qrType = await selectPrompt<'simple' | 'complex'>({
            message: 'Select QR code type:',
            choices: [
              { name: 'simple', message: 'Simple (basic age verification)' },
              { name: 'complex', message: 'Complex (multiple credentials)' },
            ],
            initial: 'simple',
          });

          // Ask if should save
          const shouldSave = await confirmPrompt({
            message: 'Save QR code to file?',
            initial: false,
          });

          if (shouldSave) {
            const filename = await inputPrompt({
              message: 'Output filename:',
              initial: `sample-qr-${qrType}.png`,
            });

            outputFile = filename;
          }

          shouldDisplay = await confirmPrompt({
            message: 'Display QR code in terminal?',
            initial: true,
          });
        } else {
          if (options.type) {
            if (options.type !== 'simple' && options.type !== 'complex') {
              throw new Error('Type must be "simple" or "complex"');
            }
            qrType = options.type;
          }
          outputFile = options.output;
        }

        // Generate QR data
        const qrData = generateSampleQRData(qrType);

        // Output as JSON
        if (options.json) {
          console.log(JSON.stringify({ qrData }, null, 2));
          return;
        }

        console.log();
        console.log(chalk.bold('Sample QR Code Generated'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log();

        console.log(chalk.bold('Type:'), qrType);
        console.log(chalk.bold('Data:'));
        console.log(chalk.gray(qrData));
        console.log();

        // Display in terminal
        if (shouldDisplay) {
          info('QR Code:');
          displayQRCode(qrData);
        }

        // Save to file
        if (outputFile) {
          const absolutePath = path.resolve(outputFile);
          await generateQRCodeFile(qrData, absolutePath);
          success(`QR code saved to: ${absolutePath}`);
        }

        console.log();
        info('You can test this QR code with:');
        console.log(chalk.cyan(`  aura-verify check "${qrData}"`));
        console.log();

        info('Or use interactive mode:');
        console.log(chalk.cyan('  aura-verify scan'));
        console.log();
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  return command;
}
