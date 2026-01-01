/**
 * Example Usage of QR Code Module
 *
 * This file demonstrates how to use the QR code parsing and validation module.
 * It can be run directly or used as a reference for integration.
 */

import {
  parseQRCode,
  parseQRCodeSafe,
  validateQRCodeData,
  validateQRCodeDataStrict,
  parseAndValidateQRCode,
  parseAndValidateQRCodeSafe,
  QRParseError,
  QRValidationError,
  QRExpiredError,
  type QRCodeData,
} from './index.js';

// Example 1: Basic Parsing
console.log('=== Example 1: Basic Parsing ===');
try {
  // Create a sample QR code (this would come from scanning in production)
  const sampleQRData: QRCodeData = {
    v: '1.0',
    p: 'presentation-abc123',
    h: 'did:aura:mainnet:holder123',
    vcs: ['vc-drivers-license', 'vc-proof-of-age'],
    ctx: {
      show_full_name: true,
      show_age_over_21: true,
      show_city_state: false,
    },
    exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    n: 987654321,
    sig: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
  };

  // Encode to base64 (simulating QR code content)
  const jsonString = JSON.stringify(sampleQRData);
  const base64Data = Buffer.from(jsonString).toString('base64');
  const qrURL = `aura://verify?data=${base64Data}`;

  console.log('QR URL:', qrURL.substring(0, 60) + '...');

  // Parse the QR code
  const parsedData = parseQRCode(qrURL);
  console.log('✓ Parsed successfully');
  console.log('  Presentation ID:', parsedData.p);
  console.log('  Holder DID:', parsedData.h);
  console.log('  VCs:', parsedData.vcs.join(', '));
  console.log('  Expires:', new Date(parsedData.exp * 1000).toISOString());
} catch (error) {
  console.error('✗ Error:', error instanceof Error ? error.message : error);
}

// Example 2: Safe Parsing (Non-Throwing)
console.log('\n=== Example 2: Safe Parsing ===');
const invalidQR = 'invalid-qr-code-data';
const result = parseQRCodeSafe(invalidQR);

if (result.success) {
  console.log('✓ Valid QR code:', result.data);
} else {
  console.log('✗ Parse failed:', result.error);
}

// Example 3: Validation with Details
console.log('\n=== Example 3: Validation with Details ===');
try {
  const qrData: QRCodeData = {
    v: '1.0',
    p: 'test-presentation',
    h: 'did:aura:mainnet:test123',
    vcs: ['vc-1', 'vc-2', 'vc-1'], // Duplicate VC (will trigger warning)
    ctx: {
      show_full_name: true,
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
    n: 123456,
    sig: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  };

  const validationResult = validateQRCodeData(qrData);

  if (validationResult.valid) {
    console.log('✓ QR code is valid');
  } else {
    console.log('✗ Validation errors:');
    validationResult.errors.forEach((err) => {
      console.log(`  [${err.field}] ${err.message}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    console.log('⚠ Warnings:');
    validationResult.warnings.forEach((warn) => {
      console.log(`  [${warn.field}] ${warn.message}`);
    });
  }
} catch (error) {
  console.error('✗ Error:', error instanceof Error ? error.message : error);
}

// Example 4: Expired QR Code Handling
console.log('\n=== Example 4: Expired QR Code Handling ===');
try {
  const expiredQRData: QRCodeData = {
    v: '1.0',
    p: 'expired-presentation',
    h: 'did:aura:mainnet:test123',
    vcs: ['vc-1'],
    ctx: { show_full_name: true },
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    n: 999999,
    sig: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  };

  validateQRCodeDataStrict(expiredQRData);
  console.log('✓ Valid (should not reach here)');
} catch (error) {
  if (error instanceof QRExpiredError) {
    console.log('✗ QR code expired');
    console.log('  Expiration time:', new Date(error.expirationTime * 1000).toISOString());
    console.log('  Time since expiration:', error.timeSinceExpiration, 'seconds');
    console.log('  Within 2-hour tolerance?', error.isWithinTolerance(7200));
  } else {
    console.error('✗ Unexpected error:', error instanceof Error ? error.message : error);
  }
}

// Example 5: Combined Parse and Validate
console.log('\n=== Example 5: Combined Parse and Validate ===');
try {
  const validQRData: QRCodeData = {
    v: '1.0',
    p: 'complete-example',
    h: 'did:aura:mainnet:complete123',
    vcs: ['vc-identity', 'vc-age-proof'],
    ctx: {
      show_full_name: true,
      show_age_over_21: true,
      show_city_state: true,
    },
    exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
    n: 555555555,
    sig: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  };

  const base64 = Buffer.from(JSON.stringify(validQRData)).toString('base64');
  const qrURL = `aura://verify?data=${base64}`;

  const qrData = parseAndValidateQRCode(qrURL, {
    checkExpiration: true,
    expirationTolerance: 30, // 30-second tolerance
    validateDID: true,
    validateSignature: true,
  });

  console.log('✓ QR code parsed and validated successfully');
  console.log('  Protocol version:', qrData.v);
  console.log('  Presentation ID:', qrData.p);
  console.log('  Holder DID:', qrData.h);
  console.log('  Number of VCs:', qrData.vcs.length);

  console.log('  Requested disclosures:');
  Object.entries(qrData.ctx).forEach(([key, value]) => {
    if (value === true) {
      console.log(`    - ${key}`);
    }
  });
} catch (error) {
  if (error instanceof QRParseError) {
    console.error('✗ Parse error:', error.message);
  } else if (error instanceof QRValidationError) {
    console.error('✗ Validation error:', error.message);
    if (error.field) {
      console.error('  Field:', error.field);
    }
  } else if (error instanceof QRExpiredError) {
    console.error('✗ Expired:', error.message);
  } else {
    console.error('✗ Unexpected error:', error instanceof Error ? error.message : error);
  }
}

// Example 6: Custom Validation Options
console.log('\n=== Example 6: Custom Validation Options ===');
try {
  const customQRData: QRCodeData = {
    v: '1.1', // Different version
    p: 'custom-presentation',
    h: 'did:aura:testnet:custom123', // Testnet DID
    vcs: ['vc-custom'],
    ctx: { show_full_name: true },
    exp: Math.floor(Date.now() / 1000) - 10, // Slightly expired
    n: 111111,
    sig: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  };

  const base64 = Buffer.from(JSON.stringify(customQRData)).toString('base64');

  const qrData = parseAndValidateQRCode(base64, {
    checkExpiration: true,
    expirationTolerance: 60, // 1-minute tolerance
    validateDID: true,
    validateSignature: true,
    supportedVersions: ['1.0', '1.1'], // Support both versions
  });

  console.log('✓ Custom validation passed');
  console.log('  Version:', qrData.v);
  console.log('  Network:', qrData.h.split(':')[2]); // Extract network from DID
} catch (error) {
  console.error('✗ Custom validation failed:', error instanceof Error ? error.message : error);
}

// Example 7: Production Verification Flow
console.log('\n=== Example 7: Production Verification Flow ===');

interface VerificationResult {
  success: boolean;
  presentationId?: string;
  holder?: string;
  error?: string;
  code?: string;
}

async function verifyQRCodeProduction(qrString: string): Promise<VerificationResult> {
  try {
    // Step 1: Parse and validate QR code
    const qrData = parseAndValidateQRCode(qrString, {
      checkExpiration: true,
      expirationTolerance: 30,
      validateDID: true,
      validateSignature: true,
    });

    // Step 2: Additional checks (nonce, signature verification, etc.)
    // In production, you would:
    // - Check if nonce has been used (prevent replay attacks)
    // - Verify signature cryptographically
    // - Fetch and verify credentials
    // - Build presentation response

    console.log('  ✓ QR code valid');
    console.log('  ✓ Format checks passed');
    console.log('  ✓ Expiration valid');
    console.log('  ✓ DID format valid');
    console.log('  → Would verify signature cryptographically');
    console.log('  → Would check nonce for replay attacks');
    console.log('  → Would fetch credentials:', qrData.vcs.join(', '));

    return {
      success: true,
      presentationId: qrData.p,
      holder: qrData.h,
    };
  } catch (error) {
    if (error instanceof QRExpiredError) {
      return {
        success: false,
        error: 'QR code expired',
        code: 'QR_EXPIRED',
      };
    } else if (error instanceof QRValidationError) {
      return {
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR',
      };
    } else if (error instanceof QRParseError) {
      return {
        success: false,
        error: 'Invalid QR code format',
        code: 'PARSE_ERROR',
      };
    } else {
      return {
        success: false,
        error: 'Unknown error',
        code: 'UNKNOWN',
      };
    }
  }
}

// Simulate production verification
(async () => {
  const testQRData: QRCodeData = {
    v: '1.0',
    p: 'prod-test-123',
    h: 'did:aura:mainnet:production456',
    vcs: ['vc-id-card', 'vc-residence-proof'],
    ctx: {
      show_full_name: true,
      show_age_over_18: true,
      show_city_state: true,
    },
    exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    n: 888888888,
    sig: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  };

  const qrString = `aura://verify?data=${Buffer.from(JSON.stringify(testQRData)).toString('base64')}`;

  const result = await verifyQRCodeProduction(qrString);

  if (result.success) {
    console.log('✓ Production verification succeeded');
    console.log('  Presentation ID:', result.presentationId);
    console.log('  Holder:', result.holder);
  } else {
    console.log('✗ Production verification failed');
    console.log('  Error:', result.error);
    console.log('  Code:', result.code);
  }
})();

console.log('\n=== All Examples Complete ===');
