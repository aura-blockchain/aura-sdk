import { describe, it, expect } from 'vitest';
import * as components from '../index';

describe('components index exports', () => {
  const expected = [
    'AgeBadge',
    'AuraScoreBadge',
    'VerificationBadge',
    'VerificationHistory',
    'QRScanner',
  ];

  expected.forEach((name) => {
    it(`exports ${name}`, () => {
      expect(components[name as keyof typeof components]).toBeDefined();
    });
  });
});
