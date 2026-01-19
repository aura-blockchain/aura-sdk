import { describe, it, expect } from 'vitest';
import * as hooks from '../index';

describe('hooks index exports', () => {
  const expected = ['useAuraVerifier', 'useVerification', 'useCredentialStatus', 'useOfflineMode'];

  expected.forEach((name) => {
    it(`exports ${name}`, () => {
      expect(hooks[name as keyof typeof hooks]).toBeDefined();
    });
  });
});
