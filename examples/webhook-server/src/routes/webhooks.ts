import express, { Request, Response } from 'express';
import { WebhookPayloadSchema } from '../types/webhook.js';
import { validateSignature } from '../middleware/validateSignature.js';
import { ipAllowlist } from '../middleware/ipAllowlist.js';
import { getDatabase } from '../services/database.js';
import { getEventHandler } from '../services/eventHandler.js';
import { logger, logWebhookEvent, logWebhookError } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /webhooks/verification
 * Receive verification and age verification events
 */
router.post(
  '/verification',
  ipAllowlist,
  validateSignature,
  async (req: Request, res: Response) => {
    try {
      // Validate payload
      const payload = WebhookPayloadSchema.parse(req.body);

      // Log event
      logWebhookEvent(payload.eventType, payload.id, {
        holderDid: 'data' in payload ? (payload.data as any).holderDid : undefined,
      });

      // Store in database
      const db = getDatabase();
      db.insertEvent({
        id: payload.id,
        eventType: payload.eventType,
        payload: JSON.stringify(payload),
        signature: req.headers['x-webhook-signature'] as string,
        verified: (req as any).signatureVerified || false,
        sourceIp: req.ip || 'unknown',
        receivedAt: payload.timestamp,
      });

      // Process event asynchronously
      const handler = getEventHandler();
      handler.processEvent(payload).catch((error) => {
        logWebhookError(payload.id, error);
      });

      // Return success immediately (don't wait for processing)
      res.status(200).json({
        success: true,
        message: 'Webhook received',
        eventId: payload.id,
      });
    } catch (error) {
      logger.error('Error processing verification webhook', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
      });

      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid webhook payload',
          details: error.message,
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Error processing webhook',
        });
      }
    }
  }
);

/**
 * POST /webhooks/revocation
 * Receive credential revocation and expiration events
 */
router.post('/revocation', ipAllowlist, validateSignature, async (req: Request, res: Response) => {
  try {
    // Validate payload
    const payload = WebhookPayloadSchema.parse(req.body);

    // Log event
    logWebhookEvent(payload.eventType, payload.id, {
      credentialId: 'data' in payload ? (payload.data as any).credentialId : undefined,
    });

    // Store in database
    const db = getDatabase();
    db.insertEvent({
      id: payload.id,
      eventType: payload.eventType,
      payload: JSON.stringify(payload),
      signature: req.headers['x-webhook-signature'] as string,
      verified: (req as any).signatureVerified || false,
      sourceIp: req.ip || 'unknown',
      receivedAt: payload.timestamp,
    });

    // Process event asynchronously
    const handler = getEventHandler();
    handler.processEvent(payload).catch((error) => {
      logWebhookError(payload.id, error);
    });

    // Return success immediately
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      eventId: payload.id,
    });
  } catch (error) {
    logger.error('Error processing revocation webhook', {
      error: error instanceof Error ? error.message : String(error),
      body: req.body,
    });

    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid webhook payload',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error processing webhook',
      });
    }
  }
});

export default router;
