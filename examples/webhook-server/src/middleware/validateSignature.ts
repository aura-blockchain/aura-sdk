import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../utils/crypto.js';
import { logger, logWebhookVerification } from '../utils/logger.js';

/**
 * Express middleware to validate webhook signatures
 */
export function validateSignature(req: Request, res: Response, next: NextFunction): void {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('WEBHOOK_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Webhook secret not configured',
      });
      return;
    }

    if (!signature) {
      logger.warn('Missing webhook signature header', {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing X-Webhook-Signature header',
      });
      return;
    }

    // Get raw body (set by express.raw())
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      logger.error('Raw body not available for signature verification');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Raw body not available',
      });
      return;
    }

    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

    // Log verification result
    const eventId = req.body?.id || 'unknown';
    logWebhookVerification(eventId, isValid, isValid ? undefined : 'Invalid signature');

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        path: req.path,
        eventId,
      });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
      });
      return;
    }

    // Store verification result in request
    (req as any).signatureVerified = true;

    next();
  } catch (error) {
    logger.error('Error validating webhook signature', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error validating signature',
    });
  }
}
