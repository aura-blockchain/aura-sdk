/**
 * Theme utilities and default theme configuration
 */

import type { AuraTheme } from '../types/index.js';

/**
 * Default Aura theme with brand colors
 */
export const defaultTheme: AuraTheme = {
  colors: {
    primary: '#6B46C1', // Purple
    secondary: '#14B8A6', // Teal
    success: '#10B981', // Green
    error: '#EF4444', // Red
    warning: '#F59E0B', // Amber
    text: {
      primary: '#1F2937', // Gray-800
      secondary: '#6B7280', // Gray-500
      inverse: '#FFFFFF',
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB', // Gray-50
      card: '#FFFFFF',
    },
    border: '#E5E7EB', // Gray-200
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
  },
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    full: '9999px',
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    md: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};

/**
 * Get status color from theme
 */
export function getStatusColor(
  status: 'success' | 'error' | 'warning' | 'info',
  theme: AuraTheme = defaultTheme
): string {
  switch (status) {
    case 'success':
      return theme.colors.success;
    case 'error':
      return theme.colors.error;
    case 'warning':
      return theme.colors.warning;
    case 'info':
      return theme.colors.secondary;
    default:
      return theme.colors.text.secondary;
  }
}

/**
 * Get VCStatus color
 */
export function getVCStatusColor(
  status: string,
  theme: AuraTheme = defaultTheme
): string {
  switch (status.toLowerCase()) {
    case 'active':
      return theme.colors.success;
    case 'revoked':
      return theme.colors.error;
    case 'expired':
      return theme.colors.warning;
    case 'suspended':
      return theme.colors.warning;
    default:
      return theme.colors.text.secondary;
  }
}

/**
 * Apply opacity to hex color
 */
export function applyOpacity(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Lighten a hex color
 */
export function lighten(hex: string, percent: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  const newR = Math.min(255, Math.floor(r + (255 - r) * percent));
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent));
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a hex color
 */
export function darken(hex: string, percent: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  const newR = Math.max(0, Math.floor(r * (1 - percent)));
  const newG = Math.max(0, Math.floor(g * (1 - percent)));
  const newB = Math.max(0, Math.floor(b * (1 - percent)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
