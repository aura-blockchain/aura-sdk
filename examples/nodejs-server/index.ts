/**
 * Aura Verifier SDK - Node.js Server Example
 *
 * This example shows how to build a verification API server
 * that businesses can use to verify Aura credentials.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { AuraVerifier, VerificationResult, AuraVerifierError } from '@aura-network/verifier-sdk';

// Initialize the Aura Verifier
const verifier = new AuraVerifier({
  network: 'mainnet', // Use 'testnet' for testing
  timeout: 10000,
  offlineMode: false,
});

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /verify
 *
 * Verify an Aura credential from QR code data
 *
 * Request body:
 * {
 *   "qrCodeData": "aura://verify?data=...",
 *   "verifierAddress": "aura1..." (optional)
 * }
 */
app.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData, verifierAddress } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        error: 'Missing qrCodeData in request body',
        code: 'MISSING_QR_DATA',
      });
    }

    const result: VerificationResult = await verifier.verify({
      qrCodeData,
      verifierAddress,
    });

    // Log for audit purposes
    console.log(`[VERIFICATION] ${result.auditId}: ${result.isValid ? 'VALID' : 'INVALID'}`);

    res.json({
      success: true,
      result: {
        isValid: result.isValid,
        holderDID: result.holderDID,
        verifiedAt: result.verifiedAt.toISOString(),
        attributes: result.attributes,
        vcDetails: result.vcDetails,
        auditId: result.auditId,
        verificationError: result.verificationError,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /verify/age-21
 *
 * Quick endpoint to check if someone is 21+
 */
app.post('/verify/age-21', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        error: 'Missing qrCodeData',
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
 *
 * Quick endpoint to check if someone is 18+
 */
app.post('/verify/age-18', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        error: 'Missing qrCodeData',
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
 *
 * Quick endpoint to check verified human status
 */
app.post('/verify/human', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        error: 'Missing qrCodeData',
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
 * GET /credential/:vcId/status
 *
 * Check the status of a specific credential
 */
app.get('/credential/:vcId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vcId } = req.params;
    const status = await verifier.checkCredentialStatus(vcId);

    res.json({
      success: true,
      vcId,
      status,
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', error);

  if (error instanceof AuraVerifierError) {
    return res.status(400).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// Initialize and start server
async function main() {
  try {
    // Initialize the verifier (establishes connection)
    await verifier.initialize();
    console.log('Aura Verifier initialized successfully');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Aura Verification Server running on port ${PORT}`);
      console.log(`Network: ${verifier.config.network}`);
    });
  } catch (error) {
    console.error('Failed to initialize Aura Verifier:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await verifier.destroy();
  process.exit(0);
});

main();
