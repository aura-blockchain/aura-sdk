import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import webhooksRouter from './routes/webhooks.js';
import analyticsRouter from './routes/analytics.js';
import { logger } from './utils/logger.js';
import { getDatabase, closeDatabase } from './services/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/webhooks', limiter);

// Body parsing middleware
// For webhook endpoints, we need both raw body (for signature verification)
// and parsed JSON (for payload processing)
app.use(
  express.json({
    verify: (req: any, res, buf, encoding) => {
      // Store raw body for signature verification
      req.rawBody = buf.toString(encoding || 'utf8');
    },
  })
);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/webhooks', webhooksRouter);
app.use('/analytics', analyticsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Aura Webhook Server',
    version: '1.0.0',
    description: 'Production-ready webhook server for Aura verification events',
    endpoints: {
      health: 'GET /health',
      webhooks: {
        verification: 'POST /webhooks/verification',
        revocation: 'POST /webhooks/revocation',
      },
      analytics: {
        overview: 'GET /analytics',
        eventById: 'GET /analytics/events/:id',
        eventsByType: 'GET /analytics/events/type/:eventType',
        recentEvents: 'GET /analytics/events/recent',
      },
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Initialize database
try {
  getDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Webhook server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    closeDatabase();

    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default app;
