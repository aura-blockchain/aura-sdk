/**
 * Batch Verification Handler
 *
 * Provides concurrent batch verification with concurrency control and error handling.
 */

import {
  VerificationRequest,
  VerificationResult,
  BatchVerificationOptions,
  BatchVerificationResult,
} from './types.js';

/**
 * Default batch verification options
 */
const DEFAULT_BATCH_OPTIONS: Required<BatchVerificationOptions> = {
  concurrency: 5,
  stopOnError: false,
  batchTimeout: 300000, // 5 minutes
};

/**
 * Execute async tasks with concurrency limit
 * @param tasks - Array of async task functions
 * @param concurrency - Maximum concurrent tasks
 * @returns Array of results or errors
 */
async function executeWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<(T | Error)[]> {
  const results: (T | Error)[] = new Array(tasks.length);
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    const index = i;

    const p = (async () => {
      try {
        results[index] = await task();
      } catch (error) {
        results[index] = error instanceof Error ? error : new Error(String(error));
      }
    })();

    // Create a wrapper that removes itself from the set when done
    const wrapped = p.then(
      () => { executing.delete(wrapped); },
      () => { executing.delete(wrapped); }
    );
    executing.add(wrapped);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Process verification requests in batches with concurrency control
 */
export class BatchVerifier {
  private verifyFn: (request: VerificationRequest) => Promise<VerificationResult>;
  private options: Required<BatchVerificationOptions>;

  constructor(
    verifyFn: (request: VerificationRequest) => Promise<VerificationResult>,
    options: BatchVerificationOptions = {}
  ) {
    this.verifyFn = verifyFn;
    this.options = { ...DEFAULT_BATCH_OPTIONS, ...options };
  }

  /**
   * Verify multiple requests concurrently
   * @param requests - Array of verification requests
   * @returns Batch verification result
   */
  async verifyBatch(requests: VerificationRequest[]): Promise<BatchVerificationResult> {
    const startTime = Date.now();

    if (requests.length === 0) {
      return {
        results: [],
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        averageTime: 0,
      };
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Batch verification timed out after ${this.options.batchTimeout}ms`));
      }, this.options.batchTimeout);
    });

    // Create verification tasks
    const tasks = requests.map((request, index) => async () => {
      const taskStart = Date.now();

      try {
        const result = await this.verifyFn(request);

        if (this.options.stopOnError && !result.isValid) {
          throw new Error(`Verification failed for request ${index}: ${result.verificationError}`);
        }

        return result;
      } catch (error) {
        if (this.options.stopOnError) {
          throw error;
        }
        return error instanceof Error ? error : new Error(String(error));
      } finally {
        const taskEnd = Date.now();
        console.debug(`[BatchVerifier] Request ${index} completed in ${taskEnd - taskStart}ms`);
      }
    });

    try {
      // Execute with timeout
      const results = await Promise.race([
        executeWithConcurrency(tasks, this.options.concurrency),
        timeoutPromise,
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Count successes and failures
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result) => {
        if (result instanceof Error) {
          failureCount++;
        } else if ('isValid' in result) {
          if (result.isValid) {
            successCount++;
          } else {
            failureCount++;
          }
        }
      });

      return {
        results,
        successCount,
        failureCount,
        totalTime,
        averageTime: totalTime / requests.length,
      };
    } catch (error) {
      // Handle timeout or stopOnError scenario
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const errorObj = error instanceof Error ? error : new Error(String(error));

      return {
        results: [errorObj],
        successCount: 0,
        failureCount: requests.length,
        totalTime,
        averageTime: totalTime,
      };
    }
  }

  /**
   * Update batch options
   * @param options - New options to merge
   */
  updateOptions(options: Partial<BatchVerificationOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Helper function to filter successful results from batch
 * @param results - Batch verification results
 * @returns Array of successful verification results
 */
export function getSuccessfulResults(
  results: (VerificationResult | Error)[]
): VerificationResult[] {
  return results.filter(
    (result): result is VerificationResult =>
      !(result instanceof Error) && result.isValid
  );
}

/**
 * Helper function to filter failed results from batch
 * @param results - Batch verification results
 * @returns Array of errors or failed results
 */
export function getFailedResults(
  results: (VerificationResult | Error)[]
): (VerificationResult | Error)[] {
  return results.filter((result) => {
    if (result instanceof Error) {
      return true;
    }
    return !result.isValid;
  });
}

/**
 * Helper function to extract error messages from batch results
 * @param results - Batch verification results
 * @returns Array of error messages
 */
export function extractErrors(results: (VerificationResult | Error)[]): string[] {
  const errors: string[] = [];

  results.forEach((result) => {
    if (result instanceof Error) {
      errors.push(result.message);
    } else if (!result.isValid && result.verificationError) {
      errors.push(result.verificationError);
    }
  });

  return errors;
}

/**
 * Group batch results by status
 * @param results - Batch verification results
 * @returns Grouped results
 */
export function groupResultsByStatus(results: (VerificationResult | Error)[]): {
  valid: VerificationResult[];
  invalid: VerificationResult[];
  errors: Error[];
} {
  const valid: VerificationResult[] = [];
  const invalid: VerificationResult[] = [];
  const errors: Error[] = [];

  results.forEach((result) => {
    if (result instanceof Error) {
      errors.push(result);
    } else if (result.isValid) {
      valid.push(result);
    } else {
      invalid.push(result);
    }
  });

  return { valid, invalid, errors };
}

/**
 * Calculate batch success rate
 * @param batchResult - Batch verification result
 * @returns Success rate (0-1)
 */
export function calculateSuccessRate(batchResult: BatchVerificationResult): number {
  const total = batchResult.successCount + batchResult.failureCount;
  return total > 0 ? batchResult.successCount / total : 0;
}

/**
 * Format batch result for logging
 * @param batchResult - Batch verification result
 * @returns Formatted string
 */
export function formatBatchResult(batchResult: BatchVerificationResult): string {
  const successRate = (calculateSuccessRate(batchResult) * 100).toFixed(1);

  return [
    '=== Batch Verification Result ===',
    `Total: ${batchResult.successCount + batchResult.failureCount}`,
    `Successful: ${batchResult.successCount}`,
    `Failed: ${batchResult.failureCount}`,
    `Success Rate: ${successRate}%`,
    `Total Time: ${batchResult.totalTime}ms`,
    `Average Time: ${batchResult.averageTime.toFixed(2)}ms`,
  ].join('\n');
}

/**
 * Chunk array into smaller batches
 * @param array - Input array
 * @param chunkSize - Size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Process very large batches in smaller chunks
 * @param requests - All verification requests
 * @param verifyFn - Verification function
 * @param options - Batch options
 * @param chunkSize - Size of each processing chunk (default: 100)
 * @returns Combined batch result
 */
export async function verifyLargeBatch(
  requests: VerificationRequest[],
  verifyFn: (request: VerificationRequest) => Promise<VerificationResult>,
  options: BatchVerificationOptions = {},
  chunkSize = 100
): Promise<BatchVerificationResult> {
  const chunks = chunkArray(requests, chunkSize);
  const allResults: (VerificationResult | Error)[] = [];
  let totalTime = 0;
  let successCount = 0;
  let failureCount = 0;

  const batchVerifier = new BatchVerifier(verifyFn, options);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    // Silent chunk processing (verbose logging removed for security)

    const chunkResult = await batchVerifier.verifyBatch(chunk);

    allResults.push(...chunkResult.results);
    totalTime += chunkResult.totalTime;
    successCount += chunkResult.successCount;
    failureCount += chunkResult.failureCount;

    // Small delay between chunks to prevent overwhelming the network
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    results: allResults,
    successCount,
    failureCount,
    totalTime,
    averageTime: totalTime / requests.length,
  };
}
