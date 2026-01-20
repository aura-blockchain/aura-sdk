import express, { Request, Response } from 'express';
import { getDatabase } from '../services/database.js';
import { WebhookEventType } from '../types/webhook.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /analytics
 * Get webhook analytics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const since = req.query.since ? new Date(req.query.since as string) : undefined;

    const analytics = db.getAnalytics(since);

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching analytics', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching analytics',
    });
  }
});

/**
 * GET /analytics/events/:id
 * Get specific event by ID
 */
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const event = db.getEvent(req.params.id);

    if (!event) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Event not found',
      });
      return;
    }

    res.json({
      ...event,
      payload: JSON.parse(event.payload),
    });
  } catch (error) {
    logger.error('Error fetching event', {
      error: error instanceof Error ? error.message : String(error),
      eventId: req.params.id,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching event',
    });
  }
});

/**
 * GET /analytics/events/type/:eventType
 * Get events by type
 */
router.get('/events/type/:eventType', async (req: Request, res: Response) => {
  try {
    const eventType = req.params.eventType as WebhookEventType;

    // Validate event type
    if (!Object.values(WebhookEventType).includes(eventType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid event type',
        validTypes: Object.values(WebhookEventType),
      });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const db = getDatabase();
    const events = db.getEventsByType(eventType, limit);

    res.json({
      eventType,
      count: events.length,
      events: events.map((event) => ({
        ...event,
        payload: JSON.parse(event.payload),
      })),
    });
  } catch (error) {
    logger.error('Error fetching events by type', {
      error: error instanceof Error ? error.message : String(error),
      eventType: req.params.eventType,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching events',
    });
  }
});

/**
 * GET /analytics/events/recent
 * Get recent events
 */
router.get('/events/recent', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const db = getDatabase();
    const events = db.getRecentEvents(limit);

    res.json({
      count: events.length,
      events: events.map((event) => ({
        ...event,
        payload: JSON.parse(event.payload),
      })),
    });
  } catch (error) {
    logger.error('Error fetching recent events', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching events',
    });
  }
});

/**
 * DELETE /analytics/events/old
 * Delete old events (requires API key)
 */
router.delete('/events/old', async (req: Request, res: Response) => {
  try {
    // Simple API key authentication for destructive operations
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      });
      return;
    }

    const daysOld = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    if (daysOld < 1) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Days must be at least 1',
      });
      return;
    }

    const db = getDatabase();
    const deletedCount = db.deleteOldEvents(daysOld);

    res.json({
      success: true,
      deletedCount,
      daysOld,
    });
  } catch (error) {
    logger.error('Error deleting old events', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error deleting events',
    });
  }
});

export default router;
