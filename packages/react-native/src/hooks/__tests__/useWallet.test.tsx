import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useWallet } from '../useWallet';
import { AuraProvider } from '../../providers/AuraProvider';
import { NetworkType } from '../../types';
import { SecureStorage } from '../../storage/SecureStorage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuraProvider network={NetworkType.TESTNET}>{children}</AuraProvider>
);

describe('useWallet', () => {
  beforeEach(async () => {
    // Reset in-memory storage between tests to avoid cross-test leakage
    await SecureStorage.removeItem('aura_wallet');
  });

  it('should create new wallet', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.createWallet();
    });

    await waitFor(
      () => {
        expect(result.current.wallet).toBeDefined();
        expect(result.current.mnemonic).toBeTruthy();
        expect(result.current.isUnlocked).toBe(true);
      },
      { timeout: 5000 }
    );
  });

  it('should import wallet from mnemonic', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    const { mnemonic } = await (async () => {
      await act(async () => result.current.createWallet());
      await waitFor(() => expect(result.current.mnemonic).toBeTruthy(), { timeout: 5000 });
      return { mnemonic: result.current.mnemonic as string };
    })();

    const second = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await second.result.current.importWallet(mnemonic);
    });
    await waitFor(
      () => {
        expect(second.result.current.wallet).toBeDefined();
        expect(second.result.current.isImported).toBe(true);
        expect(second.result.current.isUnlocked).toBe(true);
      },
      { timeout: 5000 }
    );
  });

  it('should lock and unlock wallet', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => result.current.createWallet());
    await waitFor(() => expect(result.current.wallet).toBeDefined(), { timeout: 5000 });

    act(() => result.current.lock());
    expect(result.current.isUnlocked).toBe(false);

    await act(async () => {
      await result.current.unlock('pw');
    });
    await waitFor(() => expect(result.current.isUnlocked).toBe(true), { timeout: 5000 });
  });

  it('should sign transaction when unlocked', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    act(() => result.current.createWallet());
    await waitFor(() => expect(result.current.wallet).toBeDefined());

    const tx = { messages: [], memo: 'test' } as any;
    await act(async () => {
      await result.current.signTransaction(tx);
    });

    expect(result.current.signature).toBeDefined();
    expect(result.current.signedTransaction).toBeDefined();
  });

  it('refuses signing when locked', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    // Intentionally do not unlock/create
    await act(async () => {
      await result.current.signTransaction({ messages: [] } as any);
    });
    expect(result.current.error).toBeDefined();

    await act(async () => {
      await result.current.signData(new Uint8Array([1, 2, 3]));
    });
    expect(result.current.error).toBeDefined();
  });

  it('deletes wallet from storage and clears state', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => result.current.createWallet());
    await waitFor(() => expect(result.current.wallet).toBeDefined(), { timeout: 5000 });

    await act(async () => result.current.deleteWallet());

    expect(result.current.wallet).toBeNull();
    expect(result.current.mnemonic).toBeNull();
    expect(result.current.isUnlocked).toBe(false);
    expect(await SecureStorage.hasItem('aura_wallet')).toBe(false);
  });

  it('auto-restores wallet when enabled', async () => {
    const data = {
      address: 'aura1stored',
      did: 'did:aura:aura1stored',
      publicKey: new Uint8Array([1, 2, 3]),
      privateKey: new Uint8Array([4, 5, 6]),
    };
    await SecureStorage.setItem('aura_wallet', JSON.stringify(data));

    const { result } = renderHook(() => useWallet({ autoRestore: true }), { wrapper });

    await waitFor(() => expect(result.current.wallet?.address).toBe('aura1stored'));
    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.hasStoredWallet).toBe(true);
  });

  it('rejects invalid mnemonic on import', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.importWallet('invalid mnemonic phrase');
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.isUnlocked).toBe(false);
  });

  it('unlockWithBiometrics delegates to unlock', async () => {
    const data = {
      address: 'aura1stored',
      did: 'did:aura:aura1stored',
      publicKey: new Uint8Array([1, 2, 3]),
      privateKey: new Uint8Array([4, 5, 6]),
    };
    await SecureStorage.setItem('aura_wallet', JSON.stringify(data));

    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await result.current.unlockWithBiometrics();
    });

    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.wallet?.address).toBe('aura1stored');
  });

  it('fails unlock when no stored wallet', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await result.current.unlock('pw');
    });
    expect(result.current.error).toBeDefined();
    expect(result.current.isUnlocked).toBe(false);
  });
});
