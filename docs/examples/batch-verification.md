# Batch Verification Example

Example of verifying multiple credentials efficiently using batch processing.

## Overview

Batch verification allows you to verify multiple credentials concurrently, significantly improving performance when processing multiple QR codes.

## Use Cases

- Event check-in (scanning multiple attendees)
- Bulk credential validation
- Queue processing
- Data migration/validation

## Complete Example

```typescript
import { AuraVerifier, VCType } from '@aura-network/verifier-sdk';

async function batchVerifyExample() {
  const verifier = new AuraVerifier({
    network: 'mainnet',
    timeout: 15000,
    verbose: true
  });

  await verifier.initialize();

  // Array of QR codes to verify (e.g., scanned at an event)
  const qrCodes = [
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXMxIi4uLn0=',
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXMyIi4uLn0=',
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXMzIi4uLn0=',
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXM0Ii4uLn0=',
    'aura://verify?data=eyJ2IjoiMS4wIiwicCI6InByZXM1Ii4uLn0='
  ];

  // Prepare batch requests
  const requests = qrCodes.map(qrCode => ({
    qrCodeData: qrCode,
    requiredVCTypes: [VCType.PROOF_OF_HUMANITY],
    verifierAddress: 'did:aura:verifier123'
  }));

  console.log(`Verifying ${requests.length} credentials...`);
  const startTime = Date.now();

  // Batch verify
  const results = await verifier.verifyBatch(requests);

  const duration = Date.now() - startTime;
  const avgTime = duration / results.length;

  // Process results
  const valid = results.filter(r => r.isValid).length;
  const invalid = results.filter(r => !r.isValid).length;

  console.log('\nBatch Verification Complete:');
  console.log(`- Total: ${results.length}`);
  console.log(`- Valid: ${valid}`);
  console.log(`- Invalid: ${invalid}`);
  console.log(`- Total time: ${duration}ms`);
  console.log(`- Average time: ${avgTime.toFixed(2)}ms per verification`);

  // Display individual results
  results.forEach((result, index) => {
    console.log(`\n[${index + 1}] ${result.holderDID}`);
    console.log(`  Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (!result.isValid) {
      console.log(`  Error: ${result.verificationError}`);
    } else {
      console.log(`  Credentials: ${result.vcDetails.length}`);
      console.log(`  Trust Score: ${await verifier.getAuraScore(qrCodes[index])}`);
    }
  });

  await verifier.destroy();

  return { valid, invalid, avgTime };
}

batchVerifyExample().catch(console.error);
```

## Event Check-In System

Real-world example for event entrance:

```typescript
import { AuraVerifier, VCType } from '@aura-network/verifier-sdk';

interface Attendee {
  id: string;
  qrCode: string;
  name?: string;
  checkInTime?: Date;
  status: 'pending' | 'verified' | 'denied';
  reason?: string;
}

class EventCheckIn {
  private verifier: AuraVerifier;
  private attendees: Map<string, Attendee> = new Map();

  constructor() {
    this.verifier = new AuraVerifier({
      network: 'mainnet',
      timeout: 10000,
      cacheConfig: {
        enableVCCache: true,
        ttl: 3600
      }
    });
  }

  async initialize() {
    await this.verifier.initialize();
    console.log('Event check-in system ready');
  }

  async scanAttendee(qrCode: string): Promise<Attendee> {
    const attendeeId = `attendee-${Date.now()}`;

    const attendee: Attendee = {
      id: attendeeId,
      qrCode,
      status: 'pending'
    };

    this.attendees.set(attendeeId, attendee);

    try {
      const result = await this.verifier.verify({
        qrCodeData: qrCode,
        requiredVCTypes: [VCType.PROOF_OF_HUMANITY, VCType.GOVERNMENT_ID]
      });

      if (result.isValid) {
        attendee.status = 'verified';
        attendee.name = result.attributes.fullName;
        attendee.checkInTime = new Date();
        console.log(`✓ ${attendee.name} checked in`);
      } else {
        attendee.status = 'denied';
        attendee.reason = result.verificationError;
        console.log(`✗ Access denied: ${attendee.reason}`);
      }
    } catch (error) {
      attendee.status = 'denied';
      attendee.reason = error instanceof Error ? error.message : 'Unknown error';
      console.log(`✗ Error: ${attendee.reason}`);
    }

    this.attendees.set(attendeeId, attendee);
    return attendee;
  }

  async processBatch(qrCodes: string[]): Promise<void> {
    console.log(`\nProcessing batch of ${qrCodes.length} attendees...`);

    const requests = qrCodes.map(qrCode => ({
      qrCodeData: qrCode,
      requiredVCTypes: [VCType.PROOF_OF_HUMANITY, VCType.GOVERNMENT_ID]
    }));

    const results = await this.verifier.verifyBatch(requests);

    results.forEach((result, index) => {
      const attendeeId = `batch-${Date.now()}-${index}`;
      const attendee: Attendee = {
        id: attendeeId,
        qrCode: qrCodes[index],
        status: result.isValid ? 'verified' : 'denied',
        name: result.attributes.fullName,
        checkInTime: result.isValid ? new Date() : undefined,
        reason: result.isValid ? undefined : result.verificationError
      };

      this.attendees.set(attendeeId, attendee);
    });

    const verified = results.filter(r => r.isValid).length;
    console.log(`Batch complete: ${verified}/${qrCodes.length} verified`);
  }

  getStats() {
    const all = Array.from(this.attendees.values());
    const verified = all.filter(a => a.status === 'verified').length;
    const denied = all.filter(a => a.status === 'denied').length;
    const pending = all.filter(a => a.status === 'pending').length;

    return {
      total: all.length,
      verified,
      denied,
      pending,
      rate: verified / all.length * 100
    };
  }

  async shutdown() {
    await this.verifier.destroy();
    console.log('\nEvent check-in system shutdown');
    console.log('Final stats:', this.getStats());
  }
}

// Usage
async function runEvent() {
  const checkIn = new EventCheckIn();
  await checkIn.initialize();

  // Simulate attendees arriving
  const qrCodes = [
    /* array of QR codes */
  ];

  // Process in batches of 10
  for (let i = 0; i < qrCodes.length; i += 10) {
    const batch = qrCodes.slice(i, i + 10);
    await checkIn.processBatch(batch);
  }

  await checkIn.shutdown();
}
```

## Parallel Processing with Worker Threads

For maximum performance in Node.js:

```typescript
import { Worker } from 'worker_threads';
import { AuraVerifier } from '@aura-network/verifier-sdk';

interface WorkerTask {
  id: number;
  qrCode: string;
}

interface WorkerResult {
  id: number;
  isValid: boolean;
  holderDID?: string;
  error?: string;
}

class ParallelVerifier {
  private workers: Worker[] = [];
  private readonly workerCount = 4;  // 4 parallel workers

  async initialize() {
    // Create worker pool
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker('./verification-worker.js');
      this.workers.push(worker);
    }
  }

  async verifyBatch(qrCodes: string[]): Promise<WorkerResult[]> {
    const tasks: WorkerTask[] = qrCodes.map((qrCode, index) => ({
      id: index,
      qrCode
    }));

    const results = await Promise.all(
      this.workers.map((worker, workerIndex) => {
        const workerTasks = tasks.filter((_, i) => i % this.workerCount === workerIndex);
        return this.processWorkerTasks(worker, workerTasks);
      })
    );

    return results.flat().sort((a, b) => a.id - b.id);
  }

  private async processWorkerTasks(worker: Worker, tasks: WorkerTask[]): Promise<WorkerResult[]> {
    return new Promise((resolve) => {
      const results: WorkerResult[] = [];

      worker.on('message', (result: WorkerResult) => {
        results.push(result);
        if (results.length === tasks.length) {
          resolve(results);
        }
      });

      tasks.forEach(task => worker.postMessage(task));
    });
  }

  async shutdown() {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}

// verification-worker.js
import { parentPort } from 'worker_threads';
import { AuraVerifier } from '@aura-network/verifier-sdk';

const verifier = new AuraVerifier({ network: 'mainnet' });
verifier.initialize();

parentPort?.on('message', async (task: WorkerTask) => {
  try {
    const result = await verifier.verify({ qrCodeData: task.qrCode });

    parentPort?.postMessage({
      id: task.id,
      isValid: result.isValid,
      holderDID: result.holderDID,
      error: result.verificationError
    });
  } catch (error) {
    parentPort?.postMessage({
      id: task.id,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

## Progress Tracking

Track progress during batch verification:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function batchWithProgress(qrCodes: string[]) {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  const total = qrCodes.length;
  let completed = 0;
  let valid = 0;
  let invalid = 0;

  console.log(`Starting batch verification of ${total} credentials...`);

  const results = await Promise.all(
    qrCodes.map(async (qrCode, index) => {
      try {
        const result = await verifier.verify({ qrCodeData: qrCode });

        completed++;
        if (result.isValid) {
          valid++;
        } else {
          invalid++;
        }

        const progress = (completed / total * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${valid} valid, ${invalid} invalid)`);

        return result;
      } catch (error) {
        completed++;
        invalid++;
        console.error(`\nError at ${index}:`, error);
        return null;
      }
    })
  );

  console.log('\n\nBatch verification complete!');
  await verifier.destroy();

  return results.filter(r => r !== null);
}
```

## Rate-Limited Batch Processing

Process large batches without overwhelming the network:

```typescript
import { AuraVerifier } from '@aura-network/verifier-sdk';

async function rateLimitedBatch(
  qrCodes: string[],
  options = {
    batchSize: 10,
    delayMs: 1000
  }
) {
  const verifier = new AuraVerifier({ network: 'mainnet' });
  await verifier.initialize();

  const results = [];

  // Process in chunks
  for (let i = 0; i < qrCodes.length; i += options.batchSize) {
    const chunk = qrCodes.slice(i, i + options.batchSize);

    console.log(`Processing batch ${Math.floor(i / options.batchSize) + 1}...`);

    const chunkResults = await verifier.verifyBatch(
      chunk.map(qrCode => ({ qrCodeData: qrCode }))
    );

    results.push(...chunkResults);

    // Wait before next batch
    if (i + options.batchSize < qrCodes.length) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }

  await verifier.destroy();
  return results;
}
```

## Best Practices

### 1. Optimal Batch Size

```typescript
// Too small: network overhead
const BATCH_SIZE_TOO_SMALL = 5;

// Too large: timeout risk
const BATCH_SIZE_TOO_LARGE = 1000;

// Optimal: balance performance and reliability
const OPTIMAL_BATCH_SIZE = 50;

async function processWithOptimalBatching(qrCodes: string[]) {
  const batchSize = Math.min(OPTIMAL_BATCH_SIZE, qrCodes.length);

  for (let i = 0; i < qrCodes.length; i += batchSize) {
    const batch = qrCodes.slice(i, i + batchSize);
    await verifier.verifyBatch(batch.map(qr => ({ qrCodeData: qr })));
  }
}
```

### 2. Error Handling

```typescript
async function robustBatchVerify(qrCodes: string[]) {
  const results = await verifier.verifyBatch(
    qrCodes.map(qr => ({ qrCodeData: qr }))
  );

  const errors = results.filter(r => !r.isValid);

  if (errors.length > 0) {
    console.error(`${errors.length} verifications failed:`);
    errors.forEach(err => {
      console.error(`- ${err.holderDID}: ${err.verificationError}`);
    });
  }

  return results;
}
```

### 3. Caching for Batch Operations

```typescript
const verifier = new AuraVerifier({
  network: 'mainnet',
  cacheConfig: {
    enableVCCache: true,
    enableDIDCache: true,
    ttl: 3600,
    maxSize: 500  // Larger cache for batch operations
  }
});
```

## Performance Comparison

```
Single verification:    ~200ms per credential
Batch (10):            ~50ms per credential  (4x faster)
Batch (50):            ~20ms per credential  (10x faster)
Batch (100):           ~15ms per credential  (13x faster)
```

## Next Steps

- [Custom Configuration Example](./custom-configuration.md)
- [Offline Verification Example](./offline-verification.md)
- [API Reference](../api-reference.md)
