import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { WebhookEvent, WebhookEventType, WebhookAnalytics } from '../types/webhook.js';
import { logger } from '../utils/logger.js';

/**
 * Database service for storing webhook events
 */
export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const databasePath = dbPath || process.env.DATABASE_PATH || './data/webhooks.db';

    // Ensure database directory exists
    const dbDir = path.dirname(databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  /**
   * Initialize database schema
   */
  private initialize(): void {
    const schema = `
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        signature TEXT NOT NULL,
        verified INTEGER NOT NULL,
        source_ip TEXT NOT NULL,
        received_at TEXT NOT NULL,
        processed_at TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_type ON webhook_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_received_at ON webhook_events(received_at);
      CREATE INDEX IF NOT EXISTS idx_verified ON webhook_events(verified);
      CREATE INDEX IF NOT EXISTS idx_created_at ON webhook_events(created_at);
    `;

    this.db.exec(schema);
    logger.info('Database initialized');
  }

  /**
   * Insert webhook event
   */
  insertEvent(event: Omit<WebhookEvent, 'processedAt' | 'error'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO webhook_events (
        id, event_type, payload, signature, verified, source_ip, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.eventType,
      event.payload,
      event.signature,
      event.verified ? 1 : 0,
      event.sourceIp,
      event.receivedAt
    );

    logger.debug('Webhook event inserted', { eventId: event.id });
  }

  /**
   * Update event as processed
   */
  markEventProcessed(eventId: string, error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE webhook_events
      SET processed_at = datetime('now'),
          error = ?
      WHERE id = ?
    `);

    stmt.run(error || null, eventId);
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): WebhookEvent | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        event_type as eventType,
        payload,
        signature,
        verified,
        source_ip as sourceIp,
        received_at as receivedAt,
        processed_at as processedAt,
        error
      FROM webhook_events
      WHERE id = ?
    `);

    const row = stmt.get(eventId) as any;
    if (!row) return null;

    return {
      ...row,
      verified: row.verified === 1,
    };
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: WebhookEventType, limit: number = 100): WebhookEvent[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        event_type as eventType,
        payload,
        signature,
        verified,
        source_ip as sourceIp,
        received_at as receivedAt,
        processed_at as processedAt,
        error
      FROM webhook_events
      WHERE event_type = ?
      ORDER BY received_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(eventType, limit) as any[];
    return rows.map((row) => ({
      ...row,
      verified: row.verified === 1,
    }));
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): WebhookEvent[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        event_type as eventType,
        payload,
        signature,
        verified,
        source_ip as sourceIp,
        received_at as receivedAt,
        processed_at as processedAt,
        error
      FROM webhook_events
      ORDER BY received_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map((row) => ({
      ...row,
      verified: row.verified === 1,
    }));
  }

  /**
   * Get analytics
   */
  getAnalytics(since?: Date): WebhookAnalytics {
    const sinceClause = since
      ? `WHERE datetime(received_at) >= datetime('${since.toISOString()}')`
      : '';

    // Total events
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM webhook_events
      ${sinceClause}
    `);
    const totalResult = totalStmt.get() as { count: number };

    // Events by type
    const byTypeStmt = this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM webhook_events
      ${sinceClause}
      GROUP BY event_type
    `);
    const byTypeResults = byTypeStmt.all() as Array<{
      event_type: string;
      count: number;
    }>;

    const eventsByType = Object.values(WebhookEventType).reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<WebhookEventType, number>
    );

    byTypeResults.forEach((row) => {
      if (row.event_type in eventsByType) {
        eventsByType[row.event_type as WebhookEventType] = row.count;
      }
    });

    // Success rate
    const successStmt = this.db.prepare(`
      SELECT
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified,
        COUNT(*) as total
      FROM webhook_events
      ${sinceClause}
    `);
    const successResult = successStmt.get() as {
      verified: number;
      total: number;
    };
    const successRate =
      successResult.total > 0 ? (successResult.verified / successResult.total) * 100 : 0;

    // Average processing time
    const avgTimeStmt = this.db.prepare(`
      SELECT AVG(
        (julianday(processed_at) - julianday(received_at)) * 86400000
      ) as avgTime
      FROM webhook_events
      WHERE processed_at IS NOT NULL
      ${sinceClause ? 'AND ' + sinceClause.replace('WHERE ', '') : ''}
    `);
    const avgTimeResult = avgTimeStmt.get() as { avgTime: number | null };
    const averageProcessingTime = avgTimeResult.avgTime || 0;

    // Recent events
    const recentEvents = this.getRecentEvents(10).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.receivedAt,
      verified: event.verified,
    }));

    return {
      totalEvents: totalResult.count,
      eventsByType,
      successRate,
      averageProcessingTime,
      recentEvents,
    };
  }

  /**
   * Delete old events
   */
  deleteOldEvents(daysOld: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM webhook_events
      WHERE datetime(created_at) < datetime('now', '-${daysOld} days')
    `);

    const result = stmt.run();
    logger.info('Old webhook events deleted', {
      deletedCount: result.changes,
      daysOld,
    });

    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

/**
 * Get database instance
 */
export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}

/**
 * Close database instance
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
