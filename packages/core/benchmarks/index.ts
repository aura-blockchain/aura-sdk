/**
 * Benchmark Suite Entry Point
 *
 * Runs all performance benchmarks for the Aura Verifier SDK
 */

import { runQRBenchmark } from './qr-benchmark.js';
import { runCryptoBenchmark } from './crypto-benchmark.js';
import { runCacheBenchmark } from './cache-benchmark.js';
import { runE2EBenchmark } from './e2e-benchmark.js';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface BenchmarkOptions {
  suites: string[];
  verbose: boolean;
}

function parseArgs(): BenchmarkOptions {
  const args = process.argv.slice(2);
  const options: BenchmarkOptions = {
    suites: [],
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--all' || arg === '-a') {
      options.suites = ['qr', 'crypto', 'cache', 'e2e'];
    } else if (arg === '--qr') {
      options.suites.push('qr');
    } else if (arg === '--crypto') {
      options.suites.push('crypto');
    } else if (arg === '--cache') {
      options.suites.push('cache');
    } else if (arg === '--e2e') {
      options.suites.push('e2e');
    } else {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }

  // Default to all suites if none specified
  if (options.suites.length === 0) {
    options.suites = ['qr', 'crypto', 'cache', 'e2e'];
  }

  return options;
}

function printUsage(): void {
  console.log(`
Aura Verifier SDK - Performance Benchmark Suite

Usage: npm run benchmark [options]

Options:
  -h, --help      Show this help message
  -v, --verbose   Enable verbose output
  -a, --all       Run all benchmark suites (default)
  --qr            Run QR parsing benchmarks only
  --crypto        Run cryptographic signature benchmarks only
  --cache         Run cache performance benchmarks only
  --e2e           Run end-to-end verification benchmarks only

Examples:
  npm run benchmark              # Run all benchmarks
  npm run benchmark -- --qr      # Run QR parsing benchmarks only
  npm run benchmark -- --crypto --e2e  # Run crypto and E2E benchmarks
  npm run benchmark -- -v --all  # Run all benchmarks with verbose output
  `);
}

// ============================================================================
// Benchmark Runner
// ============================================================================

async function runBenchmarks(options: BenchmarkOptions): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('AURA VERIFIER SDK - PERFORMANCE BENCHMARK SUITE');
  console.log('='.repeat(80));
  console.log(`\nRunning suites: ${options.suites.join(', ')}`);
  console.log(`Verbose mode: ${options.verbose ? 'enabled' : 'disabled'}\n`);

  const startTime = performance.now();
  const results: { suite: string; duration: number; success: boolean }[] = [];

  for (const suite of options.suites) {
    console.log('\n' + '='.repeat(80));
    console.log(`RUNNING: ${suite.toUpperCase()} BENCHMARK SUITE`);
    console.log('='.repeat(80) + '\n');

    const suiteStart = performance.now();
    let success = true;

    try {
      switch (suite) {
        case 'qr':
          await runQRBenchmark();
          break;
        case 'crypto':
          await runCryptoBenchmark();
          break;
        case 'cache':
          await runCacheBenchmark();
          break;
        case 'e2e':
          await runE2EBenchmark();
          break;
        default:
          console.error(`Unknown benchmark suite: ${suite}`);
          success = false;
      }
    } catch (error) {
      console.error(`Error running ${suite} benchmark:`, error);
      success = false;
    }

    const suiteEnd = performance.now();
    const duration = suiteEnd - suiteStart;

    results.push({ suite, duration, success });

    console.log(`\n${suite.toUpperCase()} benchmark completed in ${(duration / 1000).toFixed(2)}s`);
  }

  const endTime = performance.now();
  const totalDuration = endTime - startTime;

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK SUITE SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`${'Suite'.padEnd(20)} ${'Duration'.padStart(15)} ${'Status'.padStart(15)}`);
  console.log('-'.repeat(80));

  for (const result of results) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${result.suite.padEnd(20)} ${(result.duration / 1000).toFixed(2).padStart(15)}s ${status.padStart(15)}`
    );
  }

  console.log('-'.repeat(80));
  console.log(`${'TOTAL'.padEnd(20)} ${(totalDuration / 1000).toFixed(2).padStart(15)}s`);

  const allSuccess = results.every((r) => r.success);
  const overallStatus = allSuccess ? '✓ ALL PASSED' : '✗ SOME FAILED';
  console.log(`\nOverall Status: ${overallStatus}\n`);

  // Exit with appropriate code
  process.exit(allSuccess ? 0 : 1);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();
  await runBenchmarks(options);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main, runBenchmarks };
