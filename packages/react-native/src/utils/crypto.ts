import * as ed25519 from '@noble/ed25519';
import { mnemonicToSeedSync, generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex } from '@noble/hashes/utils';

// Ensure hash implementation is configured for environments where @noble/ed25519
// doesn't auto-detect a native sha512 (e.g., JSDOM/jsdom-like tests).
if (!ed25519.etc.sha512Sync) {
  ed25519.etc.sha512Sync = (...msgs: Uint8Array[]) => sha512(...msgs);
}

export async function generateMnemonicWords(strength: 128 | 256 = 128): Promise<string> {
  return generateMnemonic(wordlist, strength);
}

export async function mnemonicToSeed(mnemonic: string): Promise<Uint8Array> {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid mnemonic');
  }
  return mnemonicToSeedSync(mnemonic);
}

export async function deriveKeyPair(
  seed: Uint8Array
): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
  // Use first 32 bytes as private key for simplicity
  const priv = seed.slice(0, 32);
  const pub = await ed25519.getPublicKey(priv);
  return { publicKey: pub, privateKey: priv };
}

export function addressFromPublicKey(publicKey: Uint8Array): string {
  return `aura1${bytesToHex(publicKey).slice(0, 38)}`;
}

export async function sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
  return ed25519.sign(message, privateKey);
}
