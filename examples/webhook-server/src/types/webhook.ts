import { z } from 'zod';

/**
 * Webhook event types
 */
export enum WebhookEventType {
  VERIFICATION_SUCCESS = 'VERIFICATION_SUCCESS',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  CREDENTIAL_REVOKED = 'CREDENTIAL_REVOKED',
  CREDENTIAL_EXPIRED = 'CREDENTIAL_EXPIRED',
  AGE_VERIFICATION_PASSED = 'AGE_VERIFICATION_PASSED',
  AGE_VERIFICATION_FAILED = 'AGE_VERIFICATION_FAILED',
}

/**
 * Base webhook payload schema
 */
const BaseWebhookPayloadSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  eventType: z.nativeEnum(WebhookEventType),
  apiVersion: z.string().default('1.0'),
});

/**
 * Verification success payload
 */
export const VerificationSuccessPayloadSchema = BaseWebhookPayloadSchema.extend({
  eventType: z.literal(WebhookEventType.VERIFICATION_SUCCESS),
  data: z.object({
    credentialId: z.string(),
    holderDid: z.string(),
    issuerDid: z.string(),
    credentialType: z.string(),
    verificationMethod: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Verification failed payload
 */
export const VerificationFailedPayloadSchema = BaseWebhookPayloadSchema.extend({
  eventType: z.literal(WebhookEventType.VERIFICATION_FAILED),
  data: z.object({
    credentialId: z.string().optional(),
    holderDid: z.string().optional(),
    reason: z.string(),
    errorCode: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Credential revoked payload
 */
export const CredentialRevokedPayloadSchema = BaseWebhookPayloadSchema.extend({
  eventType: z.literal(WebhookEventType.CREDENTIAL_REVOKED),
  data: z.object({
    credentialId: z.string(),
    holderDid: z.string(),
    issuerDid: z.string(),
    revokedAt: z.string().datetime(),
    reason: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Credential expired payload
 */
export const CredentialExpiredPayloadSchema = BaseWebhookPayloadSchema.extend({
  eventType: z.literal(WebhookEventType.CREDENTIAL_EXPIRED),
  data: z.object({
    credentialId: z.string(),
    holderDid: z.string(),
    issuerDid: z.string(),
    expiredAt: z.string().datetime(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Age verification passed payload
 */
export const AgeVerificationPassedPayloadSchema = BaseWebhookPayloadSchema.extend({
  eventType: z.literal(WebhookEventType.AGE_VERIFICATION_PASSED),
  data: z.object({
    credentialId: z.string(),
    holderDid: z.string(),
    minimumAge: z.number(),
    verifiedAge: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Age verification failed payload
 */
export const AgeVerificationFailedPayloadSchema = BaseWebhookPayloadSchema.extend({
  eventType: z.literal(WebhookEventType.AGE_VERIFICATION_FAILED),
  data: z.object({
    credentialId: z.string().optional(),
    holderDid: z.string().optional(),
    minimumAge: z.number(),
    reason: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Union of all webhook payload schemas
 */
export const WebhookPayloadSchema = z.discriminatedUnion('eventType', [
  VerificationSuccessPayloadSchema,
  VerificationFailedPayloadSchema,
  CredentialRevokedPayloadSchema,
  CredentialExpiredPayloadSchema,
  AgeVerificationPassedPayloadSchema,
  AgeVerificationFailedPayloadSchema,
]);

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type VerificationSuccessPayload = z.infer<typeof VerificationSuccessPayloadSchema>;
export type VerificationFailedPayload = z.infer<typeof VerificationFailedPayloadSchema>;
export type CredentialRevokedPayload = z.infer<typeof CredentialRevokedPayloadSchema>;
export type CredentialExpiredPayload = z.infer<typeof CredentialExpiredPayloadSchema>;
export type AgeVerificationPassedPayload = z.infer<typeof AgeVerificationPassedPayloadSchema>;
export type AgeVerificationFailedPayload = z.infer<typeof AgeVerificationFailedPayloadSchema>;

/**
 * Database event record
 */
export interface WebhookEvent {
  id: string;
  eventType: WebhookEventType;
  payload: string; // JSON string
  signature: string;
  verified: boolean;
  sourceIp: string;
  receivedAt: string;
  processedAt?: string;
  error?: string;
}

/**
 * Analytics data
 */
export interface WebhookAnalytics {
  totalEvents: number;
  eventsByType: Record<WebhookEventType, number>;
  successRate: number;
  averageProcessingTime: number;
  recentEvents: Array<{
    id: string;
    eventType: WebhookEventType;
    timestamp: string;
    verified: boolean;
  }>;
}
