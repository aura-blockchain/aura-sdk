import { describe, it, expect } from 'vitest';
import { applyOpacity, lighten, getStatusColor } from '../theme';

describe('theme helpers', () => {
  it('applies opacity to hex', () => {
    const rgba = applyOpacity('#ff0000', 0.5);
    expect(rgba).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('lightens a color', () => {
    const lighter = lighten('#000000', 10);
    expect(lighter.startsWith('#')).toBe(true);
  });

  it('returns status colors', () => {
    expect(getStatusColor('success')).toBeTruthy();
    expect(getStatusColor('info')).toBeTruthy();
  });
});
