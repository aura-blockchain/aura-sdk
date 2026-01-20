import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs';

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'info';
const logFilePath = process.env.LOG_FILE_PATH || './logs/webhook-server.log';

/**
 * Custom log format
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    // Add stack trace if present
    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  })
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: logFilePath,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

/**
 * Log webhook event
 */
export function logWebhookEvent(
  eventType: string,
  eventId: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Webhook event received', {
    eventType,
    eventId,
    ...metadata,
  });
}

/**
 * Log webhook verification result
 */
export function logWebhookVerification(eventId: string, verified: boolean, reason?: string): void {
  if (verified) {
    logger.info('Webhook signature verified', { eventId });
  } else {
    logger.warn('Webhook signature verification failed', { eventId, reason });
  }
}

/**
 * Log webhook processing error
 */
export function logWebhookError(
  eventId: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  logger.error('Webhook processing error', {
    eventId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });
}

export default logger;
