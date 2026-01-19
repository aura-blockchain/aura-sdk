import { describe, it, expect } from 'vitest';
import { defaultTheme, getVCStatusColor } from '../theme';

describe('theme utilities', () => {
  it('provides palette entries', () => {
    expect(defaultTheme.colors.primary).toBeDefined();
    expect(defaultTheme.spacing.sm).toBeDefined();
  });

  it('maps vc status to colors', () => {
    expect(getVCStatusColor('active')).toBe(defaultTheme.colors.success);
    expect(getVCStatusColor('revoked')).toBe(defaultTheme.colors.error);
    expect(getVCStatusColor('unknown')).toBe(defaultTheme.colors.text.secondary);
  });
});
