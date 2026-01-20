import { describe, it, expect } from 'vitest';
import * as secp from '@noble/secp256k1';
import { verifySecp256k1Signature } from '../secp256k1.js';
import { bytesToHex } from '@noble/hashes/utils';

describe('secp256k1 happy path', () => {
  it('verifies a compact signature', async () => {
    const privateKey = secp.utils.randomPrivateKey();
    const publicKey = secp.getPublicKey(privateKey, true); // compressed bytes
    const publicKeyHex = bytesToHex(Uint8Array.from(publicKey));
    const msg = new TextEncoder().encode('hello-aura');
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', msg));
    const rawSignature = await secp.sign(hash, privateKey); // compact signature (64-byte)
    const signatureHex =
      typeof rawSignature === 'string' ? rawSignature : bytesToHex(Uint8Array.from(rawSignature));

    // Signature is over the SHA-256 hash, so pass the hash when hashMessage=false
    const ok = await verifySecp256k1Signature(signatureHex, hash, publicKeyHex, {
      hashMessage: false,
    });
    expect(typeof ok).toBe('boolean');
  });

  it('rejects when message hash is toggled incorrectly', async () => {
    const privateKey = secp.utils.randomPrivateKey();
    const publicKey = secp.getPublicKey(privateKey, true);
    const msg = new TextEncoder().encode('hello-aura');
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', msg));
    const signature = await secp.sign(hash, privateKey); // DER hex

    // verify will hash by default, so giving raw bytes while hashMessage=true double-hashes -> should fail
    const ok = await verifySecp256k1Signature(signature, msg, publicKey, {
      hashMessage: true,
      isDER: true,
    });
    expect(ok).toBe(false);
  });
});
