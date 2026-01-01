/**
 * QR code utilities for CLI
 */

import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

/**
 * Generate sample QR code data for testing
 */
export function generateSampleQRData(type: 'simple' | 'complex' = 'simple'): string {
  const baseData = {
    v: '1.0',
    p: `pres_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    h: 'did:aura:mainnet:aura1xyz123abc456def789',
    vcs: type === 'simple'
      ? ['vc_gov_id_001']
      : ['vc_gov_id_001', 'vc_biometric_002', 'vc_age_verify_003'],
    exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    ctx: {
      ageOver18: true,
      ageOver21: type === 'complex',
      cityState: type === 'complex' ? 'San Francisco, CA' : undefined,
    },
    sig: 'a'.repeat(128), // Mock signature
  };

  // Encode as base64
  const jsonString = JSON.stringify(baseData);
  const base64Data = Buffer.from(jsonString).toString('base64');

  return `aura://verify?data=${base64Data}`;
}

/**
 * Display QR code in terminal
 */
export function displayQRCode(data: string): void {
  console.log('\n');
  qrcodeTerminal.generate(data, { small: true });
  console.log('\n');
}

/**
 * Generate QR code as PNG file
 */
export async function generateQRCodeFile(data: string, outputPath: string): Promise<void> {
  await QRCode.toFile(outputPath, data, {
    type: 'png',
    width: 300,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataURL(data: string): Promise<string> {
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    width: 300,
  });
}
