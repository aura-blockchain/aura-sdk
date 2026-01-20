/**
 * Basic Node.js Example - Aura Verifier SDK
 *
 * This example demonstrates the basic usage of the Aura Verifier SDK:
 * - Initializing the verifier
 * - Parsing QR codes
 * - Verifying credentials
 * - Checking specific attributes (age verification)
 */

import {
  AuraVerifier,
  parseQRCode,
  VCType,
  type VerificationResult,
} from '@aura-network/verifier-sdk';

// Sample QR code data (this would normally come from scanning a QR code)
const SAMPLE_QR_CODE = createSampleQRCode();

async function main() {
  console.log('='.repeat(60));
  console.log('Aura Verifier SDK - Basic Node.js Example');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Initialize the verifier
  console.log('Step 1: Initializing Aura Verifier...');
  const verifier = new AuraVerifier({
    network: 'testnet', // Use 'mainnet' for production
    timeout: 10000,
    offlineMode: false,
  });

  try {
    await verifier.initialize();
    console.log('✓ Verifier initialized successfully');
    console.log(`  Network: ${verifier.config.network}`);
    console.log();

    // Step 2: Parse QR code
    console.log('Step 2: Parsing QR code...');
    console.log(`  QR Code: ${SAMPLE_QR_CODE.substring(0, 50)}...`);

    const qrData = parseQRCode(SAMPLE_QR_CODE);
    console.log('✓ QR code parsed successfully');
    console.log(`  Version: ${qrData.v}`);
    console.log(`  Presentation ID: ${qrData.p}`);
    console.log(`  Holder DID: ${qrData.h}`);
    console.log(`  Credentials: ${qrData.vcs.join(', ')}`);
    console.log(`  Expiration: ${new Date(qrData.exp * 1000).toISOString()}`);
    console.log();

    // Step 3: Verify the credential
    console.log('Step 3: Verifying credential...');
    const result: VerificationResult = await verifier.verify({
      qrCodeData: SAMPLE_QR_CODE,
      verifierAddress: 'aura1test...', // Optional: your verifier address
    });

    console.log('✓ Verification complete');
    console.log(`  Valid: ${result.isValid ? 'YES' : 'NO'}`);
    console.log(`  Audit ID: ${result.auditId}`);
    console.log(`  Verified At: ${result.verifiedAt.toISOString()}`);
    console.log();

    if (result.isValid) {
      // Step 4: Check verified attributes
      console.log('Step 4: Checking attributes...');
      console.log('  Attributes:');

      for (const [key, value] of Object.entries(result.attributes)) {
        console.log(`    ${key}: ${value}`);
      }
      console.log();

      // Step 5: Check specific credentials
      console.log('Step 5: Credential details...');
      for (const vc of result.vcDetails) {
        console.log(`  Credential: ${vc.vcId}`);
        console.log(`    Type: ${VCType[vc.vcType]}`);
        console.log(`    Valid: ${vc.isValid}`);
        console.log(`    Expired: ${vc.isExpired}`);
        console.log(`    Revoked: ${vc.isRevoked}`);
        if (vc.issuedAt) {
          console.log(`    Issued: ${vc.issuedAt.toISOString()}`);
        }
        if (vc.expiresAt) {
          console.log(`    Expires: ${vc.expiresAt.toISOString()}`);
        }
        console.log();
      }

      // Example: Age verification checks
      console.log('Step 6: Age verification shortcuts...');

      try {
        const isOver21 = await verifier.isAge21Plus(SAMPLE_QR_CODE);
        console.log(`  Is 21+: ${isOver21 ? 'YES' : 'NO'}`);
      } catch (error) {
        console.log(`  Is 21+: Unable to determine`);
      }

      try {
        const isOver18 = await verifier.isAge18Plus(SAMPLE_QR_CODE);
        console.log(`  Is 18+: ${isOver18 ? 'YES' : 'NO'}`);
      } catch (error) {
        console.log(`  Is 18+: Unable to determine`);
      }

      try {
        const isHuman = await verifier.isVerifiedHuman(SAMPLE_QR_CODE);
        console.log(`  Is Verified Human: ${isHuman ? 'YES' : 'NO'}`);
      } catch (error) {
        console.log(`  Is Verified Human: Unable to determine`);
      }
      console.log();
    } else {
      console.log('Verification failed!');
      if (result.verificationError) {
        console.log(`  Error: ${result.verificationError}`);
      }
      console.log();
    }

    console.log('='.repeat(60));
    console.log('Example completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error();
    console.error('Error occurred during verification:');
    console.error(error);
    console.error();
    process.exit(1);
  } finally {
    // Step 7: Clean up
    await verifier.destroy();
    console.log('\nVerifier cleaned up.');
  }
}

/**
 * Create a sample QR code for demonstration
 * In a real application, this would come from scanning a user's QR code
 */
function createSampleQRCode(): string {
  const now = Math.floor(Date.now() / 1000);

  const qrData = {
    v: '1.0',
    p: `pres_${randomId()}`,
    h: 'did:aura:testnet:abc123def456',
    vcs: ['vc_age_21_test123'],
    ctx: {
      show_age_over_21: true,
    },
    exp: now + 300, // Expires in 5 minutes
    n: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    sig: generateMockSignature(),
  };

  const json = JSON.stringify(qrData);
  const base64 = Buffer.from(json).toString('base64');
  return `aura://verify?data=${base64}`;
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateMockSignature(): string {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Run the example
main().catch(console.error);
