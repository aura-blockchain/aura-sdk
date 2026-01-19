import { describe, it, expect } from 'vitest';
import * as pkg from '../index';

describe('react package index export smoke', () => {
  it('exports components and hooks without throwing', () => {
    expect(pkg.AgeBadge).toBeDefined();
    expect(pkg.useVerification).toBeDefined();
  });
});
