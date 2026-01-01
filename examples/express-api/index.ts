/**
 * Express API Server Example - Aura Verifier SDK
 *
 * A production-ready REST API server for verifying Aura credentials.
 * Includes proper error handling, logging, security headers, and CORS.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import {
  AuraVerifier,
  AuraVerifierError,
  QRParseError,
  VerificationError,
  NetworkError,
  type VerificationResult,
  type VCVerificationDetail,
} from '@aura-network/verifier-sdk';

// Configuration
const PORT = process.env.PORT || 3000;
const NETWORK = (process.env.AURA_NETWORK || 'testnet') as 'mainnet' | 'testnet';
const TIMEOUT = parseInt(process.env.TIMEOUT || '10000', 10);

// Initialize Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(morgan('combined')); // Request logging

// Initialize Aura Verifier
let verifier: AuraVerifier;

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: NETWORK,
    uptime: process.uptime(),
  });
});

/**
 * GET /
 * API information
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Aura Verifier API',
    version: '1.0.0',
    network: NETWORK,
    endpoints: {
      health: 'GET /health',
      verify: 'POST /verify',
      verifyAge21: 'POST /verify/age-21',
      verifyAge18: 'POST /verify/age-18',
      verifyHuman: 'POST /verify/human',
      batchVerify: 'POST /verify/batch',
      credentialStatus: 'GET /credential/:vcId/status',
    },
    documentation: 'https://github.com/aura-blockchain/aura-verifier-sdk',
  });
});

/**
 * POST /verify
 * Main verification endpoint
 *
 * Body:
 * {
 *   "qrCodeData": "aura://verify?data=...",
 *   "verifierAddress": "aura1..." (optional)
 * }
 */
app.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData, verifierAddress } = req.body;

    // Validate input
    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: qrCodeData',
        code: 'MISSING_QR_DATA',
      });
    }

    if (typeof qrCodeData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'qrCodeData must be a string',
        code: 'INVALID_QR_DATA_TYPE',
      });
    }

    // Perform verification
    const result: VerificationResult = await verifier.verify({
      qrCodeData,
      verifierAddress,
    });

    // Log for audit
    console.log(
      `[VERIFICATION] ${result.auditId}: ${result.isValid ? 'VALID' : 'INVALID'} - ${result.holderDID}`
    );

    // Return result
    res.json({
      success: true,
      result: {
        isValid: result.isValid,
        holderDID: result.holderDID,
        verifiedAt: result.verifiedAt.toISOString(),
        attributes: result.attributes,
        vcDetails: result.vcDetails.map(formatVCDetail),
        auditId: result.auditId,
        verificationError: result.verificationError,
        networkLatency: result.networkLatency,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /verify/age-21
 * Quick endpoint to verify age 21+
 *
 * Body:
 * {
 *   "qrCodeData": "aura://verify?data=..."
 * }
 */
app.post('/verify/age-21', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: qrCodeData',
        code: 'MISSING_QR_DATA',
      });
    }

    const isOver21 = await verifier.isAge21Plus(qrCodeData);

    res.json({
      success: true,
      isOver21,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /verify/age-18
 * Quick endpoint to verify age 18+
 */
app.post('/verify/age-18', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: qrCodeData',
        code: 'MISSING_QR_DATA',
      });
    }

    const isOver18 = await verifier.isAge18Plus(qrCodeData);

    res.json({
      success: true,
      isOver18,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /verify/human
 * Quick endpoint to verify verified human status
 */
app.post('/verify/human', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: qrCodeData',
        code: 'MISSING_QR_DATA',
      });
    }

    const isVerifiedHuman = await verifier.isVerifiedHuman(qrCodeData);

    res.json({
      success: true,
      isVerifiedHuman,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /verify/batch
 * Batch verification endpoint
 *
 * Body:
 * {
 *   "verifications": [
 *     { "qrCodeData": "...", "verifierAddress": "..." },
 *     { "qrCodeData": "...", "verifierAddress": "..." }
 *   ]
 * }
 */
app.post('/verify/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { verifications } = req.body;

    if (!Array.isArray(verifications)) {
      return res.status(400).json({
        success: false,
        error: 'verifications must be an array',
        code: 'INVALID_BATCH_DATA',
      });
    }

    if (verifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'verifications array cannot be empty',
        code: 'EMPTY_BATCH',
      });
    }

    if (verifications.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 verifications per batch',
        code: 'BATCH_TOO_LARGE',
      });
    }

    // Perform batch verification
    const results = await Promise.allSettled(
      verifications.map((v) => verifier.verify(v))
    );

    const processed = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          success: true,
          index,
          result: {
            isValid: result.value.isValid,
            holderDID: result.value.holderDID,
            verifiedAt: result.value.verifiedAt.toISOString(),
            auditId: result.value.auditId,
          },
        };
      } else {
        return {
          success: false,
          index,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const successCount = processed.filter((r) => r.success).length;

    res.json({
      success: true,
      total: verifications.length,
      successful: successCount,
      failed: verifications.length - successCount,
      results: processed,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /credential/:vcId/status
 * Check credential status
 */
app.get(
  '/credential/:vcId/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vcId } = req.params;

      if (!vcId) {
        return res.status(400).json({
          success: false,
          error: 'Missing credential ID',
          code: 'MISSING_VC_ID',
        });
      }

      const status = await verifier.checkCredentialStatus(vcId);

      res.json({
        success: true,
        vcId,
        status,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

/**
 * Global error handler
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle specific error types
  if (error instanceof QRParseError) {
    return res.status(400).json({
      success: false,
      error: 'Invalid QR code format',
      message: error.message,
      code: 'QR_PARSE_ERROR',
    });
  }

  if (error instanceof VerificationError) {
    return res.status(400).json({
      success: false,
      error: 'Verification failed',
      message: error.message,
      code: 'VERIFICATION_ERROR',
    });
  }

  if (error instanceof NetworkError) {
    return res.status(503).json({
      success: false,
      error: 'Network error',
      message: error.message,
      code: 'NETWORK_ERROR',
    });
  }

  if (error instanceof AuraVerifierError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code || 'VERIFIER_ERROR',
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  try {
    console.log('Starting Aura Verifier API Server...');
    console.log(`Network: ${NETWORK}`);
    console.log(`Timeout: ${TIMEOUT}ms`);

    // Initialize verifier
    verifier = new AuraVerifier({
      network: NETWORK,
      timeout: TIMEOUT,
      offlineMode: false,
    });

    await verifier.initialize();
    console.log('Verifier initialized successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`Aura Verifier API Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/`);
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown() {
  console.log('\nShutting down gracefully...');
  try {
    if (verifier) {
      await verifier.destroy();
      console.log('Verifier cleaned up');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format VC detail for API response
 */
function formatVCDetail(vc: VCVerificationDetail) {
  return {
    vcId: vc.vcId,
    vcType: vc.vcType,
    isValid: vc.isValid,
    isExpired: vc.isExpired,
    isRevoked: vc.isRevoked,
    issuedAt: vc.issuedAt?.toISOString(),
    expiresAt: vc.expiresAt?.toISOString(),
  };
}

// Start the server
startServer();
