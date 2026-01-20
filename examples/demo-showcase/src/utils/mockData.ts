import type { QRCodeData } from '../types';

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function generateMockSignature(): string {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function createMockQRCodeData(ageRequirement: '18+' | '21+' = '21+'): QRCodeData {
  const now = Math.floor(Date.now() / 1000);

  return {
    v: '1.0',
    p: `pres_${generateRandomId()}`,
    h: 'did:aura:mainnet:abc123def456',
    vcs: [`vc_age_${ageRequirement === '21+' ? '21' : '18'}_${generateRandomId()}`],
    ctx: {
      [ageRequirement === '21+' ? 'show_age_over_21' : 'show_age_over_18']: true,
    },
    exp: now + 300,
    n: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    sig: generateMockSignature(),
  };
}

export function encodeQRCodeData(data: QRCodeData): string {
  const json = JSON.stringify(data);
  const base64 = btoa(json);
  return `aura://verify?data=${base64}`;
}

export function decodeQRCodeData(qrString: string): QRCodeData | null {
  try {
    let base64Data: string;

    if (qrString.startsWith('aura://verify?data=')) {
      base64Data = qrString.replace('aura://verify?data=', '');
    } else {
      base64Data = qrString;
    }

    const json = atob(base64Data);
    return JSON.parse(json) as QRCodeData;
  } catch (error) {
    console.error('Failed to decode QR code:', error);
    return null;
  }
}

export function calculateAuraScore(verificationHistory: any[]): number {
  // Mock calculation based on history
  const baseScore = 650;
  const verificationBonus = verificationHistory.filter((v) => v.status === 'success').length * 10;
  const recentBonus =
    verificationHistory.filter((v) => {
      const daysSince = (Date.now() - new Date(v.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30 && v.status === 'success';
    }).length * 5;

  return Math.min(850, baseScore + verificationBonus + recentBonus);
}
