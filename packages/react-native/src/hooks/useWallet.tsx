import { useCallback, useEffect, useState } from 'react';
import { SecureStorage } from '../storage/SecureStorage';
import {
  generateMnemonicWords,
  mnemonicToSeed,
  deriveKeyPair,
  addressFromPublicKey,
  sign,
} from '../utils/crypto';
import { WalletData } from '../types';

interface Options {
  biometricEnabled?: boolean;
  autoRestore?: boolean;
}

const STORAGE_KEY = 'aura_wallet';

export function useWallet(options?: Options) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [isUnlocked, setUnlocked] = useState(false);
  const [isImported, setImported] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [signature, setSignature] = useState<Uint8Array | null>(null);
  const [signedTransaction, setSignedTx] = useState<Record<string, unknown> | null>(null);
  const [hasStoredWallet, setHasStoredWallet] = useState(false);

  useEffect(() => {
    const checkStored = async () => {
      setHasStoredWallet(await SecureStorage.hasItem(STORAGE_KEY));
      if (options?.autoRestore && (await SecureStorage.hasItem(STORAGE_KEY))) {
        const raw = await SecureStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WalletData;
          setWallet(parsed);
          setUnlocked(true);
        }
      }
    };
    checkStored();
  }, [options?.autoRestore]);

  const createWallet = useCallback(async () => {
    try {
      const m = await generateMnemonicWords();
      const seed = await mnemonicToSeed(m);
      const { publicKey, privateKey } = await deriveKeyPair(seed);
      const address = addressFromPublicKey(publicKey);
      const data: WalletData = { address, did: `did:aura:${address}`, publicKey, privateKey };
      setMnemonic(m ?? 'generated-mnemonic');
      setWallet(data);
      setUnlocked(true);
      setImported(false);
      await SecureStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setHasStoredWallet(true);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const importWallet = useCallback(async (mn: string) => {
    try {
      const seed = await mnemonicToSeed(mn);
      const { publicKey, privateKey } = await deriveKeyPair(seed);
      const address = addressFromPublicKey(publicKey);
      const data: WalletData = { address, did: `did:aura:${address}`, publicKey, privateKey };
      setMnemonic(mn);
      setWallet(data);
      setUnlocked(true);
      setImported(true);
      await SecureStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setHasStoredWallet(true);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const lock = useCallback(() => {
    setUnlocked(false);
  }, []);

  const unlock = useCallback(async (_password?: string) => {
    // For demo purposes, unlock if stored wallet exists.
    if (await SecureStorage.hasItem(STORAGE_KEY)) {
      const raw = await SecureStorage.getItem(STORAGE_KEY);
      if (raw) {
        setWallet(JSON.parse(raw));
        setUnlocked(true);
        setError(null);
        return;
      }
    }
    setError(new Error('Decryption failed'));
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    return unlock();
  }, [unlock]);

  const signTransaction = useCallback(
    async (tx: Record<string, unknown>) => {
      if (!wallet || !isUnlocked) {
        setError(new Error('Wallet locked'));
        return;
      }
      const bytes = new TextEncoder().encode(JSON.stringify(tx));
      const sig = await sign(bytes, wallet.privateKey);
      setSignature(sig);
      setSignedTx({ ...tx, signature: Buffer.from(sig).toString('hex') });
    },
    [wallet, isUnlocked]
  );

  const signData = useCallback(
    async (data: Uint8Array) => {
      if (!wallet || !isUnlocked) {
        setError(new Error('Wallet locked'));
        return;
      }
      const sig = await sign(data, wallet.privateKey);
      setSignature(sig);
    },
    [wallet, isUnlocked]
  );

  const deleteWallet = useCallback(async () => {
    await SecureStorage.removeItem(STORAGE_KEY);
    setWallet(null);
    setMnemonic(null);
    setUnlocked(false);
    setSignature(null);
    setSignedTx(null);
    setHasStoredWallet(false);
  }, []);

  return {
    wallet,
    mnemonic,
    isUnlocked,
    isImported,
    hasStoredWallet,
    error,
    signature,
    signedTransaction,
    createWallet,
    importWallet,
    lock,
    unlock,
    unlockWithBiometrics,
    signTransaction,
    signData,
    deleteWallet,
  };
}
