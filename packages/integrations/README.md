# @aura-network/verifier-integrations

Integration adapters for the Aura Verifier SDK, enabling businesses to integrate Aura verification with existing systems.

## Installation

```bash
npm install @aura-network/verifier-integrations
```

## Modules

### 1. Webhook Integration

Send verification events to external systems via webhooks.

```typescript
import { WebhookIntegration } from '@aura-network/verifier-integrations';

const webhook = new WebhookIntegration({
  url: 'https://your-system.com/webhooks/aura',
  secret: 'your-webhook-secret-min-16-chars',
  events: ['verification_success', 'verification_failure', 'sync_complete'],
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  },
});

// Send verification result
await webhook.sendVerificationResult({
  id: 'verification-123',
  timestamp: new Date(),
  success: true,
  holderDID: 'did:aura:holder123',
  verifierAddress: 'aura1verifier...',
  attributes: { age: 25, verified: true },
});

// Verify incoming webhooks (for bi-directional communication)
const isValid = webhook.verifySignature(payload, signature);
```

### 2. POS System Integration

Link verifications to point-of-sale transactions.

```typescript
import { POSIntegration } from '@aura-network/verifier-integrations';

const pos = new POSIntegration({
  system: 'square', // or 'clover', 'toast', 'generic'
  apiKey: 'your-pos-api-key',
  merchantId: 'your-merchant-id',
  environment: 'production',
});

// Link verification to transaction
await pos.linkToTransaction('verification-123', 'transaction-456', {
  location: 'Store #42',
  register: '3',
});

// Check if item requires verification
const requiresAge = pos.requiresAgeVerification('alcohol:beer:001');

// Get verification requirements for an item
const requirements = await pos.getItemRequirements('tobacco:cigarettes:001');

// Add custom verification rules
pos.addItemRule({
  itemId: 'rx:prescription:*',
  requirements: [
    {
      type: 'identity',
      attributes: ['full_name', 'date_of_birth'],
      required: true,
    },
  ],
  category: 'prescription_medication',
});
```

### 3. Audit Logging

Comprehensive audit trail for all verification activities.

```typescript
import { AuditLogger } from '@aura-network/verifier-integrations';

const audit = new AuditLogger({
  storage: 'local', // or 'remote'
  localStoragePath: './audit-logs',
  encryptLogs: true,
  encryptionKey: 'your-64-character-hex-encryption-key', // 32 bytes
  retentionDays: 90,
});

// Log verification event
await audit.log({
  id: 'audit-event-123',
  timestamp: new Date(),
  type: 'verification',
  verificationId: 'verification-123',
  result: 'success',
  holderDID: 'did:aura:holder123',
  verifierAddress: 'aura1verifier...',
  attributes: ['age', 'date_of_birth'],
  deviceId: 'device-001',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    country: 'US',
  },
  metadata: {
    transaction_id: 'tx-123',
    store_id: '42',
  },
});

// Query audit logs
const events = await audit.query({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  type: 'verification',
  result: 'success',
  limit: 100,
});

// Export audit logs
const csvReport = await audit.export('csv', {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
});

// Auto-purge old logs
const deletedCount = await audit.purgeOld();
```

### 4. Compliance Reporting

Generate compliance reports for various jurisdictions (GDPR, CCPA, etc.).

```typescript
import { ComplianceReporter } from '@aura-network/verifier-integrations';

const compliance = new ComplianceReporter(
  {
    jurisdiction: 'eu', // or 'us', 'uk', 'ca', 'au'
    reportingPeriod: 'monthly',
    organizationName: 'Your Business Inc.',
    regulatoryId: 'REG-123456',
    autoExport: true,
    exportPath: './compliance-reports',
  },
  auditLogger // Pass your AuditLogger instance
);

// Generate compliance report
const report = await compliance.generateReport({
  start: new Date('2025-01-01'),
  end: new Date('2025-01-31'),
});

// Export report
const pdfReport = await compliance.exportReport(report, 'pdf');

// GDPR: Generate data subject report (right to access)
const subjectReport = await compliance.generateDataSubjectReport('did:aura:holder123');

// GDPR: Delete data subject records (right to be forgotten)
await compliance.deleteDataSubjectRecords('did:aura:holder123');

// Get next reporting period
const nextPeriod = compliance.getNextReportingPeriod();
```

### 5. Fallback Verification

Manual verification when Aura is unavailable or user doesn't have credentials.

```typescript
import { FallbackVerification } from '@aura-network/verifier-integrations';

const fallback = new FallbackVerification({
  provider: 'manual', // or 'document_scan'
  enabled: true,
  triggerConditions: ['network_error', 'aura_unavailable', 'user_no_aura'],
  requireApproval: true,
  approverRoles: ['manager', 'supervisor'],
  photoRequired: true,
  notesRequired: true,
});

// Check if fallback should be used
const error = {
  code: 'NO_CREDENTIALS',
  message: 'User does not have Aura credentials',
  type: 'user',
  recoverable: false,
};

if (fallback.shouldUseFallback(error)) {
  // Record manual verification
  const record = await fallback.recordManualVerification(
    'drivers_license',
    'John Doe, DOB: 01/15/1990, License: DL123456, Exp: 12/31/2025',
    photoBuffer, // Buffer of ID photo
    'verifier-001',
    'Jane Smith'
  );

  // Approve verification (if approval required)
  if (fallback.isApprovalRequired()) {
    await fallback.approveVerification(
      record.id,
      'manager-123',
      true,
      'Verified identity matches photo ID'
    );
  }
}

// Document scanning
const scanResult = await fallback.scanDocument(imageBuffer);
if (scanResult.success && scanResult.confidence > 0.8) {
  const record = await fallback.createFromScan(
    scanResult,
    'Auto-verified via document scan',
    imageBuffer
  );
}

// Query fallback records
const pendingApprovals = await fallback.queryRecords({
  pendingApproval: true,
});

// Export records
const jsonExport = fallback.exportRecords('json');
```

## Configuration Validation

```typescript
import { validateIntegrationConfig } from '@aura-network/verifier-integrations';

const isValid = validateIntegrationConfig('webhook', {
  url: 'https://example.com/webhook',
  secret: 'my-secret-key-min-16',
  events: ['verification_success'],
});
```

## Complete Example

```typescript
import {
  WebhookIntegration,
  POSIntegration,
  AuditLogger,
  ComplianceReporter,
  FallbackVerification,
} from '@aura-network/verifier-integrations';

// Initialize integrations
const audit = new AuditLogger({
  storage: 'local',
  encryptLogs: true,
  encryptionKey: process.env.AUDIT_ENCRYPTION_KEY,
  retentionDays: 90,
});

const webhook = new WebhookIntegration({
  url: process.env.WEBHOOK_URL,
  secret: process.env.WEBHOOK_SECRET,
  events: ['verification_success', 'verification_failure'],
});

const pos = new POSIntegration({
  system: 'square',
  apiKey: process.env.SQUARE_API_KEY,
  merchantId: process.env.SQUARE_MERCHANT_ID,
});

const fallback = new FallbackVerification({
  provider: 'manual',
  enabled: true,
  triggerConditions: ['user_no_aura', 'network_error'],
});

const compliance = new ComplianceReporter(
  {
    jurisdiction: 'us',
    reportingPeriod: 'monthly',
    organizationName: 'Acme Retail',
  },
  audit
);

// Verification flow
async function verifyCustomer(customerId: string, transactionId: string) {
  try {
    // Try Aura verification first
    const result = await auraVerifier.verify(customerId);

    // Log audit event
    await audit.log({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      type: 'verification',
      verificationId: result.id,
      result: 'success',
      deviceId: 'device-001',
    });

    // Send webhook
    await webhook.sendVerificationResult(result);

    // Link to POS transaction
    await pos.linkToTransaction(result.id, transactionId);

    return result;
  } catch (error) {
    // Use fallback if appropriate
    if (fallback.shouldUseFallback(error)) {
      const manualRecord = await fallback.recordManualVerification(
        'drivers_license',
        'Manual verification notes...',
        photoBuffer
      );

      await audit.log({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        type: 'verification',
        result: 'success',
        deviceId: 'device-001',
        metadata: { fallback: 'true', method: 'manual' },
      });

      return manualRecord;
    }

    throw error;
  }
}

// Monthly compliance report
async function generateMonthlyReport() {
  const period = compliance.getNextReportingPeriod();
  const report = await compliance.generateReport(period);
  const pdf = await compliance.exportReport(report, 'pdf');

  // Save or email the report
  await fs.writeFile(`./reports/${report.id}.pdf`, pdf);
}
```

## Security Considerations

1. **Webhook Secrets**: Use strong, random secrets (minimum 16 characters)
2. **Encryption Keys**: Use 32-byte (64 hex characters) keys for audit log encryption
3. **API Keys**: Store POS and other API keys securely in environment variables
4. **Photo Evidence**: Consider encrypting stored photos of identity documents
5. **Audit Logs**: Enable encryption for sensitive verification data
6. **Access Control**: Implement proper role-based access for fallback approvals

## Compliance Features

### GDPR (EU)

- Right to access (data subject reports)
- Right to be forgotten (data deletion)
- Data minimization (attribute tracking)
- Retention policies (auto-purge old logs)

### CCPA (California, US)

- Consumer data access
- Data deletion requests
- Disclosure tracking

### Other Jurisdictions

- UK GDPR, PIPEDA (Canada), Privacy Act (Australia)
- Customizable retention periods
- Jurisdiction-specific recommendations

## License

MIT
