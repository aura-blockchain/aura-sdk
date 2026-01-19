import { describe, it, expect } from 'vitest';
import { verifySecp256k1Signature } from '../secp256k1.js';
import { isValidHex } from '../hash.js';

const validCompactSigHex = 'a'.repeat(128); // invalid hex but correct length for format detection tests

describe('secp256k1 edge cases', () => {
  const pubkeyCompressed = '02' + 'b'.repeat(64); // 33 bytes hex

  it('returns false for DER shorter than minimum', async () => {
    const derTooShort = new Uint8Array([0x30, 0x00]); // invalid
    const ok = await verifySecp256k1Signature(derTooShort, 'msg', pubkeyCompressed, { isDER: true });
    expect(ok).toBe(false);
  });

  it('returns false for oversized DER', async () => {
    const derLong = new Uint8Array(80).fill(0x30);
    const ok = await verifySecp256k1Signature(derLong, 'msg', pubkeyCompressed, { isDER: true });
    expect(ok).toBe(false);
  });

  it('rejects wrong public key length', async () => {
    const badPub = '03' + 'c'.repeat(40); // too short
    const ok = await verifySecp256k1Signature(validCompactSigHex, 'msg', badPub);
    expect(ok).toBe(false);
  });

  it('rejects non-hex signature strings', async () => {
    const ok = await verifySecp256k1Signature('not-hex', 'msg', pubkeyCompressed);
    expect(ok).toBe(false);
  });

  it('isValidHex helper flags length mismatches', () => {
    expect(isValidHex('00ff', 2)).toBe(true);
    expect(isValidHex('00ff', 10)).toBe(false);
  });
});
