// Main exports for @aura-network/verifier-integrations

// Webhook integration
export {
  WebhookIntegration,
  type WebhookConfig,
  type WebhookEvent,
  type WebhookDeliveryResult,
  type VerificationResult,
  type RetryPolicy,
} from './webhook/index.js';

// POS system integration
export {
  POSIntegration,
  type POSIntegrationConfig,
  type VerificationRequirement,
  type TransactionLink,
  type ItemVerificationRule,
} from './pos/index.js';

// Audit logging
export {
  AuditLogger,
  type AuditConfig,
  type AuditEvent,
  type AuditFilter,
  type AuditSummary,
  type GeoLocation,
} from './audit/index.js';

// Compliance reporting
export {
  ComplianceReporter,
  type ComplianceConfig,
  type ComplianceReport,
  type DataSubjectReport,
  type DateRange,
} from './compliance/index.js';

// Fallback verification
export {
  FallbackVerification,
  type FallbackConfig,
  type ManualVerificationRecord,
  type DocumentScanResult,
  type AuraVerifierError,
} from './fallback/index.js';

// Re-export common types
export type IntegrationModule = 'webhook' | 'pos' | 'audit' | 'compliance' | 'fallback';

// Version information
export const VERSION = '1.0.0';
export const INTEGRATION_MODULES: IntegrationModule[] = [
  'webhook',
  'pos',
  'audit',
  'compliance',
  'fallback',
];

// Helper function to validate integration configurations
export function validateIntegrationConfig(module: IntegrationModule, config: unknown): boolean {
  switch (module) {
    case 'webhook':
      return validateWebhookConfig(config);
    case 'pos':
      return validatePOSConfig(config);
    case 'audit':
      return validateAuditConfig(config);
    case 'compliance':
      return validateComplianceConfig(config);
    case 'fallback':
      return validateFallbackConfig(config);
    default:
      return false;
  }
}

function validateWebhookConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return !!(c.url && c.secret && Array.isArray(c.events));
}

function validatePOSConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const validSystems = ['square', 'clover', 'toast', 'generic'];
  return !!(c.system && validSystems.includes(c.system as string));
}

function validateAuditConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const validStorage = ['local', 'remote'];
  return !!(c.storage && validStorage.includes(c.storage as string));
}

function validateComplianceConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const validJurisdictions = ['us', 'eu', 'uk', 'ca', 'au'];
  const validPeriods = ['daily', 'weekly', 'monthly'];
  return !!(
    c.jurisdiction &&
    validJurisdictions.includes(c.jurisdiction as string) &&
    c.reportingPeriod &&
    validPeriods.includes(c.reportingPeriod as string)
  );
}

function validateFallbackConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  const validProviders = ['manual', 'document_scan'];
  return !!(
    c.provider &&
    validProviders.includes(c.provider as string) &&
    typeof c.enabled === 'boolean' &&
    Array.isArray(c.triggerConditions)
  );
}
