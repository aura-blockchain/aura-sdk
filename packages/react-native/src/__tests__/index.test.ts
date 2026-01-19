import { describe, it, expect } from 'vitest';
import * as exported from '../index';

describe('React Native SDK public exports', () => {
  it('exposes expected surface', () => {
    expect(exported.AuraClient).toBeDefined();
    expect(exported.AuraProvider).toBeDefined();
    expect(exported.useAuraClient).toBeDefined();
    expect(exported.useBalance).toBeDefined();
    expect(exported.useCredential).toBeDefined();
    expect(exported.useVerification).toBeDefined();
    expect(exported.useWallet).toBeDefined();
    expect(exported.SecureStorage).toBeDefined();
    expect(exported.generateMnemonicWords).toBeDefined();
  });
});
