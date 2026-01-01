import {
  WebhookPayload,
  WebhookEventType,
  VerificationSuccessPayload,
  VerificationFailedPayload,
  CredentialRevokedPayload,
  CredentialExpiredPayload,
  AgeVerificationPassedPayload,
  AgeVerificationFailedPayload,
} from '../types/webhook.js';
import { logger } from '../utils/logger.js';
import { getDatabase } from './database.js';

/**
 * Event handler service for processing webhook events
 */
export class EventHandlerService {
  /**
   * Process webhook event
   */
  async processEvent(payload: WebhookPayload): Promise<void> {
    logger.info('Processing webhook event', {
      eventId: payload.id,
      eventType: payload.eventType,
    });

    try {
      switch (payload.eventType) {
        case WebhookEventType.VERIFICATION_SUCCESS:
          await this.handleVerificationSuccess(payload);
          break;
        case WebhookEventType.VERIFICATION_FAILED:
          await this.handleVerificationFailed(payload);
          break;
        case WebhookEventType.CREDENTIAL_REVOKED:
          await this.handleCredentialRevoked(payload);
          break;
        case WebhookEventType.CREDENTIAL_EXPIRED:
          await this.handleCredentialExpired(payload);
          break;
        case WebhookEventType.AGE_VERIFICATION_PASSED:
          await this.handleAgeVerificationPassed(payload);
          break;
        case WebhookEventType.AGE_VERIFICATION_FAILED:
          await this.handleAgeVerificationFailed(payload);
          break;
        default:
          logger.warn('Unknown event type', { eventType: payload.eventType });
      }

      // Mark as processed
      const db = getDatabase();
      db.markEventProcessed(payload.id);

      logger.info('Webhook event processed successfully', {
        eventId: payload.id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error('Failed to process webhook event', {
        eventId: payload.id,
        error: errorMessage,
      });

      // Mark as processed with error
      const db = getDatabase();
      db.markEventProcessed(payload.id, errorMessage);

      throw error;
    }
  }

  /**
   * Handle verification success
   */
  private async handleVerificationSuccess(
    payload: VerificationSuccessPayload
  ): Promise<void> {
    logger.info('Verification successful', {
      credentialId: payload.data.credentialId,
      holderDid: payload.data.holderDid,
      credentialType: payload.data.credentialType,
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Grant access to a resource
    // - Update user permissions
    // - Send notification to user
    // - Trigger workflow
    // - Update internal database
  }

  /**
   * Handle verification failed
   */
  private async handleVerificationFailed(
    payload: VerificationFailedPayload
  ): Promise<void> {
    logger.warn('Verification failed', {
      reason: payload.data.reason,
      errorCode: payload.data.errorCode,
      credentialId: payload.data.credentialId,
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Log failed attempt
    // - Send alert to admin
    // - Block suspicious activity
    // - Update fraud detection system
  }

  /**
   * Handle credential revoked
   */
  private async handleCredentialRevoked(
    payload: CredentialRevokedPayload
  ): Promise<void> {
    logger.info('Credential revoked', {
      credentialId: payload.data.credentialId,
      holderDid: payload.data.holderDid,
      revokedAt: payload.data.revokedAt,
      reason: payload.data.reason,
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Revoke access immediately
    // - Update user status
    // - Send notification to user
    // - Trigger compliance workflow
    // - Update audit log
  }

  /**
   * Handle credential expired
   */
  private async handleCredentialExpired(
    payload: CredentialExpiredPayload
  ): Promise<void> {
    logger.info('Credential expired', {
      credentialId: payload.data.credentialId,
      holderDid: payload.data.holderDid,
      expiredAt: payload.data.expiredAt,
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Remove access permissions
    // - Send renewal reminder to user
    // - Update user status
    // - Trigger re-verification workflow
  }

  /**
   * Handle age verification passed
   */
  private async handleAgeVerificationPassed(
    payload: AgeVerificationPassedPayload
  ): Promise<void> {
    logger.info('Age verification passed', {
      credentialId: payload.data.credentialId,
      holderDid: payload.data.holderDid,
      minimumAge: payload.data.minimumAge,
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Grant age-restricted access
    // - Enable age-gated features
    // - Update user profile
    // - Allow purchase of age-restricted items
  }

  /**
   * Handle age verification failed
   */
  private async handleAgeVerificationFailed(
    payload: AgeVerificationFailedPayload
  ): Promise<void> {
    logger.warn('Age verification failed', {
      reason: payload.data.reason,
      minimumAge: payload.data.minimumAge,
      holderDid: payload.data.holderDid,
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Block access to age-restricted content
    // - Log failed attempt
    // - Send notification to user
    // - Redirect to age verification flow
  }
}

// Singleton instance
let handlerInstance: EventHandlerService | null = null;

/**
 * Get event handler instance
 */
export function getEventHandler(): EventHandlerService {
  if (!handlerInstance) {
    handlerInstance = new EventHandlerService();
  }
  return handlerInstance;
}
